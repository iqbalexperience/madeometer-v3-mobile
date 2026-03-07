import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSession } from '../lib/auth-client';
import DonationView from './DonationView';
import TipsView from './TipsView';

interface CommunityViewProps {
    onClose?: () => void;
}

const CommunityViewContent: React.FC<CommunityViewProps> = ({ onClose }) => {
    const { plan, isLoading: isCheckingSubscription } = useFeatureGate();
    const isPaidUser = plan === 'plus';
    const { data: session } = useSession();
    const { t } = useLanguage();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                )}

                {isCheckingSubscription ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#d35457" />
                        <Text style={styles.loadingText}>{t('checking_membership').toUpperCase()}</Text>
                    </View>
                ) : isPaidUser ? (
                    <TipsView />
                ) : (
                    <DonationView session={session} />
                )}
            </View>
        </ScrollView>
    );
};

const CommunityView: React.FC<CommunityViewProps> = (props) => {
    return (
        <CommunityViewContent {...props} />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    card: {
        padding: 20,
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        gap: 16,
    },
    loadingText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94A3B8',
        letterSpacing: 2,
    },
});

export default CommunityView;
