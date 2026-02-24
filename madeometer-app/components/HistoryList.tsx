
import React, { useMemo, useState } from 'react';
import { ScanResult } from '../types';
import { ChevronRight, ChevronDown, PackageSearch, Calendar, Globe, Layers, Eye, Trash2, X, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingState } from '../../shared/LoadingState';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { FeatureGate, HistoryLockIcon } from './FeatureGate';
import { UpgradeDialog } from './UpgradeDialog';


interface HistoryListProps {
    history: ScanResult[];
    onSelect: (item: ScanResult) => void;
    onSelectGroup: (items: ScanResult[]) => void;
    onDelete: (id: string) => void;
    onClose?: () => void;
    isLoading?: boolean;
}


const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onSelectGroup, onDelete, onClose, isLoading }) => {

    const { t } = useLanguage();
    const { isWithinLimit, plan } = useFeatureGate();
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(10);
    const [upgradeOpen, setUpgradeOpen] = useState(false);

    const filteredHistory = useMemo(() => {
        if (!searchQuery.trim()) return history;
        const query = searchQuery.toLowerCase();
        return history.filter(item =>
            item.itemName.toLowerCase().includes(query) ||
            item.ownerCountry.toLowerCase().includes(query)
        );
    }, [history, searchQuery]);

    const groupedHistory = useMemo(() => {
        const groups = new Map<number, ScanResult[]>();
        filteredHistory.forEach(item => {
            const key = item.timestamp;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        });
        return Array.from(groups.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([timestamp, items]) => ({ timestamp, items }));
    }, [filteredHistory]);

    const hasMinItems = history.length >= 5;
    const paginatedGroups = groupedHistory.slice(0, visibleCount);
    const hasMore = visibleCount < groupedHistory.length;

    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    const toggleGroup = (timestamp: number) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(timestamp)) {
                next.delete(timestamp);
            } else {
                next.add(timestamp);
            }
            return next;
        });
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(id);
    };

    const renderSingleItem = (item: ScanResult, isGrouped: boolean = false, itemIndex: number = 0) => {
        const locked = !isWithinLimit(isGrouped ? 'multi_product_scan_limit' : 'history_scan_limit', itemIndex);

        const handleClick = () => {
            if (locked) { setUpgradeOpen(true); return; }
            onSelect(item);
        };

        return (
            <div
                key={item.id}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                }}
                role="button"
                tabIndex={0}
                className={`w-full group bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 rounded-3xl p-3 border border-gray-100 flex items-center gap-4 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden ${isGrouped ? 'mb-2 last:mb-0 bg-white border-gray-100' : ''} ${locked ? 'opacity-60' : ''}`}
            >
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shrink-0 border border-gray-100 relative shadow-sm z-0">
                    <img
                        src={item.imageUrl}
                        alt={item.itemName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>

                <div className="flex-1 min-w-0 py-1 text-left relative z-0">
                    <h4 className="text-gray-900 font-medium truncate text-[13px] mb-2 group-hover:text-brand transition-colors">{item.itemName}</h4>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <Globe className="w-3 h-3" />
                            <span className="truncate">{item.ownerCountry}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="pr-2 flex items-center gap-3 relative z-10">
                    {locked ? (
                        <HistoryLockIcon onTap={() => setUpgradeOpen(true)} />
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => handleDelete(e, item.id)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm relative z-20"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-all duration-300 shadow-sm">
                        {locked ? null : <ChevronRight className="w-4 h-4" />}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col pt-4 min-h-full">
            <div className="bg-white rounded-t-[1.4rem] p-5 shadow-2xl relative min-h-full flex flex-col flex-1">
                <div className="flex items-center justify-between mb-6 mt-2">
                    <div className="flex items-end gap-3">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{t('history_title')}</h2>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
                            {history.length} {t('scans_count')}
                        </span>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-900 hover:bg-gray-100 transition-colors border border-gray-100 shadow-sm shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {hasMinItems && (
                    <div className="mb-6 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('search_history')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-500 py-20">
                        <LoadingState message={t('loading_history') || "Loading history..."} />
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-500 space-y-6 p-6 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-inner">
                            <PackageSearch className="w-10 h-10 text-gray-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{searchQuery ? t('no_results') || "No results found" : t('no_history')}</h3>
                            <p className="max-w-xs mx-auto text-[13px] font-medium text-gray-500">
                                {searchQuery ? t('no_results_desc') || "Try searching for something else" : t('no_history_desc')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {paginatedGroups.map(({ timestamp, items }, groupIndex) => {
                            if (items.length === 1) {
                                return renderSingleItem(items[0], false, groupIndex);
                            }

                            const isExpanded = expandedGroups.has(timestamp);
                            const mainItem = items[0];
                            const names = items.map(i => i.itemName).join(', ');

                            const historyLocked = !isWithinLimit('history_scan_limit', groupIndex);

                            return (
                                <div key={timestamp} className={`rounded-3xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm transition-all duration-300 ${historyLocked ? 'opacity-60' : ''}`}>
                                    <FeatureGate feature="multi_product_scan" featureLabel="Multi-Product Scan">
                                        <button
                                            onClick={() => historyLocked ? setUpgradeOpen(true) : toggleGroup(timestamp)}
                                            className="w-full p-3 flex items-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shrink-0 border border-gray-100 relative shadow-sm">
                                                <img
                                                    src={mainItem.imageUrl}
                                                    alt="Batch Scan"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                    <div className="bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                                                        <Layers className="w-3 h-3" />
                                                        {items.length}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 text-left py-1">
                                                <h4 className="text-gray-900 font-bold text-[13px] mb-1 truncate">
                                                    {items.length} {t('items_found')}
                                                </h4>
                                                <p className="text-xs text-gray-500 font-medium truncate mb-2">
                                                    {names}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>

                                            <div className="pr-2">
                                                {historyLocked ? (
                                                    <HistoryLockIcon onTap={() => setUpgradeOpen(true)} />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 transition-transform duration-300 shadow-sm ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronDown className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    </FeatureGate>

                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="p-2 space-y-2 bg-gray-100/50 border-t border-gray-200">
                                            <FeatureGate feature="multi_product_scan" featureLabel="Multi-Product Report">
                                                <button
                                                    onClick={() => onSelectGroup(items)}
                                                    className="w-full py-3 mb-1 bg-white border border-brand/20 text-brand font-bold rounded-2xl shadow-sm text-[11px] uppercase tracking-wider hover:bg-brand hover:text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {t('view_report')}
                                                </button>
                                            </FeatureGate>
                                            {items.map((item, idx) => renderSingleItem(item, true, idx))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {hasMore && hasMinItems && (
                            <button
                                onClick={() => setVisibleCount(prev => prev + 10)}
                                className="w-full py-4 mt-2 bg-gray-50 border border-gray-100 text-gray-600 font-bold rounded-3xl shadow-sm text-xs uppercase tracking-widest hover:bg-gray-100 hover:text-brand transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronDown className="w-4 h-4" />
                                {t('load_more')}
                            </button>
                        )}
                    </div>
                )}

                {/* Upgrade dialog for history limit */}
                <UpgradeDialog
                    open={upgradeOpen}
                    onOpenChange={setUpgradeOpen}
                    currentPlan={plan}
                    featureLabel="Unlimited History"
                />

                <div className="h-40 w-full shrink-0"></div>
            </div>
        </div>
    );
};
export default HistoryList;
