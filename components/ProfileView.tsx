import { getBlacklist, getWhitelist, removeFromBlacklist, removeFromWhitelist, saveFeedback } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    LayoutAnimation,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Preference, UserProfile } from '../types';
import { LanguageCode } from '../utils/translations';
import AppFeaturesModal from './AppFeaturesModal';
import { FeatureGate } from './FeatureGate';
import FeedbackModal from './FeedbackModal';
import LegalModal from './LegalModal';
// Removed redundant UpgradeDialog import

// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
// }

interface ProfileViewProps {
    user: UserProfile | null;
    preferences: Preference[];
    onToggle: (id: string) => void;
    onAdd: (label: string, description?: string) => void;
    onUpdate: (id: string, label: string, description?: string) => void;
    onDelete: (id: string) => void;
    onBack: () => void;
    onLogout: () => void;
    onAuthRequest: () => void;
    onFeedback?: () => void;
    subscription?: any;
}

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

const CURRENCIES = [
    { code: 'USD', label: '$ USD' },
    { code: 'EUR', label: '€ EUR' },
    { code: 'DKK', label: 'kr. DKK' },
    { code: 'SEK', label: 'kr SEK' },
    { code: 'NOK', label: 'kr NOK' },
    { code: 'GBP', label: '£ GBP' },
    { code: 'CAD', label: '$ CAD' },
    { code: 'AUD', label: '$ AUD' },
];

const COUNTRIES = [
    { name: "USA", flag: "🇺🇸" },
    { name: "UK", flag: "🇬🇧" },
    { name: "Denmark", flag: "🇩🇰" },
    { name: "Germany", flag: "🇩🇪" },
    { name: "France", flag: "🇫🇷" },
    { name: "Sweden", flag: "🇸🇪" },
    { name: "Norway", flag: "🇳🇴" },
    { name: "Spain", flag: "🇪🇸" },
    { name: "Italy", flag: "🇮🇹" },
    { name: "Netherlands", flag: "🇳🇱" },
    { name: "Portugal", flag: "🇵🇹" },
    { name: "Canada", flag: "🇨🇦" },
    { name: "Australia", flag: "🇦🇺" },
].sort((a, b) => a.name.localeCompare(b.name));

// const { width } = Dimensions.get('window');

const RULE_PREFIXES = [
    { value: 'Avoid', label: "Avoid", placeholder: 'USA-owned brands' },
    { value: 'Only', label: "Only", placeholder: 'Only EU based brands' },
    { value: 'Unselected', label: "Unselected", placeholder: 'Vegan or plastic free ' }
];

