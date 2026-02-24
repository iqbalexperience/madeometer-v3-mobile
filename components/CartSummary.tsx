import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Preference, ScanResult } from '../types';
import { UpgradeDialog } from './UpgradeDialog';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CartSummaryProps {
    results: ScanResult[];
    onSelectResult: (result: ScanResult) => void;
    onBack: () => void;
    activePreferences?: Preference[];
}

type FilterType = 'ALL' | 'AVOID' | 'RECOMMENDED' | 'NEUTRAL';

const CartSummary: React.FC<CartSummaryProps> = ({
    results,
    onSelectResult,
    onBack,
    activePreferences = []
}) => {
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
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

    const renderDot = (item: ScanResult, index: number) => {
        if (!item.box_2d) return null;

        const isManual = item.verdictReason?.includes("Personal");
        if (!hasActiveCriteria && !isManual) return null;

        const dotLocked = !isWithinLimit('multi_product_scan_limit', index);
        const top = ((item.box_2d[0] + item.box_2d[2]) / 2 / 1000) * 100;
        const left = ((item.box_2d[1] + item.box_2d[3]) / 2 / 1000) * 100;

        let dotColor = dotLocked ? "#CBD5E1" : "#94A3B8";
        if (!dotLocked && item.verdict === 'AVOID') dotColor = "#EF4444";
        if (!dotLocked && item.verdict === 'RECOMMENDED') dotColor = "#10B981";

        return (
            <TouchableOpacity
                key={`dot-${item.id}`}
                style={[
                    styles.dotWrapper,
                    { top: `${top}%`, left: `${left}%` }
                ]}
                onPress={() => {
                    if (dotLocked) { setUpgradeOpen(true); return; }
                    onSelectResult(item);
                }}
            >
                <View style={[styles.dot, { backgroundColor: dotColor, borderColor: '#fff' }]} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{t('multi_result')}</Text>
                    <View style={styles.criteriaRow}>
                        <Ionicons name="options-outline" size={12} color="#d35457" />
                        <Text style={styles.criteriaText} numberOfLines={1}>{criteriaHeader}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#64748B" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {imageSource && (
                    <View style={styles.imageCard}>
                        <View style={styles.imageWrapper}>
                            <Image
                                source={{ uri: imageSource }}
                                style={styles.mainImage}
                                resizeMode="contain"
                            />
                            <View style={styles.dotsOverlay}>
                                {results.map((item, idx) => renderDot(item, idx))}
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.filterTabs}>
                    <TouchableOpacity
                        onPress={() => setActiveFilter('ALL')}
                        style={[styles.tab, activeFilter === 'ALL' && styles.tabActive]}
                    >
                        <Text style={[styles.tabText, activeFilter === 'ALL' && styles.tabTextActive]}>
                            {stats.total} {t('identified')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => canSeeSafe ? setActiveFilter('RECOMMENDED') : openUpgradeDialog("Safe Filtering")}
                        style={[styles.tab, activeFilter === 'RECOMMENDED' && styles.tabActiveSafe]}
                    >
                        {!canSeeSafe && <Ionicons name="lock-closed" size={12} color="#94A3B8" style={{ marginRight: 4 }} />}
                        <Text style={[styles.tabText, activeFilter === 'RECOMMENDED' && styles.tabTextActiveSafe]}>
                            {stats.recommended} {t('safe')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => canSeeAvoid ? setActiveFilter('AVOID') : openUpgradeDialog("Avoid Filtering")}
                        style={[styles.tab, activeFilter === 'AVOID' && styles.tabActiveAvoid]}
                    >
                        {!canSeeAvoid && <Ionicons name="lock-closed" size={12} color="#94A3B8" style={{ marginRight: 4 }} />}
                        <Text style={[styles.tabText, activeFilter === 'AVOID' && styles.tabTextActiveAvoid]}>
                            {stats.avoid} {t('avoid')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {filteredResults.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="filter-outline" size={32} color="#CBD5E1" />
                        <Text style={styles.emptyText}>{t('no_items')}</Text>
                        <TouchableOpacity onPress={() => setActiveFilter('ALL')}>
                            <Text style={styles.viewAllBtn}>{t('view_all')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.resultsList}>
                        {filteredResults.map((item, idx) => {
                            const locked = !isWithinLimit('multi_product_scan_limit', idx);

                            let containerStyle: any[] = [styles.itemCard];
                            let statusColor = '#1E293B';
                            let iconBg = '#F1F5F9';
                            let iconColor = '#64748B';

                            if (item.verdict === 'RECOMMENDED') {
                                containerStyle.push(styles.itemCardSafe);
                                statusColor = '#065F46';
                                iconBg = '#D1FAE5';
                                iconColor = '#059669';
                            } else if (item.verdict === 'AVOID') {
                                containerStyle.push(styles.itemCardAvoid);
                                statusColor = '#d35457';
                                iconBg = '#FEE2E2';
                                // iconColor = '#d35457';
                            }

                            const hasSpecificMatches = item.matchedUserCriteria && item.matchedUserCriteria.length > 0;
                            const reasonText = hasSpecificMatches && item.verdict !== 'RECOMMENDED'
                                ? `${t('trigger_warning')} ${item.matchedUserCriteria.join(', ')}`
                                : item.ownerCompany;

                            return (
                                <View key={item.id} style={styles.itemWrapper}>
                                    <TouchableOpacity
                                        onPress={() => locked ? setUpgradeOpen(true) : onSelectResult(item)}
                                        style={[containerStyle, locked && styles.lockedItem]}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
                                            <Text style={styles.flagEmoji}>{item.ownerFlag}</Text>
                                        </View>

                                        <View style={styles.itemMain}>
                                            <Text style={[styles.itemName, { color: statusColor }]} numberOfLines={1}>{item.itemName}</Text>
                                            <Text style={[styles.itemReason, hasSpecificMatches && item.verdict !== 'RECOMMENDED' && { color: '#d35457' }]} numberOfLines={1}>
                                                {reasonText}
                                            </Text>
                                            <View style={styles.itemBadges}>
                                                <View style={styles.badge}>
                                                    <Text style={styles.badgeText}>{item.ownerCountry?.substring(0, 3).toUpperCase() || 'UNK'}</Text>
                                                </View>
                                                <View style={[styles.badge, styles.confidenceBadge]}>
                                                    <Ionicons name="shield-checkmark" size={10} color={item.confidenceScore && item.confidenceScore >= 80 ? '#10B981' : '#64748B'} />
                                                    <Text style={styles.badgeText}>{item.confidenceScore || 85}%</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                    </TouchableOpacity>

                                    {locked && (
                                        <TouchableOpacity
                                            style={styles.lockOverlay}
                                            onPress={() => setUpgradeOpen(true)}
                                            activeOpacity={1}
                                        >
                                            <Ionicons name="lock-closed" size={16} color="#64748B" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={styles.footerSpacing} />
            </ScrollView>

            <UpgradeDialog
                open={upgradeOpen}
                onOpenChange={setUpgradeOpen}
                currentPlan={plan}
                featureLabel="Multi-Product Scan"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    criteriaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    criteriaText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#d35457',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    imageCard: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    imageWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    dotsOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    dotWrapper: {
        position: 'absolute',
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateX: -16 }, { translateY: -16 }],
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 4,
        gap: 8,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    tabActive: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tabActiveSafe: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    tabActiveAvoid: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#0F172A',
    },
    tabTextActiveSafe: {
        color: '#059669',
    },
    tabTextActiveAvoid: {
        color: '#d35457',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
        marginHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#E2E8F0',
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 12,
    },
    viewAllBtn: {
        fontSize: 13,
        fontWeight: '800',
        color: '#d35457',
        marginTop: 8,
    },
    resultsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    itemWrapper: {
        position: 'relative',
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    itemCardSafe: {
        backgroundColor: '#F0FDF4',
        borderColor: '#DCFCE7',
    },
    itemCardAvoid: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    lockedItem: {
        opacity: 0.3,
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 20,
    },
    itemIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagEmoji: {
        fontSize: 24,
    },
    itemMain: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    itemReason: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 6,
    },
    itemBadges: {
        flexDirection: 'row',
        gap: 6,
    },
    badge: {
        backgroundColor: '#fff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
    },
    confidenceBadge: {
        backgroundColor: '#F8FAFC',
    },
    footerSpacing: {
        height: 100,
    }
});

export default CartSummary;
