import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { ScanResult } from '../types';

interface EditScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedResult: ScanResult) => void;
    scanResult: ScanResult | null;
}

const COUNTRIES = [
    { name: 'Afghanistan', code: 'AF', flag: '🇦🇫' },
    { name: 'Albania', code: 'AL', flag: '🇦🇱' },
    { name: 'Algeria', code: 'DZ', flag: '🇩🇿' },
    { name: 'Andorra', code: 'AD', flag: '🇦🇩' },
    { name: 'Angola', code: 'AO', flag: '🇦🇴' },
    { name: 'Antigua and Barbuda', code: 'AG', flag: '🇦🇬' },
    { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
    { name: 'Armenia', code: 'AM', flag: '🇦🇲' },
    { name: 'Australia', code: 'AU', flag: '🇦🇺' },
    { name: 'Austria', code: 'AT', flag: '🇦🇹' },
    { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿' },
    { name: 'Bahamas', code: 'BS', flag: '�🇸' },
    { name: 'Bahrain', code: 'BH', flag: '🇧🇭' },
    { name: 'Bangladesh', code: 'BD', flag: '🇧🇩' },
    { name: 'Barbados', code: 'BB', flag: '🇧🇧' },
    { name: 'Belarus', code: 'BY', flag: '🇧🇾' },
    { name: 'Belgium', code: 'BE', flag: '🇧🇪' },
    { name: 'Belize', code: 'BZ', flag: '🇧🇿' },
    { name: 'Benin', code: 'BJ', flag: '🇧🇯' },
    { name: 'Bhutan', code: 'BT', flag: '🇧🇹' },
    { name: 'Bolivia', code: 'BO', flag: '🇧🇴' },
    { name: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦' },
    { name: 'Botswana', code: 'BW', flag: '🇧🇼' },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
    { name: 'Brunei', code: 'BN', flag: '🇧🇳' },
    { name: 'Bulgaria', code: 'BG', flag: '🇧🇬' },
    { name: 'Burkina Faso', code: 'BF', flag: '🇧�' },
    { name: 'Burundi', code: 'BI', flag: '🇧🇮' },
    { name: 'Cabo Verde', code: 'CV', flag: '🇨🇻' },
    { name: 'Cambodia', code: 'KH', flag: '🇰🇭' },
    { name: 'Cameroon', code: 'CM', flag: '🇨🇲' },
    { name: 'Canada', code: 'CA', flag: '🇨🇦' },
    { name: 'Central African Republic', code: 'CF', flag: '🇨🇫' },
    { name: 'Chad', code: 'TD', flag: '🇹🇩' },
    { name: 'Chile', code: 'CL', flag: '🇨🇱' },
    { name: 'China', code: 'CN', flag: '🇨🇳' },
    { name: 'Colombia', code: 'CO', flag: '🇨🇴' },
    { name: 'Comoros', code: 'KM', flag: '🇰🇲' },
    { name: 'Congo', code: 'CG', flag: '🇨🇬' },
    { name: 'Costa Rica', code: 'CR', flag: '🇨🇷' },
    { name: 'Croatia', code: 'HR', flag: '🇭🇷' },
    { name: 'Cuba', code: 'CU', flag: '🇨🇺' },
    { name: 'Cyprus', code: 'CY', flag: '🇨🇾' },
    { name: 'Czechia', code: 'CZ', flag: '🇨🇿' },
    { name: 'Denmark', code: 'DK', flag: '🇩🇰' },
    { name: 'Djibouti', code: 'DJ', flag: '🇩🇯' },
    { name: 'Dominica', code: 'DM', flag: '🇩🇲' },
    { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴' },
    { name: 'Ecuador', code: 'EC', flag: '🇪🇨' },
    { name: 'Egypt', code: 'EG', flag: '�🇬' },
    { name: 'El Salvador', code: 'SV', flag: '🇸🇻' },
    { name: 'Equatorial Guinea', code: 'GQ', flag: '🇬🇶' },
    { name: 'Eritrea', code: 'ER', flag: '🇪🇷' },
    { name: 'Estonia', code: 'EE', flag: '🇪🇪' },
    { name: 'Eswatini', code: 'SZ', flag: '🇸🇿' },
    { name: 'Ethiopia', code: 'ET', flag: '🇪🇹' },
    { name: 'Fiji', code: 'FJ', flag: '🇫🇯' },
    { name: 'Finland', code: 'FI', flag: '🇫🇮' },
    { name: 'France', code: 'FR', flag: '🇫🇷' },
    { name: 'Gabon', code: 'GA', flag: '🇬🇦' },
    { name: 'Gambia', code: 'GM', flag: '🇬🇲' },
    { name: 'Georgia', code: 'GE', flag: '🇬🇪' },
    { name: 'Germany', code: 'DE', flag: '🇩🇪' },
    { name: 'Ghana', code: 'GH', flag: '🇬🇭' },
    { name: 'Greece', code: 'GR', flag: '��🇷' },
    { name: 'Grenada', code: 'GD', flag: '🇬🇩' },
    { name: 'Guatemala', code: 'GT', flag: '🇬🇹' },
    { name: 'Guinea', code: 'GN', flag: '🇬🇳' },
    { name: 'Guinea-Bissau', code: 'GW', flag: '🇬🇼' },
    { name: 'Guyana', code: 'GY', flag: '🇬🇾' },
    { name: 'Haiti', code: 'HT', flag: '🇭🇹' },
    { name: 'Honduras', code: 'HN', flag: '🇭🇳' },
    { name: 'Hungary', code: 'HU', flag: '🇭🇺' },
    { name: 'Iceland', code: 'IS', flag: '🇮🇸' },
    { name: 'India', code: 'IN', flag: '🇮🇳' },
    { name: 'Indonesia', code: 'ID', flag: '🇮🇩' },
    { name: 'Iran', code: 'IR', flag: '🇮🇷' },
    { name: 'Iraq', code: 'IQ', flag: '🇮🇶' },
    { name: 'Ireland', code: 'IE', flag: '🇮🇪' },
    { name: 'Israel', code: 'IL', flag: '🇮🇱' },
    { name: 'Italy', code: 'IT', flag: '🇮🇹' },
    { name: 'Jamaica', code: 'JM', flag: '🇯🇲' },
    { name: 'Japan', code: 'JP', flag: '🇯🇵' },
    { name: 'Jordan', code: 'JO', flag: '🇯🇴' },
    { name: 'Kazakhstan', code: 'KZ', flag: '��' },
    { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
    { name: 'Kiribati', code: 'KI', flag: '🇰🇮' },
    { name: 'Korea (North)', code: 'KP', flag: '��' },
    { name: 'Korea (South)', code: 'KR', flag: '🇰🇷' },
    { name: 'Kuwait', code: 'KW', flag: '🇰🇼' },
    { name: 'Kyrgyzstan', code: 'KG', flag: '🇰🇬' },
    { name: 'Laos', code: 'LA', flag: '🇱🇦' },
    { name: 'Latvia', code: 'LV', flag: '🇱🇻' },
    { name: 'Lebanon', code: 'LB', flag: '🇱🇧' },
    { name: 'Lesotho', code: 'LS', flag: '🇱🇸' },
    { name: 'Liberia', code: 'LR', flag: '�🇷' },
    { name: 'Libya', code: 'LY', flag: '🇱🇾' },
    { name: 'Liechtenstein', code: 'LI', flag: '🇱🇮' },
    { name: 'Lithuania', code: 'LT', flag: '🇱🇹' },
    { name: 'Luxembourg', code: 'LU', flag: '🇱🇺' },
    { name: 'Madagascar', code: 'MG', flag: '🇲🇬' },
    { name: 'Malawi', code: 'MW', flag: '🇲🇼' },
    { name: 'Malaysia', code: 'MY', flag: '🇲🇾' },
    { name: 'Maldives', code: 'MV', flag: '🇲🇻' },
    { name: 'Mali', code: 'ML', flag: '🇲🇱' },
    { name: 'Malta', code: 'MT', flag: '🇲🇹' },
    { name: 'Marshall Islands', code: 'MH', flag: '🇲🇭' },
    { name: 'Mauritania', code: 'MR', flag: '🇲🇷' },
    { name: 'Mauritius', code: 'MU', flag: '�🇺' },
    { name: 'Mexico', code: 'MX', flag: '🇲🇽' },
    { name: 'Micronesia', code: 'FM', flag: '🇫🇲' },
    { name: 'Moldova', code: 'MD', flag: '��' },
    { name: 'Monaco', code: 'MC', flag: '🇲🇨' },
    { name: 'Mongolia', code: 'MN', flag: '🇲🇳' },
    { name: 'Montenegro', code: 'ME', flag: '�🇪' },
    { name: 'Morocco', code: 'MA', flag: '🇲🇦' },
    { name: 'Mozambique', code: 'MZ', flag: '🇲🇿' },
    { name: 'Myanmar', code: 'MM', flag: '🇲🇲' },
    { name: 'Namibia', code: 'NA', flag: '🇳🇦' },
    { name: 'Nauru', code: 'NR', flag: '🇳🇷' },
    { name: 'Nepal', code: 'NP', flag: '🇳�' },
    { name: 'Netherlands', code: 'NL', flag: '🇳🇱' },
    { name: 'New Zealand', code: 'NZ', flag: '🇳🇿' },
    { name: 'Nicaragua', code: 'NI', flag: '🇳🇮' },
    { name: 'Niger', code: 'NE', flag: '🇳🇪' },
    { name: 'Nigeria', code: 'NG', flag: '🇳🇬' },
    { name: 'North Macedonia', code: 'MK', flag: '🇲🇰' },
    { name: 'Norway', code: 'NO', flag: '🇳🇴' },
    { name: 'Oman', code: 'OM', flag: '🇴🇲' },
    { name: 'Pakistan', code: 'PK', flag: '🇵🇰' },
    { name: 'Palau', code: 'PW', flag: '🇵🇼' },
    { name: 'Panama', code: 'PA', flag: '🇵🇦' },
    { name: 'Papua New Guinea', code: 'PG', flag: '🇵🇬' },
    { name: 'Paraguay', code: 'PY', flag: '🇵🇾' },
    { name: 'Peru', code: 'PE', flag: '🇵🇪' },
    { name: 'Philippines', code: 'PH', flag: '🇵�' },
    { name: 'Poland', code: 'PL', flag: '🇵🇱' },
    { name: 'Portugal', code: 'PT', flag: '🇵🇹' },
    { name: 'Qatar', code: 'QA', flag: '🇶🇦' },
    { name: 'Romania', code: 'RO', flag: '🇷🇴' },
    { name: 'Russia', code: 'RU', flag: '🇷🇺' },
    { name: 'Rwanda', code: 'RW', flag: '🇷�' },
    { name: 'Saint Kitts and Nevis', code: 'KN', flag: '🇰🇳' },
    { name: 'Saint Lucia', code: 'LC', flag: '🇱🇨' },
    { name: 'Saint Vincent and the Grenadines', code: 'VC', flag: '🇻🇨' },
    { name: 'Samoa', code: 'WS', flag: '🇼🇸' },
    { name: 'San Marino', code: 'SM', flag: '🇸🇲' },
    { name: 'Sao Tome and Principe', code: 'ST', flag: '��' },
    { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
    { name: 'Senegal', code: 'SN', flag: '🇸🇳' },
    { name: 'Serbia', code: 'RS', flag: '�🇷🇸' },
    { name: 'Seychelles', code: 'SC', flag: '🇸🇨' },
    { name: 'Sierra Leone', code: 'SL', flag: '🇸🇱' },
    { name: 'Singapore', code: 'SG', flag: '��' },
    { name: 'Slovakia', code: 'SK', flag: '🇸🇰' },
    { name: 'Slovenia', code: 'SI', flag: '🇸🇮' },
    { name: 'Solomon Islands', code: 'SB', flag: '🇸🇧' },
    { name: 'Somalia', code: 'SO', flag: '🇸🇴' },
    { name: 'South Africa', code: 'ZA', flag: '🇿🇦' },
    { name: 'South Sudan', code: 'SS', flag: '🇸🇸' },
    { name: 'Spain', code: 'ES', flag: '🇪🇸' },
    { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰' },
    { name: 'Sudan', code: 'SD', flag: '��' },
    { name: 'Suriname', code: 'SR', flag: '�🇷' },
    { name: 'Sweden', code: 'SE', flag: '🇸🇪' },
    { name: 'Switzerland', code: 'CH', flag: '🇨🇭' },
    { name: 'Syria', code: 'SY', flag: '🇸🇾' },
    { name: 'Taiwan', code: 'TW', flag: '🇹🇼' },
    { name: 'Tajikistan', code: 'TJ', flag: '🇹🇯' },
    { name: 'Tanzania', code: 'TZ', flag: '🇹🇿' },
    { name: 'Thailand', code: 'TH', flag: '🇹🇭' },
    { name: 'Timor-Leste', code: 'TL', flag: '🇹🇱' },
    { name: 'Togo', code: 'TG', flag: '🇹🇬' },
    { name: 'Tonga', code: 'TO', flag: '🇹🇴' },
    { name: 'Trinidad and Tobago', code: 'TT', flag: '🇹🇹' },
    { name: 'Tunisia', code: 'TN', flag: '🇹🇳' },
    { name: 'Turkey', code: 'TR', flag: '🇹🇷' },
    { name: 'Turkmenistan', code: 'TM', flag: '🇹🇲' },
    { name: 'Tuvalu', code: 'TV', flag: '🇹🇻' },
    { name: 'Uganda', code: 'UG', flag: '🇺🇬' },
    { name: 'Ukraine', code: 'UA', flag: '🇺🇦' },
    { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
    { name: 'United Kingdom', code: 'GB', flag: '��🇧' },
    { name: 'United States', code: 'US', flag: '🇺�' },
    { name: 'Uruguay', code: 'UY', flag: '🇺🇾' },
    { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿' },
    { name: 'Vanuatu', code: 'VU', flag: '🇻🇺' },
    { name: 'Vatican City', code: 'VA', flag: '��🇦' },
    { name: 'Venezuela', code: 'VE', flag: '🇻🇪' },
    { name: 'Vietnam', code: 'VN', flag: '🇻�' },
    { name: 'Yemen', code: 'YE', flag: '🇾🇪' },
    { name: 'Zambia', code: 'ZM', flag: '🇿🇲' },
    { name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼' },
].sort((a, b) => a.name.localeCompare(b.name));

const EditScanModal: React.FC<EditScanModalProps> = ({ isOpen, onClose, onSave, scanResult }) => {
    const [formData, setFormData] = useState<Partial<ScanResult>>({});
    const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        if (scanResult) {
            setFormData({
                itemName: scanResult.itemName,
                ownerCompany: scanResult.ownerCompany,
                ownerCountry: scanResult.ownerCountry,
                ownerCountryCode: scanResult.ownerCountryCode,
                verdict: scanResult.verdict,
                ownerFlag: scanResult.ownerFlag
            });
        }
    }, [scanResult, isOpen]);

    if (!scanResult) return null;

    const handleSave = () => {
        const updatedResult: ScanResult = {
            ...scanResult,
            ...formData,
        } as ScanResult;
        onSave(updatedResult);
        onClose();
    };

    const handleSelectCountry = (country: typeof COUNTRIES[0]) => {
        setFormData({
            ...formData,
            ownerCountry: country.name,
            ownerCountryCode: country.code,
            ownerFlag: country.flag
        });
        setIsCountryPickerOpen(false);
        setSearchQuery('');
    };

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Modal
            visible={isOpen}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismiss} onPress={onClose} activeOpacity={1} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{t('edit_details')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('status').toUpperCase()}</Text>
                                <View style={styles.verdictGrid}>
                                    {(['RECOMMENDED', 'NEUTRAL', 'AVOID'] as const).map((v) => (
                                        <TouchableOpacity
                                            key={v}
                                            style={[
                                                styles.verdictBtn,
                                                formData.verdict === v && styles.verdictBtnActive,
                                                formData.verdict === v && v === 'RECOMMENDED' && styles.verdictOk,
                                                formData.verdict === v && v === 'AVOID' && styles.verdictAvoid,
                                                formData.verdict === v && v === 'NEUTRAL' && styles.verdictNeutral,
                                            ]}
                                            onPress={() => setFormData({ ...formData, verdict: v })}
                                        >
                                            <Text style={[
                                                styles.verdictText,
                                                formData.verdict === v && styles.verdictTextActive
                                            ]}>{v === 'RECOMMENDED' ? t('verdict_safe').toUpperCase() : (v === 'NEUTRAL' ? t('verdict_neutral').toUpperCase() : t('verdict_avoid').toUpperCase())}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('product_name').toUpperCase()}</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="cube-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={formData.itemName}
                                        onChangeText={(val) => setFormData({ ...formData, itemName: val })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('owner_company').toUpperCase()}</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="business-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={formData.ownerCompany}
                                        onChangeText={(val) => setFormData({ ...formData, ownerCompany: val })}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('country').toUpperCase()}</Text>
                                <TouchableOpacity
                                    style={styles.inputWrapper}
                                    onPress={() => setIsCountryPickerOpen(true)}
                                >
                                    <Text style={styles.flagDisplay}>{formData.ownerFlag || '🏳️'}</Text>
                                    <Text style={[styles.input, !formData.ownerCountry && { color: '#94A3B8' }]}>
                                        {formData.ownerCountry || t('select_country')}
                                    </Text>
                                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Ionicons name="save-outline" size={20} color="#fff" />
                                <Text style={styles.saveText}>{t('save_and_validate')}</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>

            {/* Nested Country Picker Modal */}
            <Modal
                visible={isCountryPickerOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsCountryPickerOpen(false)}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.dismiss} onPress={() => setIsCountryPickerOpen(false)} activeOpacity={1} />
                    <View style={[styles.container, { maxHeight: '80%' }]}>
                        <View style={styles.content}>
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('select_country')}</Text>
                                <TouchableOpacity onPress={() => setIsCountryPickerOpen(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchWrapper}>
                                <Ionicons name="search" size={18} color="#94A3B8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={t('search_country_placeholder')}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                                {filteredCountries.map((country) => (
                                    <TouchableOpacity
                                        key={country.code}
                                        style={styles.countryItem}
                                        onPress={() => handleSelectCountry(country)}
                                    >
                                        <Text style={styles.countryFlagItem}>{country.flag}</Text>
                                        <Text style={styles.countryNameItem}>{country.name}</Text>
                                        {formData.ownerCountryCode === country.code && (
                                            <Ionicons name="checkmark" size={20} color="#0F172A" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                                {filteredCountries.length === 0 && (
                                    <View style={styles.emptySearch}>
                                        <Text style={styles.emptySearchText}>{t('no_countries_found')}</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    dismiss: {
        flex: 1,
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '90%',
    },
    content: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    closeBtn: {
        padding: 4,
    },
    form: {
        overflow: 'visible',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1.2,
        marginBottom: 8,
        marginLeft: 4,
    },
    verdictGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    verdictBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    verdictBtnActive: {
        borderWidth: 1.5,
    },
    verdictOk: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
    verdictAvoid: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    verdictNeutral: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
    verdictText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    verdictTextActive: {
        color: '#1E293B',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 50,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#0F172A',
        height: 60,
        borderRadius: 18,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    saveText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    flagDisplay: {
        fontSize: 20,
        marginRight: 10,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#1E293B',
    },
    countryList: {
        maxHeight: 400,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    countryFlagItem: {
        fontSize: 24,
        marginRight: 14,
    },
    countryNameItem: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    emptySearch: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptySearchText: {
        color: '#94A3B8',
        fontSize: 14,
    }
});

export default EditScanModal;
