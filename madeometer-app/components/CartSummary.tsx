
import React, { useState, useMemo } from 'react';
import { ScanResult, Preference } from '../types';
import { ChevronRight, ArrowLeft, Filter, SlidersHorizontal, ShieldCheck, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { UpgradeDialog } from './UpgradeDialog';

interface CartSummaryProps {
    results: ScanResult[];
    onSelectResult: (result: ScanResult) => void;
    onBack: () => void;
    activePreferences?: Preference[];
}

type FilterType = 'ALL' | 'AVOID' | 'RECOMMENDED' | 'NEUTRAL';

const CartSummary: React.FC<CartSummaryProps> = ({ results, onSelectResult, onBack, activePreferences = [] }) => {
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const { t } = useLanguage();
    const { isWithinLimit, plan, canAccess, openUpgradeDialog } = useFeatureGate();

    const canSeeSafe = canAccess('multi_product_tab_safe');
    const canSeeAvoid = canAccess('multi_product_tab_avoid');

    const imageSource = results.length > 0 ? results[0].imageUrl : null;
    // Identify actual criteria (rules) vs features
    const filteringCriteria = activePreferences.filter(p =>
        p.category === 'CRITERIA' ||
        (p.category === undefined && !['show_usa_meter', 'show_political_meter', 'show_status_banner', 'show_shopping_options', 'show_alternatives'].includes(p.id))
    );

    const hasActiveCriteria = filteringCriteria.length > 0;

    const criteriaHeader = hasActiveCriteria
        ? `Filtering for: ${filteringCriteria.map(p => p.label).join(', ')}`
        : "General Analysis";

    const stats = useMemo(() => {
        return {
            avoid: results.filter(r => r.verdict === 'AVOID').length,
            recommended: results.filter(r => r.verdict === 'RECOMMENDED').length,
            neutral: results.filter(r => r.verdict === 'NEUTRAL').length,
            total: results.length
        };
    }, [results]);

    const filteredResults = useMemo(() => {
        if (activeFilter === 'ALL') return results;
        return results.filter(r => r.verdict === activeFilter);
    }, [results, activeFilter]);

    return (
        <div className="flex flex-col pt-4 min-h-full">
            <div className="bg-white rounded-t-[1.4rem] p-5 shadow-2xl relative flex flex-col flex-1">

                <div className="flex items-center justify-between mb-6 mt-2">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{t('multi_result')}</h2>
                        <div className="flex items-start gap-1.5 mt-1.5">
                            <SlidersHorizontal className="w-3 h-3 text-brand shrink-0 mt-0.5" />
                            <p className="text-xs text-brand font-bold leading-tight line-clamp-2">
                                {criteriaHeader}
                            </p>
                        </div>
                    </div>
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                {imageSource && (
                    <div className="w-full rounded-2xl mb-4 relative overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center bg-neutral-100/50 min-h-[12rem]">
                        <div className="relative w-fit h-fit">
                            <img
                                src={imageSource}
                                alt="Scan Context"
                                className="max-w-full max-h-[22rem] w-auto h-auto object-contain rounded-lg shadow-sm"
                            />

                            <div className="absolute inset-0">
                                {results.map((item, dotIdx) => {
                                    if (!item.box_2d) return null;

                                    const isManual = item.verdictReason?.includes("Personal");
                                    if (!hasActiveCriteria && !isManual) return null;

                                    const dotLocked = !isWithinLimit('multi_product_scan_limit', dotIdx);
                                    const top = ((item.box_2d[0] + item.box_2d[2]) / 2 / 1000) * 100;
                                    const left = ((item.box_2d[1] + item.box_2d[3]) / 2 / 1000) * 100;

                                    // Locked dots render as muted grey — no verdict colour, no tap
                                    let dotColor = dotLocked ? "bg-gray-300 border-gray-200" : "bg-gray-400 border-white";
                                    if (!dotLocked && item.verdict === 'AVOID') dotColor = "bg-red-500 border-white";
                                    if (!dotLocked && item.verdict === 'RECOMMENDED') dotColor = "bg-emerald-500 border-white";

                                    const isHovered = hoveredItemId === item.id;

                                    return (
                                        <div
                                            key={`dot-${item.id}`}
                                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 ${dotLocked ? 'cursor-pointer z-10 opacity-50' : `cursor-pointer ${isHovered ? 'z-50 scale-110' : 'z-20'}`}`}
                                            style={{ top: `${top}%`, left: `${left}%` }}
                                            onMouseEnter={() => !dotLocked && setHoveredItemId(item.id)}
                                            onMouseLeave={() => setHoveredItemId(null)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (dotLocked) { setUpgradeOpen(true); return; }
                                                onSelectResult(item);
                                            }}
                                        >
                                            {!dotLocked && <div className={`absolute w-10 h-10 rounded-full opacity-50 animate-ping ${dotColor.split(' ')[0]}`} />}
                                            <div className={`relative w-5 h-5 rounded-full border-2 shadow-sm ${dotColor}`} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex p-1 bg-gray-100 rounded-xl mb-6 relative shrink-0">
                    <button
                        onClick={() => setActiveFilter('ALL')}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {stats.total} {t('identified')}
                    </button>
                    <button
                        onClick={() => canSeeSafe ? setActiveFilter('RECOMMENDED') : openUpgradeDialog("Safe Filtering")}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${activeFilter === 'RECOMMENDED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-emerald-600'
                            }`}
                    >
                        {!canSeeSafe && <Lock className="w-3 h-3 text-gray-400" />}
                        {stats.recommended} {t('safe')}
                    </button>
                    <button
                        onClick={() => canSeeAvoid ? setActiveFilter('AVOID') : openUpgradeDialog("Avoid Filtering")}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${activeFilter === 'AVOID' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-brand'
                            }`}
                    >
                        {!canSeeAvoid && <Lock className="w-3 h-3 text-gray-400" />}
                        {stats.avoid} {t('avoid')}
                    </button>
                </div>

                {filteredResults.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 min-h-[120px]">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-gray-300">
                            <Filter className="w-5 h-5" />
                        </div>
                        <p className="text-gray-500 font-medium text-xs">{t('no_items')}</p>
                        <button onClick={() => setActiveFilter('ALL')} className="text-brand font-bold text-xs mt-2 hover:underline">
                            {t('view_all')}
                        </button>
                    </div>
                )}

                <div className="space-y-3 pr-1 pb-2">
                    {filteredResults.map((item, idx) => {
                        const locked = !isWithinLimit('multi_product_scan_limit', idx);
                        let containerClass = "bg-white border-gray-100 hover:border-gray-200";
                        let iconBg = "bg-gray-50 text-gray-400";
                        let statusColor = "text-gray-900";
                        const hasSpecificMatches = item.matchedUserCriteria && item.matchedUserCriteria.length > 0;
                        let reasonText = item.ownerCompany;
                        if (hasSpecificMatches) {
                            reasonText = `${t('trigger_warning')} ${item.matchedUserCriteria.join(', ')}`;
                        }
                        if (item.verdict === 'RECOMMENDED') {
                            containerClass = "bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200";
                            iconBg = "bg-emerald-100 text-emerald-600";
                            statusColor = "text-emerald-700";
                        } else if (item.verdict === 'AVOID') {
                            containerClass = "bg-red-50/40 border-red-100 hover:bg-red-50 hover:border-red-200";
                            iconBg = "bg-red-100 text-brand";
                            statusColor = "text-brand";
                        } else {
                            containerClass = "bg-gray-50/40 border-gray-200 hover:bg-gray-50 hover:border-gray-300";
                            iconBg = "bg-gray-100 text-gray-500";
                            statusColor = "text-gray-700";
                        }
                        const confidence = item.confidenceScore || 85;

                        return (
                            <div key={item.id} className="relative">
                                <button
                                    onClick={() => locked ? setUpgradeOpen(true) : onSelectResult(item)}
                                    onMouseEnter={() => setHoveredItemId(item.id)}
                                    onMouseLeave={() => setHoveredItemId(null)}
                                    className={`w-full text-left border rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md ${containerClass} ${hoveredItemId === item.id ? 'ring-2 ring-brand/20' : ''} ${locked ? 'blur-[3px] select-none pointer-events-none' : ''}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-2xl leading-none ${iconBg}`}>
                                        {item.ownerFlag}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-medium text-[13px] truncate mb-0.5 ${statusColor}`}>{item.itemName}</h4>
                                        <p className={`text-xs font-medium truncate mb-1 ${hasSpecificMatches && item.verdict !== 'RECOMMENDED' ? 'text-brand' : 'text-gray-500'}`}>
                                            {reasonText}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white rounded border border-gray-100 text-gray-500">
                                                {item.ownerCountry ? item.ownerCountry.substring(0, 3).toUpperCase() : 'UNK'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 bg-white rounded border flex items-center gap-1 ${confidence >= 80 ? 'border-emerald-100 text-emerald-600' :
                                                confidence >= 50 ? 'border-gray-300 text-gray-600' :
                                                    'border-red-100 text-red-600'
                                                }`}>
                                                <ShieldCheck className="w-3 h-3" />
                                                {confidence}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-400">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>

                                {/* Blur overlay — tappable upgrade nudge for locked items */}
                                {locked && (
                                    <button
                                        onClick={() => setUpgradeOpen(true)}
                                        className="absolute inset-0 rounded-2xl flex items-center justify-center gap-1.5 bg-white/40 backdrop-blur-[1px]"
                                    >
                                        <Lock className="w-3.5 h-3.5 text-gray-500" />

                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
                <UpgradeDialog
                    open={upgradeOpen}
                    onOpenChange={setUpgradeOpen}
                    currentPlan={plan}
                    featureLabel="Multi-Product Scan"
                />
                <div className="h-40 w-full shrink-0"></div>
            </div>
        </div>
    );
};
export default CartSummary;
