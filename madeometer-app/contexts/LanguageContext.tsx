"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, LanguageCode } from '../utils/translations';
import { getAllTranslations, getUserSettings, saveUserSettings } from '../services/database';
import { useSession } from '@/lib/auth-client';

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    currency: string;
    setCurrency: (currency: string) => void;
    shoppingCountry: string;
    setShoppingCountry: (country: string) => void;
    t: (key: string) => string;
    refreshTranslations: () => Promise<void>;
    isInitialLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    // Default Settings
    const [language, setLanguageState] = useState<LanguageCode>('en');
    const [currency, setCurrencyState] = useState<string>('DKK');
    const [shoppingCountry, setShoppingCountryState] = useState<string>('Denmark');
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [dbTranslations, setDbTranslations] = useState<Record<string, Record<string, string>>>({});

    const getBrowserLanguage = (): LanguageCode => {
        if (typeof window === 'undefined') return 'en';
        const browserLang = navigator.language.split('-')[0] as LanguageCode;
        return TRANSLATIONS[browserLang] ? browserLang : 'en';
    };

    const loadTranslations = async () => {
        try {
            const stored = await getAllTranslations();
            const map: Record<string, Record<string, string>> = {};

            stored.forEach(item => {
                map[item.key] = item.values;
            });

            setDbTranslations(map);
        } catch (e) {
            console.error("Failed to load translations from DB", e);
        }
    };

    // Load initial settings
    useEffect(() => {
        const loadInitialSettings = async () => {
            try {
                if (userId) {
                    const settings = await getUserSettings(userId);
                    if (settings.language && TRANSLATIONS[settings.language as LanguageCode]) {
                        setLanguageState(settings.language as LanguageCode);
                    } else {
                        setLanguageState(getBrowserLanguage());
                    }
                    if (settings.currency) setCurrencyState(settings.currency);
                    if (settings.shoppingCountry) setShoppingCountryState(settings.shoppingCountry);
                } else {
                    const savedLang = localStorage.getItem('madeometer_lang');
                    const savedCurr = localStorage.getItem('madeometer_currency');
                    const savedCountry = localStorage.getItem('madeometer_country');

                    if (savedLang && TRANSLATIONS[savedLang as LanguageCode]) {
                        setLanguageState(savedLang as LanguageCode);
                    } else {
                        setLanguageState(getBrowserLanguage());
                    }

                    if (savedCurr) setCurrencyState(savedCurr);
                    if (savedCountry) setShoppingCountryState(savedCountry);
                }
            } catch (e) {
                console.error("Failed to load initial settings", e);
                setLanguageState(getBrowserLanguage());
            } finally {
                // Ensure translations are also loaded or attempted before hiding loader
                await loadTranslations();
                setIsInitialLoading(false);
            }
        };

        loadInitialSettings();
    }, [userId]);

    const setLanguage = async (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem('madeometer_lang', lang);
        if (userId) {
            await saveUserSettings(userId, { language: lang });
        }
    };

    const setCurrency = async (curr: string) => {
        setCurrencyState(curr);
        localStorage.setItem('madeometer_currency', curr);
        if (userId) {
            await saveUserSettings(userId, { currency: curr });
        }
    };

    const setShoppingCountry = async (country: string) => {
        setShoppingCountryState(country);
        localStorage.setItem('madeometer_country', country);
        if (userId) {
            await saveUserSettings(userId, { shoppingCountry: country });
        }
    };

    const t = (key: string): string => {
        // 1. Try DB specific language
        if (dbTranslations[key] && dbTranslations[key][language]) {
            return dbTranslations[key][language];
        }

        // 2. Try Static specific language
        if (TRANSLATIONS[language]?.[key]) {
            return TRANSLATIONS[language][key];
        }

        // 3. Try DB English (Fallback)
        if (dbTranslations[key] && dbTranslations[key]['en']) {
            return dbTranslations[key]['en'];
        }

        // 4. Try Static English (Fallback)
        if (TRANSLATIONS['en']?.[key]) {
            return TRANSLATIONS['en'][key];
        }

        // 5. Return Key
        return key;
    };

    return (
        <LanguageContext.Provider value={{
            language, setLanguage,
            currency, setCurrency,
            shoppingCountry, setShoppingCountry,
            t, refreshTranslations: loadTranslations,
            isInitialLoading
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
