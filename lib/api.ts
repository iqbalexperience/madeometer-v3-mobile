import { Preference, ScanResult, ShoppingOption } from '../types';

const BASE_URL = 'https://madeometer-v3-production.up.railway.app';

/**
 * Generic Fetch Helper
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown API error' }));
        throw new Error(error.error || `API error ${res.status}`);
    }

    return res.json();
}

/**
 * Analysis API
 */
export async function analyzeContent(
    type: 'IMAGE' | 'TEXT',
    data: string,
    userValues: Preference[] = [],
    model: string = 'madeometer-instant',
    language: string = 'en',
    location?: { lat: number; lng: number }
): Promise<ScanResult[]> {
    const json = await apiFetch<{ results: ScanResult[] }>('/api/madeometer/gemini/analyze', {
        method: 'POST',
        body: JSON.stringify({ type, data, userValues, model, language, location }),
    });
    return json.results;
}

export const analyzeImage = (data: string, prefs: Preference[], model: string, lang: string, loc?: { lat: number; lng: number }) =>
    analyzeContent('IMAGE', data, prefs, model, lang, loc);

export const analyzeText = (query: string, prefs: Preference[], model: string, lang: string, loc?: { lat: number; lng: number }) =>
    analyzeContent('TEXT', query, prefs, model, lang, loc);

/**
 * Gemini / AI Services API
 */
export async function generateTranslations(
    text: string,
    scanId: string,
    targetLang: string,
    model: string = 'madeometer-instant'
): Promise<any> {
    const json = await apiFetch<any>('/api/madeometer/gemini/translate', {
        method: 'POST',
        body: JSON.stringify({ text, scanId, targetLang, model }),
    });
    return json.translations || json;
}

/**
 * Alternatives API
 */
export async function findProductAlternatives(
    itemName: string,
    location?: { lat: number; lng: number },
    userPreferences: Preference[] = [],
    language: string = 'en',
    overrideCurrency?: string,
    overrideCountry?: string,
    scanId?: string,
    userId?: string,
    isRefresh: boolean = false
): Promise<any[]> {
    const json = await apiFetch<{ alternatives: any[] }>('/api/madeometer/gemini/alternatives', {
        method: 'POST',
        body: JSON.stringify({
            itemName,
            location,
            userPreferences,
            language,
            overrideCurrency,
            overrideCountry,
            scanId,
            userId,
            isRefresh
        }),
    });
    return json.alternatives;
}

/**
 * Shopping Options API
 */
export async function findShoppingOptions(
    itemName: string,
    location?: { lat: number; lng: number },
    language: string = 'en',
    overrideCurrency?: string,
    overrideCountry?: string,
    scanId?: string,
    userId?: string,
    isRefresh: boolean = false
): Promise<ShoppingOption[]> {
    const json = await apiFetch<{ shoppingOptions: ShoppingOption[] }>('/api/madeometer/gemini/shopping', {
        method: 'POST',
        body: JSON.stringify({
            itemName,
            location,
            language,
            overrideCurrency,
            overrideCountry,
            scanId,
            userId,
            isRefresh
        }),
    });
    return json.shoppingOptions;
}

/**
 * Database / History API
 */
export async function getScanHistory(userId?: string): Promise<ScanResult[]> {
    const json = await apiFetch<{ scans: ScanResult[] }>(`/api/madeometer/db/scans${userId ? `?userId=${userId}` : ''}`);
    return json.scans;
}

export async function saveScan(result: ScanResult): Promise<void> {
    await apiFetch('/api/madeometer/db/scans', {
        method: 'POST',
        body: JSON.stringify({ result }),
    });
}

export async function updateScan(result: ScanResult): Promise<void> {
    await apiFetch('/api/madeometer/db/scans', {
        method: 'PUT',
        body: JSON.stringify({ result }),
    });
}

export async function deleteScan(id: string): Promise<void> {
    await apiFetch('/api/madeometer/db/scans', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
    });
}

/**
 * Whitelist / Blacklist API
 */
