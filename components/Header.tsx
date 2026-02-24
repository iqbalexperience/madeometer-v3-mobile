import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageCode } from '../utils/translations';

export const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
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
    const { language, setLanguage, t } = useLanguage();

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
    const safeModel = activeModel || 'madeometer-instant';

    const canUseModel = (modelId: string) => {
        if (isAdmin) return true;
        const plan = subscription?.plan || 'free';
        // Basic gating: standard (instant) is for everyone, others for Plus/Personal
        if (modelId === 'madeometer-instant') return true;
        if (modelId === 'madeometer-superfast' || modelId === 'gemini-3-flash-preview') {
            return plan === 'plus' || plan === 'personal';
        }
        return true;
    };

    const getBadgeStyles = () => {
        if (isAdmin) return { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)' };
        if (!subscription) return { backgroundColor: 'rgba(107, 114, 128, 0.2)', color: '#9CA3AF', borderColor: 'rgba(255, 255, 255, 0.1)' };

        switch (subscription.plan) {
            case 'plus':
                return { backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#22D3EE', borderColor: 'rgba(6, 182, 212, 0.3)' };
            case 'personal':
                return { backgroundColor: 'rgba(79, 70, 229, 0.2)', color: '#818CF8', borderColor: 'rgba(79, 70, 229, 0.3)' };
            default:
                return { backgroundColor: 'rgba(211, 84, 87, 0.2)', color: '#d35457', borderColor: 'rgba(211, 84, 87, 0.2)' };
        }
    };

    const getPlanLabel = () => {
        if (isAdmin) return t('super_admin');
        if (!subscription) return t('free_member');
        return t(`${subscription.plan}_member`);
    };

    const badgeStyle = getBadgeStyles();

    return (
        <View style={styles.container}>
            <View style={styles.headerInner}>
                {/* Logo & Plan */}
                <TouchableOpacity onPress={onHome} style={styles.headerLeft}>
                    <Image
                        source={require('../assets/images/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View>
                        <Text style={styles.appName}>Made O&apos;Meter</Text>
                        {(isAdmin || subscription) && (
                            <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor, borderColor: badgeStyle.borderColor }]}>
                                <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{getPlanLabel()}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Right Actions */}
                <View style={styles.headerRight}>
                    {/* Model Selector */}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setIsModelOpen(true)}
                    >
                        {safeModel === 'madeometer-instant' ? (
                            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#22D3EE" />
                        ) : safeModel === 'madeometer-superfast' ? (
                            <MaterialCommunityIcons name="rocket-launch" size={16} color="#F87171" />
                        ) : (
                            <Ionicons name="flash" size={16} color="#FBBF24" />
                        )}
                        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>

                    {/* Language Selector */}
                    <TouchableOpacity
                        onPress={() => setIsLangOpen(true)}
                        style={styles.langBtn}
                    >
                        <Text style={styles.flagText}>{currentLang.flag}</Text>
                        <Ionicons name="chevron-down" size={10} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Model Modal */}
            <Modal
                visible={isModelOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModelOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsModelOpen(false)}
                >
                    <View style={styles.dropdownContent}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>SELECT AI MODEL</Text>
                        </View>
                        <View style={styles.dropdownList}>
                            {[
                                { id: 'madeometer-instant', label: t('mode_instant'), icon: 'lightning-bolt', color: '#22D3EE', desc: 'Under 3 sec • Grounded' },
                                { id: 'madeometer-superfast', label: t('mode_superfast'), icon: 'rocket-launch', color: '#F87171', desc: 'Minimal Thinking • Max Speed' },
                                { id: 'gemini-3-flash-preview', label: t('mode_flash'), icon: 'flash', color: '#FBBF24', desc: 'Standard • Balanced' },
                            ].map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => {
                                        if (!canUseModel(m.id)) {
                                            Alert.alert("Upgrade Required", `The ${m.label} model is only available for Plus members.`);
                                            return;
                                        }
                                        onModelChange(m.id);
                                        setIsModelOpen(false);
                                    }}
                                    disabled={!canUseModel(m.id) && m.id !== safeModel}
                                    style={[
                                        styles.modelItem,
                                        safeModel === m.id && styles.modelItemActive,
                                        !canUseModel(m.id) && { opacity: 0.5 }
                                    ]}
                                >
                                    <View style={[styles.modelIconContainer, safeModel === m.id && { backgroundColor: m.color + '20' }]}>
                                        {m.icon === 'flash' ? (
                                            <Ionicons name="flash" size={18} color={safeModel === m.id ? m.color : '#94A3B8'} />
                                        ) : (
                                            <MaterialCommunityIcons name={m.icon as any} size={18} color={safeModel === m.id ? m.color : '#94A3B8'} />
                                        )}
                                    </View>
                                    <View style={styles.modelTextContainer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[styles.modelLabel, safeModel === m.id && { color: m.color }]}>{m.label}</Text>
                                            {!canUseModel(m.id) && (
                                                <View style={styles.lockBadge}>
                                                    <Ionicons name="lock-closed" size={10} color="#F59E0B" />
                                                    <Text style={styles.lockBadgeText}>PLUS</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.modelDesc}>{m.desc}</Text>
                                    </View>
                                    {safeModel === m.id && <Ionicons name="checkmark" size={18} color={m.color} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Language Modal */}
            <Modal
                visible={isLangOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsLangOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsLangOpen(false)}
                >
                    <View style={[styles.dropdownContent, { width: 200 }]}>
                        <ScrollView style={styles.langScroll} showsVerticalScrollIndicator={false}>
                            {LANGUAGES.map((l) => (
                                <TouchableOpacity
                                    key={l.code}
                                    style={[styles.langItem, language === l.code && styles.langItemActive]}
                                    onPress={() => {
                                        setLanguage(l.code);
                                        setIsLangOpen(false);
                                    }}
                                >
                                    <Text style={styles.langFlag}>{l.flag}</Text>
                                    <Text style={[styles.langLabel, language === l.code && styles.langLabelActive]}>{l.label}</Text>
                                    {language === l.code && <Ionicons name="checkmark" size={16} color="#d35457" style={styles.langCheck} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingTop: Platform.OS === 'ios' ? 0 : 8,
    },
    headerInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 8,
    },
    appName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    badge: {
        alignSelf: 'flex-start',
        marginTop: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    langBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        height: 36,
        borderRadius: 18,
    },
    flagText: {
        fontSize: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownContent: {
        width: 280,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    dropdownHeader: {
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    dropdownList: {
        padding: 8,
        gap: 4,
    },
    modelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    modelItemActive: {
        backgroundColor: '#F9FAFB',
    },
    modelIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modelTextContainer: {
        flex: 1,
    },
    modelLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    modelDesc: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 1,
    },
    langScroll: {
        maxHeight: 400,
    },
    langItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    langItemActive: {
        backgroundColor: '#F9FAFB',
    },
    langFlag: {
        fontSize: 18,
    },
    langLabel: {
        fontSize: 14,
        color: '#4B5563',
    },
    langLabelActive: {
        fontWeight: '700',
        color: '#111827',
    },
    langCheck: {
        marginLeft: 'auto',
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    lockBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#B45309',
    }
});

export default Header;
