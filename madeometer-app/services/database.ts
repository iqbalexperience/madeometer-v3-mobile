"use server"

import prisma from '@/lib/prisma';
import { ScanResult, Preference, UserProfile, Feedback, WhitelistItem } from '../types';
import { TRANSLATIONS, LanguageCode } from '../utils/translations';
import { headers } from 'next/headers';
import { DEFAULT_PREFERENCES_LIST } from './constants';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { submitFeedbackInternal } from '@/app/api/feedback/feedback';
import { v4 as uuidv4 } from 'uuid';

// Cache settings
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 Days (3 Months)
const MIN_CONFIDENCE_FOR_CACHE = 99;



const mapPrismaUserToProfile = (user: any): UserProfile => ({
    id: user.id || '',
    name: user.name || undefined,
    email: user.email || undefined,
    isGuest: user.isAnonymous === true,
    isAdmin: user.role === 'admin',
    joinedAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
});

const verifyAdmin = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
    }
    return session;
};

// --- Whitelist Management ---

export const addToWhitelist = async (name: string, type: 'BRAND' | 'PRODUCT') => {
    const id = name.toLowerCase().trim();
    await removeFromBlacklist(name);
    await prisma.whitelist.upsert({
        where: { id },
        update: { name: name.trim(), type, timestamp: new Date() },
        create: { id, name: name.trim(), type, timestamp: new Date() }
    });
};

export const removeFromWhitelist = async (name: string) => {
    const id = name.toLowerCase().trim();
    await prisma.whitelist.deleteMany({ where: { id } });
};

export const getWhitelist = async (): Promise<WhitelistItem[]> => {
    const items = await prisma.whitelist.findMany();
    return items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type as 'BRAND' | 'PRODUCT',
        timestamp: item.timestamp.getTime()
    }));
};

export const isWhitelisted = async (name: string): Promise<boolean> => {
    if (!name) return false;
    const item = await prisma.whitelist.findUnique({ where: { id: name.toLowerCase().trim() } });
    return !!item;
};

// --- Blacklist Management ---

export const addToBlacklist = async (name: string, type: 'BRAND' | 'PRODUCT') => {
    const id = name.toLowerCase().trim();
    await removeFromWhitelist(name);
    await prisma.blacklist.upsert({
        where: { id },
        update: { name: name.trim(), type, timestamp: new Date() },
        create: { id, name: name.trim(), type, timestamp: new Date() }
    });
};

export const removeFromBlacklist = async (name: string) => {
    const id = name.toLowerCase().trim();
    await prisma.blacklist.deleteMany({ where: { id } });
};

export const isBlacklisted = async (name: string): Promise<boolean> => {
    if (!name) return false;
    const item = await prisma.blacklist.findUnique({ where: { id: name.toLowerCase().trim() } });
    return !!item;
};

/**
 * Checks multiple names against both whitelist and blacklist.
 * Returns true if any name is found in the respective list.
 */
export const checkListStatus = async (names: string[]) => {
    const ids = names.filter(Boolean).map(n => n.toLowerCase().trim());
    if (ids.length === 0) return { whitelisted: false, blacklisted: false };

    const [whitelisted, blacklisted] = await Promise.all([
        prisma.whitelist.findFirst({ where: { id: { in: ids } } }),
        prisma.blacklist.findFirst({ where: { id: { in: ids } } })
    ]);

    return {
        whitelisted: !!whitelisted,
        blacklisted: !!blacklisted
    };
};

// --- Preference Management ---

