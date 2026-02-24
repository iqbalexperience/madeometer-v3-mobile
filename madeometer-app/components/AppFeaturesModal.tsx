
import React from 'react';
import { X, Shield, BarChart3, Landmark, Layout, Globe, Info, ShoppingBag, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Preference } from '../types';

interface AppFeaturesModalProps {
    isOpen: boolean;
    onClose: () => void;
    preferences: Preference[];
    onToggle: (id: string) => void;
}

const getIcon = (id: string) => {
    switch (id) {
        case 'show_status_banner': return Shield;
        case 'show_usa_meter': return BarChart3;
        case 'show_political_meter': return Landmark;
        case 'show_shopping_options': return ShoppingBag;
        case 'show_alternatives': return Sparkles;
        default: return Layout;
    }
}

const AppFeaturesModal: React.FC<AppFeaturesModalProps> = ({ isOpen, onClose, preferences, onToggle }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const features = preferences.filter(p => p.category === 'FEATURE');

    return (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{t('features')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="space-y-3">
                    {features.map(pref => {
                        const Icon = getIcon(pref.id);
                        return (
                            <div key={pref.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pref.active ? 'bg-brand/10 text-brand' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{pref.label}</span>
                                </div>

                                <button
                                    onClick={() => onToggle(pref.id)}
                                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${pref.active ? 'bg-brand' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${pref.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Globe className="w-3 h-3" />
                    <span>App Language: <span className="font-bold text-gray-500">English</span></span>
                </div>

            </div>
        </div>
    );
};

export default AppFeaturesModal;
