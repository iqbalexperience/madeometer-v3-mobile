import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { LanguageCode, TRANSLATIONS } from '../utils/translations';

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    currency: string;
    setCurrency: (currency: string) => void;
    shoppingCountry: string;
    setShoppingCountry: (country: string) => void;
    t: (key: string) => string;
    isInitialLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{
    children: React.ReactNode;
    userId?: string;
}> = ({ children, userId }) => {
    const [language, setLanguageState] = useState<LanguageCode>('en');
    const [currency, setCurrencyState] = useState<string>('DKK');
    const [shoppingCountry, setShoppingCountryState] = useState<string>('Denmark');
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedLang = await storage.getItem('madeometer_lang');
                const savedCurr = await storage.getItem('madeometer_currency');
                const savedCountry = await storage.getItem('madeometer_country');

                if (savedLang && TRANSLATIONS[savedLang as LanguageCode]) {
                    setLanguageState(savedLang as LanguageCode);
                }
                if (savedCurr) setCurrencyState(savedCurr);
                if (savedCountry) setShoppingCountryState(savedCountry);
            } catch (e) {
                console.error('Failed to load language settings', e);
            } finally {
                setIsInitialLoading(false);
            }
        };

        loadSettings();
    }, [userId]);

    const setLanguage = async (lang: LanguageCode) => {
        setLanguageState(lang);
        await storage.setItem('madeometer_lang', lang);
    };

    const setCurrency = async (curr: string) => {
        setCurrencyState(curr);
        await storage.setItem('madeometer_currency', curr);
    };

    const setShoppingCountry = async (country: string) => {
        setShoppingCountryState(country);
        await storage.setItem('madeometer_country', country);
    };

    const t = (key: string): string => {
        if (TRANSLATIONS[language]?.[key]) return TRANSLATIONS[language][key];
        if (TRANSLATIONS['en']?.[key]) return TRANSLATIONS['en'][key];
        return key;
    };

    return (
        <LanguageContext.Provider
            value={{
                language, setLanguage,
                currency, setCurrency,
                shoppingCountry, setShoppingCountry,
                t, isInitialLoading,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};
