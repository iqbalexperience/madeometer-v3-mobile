import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
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
        case 'show_status_banner': return 'shield-outline';
        case 'show_usa_meter': return 'bar-chart-outline';
        case 'show_political_meter': return 'business-outline';
        case 'show_shopping_options': return 'cart-outline';
        case 'show_alternatives': return 'sparkles-outline';
        default: return 'options-outline';
    }
}

const AppFeaturesModal: React.FC<AppFeaturesModalProps> = ({ isOpen, onClose, preferences, onToggle }) => {
    const { t, language } = useLanguage();

    if (!isOpen) return null;

    const features = preferences.filter(p => p.category === 'FEATURE');

    return (
        <Modal
            visible={isOpen}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t('features')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.featureList}>
                            {features.map(pref => {
                                const iconName = getIcon(pref.id) as any;
                                return (
                                    <View key={pref.id} style={styles.featureItem}>
                                        <View style={styles.featureInfo}>
                                            <View style={[styles.iconContainer, pref.active && styles.iconActive]}>
                                                <Ionicons
                                                    name={iconName}
                                                    size={22}
                                                    color={pref.active ? '#d35457' : '#94A3B8'}
                                                />
                                            </View>
                                            <Text style={styles.featureLabel}>{pref.label}</Text>
                                        </View>

                                        <Switch
                                            value={pref.active}
                                            onValueChange={() => onToggle(pref.id)}
                                            trackColor={{ false: '#E2E8F0', true: '#d35457' }}
                                            thumbColor="#fff"
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <Ionicons name="globe-outline" size={14} color="#94A3B8" />
                        <Text style={styles.footerText}>
                            App Language: <Text style={styles.footerValue}>{language.toUpperCase()}</Text>
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
    },
    scrollView: {
        maxHeight: 400,
    },
    scrollContent: {
        paddingBottom: 10,
    },
    featureList: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    featureInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    featureLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
        flex: 1,
    },
    footer: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    footerValue: {
        color: '#64748B',
        fontWeight: 'bold',
    },
});

export default AppFeaturesModal;
