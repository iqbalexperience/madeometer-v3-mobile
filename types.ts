export interface Preference {
    id: string;
    label: string;
    description?: string;
    active: boolean;
    isCustom?: boolean;
    category?: 'CRITERIA' | 'FEATURE';
}

export interface UserProfile {
    id: string;
    name?: string;
    email?: string;
    isGuest: boolean;
    isAdmin?: boolean;
    joinedAt: number;
    preferences?: Preference[];
}

export interface Feedback {
    id: string;
    userId?: string;
    scanId?: string;
    type: 'GENERAL' | 'INACCURATE_RESULT' | 'BUG' | 'FEATURE_REQUEST';
    message: string;
    timestamp: number;
}

export interface WebSource {
    title: string;
    uri: string;
    category?: 'POLITICAL' | 'OWNERSHIP' | 'GENERAL';
}

export interface ShoppingOption {
    retailer: string;
    price: string;
    link: string;
    type: 'ONLINE' | 'NEARBY';
    distance?: string;
    availability?: string;
}

export interface ScanResult {
    id: string;
    userId?: string;
    timestamp: number;
    imageUrl: string;
    itemName: string;
    ownerCompany: string;
    ownerCountry: string;
    ownerCountryCode?: string;
    ownerFlag: string;
    originCountry: string;
    originCountryCode?: string;
    originFlag: string;
    manufacturedIn: string;
    manufacturedInCode?: string;
    description: string;
    website?: string;
    verdict: 'RECOMMENDED' | 'NEUTRAL' | 'AVOID';
    verdictReason: string;
    matchedUserCriteria: string[];
    usaOwnershipScore?: number;
    republicanScore?: number;
    sustainabilityScore: number;
    ethicsScore: number;
    alternatives: Array<{
        name: string;
        reason: string;
        website?: string;
        price?: string;
        findAt?: string;
        ownerCountryCode?: string;
    }>;
    europeanAlternatives: Array<{
        name: string;
        reason: string;
        country: string;
        website?: string;
        price?: string;
        findAt?: string;
    }>;
    groundingLinks?: { title: string; uri: string }[];
    webSources?: WebSource[];
    shoppingOptions?: ShoppingOption[];
    box_2d?: number[];
    confidenceScore?: number;
    dataSources?: string[];
    keyEvidence?: Array<{ point: string; confidence: 'High' | 'Medium' | 'Low' }>;
    uncertainties?: string[];
    validatedBy?: 'system' | 'admin' | 'user';
    lastValidated?: number;
    translations?: Record<string, any>;
    language?: string;
}

export interface WhitelistItem {
    id: string;
    type: 'BRAND' | 'PRODUCT';
    name: string;
    timestamp: number;
}

export enum AppView {
    SCAN = 'SCAN',
    DETAILS = 'DETAILS',
    HISTORY = 'HISTORY',
    CART = 'CART',
    COMMUNITY = 'COMMUNITY',
    PROFILE = 'PROFILE',
    SUPPORT = 'SUPPORT',
}
