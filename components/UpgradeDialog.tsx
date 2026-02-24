import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { authClient } from '../lib/auth-client';
import { PlanName, PLANS } from '../lib/features';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UpgradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlan: PlanName;
    featureLabel?: string;
}

const BENEFIT_ICONS: Record<string, any> = {
    upgrade_benefit_ai_title: 'flash-outline',
    upgrade_benefit_multi_title: 'layers-outline',
    upgrade_benefit_history_title: 'time-outline',
    upgrade_benefit_rules_title: 'options-outline',
    upgrade_benefit_settings_title: 'settings-outline',
};

const PLUS_BENEFITS = [
    { titleKey: "upgrade_benefit_ai_title", subKey: "upgrade_benefit_ai_sub" },
    { titleKey: "upgrade_benefit_multi_title", subKey: "upgrade_benefit_multi_sub" },
    { titleKey: "upgrade_benefit_history_title", subKey: "upgrade_benefit_history_sub" },
    { titleKey: "upgrade_benefit_rules_title", subKey: "upgrade_benefit_rules_sub" },
    { titleKey: "upgrade_benefit_settings_title", subKey: "upgrade_benefit_settings_sub" },
] as const;

export function UpgradeDialog({
    open,
    onOpenChange,
    currentPlan,
    featureLabel,
}: UpgradeDialogProps) {
    const { t } = useLanguage();
    const { data: session } = authClient.useSession();
    const [isAnnual, setIsAnnual] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (!open) return null;

    const isAnonymous = !session?.user || session.user.isAnonymous;
    const isAlreadyPlus = currentPlan === "plus";
    const close = () => onOpenChange(false);

    const handleUpgrade = async () => {
        if (isAnonymous) {
            // In a real app, you'd navigate to Auth or open AuthModal
            // For now, let's just close and maybe the caller handles it
            close();
            return;
        }

        setIsLoading(true);
        try {
            // Mobile upgrade usually goes through IAP or a web-checkout session
            const { data, error } = await authClient.subscription.upgrade({
                plan: "plus",
                annual: isAnnual,
                successUrl: 'madeometer://upgrade-success',
                cancelUrl: 'madeometer://upgrade-cancel',
            });

            if (error) {
                console.error(error);
            } else if (data?.url) {
                Linking.openURL(data.url);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={close}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
                <View style={styles.sheet}>
                    <View style={styles.dragHandle} />

                    <TouchableOpacity style={styles.closeBtn} onPress={close}>
                        <Ionicons name="close" size={20} color="#64748B" />
                    </TouchableOpacity>

                    <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.header}>
                            <View style={styles.rocketIcon}>
                                <Ionicons name="rocket" size={32} color="#fff" />
                            </View>
                            <Text style={styles.title}>
                                {isAlreadyPlus
                                    ? t('upgrade_current_plus_title')
                                    : featureLabel
                                        ? t('upgrade_unlock_feature').replace('{feature}', featureLabel)
                                        : t('upgrade_title')}
                            </Text>
                            <Text style={styles.desc}>
                                {isAlreadyPlus
                                    ? t('upgrade_current_plus_desc')
                                    : t('upgrade_plus_desc')}
                            </Text>
                        </View>

                        {!isAlreadyPlus && (
                            <View style={styles.benefitsSection}>
                                <Text style={styles.sectionLabel}>{t('upgrade_unlock_header')}</Text>
                                {PLUS_BENEFITS.map(({ titleKey, subKey }) => (
                                    <View key={titleKey} style={styles.benefitRow}>
                                        <View style={styles.benefitIconBg}>
                                            <Ionicons name={BENEFIT_ICONS[titleKey]} size={18} color="#fff" />
                                        </View>
                                        <View style={styles.benefitText}>
                                            <Text style={styles.benefitTitle}>{t(titleKey)}</Text>
                                            <Text style={styles.benefitSub}>{t(subKey)}</Text>
                                        </View>
                                        <View style={styles.checkCircle}>
                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {!isAlreadyPlus && (
                            <View style={styles.billingCard}>
                                <View>
                                    <Text style={styles.sectionLabel}>{t('billing_cycle')}</Text>
                                    <View style={styles.priceRow}>
                                        <Text style={[styles.priceText, !isAnnual && styles.priceActive]}>$4.99/mo</Text>
                                        <Text style={styles.dot}>·</Text>
                                        <View style={styles.annualPriceRow}>
                                            <Text style={[styles.priceText, isAnnual && styles.priceActive]}>$47.90/yr</Text>
                                            <View style={styles.saveBadge}>
                                                <Text style={styles.saveBadgeText}>{t('save_20')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.toggle, isAnnual && styles.toggleActive]}
                                    onPress={() => setIsAnnual(!isAnnual)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.toggleThumb, isAnnual && styles.toggleThumbActive]} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.planBadge}>
                            <View>
                                <Text style={styles.sectionLabel}>{t('current_plan')}</Text>
                                <Text style={styles.planTitle}>{PLANS[currentPlan]?.title || 'Free'}</Text>
                            </View>
                            {!isAlreadyPlus && (
                                <View style={styles.upgradeIndicator}>
                                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                                    <Text style={styles.upgradeIndicatorText}>{PLANS.plus.title}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.actions}>
                            {isAlreadyPlus ? (
                                <TouchableOpacity style={styles.primaryBtn} onPress={close}>
                                    <Text style={styles.primaryBtnText}>{t('got_it')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.primaryBtn}
                                        onPress={handleUpgrade}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.primaryBtnText}>
                                            {isLoading ? t('processing') : t('upgrade_btn_total').replace('{price}', isAnnual ? "$47.90/yr" : "$4.99/mo")}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
                                        <Text style={styles.secondaryBtnText}>{t('maybe_later')}</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.9,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    scrollBody: {
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    rocketIcon: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
    },
    desc: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
    benefitsSection: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 8,
    },
    benefitIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    benefitText: {
        flex: 1,
        marginLeft: 12,
    },
    benefitTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    benefitSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    billingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    priceText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
    },
    priceActive: {
        color: '#0F172A',
    },
    dot: {
        marginHorizontal: 8,
        color: '#CBD5E1',
    },
    annualPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    saveBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    saveBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#15803D',
    },
    toggle: {
        width: 52,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#0F172A',
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    toggleThumbActive: {
        transform: [{ translateX: 24 }],
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 24,
    },
    planTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 2,
    },
    upgradeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0F172A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    upgradeIndicatorText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
    },
    actions: {
        gap: 12,
    },
    primaryBtn: {
        backgroundColor: '#0F172A',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    primaryBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    secondaryBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
});
