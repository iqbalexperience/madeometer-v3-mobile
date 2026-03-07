"use client";

import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronRight, ArrowLeft, Eye, Clock, Loader2, Sparkles, BookOpen, Search, X } from 'lucide-react';
import axios from 'axios';
import MarkdownRenderer from '@/components/forum/markdown-renderer';
import { formatDistanceToNow } from 'date-fns';

import { useLanguage } from '../contexts/LanguageContext';
import { useCommunityData } from '../contexts/CommunityDataContext';

export default function TipsView() {
    const { t } = useLanguage();
    const { tips, isTipsLoading: isLoading, refreshTips, totalTips } = useCommunityData();
    const [selectedTip, setSelectedTip] = useState<any | null>(null);
    const [isFetchingSelected, setIsFetchingSelected] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortOption, setSortOption] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 on sort change
    }, [sortOption]);

    // Handle fetching on search/sort/page change
    useEffect(() => {
        if (selectedTip) return; // Don't refresh if viewing a tip

        // Skip redundant initial fetch if we already have tips in context 
        // and we are looking at the default view (no search, default sort, first page)
        if (isInitialLoad && tips.length > 0 && !debouncedSearch && sortOption === 'newest' && currentPage === 1) {
            setIsInitialLoad(false);
            return;
        }

        let sortField = 'createdAt';
        let sortOrder = 'desc';

        if (sortOption === 'popular') {
            sortField = 'views';
            sortOrder = 'desc';
        } else if (sortOption === 'alpha') {
            sortField = 'title';
            sortOrder = 'asc';
        }

        const isMore = currentPage > 1;
        refreshTips(debouncedSearch, sortField, sortOrder, currentPage, pageSize, isMore).finally(() => {
            setIsInitialLoad(false);
        });
    }, [debouncedSearch, sortOption, refreshTips, currentPage, tips.length]);

    const handleTipClick = async (tip: any) => {
        setIsFetchingSelected(true);
        setSelectedTip(null); // Clear previous or set initial metadata if we want transition, but here we'll fetch first

        try {
            const response = await axios.get(`/api/tips/${tip.id}`);
            setSelectedTip(response.data);
        } catch (e) {
            console.error("Failed to fetch tip details", e);
            // Fallback to minimal info if fetch fails
            setSelectedTip(tip);
        } finally {
            setIsFetchingSelected(false);
        }
    };

    if (isLoading && isInitialLoad) {
        return (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-brand/10 border-t-brand rounded-full animate-spin" />
                    <Sparkles className="w-5 h-5 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {isFetchingSelected && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-3xl animate-in fade-in duration-200 min-h-[400px]">
                    <div className="relative mb-3">
                        <div className="w-10 h-10 border-4 border-brand/10 border-t-brand rounded-full animate-spin" />
                        <BookOpen className="w-4 h-4 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-900 tracking-tight uppercase tracking-widest">{t('opening_type').replace('{type}', selectedTip?.type || t('knowledge_base'))}</p>
                </div>
            )}

            {selectedTip ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                    <button
                        onClick={() => setSelectedTip(null)}
                        className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 text-gray-500 border border-gray-100 font-bold text-[11px] mb-6 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        {t('back_to_kb')}
                    </button>

                    <div className="space-y-3 mb-8 px-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-[9px] font-black uppercase tracking-wider">{selectedTip.type || t('knowledge_base')}</span>
                            <div className="h-0.5 w-0.5 rounded-full bg-gray-300" />
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('expert_insights')}</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{selectedTip.title}</h1>
                        <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-1">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                                {formatDistanceToNow(new Date(selectedTip.createdAt), { addSuffix: true })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                                {selectedTip.views} {t('views')}
                            </span>
                        </div>
                    </div>

                    <div className="text-gray-800 bg-white">
                        <MarkdownRenderer content={selectedTip.content} status="done" />
                    </div>

                    <div className="mt-8 p-6 bg-gradient-to-br from-brand/5 to-transparent rounded-3xl border border-brand/10 text-center relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-brand/5 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-5 h-5 text-brand" />
                            </div>
                            <p className="text-sm font-bold text-gray-900 mb-1 leading-tight">{t('apply_strategy')}</p>
                            <p className="text-[11px] text-gray-500 font-medium">{t('exclusive_strategies')}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <div className="mb-6 px-1">
                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shadow-sm">
                                <Lightbulb className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 tracking-tight">{t('knowledge_base')}</h2>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                            <div className="relative flex-1 w-full group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('search_strategies')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-gray-100 text-gray-900 rounded-[1.2rem] py-3.5 pl-11 pr-10 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/20 transition-all shadow-sm group-hover:shadow-md"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="w-full sm:w-auto">
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                    className="w-full sm:w-auto appearance-none bg-gray-50 border border-gray-100 text-gray-600 text-[11px] font-bold rounded-xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                                >
                                    <option value="newest">{t('newest_first')}</option>
                                    <option value="popular">{t('most_viewed')}</option>
                                    <option value="alpha">{t('alphabetical')}</option>
                                </select>
                            </div>
                        </div>

                    </div>



                    <div className="grid gap-6 pb-6">
                        {tips.length > 0 ? (
                            <>
                                {tips.map((tip, idx) => (
                                    <button
                                        key={tip.id}
                                        onClick={() => handleTipClick(tip)}
                                        className={`group relative flex items-center w-full p-4 bg-white border border-gray-100 hover:border-brand/20 rounded-[1.4rem] shadow-sm hover:shadow-md transition-all duration-300 text-left active:scale-[0.99] mt-3 ${isLoading ? 'opacity-50 grayscale-[0.2]' : ''}`}
                                        disabled={isLoading}
                                    >
                                        {/* Overlapping Badge */}
                                        <div className="absolute top-0 -translate-y-1/2 left-6 z-10">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-white bg-brand px-3 py-1 rounded-full shadow-lg shadow-brand/20 border border-white/20 whitespace-nowrap">
                                                {tip.type || t('knowledge_base')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 w-full min-w-0">
                                            <div className="flex-1 min-w-0 py-1">
                                                <h3 className="text-base font-bold text-gray-900 group-hover:text-brand transition-colors mb-1 leading-snug pr-8">
                                                    {tip.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatDistanceToNow(new Date(tip.createdAt))} ago
                                                    </span>
                                                    <div className="hidden sm:block h-1 w-1 rounded-full bg-gray-200" />
                                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {tip.views} {t('views')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-2 rounded-full bg-gray-50 text-brand border border-gray-100 group-hover:text-brand group-hover:border-brand/20 group-hover:translate-x-0.5 transition-all shrink-0">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                {totalTips > tips.length && (
                                    <div className="flex items-center justify-center pt-6 pb-8 overflow-hidden">
                                        <button
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            disabled={isLoading}
                                            className="group relative flex items-center justify-center gap-2.5 px-8 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 text-xs font-bold uppercase tracking-widest hover:border-brand/20 hover:bg-gray-50/50 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                                            ) : (
                                                <>
                                                    {t('load_more')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-20 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200 animate-in fade-in duration-500">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                                    <Search className="w-8 h-8 text-gray-200" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">{t('no_matches_found')}</h3>
                                <p className="text-[11px] text-gray-400 font-medium px-8">
                                    {t('no_tips_matching').replace('{search}', debouncedSearch)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
