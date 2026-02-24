/**
 * features.ts — Centralized Feature Gating Registry
 *
 * This is the single source of truth for:
 *  - Plan names (matching better-auth/stripe plan names in auth.ts)
 *  - All feature keys across the app
 *  - The gate mode each plan gets for each feature
 *  - Numeric limits for count-gated features
 */

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/** Plan names must match the `name` field in auth.ts subscription plans */
export type PlanName = "free" | "plus";

export const PLANS: Record<PlanName, { title: string; description: string }> = {
    free: {
        title: "Free",
        description: "Basic scanning and history",
    },
    plus: {
        title: "Plus",
        description: "Unlimited access to all features",
    },
};

// ---------------------------------------------------------------------------
// Gate Modes
// ---------------------------------------------------------------------------

/**
 * How a gated feature is presented to a user who doesn't have access:
 *
 * - allow   → full access, render normally
 * - lock    → render with a Lock badge overlay; tap opens UpgradeDialog
 * - blur    → render children blurred; tap opens UpgradeDialog
 * - hide    → render nothing (feature is invisible)
 * - message → replace content with an inline "Upgrade to unlock" banner
 */
export type GateMode = "allow" | "lock" | "blur" | "hide" | "message";

// ---------------------------------------------------------------------------
// Feature Keys
// ---------------------------------------------------------------------------

/**
 * All gatable feature keys in the application.
 * Grouping comments indicate where in the UI each key is used.
 */
export type FeatureKey =
    // ── Header ──────────────────────────────────────────────────────────────
    | "ai_model_fast"          // "Fast" AI model selector chip
    | "ai_model_superfast"     // "Superfast" AI model selector chip
    | "ai_model_flash"         // "Flash" AI model selector chip

    // ── Home Screen ─────────────────────────────────────────────────────────
    | "scan_input"             // Camera/barcode scan button
    | "upload_input"           // Image upload button
    | "text_search_input"      // Text search input

    // ── History Screen ───────────────────────────────────────────────────────
    | "history_scan_limit"     // Numeric cap on visible history items (see FEATURE_LIMITS)
    | "history_scan_lock_icon" // Lock icon shown on history items beyond the cap

    // ── Settings › Scanner ───────────────────────────────────────────────────
    | "custom_rules"           // Custom scanner rules (limited by FEATURE_LIMITS)
    | "global_preferences"     // Global scanning preferences

    // ── Settings › Account ───────────────────────────────────────────────────
    | "app_language"           // App language selection
    | "currency"               // Currency selection
    | "shopping_location"      // Shopping location selection
    | "app_features"           // App feature toggles

    // ── Scan Result Page — Actions ───────────────────────────────────────────
    | "scan_result_reload"     // Re-run analysis on an existing scan
    | "scan_result_edit"       // Manually edit scan fields
    | "scan_result_delete"     // Delete a scan from history

    // ── Scan Result Page — Tabs ──────────────────────────────────────────────
    | "scan_result_tab_alternatives" // "Alternatives" tab showing similar products
    | "scan_result_tab_shopping"     // "Shopping" tab with purchase links/prices
    | "scan_result_tab_about"        // "About" tab with brand/product detail

    // ── Scan Result Page — Product Info ──────────────────────────────────────
    | "owner_country"          // Country of the product owner/brand
    | "owner_company"          // Parent company of the product owner
    | "made_in_country"        // Country where the product is manufactured

    // ── Scan Result Page — Scores ────────────────────────────────────────────
    | "reliability_score"      // AI reliability / confidence score
    | "scores"                 // Detailed score breakdown (ethics, environment, etc.)
    | "political_donation_status" // Political donation meter (rep/dem leaning, USA score)

    // ── Scan Result Page — Lists ─────────────────────────────────────────────
    | "whitelist"              // Add product to personal whitelist
    | "blocklist"              // Add product to personal blocklist

    // ── Multi-Product Scan ───────────────────────────────────────────────────
    | "multi_product_scan"       // Scan multiple products in one session
    | "multi_product_scan_limit" // Numeric cap on products per session (see FEATURE_LIMITS)

    // ── Multi-Product Scan Report — Tabs ────────────────────────────────────
    | "multi_product_tab_safe"  // "Safe" tab listing approved products in a multi-scan
    | "multi_product_tab_avoid"; // "Avoid" tab listing flagged products in a multi-scan

// ---------------------------------------------------------------------------
// Numeric Limits
// ---------------------------------------------------------------------------

/**
 * For features that are count-gated, define the max number allowed per plan.
 * Use Infinity for unlimited.
 */
export interface FeatureLimits {
    history_scan_limit: number;
    custom_rules: number;
    /** Max number of products allowed in a single multi-product scan session */
    multi_product_scan_limit: number;
}

export const FEATURE_LIMITS: Record<PlanName, FeatureLimits> = {
    free: {
        history_scan_limit: 10,          // Free users see only the most recent scan
        custom_rules: 0,                // Free users cannot create custom rules
        multi_product_scan_limit: 3,    // Free users cannot use multi-product scan
    },
    plus: {
        history_scan_limit: Infinity,
        custom_rules: Infinity,
        multi_product_scan_limit: Infinity,   // Plus users can scan up to 10 products at once
    },
};

