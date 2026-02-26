
import { authClient } from '@/lib/auth-client';
import { ArrowLeft, ChevronRight, CreditCard, DollarSign, Droplets, Edit2, Filter, Globe, Info, Languages, LayoutGrid, Leaf, LogOut, MapPin, MessageSquare, Plus, Save, Search, Settings, Shield, ShieldAlert, SlidersHorizontal, Sparkles, Trash2, User, UserCircle, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Preference, UserProfile } from '../types';
import { LanguageCode } from '../utils/translations';
import AppFeaturesModal from './AppFeaturesModal';
import AuthModal from './AuthModal';
import { FeatureGate } from './FeatureGate';
import LegalModal from './LegalModal';


interface ProfileViewProps {
    user: UserProfile | null;
    preferences: Preference[];
    onToggle: (id: string) => void;
    onAdd: (label: string, description?: string) => void;
    onUpdate: (id: string, label: string, description?: string) => void;
    onDelete: (id: string) => void;
    onBack: () => void;
    onAuthRequest?: () => void;
    onLogout: () => void;
    onFeedback: () => void;
    subscription: any;
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

const RULE_PREFIXES = [
    { value: 'Avoid', label: "Avoid", placeholder: 'USA-owned brands' },
    { value: 'Only', label: "Only", placeholder: 'Only EU based brands' },
    { value: 'Unselected', label: "Unselected", placeholder: 'Vegan or plastic free ' }
];

const getIcon = (id: string) => {
    switch (id) {
        case 'avoid_usa': return Globe;
        case 'avoid_israel': return Globe;
        case 'eu_only': return Shield;
        case 'no_plastic': return XCircle;
        case 'vegan': return Leaf;
        case 'palm_oil': return Droplets;
        default: return Sparkles;
    }
}

const ProfileView: React.FC<ProfileViewProps> = ({
    user, preferences, onToggle, onAdd, onUpdate, onDelete,
    onBack, onAuthRequest, onLogout, onFeedback, subscription
}) => {
    const [activeTab, setActiveTab] = useState<'rules' | 'account'>('rules');
    const [isLegalOpen, setIsLegalOpen] = useState(false);
    const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
    const { t, language, setLanguage, currency, setCurrency, shoppingCountry, setShoppingCountry } = useLanguage();

    const [isLoading, setIsLoading] = useState(false);
    const { isWithinLimit, openUpgradeDialog } = useFeatureGate();

    const handleManageSubscription = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await authClient.subscription.billingPortal({
                returnUrl: window.location.href,
            });

            if (error) {
                toast.error(error.message || "Failed to create portal session");
            } else if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Add State
    const [newName, setNewName] = useState('');
    const [newPrefix, setNewPrefix] = useState('Avoid');
    const [isAdding, setIsAdding] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrefix, setEditPrefix] = useState('Avoid');
    const [showEnabledOnly, setShowEnabledOnly] = useState(false);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');

