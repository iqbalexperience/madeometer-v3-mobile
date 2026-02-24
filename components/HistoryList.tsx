import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ScanResult } from '../types';
import { FeatureGate } from './FeatureGate';
import { UpgradeDialog } from './UpgradeDialog';

interface HistoryListProps {
    history: ScanResult[];
    onSelect: (item: ScanResult) => void;
    onSelectGroup: (items: ScanResult[]) => void;
    onDelete: (id: string) => void;
    onClose?: () => void;
    isLoading?: boolean;
}

const HistoryList: React.FC<HistoryListProps> = ({
    history,
    onSelect,
    onSelectGroup,
    onDelete,
    onClose,
    isLoading
}) => {
    const { t } = useLanguage();
    const { isWithinLimit, plan } = useFeatureGate();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);

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

    const toggleGroup = (timestamp: number) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(timestamp)) next.delete(timestamp);
            else next.add(timestamp);
            return next;
        });
    };

    const paginatedGroups = useMemo(() => {
        return groupedHistory.slice(0, visibleCount);
    }, [groupedHistory, visibleCount]);

    const hasMore = visibleCount < groupedHistory.length;

    const renderSingleItem = (item: ScanResult, isGrouped: boolean = false, itemIndex: number = 0) => {
        const locked = !isWithinLimit(isGrouped ? 'multi_product_scan_limit' : 'history_scan_limit', itemIndex);

        return (
            <View key={item.id} style={styles.itemWrapper}>
                <TouchableOpacity
                    style={[styles.card, isGrouped && styles.subCard, locked && styles.lockedCard]}
                    onPress={() => locked ? setUpgradeOpen(true) : onSelect(item)}
                    activeOpacity={0.7}
                >
                    <Image source={{ uri: item.imageUrl }} style={isGrouped ? styles.subImage : styles.cardImage} />
                    <View style={styles.cardContent}>
                        <Text style={[styles.itemName, isGrouped && styles.subItemName]} numberOfLines={1}>{item.itemName}</Text>
                        <View style={styles.itemMeta}>
                            <Ionicons name="globe-outline" size={12} color="#64748B" />
                            <Text style={styles.itemMetaText}>{item.ownerCountry}</Text>
                        </View>
                        <View style={styles.itemMeta}>
                            <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                            <Text style={styles.dateText}>
                                {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        {locked ? (
                            <Ionicons name="lock-closed" size={18} color="#94A3B8" />
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
                                    <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item: group, index: groupIndex }: { item: { timestamp: number, items: ScanResult[] }, index: number }) => {
        const { timestamp, items } = group;
        const isGroup = items.length > 1;
        const isExpanded = expandedGroups.has(timestamp);

        if (!isGroup) {
            return renderSingleItem(items[0], false, groupIndex);
        }

        const historyLocked = !isWithinLimit('history_scan_limit', groupIndex);

        return (
            <View style={[styles.groupContainer, historyLocked && styles.lockedGroup]}>
                <FeatureGate feature="multi_product_scan" featureLabel="Multi-Product Scan">
                    <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() => historyLocked ? setUpgradeOpen(true) : toggleGroup(timestamp)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.groupImageStack}>
                            <Image source={{ uri: items[0].imageUrl }} style={styles.cardImage} />
                            <View style={styles.groupBadge}>
                                <Ionicons name="layers" size={10} color="#fff" />
                                <Text style={styles.groupBadgeText}>{items.length}</Text>
                            </View>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.itemName}>{items.length} {t('items_found')}</Text>
                            <Text style={styles.itemMetaText} numberOfLines={1}>
                                {items.map(i => i.itemName).join(', ')}
                            </Text>
                            <Text style={styles.dateText}>
                                {new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        <View style={styles.cardActions}>
                            {historyLocked ? (
                                <Ionicons name="lock-closed" size={18} color="#94A3B8" />
                            ) : (
                                <Ionicons
                                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                                    size={18}
                                    color="#94A3B8"
                                />
                            )}
                        </View>
                    </TouchableOpacity>
                </FeatureGate>

                {isExpanded && !historyLocked && (
                    <View style={styles.expandedContent}>
                        <FeatureGate feature="multi_product_scan" featureLabel="Multi-Product Report">
                            <TouchableOpacity
                                style={styles.reportBtn}
                                onPress={() => onSelectGroup(items)}
                            >
                                <Ionicons name="eye-outline" size={16} color="#d35457" />
                                <Text style={styles.reportBtnText}>{t('view_report')}</Text>
                            </TouchableOpacity>
                        </FeatureGate>
                        {items.map((subItem, idx) => renderSingleItem(subItem, true, idx))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{t('history_title')}</Text>
                    <Text style={styles.subtitle}>{history.length} {t('scans_count')}</Text>
                </View>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search history..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#d35457" />
                    <Text style={styles.loadingText}>{t('loading_history') || "Loading history..."}</Text>
                </View>
            ) : filteredHistory.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="search" size={64} color="#E2E8F0" />
                    <Text style={styles.emptyTitle}>
                        {searchQuery ? (t('no_results') || "No results found") : (t('no_history') || "No history yet")}
                    </Text>
                    <Text style={styles.emptyText}>
                        {searchQuery ? (t('no_results_desc') || "Try searching for something else") : (t('no_history_desc') || "Your scan history will appear here")}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={paginatedGroups}
                    keyExtractor={item => item.timestamp.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={hasMore ? (
                        <TouchableOpacity
                            onPress={() => setVisibleCount(prev => prev + 10)}
                            style={styles.loadMoreBtn}
                        >
                            <Ionicons name="chevron-down" size={18} color="#64748B" />
                            <Text style={styles.loadMoreText}>{t('load_more') || "LOAD MORE"}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ height: 40 }} />
                    )}
                />
            )}

            <UpgradeDialog
                open={upgradeOpen}
                onOpenChange={setUpgradeOpen}
                currentPlan={plan}
                featureLabel="Unlimited History"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 15,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        marginHorizontal: 20,
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#1E293B',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    itemMetaText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 8,
        marginRight: 4,
    },
    groupContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    groupImageStack: {
        position: 'relative',
    },
    groupBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#000',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        borderWidth: 2,
        borderColor: '#fff',
    },
    groupBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    expandedContent: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    reportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(211, 84, 87, 0.2)',
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 8,
    },
    reportBtnText: {
        color: '#d35457',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    subCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 14,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    subImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
    },
    subContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    subItemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    subMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    subMetaText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    subActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    subDeleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    itemWrapper: {
        marginBottom: 12,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lockedCard: {
        opacity: 0.6,
    },
    lockedGroup: {
        opacity: 0.6,
    },
    closeBtn: {
        padding: 8,
    },
    loadMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    loadMoreText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 1,
    }
});

export default HistoryList;
