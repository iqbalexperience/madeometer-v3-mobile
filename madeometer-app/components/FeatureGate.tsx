"use client";

import React, { type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useFeatureGate } from "../contexts/FeatureGateContext";
import type { FeatureKey, GateMode } from "@/lib/features";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeatureGateProps {
    /** The feature key to check access for */
    feature: FeatureKey;
    /**
     * Override the gate mode resolved from the current plan.
     * Defaults to the plan-resolved mode from features.ts.
     */
    mode?: GateMode;
    children: ReactNode;
    /** Optional label shown in the UpgradeDialog title */
    featureLabel?: string;
}

// ---------------------------------------------------------------------------
// FeatureGate — main wrapper component
// ---------------------------------------------------------------------------

/**
 * Wraps any UI element that should be feature-gated.
 *
 * Renders children differently based on the resolved GateMode:
 *  - allow   → children rendered normally
 *  - hide    → renders null
 *  - blur    → children blurred with a tap-to-upgrade overlay
 *  - lock    → children with a lock-badge overlay; tap opens UpgradeDialog
 *  - message → an inline upgrade-prompt banner replaces the children
 */
export function FeatureGate({
    feature,
    mode: modeProp,
    children,
    featureLabel,
}: FeatureGateProps) {
    const { getGateMode, openUpgradeDialog } = useFeatureGate();

    const mode = modeProp ?? getGateMode(feature);

    const triggerUpgrade = () => openUpgradeDialog(featureLabel);

    // ── allow ────────────────────────────────────────────────────────────────
    if (mode === "allow") {
        return <>{children}</>;
    }

    // ── hide ─────────────────────────────────────────────────────────────────
    if (mode === "hide") {
        return null;
    }

    // ── message ──────────────────────────────────────────────────────────────
    if (mode === "message") {
        return (
            <UpgradeMessage
                featureLabel={featureLabel}
                onUpgradeClick={triggerUpgrade}
            />
        );
    }

    // ── lock ─────────────────────────────────────────────────────────────────
    if (mode === "lock") {
        return (
            <LockOverlay onClick={triggerUpgrade}>
                {children}
            </LockOverlay>
        );
    }

    // ── blur ─────────────────────────────────────────────────────────────────
    if (mode === "blur") {
        return (
            <BlurOverlay onClick={triggerUpgrade}>
                {children}
            </BlurOverlay>
        );
    }

    return <>{children}</>;
}

// ---------------------------------------------------------------------------
// LockOverlay — renders children with a lock badge in the top-right corner
// ---------------------------------------------------------------------------

function LockOverlay({
    children,
    onClick,
}: {
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <div
            className="relative cursor-pointer select-none"
            onClick={onClick}
            role="button"
            aria-label="Locked feature — tap to upgrade"
        >
            {/* Content rendered at reduced opacity so it's visible but clearly disabled */}
            <div className="opacity-50 pointer-events-none">{children}</div>

            {/* Lock badge — top-right corner */}
            {/* <span
                className="
                    absolute top-1 right-1 z-10
                    flex items-center justify-center
                    w-6 h-6 rounded-full
                    bg-background/90 backdrop-blur-sm
                    border border-border shadow-sm
                "
                aria-hidden="true"
            >
                <Lock className="w-3 h-3 text-muted-foreground" />
            </span> */}
        </div>
    );
}

// ---------------------------------------------------------------------------
// BlurOverlay — renders children blurred with an unlock prompt
// ---------------------------------------------------------------------------

function BlurOverlay({
    children,
    onClick,
}: {
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <div
            className="relative cursor-pointer select-none overflow-hidden rounded-inherit"
            onClick={onClick}
            role="button"
            aria-label="Blurred feature — tap to upgrade"
        >
            {/* Blurred content */}
            <div className="blur-sm pointer-events-none">{children}</div>

            {/* Centered unlock call-to-action */}
            <div
                className="
                    absolute inset-0 z-10
                    flex flex-col items-center justify-center gap-1.5
                    bg-background/60 backdrop-blur-[2px]
                "
            >
                <div
                    className="
                        flex items-center justify-center
                        w-9 h-9 rounded-full
                        bg-brand/10 border border-brand/20
                    "
                >
                    <Lock className="w-4 h-4 text-brand" />
                </div>
                <p className="text-[11px] font-medium text-brand leading-tight text-center px-2">
                    Tap to unlock
                </p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// UpgradeMessage — inline banner that replaces gated content
// ---------------------------------------------------------------------------

function UpgradeMessage({
    featureLabel,
    onUpgradeClick,
}: {
    featureLabel?: string;
    onUpgradeClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onUpgradeClick}
            className="
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                bg-primary/5 border border-primary/20
                text-left transition-colors active:bg-primary/10
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            "
            aria-label={`Upgrade to access ${featureLabel ?? "this feature"}`}
        >
            <span
                className="
                    shrink-0 flex items-center justify-center
                    w-8 h-8 rounded-full
                    bg-primary/10 border border-primary/20
                "
            >
                <Lock className="w-3.5 h-3.5 text-primary" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {featureLabel ? `Unlock ${featureLabel}` : "Upgrade to unlock"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    Available on Plus · Tap to see plans
                </p>
            </div>
            <svg
                className="w-4 h-4 text-muted-foreground shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

// ---------------------------------------------------------------------------
// HistoryLockIcon — convenience component for the history screen
// ---------------------------------------------------------------------------

/**
 * A standalone lock icon to overlay on history scan cards beyond the plan limit.
 * Use alongside `useFeatureGate().isWithinLimit('history_scan_limit', index)`.
 *
 * @example
 * {!isWithinLimit('history_scan_limit', index) && (
 *   <HistoryLockIcon onTap={() => openUpgradeDialog("Unlimited History")} />
 * )}
 */
export function HistoryLockIcon({ onTap }: { onTap?: () => void }) {
    return (
        <div
            onClick={onTap}
            className="
                flex items-center justify-center
                w-8 h-8 rounded-full
                bg-background/90 backdrop-blur-sm
                border border-border shadow-md
                transition-transform active:scale-90
            "
            aria-label="Scan locked — upgrade to view"
        >
            <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
    );
}