export const seedDefaults = async () => {
    // Check if we have any global preferences already
    const currentCount = await prisma.globalPreference.count();

    // If no preferences found, seed them all
    if (currentCount === 0) {
        for (const pref of DEFAULT_PREFERENCES_LIST) {
            await prisma.globalPreference.upsert({
                where: { id: pref.id },
                update: {
                    label: pref.label,
                    active: pref.active,
                    category: pref.category,
                    description: pref.description || null
                },
                create: {
                    id: pref.id,
                    label: pref.label,
                    active: pref.active,
                    category: pref.category,
                    description: pref.description || null
                }
            });
        }
    } else {
        // If preferences exist, only add DRAWN ones from constants that are MISSING in DB
        // Do NOT overwrite 'active' state of existing ones
        for (const pref of DEFAULT_PREFERENCES_LIST) {
            const existing = await prisma.globalPreference.findUnique({ where: { id: pref.id } });
            if (!existing) {
                await prisma.globalPreference.create({
                    data: {
                        id: pref.id,
                        label: pref.label,
                        active: pref.active,
                        category: pref.category,
                        description: pref.description || null
                    }
                });
            }
        }
    }

    // Ensure existing results have correct categories if missing (legacy fix)
    const allGlobal = await prisma.globalPreference.findMany({ where: { category: null } });
    for (const gp of allGlobal) {
        const category = ['show_usa_meter', 'show_political_meter', 'show_shopping_options', 'show_alternatives'].includes(gp.id) ? 'FEATURE' : 'CRITERIA';
        await prisma.globalPreference.update({
            where: { id: gp.id },
            data: { category }
        });
    }

    const count = await prisma.translation.count();
    if (count === 0) {
        const keys = Object.keys(TRANSLATIONS['en']);
        for (const key of keys) {
            const values: Record<string, string> = {};
            (Object.keys(TRANSLATIONS) as LanguageCode[]).forEach(lang => {
                if (TRANSLATIONS[lang][key]) {
                    values[lang] = TRANSLATIONS[lang][key];
                }
            });
            await prisma.translation.create({
                data: {
                    key,
                    values: values as any,
                }
            });
        }
    }
};

export const getPaginatedGlobalPreferences = async (params: {
    search?: string,
    category?: string,
    page: number,
    pageSize: number,
    sortField: string,
    sortOrder: 'asc' | 'desc'
}) => {
    const { search, category, page, pageSize, sortField, sortOrder } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
        where.OR = [
            { label: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } }
        ];
    }
    if (category && category !== 'all') {
        where.category = category;
    }

    const [prefs, total] = await Promise.all([
        prisma.globalPreference.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { [sortField]: sortOrder }
        }),
        prisma.globalPreference.count({ where })
    ]);

    const formattedPrefs: Preference[] = prefs.map(p => ({
        id: p.id,
        label: p.label,
        description: p.description || undefined,
        active: p.active,
        category: (p.category as any) || (['show_usa_meter', 'show_political_meter', 'show_shopping_options', 'show_alternatives'].includes(p.id) ? 'FEATURE' : 'CRITERIA')
    }));

    return { preferences: formattedPrefs, total };
};

export const getPaginatedBrands = async (params: {
    search?: string,
    originCountry?: string,
    page: number,
    pageSize: number,
    sortField: string,
    sortOrder: 'asc' | 'desc'
}) => {
    const { search, originCountry, page, pageSize, sortField, sortOrder } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { ownerCompany: { contains: search, mode: 'insensitive' } }
        ];
    }
    if (originCountry && originCountry !== 'all') {
        where.originCountry = originCountry;
    }

    const [brands, total] = await Promise.all([
        prisma.brand.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { [sortField]: sortOrder }
        }),
        prisma.brand.count({ where })
    ]);

    return { brands, total };
};

export const getGlobalPreferences = async (): Promise<Preference[]> => {
    // Auto-sync missing defaults
    // const currentCount = await prisma.globalPreference.count();
    // if (currentCount < DEFAULT_PREFERENCES_LIST.length) {
    //     await seedDefaults();
    // }

    const prefs = await prisma.globalPreference.findMany();
    if (prefs.length > 0) {
        const deprecatedIds = ['cruelty_free', 'no_us_bonds'];
        return prefs
            .filter(p => !deprecatedIds.includes(p.id))
            .map(p => ({
                id: p.id,
                label: p.label,
                description: p.description || undefined,
                active: p.active,
                category: (p.category as any) || (['show_usa_meter', 'show_political_meter', 'show_shopping_options', 'show_alternatives'].includes(p.id) ? 'FEATURE' : 'CRITERIA')
            }));
    }
    return DEFAULT_PREFERENCES_LIST;
};

