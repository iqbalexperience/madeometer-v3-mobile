
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Check, ChevronDown, Rocket, Bolt, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageCode } from '../utils/translations';
import Link from 'next/link';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { UpgradeDialog } from './UpgradeDialog';

const LANGUAGES: { code: LanguageCode, label: string, flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'da', label: 'Dansk', flag: '🇩🇰' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
    { code: 'no', label: 'Norsk', flag: '🇳🇴' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

interface HeaderProps {
    onHome: () => void;
    activeModel?: string;
    onModelChange: (model: string) => void;
    subscription?: any;
    isAdmin?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onHome, activeModel = 'madeometer-instant', onModelChange, subscription, isAdmin }) => {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [upgradeFeatureLabel, setUpgradeFeatureLabel] = useState<string | undefined>();

    const { canAccess, plan } = useFeatureGate();
    const canUseInstant = canAccess('ai_model_fast');
    const canUseSuperfast = canAccess('ai_model_superfast');
    const canUseFlash = canAccess('ai_model_flash');

    const handleLockedModelClick = (label: string) => {
        setUpgradeFeatureLabel(label);
        setUpgradeOpen(true);
    };

    const { language, setLanguage, t } = useLanguage();

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    const langRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<HTMLDivElement>(null);

    const safeModel = activeModel || 'madeometer-instant';

    const getBadgeStyles = () => {
        if (isAdmin) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
        if (!subscription) return "bg-gray-500/20 text-gray-400 border-white/10";

        switch (subscription.plan) {
            case 'plus':
                return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
            case 'personal':
                return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
            default:
                return "bg-brand/20 text-brand border-brand/20";
        }
    };

    const getPlanLabel = () => {
        if (isAdmin) return t('super_admin');
        if (!subscription) return t('free_member');
        return t(`${subscription.plan}_member`);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setIsLangOpen(false);
            }
            if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
                setIsModelOpen(false);
            }
        };

        if (isLangOpen || isModelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLangOpen, isModelOpen]);

    return (
        <>
            <header className="relative z-50 bg-black/90 backdrop-blur-md w-full border-b border-white/5 flex justify-center pt-[0.8rem]">
                <div className="w-full max-w-[450px] mt-2 mb-[5px] text-white flex justify-between px-5 relative">

                    <div className="h-full flex items-center justify-between">
                        <div onClick={onHome} className="cursor-pointer flex flex-row space-x-2 items-center">
                            <img
                                src="/logo.png"
                                alt="Made O'Meter"
                                className="w-[2.6rem] h-[2.6rem] rounded-lg object-contain"
                            />
                            <div>
                                <p className="font-bold text-xl leading-none">Made O'Meter</p>
                                {(isAdmin || subscription) && (
                                    <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border transition-colors ${getBadgeStyles()}`}>
                                        {getPlanLabel()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 justify-end pt-1">



                        {/* Active Model Selector - Interactive Badge */}
                        <div className="relative" ref={modelRef}>

                            <button
                                onClick={() => setIsModelOpen(!isModelOpen)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all shadow-sm"
                                title={safeModel}
                            >
                                {safeModel === 'madeometer-instant' ? (
                                    <Bolt className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                                ) : safeModel === 'madeometer-superfast' ? (
                                    <Rocket className="w-4 h-4 text-red-400 fill-red-400/20" />
                                ) : (
                                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                                )}
                                <ChevronDown className="w-3 h-3 text-white/50" />
                            </button>

                            {isModelOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[100]">
                                    <div className="p-3 bg-gray-50 border-b border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select AI Model</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => {
                                                if (!canUseInstant) {
                                                    handleLockedModelClick('Instant AI');
                                                    return;
                                                }
                                                onModelChange('madeometer-instant');
                                                setIsModelOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${canUseInstant
                                                ? safeModel === 'madeometer-instant'
                                                    ? 'bg-cyan-50 text-cyan-900 ring-1 ring-cyan-200'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                : 'opacity-60 cursor-pointer hover:bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${safeModel === 'madeometer-instant' && canUseInstant ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Bolt className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-xs flex items-center gap-1.5">
                                                        {t('mode_instant')}
                                                        {!canUseInstant && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded uppercase tracking-wide">Plus</span>}
                                                    </div>
                                                    <div className="text-[10px] opacity-70">Under 3 sec • Grounded</div>
                                                </div>
                                            </div>
                                            {canUseInstant && safeModel === 'madeometer-instant' && <Check className="w-4 h-4 text-cyan-600" />}
                                            {!canUseInstant && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>

                                        {/* Superfast — gated for free plan */}
                                        <button
                                            onClick={() => {
                                                if (!canUseSuperfast) {
                                                    handleLockedModelClick('Superfast AI');
                                                    return;
                                                }
                                                onModelChange('madeometer-superfast');
                                                setIsModelOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${canUseSuperfast
                                                ? safeModel === 'madeometer-superfast'
                                                    ? 'bg-red-50 text-red-900 ring-1 ring-red-200'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                : 'opacity-60 cursor-pointer hover:bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${safeModel === 'madeometer-superfast' && canUseSuperfast ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Rocket className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-xs flex items-center gap-1.5">
                                                        {t('mode_superfast')}
                                                        {!canUseSuperfast && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded uppercase tracking-wide">Plus</span>}
                                                    </div>
                                                    <div className="text-[10px] opacity-70">Minimal Thinking • Max Speed</div>
                                                </div>
                                            </div>
                                            {canUseSuperfast && safeModel === 'madeometer-superfast' && <Check className="w-4 h-4 text-red-600" />}
                                            {!canUseSuperfast && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>

                                        {/* Flash — gated for free plan */}
                                        <button
                                            onClick={() => {
                                                if (!canUseFlash) {
                                                    handleLockedModelClick('Flash AI');
                                                    return;
                                                }
                                                onModelChange('gemini-3-flash-preview');
                                                setIsModelOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${canUseFlash
                                                ? safeModel === 'gemini-3-flash-preview'
                                                    ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                : 'opacity-60 cursor-pointer hover:bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${safeModel === 'gemini-3-flash-preview' && canUseFlash ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-xs flex items-center gap-1.5">
                                                        {t('mode_flash')}
                                                        {!canUseFlash && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded uppercase tracking-wide">Plus</span>}
                                                    </div>
                                                    <div className="text-[10px] opacity-70">Standard • Balanced</div>
                                                </div>
                                            </div>
                                            {canUseFlash && safeModel === 'gemini-3-flash-preview' && <Check className="w-4 h-4 text-amber-600" />}
                                            {!canUseFlash && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Language Selector */}
                        <div className="relative" ref={langRef}>
                            <button
                                onClick={() => setIsLangOpen(!isLangOpen)}
                                className="flex items-center justify-center gap-1.5 text-sm font-medium transition-colors focus-visible:outline-none h-9 px-2 rounded-full text-white hover:bg-white/10"
                                type="button"
                            >
                                <span className="text-[1.35rem] leading-none">{currentLang.flag}</span>
                                <ChevronDown className="w-3 h-3 text-white/70" />
                            </button>

                            {isLangOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[100]">
                                    <div className="max-h-64 overflow-y-auto no-scrollbar py-1">
                                        {LANGUAGES.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    setLanguage(lang.code);
                                                    setIsLangOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${currentLang.code === lang.code ? 'bg-gray-50 text-gray-900 font-bold' : 'text-gray-600'}`}
                                            >
                                                <span className="text-lg">{lang.flag}</span>
                                                <span>{lang.label}</span>
                                                {currentLang.code === lang.code && <Check className="w-3.5 h-3.5 text-brand ml-auto" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                </div>
            </header>
            {/* Upgrade dialog triggered from model selector */}
            <UpgradeDialog
                open={upgradeOpen}
                onOpenChange={setUpgradeOpen}
                currentPlan={plan}
                featureLabel={upgradeFeatureLabel}
            />
        </>
    );
};
export default Header;
