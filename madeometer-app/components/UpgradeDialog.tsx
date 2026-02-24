"use client";

import React, { useState } from "react";
import { Zap, Layers, ImageUp, SlidersHorizontal, Settings2, X, Rocket } from "lucide-react";
import { PLANS, type PlanName } from "@/lib/features";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "sonner";
import AuthModal from "./AuthModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpgradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlan: PlanName;
    featureLabel?: string;
}

// ---------------------------------------------------------------------------
// Benefit rows
// ---------------------------------------------------------------------------

const PLUS_BENEFITS = [
    { icon: Zap, titleKey: "upgrade_benefit_ai_title", subKey: "upgrade_benefit_ai_sub" },
    { icon: ImageUp, titleKey: "upgrade_benefit_multi_title", subKey: "upgrade_benefit_multi_sub" },
    { icon: Layers, titleKey: "upgrade_benefit_history_title", subKey: "upgrade_benefit_history_sub" },
    { icon: SlidersHorizontal, titleKey: "upgrade_benefit_rules_title", subKey: "upgrade_benefit_rules_sub" },
    { icon: Settings2, titleKey: "upgrade_benefit_settings_title", subKey: "upgrade_benefit_settings_sub" },
] as const;

// ---------------------------------------------------------------------------
// UpgradeDialog
// ---------------------------------------------------------------------------

export function UpgradeDialog({
    open,
    onOpenChange,
    currentPlan,
    featureLabel,
}: UpgradeDialogProps) {
    const { t } = useLanguage();
    const { data: session } = authClient.useSession();
    const [isAnnual, setIsAnnual] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAuth, setShowAuth] = useState(false);

    if (!open) return null;

    const isAnonymous = !session?.user || session.user.isAnonymous;
    const isAlreadyPlus = currentPlan === "plus";
    const close = () => { onOpenChange(false); setShowAuth(false); };

    // ── Auth callbacks for AuthModal ─────────────────────────────────────────
    const handleLogin = async (email: string, password: string) => {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message ?? "Sign in failed");
        setShowAuth(false);
    };

    const handleRegister = async (name: string, email: string, password: string) => {
        const { error } = await authClient.signUp.email({ name, email, password });
        if (error) throw new Error(error.message ?? "Sign up failed");
        setShowAuth(false);
    };

    // ── Stripe upgrade ───────────────────────────────────────────────────────
    const handleUpgrade = async () => {
        // If not logged in, prompt auth first
        if (isAnonymous) {
            setShowAuth(true);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await authClient.subscription.upgrade({
                plan: "plus",
                annual: isAnnual,
                successUrl: window.location.href,
                cancelUrl: window.location.href,
            });

            if (error) {
                toast.error(error.message || "Failed to create checkout session");
            } else if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── AuthModal shown inline when anonymous taps upgrade ───────────────────
    if (showAuth) {
        return (
            <AuthModal
                isOpen
                onClose={() => setShowAuth(false)}
                onLogin={handleLogin}
                onRegister={handleRegister}
            />
        );
    }

    return (
        /* Rendered at the FeatureGateProvider root — fixed positioning is safe here */
        <div
            className="fixed inset-0 z-[999] flex items-end justify-center"
            aria-modal="true"
            role="dialog"
            aria-label={t('upgrade_title')}
        >
            {/* Dim backdrop */}
            <div
                className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
                onClick={close}
            />

            {/* Sheet */}
            <div
                className="
                    relative z-10 w-full max-w-[450px]
                    bg-white rounded-t-[1.4rem]
                    shadow-2xl overflow-hidden
                    animate-in slide-in-from-bottom-4 duration-300
                    flex flex-col max-h-[90dvh]
                "
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Close button */}
                <button
                    onClick={close}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors active:scale-90"
                    aria-label={t('cancel')}
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-5 pb-6">

                    {/* ── Anonymous gate — show sign-in prompt ── */}
                    {isAnonymous ? (
                        <div className="text-center pt-4 pb-6">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                                <Rocket className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {featureLabel
                                    ? t('upgrade_unlock_feature').replace('{feature}', featureLabel)
                                    : t('upgrade_title')}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1 mb-6 leading-relaxed max-w-xs mx-auto">
                                {t('upgrade_anon_desc')}
                            </p>
                            <button
                                onClick={() => setShowAuth(true)}
                                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-slate-800 active:scale-[0.98] transition-all shadow"
                            >
                                {t('upgrade_signin_btn')}
                            </button>
                            <button
                                onClick={close}
                                className="w-full mt-2 bg-white border border-gray-200 text-gray-600 font-medium py-3.5 rounded-xl text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
                            >
                                {t('maybe_later')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="text-center pt-2 pb-4">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                                    <Rocket className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {isAlreadyPlus
                                        ? t('upgrade_current_plus_title')
                                        : featureLabel
                                            ? t('upgrade_unlock_feature').replace('{feature}', featureLabel)
                                            : t('upgrade_title')}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
                                    {isAlreadyPlus
                                        ? t('upgrade_current_plus_desc')
                                        : t('upgrade_plus_desc')}
                                </p>
                            </div>

                            {/* Benefits list */}
                            {!isAlreadyPlus && (
                                <div className="space-y-1 mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-3">
                                        {t('upgrade_unlock_header')}
                                    </p>
                                    {PLUS_BENEFITS.map(({ icon: Icon, titleKey, subKey }) => (
                                        <div
                                            key={titleKey}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 leading-tight">{t(titleKey)}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t(subKey)}</p>
                                            </div>
                                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Billing cycle toggle */}
                            {!isAlreadyPlus && (
                                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 mb-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('billing_cycle')}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-sm font-bold transition-colors ${!isAnnual ? "text-gray-900" : "text-gray-400"}`}>
                                                $4.99/mo
                                            </span>
                                            <span className="text-gray-300">·</span>
                                            <span className={`text-sm font-bold transition-colors ${isAnnual ? "text-gray-900" : "text-gray-400"}`}>
                                                $47.90/yr <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-lg">{t('save_20')}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsAnnual(a => !a)}
                                        className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${isAnnual ? "bg-slate-800" : "bg-gray-200"}`}
                                        aria-label={isAnnual ? "Switch to monthly" : "Switch to annual"}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ${isAnnual ? "translate-x-7" : "translate-x-0"}`} />
                                    </button>
                                </div>
                            )}

                            {/* Current plan pill */}
                            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 mb-5">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('current_plan')}</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{PLANS[currentPlan].title}</p>
                                </div>
                                {!isAlreadyPlus && (
                                    <div className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                                        <span>→</span>
                                        <span>{PLANS.plus.title}</span>
                                    </div>
                                )}
                            </div>

                            {/* CTA */}
                            {isAlreadyPlus ? (
                                <button
                                    onClick={close}
                                    className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-slate-700 active:scale-[0.98] transition-all shadow"
                                >
                                    {t('got_it')}
                                </button>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={isLoading}
                                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-slate-800 active:scale-[0.98] transition-all shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                                {t('redirecting_stripe')}
                                            </>
                                        ) : (
                                            t('upgrade_btn_total').replace('{price}', isAnnual ? "$47.90/yr" : "$4.99/mo")
                                        )}
                                    </button>
                                    <button
                                        onClick={close}
                                        disabled={isLoading}
                                        className="w-full bg-white border border-gray-200 text-gray-600 font-medium py-3.5 rounded-xl text-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
                                    >
                                        {t('maybe_later')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
