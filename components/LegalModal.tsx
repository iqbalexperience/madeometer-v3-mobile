import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'TERMS' | 'PRIVACY'>('TERMS');
    const { t } = useLanguage();

    const Section = ({ title, children }: { title: string; children?: React.ReactNode }) => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>{title}</Text>
            <Text style={styles.text}>{children}</Text>
        </View>
    );

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t('legal_info')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('TERMS')}
                            style={[styles.tab, activeTab === 'TERMS' && styles.activeTab]}
                        >
                            <Ionicons
                                name="document-text-outline"
                                size={18}
                                color={activeTab === 'TERMS' ? '#000' : '#64748B'}
                            />
                            <Text style={[styles.tabText, activeTab === 'TERMS' && styles.activeTabText]}>
                                {t('terms_of_use')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('PRIVACY')}
                            style={[styles.tab, activeTab === 'PRIVACY' && styles.activeTab]}
                        >
                            <Ionicons
                                name="lock-closed-outline"
                                size={18}
                                color={activeTab === 'PRIVACY' ? '#000' : '#64748B'}
                            />
                            <Text style={[styles.tabText, activeTab === 'PRIVACY' && styles.activeTabText]}>
                                {t('privacy_policy')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {activeTab === 'TERMS' ? (
                            <View>
                                <Text style={styles.sectionHeading}>1. Introduction</Text>
                                <Text style={styles.text}>
                                    Welcome to Made O'Meter, a non-profit application designed to help users identify the origin of products and brands through AI-powered analysis.
                                    {"\n\n"}
                                    These Terms of Use govern your use of our application and services. By accessing or using Made O'Meter, you agree to be bound by these terms.
                                </Text>

                                <Text style={styles.sectionHeading}>2. Acceptance of Terms</Text>
                                <Text style={styles.text}>
                                    By using Made O'Meter, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
                                    {"\n\n"}
                                    If you do not agree with any part of these terms, you may not use our services.
                                </Text>

                                <Text style={styles.sectionHeading}>3. Use of Service</Text>
                                <Text style={styles.text}>
                                    Made O'Meter is provided as-is and is intended for personal, non-commercial use. You agree to use the application in compliance with all applicable laws and regulations.
                                    {"\n\n"}
                                    You may not:{"\n"}
                                    • Use the service for any illegal purpose.{"\n"}
                                    • Attempt to reverse engineer, decompile, or disassemble the app.{"\n"}
                                    • Use automated systems to access the service without permission.{"\n"}
                                    • Upload malicious content.
                                </Text>

                                <Text style={styles.sectionHeading}>4. User Content</Text>
                                <Text style={styles.text}>
                                    When you upload images or other content to Made O'Meter, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process that content for the purpose of providing our services.
                                    {"\n\n"}
                                    You represent and warrant that:{"\n"}
                                    • You own or have the necessary rights to the content you upload.{"\n"}
                                    • Your content does not violate the privacy rights, publicity rights, copyright, or other rights of any person.
                                </Text>

                                <Text style={styles.sectionHeading}>5. Disclaimers</Text>
                                <Text style={styles.text}>
                                    Made O'Meter is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the reliability, accuracy, or availability of the application.
                                    {"\n\n"}
                                    To the fullest extent permitted by law, we disclaim all warranties and liability related to your use of Made O'Meter.
                                </Text>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.sectionHeading}>1. Introduction</Text>
                                <Text style={styles.text}>
                                    Made O'Meter is a non-profit, private application. We are committed to protecting your privacy and handling your data with transparency and care.
                                </Text>

                                <Text style={styles.sectionHeading}>2. Information We Collect</Text>
                                <Text style={styles.text}>
                                    • Images you upload for analysis{"\n"}
                                    • Device information and usage data{"\n"}
                                    • IP address and general location data{"\n"}
                                    • Feedback or corrections you provide
                                </Text>

                                <Text style={styles.sectionHeading}>3. How We Use Data</Text>
                                <Text style={styles.text}>
                                    We use the information to provide AI analysis, improve our services, and prevent unauthorized use. We do not sell your personal information.
                                </Text>

                                <Text style={styles.sectionHeading}>4. Information Sharing</Text>
                                <Text style={styles.text}>
                                    We may share information with service providers who help us operate the application or to comply with legal obligations.
                                </Text>

                                <Text style={styles.sectionHeading}>5. Data Retention</Text>
                                <Text style={styles.text}>
                                    We retain your information for as long as necessary to provide our services. You may request deletion of your data by contacting us.
                                </Text>

                                <Text style={styles.sectionHeading}>6. Contact Us</Text>
                                <Text style={styles.text}>
                                    If you have concerns, contact us at:{"\n"}
                                    <Text style={styles.boldText}>support@madeometer.com</Text>
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.understandBtn} onPress={onClose}>
                            <Text style={styles.understandText}>{t('i_understand')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    closeBtn: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
        margin: 20,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    text: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    boldText: {
        fontWeight: 'bold',
        color: '#d35457',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#F8FAFC',
    },
    understandBtn: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    understandText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
});

export default LegalModal;