// ---------------------------------------------------------------------------
// Feature Access Config
// ---------------------------------------------------------------------------

/**
 * Defines the GateMode each plan gets for each feature.
 * The mode describes what the UI shows when a user on that plan
 * tries to access the feature.
 */
export type FeatureAccessConfig = Record<FeatureKey, GateMode>;

export const PLAN_FEATURE_ACCESS: Record<PlanName, FeatureAccessConfig> = {
    // ── Free plan ───────────────────────────────────────────────────────────
    free: {
        // Header — fast mode is available for free; superfast/flash are gated
        ai_model_fast: "allow",
        ai_model_superfast: "allow",
        ai_model_flash: "lock",

        // Home — scan, upload, and text search are all available for free
        scan_input: "allow",
        upload_input: "allow",
        text_search_input: "allow",

        // History — scans beyond the limit show a lock icon
        history_scan_limit: "allow",     // enforced numerically via FEATURE_LIMITS
        history_scan_lock_icon: "allow", // the lock icon itself is always rendered

        // Settings › Scanner — limited rules; global preferences are locked
        custom_rules: "lock",           // enforced numerically via FEATURE_LIMITS
        global_preferences: "lock",

        // Settings › Account — language/currency/location/features gated
        app_language: "allow",
        currency: "allow",
        shopping_location: "lock",
        app_features: "lock",

        // Scan Result — Actions
        scan_result_reload: "lock",     // free users may reload
        scan_result_edit: "lock",        // editing requires plus
        scan_result_delete: "allow",     // deletion always allowed

        // Scan Result — Tabs
        scan_result_tab_alternatives: "lock",
        scan_result_tab_shopping: "lock",
        scan_result_tab_about: "allow",  // basic about tab is free

        // Scan Result — Product Info
        owner_country: "allow",          // country shown for free
        owner_company: "allow",          // parent company requires plus
        made_in_country: "allow",        // manufactured-in country requires plus

        // Scan Result — Scores
        reliability_score: "allow",       // blurred teaser for free users
        scores: "allow",                  // blurred teaser for free users
        political_donation_status: "blur", // political donation meter requires plus

        // Scan Result — Lists
        whitelist: "lock",
        blocklist: "lock",

        // Multi-Product Scan
        multi_product_scan: "lock",
        multi_product_scan_limit: "lock", // enforced numerically via FEATURE_LIMITS

        // Multi-Product Scan Report — Tabs
        multi_product_tab_safe: "lock",
        multi_product_tab_avoid: "lock",
    },

    // ── Plus plan — full access to everything ───────────────────────────────
    plus: {
        ai_model_fast: "allow",
        ai_model_superfast: "allow",
        ai_model_flash: "allow",

        scan_input: "allow",
        upload_input: "allow",
        text_search_input: "allow",

        history_scan_limit: "allow",
        history_scan_lock_icon: "hide", // Plus users never see lock icons on history

        custom_rules: "allow",
        global_preferences: "allow",

        app_language: "allow",
        currency: "allow",
        shopping_location: "allow",
        app_features: "allow",

        // Scan Result — Actions
        scan_result_reload: "allow",
        scan_result_edit: "allow",
        scan_result_delete: "allow",

        // Scan Result — Tabs
        scan_result_tab_alternatives: "allow",
        scan_result_tab_shopping: "allow",
        scan_result_tab_about: "allow",

        // Scan Result — Product Info
        owner_country: "allow",
        owner_company: "allow",
        made_in_country: "allow",

        // Scan Result — Scores
        reliability_score: "allow",
        scores: "allow",
        political_donation_status: "allow",

        // Scan Result — Lists
        whitelist: "allow",
        blocklist: "allow",

        // Multi-Product Scan
        multi_product_scan: "allow",
        multi_product_scan_limit: "allow", // enforced numerically via FEATURE_LIMITS

        // Multi-Product Scan Report — Tabs
        multi_product_tab_safe: "allow",
        multi_product_tab_avoid: "allow",
    },
};

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

/**
 * Returns the GateMode for a given plan and feature key.
 * Falls back to "lock" if the plan or feature is unknown.
 */
export function getGateMode(plan: PlanName, feature: FeatureKey): GateMode {
    return PLAN_FEATURE_ACCESS[plan]?.[feature] ?? "lock";
}

/**
 * Returns true if the given plan has full access to a feature.
 */
export function canAccess(plan: PlanName, feature: FeatureKey): boolean {
    return getGateMode(plan, feature) === "allow";
}

/**
 * Returns the numeric limit for a count-gated feature on a given plan.
 * Returns Infinity if not applicable or if plus plan.
 */
export function getFeatureLimit(
    plan: PlanName,
    feature: keyof FeatureLimits
): number {
    return FEATURE_LIMITS[plan]?.[feature] ?? Infinity;
}

/**
 * Returns true if a given item index is within the allowed limit for a plan.
 * Uses 0-based index. e.g., isWithinLimit('free', 'history_scan_limit', 5) → false
 */
export function isWithinLimit(
    plan: PlanName,
    feature: keyof FeatureLimits,
    index: number
): boolean {
    const limit = getFeatureLimit(plan, feature);
    return index < limit;
}
