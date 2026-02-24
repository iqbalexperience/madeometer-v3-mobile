"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import {
    getGateMode as resolveGateMode,
    canAccess as resolveCanAccess,
    getFeatureLimit as resolveFeatureLimit,
    isWithinLimit as resolveIsWithinLimit,
    PLAN_FEATURE_ACCESS,
    type FeatureKey,
    type FeatureLimits,
    type GateMode,
    type PlanName,
} from "@/lib/features";
import { UpgradeDialog } from "../components/UpgradeDialog";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface FeatureGateContextValue {
    /** Current resolved plan name. Defaults to "free" while loading or unauthenticated. */
    plan: PlanName;
    /** True while subscription data is still loading. */
    isLoading: boolean;
    /** Returns the GateMode for a feature on the current plan. */
    getGateMode: (feature: FeatureKey) => GateMode;
    /** Returns true if the current plan has full access to a feature. */
    canAccess: (feature: FeatureKey) => boolean;
    /** Returns the numeric limit for count-gated features. */
    getFeatureLimit: (feature: keyof FeatureLimits) => number;
    /** Returns true if a 0-based item index is within the plan's limit. */
    isWithinLimit: (feature: keyof FeatureLimits, index: number) => boolean;
    /**
     * Open the global UpgradeDialog from anywhere inside the provider tree.
     * Pass an optional feature label to show in the dialog headline.
     */
    openUpgradeDialog: (featureLabel?: string) => void;
}

const FeatureGateContext = createContext<FeatureGateContextValue | undefined>(
    undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FeatureGateProvider({ children }: { children: ReactNode }) {
    const { data: session, isPending: sessionLoading } = authClient.useSession();

    // Fetch the active subscription once when the session becomes available.
    const [subscriptionData, setSubscriptionData] = useState<{ plan?: string } | null>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);

    // ── Global UpgradeDialog state ──────────────────────────────────────────
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogFeatureLabel, setDialogFeatureLabel] = useState<string | undefined>(undefined);

    const openUpgradeDialog = useCallback((featureLabel?: string) => {
        setDialogFeatureLabel(featureLabel);
        setDialogOpen(true);
    }, []);

    useEffect(() => {
        if (!session?.user || session.user.isAnonymous) {
            setSubscriptionData(null);
            return;
        }

        let cancelled = false;
        setSubscriptionLoading(true);

        authClient.subscription.list().then(({ data: subs }) => {
            if (cancelled) return;
            const active = subs?.find(
                (s: { status: string }) => s.status === "active" || s.status === "trialing"
            );
            setSubscriptionData(active ?? null);
        }).catch(() => {
            if (!cancelled) setSubscriptionData(null);
        }).finally(() => {
            if (!cancelled) setSubscriptionLoading(false);
        });

        return () => { cancelled = true; };
    }, [session?.user?.id]);

    const isLoading = sessionLoading || subscriptionLoading;

    const plan = useMemo<PlanName>(() => {
        if (!session?.user || isLoading) return "free";

        // Admins always have full plus access
        const role = (session.user as any).role as string | undefined;
        if (role === "admin") return "plus";

        const activePlan = subscriptionData?.plan as string | undefined;

        if (activePlan && activePlan in PLAN_FEATURE_ACCESS) {
            return activePlan as PlanName;
        }

        return "free";
    }, [session, subscriptionData, isLoading]);

    const value = useMemo<FeatureGateContextValue>(
        () => ({
            plan,
            isLoading,
            getGateMode: (feature) => resolveGateMode(plan, feature),
            canAccess: (feature) => resolveCanAccess(plan, feature),
            getFeatureLimit: (feature) => resolveFeatureLimit(plan, feature),
            isWithinLimit: (feature, index) =>
                resolveIsWithinLimit(plan, feature, index),
            openUpgradeDialog,
        }),
        [plan, isLoading, openUpgradeDialog]
    );

    return (
        <FeatureGateContext.Provider value={value}>
            {children}
            {/* Single UpgradeDialog instance rendered at the root of the provider */}
            <UpgradeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                currentPlan={plan}
                featureLabel={dialogFeatureLabel}
            />
        </FeatureGateContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access feature gate utilities anywhere inside `<FeatureGateProvider>`.
 *
 * @example
 * const { canAccess, openUpgradeDialog } = useFeatureGate();
 * openUpgradeDialog("App Language");
 */
export function useFeatureGate(): FeatureGateContextValue {
    const context = useContext(FeatureGateContext);
    if (!context) {
        throw new Error(
            "useFeatureGate must be used within a <FeatureGateProvider>"
        );
    }
    return context;
}
