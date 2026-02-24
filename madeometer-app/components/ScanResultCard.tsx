
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ScanResult, WebSource } from '../types';
import {
    ArrowLeft, Link as LinkIcon, Building2, AlertCircle, Search, Edit2,
    Trash2, MessageSquareWarning, ChevronDown, CheckCircle, HelpCircle,
    AlertTriangle, BookOpen, ShieldCheck, Sparkles, RefreshCcw, Rocket, Zap,
    PackageSearch, Tag, MapPin, Loader2, XCircle, FileText, Globe, ExternalLink,
    Scale, Bolt, Heart, Ban, Check, Undo2, ShoppingBag,
    Store, TrendingDown, ChevronUp
} from 'lucide-react';
import ScanChat from './ScanChat';
import { useLanguage } from '../contexts/LanguageContext';
import { LANGUAGE_DEFAULTS } from '../services/constants';
import { addToWhitelist, removeFromWhitelist, isWhitelisted, addToBlacklist, removeFromBlacklist, isBlacklisted, updateScan, checkListStatus } from '../services/database';
import { generateTranslations } from '../services/geminiService';
import { FeatureGate } from './FeatureGate';

interface ScanResultCardProps {
    result: ScanResult;
    onBack: () => void;
    showUsaMeter?: boolean;
    showPoliticalMeter?: boolean;
    showStatusBanner?: boolean;
    showShopping?: boolean; // New prop
    showAlternatives?: boolean; // New prop
    activeCriteriaCount?: number; // New prop to control banner visibility
    onEdit: (result: ScanResult) => void;
    onDelete: (id: string) => void;
    onFeedback: (id: string) => void;
    onUpdate: (updated: ScanResult) => void;
    onReanalyze: (id: string, model: string) => void;
    onFindAlternatives: (id: string, refresh?: boolean) => void;
    onFindShoppingOptions: (id: string, refresh?: boolean) => void;
    isFindingAlternatives?: boolean;
    isFindingShoppingOptions?: boolean;
    isAdmin?: boolean;
    userLocation?: { lat: number, lng: number };
    onRequestLocation?: () => void;
    isGuest?: boolean;
    onAuthRequest?: () => void;
}

// Renders a crisp SVG flag from a 2-letter ISO 3166-1 alpha-2 country code
// Uses flagcdn.com — no npm package required, works across all platforms.
const CountryFlag = ({ code, className = '' }: { code?: string; className?: string }) => {
    if (!code || code.length !== 2) return <span>🏳️</span>;
    const lower = code.toLowerCase();
    return (
        <img
            src={`https://flagcdn.com/${lower}.svg`}
            alt={code.toUpperCase()}
            className={className}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
    );
};

// Helper to deduplicate sources and prioritize strict categories
const processSources = (result: ScanResult) => {
    const rawSources: WebSource[] = result.webSources || [];
    const groundingLinks = result.groundingLinks || [];

    const combined = new Map<string, WebSource>();

    // 1. Add Explicit AI-categorized sources first
    rawSources.forEach(src => {
        try {
            const hostname = new URL(src.uri).hostname.replace(/^www\./, '');
            combined.set(src.uri, { ...src, title: hostname }); // normalize title to hostname for consistency
        } catch (e) { }
    });

    // 2. Add Grounding links if not present
    groundingLinks.forEach(link => {
        if (!combined.has(link.uri)) {
            try {
                const hostname = new URL(link.uri).hostname.replace(/^www\./, '');
                // Filter out Google Search internal links
                if (!hostname.includes('google.com') && !hostname.includes('googleusercontent')) {
                    combined.set(link.uri, {
                        title: hostname,
                        uri: link.uri,
                        category: 'GENERAL' // Default to General
                    });
                }
            } catch (e) { }
        }
    });

    return Array.from(combined.values());
};