const ProfileView: React.FC<ProfileViewProps> = ({
    user,
    preferences,
    onToggle,
    onAdd,
    onUpdate,
    onDelete,
    onBack,
    onLogout,
    onAuthRequest,
    onFeedback,
    subscription
}) => {
    const { t, language, setLanguage, currency, setCurrency, shoppingCountry, setShoppingCountry } = useLanguage();
    const { isWithinLimit, plan, openUpgradeDialog } = useFeatureGate();
    const [activeTab, setActiveTab] = useState<'rules' | 'account'>('rules');
    const [searchTerm, setSearchTerm] = useState('');
    const [showEnabledOnly, setShowEnabledOnly] = useState(false);

    // Add State
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrefix, setNewPrefix] = useState('Avoid');

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrefix, setEditPrefix] = useState('Avoid');
    // Removed local upgradeOpen state
    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Pickers State
    const [pickerType, setPickerType] = useState<'language' | 'currency' | 'country' | null>(null);

    // Whitelist/Blacklist State
    const [whitelist, setWhitelist] = useState<any[]>([]);
    const [blacklist, setBlacklist] = useState<any[]>([]);
    const [isListsLoading, setIsListsLoading] = useState(false);

    const handleFeedbackSubmit = async (type: string, message: string, email: string) => {
        setIsSubmittingFeedback(true);
        try {
            await saveFeedback({
                email,
                text: message,
                source: `MOBILE_PROFILE_${type}`,
            });
            Alert.alert("Success", "Thank you for your feedback!");
            setIsFeedbackOpen(false);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to send feedback. Please try again.");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await onLogout();
        } catch (err) {
            setIsLoggingOut(false);
            Alert.alert("Error", "Logout failed. Please try again.");
        }
    };

    const handleManageSubscription = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await authClient.subscription.billingPortal({
                returnUrl: 'madeometer://billing',
            });

            if (error) {
                Alert.alert("Error", error.message || "Failed to create portal session");
            } else if (data?.url) {
                Linking.openURL(data.url);
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLists = async () => {
        setIsListsLoading(true);
        try {
            const wl = await getWhitelist();
            const bl = await getBlacklist();
            setWhitelist(wl || []);
            setBlacklist(bl || []);
        } catch (err) {
            console.error("Failed to fetch lists", err);
        } finally {
            setIsListsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'account' && !user?.isGuest) {
            fetchLists();
        }
    }, [activeTab, user]);

    const handleRemoveFromWhitelist = async (name: string) => {
        try {
            await removeFromWhitelist(name);
            fetchLists();
        } catch (err) {
            Alert.alert("Error", "Failed to remove brand from whitelist.");
        }
    };

    const handleRemoveFromBlacklist = async (name: string) => {
        try {
            await removeFromBlacklist(name);
            fetchLists();
        } catch (err) {
            Alert.alert("Error", "Failed to remove brand from blocklist.");
        }
    };

    // const totalRulesCount = preferences.filter(p => p.category !== 'FEATURE').length;

    const filteredPrefs = preferences.filter(p => {
        if (p.category === 'FEATURE') return false;
        const matchesSearch = p.label.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEnabled = !showEnabledOnly || p.active;
        return matchesSearch && matchesEnabled;
    });

    const popularPrefs = filteredPrefs.filter(p => !p.isCustom);
    const customPrefs = filteredPrefs.filter(p => p.isCustom);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <Text style={styles.title}>{t('settings_title')}</Text>
                <TouchableOpacity onPress={onBack} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'rules' && styles.activeTab]}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setActiveTab('rules');
                    }}
                >
                    <Ionicons name="options-outline" size={18} color={activeTab === 'rules' ? '#000' : '#64748B'} />
                    <Text style={[styles.tabText, activeTab === 'rules' && styles.activeTabText]}>{t('scanner_rules')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'account' && styles.activeTab]}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setActiveTab('account');
                    }}
                >
                    <Ionicons name="person-outline" size={18} color={activeTab === 'account' ? '#000' : '#64748B'} />
                    <Text style={[styles.tabText, activeTab === 'account' && styles.activeTabText]}>{t('account')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const startEdit = (pref: Preference) => {
        if (!user || user.isGuest) return;
        setEditingId(pref.id);

        const label = pref.label;
        const matchingPrefix = RULE_PREFIXES.find(p => p.value !== 'Unselected' && label.startsWith(p.value + ' '));

        if (matchingPrefix) {
            setEditPrefix(matchingPrefix.value);
            setEditName(label.substring(matchingPrefix.value.length + 1));
        } else {
            setEditPrefix('Unselected');
            setEditName(label);
        }
    };

    const renderPicker = () => {
        if (!pickerType) return null;

        let title = '';
        let options: any[] = [];
        let currentValue = '';
        let onSelect = (val: any) => { };

        if (pickerType === 'language') {
            title = t('app_language');
            options = LANGUAGES;
            currentValue = language;
            onSelect = (val) => setLanguage(val);
        } else if (pickerType === 'currency') {
            title = t('currency');
            options = CURRENCIES;
            currentValue = currency;
            onSelect = (val) => setCurrency(val);
        } else if (pickerType === 'country') {
            title = t('shopping_location');
            options = COUNTRIES;
            currentValue = shoppingCountry;
            onSelect = (val) => setShoppingCountry(val);
        }

        return (
            <Modal visible={!!pickerType} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setPickerType(null)}
                >
                    <View style={styles.pickerContent}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>{title}</Text>
                            <TouchableOpacity onPress={() => setPickerType(null)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.code || opt.name}
                                    style={[styles.pickerItem, (opt.code === currentValue || opt.name === currentValue) && styles.pickerItemActive]}
                                    onPress={() => {
                                        onSelect(opt.code || opt.name);
                                        setPickerType(null);
                                    }}
                                >
                                    <Text style={styles.pickerItemFlag}>{opt.flag}</Text>
                                    <Text style={[styles.pickerItemText, (opt.code === currentValue || opt.name === currentValue) && styles.pickerItemTextActive]}>
                                        {opt.label || opt.name}
                                    </Text>
                                    {(opt.code === currentValue || opt.name === currentValue) && (
                                        <Ionicons name="checkmark" size={20} color="#d35457" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    const renderRuleItem = (pref: Preference) => {
        const isEditing = editingId === pref.id;

        if (isEditing) {
            return (
                <View key={pref.id} style={styles.editForm}>
                    <View style={styles.editHeader}>
                        <Ionicons name="create-outline" size={14} color="#d35457" />
                        <Text style={styles.editTitle}>{t('editing_rule')}</Text>
                    </View>
                    <View style={styles.prefixRow}>
                        <View style={styles.prefixPicker}>
                            {RULE_PREFIXES.map(p => (
                                <TouchableOpacity
                                    key={p.value}
                                    onPress={() => setEditPrefix(p.value)}
                                    style={[styles.prefixBtn, editPrefix === p.value && styles.prefixBtnActive]}
                                >
                                    <Text style={[styles.prefixBtnText, editPrefix === p.value && styles.prefixBtnTextActive]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <TextInput
                        style={styles.addInput}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder={RULE_PREFIXES.find(p => p.value === editPrefix)?.placeholder || "Rule Name"}
                        autoFocus
                    />
                    <View style={styles.formActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                            <Text style={styles.cancelText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={() => {
                                if (editName.trim()) {
                                    const finalLabel = editPrefix !== 'Unselected' ? `${editPrefix} ${editName.trim()}` : editName.trim();
                                    onUpdate(editingId, finalLabel);
                                    setEditingId(null);
                                }
                            }}
                        >
                            <Text style={styles.saveText}>{t('save')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return (
            <View key={pref.id} style={styles.ruleItem}>
                <TouchableOpacity
                    style={styles.ruleInfo}
                    onPress={() => onToggle(pref.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.ruleIcon, pref.active && styles.ruleIconActive]}>
                        <Ionicons
                            name={pref.isCustom ? "sparkles" : (pref.id.includes('avoid') ? "alert-circle-outline" : "shield-checkmark")}
                            size={20}
                            color={pref.active ? "#fff" : "#94A3B8"}
                        />
                    </View>
                    <View style={styles.ruleText}>
                        <Text style={[styles.ruleLabel, pref.active ? styles.textActive : styles.textInactive]}>{pref.label}</Text>
                        {pref.description && <Text style={styles.ruleDesc}>{pref.description}</Text>}
                    </View>
                    <Switch
                        value={pref.active}
                        onValueChange={() => onToggle(pref.id)}
                        trackColor={{ false: '#E2E8F0', true: '#d35457' }}
                        thumbColor="#fff"
                    />
                </TouchableOpacity>
                {pref.isCustom && (
                    <View style={styles.customActions}>
                        <TouchableOpacity onPress={() => startEdit(pref)} style={styles.actionBtn}>
                            <Ionicons name="create-outline" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onDelete(pref.id)} style={styles.actionBtn}>
                            <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderHeader()}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {activeTab === 'rules' ? (
                    <View style={styles.rulesView}>
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={20} color="#2563EB" />
                            <View style={styles.infoTextWrapper}>
                                <Text style={styles.infoTitle}>{t('how_it_works')}</Text>
                                <Text style={styles.infoDesc}>{t('how_it_works_desc')}</Text>
                            </View>
                        </View>

                        <View style={styles.searchRow}>
                            <View style={styles.searchBar}>
                                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={t('search_rules')}
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                />
                                {searchTerm !== '' && (
                                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                                        <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.filterBtn, showEnabledOnly && styles.filterBtnActive]}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setShowEnabledOnly(!showEnabledOnly);
                                }}
                            >
                                <Ionicons name="filter" size={18} color={showEnabledOnly ? "#d35457" : "#94A3B8"} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Ionicons name="sparkles" size={16} color="#d35457" />
                            <Text style={styles.sectionTitle}>{t('my_custom_rules')}</Text>
                        </View>
                        {customPrefs.map(renderRuleItem)}

                        {!isAdding ? (
                            <FeatureGate feature="custom_rules" featureLabel="Custom Rules">
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => {
                                        if (!isWithinLimit('custom_rules', customPrefs.length)) {
                                            openUpgradeDialog('Custom Rules');
                                            return;
                                        }
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                                        setIsAdding(true);
                                    }}
                                >
                                    <Ionicons name="add" size={20} color="#d35457" />
                                    <Text style={styles.addBtnText}>{t('add_your_own')}</Text>
                                </TouchableOpacity>
                            </FeatureGate>
                        ) : (
                            <View style={styles.addForm}>
                                <View style={styles.formHeader}>
                                    <Text style={styles.formTitle}>{t('new_rule')}</Text>
                                    <TouchableOpacity onPress={() => setIsAdding(false)}>
                                        <Ionicons name="close" size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.prefixRow}>
                                    <View style={styles.prefixPicker}>
                                        {RULE_PREFIXES.map(p => (
                                            <TouchableOpacity
                                                key={p.value}
                                                onPress={() => setNewPrefix(p.value)}
                                                style={[styles.prefixBtn, newPrefix === p.value && styles.prefixBtnActive]}
                                            >
                                                <Text style={[styles.prefixBtnText, newPrefix === p.value && styles.prefixBtnTextActive]}>
                                                    {p.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <TextInput
                                    style={styles.addInput}
                                    placeholder={RULE_PREFIXES.find(p => p.value === newPrefix)?.placeholder || t('rule_name_placeholder')}
                                    value={newName}
                                    onChangeText={setNewName}
                                    autoFocus
                                />
                                <View style={styles.formActions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAdding(false)}>
                                        <Text style={styles.cancelText}>{t('cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.saveBtn}
                                        onPress={() => {
                                            if (newName.trim()) {
                                                const finalLabel = newPrefix !== 'Unselected' ? `${newPrefix} ${newName.trim()}` : newName.trim();
                                                onAdd(finalLabel);
                                                setNewName('');
                                                setIsAdding(false);
                                            }
                                        }}
                                    >
                                        <Text style={styles.saveText}>{t('save_rule')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.sectionHeader}>
                            <Ionicons name="settings-outline" size={16} color="#94A3B8" />
                            <Text style={styles.sectionTitle}>{t('standard_prefs')}</Text>
                        </View>
                        <FeatureGate feature="global_preferences" featureLabel="Standard Preferences">
                            {popularPrefs.map(renderRuleItem)}
                        </FeatureGate>
                    </View>
                ) : (
                    <View style={styles.accountView}>
                        {!user || user.isGuest ? (
                            <View style={styles.authCard}>
                                <Ionicons name="person-circle-outline" size={64} color="#E2E8F0" />
                                <Text style={styles.authTitle}>{t('guest_account')}</Text>
                                <Text style={styles.authDesc}>{t('guest_desc')}</Text>
                                <TouchableOpacity style={styles.loginBtn} onPress={onAuthRequest}>
                                    <Text style={styles.loginBtnText}>{t('login_signup')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.userCard}>
                                <View style={styles.userHeader}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{user.name?.charAt(0) || 'U'}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.userName}>{user.name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                        <View style={styles.planBadge}>
                                            <Text style={styles.planText}>
                                                {user.isAdmin ? t('super_admin') : (subscription?.plan ? t(`${subscription.plan}_member`) : t('free_member'))}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.userActions}>
                                    {!user.isAdmin && (
                                        <TouchableOpacity
                                            style={styles.actionBtnSub}
                                            onPress={subscription ? handleManageSubscription : () => openUpgradeDialog()}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <ActivityIndicator size="small" color="#d35457" />
                                            ) : (
                                                <>
                                                    <Ionicons name={subscription ? "card-outline" : "star"} size={18} color="#d35457" />
                                                    <Text style={styles.actionBtnText}>
                                                        {subscription ? t('manage_subscription') : t('upgrade')}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
                                        {isLoggingOut ? (
                                            <ActivityIndicator size="small" color="#ef4444" />
                                        ) : (
                                            <>
                                                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                                                <Text style={styles.logoutText}>{t('logout')}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <View style={styles.menuSection}>
                            <FeatureGate feature="app_language" featureLabel="App Language">
                                <TouchableOpacity style={styles.menuItem} onPress={() => setPickerType('language')}>
                                    <View style={styles.menuLabel}>
                                        <Ionicons name="language-outline" size={22} color="#64748B" />
                                        <Text style={styles.menuText}>{t('app_language')}</Text>
                                    </View>
                                    <View style={styles.menuValueRow}>
                                        <Text style={styles.menuValue}>{LANGUAGES.find(l => l.code === language)?.label || language.toUpperCase()}</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                    </View>
                                </TouchableOpacity>
                            </FeatureGate>
                            <FeatureGate feature="currency" featureLabel="Currency">
                                <TouchableOpacity style={styles.menuItem} onPress={() => setPickerType('currency')}>
                                    <View style={styles.menuLabel}>
                                        <Ionicons name="cash-outline" size={22} color="#64748B" />
                                        <Text style={styles.menuText}>{t('currency')}</Text>
                                    </View>
                                    <View style={styles.menuValueRow}>
                                        <Text style={styles.menuValue}>{currency}</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                    </View>
                                </TouchableOpacity>
                            </FeatureGate>
                            <FeatureGate feature="shopping_location" featureLabel="Shopping Location">
                                <TouchableOpacity style={styles.menuItem} onPress={() => setPickerType('country')}>
                                    <View style={styles.menuLabel}>
                                        <Ionicons name="map-outline" size={22} color="#64748B" />
                                        <Text style={styles.menuText}>{t('shopping_location')}</Text>
                                    </View>
                                    <View style={styles.menuValueRow}>
                                        <Text style={styles.menuValue}>{shoppingCountry}</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                    </View>
                                </TouchableOpacity>
                            </FeatureGate>

                            <FeatureGate feature="app_features" featureLabel="App Features">
                                <TouchableOpacity style={styles.menuItem} onPress={() => setIsFeaturesOpen(true)}>
                                    <View style={styles.menuLabel}>
                                        <Ionicons name="options-outline" size={22} color="#64748B" />
                                        <Text style={styles.menuText}>{t('features') || "App Features"}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                </TouchableOpacity>
                            </FeatureGate>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setIsFeedbackOpen(true)}>
                                <View style={styles.menuLabel}>
                                    <Ionicons name="chatbubble-outline" size={22} color="#64748B" />
                                    <Text style={styles.menuText}>{t('send_feedback')}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                            </TouchableOpacity>

                            {user?.isGuest && (
                                <TouchableOpacity style={styles.menuItem} onPress={onAuthRequest}>
                                    <View style={styles.menuLabel}>
                                        <Ionicons name="card-outline" size={22} color="#64748B" />
                                        <Text style={styles.menuText}>{t('upgrade')}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.menuItem} onPress={() => setIsLegalOpen(true)}>
                                <View style={styles.menuLabel}>
                                    <Ionicons name="document-text-outline" size={22} color="#64748B" />
                                    <Text style={styles.menuText}>{t('legal_info') || "Legal Information"}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                            </TouchableOpacity>

                            {user?.isAdmin && (
                                <TouchableOpacity
                                    style={styles.adminBtn}
                                    onPress={() => Linking.openURL('https://madeometer.com/admin')}
                                >
                                    <Ionicons name="speedometer-outline" size={20} color="#d35457" />
                                    <Text style={styles.adminBtnText}>Admin Dashboard</Text>
                                </TouchableOpacity>
                            )}



                            <View style={styles.versionInfo}>
                                <Text style={styles.versionText}>Made O&apos;Meter v3.2 (Mobile)</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <LegalModal
                isOpen={isLegalOpen}
                onClose={() => setIsLegalOpen(false)}
            />
            <AppFeaturesModal
                isOpen={isFeaturesOpen}
                onClose={() => setIsFeaturesOpen(false)}
                preferences={preferences}
                onToggle={onToggle}
            />
            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                onSubmit={handleFeedbackSubmit}
                isSubmitting={isSubmittingFeedback}
                userEmail={user?.email}
            />
            {renderPicker()}
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
        backgroundColor: '#fff',
        paddingTop: 10,
        marginBottom: 15,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 8,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    activeTabText: {
        color: '#000',
    },
    content: {
        flex: 1,
    },
    rulesView: {
        padding: 20,
    },
    accountView: {
        padding: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
        width: "83%"
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#000',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginTop: 8,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    ruleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    ruleIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    ruleIconActive: {
        backgroundColor: '#d35457',
        borderColor: '#d35457',
    },
    ruleText: {
        marginLeft: 16,
        flex: 1,
    },
    ruleLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    ruleDesc: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    textActive: {
        color: '#1E293B',
    },
    textInactive: {
        color: '#94A3B8',
    },
    customActions: {
        flexDirection: 'row',
        gap: 8,
        paddingLeft: 12,
    },
    actionBtn: {
        padding: 4,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#E2E8F0',
        gap: 8,
        marginBottom: 24,
    },
    addBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
    },
    addForm: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
    },
    editForm: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d35457',
        marginBottom: 12,
        shadowColor: '#d35457',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    editHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    editTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#d35457',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    formTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
        textTransform: 'uppercase',
    },
    prefixRow: {
        marginBottom: 12,
    },
    prefixPicker: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 2,
    },
    prefixBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    prefixBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    prefixBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    prefixBtnTextActive: {
        color: '#1E293B',
    },
    addInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
        color: '#1E293B',
    },
    formActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    saveBtn: {
        flex: 2,
        backgroundColor: '#000',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    authCard: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        marginBottom: 24,
    },
    authTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        color: '#000',
    },
    authDesc: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
        marginBottom: 24,
    },
    loginBtn: {
        width: '100%',
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    loginBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1,
    },
    userCard: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 24,
        marginBottom: 24,
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#d35457',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    userEmail: {
        fontSize: 14,
        color: '#64748B',
    },
    planBadge: {
        marginTop: 4,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    planText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#059669',
        textTransform: 'uppercase',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        width: "auto",
        paddingLeft: 20,
        paddingRight: 20
    },
    logoutText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ef4444',

    },
    userActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    actionBtnSub: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    menuSection: {
        gap: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    menuLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    menuValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
    },
    menuValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        gap: 12,
        marginBottom: 24,
    },
    infoTextWrapper: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E40AF',
        marginBottom: 2,
    },
    infoDesc: {
        fontSize: 12,
        color: '#1E40AF',
        lineHeight: 18,
        opacity: 0.8,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    filterBtn: {
        width: 50,
        height: 50,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtnActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    versionInfo: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    versionText: {
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: '#CBD5E1',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        marginBottom: 8,
    },
    listItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    emptyListText: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 12,
    },
    // Picker Styles
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '70%',
        paddingBottom: 40,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    pickerList: {
        paddingHorizontal: 16,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 4,
    },
    pickerItemActive: {
        backgroundColor: '#FEF2F2',
    },
    pickerItemFlag: {
        fontSize: 20,
        marginRight: 12,
    },
    pickerItemText: {
        flex: 1,
        fontSize: 15,
        color: '#475569',
        fontWeight: '600',
    },
    pickerItemTextActive: {
        color: '#d35457',
        fontWeight: 'bold',
    },
    adminBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 12,
        gap: 8,
    },
    adminBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
});

export default ProfileView;
