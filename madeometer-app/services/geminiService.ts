"use server"
import { createGoogleGenerativeAI, GoogleLanguageModelOptions } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { ScanResult, Preference, ShoppingOption } from '../types';
import prisma from '@/lib/prisma';
import { LANGUAGE_DEFAULTS } from "./constants";
import { alternativesSchema, scanResultSchema, scanResultSchemaInstant, scanResultSchemaLite, shoppingOptionsSchema } from "./zodSchema";
import { SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION_INSTANT, SYSTEM_INSTRUCTION_LITE } from "./prompts";

const SITE_URL = 'https://madeometer.com';
const SITE_NAME = 'Made O Meter';

// Unsplash Client ID (Access Key)
const UNSPLASH_CLIENT_ID = 'hxcxVRR3c60SIaZXvD8BEkc0X6fpyjSalaQeGHb5Dck';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});



// Helper to format preferences for the prompt
const formatUserPreferences = (prefs: Preference[]): string => {
    return prefs.map(p => p.description ? `"${p.label}" (Context: ${p.description})` : `"${p.label}"`).join('; ');
};


const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const stripFlags = (text: string): string => {
    if (!text) return "";
    return text.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, "").trim();
};

const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return "🏳️"; // Fallback
    // 127397 is the offset between 'A' (65) and regional indicator symbol '🇦' (127462)
    // 127462 - 65 = 127397
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// Ensure consistent country naming based on ISO codes to avoid "USA" vs "United States"
const standardizeCountry = (name: string, code?: string): string => {
    // 1. Prioritize strict ISO code mapping for common issues
    if (code) {
        switch (code.toUpperCase()) {
            case 'US': return 'USA';
            case 'GB': return 'UK';
            case 'AE': return 'UAE';
            case 'KR': return 'South Korea';
        }
    }

    // 2. Fallback to text normalization if code is missing or generic
    const lower = name.toLowerCase().trim();
    if (lower === 'united states' || lower === 'united states of america' || lower === 'u.s.a.') return 'USA';
    if (lower === 'united kingdom' || lower === 'great britain') return 'UK';
    if (lower === 'united arab emirates') return 'UAE';

    return name;
};

const resolveModelConfig = (modelId: string): { selectedModel: string, thinkingBudget: number | undefined, isSuperFast: boolean, isInstant: boolean } => {
    let selectedModel = modelId;
    let thinkingBudget: number | undefined = undefined;
    let isSuperFast = false;
    let isInstant = false;

    if (modelId === 'madeometer-instant') {
        selectedModel = 'gemini-3-flash-preview';
        thinkingBudget = 0; // Disable thinking for max speed
        isSuperFast = true;
        isInstant = true;
    } else if (modelId === 'madeometer-superfast') {
        selectedModel = 'gemini-3-flash-preview';
        thinkingBudget = 0;
        isSuperFast = true;
    } else if (modelId === 'gemini-3-flash-preview') {
        // Standard Flash - Explicitly disable thinking for speed
        thinkingBudget = 0;
    }

    return { selectedModel, thinkingBudget, isSuperFast, isInstant };
};

const extractJSON = (text: string): any => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
            try { return JSON.parse(match[1]); } catch (e2) { }
        }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) { }
        }
        console.error("Failed to extract JSON from text:", text);
        return null;
    }
};

const getLanguageName = (code: string): string => {
    const langs: Record<string, string> = {
        'en': 'English',
        'da': 'Danish',
        'de': 'German',
        'nl': 'Dutch',
        'sv': 'Swedish',
        'no': 'Norwegian',
        'es': 'Spanish',
        'fr': 'French',
        'it': 'Italian',
        'pt': 'Portuguese'
    };
    return langs[code] || 'English';
};