const ScanResultCard: React.FC<ScanResultCardProps> = ({ result, onBack, showUsaMeter = true, showPoliticalMeter = true, showStatusBanner = true, showShopping = true, showAlternatives = true, activeCriteriaCount = 0, onEdit, onDelete, onFeedback, onUpdate, onReanalyze, onFindAlternatives, onFindShoppingOptions, isFindingAlternatives, isFindingShoppingOptions, isAdmin = false, userLocation, onRequestLocation, isGuest, onAuthRequest }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'alternatives' | 'buying'>('overview');
    const [showValidation, setShowValidation] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isReanalyzeOpen, setIsReanalyzeOpen] = useState(false);
    const [isBannerExpanded, setIsBannerExpanded] = useState(false); // Banner expansion state
    const { t, language } = useLanguage();
    const [isTranslating, setIsTranslating] = useState(false);

    // Whitelist/Blacklist State
    const [isWhitelistedItem, setIsWhitelistedItem] = useState(false);
    const [isBlacklistedItem, setIsBlacklistedItem] = useState(false);

    // --- TRANSLATION LOGIC ---
    const displayData = useMemo(() => {
        const lang = language as string;
        // If we have a translation for the current language, use it
        if (result.translations && typeof result.translations === 'object') {
            const translations = result.translations as Record<string, any>;
            if (translations[lang]) {
                return {
                    ...result,
                    ...translations[lang]
                };
            }
        }
        return result;
    }, [result, language]);

    useEffect(() => {
        const lang = language as string;
        const shouldTranslate = lang !== 'en' &&
            result.id &&
            (!result.translations || !result.translations[lang]);

        if (shouldTranslate && !isTranslating) {
            const runTranslation = async () => {
                setIsTranslating(true);
                try {
                    const singleTranslation = await generateTranslations("", result.id, lang);
                    if (singleTranslation && onUpdate) {
                        // Merge the new single-language translation into existing translations
                        const updatedTranslations = {
                            ...(result.translations || {}),
                            ...singleTranslation
                        };
                        onUpdate({ ...result, translations: updatedTranslations });
                    }
                } catch (e) {
                    console.error(`Auto-translation for ${lang} failed`, e);
                } finally {
                    setIsTranslating(false);
                }
            };
            runTranslation();
        }
    }, [language, result.id, result.translations]);

    // Image State
    // Immediate load for Data URLs (User Photos) to prevent spinner/flash
    const isDataUrl = result.imageUrl?.startsWith('data:');
    const [currentImageSrc, setCurrentImageSrc] = useState<string>(result.imageUrl);
    const [isImageLoaded, setIsImageLoaded] = useState(!!isDataUrl);

    const reanalyzeRef = useRef<HTMLDivElement>(null);

    const usaScore = result.usaOwnershipScore ?? (result.ownerCountry?.includes('USA') || result.ownerCountry?.includes('United States') ? 100 : 0);

    // Political Score Logic
    const repScore = result.republicanScore;
    const showRepMeter = (repScore !== undefined && repScore !== null) && showPoliticalMeter;
    const isUS = result.ownerCountryCode === 'US' || result.ownerCountry === 'USA' || result.ownerCountry === 'United States';

    // Context defaults
    const defaultSettings = LANGUAGE_DEFAULTS[language] || LANGUAGE_DEFAULTS['en'];

    let politicalLabel = '';
    let politicalValue = 0;
    let politicalColor = '';
    let isBipartisan = false;
    let isNonUS = false;

    if (showRepMeter) {
        if (!isUS) {
            isNonUS = true;
            politicalLabel = t('political_non_us');
            politicalValue = 100;
            politicalColor = 'bg-gray-300';
        } else {
            if (repScore! >= 35 && repScore! <= 65) {
                isBipartisan = true;
                politicalLabel = t('political_bipartisan');
                politicalValue = 100;
                politicalColor = 'bg-gradient-to-r from-blue-400 via-purple-500 to-red-400';
            } else if (repScore! > 65) {
                politicalLabel = t('leaning_republican');
                politicalValue = repScore!;
                politicalColor = 'bg-[#d35457]';
            } else {
                politicalLabel = t('leaning_democrat');
                politicalValue = 100 - repScore!;
                politicalColor = 'bg-blue-500';
            }
        }
    } else {
        politicalLabel = t('political_neutral');
        politicalValue = 0;
        politicalColor = 'bg-gray-300';
    }

    // Made In Logic
    const isMultipleCountries = result.manufacturedInCode === 'ZG' ||
        result.manufacturedIn?.toLowerCase().includes('multiple') ||
        result.manufacturedIn?.toLowerCase().includes('flere');

    const madeInText = isMultipleCountries ? t('multiple_countries') : displayData.manufacturedIn;

    const allSources = processSources(result);
    const hasSources = allSources.length > 0;
    const hasAlternatives = (result.europeanAlternatives && result.europeanAlternatives.length > 0) || (result.alternatives && result.alternatives.length > 0);
    const hasShoppingOptions = result.shoppingOptions && result.shoppingOptions.length > 0;

    const politicalSources = allSources.filter(s =>
        s.category === 'POLITICAL' ||
        s.uri.includes('opensecrets.org') ||
        s.uri.includes('fec.gov') ||
        s.uri.includes('followthemoney')
    );

    const aboutSources = allSources.slice(0, 6);

    // Sorting Shopping Options by Price
    const sortedShoppingOptions = useMemo(() => {
        if (!result.shoppingOptions) return [];
        return [...result.shoppingOptions].sort((a, b) => {
            const cleanPrice = (str: string) => {
                let val = str.replace(/[^0-9.,]/g, '');
                if (val.includes(',') && val.includes('.')) {
                    if (val.lastIndexOf('.') > val.lastIndexOf(',')) {
                        val = val.replace(/,/g, '');
                    } else {
                        val = val.replace(/\./g, '').replace(',', '.');
                    }
                } else if (val.includes(',')) {
                    val = val.replace(',', '.');
                }
                return parseFloat(val) || Infinity;
            };
            return cleanPrice(a.price) - cleanPrice(b.price);
        });
    }, [result.shoppingOptions]);

    // --- Logic ---

    useEffect(() => {
        setCurrentImageSrc(result.imageUrl);
        if (result.imageUrl?.startsWith('data:')) {
            setIsImageLoaded(true);
        } else {
            setIsImageLoaded(false);
        }

        checkLists();
    }, [result.id, result.imageUrl]);

    // Safety check: if active tab becomes disabled, switch to overview
    useEffect(() => {
        if (activeTab === 'buying' && !showShopping) setActiveTab('overview');
        if (activeTab === 'alternatives' && !showAlternatives) setActiveTab('overview');
    }, [showShopping, showAlternatives]);

    const checkLists = async () => {
        const { whitelisted, blacklisted } = await checkListStatus([result.ownerCompany, result.itemName]);
        setIsWhitelistedItem(whitelisted);
        setIsBlacklistedItem(blacklisted);
    };

    const handleAction = async (action: 'ALLOW' | 'BLOCK') => {
        if (isGuest && onAuthRequest) {
            onAuthRequest();
            return;
        }

        if (action === 'ALLOW') {
            // Add to Whitelist
            await addToWhitelist(result.ownerCompany, 'BRAND');
            // If it was blacklisted, it is removed automatically by database logic, but update state
            setIsWhitelistedItem(true);
            setIsBlacklistedItem(false);

            const updated = {
                ...result,
                verdict: 'RECOMMENDED' as const,
                verdictReason: (result.verdictReason || "").replace(/Blocked by Personal Blacklist\.?/, "") + " (Personal Whitelist)"
            };
            onUpdate(updated);
            updateScan(updated);
        } else {
            // Block (Add to Blacklist)
            await addToBlacklist(result.ownerCompany, 'BRAND');
            setIsBlacklistedItem(true);
            setIsWhitelistedItem(false);

            const updated = {
                ...result,
                verdict: 'AVOID' as const,
                verdictReason: "Blocked by Personal Blacklist"
            };
            onUpdate(updated);
            updateScan(updated);
        }
    };

    const handleRevert = async () => {
        // Remove from both lists
        await removeFromWhitelist(result.ownerCompany);
        await removeFromBlacklist(result.ownerCompany);

        setIsWhitelistedItem(false);
        setIsBlacklistedItem(false);

        // Revert to original verdict estimation
        const hasCriteria = result.matchedUserCriteria && result.matchedUserCriteria.length > 0;
        const originalVerdict = hasCriteria ? 'AVOID' : 'NEUTRAL'; // Simplified fallback

        // Clean reason string
        let originalReason = result.verdictReason || "";
        originalReason = originalReason.replace(" (Personal Whitelist)", "").replace("Blocked by Personal Blacklist", "").trim();

        const updated = {
            ...result,
            verdict: originalVerdict as 'AVOID' | 'NEUTRAL' | 'RECOMMENDED',
            verdictReason: originalReason
        };

        onUpdate(updated);
        updateScan(updated);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (reanalyzeRef.current && !reanalyzeRef.current.contains(event.target as Node)) {
                setIsReanalyzeOpen(false);
            }
        };
        if (isReanalyzeOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isReanalyzeOpen]);

    const handleImageError = () => {
        if (!currentImageSrc.includes('placehold.co')) {
            setCurrentImageSrc(`https://placehold.co/400x400?text=${encodeURIComponent(result.itemName)}`);
        }
        setIsImageLoaded(true);
    };

    const confidence = Math.max(1, Math.min(result.confidenceScore || 85, 99));

    const cleanCriteria = (criteria: string[]) => {
        if (!criteria) return "";
        return criteria.map(c => c.replace(/\s*\((Failed|Fejlet)\)/i, '').trim()).filter(Boolean).join(', ');
    };

    const getVerdictDescription = (type: string) => {
        if (isBlacklistedItem) return "Blocked by your Personal Blacklist rule.";
        if (isWhitelistedItem) return t('verdict_whitelisted');

        if (type === 'AVOID') {
            if (displayData.matchedUserCriteria && displayData.matchedUserCriteria.length > 0) {
                const criteriaList = cleanCriteria(displayData.matchedUserCriteria);
                return `${t('verdict_avoid_desc')}: "${criteriaList}"`;
            }
            if (displayData.verdictReason) return displayData.verdictReason;
            return t('verdict_avoid_desc');
        }
        if (type === 'RECOMMENDED') return t('verdict_safe_desc');
        if (type === 'NEUTRAL') return displayData.verdictReason || t('verdict_neutral_desc');
        return "";
    };

    // Determine effective state for UI
    let effectiveVerdict = result.verdict;
    if (isWhitelistedItem) effectiveVerdict = 'RECOMMENDED';
    else if (isBlacklistedItem) effectiveVerdict = 'AVOID';

    // Handle edge case where un-whitelisting happens instantly before prop update
    if (!isWhitelistedItem && !isBlacklistedItem && (effectiveVerdict === 'RECOMMENDED' || result.verdict === 'RECOMMENDED')) {
        const hasCriteria = result.matchedUserCriteria && result.matchedUserCriteria.length > 0;
        effectiveVerdict = hasCriteria ? 'AVOID' : 'RECOMMENDED';
    }

    const verdictConfig = {
        RECOMMENDED: {
            style: 'bg-emerald-50 border-emerald-100 text-emerald-900',
            iconStyle: 'bg-emerald-100 text-emerald-600',
            Icon: isWhitelistedItem ? Heart : CheckCircle,
            title: isWhitelistedItem ? "Whitelisted" : t('verdict_safe'),
            desc: getVerdictDescription('RECOMMENDED'),
        },
        AVOID: {
            style: 'bg-red-50 border-red-100 text-red-900',
            iconStyle: 'bg-red-100 text-red-600',
            Icon: isBlacklistedItem ? Ban : XCircle,
            title: isBlacklistedItem ? "Blacklisted" : t('verdict_avoid'),
            desc: getVerdictDescription('AVOID'),
        },
        NEUTRAL: {
            style: 'bg-gray-50 border-gray-200 text-gray-700',
            iconStyle: 'bg-gray-200 text-gray-500',
            Icon: HelpCircle,
            title: t('verdict_neutral'),
            desc: getVerdictDescription('NEUTRAL'),
        }
    };

    const vConfig = verdictConfig[effectiveVerdict] || verdictConfig['NEUTRAL'];

    const showTabs = showShopping || showAlternatives;

    // Banner & Dot Visibility Logic:
    // Only show if:
    // User has active criteria OR item is manually listed OR it's Blacklisted
    const isManualOverride = isWhitelistedItem || isBlacklistedItem;
    const hasActiveCriteria = activeCriteriaCount > 0;

    const shouldShowBanner = showStatusBanner && (hasActiveCriteria || isManualOverride);
    const shouldShowDot = hasActiveCriteria || isManualOverride;

    return (
        <div className="relative w-full min-h-full">
            {isChatOpen && (
                <ScanChat result={result} onClose={() => setIsChatOpen(false)} onUpdate={onUpdate} />
            )}

            <div className="relative z-10 bg-transparent min-h-full">
                <div className="min-h-full flex flex-col pt-4">
                    <div className="bg-white flex-1 rounded-t-[1.4rem] p-5 shadow-2xl relative flex flex-col">

                        <div className="flex items-start justify-between mb-6 mt-2 gap-3">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none truncate mb-1.5">{displayData.itemName}</h1>
                                <div className="flex items-center gap-1.5">
                                    <CountryFlag code={result.ownerCountryCode} className="w-5 h-4 object-cover rounded-[2px] shadow-sm" />
                                    <p className="text-xs text-gray-500 font-bold leading-tight truncate">
                                        {result.ownerCompany}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {isAdmin && (
                                    <button
                                        onClick={() => setIsChatOpen(true)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-sm animate-in fade-in zoom-in"
                                        title="Ask AI (Admin Only)"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                    </button>
                                )}

                                <button
                                    onClick={() => onFeedback(result.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                                    title="Report Issue"
                                >
                                    <MessageSquareWarning className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={onBack}
                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* EXPANDABLE VERDICT BANNER */}
                        {shouldShowBanner && (
                            <div className="mb-4 animate-in slide-in-from-top-2 duration-500">
                                <div className={`flex flex-col gap-0 rounded-xl border shadow-sm backdrop-blur-md transition-all duration-300 overflow-hidden ${vConfig.style}`}>

                                    {/* Header Row */}
                                    <div className="flex items-start gap-3 p-3 w-full relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 mt-0.5 ${vConfig.iconStyle}`}>
                                            <vConfig.Icon className={`w-5 h-5 ${isWhitelistedItem || isBlacklistedItem ? 'fill-current' : ''}`} />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-8">
                                            <h3 className="text-sm font-bold leading-tight">{vConfig.title}</h3>
                                            {/* Show truncated description only if NOT expanded */}
                                            {!isBannerExpanded && (
                                                <p className="text-xs font-medium opacity-90 leading-snug mt-0.5 truncate">
                                                    {vConfig.desc}
                                                </p>
                                            )}
                                        </div>
                                        {/* Expand Toggle */}
                                        <button
                                            onClick={() => setIsBannerExpanded(!isBannerExpanded)}
                                            className="absolute right-2 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                                        >
                                            {isBannerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Expanded Content */}
                                    {isBannerExpanded && (
                                        <div className="px-3 pb-3 w-full animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="pl-[3.25rem]">
                                                <p className="text-xs font-medium opacity-90 leading-relaxed mb-4 wrap-break-word">
                                                    {vConfig.desc}
                                                    {(isWhitelistedItem || isBlacklistedItem) && (
                                                        <span className="block mt-1 opacity-70 italic">
                                                            You have manually overridden the AI verdict for this brand.
                                                        </span>
                                                    )}
                                                </p>

                                                <div className="flex flex-wrap gap-2">
                                                    {/* Action Buttons Logic */}
                                                    {effectiveVerdict === 'AVOID' && !isWhitelistedItem && (
                                                        <FeatureGate feature="whitelist" featureLabel="Whitelist">
                                                            <button
                                                                onClick={() => handleAction('ALLOW')}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-emerald-700 font-bold text-xs shadow-sm border border-emerald-100 hover:bg-emerald-50 transition-colors"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                Add to OK (Whitelist)
                                                            </button>
                                                        </FeatureGate>
                                                    )}

                                                    {effectiveVerdict === 'RECOMMENDED' && !isBlacklistedItem && (
                                                        <FeatureGate feature="blocklist" featureLabel="Blocklist">
                                                            <button
                                                                onClick={() => handleAction('BLOCK')}
                                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-red-700 font-bold text-xs shadow-sm border border-red-100 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                                Block (Blocklist)
                                                            </button>
                                                        </FeatureGate>
                                                    )}

                                                    {/* Revert Button if manually set */}
                                                    {(isWhitelistedItem || isBlacklistedItem) && (
                                                        <button
                                                            onClick={handleRevert}
                                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-gray-600 font-bold text-xs shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Undo2 className="w-3.5 h-3.5" />
                                                            Revert to AI Verdict
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Image Container - Full Width Banner Style */}
                        <div className="w-full rounded-2xl mb-4 relative overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center bg-neutral-100/50 min-h-[12rem]">

                            {/* Placeholder Spinner */}
                            {!isImageLoaded && !isDataUrl && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
                                    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                                </div>
                            )}

                            {/* Image Logic: Data URL (Camera) vs Remote (Search) */}
                            {isDataUrl ? (
                                // User Photo: Object Cover (Fill)
                                <div className="relative w-fit h-fit">
                                    <img
                                        src={currentImageSrc}
                                        alt={result.itemName}
                                        onError={handleImageError}
                                        onLoad={() => setIsImageLoaded(true)}
                                        className="max-w-full max-h-[22rem] w-auto h-auto object-contain rounded-lg shadow-sm"
                                    />
                                </div>
                            ) : (
                                // Remote Image (Search Result): Object Contain + Blur Background
                                <>
                                    <div
                                        className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-50 blur-xl scale-110"
                                        style={{ backgroundImage: `url(${currentImageSrc})` }}
                                    />
                                    <div className="relative w-fit h-fit">
                                        <img
                                            src={currentImageSrc}
                                            alt={result.itemName}
                                            onError={handleImageError}
                                            onLoad={() => setIsImageLoaded(true)}
                                            className="max-w-full max-h-[22rem] w-auto h-auto object-contain rounded-lg shadow-sm"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Bounding Box Dot Overlay */}
                            {result.box_2d && shouldShowDot && (
                                <div className="absolute inset-0 z-20 pointer-events-none">
                                    {(() => {
                                        const [ymin, xmin, ymax, xmax] = result.box_2d;
                                        const top = ((ymin + ymax) / 2 / 1000) * 100;
                                        const left = ((xmin + xmax) / 2 / 1000) * 100;

                                        let dotColor = "bg-gray-400 border-white";
                                        if (effectiveVerdict === 'AVOID') dotColor = "bg-red-500 border-white";
                                        if (effectiveVerdict === 'RECOMMENDED') dotColor = "bg-emerald-500 border-white";

                                        return (
                                            <div
                                                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                                                style={{ top: `${top}%`, left: `${left}%` }}
                                            >
                                                <div className={`absolute w-10 h-10 rounded-full opacity-50 animate-ping ${dotColor.split(' ')[0]}`} />
                                                <div className={`relative w-5 h-5 rounded-full border-2 shadow-sm ${dotColor}`} />
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {showTabs && (
                            <div className="flex p-1 bg-gray-100 rounded-xl mb-[0.7rem] relative shrink-0">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {t('overview')}
                                </button>
                                {showShopping && (
                                    <div className={`flex-1 py-2 text-xs text-center font-bold rounded-lg transition-all duration-300 ${activeTab === 'buying' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                        <FeatureGate feature="scan_result_tab_shopping" featureLabel="Shopping" >
                                            <button
                                                onClick={() => {
                                                    setActiveTab('buying');
                                                    if (!hasShoppingOptions && !isFindingShoppingOptions) {
                                                        onFindShoppingOptions(result.id);
                                                    }
                                                }}
                                                className='w-full'
                                            >
                                                {t('where_to_buy')}
                                            </button>
                                        </FeatureGate>
                                    </div>
                                )}
                                {showAlternatives && (
                                    <div className={`flex-1 py-2 text-xs text-center font-bold rounded-lg transition-all duration-300 ${activeTab === 'alternatives' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`} >
                                        <FeatureGate feature="scan_result_tab_alternatives" featureLabel="Alternatives">
                                            <button
                                                onClick={() => {
                                                    setActiveTab('alternatives');
                                                    if (!hasAlternatives && !isFindingAlternatives) {
                                                        onFindAlternatives(result.id);
                                                    }
                                                }}
                                                className='w-full'
                                            >
                                                {t('alternatives')}
                                            </button>
                                        </FeatureGate>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1">
                            {activeTab === 'overview' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2 p-4 rounded-2xl bg-gray-50 border border-gray-100 relative">
                                            <div className="absolute top-3 right-3 flex gap-2 z-10" ref={reanalyzeRef}>
                                                <FeatureGate feature="scan_result_reload" featureLabel="Reanalyze">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setIsReanalyzeOpen(!isReanalyzeOpen)}
                                                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors active:scale-95"
                                                            title="Reanalyze"
                                                        >
                                                            <RefreshCcw className="w-4 h-4" />
                                                        </button>

                                                        {isReanalyzeOpen && (
                                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 z-50 origin-top-right">
                                                                <div className="p-2 bg-gray-50 border-b border-gray-100">
                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t('reanalyze_with')}</p>
                                                                </div>
                                                                <div className="p-1">
                                                                    <button
                                                                        onClick={() => { onReanalyze(result.id, 'madeometer-instant'); setIsReanalyzeOpen(false); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 rounded-lg"
                                                                    >
                                                                        <Bolt className="w-3.5 h-3.5 text-cyan-400" />
                                                                        {t('mode_instant')}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { onReanalyze(result.id, 'madeometer-superfast'); setIsReanalyzeOpen(false); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 rounded-lg"
                                                                    >
                                                                        <Rocket className="w-3.5 h-3.5 text-red-400" />
                                                                        {t('mode_superfast')}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { onReanalyze(result.id, 'gemini-3-flash-preview'); setIsReanalyzeOpen(false); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 rounded-lg"
                                                                    >
                                                                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                                                                        {t('mode_flash')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FeatureGate>

                                                <FeatureGate feature="scan_result_edit" featureLabel="Edit Scan">
                                                    <button
                                                        onClick={() => onEdit(result)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-brand hover:border-brand shadow-sm transition-colors active:scale-95"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </FeatureGate>
                                                <FeatureGate feature="scan_result_delete" featureLabel="Delete Scan">
                                                    <button
                                                        onClick={() => onDelete(result.id)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors active:scale-95"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </FeatureGate>
                                            </div>

                                            <span className="text-[#5d636f] text-[10px] font-bold uppercase tracking-wider block mb-2">{t('owner_company')}</span>
                                            <FeatureGate feature="owner_country" featureLabel="Owner Country">
                                                <div className="flex items-center gap-3">
                                                    <CountryFlag code={result.ownerCountryCode} className="w-10 h-8 object-cover rounded shadow-sm" />
                                                    <span className="text-xl font-bold text-gray-900">{displayData.ownerCountry}</span>
                                                </div>
                                            </FeatureGate>

                                            <FeatureGate feature="owner_company" featureLabel="Owner Company">
                                                {allSources.find(s => s.category === 'OWNERSHIP') ? (
                                                    <a
                                                        href={allSources.find(s => s.category === 'OWNERSHIP')?.uri}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline mt-2 flex items-center gap-1.5 w-fit"
                                                    >
                                                        {result.ownerCompany}
                                                        <LinkIcon className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <div className="text-xs font-medium text-gray-500 mt-2">
                                                        {result.ownerCompany}
                                                    </div>
                                                )}
                                            </FeatureGate>
                                        </div>

                                        <FeatureGate feature="political_donation_status" featureLabel="Political Donation Status">
                                            {showRepMeter && (
                                                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-center relative">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[#5d636f] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                            {isBipartisan && <Scale className="w-3 h-3 text-purple-500" />}
                                                            {isNonUS && <Globe className="w-3 h-3 text-gray-400" />}
                                                            {politicalLabel}
                                                        </span>
                                                        {politicalSources.length > 0 && (
                                                            <a
                                                                href={politicalSources[0].uri}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[9px] font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                                            >
                                                                Sources <ExternalLink className="w-2 h-2" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    {(politicalValue > 0 || isBipartisan || isNonUS) ? (
                                                        <div className="flex items-center gap-2">
                                                            {!isBipartisan && !isNonUS && <span className="text-lg font-bold text-gray-900">{politicalValue}%</span>}
                                                            <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${politicalColor}`}
                                                                    style={{ width: (isBipartisan || isNonUS) ? '100%' : `${Math.max(politicalValue, 0)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-6 flex items-center">
                                                            <span className="text-xs font-medium text-gray-400 italic">Data unavailable</span>
                                                        </div>
                                                    )}

                                                    {politicalValue === 0 && !isBipartisan && !isNonUS && (
                                                        <div className="mt-2 text-[9px] text-gray-400 italic">No direct political data found</div>
                                                    )}

                                                    {isNonUS && (
                                                        <div className="mt-2 text-[9px] font-medium text-gray-400 italic leading-tight">
                                                            {t('political_not_relevant')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {showUsaMeter && !showRepMeter && (
                                                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-center">
                                                    <span className="text-[#5d636f] text-[10px] font-bold uppercase tracking-wider block mb-1">{t('usa_score')}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-bold text-gray-900">{usaScore}%</span>
                                                        <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${usaScore > 20 ? 'bg-brand' : 'bg-emerald-500'}`}
                                                                style={{ width: `${Math.max(usaScore, 0)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </FeatureGate>

                                        <FeatureGate feature="made_in_country" featureLabel="Made In">
                                            <div className={`p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-center ${(showUsaMeter || showRepMeter) ? '' : 'col-span-2'}`}>
                                                <div>
                                                    <span className="text-[#5d636f] text-[10px] font-bold uppercase tracking-wider block mb-1">{t('made_in')}</span>
                                                    <div className="flex items-center gap-2">
                                                        {isMultipleCountries
                                                            ? <span className="text-xl leading-none">🌐</span>
                                                            : <CountryFlag code={result.manufacturedInCode} className="w-8 h-6 object-cover rounded shadow-sm" />
                                                        }
                                                        <span className="text-sm font-bold text-gray-900 leading-tight wrap-break-word line-clamp-1">{madeInText}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </FeatureGate>
                                    </div>

                                    <FeatureGate feature="scan_result_tab_about" featureLabel="About">
                                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                            <h4 className="text-xs font-bold text-[#5d636f] mb-1.5 uppercase tracking-wider">{t('about')}</h4>
                                            <div className="relative">
                                                <p className={`text-gray-600 text-[12px] leading-relaxed font-medium transition-all duration-300 ${!isDescriptionExpanded ? 'line-clamp-4' : ''}`}>
                                                    {displayData.description}
                                                </p>
                                                {result.description && result.description.length > 80 && (
                                                    <button
                                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                                        className="mt-0.5 text-[10px] font-bold text-brand hover:text-brand-dark flex items-center gap-1"
                                                    >
                                                        {isDescriptionExpanded ? t('show_less') : t('read_more')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </FeatureGate>

                                    <div className="mt-3">
                                        <FeatureGate feature="reliability_score" featureLabel="Reliability & Scores">
                                            <button
                                                onClick={() => setShowValidation(!showValidation)}
                                                className="w-full bg-white border border-gray-100 p-3 rounded-2xl flex items-center justify-center hover:border-gray-200 hover:shadow-sm transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${confidence >= 80 ? 'bg-emerald-100 text-emerald-600' :
                                                        confidence >= 50 ? 'bg-amber-100 text-amber-600' :
                                                            'bg-red-100 text-red-600'
                                                        }`}>
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t('reliability')}</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-900">{confidence}% {t('confidence')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-colors">
                                                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showValidation ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {showValidation && (
                                                <div className="mt-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">

                                                    {!hasSources && (!displayData.keyEvidence || displayData.keyEvidence.length === 0) && (!displayData.uncertainties || displayData.uncertainties.length === 0) && (
                                                        <div className="text-xs text-gray-500 italic mb-2">
                                                            Fast scan complete. Switch to Pro mode for detailed evidence and sources.
                                                        </div>
                                                    )}

                                                    {displayData.keyEvidence && displayData.keyEvidence.length > 0 && (
                                                        <div className="mt-1">
                                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <CheckCircle className="w-3 h-3" />
                                                                {t('key_evidence')}
                                                            </h5>
                                                            <ul className="space-y-1.5">
                                                                {displayData.keyEvidence.map((ev: any, i: number) => (
                                                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                                                        <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${ev.confidence === 'High' ? 'bg-emerald-400' : ev.confidence === 'Medium' ? 'bg-amber-400' : 'bg-red-400'}`} />
                                                                        <span className="leading-snug">
                                                                            {ev.point}
                                                                            <span className="text-[9px] text-gray-400 ml-1 font-medium">({ev.confidence})</span>
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {displayData.uncertainties && displayData.uncertainties.length > 0 && (
                                                        <div className="mt-3">
                                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {t('potential_issues')}
                                                            </h5>
                                                            <ul className="space-y-1.5">
                                                                {displayData.uncertainties.map((unc: string, i: number) => (
                                                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                                                        <span className="leading-snug">{unc}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Explicit Sources List */}
                                                    {aboutSources.length > 0 && (
                                                        <div className="pt-3 mt-3 border-t border-gray-200/50">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                <Globe className="w-2.5 h-2.5" />
                                                                {t('verified_sources')}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {aboutSources.map((src, i) => {
                                                                    const isPolitical = src.category === 'POLITICAL' || src.uri.includes('opensecrets') || src.uri.includes('fec.gov');
                                                                    const isOwnership = src.category === 'OWNERSHIP';
                                                                    let badgeColor = "bg-white text-blue-600 border-gray-200";
                                                                    let labelPrefix = "";
                                                                    if (isPolitical) {
                                                                        badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                                                                        labelPrefix = "[Pol] ";
                                                                    } else if (isOwnership) {
                                                                        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                                                        labelPrefix = "[Own] ";
                                                                    }
                                                                    return (
                                                                        <a
                                                                            key={`src-${i}`}
                                                                            href={src.uri}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className={`text-[9px] px-2 py-1 rounded-md border flex items-center gap-1 font-semibold hover:bg-gray-50 transition-colors ${badgeColor}`}
                                                                            title={src.title}
                                                                        >
                                                                            <span className="truncate max-w-[100px]">{labelPrefix}{src.title}</span>
                                                                            <ExternalLink className="w-2 h-2 opacity-50 shrink-0" />
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="pt-3 mt-3 border-t border-gray-200">
                                                        <p className="text-[9px] text-gray-400 italic">
                                                            {t('ai_verified')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </FeatureGate>
                                    </div>

                                </div>
                            )}

                            {activeTab === 'alternatives' && showAlternatives && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    {/* Loading State */}
                                    {isFindingAlternatives && (!hasAlternatives || (result.alternatives && result.alternatives.length === 0)) && (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20 duration-1000" />
                                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 relative z-10">
                                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin-fast" />
                                                </div>
                                            </div>
                                            <h3 className="text-gray-900 font-bold text-sm mb-1">{t('searching_alts')}</h3>
                                            <p className="text-gray-500 text-xs font-medium animate-pulse max-w-[200px]">
                                                {t('searching_alts_desc')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {!isFindingAlternatives && !hasAlternatives && (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                <Sparkles className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <h3 className="text-gray-900 font-bold text-sm mb-2">{t('no_alternatives')}</h3>
                                            <button
                                                onClick={() => onFindAlternatives(result.id)}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center gap-2"
                                            >
                                                <RefreshCcw className="w-4 h-4" />
                                                {t('find_alternatives')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Alternatives List */}
                                    {hasAlternatives && (
                                        <div className="space-y-3">
                                            {/* Combine and map alternatives */}
                                            {[...(result.europeanAlternatives || []), ...(result.alternatives || [])].map((alt: any, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm relative group">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-sm">{alt.name}</h4>
                                                            {(alt.ownerCountryCode || alt.country) && (
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    {alt.ownerCountryCode && <CountryFlag code={alt.ownerCountryCode} className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm" />}
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                                                        {alt.country || alt.ownerCountryCode}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {alt.website && (
                                                            <a
                                                                href={alt.website.startsWith('http') ? alt.website : `https://${alt.website}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-brand hover:text-white transition-colors"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-gray-600 font-medium leading-relaxed mb-3">
                                                        {alt.reason}
                                                    </p>

                                                    <div className="flex items-center gap-2">
                                                        {alt.findAt && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                                                <Store className="w-3 h-3" />
                                                                {alt.findAt}
                                                            </span>
                                                        )}
                                                        {alt.price && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                                <Tag className="w-3 h-3" />
                                                                {alt.price}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => onFindAlternatives(result.id, true)}
                                                disabled={isFindingAlternatives}
                                                className="w-full py-3 mt-2 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <RefreshCcw className={`w-3 h-3 ${isFindingAlternatives ? 'animate-spin' : ''}`} />
                                                {isFindingAlternatives ? t('refreshing') : t('refresh_results')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'buying' && showShopping && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    {/* Location & Context Banner */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl mb-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${userLocation ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-white border-gray-200 text-gray-400'}`}>
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-wide ${userLocation ? 'text-emerald-700' : 'text-gray-500'}`}>
                                                    {userLocation ? `GPS Active (${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)})` : 'Location Not Shared'}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {t('find_retailers')} in: <span className="font-bold text-gray-700">{defaultSettings.country}</span>
                                                </span>
                                            </div>
                                        </div>
                                        {!userLocation && onRequestLocation && (
                                            <button
                                                onClick={onRequestLocation}
                                                className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm active:scale-95"
                                            >
                                                Share Now
                                            </button>
                                        )}
                                    </div>

                                    {hasShoppingOptions && (
                                        <div className="flex justify-end px-1">
                                            <button
                                                onClick={() => onFindShoppingOptions(result.id, true)}
                                                disabled={isFindingShoppingOptions}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-70"
                                            >
                                                <RefreshCcw className={`w-3 h-3 ${isFindingShoppingOptions ? 'animate-spin-fast' : ''}`} />
                                                {isFindingShoppingOptions ? t('refreshing') : t('refresh_results')}
                                            </button>
                                        </div>
                                    )}

                                    {!hasShoppingOptions ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            {isFindingShoppingOptions ? (
                                                <div className="flex flex-col items-center animate-in fade-in duration-300">
                                                    <div className="relative mb-6">
                                                        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20 duration-1000" />
                                                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 relative z-10">
                                                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin-fast" />
                                                        </div>
                                                    </div>
                                                    <h3 className="text-gray-900 font-bold text-sm mb-1">{t('searching_retailers')}</h3>
                                                    <p className="text-gray-500 text-xs font-medium animate-pulse max-w-[200px]">
                                                        {t('searching_retailers_desc')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                                                    </div>
                                                    <h3 className="text-gray-900 font-bold text-sm mb-2">{t('no_retailers')}</h3>
                                                    <p className="text-gray-500 text-xs mb-6 max-w-[200px]">
                                                        Check prices from nearby stores or online retailers.
                                                    </p>
                                                    <button
                                                        onClick={() => onFindShoppingOptions(result.id)}
                                                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center gap-2"
                                                    >
                                                        <Tag className="w-4 h-4" />
                                                        {t('find_retailers')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {sortedShoppingOptions.map((opt, idx) => (
                                                <div key={idx} className={`p-4 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col gap-2 relative`}>
                                                    {/* Top Row: Icon + Details + Action */}
                                                    <div className="flex items-center gap-4">
                                                        {/* Store Icon */}
                                                        <div className={`w-10 h-10 rounded-full shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center p-1 shadow-sm ${opt.type === 'ONLINE' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                            {opt.type === 'ONLINE' ? <Globe className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                                                        </div>

                                                        {/* Text Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-gray-900 text-[13px] truncate">{opt.retailer}</h4>
                                                            <p className="text-xs text-gray-500 font-medium truncate">{result.itemName}</p>
                                                        </div>

                                                        {/* Action Button: Search Product + Store on Google */}
                                                        <a
                                                            href={`https://www.google.com/search?q=${encodeURIComponent(result.itemName + " " + opt.retailer + " price")}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 border border-gray-200 hover:bg-brand hover:text-white hover:border-brand transition-colors shadow-sm shrink-0"
                                                            title={`Search ${opt.retailer}`}
                                                        >
                                                            <Search className="w-5 h-5" />
                                                        </a>
                                                    </div>

                                                    {/* Bottom Row: Price & Map Links */}
                                                    <div className="flex items-center gap-3 mt-1 ml-[3.5rem]">
                                                        {/* Price Tag -> Direct Product Link (or Search Fallback) */}
                                                        <a
                                                            href={opt.link && opt.link.startsWith('http') ? opt.link : `https://www.google.com/search?q=${encodeURIComponent(result.itemName + " " + opt.retailer)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100 hover:bg-green-100 transition-colors"
                                                        >
                                                            <Tag className="w-3 h-3" /> {opt.price}
                                                        </a>

                                                        {/* Map Link -> Store Name Search */}
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opt.retailer)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100 hover:bg-gray-100 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                        >
                                                            <MapPin className="w-3 h-3 text-gray-400" /> {opt.type === 'ONLINE' ? t('online') : opt.retailer}
                                                        </a>

                                                        {/* Availability Badge (Optional) */}
                                                        {opt.availability && (
                                                            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[80px]">
                                                                {opt.availability}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="h-40 w-full shrink-0"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default ScanResultCard;
