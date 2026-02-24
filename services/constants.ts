import { Preference } from '../types';

export const LANGUAGE_DEFAULTS: Record<string, { country: string; currency: string }> = {
    da: { country: 'Denmark', currency: 'DKK' },
    de: { country: 'Germany', currency: 'EUR' },
    nl: { country: 'Netherlands', currency: 'EUR' },
    sv: { country: 'Sweden', currency: 'SEK' },
    no: { country: 'Norway', currency: 'NOK' },
    es: { country: 'Spain', currency: 'EUR' },
    fr: { country: 'France', currency: 'EUR' },
    it: { country: 'Italy', currency: 'EUR' },
    pt: { country: 'Portugal', currency: 'EUR' },
    en: { country: 'USA/International', currency: 'USD' },
};

export const DEFAULT_PREFERENCES_LIST: Preference[] = [
    { id: 'avoid_usa', label: 'Avoid USA-owned brands', active: true, category: 'CRITERIA' },
    { id: 'avoid_israel', label: 'Avoid Israeli-owned brands', active: false, category: 'CRITERIA' },
    { id: 'eu_only', label: 'Only EU based brands', active: false, category: 'CRITERIA' },
    { id: 'palm_oil', label: 'Avoid Palm Oil in products', active: false, category: 'CRITERIA' },
    { id: 'show_status_banner', label: 'Show Status Banner', active: true, category: 'FEATURE' },
    { id: 'show_political_meter', label: 'Show Political Donation Score', active: true, category: 'FEATURE' },
    { id: 'show_usa_meter', label: 'Show USA Meter', active: false, category: 'FEATURE' },
    { id: 'show_shopping_options', label: 'Enable Price Check', active: false, category: 'FEATURE' },
    { id: 'show_alternatives', label: 'Enable Alternatives', active: true, category: 'FEATURE' },
    { id: 'no_plastic', label: 'Plastic Free', active: false, category: 'CRITERIA' },
    { id: 'vegan', label: 'Vegan', active: false, category: 'CRITERIA' },
];