// --- IMAGE FETCHING UTILS ---
export const fetchUnsplashImage = async (query: string): Promise<string | null> => {
    try {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY || UNSPLASH_CLIENT_ID;
        if (!accessKey) return null;

        const res = await fetch(`https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
            headers: { 'Authorization': `Client-ID ${accessKey}` }
        });
        const data = await res.json();
        return data?.results?.[0]?.urls?.small || null;
    } catch (e) {
        console.warn("Unsplash API Error", e);
        return null;
    }
};

const customGenerateText = async ({
    model, system, prompt, output,
    providerOptions, messages, temperature, tools
}: any) => {
    return generateText({
        model,
        system,
        prompt,
        output,
        providerOptions,
        messages,
        temperature,
        tools
    });
}

export const createChatSession = async (
    data: ScanResult | ScanResult[],
    model: string = 'madeometer-instant',
    location?: { lat: number, lng: number }
) => {
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];

    const contextData = items.map(item => ({
        id: item.id,
        itemName: item.itemName,
        owner: item.ownerCompany,
        ownerCountry: item.ownerCountry,
        verdict: item.verdict,
        description: item.description,
        political: item.republicanScore ? `Political Score: ${item.republicanScore}/100` : 'Unknown'
    }));

    return {
        context: JSON.stringify(contextData),
        model: model,
        location: location
    };
};

export const sendChatMessage = async (
    message: string,
    history: { role: 'user' | 'model'; content: string }[],
    context: string,
    location?: { lat: number, lng: number }
) => {
    try {
        const { selectedModel, thinkingBudget } = resolveModelConfig('gemini-3-flash-preview');

        const { text, providerMetadata } = await generateText({
            model: google(selectedModel),
            system: `You are a helpful assistant. Context about the scanned products: ${context}. Answer concisely. Use googleSearch for up-to-date info.`,
            messages: [
                ...history.map(h => ({
                    role: (h.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
                    content: h.content
                })),
                { role: 'user', content: message }
            ],
            tools: {
                googleSearch: google.tools.googleSearch({})
            },
        });


        // Extract grounding
        const groundingChunks = (providerMetadata?.google as any)?.groundingMetadata?.groundingChunks;

        return {
            text: text || "I've processed that.",
            grounding: groundingChunks || []
        };
    } catch (error) {
        console.error("Chat Action Error:", error);
        throw error;
    }
};


export const createProductChat = async (result: ScanResult, model?: string) => createChatSession(result, model);

// --- NEW SPECIALIZED FUNCTION FOR ALTERNATIVES ---
export const findProductAlternatives = async (
    itemName: string,
    location?: { lat: number, lng: number },
    userPreferences: Preference[] = [],
    language: string = 'en',
    overrideCurrency?: string,
    overrideCountry?: string,
    scanId?: string,
    userId?: string,
    isRefresh: boolean = false
): Promise<any[]> => {
    try {
        // 1. Check Cache (if not refreshing and scanId provided)
        if (scanId && !isRefresh) {
            const scan = await prisma.scan.findUnique({
                where: { id: scanId },
                select: { alternatives: true }
            });

            if (scan?.alternatives && Array.isArray(scan.alternatives) && scan.alternatives.length > 0) {
                console.log(`[Cache Hit] Returning stored alternatives for scan ${scanId}`);
                return scan.alternatives;
            }
        }

        const langName = getLanguageName(language);
        const defaults = LANGUAGE_DEFAULTS[language] || LANGUAGE_DEFAULTS['en'];

        const targetCurrency = overrideCurrency || defaults.currency;
        const targetCountry = overrideCountry || defaults.country;

        let contextPrompt = "";

        if (location) {
            console.log("using user location: ", location)
            contextPrompt = `
             CONTEXT: The user is physically located at GPS ${location.lat}, ${location.lng} and get city, country and currency.
             TASK: Find alternatives available at PHYSICAL STORES nearby or DOMESTIC online retailers.
             SEARCH QUERY STRATEGY: Generate search queries like "buy [alternative] near me", "[alternative] price {user_gps_city_or_country}", or "[alternative] {user_gps_location_currency}".
             `;
        } else if (overrideCountry) {
            contextPrompt = `
             CONTEXT: The user has explicitly set their shopping location to **${targetCountry}**.
             TASK: Find alternatives available specifically in **${targetCountry}**.
             SEARCH QUERY STRATEGY: Use queries like "buy [alternative] ${targetCountry}", "[alternative] price ${targetCurrency}", or "stores in ${targetCountry} selling [alternative]".
             `;
        } else {
            contextPrompt = `
             CONTEXT: The user is browsing in ${language} (inferring ${targetCountry}). 
             TASK: Find alternatives widely available in ${targetCountry}.
             `;
        }

        const prefsString = userPreferences.length > 0
            ? `Active user preferences to ADHERE to: ${formatUserPreferences(userPreferences)}.`
            : "Focus on ethical, local, or sustainable options.";

        const locationRequest = location
            ? `near GPS ${location.lat}, ${location.lng}`
            : `in ${targetCountry}`;

        const { output: data, providerMetadata } = await customGenerateText({
            model: google('gemini-3-flash-preview'),
            system: `You are a shopping assistant. Find 4 excellent alternatives to "${itemName}". 
            ${contextPrompt} 
            ${prefsString} 
            
            MANDATORY OUTPUT RULES:
            1. RETAILER: Must be a real store or website relevant to ${targetCountry}.
            2. LANGUAGE: Output all text in ${langName} language. 
            3. ORDER BY POPULARITY: The most popular and widely available alternatives must be first.`,
            prompt: `Find alternatives to "${itemName}". ${prefsString}. Respond in ${langName} based on the user's location (${locationRequest}).`,
            tools: {
                search: google.tools.googleSearch({}),
            },
            output: Output.object({ schema: alternativesSchema }) as any,
        });

        const typedData = data as any;
        const alternatives = typedData?.alternatives || [];

        // Extract grounding links (if needed for logging or future use)
        const groundingChunks = (providerMetadata?.google as any)?.groundingMetadata?.groundingChunks;
        if (groundingChunks && Array.isArray(groundingChunks)) {
            console.log(`[Grounding] Found ${groundingChunks.length} search result chunks.`);
        }

        // 2. Save to DB if scanId provided
        if (scanId && alternatives.length > 0) {
            await prisma.scan.update({
                where: { id: scanId },
                data: {
                    alternatives: alternatives,
                    userId: userId // Ensure userId matches if provided
                }
            });
            console.log(`[Cache Update] Saved ${alternatives.length} alternatives for scan ${scanId}`);
        }
        return alternatives;

    } catch (error) {
        console.error("Failed to find alternatives:", error);
        return [];
    }
};

