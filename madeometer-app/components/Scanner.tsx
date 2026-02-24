
import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Search, Heart, Zap, Rocket, ArrowRight, Bolt } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { FeatureGate } from './FeatureGate';

interface ScannerProps {
    isAnalyzing: boolean;
    previewImage?: string | null;
    onCameraClick: () => void;
    onGalleryClick: () => void;
    onSearch: (query: string) => void;
    activeModel?: string;
    onSupportClick: () => void;
    loadingMessages?: string[]; // New prop for custom messages
}

const Scanner: React.FC<ScannerProps> = ({ isAnalyzing, previewImage, onCameraClick, onGalleryClick, onSearch, activeModel = 'madeometer-instant', onSupportClick, loadingMessages }) => {
    const [status, setStatus] = useState("Connecting...");
    const [searchText, setSearchText] = useState("");
    const [elapsedTime, setElapsedTime] = useState(0);
    const { t } = useLanguage();

    // Ensure activeModel is always a string
    const safeModel = activeModel || 'madeometer-instant';
    const isSuperFast = safeModel === 'madeometer-superfast';
    const isInstant = safeModel === 'madeometer-instant';

    useEffect(() => {
        if (isAnalyzing) {
            let defaultMessages = [
                t('status_processing'),
                t('status_identifying'),
                t('status_verifying'),
                t('status_hierarchy'),
                t('status_ethics'),
                t('status_alternatives'),
                t('status_finalizing')
            ];

            if (isInstant) {
                defaultMessages = ["Snapping...", "Identifying...", "Checking Context...", "Done."];
            }

            // Use custom messages if provided, else defaults
            const messages = loadingMessages || defaultMessages;

            // Status Message Rotation
            let i = 0;
            setStatus(messages[0]);

            let intervalTime = 1500; // Standard Flash
            if (isSuperFast) intervalTime = 1000; // Super Fast
            if (isInstant) intervalTime = 1000; // Instant Snap (Very Fast)

            const messageInterval = setInterval(() => {
                i++;
                if (i < messages.length) {
                    setStatus(messages[i]);
                }
            }, intervalTime);

            // Timer Logic
            const startTime = Date.now();
            const timerInterval = setInterval(() => {
                setElapsedTime((Date.now() - startTime) / 1000);
            }, 50); // Update every 50ms for smooth decimals

            return () => {
                clearInterval(messageInterval);
                clearInterval(timerInterval);
            };
        } else {
            setElapsedTime(0);
        }
    }, [isAnalyzing, safeModel, isSuperFast, isInstant, loadingMessages, t]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchText.trim()) {
            onSearch(searchText.trim());
        }
    };

    const getGradient = () => {
        if (isInstant) return 'via-cyan-500/10 to-blue-500/5';
        if (isSuperFast) return 'via-red-500/10 to-orange-500/5';
        return 'via-amber-500/10 to-amber-500/5';
    };

    const getSpinAnimation = (inner?: boolean, reverse?: boolean) => {
        if (isInstant) return `animate-[spin_0.3s_linear_infinite${reverse ? '_reverse' : ''}]`;
        if (isSuperFast) return `animate-[spin_0.5s_linear_infinite${reverse ? '_reverse' : ''}]`;
        return `animate-[spin_1s_linear_infinite${reverse ? '_reverse' : ''}]`;
    };

    const getBorderColor = () => {
        if (isInstant) return 'border-cyan-300/30';
        if (isSuperFast) return 'border-red-300/30';
        return 'border-amber-300/30';
    };

    const getPulseColor = () => {
        if (isInstant) return 'bg-cyan-500/10 border-cyan-500/20';
        if (isSuperFast) return 'bg-red-500/10 border-red-500/20';
        return 'bg-amber-500/10 border-amber-500/20';
    };

    const getBounceColor = () => {
        if (isInstant) return 'bg-cyan-400';
        if (isSuperFast) return 'bg-red-500';
        return 'bg-amber-400';
    };

    return (
        <div className="flex flex-col w-full items-center pt-4 relative z-10 min-h-full">

            {/* Constraint Wrapper for Content */}
            <div className="w-full max-w-[450px] bg-white rounded-t-[1.4rem] p-5 shadow-2xl relative overflow-hidden flex flex-col flex-1">

                {isAnalyzing && (
                    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center animate-in fade-in duration-500">
                        {previewImage && (
                            <div className="absolute inset-0 opacity-40">
                                <img
                                    src={previewImage}
                                    alt="Scanning"
                                    className="w-full h-full object-cover blur-[2px]"
                                />
                                <div className="absolute inset-0 bg-slate-900/60" />
                            </div>
                        )}

                        <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${getGradient()}`} />

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />

                                <div className={`absolute inset-2 rounded-full border-t border-l border-white/30 ${getSpinAnimation()}`} />
                                <div className={`absolute inset-4 rounded-full border-b border-r ${getBorderColor()} ${getSpinAnimation(false, true)}`} />

                                <div className={`absolute inset-8 rounded-full animate-pulse border ${getPulseColor()}`} />

                                <div className="relative z-10">
                                    {isInstant ? (
                                        <Bolt className="w-10 h-10 text-white/90 animate-pulse" />
                                    ) : isSuperFast ? (
                                        <Rocket className="w-8 h-8 text-white/80 animate-pulse" />
                                    ) : (
                                        <Zap className="w-8 h-8 text-white/80 animate-pulse" />
                                    )}
                                </div>

                                <div className={`absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent to-transparent shadow-[0_0_10px_rgba(129,140,248,0.5)] animate-pulse ${isInstant ? 'via-cyan-400/60' : isSuperFast ? 'via-red-400/50' : 'via-amber-400/50'}`} />
                            </div>

                            <div className="space-y-4 text-center">
                                <h3 className="text-xl font-light text-white tracking-wide px-6 min-h-[1.75rem]">
                                    {status}
                                </h3>

                                {/* Timer Counter */}
                                <div className={`text-5xl font-extralight font-mono tracking-tighter tabular-nums ${isInstant ? 'text-cyan-200/90' : 'text-white/30'}`}>
                                    {elapsedTime.toFixed(1)}<span className="text-lg opacity-50 ml-1">s</span>
                                </div>

                                <div className="flex items-center gap-2 justify-center pt-2">
                                    <div className="flex gap-1.5">
                                        <span className={`w-1 h-1 rounded-full animate-[bounce_1s_infinite_0ms] ${getBounceColor()}`} />
                                        <span className={`w-1 h-1 rounded-full animate-[bounce_1s_infinite_200ms] ${getBounceColor()}`} />
                                        <span className={`w-1 h-1 rounded-full animate-[bounce_1s_infinite_400ms] ${getBounceColor()}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium uppercase tracking-[0.2em] ml-2 ${isInstant ? 'text-cyan-200/80' : isSuperFast ? 'text-red-200/60' : 'text-amber-200/60'}`}>
                                        {isInstant ? t('mode_instant') : isSuperFast ? t('mode_superfast') : t('mode_flash')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50/80 rounded-2xl border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center mb-8 mt-2">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm">
                        <Camera className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
                    </div>

                    <div className="w-full space-y-3">
                        <button
                            onClick={onCameraClick}
                            className="gap-2 whitespace-nowrap text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow h-11 w-full bg-slate-800 text-white py-3.5 px-4 rounded-lg flex items-center justify-center hover:bg-slate-700 active:scale-[0.98]"
                        >
                            <Camera className="h-5 w-5 mr-2" />
                            <span className="font-medium">{t('scan_btn')}</span>
                        </button>

                        <FeatureGate feature="upload_input" featureLabel="Image Upload">
                            <button
                                onClick={onGalleryClick}
                                className="gap-2 whitespace-nowrap text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow h-11 w-full bg-white border border-gray-300 text-slate-800 py-3.5 px-4 rounded-lg flex items-center justify-center hover:bg-gray-50 active:scale-[0.98]"
                            >
                                <ImageIcon className="h-5 w-5 mr-2" />
                                <span className="font-medium">{t('upload_btn')}</span>
                            </button>
                        </FeatureGate>
                    </div>
                </div>

                <FeatureGate feature="text_search_input" featureLabel="Text Search">
                    <div className="relative mb-8 group mx-6">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('search_placeholder')}
                            style={{ fontFamily: 'Inter, sans-serif' }}
                            className="w-full h-11 pl-11 pr-12 bg-white border border-gray-200 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm font-medium"
                        />
                        {/* Search Action Button */}
                        <button
                            onClick={() => searchText.trim() && onSearch(searchText.trim())}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 w-8 flex items-center justify-center rounded-md transition-all duration-200 ${searchText.trim()
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95 cursor-pointer'
                                : 'bg-transparent text-transparent pointer-events-none scale-90'
                                }`}
                            disabled={!searchText.trim()}
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </FeatureGate>

                <button
                    onClick={onSupportClick}
                    className="mx-6 p-[12px] bg-[#d0e9cf] text-[#1a401d] rounded-[0.5rem] font-medium text-[13px] mb-4 flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.98] transition-all"
                >
                    <Heart className="w-5 h-5 fill-[#1a401d]" />
                    {t('support_btn')}
                </button>

                <div className="text-center pb-4">
                    <h4 className="font-bold text-gray-900 mb-1 text-[13px]">{t('tagline_title')}</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-[280px] mx-auto mb-6">
                        {t('tagline_desc')}
                    </p>

                    <div className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-80">
                            {t('special_thanks')}
                        </span>
                        <a
                            href="https://plasticchange.dk/"
                            target="_blank"
                            rel="noreferrer"
                            className="hover:opacity-80 transition-opacity hover:scale-105 transform duration-300 block"
                        >
                            <img
                                src="https://plasticchange.dk/wp-content/uploads/2019/05/logo_plastic_change.svg"
                                alt="Plastic Change"
                                className="h-10 w-auto object-contain"
                            />
                        </a>
                    </div>
                </div>

                <div className="h-40 w-full shrink-0"></div>

            </div>
        </div>
    );
};
export default Scanner;