export const saveGlobalPreferences = async (prefs: Preference[]) => {
    await verifyAdmin();
    for (const p of prefs) {
        await prisma.globalPreference.upsert({
            where: { id: p.id },
            update: { label: p.label, active: p.active, category: p.category, description: p.description || null },
            create: { id: p.id, label: p.label, active: p.active, category: p.category, description: p.description || null }
        });
    }
};

export const saveGlobalPreference = async (p: Preference) => {
    await verifyAdmin();
    await prisma.globalPreference.upsert({
        where: { id: p.id },
        update: { label: p.label, active: p.active, category: p.category, description: p.description || null },
        create: { id: p.id, label: p.label, active: p.active, category: p.category, description: p.description || null }
    });
};

export const deleteGlobalPreference = async (id: string) => {
    await verifyAdmin();
    await prisma.globalPreference.delete({
        where: { id }
    });
};



// --- Translation Operations ---

export const getAllTranslations = async () => {
    const items = await prisma.translation.findMany();
    return items.map(item => ({
        key: item.key,
        values: item.values as Record<string, string>,
        updatedAt: item.updatedAt.getTime()
    }));
};

export const saveTranslation = async (key: string, values: Record<string, string>) => {
    await prisma.translation.upsert({
        where: { key },
        update: { values: values as any, updatedAt: new Date() },
        create: { key, values: values as any }
    });
};

export const deleteTranslation = async (key: string) => {
    await prisma.translation.deleteMany({ where: { key } });
};

// --- User Operations ---

export const updateUser = async (profile: UserProfile): Promise<void> => {
    await auth.api.updateUser({
        body: {
            name: profile.name,
        },
        headers: await headers()
    });

    redirect('/account/settings');
};

export const getUserSettings = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            language: true,
            currency: true,
            shoppingCountry: true,
        }
    });

    return {
        language: (user?.language as LanguageCode) || 'da',
        currency: user?.currency || 'DKK',
        shoppingCountry: user?.shoppingCountry || 'Denmark',
    };
};

export const saveUserSettings = async (userId: string, settings: { language?: string, currency?: string, shoppingCountry?: string }) => {
    await prisma.user.update({
        where: { id: userId },
        data: settings,
    });
};

// --- User Preference Operations ---

export const savePreferences = async (prefs: Preference[], userId?: string): Promise<void> => {

    if (!userId) {
        console.warn("savePreferences: No userId provided, skipping save.");
        return;
    }

    try {
        const globalPrefs = await prisma.globalPreference.findMany();

        await prisma.$transaction(async (tx) => {
            // Clear existing preferences for this user
            await tx.userPreference.deleteMany({
                where: { userId }
            });


            // Only save preferences that differ from CURRENT GLOBAL rules OR are custom
            const toSave = prefs.filter(p => {
                if (p.isCustom) return true;
                const globalPref = globalPrefs.find(gp => gp.id === p.id);
                // If it differs from the global preference in DB, save it as an override
                return globalPref ? globalPref.active !== p.active : true;
            });

            for (const p of toSave) {
                await tx.userPreference.create({
                    data: {
                        id: uuidv4(),
                        userId,
                        preferenceId: p.id,
                        active: p.active,
                        label: p.label,
                        description: p.description || null,
                        category: p.category || null,
                        isCustom: p.isCustom || false
                    }
                });
            }
        });
    } catch (error) {
        console.error("Failed to save preferences:", error);
        throw error;
    }
};

