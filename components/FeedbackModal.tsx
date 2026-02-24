import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (type: string, message: string, email: string) => void;
    isSubmitting: boolean;
    context?: 'GENERAL' | 'SCAN';
    userEmail?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    context = 'GENERAL',
    userEmail
}) => {
    const [type, setType] = useState(context === 'SCAN' ? 'INACCURATE_RESULT' : 'GENERAL');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState(userEmail || '');

    useEffect(() => {
        if (userEmail) setEmail(userEmail);
    }, [userEmail]);

    const handleSubmit = () => {
        if (!message.trim() || !email.trim()) return;
        onSubmit(type, message, email);
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
                            <Text style={styles.title}>
                                {context === 'SCAN' ? 'Report Issue' : 'Send Feedback'}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>CATEGORY</Text>
                                <View style={styles.typeGrid}>
                                    {context === 'SCAN' ? (
                                        <TouchableOpacity
                                            style={[styles.typeBtn, type === 'INACCURATE_RESULT' && styles.typeBtnActive]}
                                            onPress={() => setType('INACCURATE_RESULT')}
                                        >
                                            <Ionicons name="alert-circle-outline" size={20} color={type === 'INACCURATE_RESULT' ? '#d35457' : '#94A3B8'} />
                                            <Text style={[styles.typeText, type === 'INACCURATE_RESULT' && styles.typeTextActive]}>Wrong Info</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.typeBtn, type === 'GENERAL' && styles.typeBtnActive]}
                                            onPress={() => setType('GENERAL')}
                                        >
                                            <Ionicons name="chatbubble-outline" size={20} color={type === 'GENERAL' ? '#3B82F6' : '#94A3B8'} />
                                            <Text style={[styles.typeText, type === 'GENERAL' && styles.typeTextActive]}>General</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.typeBtn, type === 'BUG' && styles.typeBtnActive]}
                                        onPress={() => setType('BUG')}
                                    >
                                        <Ionicons name="bug-outline" size={20} color={type === 'BUG' ? '#F59E0B' : '#94A3B8'} />
                                        <Text style={[styles.typeText, type === 'BUG' && styles.typeTextActive]}>App Bug</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={[styles.typeBtn, styles.fullWidth, type === 'FEATURE_REQUEST' && styles.typeBtnActive]}
                                    onPress={() => setType('FEATURE_REQUEST')}
                                >
                                    <Ionicons name="bulb-outline" size={20} color={type === 'FEATURE_REQUEST' ? '#8B5CF6' : '#94A3B8'} />
                                    <Text style={[styles.typeText, type === 'FEATURE_REQUEST' && styles.typeTextActive]}>Feature Request</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>EMAIL ADDRESS</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="your@email.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>MESSAGE</Text>
                                <TextInput
                                    style={styles.textarea}
                                    value={message}
                                    onChangeText={setMessage}
                                    placeholder="Describe the issue or share your thoughts..."
                                    multiline
                                    numberOfLines={5}
                                    textAlignVertical="top"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, (!message.trim() || isSubmitting) && styles.submitBtnDisabled]}
                                onPress={handleSubmit}
                                disabled={!message.trim() || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="send" size={18} color="#fff" />
                                        <Text style={styles.submitText}>Submit Feedback</Text>
                                    </>
                                )}
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
        maxHeight: '85%',
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
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1.2,
        marginBottom: 10,
        marginLeft: 4,
    },
    typeGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    typeBtn: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
    },
    fullWidth: {
        flex: 0,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    typeBtnActive: {
        backgroundColor: '#fff',
        borderColor: '#0F172A',
        borderWidth: 1.5,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    typeTextActive: {
        color: '#0F172A',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        height: 54,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    textarea: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        fontSize: 15,
        fontWeight: '500',
        color: '#1E293B',
        height: 120,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#d35457',
        height: 56,
        borderRadius: 16,
        marginTop: 10,
        shadowColor: '#d35457',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    }
});

export default FeedbackModal;
