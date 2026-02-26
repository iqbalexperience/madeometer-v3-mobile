import { addToBlacklist, addToWhitelist, checkListStatus, generateTranslations, removeFromBlacklist, removeFromWhitelist } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Image,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ScanResult } from '../types';
import { FeatureGate } from './FeatureGate';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScanResultCardProps {
    result: ScanResult;
    onBack: () => void;
    onEdit?: (result: ScanResult) => void;
    onDelete?: (id: string) => void;
    onFeedback?: (id: string) => void;
    onUpdate?: (updated: ScanResult) => void;
    onReanalyze?: (id: string, model: string) => void;
    onFindAlternatives?: (id: string, refresh?: boolean) => void;
    onFindShoppingOptions?: (id: string, refresh?: boolean) => void;
    isFindingAlternatives?: boolean;
    isFindingShoppingOptions?: boolean;
    isAdmin?: boolean;
    showUsaMeter?: boolean;
    showPoliticalMeter?: boolean;
    showStatusBanner?: boolean;
    activeCriteriaCount?: number;
    isGuest?: boolean;
    onAuthRequest?: () => void;
}

// Simple translation mock for the component
const t = (key: string) => {
    const dict: any = {
        'owner_company': 'Owner Company',
        'made_in': 'Made In',
        'about': 'About',
        'reliability': 'Reliability & Sources',
        'confidence': 'Confidence',
        'verdict_safe': 'Safe',
        'verdict_avoid': 'Avoid',
        'verdict_neutral': 'Neutral',
        'overview': 'Overview',
        'alternatives': 'Alternatives',
        'where_to_buy': 'Where to Buy',
        'show_less': 'Show Less',
        'read_more': 'Read More',
        'verified_sources': 'Verified Sources',
        'key_evidence': 'Key Evidence',
        'potential_issues': 'Potential Issues',
        'political_neutral': 'Political Neutral',
        'usa_score': 'USA Ownership',
        'bipartisan': 'BIPARTISAN',
        'multiple_countries': 'Multiple countries',
        'no_retailers': 'No retailers found',
        'searching_alts': 'Searching for alternatives...',
        'verdict_whitelisted': 'Whitelisted',
        'verdict_blacklisted': 'Blacklisted',
    };
    return dict[key] || key;
};

const CountryFlag = ({ code, style }: { code?: string; style?: any }) => {
    if (!code || code.length !== 2) return <Text style={{ fontSize: 20 }}>🏳️</Text>;
    const lower = code.toLowerCase();
    return (
        <Image
            source={{ uri: `https://flagcdn.com/w80/${lower}.png` }}
            style={[styles.flag, style]}
            resizeMode="cover"
        />
    );
};