// --- NEW FUNCTION: FIND WHERE TO BUY ---
export const findShoppingOptions = async (
    itemName: string,
    location?: { lat: number, lng: number },
    language: string = 'en',
    overrideCurrency?: string,
    overrideCountry?: string,
    scanId?: string,
    userId?: string,
    isRefresh: boolean = false
): Promise<ShoppingOption[]> => {
    try {
        // 1. Check Cache
        if (scanId && !isRefresh) {
            const scan = await prisma.scan.findUnique({
                where: { id: scanId },
                select: { shoppingOptions: true }
            });

            if (scan?.shoppingOptions && Array.isArray(scan.shoppingOptions) && scan.shoppingOptions.length > 0) {
                console.log(`[Cache Hit] Returning stored shopping options for scan ${scanId}`);
                return scan.shoppingOptions as unknown as ShoppingOption[];
            }
        }

        const defaults = LANGUAGE_DEFAULTS[language] || LANGUAGE_DEFAULTS['en'];

        const targetCurrency = overrideCurrency || defaults.currency;
        const targetCountry = overrideCountry || defaults.country;

        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let shoppingContext = "";
        if (location) {
            shoppingContext = `
             CONTEXT: The user is physically located at GPS ${location.lat}, ${location.lng} and get city, country and currency.
             TASK: Find ACTIVE, PURCHASABLE offers for "${itemName}" at PHYSICAL STORES nearby or DOMESTIC online retailers.
             SEARCH QUERY STRATEGY: Generate search queries like "buy ${itemName} near me", "${itemName} price {user_gps_city_or_country}", or "${itemName} price {user_gps_location_currency}".
             `;
        } else {
            shoppingContext = `
             CONTEXT: The user has set their shopping location to ${targetCountry}.
             TASK: Find ACTIVE, PURCHASABLE offers for "${itemName}" in ${targetCountry}.
             CURRENCY: Must be ${targetCurrency}.
             `;
        }

        const systemInstruction = `
        You are an expert Shopping Agent. Today is ${currentDate}.
        
        ${shoppingContext}
        
        MANDATORY RULES:
        1. **REAL LINKS**: You MUST provide the DIRECT URL to the product page found via search. Do NOT guess URLs. If a direct link isn't found in the search snippets, do not list that retailer.
        2. **CURRENT PRICE**: Extract the specific price from the search result.
        3. **AVAILABILITY**: Verify if item is currently in stock.
        `;

        const locationRequest = location
            ? `near GPS ${location.lat}, ${location.lng}`
            : `in ${targetCountry}`;

        const { output: data, providerMetadata } = await customGenerateText({
            model: google('gemini-3-flash-preview'),
            system: systemInstruction,
            prompt: `Find valid purchasing links for "${itemName}" based on the user's location (${locationRequest}).`,
            tools: {
                search: google.tools.googleSearch({}),
            },
            output: Output.object({ schema: shoppingOptionsSchema }) as any,
        });

        const typedData = data as any;
        const sellers = typedData?.sellers || [];

        // Extract grounding links (optional logging)
        const groundingChunks = (providerMetadata?.google as any)?.groundingMetadata?.groundingChunks;
        if (groundingChunks && Array.isArray(groundingChunks)) {
            console.log(`[Grounding] Found ${groundingChunks.length} shopping grounding chunks.`);
        }

        // 2. Save to DB if scanId provided
        if (scanId && sellers.length > 0) {
            await prisma.scan.update({
                where: { id: scanId },
                data: {
                    shoppingOptions: sellers,
                    userId: userId
                }
            });
            console.log(`[Cache Update] Saved ${sellers.length} shopping options for scan ${scanId}`);
        }

        return sellers;

    } catch (error) {
        console.error("Failed to find shopping options:", error);
        return [];
    }
};

