import { Ionicons } from '@expo/vector-icons';
import { BlurView } from "expo-blur";
import React, { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFeatureGate } from "../contexts/FeatureGateContext";
import { useLanguage } from "../contexts/LanguageContext";
import { FeatureKey, GateMode } from "../lib/features";

interface FeatureGateProps {
    feature: FeatureKey;
    mode?: GateMode;
    children: ReactNode;
    featureLabel?: string;
}

export function FeatureGate({
    feature,
    mode: modeProp,
    children,
    featureLabel,
}: FeatureGateProps) {
    const { getGateMode, openUpgradeDialog } = useFeatureGate();
    const { t } = useLanguage();

    const mode = modeProp ?? getGateMode(feature);
    const triggerUpgrade = () => openUpgradeDialog(featureLabel);

    if (mode === "allow") {
        return <>{children}</>;
    }

    if (mode === "hide") {
        return null;
    }

    if (mode === "message") {
        return (
            <TouchableOpacity onPress={triggerUpgrade} style={styles.messageBanner}>
                <View style={styles.lockIconCircle}>
                    <Ionicons name="lock-closed" size={14} color="#000" />
                </View>
                <View style={styles.messageText}>
                    <Text style={styles.messageTitle}>
                        {featureLabel ? `Unlock ${featureLabel}` : "Upgrade to unlock"}
                    </Text>
                    <Text style={styles.messageSub}>Available on Plus · Tap to see plans</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
        );
    }

    if (mode === "lock") {
        return (
            <TouchableOpacity onPress={triggerUpgrade} activeOpacity={0.9} style={styles.overlayContainer}>
                <View style={styles.lockedContent}>{children}</View>
                <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={12} color="#64748B" />
                </View>
            </TouchableOpacity>
        );
    }

    if (mode === "blur") {
        return (
            <TouchableOpacity onPress={triggerUpgrade} activeOpacity={0.9} style={styles.overlayContainer}>
                <View style={styles.lockedContent}>{children}</View>
                <BlurView intensity={30} style={styles.blurOverlay}>
                    <View style={styles.lockIconCircleLarge}>
                        <Ionicons name="lock-closed" size={18} color="#000" />
                    </View>
                    <Text style={styles.blurText}>Tap to unlock</Text>
                </BlurView>
            </TouchableOpacity>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    messageBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginVertical: 8,
    },
    lockIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    lockIconCircleLarge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    messageText: {
        flex: 1,
    },
    messageTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    messageSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    overlayContainer: {
        position: 'relative',
    },
    lockedContent: {
        opacity: 0.5,
    },
    lockBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        overflow: 'hidden',
    },
    blurText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
    }
});