export const getPreferences = async (userId?: string): Promise<Preference[] | undefined> => {
    if (!userId) return undefined;

    const [globalPrefsRaw, userPrefs] = await Promise.all([
        prisma.globalPreference.findMany(),
        prisma.userPreference.findMany({
            where: { userId }
        })
    ]);

    // Use DB globals if they exist, otherwise fallback to constants
    const globalPrefs = globalPrefsRaw.length > 0 ? globalPrefsRaw.map(gp => ({
        id: gp.id,
        label: gp.label,
        description: gp.description || undefined,
        active: gp.active,
        category: (gp.category as any) || (['show_usa_meter', 'show_political_meter', 'show_shopping_options', 'show_alternatives'].includes(gp.id) ? 'FEATURE' : 'CRITERIA'),
    })) : DEFAULT_PREFERENCES_LIST;

    // Merge Strategy:
    // 1. Start with Global Preferences (DB or Constants)
    const mergedResults: Preference[] = globalPrefs.map(gp => {
        // 2. Check for User Override
        const override = userPrefs.find(up => up.preferenceId === gp.id);
        return {
            ...gp,
            active: override ? override.active : gp.active,
            isCustom: false
        };
    });

    // 3. Add Custom User Preferences (that aren't present in globals)
    const customPrefs = userPrefs.filter(up => up.isCustom || !globalPrefs.some(gp => gp.id === up.preferenceId)).map(up => ({
        id: up.preferenceId,
        label: up.label,
        description: up.description || undefined,
        active: up.active,
        category: (up.category as any) || undefined,
        isCustom: true
    }));

    // If still nothing after merging, return undefined
    if (mergedResults.length === 0 && customPrefs.length === 0) return undefined;

    return [...mergedResults, ...customPrefs];
};

// --- Scan & Dataset Operations ---

export const saveScan = async (result: ScanResult): Promise<void> => {
    console.log("Saving scan:", result);
    await prisma.$transaction(async (tx) => {
        await tx.scan.upsert({
            where: { id: result.id },
            update: {
                userId: result.userId,
                timestamp: new Date(result.timestamp),
                imageUrl: result.imageUrl,
                itemName: result.itemName,
                ownerCompany: result.ownerCompany,
                ownerCountry: result.ownerCountry,
                ownerCountryCode: result.ownerCountryCode,
                ownerFlag: result.ownerFlag,
                originCountry: result.originCountry,
                originCountryCode: result.originCountryCode,
                originFlag: result.originFlag,
                manufacturedIn: result.manufacturedIn,
                manufacturedInCode: result.manufacturedInCode,
                description: result.description,
                website: result.website,
                verdict: result.verdict,
                verdictReason: result.verdictReason,
                matchedUserCriteria: result.matchedUserCriteria,
                usaOwnershipScore: result.usaOwnershipScore,
                republicanScore: result.republicanScore,
                sustainabilityScore: result.sustainabilityScore,
                ethicsScore: result.ethicsScore,
                alternatives: result.alternatives as any,
                europeanAlternatives: result.europeanAlternatives as any,
                groundingLinks: result.groundingLinks as any,
                webSources: result.webSources as any,
                shoppingOptions: result.shoppingOptions as any,
                box_2d: result.box_2d as any,
                confidenceScore: result.confidenceScore,
                dataSources: result.dataSources,
                keyEvidence: result.keyEvidence as any,
                uncertainties: result.uncertainties,
                validatedBy: result.validatedBy,
                lastValidated: result.lastValidated ? new Date(result.lastValidated) : null,
            },
            create: {
                id: result.id,
                userId: result.userId,
                timestamp: new Date(result.timestamp),
                imageUrl: result.imageUrl,
                itemName: result.itemName,
                ownerCompany: result.ownerCompany,
                ownerCountry: result.ownerCountry,
                ownerCountryCode: result.ownerCountryCode,
                ownerFlag: result.ownerFlag,
                originCountry: result.originCountry,
                originCountryCode: result.originCountryCode,
                originFlag: result.originFlag,
                manufacturedIn: result.manufacturedIn,
                manufacturedInCode: result.manufacturedInCode,
                description: result.description,
                website: result.website,
                verdict: result.verdict,
                verdictReason: result.verdictReason,
                matchedUserCriteria: result.matchedUserCriteria,
                usaOwnershipScore: result.usaOwnershipScore,
                republicanScore: result.republicanScore,
                sustainabilityScore: result.sustainabilityScore,
                ethicsScore: result.ethicsScore,
                alternatives: result.alternatives as any,
                europeanAlternatives: result.europeanAlternatives as any,
                groundingLinks: result.groundingLinks as any,
                webSources: result.webSources as any,
                shoppingOptions: result.shoppingOptions as any,
                box_2d: result.box_2d as any,
                confidenceScore: result.confidenceScore,
                dataSources: result.dataSources,
                keyEvidence: result.keyEvidence as any,
                uncertainties: result.uncertainties,
                validatedBy: result.validatedBy,
                lastValidated: result.lastValidated ? new Date(result.lastValidated) : null,
            }
        });

        const brandKey = result.ownerCompany.trim();
        const existingBrand = await tx.brand.findUnique({ where: { name: brandKey } });
        await tx.brand.upsert({
            where: { name: brandKey },
            update: {
                ownerCompany: result.ownerCompany,
                ownerCountry: result.ownerCountry,
                ownerFlag: result.ownerFlag,
                originCountry: result.originCountry,
                originFlag: result.originFlag,
                lastSeen: new Date(),
                scanCount: (existingBrand?.scanCount || 0) + 1,
            },
            create: {
                name: brandKey,
                ownerCompany: result.ownerCompany,
                ownerCountry: result.ownerCountry,
                ownerFlag: result.ownerFlag,
                originCountry: result.originCountry,
                originFlag: result.originFlag,
                lastSeen: new Date(),
                scanCount: 1,
            }
        });

        const productKey = result.itemName.trim();
        const existingProduct = await tx.product.findUnique({ where: { name: productKey } });
        await tx.product.upsert({
            where: { name: productKey },
            update: {
                brandName: brandKey,
                description: result.description,
                manufacturedIn: result.manufacturedIn,
                verdict: result.verdict,
                usaScore: result.usaOwnershipScore || 0,
                lastScanned: new Date(),
                scanCount: (existingProduct?.scanCount || 0) + 1,
            },
            create: {
                name: productKey,
                brandName: brandKey,
                description: result.description,
                manufacturedIn: result.manufacturedIn,
                verdict: result.verdict,
                usaScore: result.usaOwnershipScore || 0,
                lastScanned: new Date(),
                scanCount: 1,
            }
        });

        for (const alt of result.alternatives) {
            const altId = `${productKey}-gen-${alt.name.replace(/\s+/g, '').toLowerCase()}`;
            await tx.alternative.upsert({
                where: { id: altId },
                update: {
                    relatedProductName: productKey,
                    name: alt.name,
                    reason: alt.reason,
                    website: alt.website,
                    type: 'GENERAL',
                    timestamp: new Date()
                },
                create: {
                    id: altId,
                    relatedProductName: productKey,
                    name: alt.name,
                    reason: alt.reason,
                    website: alt.website,
                    type: 'GENERAL',
                    timestamp: new Date()
                }
            });
        }
    });
};