// --- NEW: GENERATE TRANSLATIONS ---
export const generateTranslations = async (text: string, scanId?: string, targetLang?: string): Promise<Record<string, any>> => {
    try {
        // If scanId and targetLang are provided, we are translating a specific scan result for a specific language
        if (scanId && targetLang) {
            // 1. Check if translation already exists in DB
            const existing = await prisma.scanTranslation.findUnique({
                where: {
                    scanId_language: {
                        scanId: scanId,
                        language: targetLang
                    }
                }
            });

            if (existing) {
                console.log(`[Cache Hit] Returning stored ${targetLang} translation for scan ${scanId}`);
                return { [targetLang]: existing.data };
            }

            // 2. Not in cache, fetch scan data
            const scan = await prisma.scan.findUnique({ where: { id: scanId } });
            if (!scan) throw new Error("Scan not found");

            const prompt = `Translate the following product information into: ${targetLang}.
            
            PRODUCT INFO:
            - Name: ${scan.itemName}
            - Description: ${scan.description}
            - Verdict Reason: ${scan.verdictReason}
            - Manufactured In: ${scan.manufacturedIn}
            - Origin: ${scan.originCountry}
            - Owner Country: ${scan.ownerCountry}
            - Matched Criteria: ${scan.matchedUserCriteria?.join(', ')}
            - Key Evidence: ${scan.keyEvidence ? JSON.stringify(scan.keyEvidence) : ''}
            - Uncertainties: ${scan.uncertainties?.join(', ')}
            
            Return ONLY a JSON object containing the translated fields for ${targetLang}: { "itemName": "...", "description": "...", "verdictReason": "...", "manufacturedIn": "...", "originCountry": "...", "ownerCountry": "...", "matchedUserCriteria": ["...", "..."], "keyEvidence": [{"point": "...", "confidence": "..."}, ...], "uncertainties": ["...", "..."] }
            `;

            const { output: translatedData } = await customGenerateText({
                model: google('gemini-3-flash-preview'),
                prompt: prompt,
                output: Output.object({
                    schema: z.object({
                        itemName: z.string(),
                        description: z.string(),
                        verdictReason: z.string(),
                        manufacturedIn: z.string(),
                        originCountry: z.string(),
                        ownerCountry: z.string(),
                        matchedUserCriteria: z.array(z.string()),
                        keyEvidence: z.array(z.object({ point: z.string(), confidence: z.string() })),
                        uncertainties: z.array(z.string())
                    })
                }) as any,
            });

            if (translatedData && Object.keys(translatedData).length > 0) {
                // 3. Save to new ScanTranslation model
                await prisma.scanTranslation.upsert({
                    where: {
                        scanId_language: {
                            scanId: scanId,
                            language: targetLang
                        }
                    },
                    update: { data: translatedData },
                    create: {
                        scanId: scanId,
                        language: targetLang,
                        data: translatedData
                    }
                });
                return { [targetLang]: translatedData };
            }
        }

        // Default behavior for general text strings (keep as is for UI labels)
        const { output: translationMap } = await customGenerateText({
            model: google('gemini-3-flash-preview'),
            prompt: `Translate the following UI text into these languages: da (Danish), de (German), nl (Dutch), sv (Swedish), no (Norwegian), es (Spanish), fr (French), pt (Portuguese), it (Italian).
                
                Source Text (English): "${text}"
                
                Context: A mobile app scanner for ethical consumption. Short, concise UI labels.
                
                Return ONLY a JSON object mapping language code to translation. Example: {"da": "Hej", "de": "Hallo"}`,
            output: Output.object({ schema: z.record(z.string(), z.string()) }) as any,
        });

        return translationMap || {};
    } catch (error) {
        console.error("Translation generation failed", error);
        return {};
    }
};

