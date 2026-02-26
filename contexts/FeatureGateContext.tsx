import { authClient } from '@/lib/auth-client';
import {
    PLAN_FEATURE_ACCESS,
    canAccess as resolveCanAccess,
    getFeatureLimit as resolveFeatureLimit,
    getGateMode as resolveGateMode,
    isWithinLimit as resolveIsWithinLimit,
    type FeatureKey,
    type FeatureLimits,
    type GateMode,
    type PlanName,
} from '@/lib/features';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { UpgradeDialog } from '../components/UpgradeDialog';

interface FeatureGateContextValue {
    plan: PlanName;
    isLoading: boolean;
    getGateMode: (feature: FeatureKey) => GateMode;
    canAccess: (feature: FeatureKey) => boolean;
    getFeatureLimit: (feature: keyof FeatureLimits) => number;
    isWithinLimit: (feature: keyof FeatureLimits, index: number) => boolean;
    openUpgradeDialog: (featureLabel?: string) => void;
    updatePlan: (plan: PlanName) => void;
}

const FeatureGateContext = createContext<FeatureGateContextValue | undefined>(undefined);

export function FeatureGateProvider({ children }: { children: ReactNode }) {
    const { data: session, isPending: sessionLoading } = authClient.useSession();

    const [subscriptionData, setSubscriptionData] = useState<{ plan?: string } | null>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [overridePlan, setOverridePlan] = useState<PlanName | null>(null);

    // ── Global UpgradeDialog state ──────────────────────────────────────────
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogFeatureLabel, setDialogFeatureLabel] = useState<string | undefined>(undefined);

    const openUpgradeDialog = useCallback((featureLabel?: string) => {
        setDialogFeatureLabel(featureLabel);
        setDialogOpen(true);
    }, []);

    // Allow external code (e.g. home screen after API sub fetch) to push plan in
    const updatePlan = useCallback((plan: PlanName) => {
        setOverridePlan(plan);
    }, []);

    useEffect(() => {
        if (!session?.user || (session.user as any).isAnonymous) {
            setSubscriptionData(null);
            return;
        }

        let cancelled = false;
        setSubscriptionLoading(true);

        authClient.subscription.list().then((result: unknown) => {
            if (cancelled) return;
            const subs = Array.isArray((result as any)?.data) ? (result as any).data : [];
            const active = subs.find(
                (s: { status: string }) => s.status === 'active' || s.status === 'trialing'
            );
            setSubscriptionData(active ?? null);
        }).catch(() => {
            if (!cancelled) setSubscriptionData(null);
        }).finally(() => {
            if (!cancelled) setSubscriptionLoading(false);
        });

        return () => { cancelled = true; };
    }, [(session?.user as any)?.id]);

    const isLoading = sessionLoading || subscriptionLoading;

    const plan = useMemo<PlanName>(() => {
        // Explicit override from API subscription fetch takes priority
        if (overridePlan) return overridePlan;
        if (!session?.user || isLoading) return 'free';
        const role = (session.user as any).role as string | undefined;
        if (role === 'admin') return 'plus';
        const activePlan = subscriptionData?.plan as string | undefined;
        if (activePlan && activePlan in PLAN_FEATURE_ACCESS) {
            return activePlan as PlanName;
        }
        return 'free';
    }, [session, subscriptionData, isLoading, overridePlan]);

    const value = useMemo<FeatureGateContextValue>(
        () => ({
            plan,
            isLoading,
            getGateMode: (feature) => resolveGateMode(plan, feature),
            canAccess: (feature) => resolveCanAccess(plan, feature),
            getFeatureLimit: (feature) => resolveFeatureLimit(plan, feature),
            isWithinLimit: (feature, index) => resolveIsWithinLimit(plan, feature, index),
            openUpgradeDialog,
            updatePlan,
        }),
        [plan, isLoading, openUpgradeDialog, updatePlan]
    );

    return (
        <FeatureGateContext.Provider value={value}>
            {children}
            <UpgradeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                currentPlan={plan}
                featureLabel={dialogFeatureLabel}
            />
        </FeatureGateContext.Provider>
    );
}

export function useFeatureGate(): FeatureGateContextValue {
    const context = useContext(FeatureGateContext);
    if (!context) {
        throw new Error('useFeatureGate must be used within a <FeatureGateProvider>');
    }
    return context;
}