const ScanResultCard: React.FC<ScanResultCardProps> = ({
    result,
    onBack,
    onDelete,
    onUpdate,
    onReanalyze,
    onFindAlternatives,
    onFindShoppingOptions,
    isFindingAlternatives,
    isFindingShoppingOptions,
    isAdmin,
    showUsaMeter,
    showPoliticalMeter,
    showStatusBanner,
    activeCriteriaCount,
    onEdit,
    onFeedback,
    isGuest,
    onAuthRequest
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'alternatives' | 'buying'>('overview');
    const [showValidation, setShowValidation] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isBannerExpanded, setIsBannerExpanded] = useState(true);
    const { language } = useLanguage();
    const { plan } = useFeatureGate();
    const [isTranslating, setIsTranslating] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    // Whitelist/Blacklist State
    const [isWhitelistedItem, setIsWhitelistedItem] = useState(false);
    const [isBlacklistedItem, setIsBlacklistedItem] = useState(false);

    useEffect(() => {
        if (result.imageUrl) {
            Image.getSize(result.imageUrl, (width, height) => {
                if (width && height) {
                    setAspectRatio(width / height);
                }
            }, (error) => {
                console.error("Failed to get image size", error);
            });
        }
    }, [result.imageUrl]);

    // --- TRANSLATION LOGIC ---
    const displayData = useMemo(() => {
        const lang = language as string;
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
    }, [language, result.id, result.translations, isTranslating, onUpdate, result]);

    useEffect(() => {
        const checkLists = async () => {
            const { whitelisted, blacklisted } = await checkListStatus([result.ownerCompany, result.itemName]);
            setIsWhitelistedItem(whitelisted);
            setIsBlacklistedItem(blacklisted);
        };
        checkLists();
    }, [result.id, result.ownerCompany, result.itemName]);

    const handleAction = async (action: 'ALLOW' | 'BLOCK') => {
        if (isGuest && onAuthRequest) {
            onAuthRequest();
            return;
        }

        if (action === 'ALLOW') {
            await addToWhitelist(result.ownerCompany, 'BRAND');
            setIsWhitelistedItem(true);
            setIsBlacklistedItem(false);

            const updated = {
                ...result,
                verdict: 'RECOMMENDED' as const,
                verdictReason: (result.verdictReason || "").replace(/Blocked by Personal Blacklist\.?/, "") + " (Personal Whitelist)"
            };
            onUpdate?.(updated);
        } else {
            await addToBlacklist(result.ownerCompany, 'BRAND');
            setIsBlacklistedItem(true);
            setIsWhitelistedItem(false);

            const updated = {
                ...result,
                verdict: 'AVOID' as const,
                verdictReason: "Blocked by Personal Blacklist"
            };
            onUpdate?.(updated);
        }
    };

    const handleRevert = async () => {
        await removeFromWhitelist(result.ownerCompany);
        await removeFromBlacklist(result.ownerCompany);

        setIsWhitelistedItem(false);
        setIsBlacklistedItem(false);

        const hasCriteria = result.matchedUserCriteria && result.matchedUserCriteria.length > 0;
        const originalVerdict = hasCriteria ? 'AVOID' : 'NEUTRAL';

        let originalReason = result.verdictReason || "";
        originalReason = originalReason.replace(" (Personal Whitelist)", "").replace("Blocked by Personal Blacklist", "").trim();

        const updated = {
            ...result,
            verdict: originalVerdict as 'AVOID' | 'NEUTRAL' | 'RECOMMENDED',
            verdictReason: originalReason
        };

        onUpdate?.(updated);
    };

    const toggleDescription = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsDescriptionExpanded(!isDescriptionExpanded);
    };

    const toggleValidation = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowValidation(!showValidation);
    };

    const toggleBanner = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsBannerExpanded(!isBannerExpanded);
    };

    const effectiveVerdict = isWhitelistedItem ? 'RECOMMENDED' : (isBlacklistedItem ? 'AVOID' : (result.verdict || 'NEUTRAL'));

    const verdictConfigs = {
        RECOMMENDED: {
            color: '#059669',
            bgColor: '#F0FDF4',
            borderColor: '#DCFCE7',
            icon: (isWhitelistedItem ? 'heart' : 'checkmark-circle') as any,
            title: isWhitelistedItem ? t('verdict_whitelisted') : t('verdict_safe'),
        },
        AVOID: {
            color: '#d35457',
            bgColor: '#FFF5F5',
            borderColor: '#FFEAEA',
            icon: (isBlacklistedItem ? 'ban' : 'close-circle') as any,
            title: isBlacklistedItem ? t('verdict_blacklisted') : t('verdict_avoid'),
        },
        NEUTRAL: {
            color: '#4B5563',
            bgColor: '#F9FAFB',
            borderColor: '#F3F4F6',
            icon: 'help-circle' as any,
            title: t('verdict_neutral'),
        }
    };

    const vConfig = verdictConfigs[effectiveVerdict as keyof typeof verdictConfigs] || verdictConfigs.NEUTRAL;

    const getVerdictDescription = () => {
        if (isBlacklistedItem) return "Blocked by your Personal Blacklist rule.";
        if (isWhitelistedItem) return t('verdict_whitelisted');

        if (effectiveVerdict === 'AVOID') {
            if (displayData.matchedUserCriteria && displayData.matchedUserCriteria.length > 0) {
                const criteriaList = displayData.matchedUserCriteria.join(', ');
                return `${t('verdict_avoid_desc')}: "${criteriaList}"`;
            }
            return displayData.verdictReason || t('verdict_avoid_desc');
        }
        if (effectiveVerdict === 'RECOMMENDED') return t('verdict_safe_desc');
        return displayData.verdictReason || t('verdict_neutral_desc');
    };

    const isManualOverride = isWhitelistedItem || isBlacklistedItem;
    const shouldShowBanner = showStatusBanner && (activeCriteriaCount! > 0 || isManualOverride);
    // const shouldShowDot = activeCriteriaCount! > 0 || isManualOverride;

    const confidence = result.confidenceScore || 85;
    // const usaScore = result.usaOwnershipScore ?? (result.ownerCountry?.includes('USA') ? 100 : 0);

    const renderBoundingBoxDot = () => {
        if (!result.box_2d) return null;
        const [ymin, xmin, ymax, xmax] = result.box_2d;
        const top = ((ymin + ymax) / 2 / 1000) * 100;
        const left = ((xmin + xmax) / 2 / 1000) * 100;

        return (
            <View style={[styles.dotWrapper, { top: `${top}%`, left: `${left}%` }]}>
                <View style={[styles.dot, { backgroundColor: vConfig.color, borderColor: '#fff' }]} />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header - Refined to match image */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.itemName}>{result.itemName}</Text>
                    <View style={styles.brandRow}>
                        <CountryFlag code={result.ownerCountryCode} style={styles.headerFlag} />
                        <Text style={styles.brandName}>{result.ownerCompany}</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    {isAdmin && (
                        <TouchableOpacity style={styles.actionCircleBtn}>
                            <Ionicons name="sparkles" size={20} color="#6366F1" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionCircleBtn} onPress={() => onFeedback?.(result.id)}>
                        <Ionicons name="chatbubble-outline" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onBack} style={styles.actionCircleBtn}>
                        <Ionicons name="arrow-back" size={22} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Verdict Banner - Matching Image */}
                {shouldShowBanner && (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[styles.verdictBanner, { backgroundColor: vConfig.bgColor, borderColor: vConfig.borderColor }]}
                        onPress={toggleBanner}
                    >
                        <View style={styles.verdictHeader}>
                            <View style={[styles.verdictIconContainer, { backgroundColor: vConfig.borderColor }]}>
                                <Ionicons name={vConfig.icon} size={24} color={vConfig.color} />
                            </View>
                            <View style={styles.verdictTitleRow}>
                                <Text style={[styles.verdictTitle, { color: vConfig.color }]}>{vConfig.title}</Text>
                                {!isBannerExpanded && (
                                    <Text style={[styles.verdictSummaryText, { color: vConfig.color }]} numberOfLines={1}>
                                        {getVerdictDescription()}
                                    </Text>
                                )}
                            </View>
                            <Ionicons name={isBannerExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
                        </View>

                        {isBannerExpanded && (
                            <View style={styles.verdictMainContent}>
                                <Text style={[styles.verdictReasonText, { color: vConfig.color }]}>
                                    {getVerdictDescription()}
                                </Text>

                                <View style={styles.bannerActions}>
                                    {effectiveVerdict === 'AVOID' && !isWhitelistedItem && (
                                        <FeatureGate feature="whitelist" featureLabel="Whitelist">
                                            <TouchableOpacity
                                                style={[styles.bannerActionBtn, styles.whitelistBtn]}
                                                onPress={() => handleAction('ALLOW')}
                                            >
                                                <Ionicons name="checkmark-sharp" size={14} color="#059669" />
                                                <Text style={styles.whitelistBtnText}>Add to OK (Whitelist)</Text>
                                            </TouchableOpacity>
                                        </FeatureGate>
                                    )}

                                    {effectiveVerdict === 'RECOMMENDED' && !isBlacklistedItem && (
                                        <FeatureGate feature="blocklist" featureLabel="Blocklist">
                                            <TouchableOpacity
                                                style={[styles.bannerActionBtn, styles.blocklistBtn]}
                                                onPress={() => handleAction('BLOCK')}
                                            >
                                                <Ionicons name="ban" size={14} color="#d35457" />
                                                <Text style={styles.blocklistBtnText}>Block (Blocklist)</Text>
                                            </TouchableOpacity>
                                        </FeatureGate>
                                    )}

                                    {(isWhitelistedItem || isBlacklistedItem) && (
                                        <TouchableOpacity
                                            style={[styles.bannerActionBtn, styles.revertBtn]}
                                            onPress={handleRevert}
                                        >
                                            <Ionicons name="refresh-outline" size={14} color="#64748B" />
                                            <Text style={styles.revertBtnText}>Revert to AI Verdict</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {/* Product Image Container with Blur Detail and Dot */}
                <View style={styles.imageOuterContainer}>
                    <View style={styles.imageBlurBackground}>
                        <Image source={{ uri: result.imageUrl }} style={styles.blurBack} blurRadius={20} />
                        <View style={styles.blurOverlay} />
                    </View>
                    <View style={styles.mainImageContainer}>
                        <View style={[styles.imageWrapper, aspectRatio ? { aspectRatio } : null]}>
                            <Image source={{ uri: result.imageUrl }} style={styles.productImage} resizeMode="contain" />
                            {renderBoundingBoxDot()}
                        </View>
                    </View>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                            onPress={() => setActiveTab('overview')}
                        >
                            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>{t('overview')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'buying' && styles.activeTab]}
                            onPress={() => setActiveTab('buying')}
                        >
                            <Text style={[styles.tabText, activeTab === 'buying' && styles.activeTabText]}>{t('where_to_buy')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'alternatives' && styles.activeTab]}
                            onPress={() => setActiveTab('alternatives')}
                        >
                            <Text style={[styles.tabText, activeTab === 'alternatives' && styles.activeTabText]}>{t('alternatives')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'overview' && (
                    <View style={styles.overviewContainer}>
                        {/* Owner Company Card */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoCardHeader}>
                                <Text style={styles.infoCardLabel}>{t('owner_company')}</Text>
                                <View style={styles.infoCardActions}>
                                    <TouchableOpacity style={styles.smallActionBtn} onPress={() => onReanalyze?.(result.id, 'madeometer-flash')}><Ionicons name="refresh-outline" size={16} color="#94A3B8" /></TouchableOpacity>
                                    <TouchableOpacity style={styles.smallActionBtn}><Ionicons name="pencil" size={16} color="#94A3B8" /></TouchableOpacity>
                                    <TouchableOpacity style={styles.smallActionBtn} onPress={() => onDelete?.(result.id)}><Ionicons name="trash-outline" size={16} color="#94A3B8" /></TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.ownerContent}>
                                <CountryFlag code={result.ownerCountryCode} style={styles.largeFlag} />
                                <View style={styles.ownerTextCol}>
                                    <Text style={styles.ownerCountryText}>{result.ownerCountry}</Text>
                                    <View style={styles.ownerLinkRow}>
                                        <Text style={styles.ownerLinkText}>{result.ownerCompany}</Text>
                                        <Ionicons name="link-outline" size={12} color="#3B82F6" />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Middle row: Political & Made In */}
                        <View style={styles.rowGrid}>
                            {showPoliticalMeter && (
                                <View style={[styles.infoCard, { flex: 1 }]}>
                                    <View style={styles.politicalHeader}>
                                        <Ionicons name="scale-outline" size={14} color="#8B5CF6" />
                                        <Text style={styles.politicalLabel}>{t('bipartisan')}</Text>
                                    </View>
                                    <View style={styles.politicalBarContainer}>
                                        <View style={[styles.politicalGradient, { width: `${result.republicanScore || 50}%` }]} />
                                    </View>
                                </View>
                            )}
                            <View style={[styles.infoCard, { flex: 1 }]}>
                                <Text style={styles.infoCardLabel}>{t('made_in')}</Text>
                                <View style={styles.madeInRow}>
                                    <Ionicons name="globe-outline" size={16} color="#3B82F6" />
                                    <Text style={styles.madeInText}>{result.manufacturedIn || t('multiple_countries')}</Text>
                                </View>
                            </View>
                        </View>

                        {/* About Card */}
                        <View style={styles.infoCard}>
                            <Text style={styles.infoCardLabel}>{t('about')}</Text>
                            <Text style={styles.aboutText} numberOfLines={isDescriptionExpanded ? undefined : 3}>
                                {result.description || `${result.itemName} is the flagship product of ${result.ownerCompany}...`}
                            </Text>
                            <TouchableOpacity onPress={toggleDescription}>
                                <Text style={styles.readMoreText}>{isDescriptionExpanded ? t('show_less') : t('read_more')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Reliability & Sources Accordion */}
                        <TouchableOpacity style={styles.reliabilityAccordion} onPress={toggleValidation}>
                            <View style={styles.reliabilityHeader}>
                                <View style={styles.reliabilityIconBox}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                                </View>
                                <View style={styles.reliabilityTextCol}>
                                    <Text style={styles.reliabilityTitle}>{t('reliability')}</Text>
                                    <Text style={styles.reliabilityValue}>{confidence}% {t('confidence')}</Text>
                                </View>
                                <Ionicons name={showValidation ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
                            </View>

                            {showValidation && (
                                <View style={styles.reliabilityExpanded}>
                                    <View style={styles.evidenceSection}>
                                        <View style={styles.subHeaderSimple}>
                                            <Ionicons name="checkmark-sharp" size={14} color="#94A3B8" />
                                            <Text style={styles.subHeaderLabel}>{t('key_evidence')}</Text>
                                        </View>
                                        <View style={styles.evidenceList}>
                                            {result.keyEvidence?.map((ev, i) => (
                                                <View key={i} style={styles.evidenceItem}>
                                                    <View style={styles.greenDot} />
                                                    <Text style={styles.evidencePoint}>
                                                        {ev.point} <Text style={styles.evidenceConf}>({ev.confidence})</Text>
                                                    </Text>
                                                </View>
                                            )) || (
                                                    <View style={styles.evidenceItem}>
                                                        <View style={styles.greenDot} />
                                                        <Text style={styles.evidencePoint}>Ultimate parent is {result.ownerCompany}... <Text style={styles.evidenceConf}>(High)</Text></Text>
                                                    </View>
                                                )}
                                        </View>
                                    </View>

                                    <View style={styles.sourcesSection}>
                                        <View style={styles.subHeaderSimple}>
                                            <Ionicons name="globe-outline" size={14} color="#94A3B8" />
                                            <Text style={styles.subHeaderLabel}>{t('verified_sources')}</Text>
                                        </View>
                                        <View style={styles.sourcesBadges}>
                                            <View style={styles.sourceBadge}>
                                                <Text style={styles.sourceBadgeText}>[Own] {result.ownerCompany.toLowerCase().split(' ')[0]}...</Text>
                                                <Ionicons name="open-outline" size={10} color="#10B981" />
                                            </View>
                                        </View>
                                    </View>

                                    <Text style={styles.aiVerificationText}>AI generated analysis verified against search results.</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 'alternatives' && (
                    <View style={styles.tabContent}>
                        {result.alternatives?.length ? result.alternatives.map((alt, i) => (
                            <View key={i} style={styles.infoCard}>
                                <View style={styles.altHeader}>
                                    <View>
                                        <Text style={styles.altName}>{alt.name}</Text>
                                        <Text style={styles.altCountry}>{alt.ownerCountryCode || 'US'}</Text>
                                    </View>
                                    <CountryFlag code={alt.ownerCountryCode || 'US'} style={styles.altFlag} />
                                </View>
                                <Text style={styles.altReason}>{alt.reason}</Text>
                            </View>
                        )) : (
                            <View style={styles.emptyView}>
                                <Ionicons name="sparkles" size={40} color="#E2E8F0" />
                                <Text style={styles.emptyText}>{isFindingAlternatives ? t('searching_alts') : 'No alternatives found'}</Text>
                                {!isFindingAlternatives && (
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => onFindAlternatives?.(result.id)}>
                                        <Text style={styles.actionBtnText}>Find Alternatives</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'buying' && (
                    <View style={styles.tabContent}>
                        {result.shoppingOptions?.length ? result.shoppingOptions.map((opt, i) => (
                            <View key={i} style={styles.infoCard}>
                                <View style={styles.shoppingHeader}>
                                    <Text style={styles.retailerName}>{opt.retailer}</Text>
                                    <Text style={styles.optPrice}>{opt.price}</Text>
                                </View>
                                <TouchableOpacity style={styles.buyLink}>
                                    <Text style={styles.buyLinkText}>View at {opt.retailer}</Text>
                                    <Ionicons name="open-outline" size={14} color="#3B82F6" />
                                </TouchableOpacity>
                            </View>
                        )) : (
                            <View style={styles.emptyView}>
                                <Ionicons name="cart-outline" size={40} color="#E2E8F0" />
                                <Text style={styles.emptyText}>{isFindingShoppingOptions ? 'Searching for prices...' : t('no_retailers')}</Text>
                                {!isFindingShoppingOptions && (
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => onFindShoppingOptions?.(result.id)}>
                                        <Text style={styles.actionBtnText}>Find Prices</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 0 : 12,
        paddingBottom: 16,
    },
    headerTitleContainer: {
        flex: 1,
    },
    itemName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.5,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    headerFlag: {
        width: 18,
        height: 12,
        borderRadius: 2,
        marginRight: 6,
    },
    brandName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#636E81',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionCircleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    verdictBanner: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    verdictHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verdictIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    verdictTitleRow: {
        flex: 1,
    },
    verdictTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    verdictSummaryText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
        opacity: 0.8,
    },
    verdictMainContent: {
        marginTop: 12,
    },
    verdictReasonText: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    bannerActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    bannerActionBtn: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    whitelistBtn: {
        borderColor: '#DCFCE7',
        borderWidth: 1,
    },
    whitelistBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#059669',
    },
    blocklistBtn: {
        borderColor: '#FFEAEA',
        borderWidth: 1,
    },
    blocklistBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#d35457',
    },
    revertBtn: {
        borderColor: '#F1F5F9',
        borderWidth: 1,
    },
    revertBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
    },
    imageOuterContainer: {
        width: '100%',
        height: 320,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#F9FAFB',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    imageBlurBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    blurBack: {
        width: '100%',
        height: '100%',
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    mainImageContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    imageWrapper: {
        maxHeight: '100%',
        maxWidth: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    dotWrapper: {
        position: 'absolute',
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateX: -16 }, { translateY: -16 }],
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtn: {
        backgroundColor: '#d35457',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 12,
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    shoppingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    retailerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    optPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: '#059669',
    },
    buyLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    buyLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    tabContainer: {
        marginBottom: 20,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        padding: 5,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#636E81',
    },
    activeTabText: {
        color: '#111827',
    },
    overviewContainer: {
        gap: 12,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoCardLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#636E81',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoCardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    smallActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ownerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    largeFlag: {
        width: 50,
        height: 34,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    ownerTextCol: {
        flex: 1,
    },
    ownerCountryText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.5,
    },
    ownerLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    ownerLinkText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3B82F6',
    },
    rowGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    politicalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    politicalLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#8B5CF6',
    },
    politicalBarContainer: {
        height: 6,
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    politicalGradient: {
        width: '100%',
        height: '100%',
        backgroundColor: '#8B5CF6',
    },
    madeInRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    madeInText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    aboutText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
        fontWeight: '500',
        marginTop: 8,
    },
    readMoreText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#d35457',
        marginTop: 8,
    },
    reliabilityAccordion: {
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
        marginBottom: 12,
    },
    reliabilityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    reliabilityIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    reliabilityTextCol: {
        flex: 1,
    },
    reliabilityTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#636E81',
        textTransform: 'uppercase',
    },
    reliabilityValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    reliabilityExpanded: {
        padding: 18,
        paddingTop: 0,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    subHeaderSimple: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginVertical: 12,
    },
    subHeaderLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    evidenceList: {
        gap: 10,
    },
    evidenceItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    greenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginTop: 6,
    },
    evidencePoint: {
        flex: 1,
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
        fontWeight: '500',
    },
    evidenceConf: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    evidenceSection: {
        marginTop: 16,
        marginBottom: 8,
    },
    sourcesSection: {
        marginTop: 16,
        marginBottom: 8,
    },
    sourcesBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#D1FAE5',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    sourceBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
    },
    aiVerificationText: {
        fontSize: 11,
        color: '#94A3B8',
        fontStyle: 'italic',
        marginTop: 20,
        textAlign: 'center',
    },
    tabContent: {
        minHeight: 200,
    },
    altHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    altName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    altCountry: {
        fontSize: 11,
        fontWeight: '700',
        color: '#636E81',
    },
    altFlag: {
        width: 32,
        height: 22,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    altReason: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    emptyView: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },
    flag: {
        width: 24,
        height: 16,
    },
});

export default ScanResultCard;