export const updateScan = async (result: ScanResult): Promise<void> => {
    await prisma.scan.update({
        where: { id: result.id },
        data: {
            verdict: result.verdict,
            description: result.description,
        }
    });
};

export const deleteScan = async (id: string): Promise<void> => {
    await prisma.scan.deleteMany({ where: { id } });
};

export const getScanHistory = async (userId?: string): Promise<ScanResult[]> => {
    const scans = await prisma.scan.findMany({
        where: userId ? { userId } : {},
        orderBy: { timestamp: 'desc' }
    });

    return scans.map(s => ({
        id: s.id,
        userId: s.userId || undefined,
        timestamp: s.timestamp.getTime(),
        imageUrl: s.imageUrl,
        itemName: s.itemName,
        ownerCompany: s.ownerCompany,
        ownerCountry: s.ownerCountry,
        ownerCountryCode: s.ownerCountryCode || undefined,
        ownerFlag: s.ownerFlag,
        originCountry: s.originCountry,
        originCountryCode: s.originCountryCode || undefined,
        originFlag: s.originFlag,
        manufacturedIn: s.manufacturedIn,
        manufacturedInCode: s.manufacturedInCode || undefined,
        description: s.description,
        website: s.website || undefined,
        verdict: s.verdict as any,
        verdictReason: s.verdictReason,
        matchedUserCriteria: s.matchedUserCriteria,
        usaOwnershipScore: s.usaOwnershipScore || undefined,
        republicanScore: s.republicanScore || undefined,
        sustainabilityScore: s.sustainabilityScore,
        ethicsScore: s.ethicsScore,
        alternatives: s.alternatives as any,
        europeanAlternatives: s.europeanAlternatives as any,
        groundingLinks: (s.groundingLinks as any) || undefined,
        webSources: (s.webSources as any) || undefined,
        shoppingOptions: (s.shoppingOptions as any) || undefined,
        box_2d: (s.box_2d as any) || undefined,
        confidenceScore: s.confidenceScore || undefined,
        dataSources: s.dataSources,
        keyEvidence: (s.keyEvidence as any) || undefined,
        uncertainties: s.uncertainties,
        validatedBy: (s.validatedBy as any) || undefined,
        lastValidated: s.lastValidated ? s.lastValidated.getTime() : undefined,
    }));
};

