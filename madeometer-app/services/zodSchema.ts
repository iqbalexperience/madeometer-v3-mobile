import { z } from "zod";

// --- Components ---

const alternativeItemSchema = z.object({
    name: z.string(),
    reason: z.string().describe("Reason in Target Language"),
    website: z.string().optional(),
    price: z.string().optional(),
    findAt: z.string().optional(),
    ownerCountryCode: z.string().describe("ISO 3166-1 alpha-2 code of the alternative's owner.").optional()
}).describe("Alternative product information");

const europeanAlternativeItemSchema = z.object({
    name: z.string(),
    reason: z.string().describe("Reason in Target Language"),
    country: z.string().describe("Translate to Target Language"),
    website: z.string().optional(),
    price: z.string().optional(),
    findAt: z.string().optional()
}).describe("European alternative product information");

const webSourceSchema = z.object({
    title: z.string(),
    uri: z.string(),
    category: z.enum(["POLITICAL", "OWNERSHIP", "GENERAL"]).describe("Classify source content.")
});

const keyEvidenceSchema = z.object({
    point: z.string().describe("Evidence point in Target Language"),
    confidence: z.enum(["High", "Medium", "Low"])
});

// --- Main Schemas ---

/**
 * Full Schema for comprehensive product analysis
 */
export const scanResultSchema = z.object({
    items: z.array(z.object({
        itemName: z.string().describe("Specific brand + product name."),
        ownerCompany: z.string().describe("The ULTIMATE parent company."),
        ownerCountry: z.string().describe("The country of the ULTIMATE parent company's HQ (Translate country name to Target Language)."),
        ownerCountryCode: z.string().describe("ISO 3166-1 alpha-2 code (e.g. US, DK, CN)").optional(),
        originCountry: z.string().describe("The country where the brand started (Translate country name to Target Language).").optional(),
        originCountryCode: z.string().describe("ISO 3166-1 alpha-2 code (e.g. US, DK, CN)").optional(),
        manufacturedIn: z.string().describe("Country of manufacture. If global/unknown, use 'Multiple countries' (translated).").optional(),
        manufacturedInCode: z.string().describe("ISO code. Use 'ZG' for Global/Multiple.").optional(),
        website: z.string().describe("Official website domain (e.g., brand.com) for logo fetching.").optional(),
        productImageUrl: z.string().describe("A public URL to a representative image of the product (from wikimedia/official site/retailer) found via search.").optional(),
        description: z.string().describe("A detailed paragraph (approx 200 words) in Target Language. Must include: 1. Brand identity. 2. Ownership facts. 3. Verified Political Profile (or statement that none exists). 3. Preference violations.").optional(),
        verdict: z.enum(["RECOMMENDED", "NEUTRAL", "AVOID"]),
        verdictReason: z.string().describe("Reason in Target Language").optional(),
        matchedUserCriteria: z.array(z.string()).optional(),
        usaOwnershipScore: z.number().optional(),
        republicanScore: z.number().describe("0 (Democrat) to 100 (Republican) based on donations. 50 if unknown.").optional(),
        sustainabilityScore: z.number().optional(),
        ethicsScore: z.number().optional(),
        alternatives: z.array(alternativeItemSchema).describe("List of alternatives ordered by POPULARITY (most popular first).").optional(),
        europeanAlternatives: z.array(europeanAlternativeItemSchema).describe("List of European alternatives ordered by POPULARITY (most popular first).").optional(),
        box_2d: z.array(z.number()).optional(),
        confidenceScore: z.number().optional(),
        webSources: z.array(webSourceSchema).optional(),
        keyEvidence: z.array(keyEvidenceSchema).optional(),
        uncertainties: z.array(z.string()).optional()
    }))
});

/**
 * Lite Schema (Minimal Tokens but includes Evidence)
 */
export const scanResultSchemaLite = z.object({
    items: z.array(z.object({
        itemName: z.string(),
        ownerCompany: z.string(),
        ownerCountry: z.string().describe("Translate to Target Language"),
        ownerCountryCode: z.string().describe("ISO 3166-1 alpha-2 code (e.g. US)").optional(),
        originCountry: z.string().describe("Translate to Target Language").optional(),
        originCountryCode: z.string().describe("ISO 3166-1 alpha-2 code (e.g. US)").optional(),
        manufacturedIn: z.string().optional(),
        manufacturedInCode: z.string().describe("ISO code. Use 'ZG' for Global.").optional(),
        website: z.string().describe("Official website domain (e.g., brand.com).").optional(),
        productImageUrl: z.string().describe("A public URL to a representative image of the product if found.").optional(),
        description: z.string().describe("A paragraph (4-6 sentences) identifying the product, owner, and explaining any preference violations in Target Language.").optional(),
        verdict: z.enum(["RECOMMENDED", "NEUTRAL", "AVOID"]),
        matchedUserCriteria: z.array(z.string()).optional(),
        usaOwnershipScore: z.number().optional(),
        republicanScore: z.number().describe("0-100 Political Donation Score").optional(),
        box_2d: z.array(z.number()).optional(),
        confidenceScore: z.number().optional(),
        keyEvidence: z.array(keyEvidenceSchema).optional(),
        dataSources: z.array(z.string()).optional(),
        webSources: z.array(webSourceSchema).optional()
    }))
});

/**
 * INSTANT SCHEMA - Expanded for Made In info, Evidence, Sources
 */
export const scanResultSchemaInstant = z.object({
    items: z.array(z.object({
        itemName: z.string(),
        ownerCompany: z.string(),
        ownerCountry: z.string(),
        ownerCountryCode: z.string().describe("ISO 3166-1 alpha-2 code (e.g. US, DK)"),
        originCountry: z.string().optional(),
        originCountryCode: z.string().optional(),
        manufacturedIn: z.string().describe("Likely manufacturing country. Use 'Multiple countries' for global brands.").optional(),
        manufacturedInCode: z.string().describe("ISO code. Use 'ZG' for Global.").optional(),
        description: z.string(),
        verdict: z.enum(["RECOMMENDED", "NEUTRAL", "AVOID"]),
        matchedUserCriteria: z.array(z.string()).optional(),
        republicanScore: z.number().optional(),
        confidenceScore: z.number().optional(),
        box_2d: z.array(z.number()).describe("Bounding box [ymin, xmin, ymax, xmax]"),
        keyEvidence: z.array(keyEvidenceSchema).optional(),
        webSources: z.array(webSourceSchema).optional()
    }))
});

/**
 * Alternatives Only Schema
 */
export const alternativesSchema = z.object({
    alternatives: z.array(z.object({
        name: z.string(),
        reason: z.string().describe("Why it is a good alternative (Target Language)."),
        findAt: z.string().describe("Retailer name or 'Online'.").optional(),
        website: z.string().optional(),
        ownerCountryCode: z.string().describe("ISO 3166-1 alpha-2 code of the alternative's owner (e.g. DE, FR).").optional()
    })).describe("List of alternatives ordered by POPULARITY (most popular first).")
});

/**
 * Shopping Options Schema
 */
export const shoppingOptionsSchema = z.object({
    sellers: z.array(z.object({
        retailer: z.string(),
        price: z.string(),
        link: z.string().describe("The EXACT URL to the specific product page where the price was found."),
        type: z.enum(["ONLINE", "NEARBY"]),
        availability: z.string().describe("e.g., In Stock").optional()
    }))
});