export async function checkListStatus(names: string[]): Promise<{ whitelisted: boolean; blacklisted: boolean }> {
    const json = await apiFetch<{ whitelisted: boolean; blacklisted: boolean }>('/api/madeometer/db/list-check', {
        method: 'POST',
        body: JSON.stringify({ names }),
    });
    return json;
}

export async function getWhitelist(): Promise<any[]> {
    const json = await apiFetch<{ items: any[] }>('/api/madeometer/db/whitelist');
    return json.items;
}

export async function addToWhitelist(name: string, type: string = 'BRAND'): Promise<void> {
    await apiFetch('/api/madeometer/db/whitelist', {
        method: 'POST',
        body: JSON.stringify({ name, type }),
    });
}

export async function removeFromWhitelist(name: string): Promise<void> {
    await apiFetch('/api/madeometer/db/whitelist', {
        method: 'DELETE',
        body: JSON.stringify({ name }),
    });
}

export async function getBlacklist(): Promise<any[]> {
    const json = await apiFetch<{ items: any[] }>('/api/madeometer/db/blacklist');
    return json.items;
}

export async function addToBlacklist(name: string, type: string = 'BRAND'): Promise<void> {
    await apiFetch('/api/madeometer/db/blacklist', {
        method: 'POST',
        body: JSON.stringify({ name, type }),
    });
}

export async function removeFromBlacklist(name: string): Promise<void> {
    await apiFetch('/api/madeometer/db/blacklist', {
        method: 'DELETE',
        body: JSON.stringify({ name }),
    });
}

/**
 * Preferences API
 */
export async function getPreferences(userId?: string): Promise<Preference[] | undefined> {
    if (!userId) return undefined;
    const json = await apiFetch<{ preferences: Preference[] }>(`/api/madeometer/db/user-preferences?userId=${userId}`);
    return json.preferences;
}

export async function savePreferences(prefs: Preference[], userId?: string): Promise<void> {
    if (!userId) return;
    await apiFetch('/api/madeometer/db/user-preferences', {
        method: 'POST',
        body: JSON.stringify({ prefs, userId }),
    });
}

export async function getGlobalPreferences(): Promise<Preference[]> {
    const json = await apiFetch<{ preferences: Preference[] }>('/api/madeometer/db/preferences');
    return json.preferences;
}


/**
 * Feedback API
 */
export async function saveFeedback(payload: { email: string; text: string; source?: string; images?: string[] }): Promise<void> {
    await apiFetch('/api/madeometer/db/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Minio Upload API
 */
export async function uploadFile(file: { name: string; type: string; uri: string }): Promise<string | undefined> {
    const presigned = await apiFetch<{ url: string; key: string; publicUrl: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
        }),
    });

    const { url, publicUrl } = presigned;

    const response = await fetch(url, {
        method: 'PUT',
        body: { uri: file.uri } as any,
        headers: {
            'Content-Type': file.type,
        },
    });

    if (!response.ok) {
        throw new Error('Upload to S3 failed');
    }

    return publicUrl;
}
/**
 * Supporters / Donations API
 */
export async function getSupporters(page: number = 1, pageSize: number = 10): Promise<{ supporters: any[]; total: number }> {
    return apiFetch<{ supporters: any[]; total: number }>(`/api/madeometer/db/supporters?page=${page}&pageSize=${pageSize}`);
}

export async function createSupporter(data: {
    name: string;
    email: string;
    amount: number;
    currency: string;
    comment?: string;
}): Promise<{ id: string }> {
    return apiFetch<{ id: string }>('/api/madeometer/db/supporters', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Tips API
 */
export async function getTips(
    search: string = '',
    sortField: string = 'createdAt',
    sortOrder: string = 'desc',
    page: number = 1,
    pageSize: number = 10
): Promise<{ tips: any[]; total: number }> {
    const query = new URLSearchParams({
        isPublished: 'true',
        search,
        sortField,
        sortOrder,
        page: page.toString(),
        pageSize: pageSize.toString(),
    });
    return apiFetch<{ tips: any[]; total: number }>(`/api/tips?${query.toString()}`);
}

export async function getTipById(id: string): Promise<any> {
    return apiFetch<any>(`/api/tips/${id}`);
}
