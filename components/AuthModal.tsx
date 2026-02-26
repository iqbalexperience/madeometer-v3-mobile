/**
 * components/AuthModal.tsx
 *
 * Login / Register bottom-sheet modal.
 * Matches the web AuthModal but uses RN primitives.
 * Authentication is handled by better-auth/expo via lib/auth-client.ts.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: (email: string, password: string) => Promise<void>;
    onRegister: (name: string, email: string, password: string) => Promise<void>;
}

type AuthMode = 'LOGIN' | 'REGISTER';

const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onLogin, onRegister }) => {
    const { t } = useLanguage();

    const [mode, setMode] = useState<AuthMode>('LOGIN');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setError(null);
        setSuccess(null);
        setLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const switchMode = (next: AuthMode) => {
        setMode(next);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);
        if (!email.trim() || !password.trim()) {
            setError(t('email_password_required') ?? 'Email and password are required.');
            return;
        }
        if (mode === 'REGISTER' && !name.trim()) {
            setError(t('name_required') ?? 'Name is required.');
            return;
        }
        setLoading(true);
        try {
            if (mode === 'REGISTER') {
                await onRegister(name.trim(), email.trim(), password);
                setSuccess(t('register_success') ?? 'Account created successfully!');
            } else {
                await onLogin(email.trim(), password);
                setSuccess(t('login_success') ?? 'Logged in successfully!');
            }

            // Wait a moment for the success message to be seen before closing
            setTimeout(() => {
                resetForm();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message ?? 'An error occurred.');
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.kavWrapper}
                pointerEvents="box-none"
            >
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {mode === 'LOGIN' ? t('welcome_back') : t('create_account')}
                        </Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    {/* Feedback Banners */}
                    {error ? (
                        <View style={styles.errorBanner}>
                            <View style={styles.errorDot} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {success ? (
                        <View style={styles.successBanner}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.successText}>{success}</Text>
                        </View>
                    ) : null}

                    {/* Name (register only) */}
                    {mode === 'REGISTER' && (
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('full_name') ?? 'Full Name'}</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="person-outline" size={18} color="#000000" style={styles.inputIcon} />
                                {/* <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor="#9ca3af"
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                    editable={!loading}
                                /> */}
                            </View>
                        </View>
                    )}

                    {/* Email */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>{t('email')}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={18} color="#000000" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                textContentType="emailAddress"
                                returnKeyType="next"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>{t('password')}</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={18} color="#000000" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="password"
                                textContentType="password"
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitBtn, (loading || success) && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading || !!success}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.textWhite} size="small" />
                        ) : (
                            <>
                                <Text style={styles.submitText}>
                                    {mode === 'LOGIN' ? t('sign_in') : t('sign_up')}
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color={Colors.textWhite} />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Mode switcher */}
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>
                            {mode === 'LOGIN' ? t('no_account') : t('have_account')}
                        </Text>
                        <TouchableOpacity
                            onPress={() => switchMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                            disabled={loading}
                        >
                            <Text style={styles.switchLink}>
                                {mode === 'LOGIN' ? t('sign_up') : t('sign_in')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Disclaimer */}
                    <Text style={styles.disclaimer}>{t('auth_disclaimer')}</Text>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    kavWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: Radius.xxl,
        borderTopRightRadius: Radius.xxl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: Typography.xxl,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: Radius.full,
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#10B981',
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    successText: {
        fontSize: Typography.sm,
        color: '#065f46',
        fontWeight: '600',
        flex: 1,
    },
    errorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ef4444',
    },
    errorText: {
        fontSize: Typography.sm,
        color: '#991b1b',
        fontWeight: '600',
        flex: 1,
    },
    field: {
        marginBottom: Spacing.md,
    },
    fieldLabel: {
        fontSize: Typography.xs,
        fontWeight: '700',
        color: '#4b5563',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
    },
    inputIcon: {
        marginRight: Spacing.sm,
        color: '#000000',
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: Typography.base,
        color: '#000000',
        fontWeight: '500',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.brand,
        borderRadius: Radius.md,
        paddingVertical: Spacing.lg,
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: {
        fontSize: Typography.base,
        fontWeight: '700',
        color: '#ffffff',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: Spacing.xl,
    },
    switchLabel: {
        fontSize: Typography.sm,
        color: '#4b5563',
    },
    switchLink: {
        fontSize: Typography.sm,
        fontWeight: '700',
        color: Colors.brand,
    },
    disclaimer: {
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 15,
    },
});

export default AuthModal;
