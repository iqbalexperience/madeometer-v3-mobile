import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScannerProps {
    isAnalyzing: boolean;
    previewImage?: string | null;
    onCameraClick: () => void;
    onGalleryClick: () => void;
    onSearch: (query: string) => void;
    activeModel?: string;
    onSupportClick: () => void;
    loadingMessages?: string[];
}

const Scanner: React.FC<ScannerProps> = ({
    isAnalyzing,
    previewImage,
    onCameraClick,
    onGalleryClick,
    onSearch,
    activeModel = 'madeometer-instant',
    onSupportClick,
    loadingMessages
}) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState("Connecting...");
    const [searchText, setSearchText] = useState("");
    const [elapsedTime, setElapsedTime] = useState(0);

    // Animation Values
    const spinAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scanlineAnim = useRef(new Animated.Value(0)).current;

    const safeModel = activeModel || 'madeometer-instant';
    const isSuperFast = safeModel === 'madeometer-superfast';
    const isInstant = safeModel === 'madeometer-instant';

    // Status Rotation & Timer
    useEffect(() => {
        if (isAnalyzing) {
            let defaultMessages = [
                t('status_processing'),
                t('status_identifying'),
                t('status_verifying'),
                t('status_hierarchy'),
                t('status_ethics'),
                t('status_alternatives'),
                t('status_finalizing')
            ];

            if (isInstant) {
                defaultMessages = ["Snapping...", "Identifying...", "Checking Context...", "Done."];
            }

            const messages = loadingMessages || defaultMessages;
            let i = 0;
            setStatus(messages[0]);

            const intervalTime = isInstant || isSuperFast ? 1000 : 1500;
            const messageInterval = setInterval(() => {
                i++;
                if (i < messages.length) setStatus(messages[i]);
            }, intervalTime);

            const startTime = Date.now();
            const timerInterval = setInterval(() => {
                setElapsedTime((Date.now() - startTime) / 1000);
            }, 50); // 50ms for smooth decimals like web

            // Start Animations
            Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: isInstant ? 300 : isSuperFast ? 500 : 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanlineAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanlineAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            ).start();

            return () => {
                clearInterval(messageInterval);
                clearInterval(timerInterval);
                spinAnim.setValue(0);
                pulseAnim.setValue(1);
                scanlineAnim.setValue(0);
            };
        } else {
            setElapsedTime(0);
        }
    }, [isAnalyzing, safeModel, isInstant, isSuperFast, loadingMessages, t]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const scanline = scanlineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-80, 80],
    });

    const getColors = () => {
        if (isInstant) return { primary: '#22D3EE', secondary: '#3B82F6', text: '#CFFAFE' };
        if (isSuperFast) return { primary: '#EF4444', secondary: '#F97316', text: '#FEE2E2' };
        return { primary: '#FBBF24', secondary: '#F59E0B', text: '#FEF3C7' };
    };

    const colors = getColors();

    const renderAnalyzing = () => (
        <View style={styles.analyzingOverlay}>
            {previewImage && (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: previewImage }} style={styles.previewBlur} blurRadius={10} />
                    <View style={styles.previewOverlay} />
                </View>
            )}

            <View style={styles.loaderContainer}>
                {/* Outer spin circle */}
                <Animated.View style={[styles.spinOuter, { transform: [{ rotate: spin }] }]}>
                    <View style={[styles.spinPart, { backgroundColor: colors.primary }]} />
                </Animated.View>

                {/* Inner counter-spin circle */}
                <Animated.View style={[styles.spinInner, { transform: [{ rotate: spin }] }]}>
                    <View style={[styles.spinPartInner, { backgroundColor: colors.secondary }]} />
                </Animated.View>

                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]} />

                <View style={styles.iconContainer}>
                    {isInstant ? (
                        <MaterialCommunityIcons name="lightning-bolt" size={40} color="#fff" />
                    ) : isSuperFast ? (
                        <MaterialCommunityIcons name="rocket-launch" size={32} color="#fff" />
                    ) : (
                        <Ionicons name="flash" size={32} color="#fff" />
                    )}
                </View>

                {/* Scanline Effect */}
                <Animated.View style={[styles.scanline, { transform: [{ translateY: scanline }], backgroundColor: colors.primary + '80' }]} />
            </View>

            <View style={styles.statusBox}>
                <Text style={styles.statusText}>{status}</Text>
                <Text style={[styles.timerText, { color: isInstant ? colors.text : 'rgba(255,255,255,0.9)' }]}>
                    {elapsedTime.toFixed(1)}<Text style={styles.timerUnit}>s</Text>
                </Text>
                <View style={[styles.modeBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.modeText, { color: colors.primary }]}>
                        {isInstant ? t('mode_instant') : isSuperFast ? t('mode_superfast') : t('mode_flash')}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {isAnalyzing && renderAnalyzing()}

            <View style={styles.mainCard}>
                <View style={styles.cameraFrame}>
                    <View style={styles.cameraIconBg}>
                        <Ionicons name="camera-outline" size={40} color="#94A3B8" />
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.primaryBtn} onPress={onCameraClick} activeOpacity={0.8}>
                            <Ionicons name="camera" size={20} color="#fff" />
                            <Text style={styles.primaryBtnText}>{t('scan_btn')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryBtn} onPress={onGalleryClick} activeOpacity={0.8}>
                            <Ionicons name="image-outline" size={20} color="#1E293B" />
                            <Text style={styles.secondaryBtnText}>{t('upload_btn')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchSection}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('search_placeholder')}
                            placeholderTextColor="#94A3B8"
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={() => searchText.trim() && onSearch(searchText.trim())}
                        />
                        {searchText.trim().length > 0 && (
                            <TouchableOpacity
                                style={[styles.searchActionBtn, { backgroundColor: '#6366F1' }]} // Indigo matching web
                                onPress={() => onSearch(searchText.trim())}
                            >
                                <Ionicons name="arrow-forward" size={16} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <TouchableOpacity style={styles.supportBtn} onPress={onSupportClick} activeOpacity={0.8}>
                    <Ionicons name="heart" size={20} color="#1a401d" />
                    <Text style={styles.supportBtnText}>{t('support_btn')}</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerTitle}>{t('tagline_title')}</Text>
                    <Text style={styles.footerDesc}>{t('tagline_desc')}</Text>
                    <Text style={styles.thanksLabel}>{t('special_thanks')}</Text>
                    <TouchableOpacity
                        onPress={() => WebBrowser.openBrowserAsync('https://plasticchange.dk/')}
                        style={styles.thanksLink}
                    >
                        <Image
                            source={require('../assets/images/logo_plastic_change.svg')}
                            style={styles.thanksLogo}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mainCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 24,
    },
    analyzingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F172A',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    previewBlur: {
        width: '100%',
        height: '100%',
    },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
    },
    loaderContainer: {
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    spinOuter: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'absolute',
    },
    spinInner: {
        width: 144,
        height: 144,
        borderRadius: 72,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'absolute',
    },
    spinPart: {
        position: 'absolute',
        top: 0,
        left: 40,
        right: 40,
        height: 2,
        borderRadius: 1,
    },
    spinPartInner: {
        position: 'absolute',
        bottom: 0,
        left: 36,
        right: 36,
        height: 2,
        borderRadius: 1,
    },
    pulseCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        position: 'absolute',
    },
    iconContainer: {
        zIndex: 2,
    },
    scanline: {
        position: 'absolute',
        width: 120,
        height: 1,
        shadowColor: '#818CF8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
    },
    statusBox: {
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '300',
        letterSpacing: 1,
        marginBottom: 12,
        minHeight: 24,
    },
    timerText: {
        fontSize: 48,
        fontWeight: '200',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    timerUnit: {
        fontSize: 18,
        opacity: 0.5,
    },
    modeBadge: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    cameraFrame: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    cameraIconBg: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    actionRow: {
        width: '100%',
        gap: 12,
    },
    primaryBtn: {
        backgroundColor: '#1E293B',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryBtn: {
        backgroundColor: '#fff',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    secondaryBtnText: {
        color: '#1E293B',
        fontSize: 14,
        fontWeight: '600',
    },
    searchSection: {
        marginBottom: 24,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#1E293B',
    },
    searchActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    supportBtn: {
        backgroundColor: '#d0e9cf',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    supportBtnText: {
        color: '#1a401d',
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
    },
    footerTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#000',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    footerDesc: {
        fontSize: 11,
        color: '#64748B',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 16,
        marginBottom: 16,
    },
    thanksLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    thanksLink: {
        opacity: 0.8,
    },
    thanksLogo: {
        width: 140,
        height: 32,
        resizeMode: 'contain',
    }
});

export default Scanner;

