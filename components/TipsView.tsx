import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, BookOpen, ChevronRight, Clock, Eye, Lightbulb, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useCommunityData } from '../contexts/CommunityDataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTipById } from '../lib/api';

const { width } = Dimensions.get('window');

export default function TipsView() {
    const { t } = useLanguage();
    const { tips, isTipsLoading: isLoading, refreshTips, totalTips, selectedTip, setSelectedTip, hasInitializedTips } = useCommunityData();
    const [isFetchingSelected, setIsFetchingSelected] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortOption, setSortOption] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const isFirstRender = React.useRef(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        // Skip first render if we already have tips
        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (tips.length > 0) return;
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
        refreshTips(debouncedSearch, sortField, sortOrder, currentPage, pageSize, isMore);
    }, [debouncedSearch, sortOption, currentPage, refreshTips]);

    const handleTipClick = async (tip: any) => {
        setIsFetchingSelected(true);
        try {
            const data = await getTipById(tip.id);
            setSelectedTip(data);
        } catch (e) {
            console.error("Failed to fetch tip details", e);
            setSelectedTip(tip);
        } finally {
            setIsFetchingSelected(false);
        }
    };

    if (selectedTip) {
        return (
            <View style={styles.detailContainer}>
                <TouchableOpacity
                    onPress={() => setSelectedTip(null)}
                    style={styles.backBtn}
                >
                    <ArrowLeft size={16} color="#64748B" />
                    <Text style={styles.backBtnText}>{t('back_to_kb')}</Text>
                </TouchableOpacity>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.tipHeader}>
                        <View style={styles.typeTagContainer}>
                            <Text style={styles.typeTag}>{selectedTip.type || t('knowledge_base')}</Text>
                            <View style={styles.dot} />
                            <Text style={styles.expertInsights}>{t('expert_insights')}</Text>
                        </View>
                        <Text style={styles.detailTitle}>{selectedTip.title}</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Clock size={12} color="#94A3B8" />
                                <Text style={styles.metaText}>
                                    {formatDistanceToNow(new Date(selectedTip.createdAt), { addSuffix: true })}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Eye size={12} color="#94A3B8" />
                                <Text style={styles.metaText}>
                                    {selectedTip.views} {t('views')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.markdownContainer}>
                        {/* @ts-ignore */}
                        <Markdown style={markdownStyles} >
                            {selectedTip.content || ''}
                        </Markdown>
                    </View>

                    <View style={styles.footerCard}>
                        <View style={styles.footerIconBox}>
                            <BookOpen size={20} color="#d35457" />
                        </View>
                        <Text style={styles.footerTitle}>{t('apply_strategy')}</Text>
                        <Text style={styles.footerSubtitle}>{t('exclusive_strategies')}</Text>
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.listHeader}>
                <View style={styles.titleRow}>
                    <View style={styles.lightbulbContainer}>
                        <Lightbulb size={20} color="#EAB308" />
                    </View>
                    <Text style={styles.listTitle}>{t('knowledge_base')}</Text>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Search size={16} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('search_strategies')}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                        />
                        {searchTerm !== "" && (
                            <TouchableOpacity onPress={() => setSearchTerm('')}>
                                <X size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.sortRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
                        {[
                            { id: 'newest', label: t('newest_first') },
                            { id: 'popular', label: t('most_viewed') },
                            { id: 'alpha', label: t('alphabetical') }
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.sortBtn, sortOption === opt.id && styles.sortBtnActive]}
                                onPress={() => setSortOption(opt.id)}
                            >
                                <Text style={[styles.sortBtnText, sortOption === opt.id && styles.sortBtnTextActive]}>
                                    {opt.label.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {isLoading && currentPage === 1 ? (
                <View style={styles.centering}>
                    <ActivityIndicator size="large" color="#d35457" />
                </View>
            ) : tips.length > 0 ? (
                <View style={styles.tipsList}>
                    {tips.map((tip, i) => (
                        <TouchableOpacity
                            key={tip.id + i}
                            style={styles.tipCard}
                            onPress={() => handleTipClick(tip)}
                        >
                            <View style={styles.floatingTag}>
                                <Text style={styles.floatingTagText}>{tip.type || t('knowledge_base')}</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{tip.title}</Text>
                                    <View style={styles.cardMeta}>
                                        <View style={styles.metaItem}>
                                            <Clock size={12} color="#94A3B8" />
                                            <Text style={styles.metaText}>{formatDistanceToNow(new Date(tip.createdAt))} {t('ago')}</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Eye size={12} color="#94A3B8" />
                                            <Text style={styles.metaText}>{tip.views} {t('views')}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.chevronBox}>
                                    <ChevronRight size={16} color="#d35457" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {totalTips > tips.length && (
                        <TouchableOpacity
                            style={styles.loadMoreBtn}
                            onPress={() => setCurrentPage(prev => prev + 1)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#d35457" />
                            ) : (
                                <Text style={styles.loadMoreText}>{t('load_more').toUpperCase()}</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                        <Search size={32} color="#CBD5E1" />
                    </View>
                    <Text style={styles.emptyTitle}>{t('no_matches_found')}</Text>
                    <Text style={styles.emptySubtitle}>
                        {t('no_tips_matching').replace('{search}', debouncedSearch)}
                    </Text>
                </View>
            )}

            {isFetchingSelected && (
                <View style={styles.fullOverlay}>
                    <ActivityIndicator size="large" color="#d35457" />
                </View>
            )}
            <View style={{ height: 100 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    detailContainer: {
        flex: 1,
        paddingTop: 10,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 20,
        gap: 8,
    },
    backBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    tipHeader: {
        marginBottom: 24,
    },
    typeTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    typeTag: {
        fontSize: 9,
        fontWeight: '900',
        color: '#d35457',
        backgroundColor: 'rgba(99, 91, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        textTransform: 'uppercase',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#CBD5E1',
    },
    expertInsights: {
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    detailTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 32,
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    markdownContainer: {
        paddingVertical: 10,
    },
    footerCard: {
        marginTop: 32,
        padding: 24,
        backgroundColor: 'rgba(99, 91, 255, 0.05)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(99, 91, 255, 0.1)',
        alignItems: 'center',
    },
    footerIconBox: {
        width: 44,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#d35457',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    footerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    footerSubtitle: {
        fontSize: 11,
        color: '#64748B',
        textAlign: 'center',
    },
    listHeader: {
        marginBottom: 24,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    lightbulbContainer: {
        width: 40,
        height: 40,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    listTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    searchRow: {
        marginBottom: 12,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    sortRow: {
        marginTop: 4,
    },
    sortScroll: {
        gap: 8,
    },
    sortBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    sortBtnActive: {
        backgroundColor: '#0F172A',
    },
    sortBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
    },
    sortBtnTextActive: {
        color: '#fff',
    },
    tipsList: {
        gap: 20,
    },
    tipCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        paddingTop: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    floatingTag: {
        position: 'absolute',
        top: -12,
        left: 20,
        backgroundColor: '#d35457',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#d35457',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    floatingTagText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#fff',
        textTransform: 'uppercase',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 20,
        marginBottom: 8,
    },
    cardMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    chevronBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    loadMoreBtn: {
        paddingVertical: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    loadMoreText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#d35457',
    },
    centering: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
    },
    emptyIconBox: {
        width: 64,
        height: 64,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    fullOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
});

const markdownStyles = {
    body: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 24,
    },
    heading1: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 20,
        marginBottom: 10,
    },
    heading2: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        marginBottom: 16,
    },
    strong: {
        fontWeight: '700',
        color: '#0F172A',
    },
    bullet_list: {
        marginBottom: 16,
    },
    list_item: {
        marginBottom: 8,
    },
};