export const analyzeImage = async (
    imageBase64: string,
    userValues: Preference[] = [],
    model: string = 'madeometer-instant',
    language: string = 'en',
    location?: { lat: number, lng: number }
): Promise<ScanResult[]> => {
    return analyzeContent({ type: 'IMAGE', data: imageBase64 }, userValues, model, language, location);
};

export const analyzeText = async (
    query: string,
    userValues: Preference[] = [],
    model: string = 'madeometer-instant',
    language: string = 'en',
    location?: { lat: number, lng: number }
): Promise<ScanResult[]> => {
    return analyzeContent({ type: 'TEXT', data: query }, userValues, model, language, location);
};

type ImagePart = { type: 'image', image: string, mimeType: string };
type TextPart = { type: 'text', text: string };

const analyzeContent = async (
    input: { type: 'IMAGE' | 'TEXT', data: string },
    userValues: Preference[] = [],
    model: string = 'madeometer-instant',
    language: string = 'en',
    location?: { lat: number, lng: number }
): Promise<ScanResult[]> => {
    try {
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const { selectedModel, thinkingBudget, isSuperFast, isInstant } = await resolveModelConfig(model);
        const langName = await getLanguageName(language);

        const parts: any[] = [];
        let userPrompt = "";

        // Format preferences including descriptions for rich context
        const formattedPrefs = formatUserPreferences(userValues);

        const constraintsPrompt = userValues.length > 0
            ? `The user has enabled specific CRITERIA.
           1. AVOIDANCE CRITERIA (e.g. "Avoid Palm Oil", "No Plastic", "Avoid USA"): If the product contains these or matches the negative condition (e.g. IS from USA), it VIOLATES the rule -> Mark AVOID.
           2. REQUIREMENT CRITERIA (e.g. "Vegan", "EU Only"): If the product FAILS to meet these (e.g. is NOT Vegan), it VIOLATES the rule -> Mark AVOID.
           
           Active User Criteria: ${formattedPrefs}.
           
           Analyze the product strictly against these criteria. 
           If a product violates a preference, mark as AVOID and list the violated preference in matchedUserCriteria. 
           CRITICAL: If the product is identified and does NOT violate any specific user criteria, YOU MUST MARK IT AS 'RECOMMENDED'. Do NOT use 'NEUTRAL' for identified products that simply pass the tests. 'NEUTRAL' is only for unidentified items or completely missing data.
           IN THE 'description' FIELD, YOU MUST EXPLAIN THE RELATIONSHIP TO THESE PREFERENCES.`
            : "Analyze the product. If identified, default to RECOMMENDED.";

        // Optimized Prompt Construction
        if (isSuperFast) {
            // LITE & INSTANT PROMPT
            if (input.type === 'IMAGE') {
                const cleanBase64 = input.data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
                userPrompt = `Date: ${currentDate}. Scan image. Identify brands. ${constraintsPrompt} Return JSON. IMPORTANT: PROVIDE ALL TEXT DESCRIPTIONS IN ${langName.toUpperCase()}.`;
            } else {
                userPrompt = `Date: ${currentDate}. Analyze "${input.data}". Identify the product, official website, and try to find a public product image URL. ${constraintsPrompt} Return JSON. IMPORTANT: PROVIDE ALL TEXT DESCRIPTIONS IN ${langName.toUpperCase()}.`;
            }
        } else {
            // FULL PROMPT
            if (input.type === 'IMAGE') {
                const cleanBase64 = input.data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
                userPrompt = `Current Date: ${currentDate}. Scan this image. Identify every brand. ${constraintsPrompt} VERIFY OWNER, ORIGIN, AND ALTERNATIVES WITH SEARCH. Return JSON. IMPORTANT: PROVIDE ALL TEXT DESCRIPTIONS IN ${langName.toUpperCase()}.`;
            } else {
                userPrompt = `Current Date: ${currentDate}. Analyze the product/brand: "${input.data}". Find official website and product image. ${constraintsPrompt} VERIFY OWNER, ORIGIN, AND ALTERNATIVES WITH SEARCH. Return JSON. IMPORTANT: PROVIDE ALL TEXT DESCRIPTIONS IN ${langName.toUpperCase()}.`;
            }
        }

        // --- Schema Selection ---
        let schema: any = scanResultSchema;
        if (isInstant) {
            schema = scanResultSchemaInstant;
        } else if (isSuperFast) {
            schema = scanResultSchemaLite;
        }



        const { output: data, providerMetadata } = await customGenerateText({
            model: google(selectedModel),
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingBudget: thinkingBudget,
                    },
                    structuredOutputs: true,
                } satisfies GoogleLanguageModelOptions,
            },
            system: isInstant ? SYSTEM_INSTRUCTION_INSTANT : (isSuperFast ? SYSTEM_INSTRUCTION_LITE : SYSTEM_INSTRUCTION),
            messages: [
                {
                    role: 'user',
                    content: (parts as any).map((p: any) => {
                        if (p.inlineData) {
                            return {
                                type: 'image',
                                image: p.inlineData.data,
                                mimeType: p.inlineData.mimeType,
                            } as ImagePart;
                        }
                        return { type: 'text', text: p.text || "" } as TextPart;
                    }).concat([{ type: 'text', text: userPrompt }])
                }
            ],
            temperature: 0.2,
            tools: (!isInstant && isSuperFast) ? {} : {
                googleSearch: google.tools.googleSearch({})
            },
            output: Output.object({ schema }) as any,
        });

        const typedData = data as any;

        console.log(JSON.stringify(providerMetadata, null, 2))

        // Extract Grounding
        let groundingLinks: { title: string; uri: string }[] = [];
        const groundingChunks = (providerMetadata?.google as any)?.groundingMetadata?.groundingChunks;
        if (groundingChunks && Array.isArray(groundingChunks)) {
            const linkMap = new Map<string, string>();
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                    linkMap.set(chunk.web.uri, chunk.web.title);
                }
            });
            groundingLinks = Array.from(linkMap.entries()).map(([uri, title]) => ({ title, uri }));
        }

        if (!typedData || !typedData.items || !Array.isArray(typedData.items)) {
            console.warn("Invalid data structure returned", typedData);
            return [];
        }

        // Process items asynchronously to allow Unsplash fetching
        const results: ScanResult[] = await Promise.all(typedData.items.map(async (item: any) => {
            let rawScore = item.confidenceScore;

            // Handle case where model returns decimal (0-1) instead of percentage (0-100)
            if (typeof rawScore === 'number' && rawScore <= 1 && rawScore > 0) {
                rawScore = rawScore * 100;
            }

            const confidence = Math.max(1, Math.min(Math.round(rawScore || 85), 99));

            const validatedBy = confidence >= 99 ? 'system' : undefined;
            const lastValidated = confidence >= 99 ? Date.now() : undefined;

            // --- MERGE SOURCES ---
            if (item.webSources && Array.isArray(item.webSources)) {
                item.webSources.forEach((src: any) => {
                    if (src.uri && src.title && !groundingLinks.some(g => g.uri === src.uri)) {
                        groundingLinks.push({ title: src.title, uri: src.uri });
                    }
                });
            }

            // --- WHITELIST & BLACKLIST CHECK ---
            let verdict = item.verdict;
            let verdictReason = item.verdictReason || "";

            // 1. Check Blacklist
            const isBrandBlacklisted = !!(await prisma.blacklist.findUnique({ where: { id: item.ownerCompany.toLowerCase().trim() } }));
            const isProductBlacklisted = !!(await prisma.blacklist.findUnique({ where: { id: item.itemName.toLowerCase().trim() } }));

            if (isBrandBlacklisted || isProductBlacklisted) {
                verdict = 'AVOID';
                verdictReason = "Blocked by Personal Blacklist";
            }

            // 2. Check Whitelist
            const isBrandWhitelisted = !!(await prisma.whitelist.findUnique({ where: { id: item.ownerCompany.toLowerCase().trim() } }));
            const isProductWhitelisted = !!(await prisma.whitelist.findUnique({ where: { id: item.itemName.toLowerCase().trim() } }));

            if (isBrandWhitelisted || isProductWhitelisted) {
                verdict = 'RECOMMENDED';
                verdictReason = (verdictReason ? verdictReason + ". " : "") + "(Personal Whitelist)";
            }

            // --- ENHANCED WEBSITE / IMAGE FINDING LOGIC ---
            let website = item.website;
            let productImageUrl = item.productImageUrl;

            // Fallback: If model didn't fill website, try to find a relevant link in grounding metadata
            if (!website && groundingLinks.length > 0) {
                const candidate = groundingLinks.find(l => !l.uri.includes('wikipedia.org') && !l.uri.includes('amazon'));
                if (candidate) {
                    try {
                        const hostname = new URL(candidate.uri).hostname;
                        website = hostname;
                    } catch (e) { }
                }
            }

            // Determine Final Image URL
            let finalImageUrl = input.type === 'IMAGE' ? input.data : null;

            if (!finalImageUrl) {
                // Check local DB for curated image (Admin/User verified)
                const product = await prisma.product.findUnique({ where: { name: item.itemName.trim() } });
                const brand = await prisma.brand.findUnique({ where: { name: item.ownerCompany.trim() } });
                const storedImage = (product?.imageUrl && product.imageUrl.startsWith('http'))
                    ? product.imageUrl
                    : (brand?.imageUrl && brand.imageUrl.startsWith('http'))
                        ? brand.imageUrl
                        : null;

                // Priority 1: Stored DB Image
                if (storedImage) {
                    finalImageUrl = storedImage;
                }

                // Priority 2: Specific Product Image (found by Gemini via search)
                if (!finalImageUrl && productImageUrl && productImageUrl.startsWith('http')) {
                    finalImageUrl = productImageUrl;
                }

                // REMOVED BLOCKING UNSPLASH FETCH HERE TO SPEED UP RESPONSE
                // The client UI will assume responsibility for fetching better images for text searches.

                // Priority 4: High quality logo from website (Fallback if specific image fails)
                if (!finalImageUrl && website) {
                    const websiteUrl = website.startsWith('http') ? website : `https://${website}`;
                    finalImageUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(websiteUrl)}&size=256`;
                }
                // Priority 5: Placeholder
                if (!finalImageUrl) {
                    finalImageUrl = `https://placehold.co/400x400?text=${encodeURIComponent(item.itemName)}`;
                }
            }

            return {
                id: generateId(),
                timestamp: Date.now(),
                imageUrl: finalImageUrl,
                itemName: item.itemName,
                ownerCompany: item.ownerCompany,
                // Fallback for fields removed in Instant Schema
                ownerCountry: standardizeCountry(await stripFlags(item.ownerCountry || ""), item.ownerCountryCode),
                ownerCountryCode: item.ownerCountryCode,
                ownerFlag: getFlagEmoji(item.ownerCountryCode),
                originCountry: item.originCountry ? standardizeCountry(await stripFlags(item.originCountry), item.originCountryCode) : "Unknown",
                originCountryCode: item.originCountryCode,
                originFlag: getFlagEmoji(item.originCountryCode),
                manufacturedIn: item.manufacturedIn || "Unknown",
                manufacturedInCode: item.manufacturedInCode,
                description: item.description,
                website: website,
                verdict: verdict,
                verdictReason: verdictReason,
                matchedUserCriteria: item.matchedUserCriteria || [],
                usaOwnershipScore: item.usaOwnershipScore || 0,
                republicanScore: item.republicanScore,
                sustainabilityScore: item.sustainabilityScore || 50,
                ethicsScore: item.ethicsScore || 50,
                alternatives: item.alternatives || [],
                europeanAlternatives: item.europeanAlternatives || [],
                groundingLinks: groundingLinks,
                webSources: item.webSources || [], // Pass formatted sources
                box_2d: item.box_2d,
                confidenceScore: confidence,
                dataSources: item.dataSources || [],
                keyEvidence: item.keyEvidence || [],
                uncertainties: item.uncertainties || [],

                validatedBy: validatedBy,
                lastValidated: lastValidated
            };
        }));

        return results;

    } catch (error) {
        console.error("Analysis Failed:", error);
        throw error;
    }
};