    const handleStartAdd = () => {
        if (!isWithinLimit('custom_rules', customPreferences.length)) {
            openUpgradeDialog('Custom Rules');
            return;
        }
        setIsAdding(true);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            const finalLabel = newPrefix !== 'Unselected' ? `${newPrefix} ${newName.trim()}` : newName.trim();
            onAdd(finalLabel);
            setNewName('');
            setIsAdding(false);
        }
    };

    const startEdit = (pref: Preference) => {
        if (!user || user.isGuest) return;
        setEditingId(pref.id);

        // Try to separate prefix if it exists
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

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId && editName.trim()) {
            const finalLabel = editPrefix !== 'Unselected' ? `${editPrefix} ${editName.trim()}` : editName.trim();
            onUpdate(editingId, finalLabel);
            setEditingId(null);
        }
    };

    // Simplified filtering
    const filteredPrefs = preferences.filter(p => {
        // Exclude FEATURE category from the main rules list
        if (p.category === 'FEATURE') return false;

        const matchesSearch = p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesEnabled = !showEnabledOnly || p.active; // Use p.active for enabled state
        return matchesSearch && matchesEnabled;
    });

    const popularPreferences = filteredPrefs
        .filter(p => !p.isCustom);

    const customPreferences = filteredPrefs
        .filter(p => p.isCustom);

    const totalRulesCount = preferences.filter(p => p.category !== 'FEATURE').length; // Count only non-feature preferences

    const renderPreferenceItem = (pref: Preference) => {
        const Icon = getIcon(pref.id);
        const isEditing = editingId === pref.id;

        if (isEditing) {
            return (
                <div key={pref.id} className="p-3 bg-white rounded-2xl border border-brand/20 shadow-lg shadow-brand/5 relative animate-in fade-in duration-200">
                    <form onSubmit={saveEdit} className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Edit2 className="w-3.5 h-3.5 text-brand" />
                            <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">{t('editing_rule')}</span>
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={editPrefix}
                                onChange={(e) => setEditPrefix(e.target.value)}
                                className="w-24 px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand transition-all text-gray-900"
                            >
                                {RULE_PREFIXES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder={RULE_PREFIXES.find(p => p.value === editPrefix)?.placeholder || "Rule Name"}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-gray-900"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!editName.trim()}
                                className="flex-1 py-2 bg-brand text-white rounded-lg text-xs font-bold shadow-md hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {t('save')}
                            </button>
                        </div>
                    </form>
                </div>
            );
        }

        return (
            <div key={pref.id} className="relative group">
                <button
                    onClick={() => onToggle(pref.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 active:scale-[0.99] ${pref.active
                        ? 'bg-gray-50 border-transparent'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100'
                        }`}
                >
                    <div className="flex items-start gap-3.5 overflow-hidden">
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 mt-0.5 ${pref.active
                            ? 'bg-brand text-white shadow-md shadow-brand/20'
                            : 'bg-white text-gray-400 border border-gray-100'
                            }`}>
                            <Icon className="w-5 h-5" strokeWidth={pref.active ? 2.5 : 2} />
                        </div>

                        <div className="text-left min-w-0 pr-12 py-0.5">
                            <div className="flex items-center gap-2">
                                <span className={`block font-bold text-[13px] truncate transition-colors ${pref.active ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {pref.label}
                                </span>
                                {pref.isCustom && <span className="px-1.5 py-0.5 rounded-md bg-brand/10 text-brand text-[9px] font-bold uppercase tracking-wide">{t('custom')}</span>}
                            </div>
                            {pref.description && (
                                <span className="block text-[11px] text-gray-500 font-medium leading-tight mt-0.5 pr-2">{pref.description}</span>
                            )}
                        </div>
                    </div>

                    <div className={`w-11 h-6 shrink-0 rounded-full p-1 transition-colors duration-300 flex items-center self-center ${pref.active ? 'bg-brand' : 'bg-gray-200'
                        }`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${pref.active ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                    </div>
                </button>

                {pref.isCustom && (
                    <div className="absolute right-0 -top-2 flex items-center gap-1 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity translate-y-0 active:translate-y-0.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); startEdit(pref); }}
                            className="w-7 h-7 bg-white text-gray-400 border border-gray-100 rounded-full shadow-sm flex items-center justify-center hover:text-brand hover:border-brand transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(pref.id); }}
                            className="w-7 h-7 bg-white text-gray-400 border border-gray-100 rounded-full shadow-sm flex items-center justify-center hover:text-red-500 hover:border-red-100 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col pt-4 min-h-full">
            <div className="bg-white rounded-t-[1.4rem] shadow-2xl relative flex flex-col flex-1 overflow-hidden">
                <div className="px-5 pt-6 pb-2 shrink-0">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('settings_title')}</h2>
                        </div>
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-900 hover:bg-gray-100 transition-colors border border-gray-100 shadow-sm shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex p-1 bg-gray-100 rounded-xl mb-2">
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'rules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {t('scanner_rules')}
                        </button>
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'account' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <UserCircle className="w-4 h-4" />
                            {t('account')}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pt-2 pb-40">
                    {activeTab === 'rules' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-blue-900 text-[13px] mb-1">{t('how_it_works')}</h4>
                                    <p className="text-xs text-blue-700/80 font-medium leading-relaxed">
                                        {t('how_it_works_desc')}
                                    </p>
                                </div>
                            </div>

                            {/* Search Bar & Toggle */}
                            {totalRulesCount > 10 && (
                                <div className="mb-6 flex gap-2">
                                    <div className="relative group flex-1">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors">
                                            <Search className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={t('search_rules')}
                                            className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-[13px] font-bold focus:outline-none focus:bg-white focus:border-brand/20 focus:ring-4 focus:ring-brand/5 transition-all text-gray-900 placeholder:text-gray-400 placeholder:font-medium shadow-sm"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200/50 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all active:scale-90"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowEnabledOnly(!showEnabledOnly)}
                                        className={`shrink-0 w-12 rounded-2xl flex items-center justify-center border transition-all ${showEnabledOnly
                                            ? 'bg-brand/10 border-brand/20 text-brand'
                                            : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'
                                            }`}
                                        title={showEnabledOnly ? "Show All" : "Show Enabled Only"}
                                    >
                                        <Filter className={`w-4 h-4 ${showEnabledOnly ? 'fill-current' : ''}`} />
                                    </button>
                                </div>
                            )}

                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Sparkles className="w-4 h-4 text-brand" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('my_custom_rules')}</span>
                                </div>

                                {customPreferences.length > 0 && (
                                    <div className="grid gap-3 mb-4">
                                        {customPreferences.map(renderPreferenceItem)}
                                    </div>
                                )}

                                {!isAdding ? (
                                    <>
                                        <FeatureGate feature="custom_rules" featureLabel="Custom Rules">
                                            <button
                                                onClick={handleStartAdd}
                                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 transition-all group active:scale-[0.99] text-gray-400 hover:text-brand hover:border-brand/50 hover:bg-brand/5"
                                            >
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-gray-100 group-hover:bg-brand group-hover:text-white">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-wide">{t('add_your_own')}</span>
                                            </button>
                                        </FeatureGate>
                                    </>
                                ) : (
                                    <form onSubmit={handleAddSubmit} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-brand" />
                                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">{t('new_rule')}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsAdding(false)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-red-500 shadow-sm transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <select
                                                    value={newPrefix}
                                                    onChange={(e) => setNewPrefix(e.target.value)}
                                                    className="w-24 px-2 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand transition-all text-gray-900"
                                                >
                                                    {RULE_PREFIXES.map(p => (
                                                        <option key={p.value} value={p.value}>{p.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    placeholder={RULE_PREFIXES.find(p => p.value === newPrefix)?.placeholder || t('rule_name_placeholder')}
                                                    autoFocus
                                                    className="flex-1 pl-4 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all placeholder:text-gray-400 placeholder:font-medium text-gray-900"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!newName.trim()}
                                                className="w-full py-3 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-200 hover:bg-black disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 font-bold text-xs"
                                            >
                                                <Plus className="w-4 h-4" />
                                                {t('save_rule')}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            <FeatureGate
                                feature="global_preferences"
                                featureLabel="Standard Preferences"
                            >
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Settings className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('standard_prefs')}</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {popularPreferences.map(renderPreferenceItem)}
                                    </div>
                                </div>
                            </FeatureGate>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6 relative overflow-hidden">
                                {!user || user.isGuest ? (
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                            <User className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">{t('guest_account')}</h3>
                                        <p className="text-xs text-gray-500 font-medium mb-4 max-w-[200px]">
                                            {t('guest_desc')}
                                        </p>
                                        <button
                                            onClick={onAuthRequest}
                                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl text-xs uppercase tracking-wide shadow-lg shadow-gray-200 hover:bg-black active:scale-[0.98] transition-all"
                                        >
                                            {t('login_signup')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-brand text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-brand/20">
                                                {user.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{user.name}</h3>
                                                <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md">
                                                    {user.isAdmin ? t('super_admin') : (subscription ? t(`${subscription.plan}_member`) : t('free_member'))}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {subscription ? (
                                                <button
                                                    onClick={handleManageSubscription}
                                                    disabled={isLoading}
                                                    className="p-2.5 bg-white text-gray-400 hover:text-brand rounded-xl border border-gray-100 hover:border-brand transition-colors shadow-sm disabled:opacity-50"
                                                    title={t('manage_subscription')}
                                                >
                                                    <CreditCard className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <a
                                                    href="/billing"
                                                    className="px-4 py-2 bg-brand/10 text-brand text-xs font-bold rounded-xl hover:bg-brand/20 transition-all border border-brand/20 flex items-center gap-2"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                    {t('upgrade')}
                                                </a>
                                            )}
                                            <button
                                                onClick={onLogout}
                                                className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl border border-gray-100 hover:border-red-100 transition-colors shadow-sm"
                                                title="Logout"
                                            >
                                                <LogOut className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('preferences')}</span>
                                </div>

                                <div className="space-y-3">
                                    {/* App Language */}
                                    <FeatureGate feature="app_language" featureLabel="App Language">
                                        <div className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100">
                                                    <Languages className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-sm">{t('app_language')}</h3>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={language}
                                                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                                    className="appearance-none bg-transparent pl-2 pr-8 py-1 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer text-right"
                                                >
                                                    {LANGUAGES.map(lang => (
                                                        <option key={lang.code} value={lang.code}>
                                                            {lang.flag} {lang.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>
                                    </FeatureGate>

                                    {/* Currency */}
                                    <FeatureGate feature="currency" featureLabel="Currency">
                                        <div className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100">
                                                    <DollarSign className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-sm">{t('currency')}</h3>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={currency}
                                                    onChange={(e) => setCurrency(e.target.value)}
                                                    className="appearance-none bg-transparent pl-2 pr-8 py-1 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer text-right"
                                                >
                                                    {CURRENCIES.map(curr => (
                                                        <option key={curr.code} value={curr.code}>
                                                            {curr.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>
                                    </FeatureGate>

                                    {/* Shopping Location */}
                                    <FeatureGate feature="shopping_location" featureLabel="Shopping Location">
                                        <div className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-sm">{t('shopping_location')}</h3>
                                            </div>
                                            <div className="relative max-w-[140px]">
                                                <select
                                                    value={shoppingCountry}
                                                    onChange={(e) => setShoppingCountry(e.target.value)}
                                                    className="appearance-none bg-transparent pl-2 pr-8 py-1 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer text-right w-full truncate"
                                                >
                                                    {COUNTRIES.map(country => (
                                                        <option key={country.name} value={country.name}>
                                                            {country.flag} {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>
                                    </FeatureGate>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* New App Features Button */}
                                <FeatureGate feature="app_features" featureLabel="App Features">
                                    <button
                                        onClick={() => setIsFeaturesOpen(true)}
                                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-md hover:border-indigo-100 transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-50 group-hover:bg-indigo-100 transition-colors">
                                                <LayoutGrid className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-gray-900 text-sm">{t('features')}</h3>
                                                <p className="text-gray-500 text-xs font-medium">{t('customize_interface')}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                    </button>
                                </FeatureGate>

                                {user?.isAdmin && (
                                    <Link
                                        href="/admin"
                                        className="w-full p-4 bg-slate-900 rounded-2xl flex items-center justify-between group shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                                <ShieldAlert className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-white font-bold text-sm">{t('admin_dashboard')}</h3>
                                                <p className="text-slate-400 text-xs font-medium">{t('manage_db')}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                    </Link>
                                )}

                                <button
                                    onClick={onFeedback}
                                    className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group shadow-sm hover:shadow-md hover:border-blue-100 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-gray-900 text-sm">{t('send_feedback')}</h3>
                                            <p className="text-gray-500 text-xs font-medium">{t('report_bugs')}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </button>
                            </div>

                            <div className="mt-6 mb-4">
                                <button
                                    onClick={() => setIsLegalOpen(true)}
                                    className="w-full text-left p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3 hover:bg-gray-100 transition-colors active:scale-[0.98] group"
                                >
                                    <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 group-hover:text-gray-600 transition-colors" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-[13px] mb-1">{t('data_privacy')}</h4>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                            {t('read_terms')}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 self-center group-hover:text-gray-500 transition-colors" />
                                </button>
                            </div>

                            <div className="text-center mt-8">
                                <p className="text-[10px] text-gray-300 font-mono">Made O'Meter v3.2</p>
                            </div>
                        </div>
                    )}
                </div>
                <LegalModal isOpen={isLegalOpen} onClose={() => setIsLegalOpen(false)} />
                <AppFeaturesModal
                    isOpen={isFeaturesOpen}
                    onClose={() => setIsFeaturesOpen(false)}
                    preferences={preferences}
                    onToggle={onToggle}
                />
                <AuthModal
                    isOpen={false}
                    onClose={() => { }}
                    onLogin={async () => { }}
                    onRegister={async () => { }}
                />
            </div>
        </div>
    );
};
export default ProfileView;
