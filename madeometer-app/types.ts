
export interface Preference {
  id: string;
  label: string;
  description?: string; // Optional context for the AI
  active: boolean;
  isCustom?: boolean; // Identify user-created preferences
  category?: 'CRITERIA' | 'FEATURE'; // Distinguish between avoidance criteria and app features
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  password?: string; // Stored locally for demo purposes only
  isGuest: boolean;
  isAdmin?: boolean; // New Superadmin flag
  joinedAt: number;
  preferences?: Preference[];
}

export interface WhitelistItem {
  id: string;
  type: 'BRAND' | 'PRODUCT';
  name: string;
  timestamp: number;
}

export interface Feedback {
  id: string;
  userId?: string;
  scanId?: string; // Optional: link to specific scan
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
  distance?: string; // For nearby
  availability?: string;
}

export interface ScanResult {
  id: string;
  userId?: string; // Link scan to specific user
  timestamp: number;
  imageUrl: string;
  itemName: string;
  ownerCompany: string;
  ownerCountry: string;
  ownerCountryCode?: string; // ISO Code for Owner Country
  ownerFlag: string;
  originCountry: string;
  originCountryCode?: string; // ISO Code for Origin Country
  originFlag: string;
  manufacturedIn: string;
  manufacturedInCode?: string; // ISO Code for Made In flag
  description: string;
  website?: string; // New field for logo fallback
  // New Fields for Pro Features
  verdict: 'RECOMMENDED' | 'NEUTRAL' | 'AVOID';
  verdictReason: string;
  matchedUserCriteria: string[]; // List of user preferences that triggered a warning
  usaOwnershipScore?: number; // 0-100 representing percentage of USA affiliation
  republicanScore?: number; // 0-100: 0 = Democrat, 100 = Republican
  sustainabilityScore: number; // 0-100
  ethicsScore: number; // 0-100
  // Updated Alternatives Structure
  alternatives: Array<{
    name: string;
    reason: string;
    website?: string;
    price?: string;
    findAt?: string;
    ownerCountryCode?: string; // New field for flag display
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
  webSources?: WebSource[]; // Structured sources with categories
  shoppingOptions?: ShoppingOption[]; // Where to buy options
  box_2d?: number[]; // [ymin, xmin, ymax, xmax] normalized 0-1000

  // Validation & Confidence
  confidenceScore?: number; // 0-100
  dataSources?: string[]; // Names of sources found (e.g. "Annual Report 2023", "Bloomberg")
  keyEvidence?: Array<{ point: string; confidence: 'High' | 'Medium' | 'Low' }>;
  uncertainties?: string[];

  // Caching & Validation Logic
  validatedBy?: 'system' | 'admin' | 'user'; // Who verified this data?
  lastValidated?: number; // Timestamp for cache expiration (3 months)
  translations?: Record<string, any>;
  language?: string;
}

export enum AppView {
  SCAN = 'SCAN',
  DETAILS = 'DETAILS',
  HISTORY = 'HISTORY',
  CART = 'CART',
  COMMUNITY = 'COMMUNITY',
}
