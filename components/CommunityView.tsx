import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Donor {
    id: string;
    name: string;
    amount: number;
    message?: string;
    badge: string;
}

interface CommunityViewProps {
    onClose?: () => void;
}

const { width } = Dimensions.get('window');

const CommunityView: React.FC<CommunityViewProps> = ({ onClose }) => {
    const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(10);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [donors, setDonors] = useState<Donor[]>([
        { id: '1', name: "Elena K.", amount: 50, badge: "Legend", message: "Keep up the great work! 🌍" },
        { id: '2', name: "Marcus T.", amount: 25, badge: "Supporter", message: "Love this app." },
        { id: '3', name: "Sarah L.", amount: 20, badge: "Supporter" },
        { id: '4', name: "David B.", amount: 15, badge: "Fan", message: "Transparency matters." },
        { id: '5', name: "Jenny W.", amount: 10, badge: "Fan" },
    ]);

    const handleDonate = () => {
        setIsSubmitting(true);
        const finalAmount = selectedAmount === 'custom' ? parseFloat(customAmount) : selectedAmount;
        if (!finalAmount || finalAmount <= 0) {
            setIsSubmitting(false);
            return;
        }

        // Simulate donation process
        setTimeout(() => {
            const newDonor: Donor = {
                id: Date.now().toString(),
                name: name.trim() || "Anonymous",
                amount: finalAmount,
                badge: finalAmount >= 50 ? "Legend" : finalAmount >= 20 ? "Supporter" : "Fan",
                message: message.trim() || undefined
            };
            setDonors(prev => [newDonor, ...prev]);
            setIsSubmitting(false);
            setMessage('');
            setName('');
            setSelectedAmount(10);
            setCustomAmount('');

            // Just linking for demo
            WebBrowser.openBrowserAsync('https://stripe.com').catch(err => console.error("Couldn't load page", err));
        }, 1500);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                )}

                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="heart" size={32} color="#d35457" />
                    </View>
                    <Text style={styles.title}>Support Our Mission</Text>
                    <Text style={styles.subtitle}>
                        Help us keep transparency free for everyone. Your contributions directly fund our AI costs and data research.
                    </Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>SELECT AMOUNT</Text>
                    <View style={styles.amountGrid}>
                        {[5, 10, 25].map((amt) => (
                            <TouchableOpacity
                                key={amt}
                                style={[styles.amtBtn, selectedAmount === amt && styles.amtBtnActive]}
                                onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                            >
                                <Text style={[styles.amtText, selectedAmount === amt && styles.amtTextActive]}>€{amt}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.amtBtn, selectedAmount === 'custom' && styles.amtBtnActive]}
                            onPress={() => setSelectedAmount('custom')}
                        >
                            <Text style={[styles.amtText, selectedAmount === 'custom' && styles.amtTextActive]}>Custom</Text>
                        </TouchableOpacity>
                    </View>

                    {selectedAmount === 'custom' && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.currencyPrefix}>€</Text>
                            <TextInput
                                style={styles.customInput}
                                placeholder="Enter amount"
                                keyboardType="numeric"
                                value={customAmount}
                                onChangeText={setCustomAmount}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <View style={[styles.inputContainer, styles.withIcon]}>
                            <Ionicons name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Your Name"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                        <View style={[styles.inputContainer, styles.withIcon, styles.textareaContainer]}>
                            <Ionicons name="chatbubble-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, styles.textarea]}
                                placeholder="Leave a comment (Optional)"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                maxLength={140}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.payBtn}
                        onPress={handleDonate}
                        disabled={isSubmitting}
                    >
                        <Ionicons name="card-outline" size={20} color="#fff" />
                        <Text style={styles.payBtnText}>
                            {isSubmitting ? 'Processing...' : `Pay €${selectedAmount === 'custom' ? customAmount || '0' : selectedAmount} with Card`}
                        </Text>
                        <Ionicons name="open-outline" size={14} color="#fff" style={{ opacity: 0.5 }} />
                    </TouchableOpacity>

                    <View style={styles.secureBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#94A3B8" />
                        <Text style={styles.secureText}>Secured by <Text style={{ fontWeight: '800' }}>Stripe</Text></Text>
                    </View>
                </View>

                <View style={styles.leaderboardHeader}>
                    <MaterialCommunityIcons name="trophy" size={24} color="#EAB308" />
                    <Text style={styles.leaderboardTitle}>Recent Supporters</Text>
                </View>

                <View style={styles.leaderboard}>
                    {donors.map((donor, idx) => (
                        <View key={donor.id} style={styles.donorCard}>
                            <View style={styles.donorTop}>
                                <View style={styles.donorInfo}>
                                    <View style={[
                                        styles.donorAvatar,
                                        donor.amount >= 50 ? styles.avatarGold : donor.amount >= 20 ? styles.avatarPurple : null
                                    ]}>
                                        <Text style={[
                                            styles.avatarText,
                                            donor.amount >= 50 ? styles.textGold : donor.amount >= 20 ? styles.textPurple : null
                                        ]}>{donor.name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.donorName}>{donor.name}</Text>
                                        <Text style={styles.donorBadge}>{donor.badge.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <View style={styles.amountBadge}>
                                    <Text style={styles.amountBadgeText}>€{donor.amount}</Text>
                                </View>
                            </View>
                            {donor.message && (
                                <View style={styles.donorMessage}>
                                    <View style={styles.messageTriangle} />
                                    <Text style={styles.messageText}>&quot;{donor.message}&quot;</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
                <View style={{ height: 100 }} />
            </View>
        </ScrollView>
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
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    form: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 30,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1,
        marginBottom: 12,
    },
    amountGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    amtBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    amtBtnActive: {
        backgroundColor: '#1E293B',
        borderColor: '#1E293B',
    },
    amtText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    amtTextActive: {
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 50,
        marginBottom: 12,
    },
    currencyPrefix: {
        fontWeight: 'bold',
        color: '#64748B',
        marginRight: 8,
    },
    customInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    withIcon: {
        paddingHorizontal: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    leaderboard: {
        marginTop: 10,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#000',
    },
    textareaContainer: {
        height: 80,
        alignItems: 'flex-start',
        paddingTop: 12,
    },
    textarea: {
        height: 60,
        textAlignVertical: 'top',
    },
    payBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#635BFF',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#635BFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginTop: 8,
    },
    payBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
    },
    secureText: {
        fontSize: 10,
        color: '#94A3B8',
    },
    leaderboardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    donorCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    donorTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    donorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    donorAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarGold: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
    },
    avatarPurple: {
        backgroundColor: '#EEF2FF',
        borderColor: '#E0E7FF',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
    textGold: { color: '#B45309' },
    textPurple: { color: '#4F46E5' },
    donorName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    donorBadge: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    amountBadge: {
        backgroundColor: '#FFF1F2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    amountBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#d35457',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    donorMessage: {
        marginTop: 12,
        marginLeft: 48,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    messageTriangle: {
        position: 'absolute',
        top: -6,
        left: 14,
        width: 10,
        height: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderColor: '#F1F5F9',
        transform: [{ rotate: '45deg' }],
    },
    messageText: {
        fontSize: 12,
        color: '#475569',
        fontStyle: 'italic',
    }
});

export default CommunityView;
