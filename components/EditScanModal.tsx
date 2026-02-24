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
import { ScanResult } from '../types';

interface EditScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedResult: ScanResult) => void;
    scanResult: ScanResult | null;
}

const EditScanModal: React.FC<EditScanModalProps> = ({ isOpen, onClose, onSave, scanResult }) => {
    const [formData, setFormData] = useState<Partial<ScanResult>>({});

    useEffect(() => {
        if (scanResult) {
            setFormData({
                itemName: scanResult.itemName,
                ownerCompany: scanResult.ownerCompany,
                ownerCountry: scanResult.ownerCountry,
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

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
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
                            <Text style={styles.title}>Edit Details</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>STATUS</Text>
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
                                            ]}>{v === 'RECOMMENDED' ? 'OK' : v}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>PRODUCT NAME</Text>
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
                                <Text style={styles.label}>OWNER COMPANY</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="business-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={formData.ownerCompany}
                                        onChangeText={(val) => setFormData({ ...formData, ownerCompany: val })}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 0.3 }]}>
                                    <Text style={styles.label}>FLAG</Text>
                                    <TextInput
                                        style={[styles.input, styles.flagInput]}
                                        value={formData.ownerFlag}
                                        onChangeText={(val) => setFormData({ ...formData, ownerFlag: val })}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 0.7 }]}>
                                    <Text style={styles.label}>COUNTRY</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="flag-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={formData.ownerCountry}
                                            onChangeText={(val) => setFormData({ ...formData, ownerCountry: val })}
                                        />
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Ionicons name="save-outline" size={20} color="#fff" />
                                <Text style={styles.saveText}>Save & Validate</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
        marginBottom: 24,
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
    flagInput: {
        height: 50,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        textAlign: 'center',
        fontSize: 20,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
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
    }
});

export default EditScanModal;
