/**
 * features.ts — Centralized Feature Gating Registry (React Native)
 */

export type PlanName = 'free' | 'plus';

export const PLANS: Record<PlanName, { title: string; description: string }> = {
    free: { title: 'Free', description: 'Basic scanning and history' },
    plus: { title: 'Plus', description: 'Unlimited access to all features' },
};

export type GateMode = 'allow' | 'lock' | 'blur' | 'hide' | 'message';

export type FeatureKey =
    | 'ai_model_fast'
    | 'ai_model_superfast'
    | 'ai_model_flash'
    | 'scan_input'
    | 'upload_input'
    | 'text_search_input'
    | 'history_scan_limit'
    | 'history_scan_lock_icon'
    | 'custom_rules'
    | 'global_preferences'
    | 'app_language'
    | 'currency'
    | 'shopping_location'
    | 'app_features'
    | 'scan_result_reload'
    | 'scan_result_edit'
    | 'scan_result_delete'
    | 'scan_result_tab_alternatives'
    | 'scan_result_tab_shopping'
    | 'scan_result_tab_about'
    | 'owner_country'
    | 'owner_company'
    | 'made_in_country'
    | 'reliability_score'
    | 'scores'
    | 'political_donation_status'
    | 'whitelist'
    | 'blocklist'
    | 'multi_product_scan'
    | 'multi_product_scan_limit'
    | 'multi_product_tab_safe'
    | 'multi_product_tab_avoid';

export interface FeatureLimits {
    history_scan_limit: number;
    custom_rules: number;
    multi_product_scan_limit: number;
}

export const FEATURE_LIMITS: Record<PlanName, FeatureLimits> = {
    free: {
        history_scan_limit: 10,
        custom_rules: 0,
        multi_product_scan_limit: 3,
    },
    plus: {
        history_scan_limit: Infinity,
        custom_rules: Infinity,
        multi_product_scan_limit: Infinity,
    },
};

export type FeatureAccessConfig = Record<FeatureKey, GateMode>;

export const PLAN_FEATURE_ACCESS: Record<PlanName, FeatureAccessConfig> = {
    free: {
        ai_model_fast: 'allow',
        ai_model_superfast: 'lock',
        ai_model_flash: 'lock',
        scan_input: 'allow',
        upload_input: 'allow',
        text_search_input: 'allow',
        history_scan_limit: 'allow',
        history_scan_lock_icon: 'allow',
        custom_rules: 'lock',
        global_preferences: 'lock',
        app_language: 'allow',
        currency: 'allow',
        shopping_location: 'lock',
        app_features: 'lock',
        scan_result_reload: 'lock',
        scan_result_edit: 'lock',
        scan_result_delete: 'allow',
        scan_result_tab_alternatives: 'lock',
        scan_result_tab_shopping: 'lock',
        scan_result_tab_about: 'allow',
        owner_country: 'allow',
        owner_company: 'allow',
        made_in_country: 'allow',
        reliability_score: 'allow',
        scores: 'allow',
        political_donation_status: 'blur',
        whitelist: 'lock',
        blocklist: 'lock',
        multi_product_scan: 'lock',
        multi_product_scan_limit: 'lock',
        multi_product_tab_safe: 'lock',
        multi_product_tab_avoid: 'lock',
    },
    plus: {
        ai_model_fast: 'allow',
        ai_model_superfast: 'allow',
        ai_model_flash: 'allow',
        scan_input: 'allow',
        upload_input: 'allow',
        text_search_input: 'allow',
        history_scan_limit: 'allow',
        history_scan_lock_icon: 'hide',
        custom_rules: 'allow',
        global_preferences: 'allow',
        app_language: 'allow',
        currency: 'allow',
        shopping_location: 'allow',
        app_features: 'allow',
        scan_result_reload: 'allow',
        scan_result_edit: 'allow',
        scan_result_delete: 'allow',
        scan_result_tab_alternatives: 'allow',
        scan_result_tab_shopping: 'allow',
        scan_result_tab_about: 'allow',
        owner_country: 'allow',
        owner_company: 'allow',
        made_in_country: 'allow',
        reliability_score: 'allow',
        scores: 'allow',
        political_donation_status: 'allow',
        whitelist: 'allow',
        blocklist: 'allow',
        multi_product_scan: 'allow',
        multi_product_scan_limit: 'allow',
        multi_product_tab_safe: 'allow',
        multi_product_tab_avoid: 'allow',
    },
};

export function getGateMode(plan: PlanName, feature: FeatureKey): GateMode {
    return PLAN_FEATURE_ACCESS[plan]?.[feature] ?? 'lock';
}

export function canAccess(plan: PlanName, feature: FeatureKey): boolean {
    return getGateMode(plan, feature) === 'allow';
}

export function getFeatureLimit(plan: PlanName, feature: keyof FeatureLimits): number {
    return FEATURE_LIMITS[plan]?.[feature] ?? Infinity;
}

export function isWithinLimit(plan: PlanName, feature: keyof FeatureLimits, index: number): boolean {
    const limit = getFeatureLimit(plan, feature);
    return index < limit;
}