export const searchLocalDatabase = async (query: string): Promise<ScanResult | null> => {
    const normalizedQuery = query.toLowerCase().trim();
    const match = await prisma.scan.findFirst({
        where: { itemName: { equals: normalizedQuery, mode: 'insensitive' } }
    });

    if (!match) return null;

    const lastValidatedTime = match.lastValidated ? match.lastValidated.getTime() : match.timestamp.getTime();
    const age = Date.now() - lastValidatedTime;

    if (age > CACHE_TTL_MS) return null;

    const isHighConfidence = (match.confidenceScore || 0) >= MIN_CONFIDENCE_FOR_CACHE;
    const isManuallyValidated = match.validatedBy === 'admin' || match.validatedBy === 'user';
    const hasValidImage = match.imageUrl && !match.imageUrl.includes('placehold.co');

    if ((isHighConfidence || isManuallyValidated) && hasValidImage) {
        return {
            id: `local_${Date.now()}`,
            userId: match.userId || undefined,
            timestamp: Date.now(),
            imageUrl: match.imageUrl,
            itemName: match.itemName,
            ownerCompany: match.ownerCompany,
            ownerCountry: match.ownerCountry,
            ownerFlag: match.ownerFlag,
            originCountry: match.originCountry,
            originFlag: match.originFlag,
            manufacturedIn: match.manufacturedIn,
            description: match.description,
            verdict: match.verdict as any,
            verdictReason: match.verdictReason,
            matchedUserCriteria: match.matchedUserCriteria,
            sustainabilityScore: match.sustainabilityScore,
            ethicsScore: match.ethicsScore,
            alternatives: match.alternatives as any,
            europeanAlternatives: match.europeanAlternatives as any,
            dataSources: [...(match.dataSources || []), "Local Cache (Verified)"],
            confidenceScore: match.confidenceScore || undefined,
        };
    }
    return null;
};

export const getStoredImage = async (productName: string, brandName: string): Promise<string | undefined> => {
    try {
        const product = await prisma.product.findUnique({ where: { name: productName.trim() } });
        if (product && product.imageUrl && product.imageUrl.startsWith('http')) {
            return product.imageUrl;
        }

        const brand = await prisma.brand.findUnique({ where: { name: brandName.trim() } });
        if (brand && brand.imageUrl && brand.imageUrl.startsWith('http')) {
            return brand.imageUrl;
        }
    } catch (e) {
        console.warn("Failed to retrieve stored image", e);
    }
    return undefined;
};

export const clearHistory = async (): Promise<void> => {
    await prisma.scan.deleteMany();
};

// --- Feedback Operations ---



export const saveFeedback = async (payload: { email: string, text: string, source?: string, images?: string[] }): Promise<void> => {
    try {
        await submitFeedbackInternal(payload);
    } catch (error) {
        console.error("saveFeedback error:", error);
        throw error;
    }
};

// --- Admin Operations ---

export const getAllBrands = async () => {
    return await prisma.brand.findMany();
};

export const deleteBrand = async (name: string) => {
    await prisma.brand.deleteMany({ where: { name } });
};

export const getAllProducts = async () => {
    return await prisma.product.findMany();
};

export const deleteProduct = async (name: string) => {
    await prisma.product.deleteMany({ where: { name } });
};

export const updateBrand = async (brand: any) => {
    await prisma.brand.upsert({
        where: { name: brand.name },
        update: brand,
        create: brand
    });
};

export const updateProduct = async (product: any) => {
    await prisma.product.upsert({
        where: { name: product.name },
        update: product,
        create: product
    });
};

export const getAllUsers = async () => {
    const users = await prisma.user.findMany();
    return users.map(mapPrismaUserToProfile);
};
