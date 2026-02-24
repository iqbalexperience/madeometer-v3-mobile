/**
 * services/api.ts
 *
 * Fetch-based API client for the React Native app.
 * All routes match the actual /api/madeometer/* endpoints
 * documented in madeometer-api.test.ts.
 *
 * Base URL is set via EXPO_PUBLIC_API_URL env var (e.g. http://192.168.1.5:3000).
 */

import { Preference, ScanResult } from '../types';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.5:3000').replace(/\/$/, '');

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`API ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

const apiGet = <T>(path: string) => apiFetch<T>(path);
const apiPost = <T>(path: string, body: object) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const apiPut = <T>(path: string, body: object) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const apiDel = <T>(path: string, body?: object) =>
    apiFetch<T>(path, {
        method: 'DELETE',
        ...(body ? { body: JSON.stringify(body) } : {}),
    });


// ─────────────────────────────────────────────────────────────────────────────
// GEMINI  /api/madeometer/gemini/*
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeParams {
    /** 'IMAGE' for base64 image data, 'TEXT' for a search string */
    type: 'IMAGE' | 'TEXT';
    /** base64 image string OR text query */
    data: string;
    model?: string;
    language?: string;
    currency?: string;
    shoppingCountry?: string;
    preferences?: Preference[];
    userId?: string;
}

interface AnalyzeResponse {
    results: ScanResult[];
}

/** POST /api/madeometer/gemini/analyze — returns results array */
export const analyzeContent = async (params: AnalyzeParams): Promise<ScanResult[]> => {
    const { results } = await apiPost<AnalyzeResponse>(
        '/api/madeometer/gemini/analyze',
        params,
    );
    return results;
};

interface AlternativesResponse {
    alternatives: ScanResult['alternatives'];
}

/** POST /api/madeometer/gemini/alternatives */
export const findProductAlternatives = async (
    itemName: string,
    language = 'en',
): Promise<ScanResult['alternatives']> => {
    const { alternatives } = await apiPost<AlternativesResponse>(
        '/api/madeometer/gemini/alternatives',
        { itemName, language },
    );
    return alternatives;
};

interface ShoppingResponse {
    shoppingOptions: ScanResult['shoppingOptions'];
}

/** POST /api/madeometer/gemini/shopping */
export const findShoppingOptions = async (
    itemName: string,
    language = 'en',
    currency?: string,
    shoppingCountry?: string,
): Promise<ScanResult['shoppingOptions']> => {
    const { shoppingOptions } = await apiPost<ShoppingResponse>(
        '/api/madeometer/gemini/shopping',
        { itemName, language, currency, shoppingCountry },
    );
    return shoppingOptions;
};

/** POST /api/madeometer/gemini/unsplash */
export const fetchUnsplashImage = async (query: string): Promise<string | undefined> => {
    const res = await apiPost<{ imageUrl?: string }>(
        '/api/madeometer/gemini/unsplash',
        { query },
    );
    return res.imageUrl;
};

export interface ChatInitResponse {
    context: string;
    model: string;
}
export interface ChatSendResponse {
    text: string;
    grounding: unknown[];
}

/** POST /api/madeometer/gemini/chat — action: 'init' | 'send' */
export const chatInit = async (
    data: Partial<ScanResult>,
    model = 'madeometer-instant',
): Promise<ChatInitResponse> => {
    return apiPost<ChatInitResponse>('/api/madeometer/gemini/chat', {
        action: 'init',
        data,
        model,
    });
};

export const chatSend = async (
    message: string,
    context: string,
    history: { role: string; content: string }[],
): Promise<ChatSendResponse> => {
    return apiPost<ChatSendResponse>('/api/madeometer/gemini/chat', {
        action: 'send',
        message,
        context,
        history,
    });
};


// ─────────────────────────────────────────────────────────────────────────────
// SCANS  /api/madeometer/db/scans
// ─────────────────────────────────────────────────────────────────────────────

interface ScansResponse { scans: ScanResult[] }

/** GET /api/madeometer/db/scans?userId=... */
export const getScanHistory = async (userId?: string): Promise<ScanResult[]> => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const { scans } = await apiGet<ScansResponse>(`/api/madeometer/db/scans${qs}`);
    return scans;
};

/** POST /api/madeometer/db/scans */
export const saveScan = async (result: ScanResult): Promise<void> => {
    await apiPost('/api/madeometer/db/scans', { result });
};

/** DELETE /api/madeometer/db/scans  { id } */
export const deleteScan = async (id: string): Promise<void> => {
    await apiDel('/api/madeometer/db/scans', { id });
};

/** GET /api/madeometer/db/scans/search?query=... */
export const searchLocalDb = async (query: string): Promise<ScanResult | null> => {
    const res = await apiGet<{ result: ScanResult | null }>(
        `/api/madeometer/db/scans/search?query=${encodeURIComponent(query)}`,
    );
    return res.result;
};

/** GET /api/madeometer/db/scans/image?product=...&brand=... */
export const getStoredImage = async (
    product: string,
    brand: string,
): Promise<string | undefined> => {
    const res = await apiGet<{ imageUrl?: string }>(
        `/api/madeometer/db/scans/image?product=${encodeURIComponent(product)}&brand=${encodeURIComponent(brand)}`,
    );
    return res.imageUrl;
};


// ─────────────────────────────────────────────────────────────────────────────
// PREFERENCES  /api/madeometer/db/preferences & user-preferences
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/madeometer/db/preferences — global prefs */
export const getGlobalPreferences = async (): Promise<Preference[]> => {
    const { preferences } = await apiGet<{ preferences: Preference[] }>(
        '/api/madeometer/db/preferences',
    );
    return preferences;
};

/** GET /api/madeometer/db/user-preferences?userId=... */
export const getPreferences = async (userId?: string): Promise<Preference[] | undefined> => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await apiGet<{ preferences: Preference[] | undefined | null }>(
        `/api/madeometer/db/user-preferences${qs}`,
    );
    return res.preferences ?? undefined;
};

/** POST /api/madeometer/db/user-preferences  { prefs, userId } */
export const savePreferences = async (
    userId: string,
    prefs: Preference[],
): Promise<void> => {
    await apiPost('/api/madeometer/db/user-preferences', { prefs, userId });
};


// ─────────────────────────────────────────────────────────────────────────────
// USER SETTINGS  /api/madeometer/db/user-settings
// ─────────────────────────────────────────────────────────────────────────────

export interface UserSettings {
    language: string;
    currency: string;
    shoppingCountry: string;
}

/** GET /api/madeometer/db/user-settings?userId=... */
export const getUserSettings = async (userId: string): Promise<UserSettings> => {
    return apiGet<UserSettings>(
        `/api/madeometer/db/user-settings?userId=${encodeURIComponent(userId)}`,
    );
};

/** PUT /api/madeometer/db/user-settings  { userId, settings } */
export const saveUserSettings = async (
    userId: string,
    settings: Partial<UserSettings>,
): Promise<void> => {
    await apiPut('/api/madeometer/db/user-settings', { userId, settings });
};


// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK  /api/madeometer/db/feedback
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedbackPayload {
    email?: string;
    text: string;
    source?: string;
    images?: string[];
}

/** POST /api/madeometer/db/feedback  { email, text, source?, images? } */
export const submitFeedback = async (payload: FeedbackPayload): Promise<void> => {
    await apiPost('/api/madeometer/db/feedback', payload);
};


// ─────────────────────────────────────────────────────────────────────────────
// LIST CHECK  /api/madeometer/db/list-check
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/madeometer/db/list-check  { names: string[] } */
export const checkListStatus = async (
    names: string[],
): Promise<{ whitelisted: boolean; blacklisted: boolean }> => {
    return apiPost('/api/madeometer/db/list-check', { names });
};


// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION (better-auth managed — no /api/madeometer route)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns null if not subscribed / request fails */
export const getSubscription = async (): Promise<{ plan: string; status: string } | null> => {
    try {
        return await apiGet<{ plan: string; status: string }>('/api/subscription');
    } catch {
        return null;
    }
};

export const manageSubscription = async (): Promise<{ url: string }> => {
    return apiPost<{ url: string }>('/api/subscription/portal', {});
};
