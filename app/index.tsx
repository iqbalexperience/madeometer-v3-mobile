import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Import from our mobile-native files
import {
    analyzeImage,
    analyzeText,
    deleteScan,
    findProductAlternatives,
    findShoppingOptions,
    getGlobalPreferences,
    getPreferences,
    getScanHistory,
    saveFeedback,
    savePreferences,
    saveScan,
    uploadFile
} from '@/lib/api';
import { authClient, signIn, useSession } from '@/lib/auth-client';
import AuthModal from '../components/AuthModal';
import CartSummary from '../components/CartSummary';
import CommunityView from '../components/CommunityView';
import ConfirmationModal from '../components/ConfirmationModal';
import EditScanModal from '../components/EditScanModal';
import FeedbackModal from '../components/FeedbackModal';
import Header from '../components/Header';
import HistoryList from '../components/HistoryList';
import ProfileView from '../components/ProfileView';
import Scanner from '../components/Scanner';
import ScanResultCard from '../components/ScanResultCard';
import { useLanguage } from '../contexts/LanguageContext';
import {
    AppView,
    Preference,
    ScanResult, UserProfile
} from '../types';


// const { width } = Dimensions.get('window');

type Tab = 'home' | 'support' | 'history' | 'profile';

export default function App() {
    // const router = useRouter(); // Currently unused
    const { data: session, isPending: isSessionPending } = useSession();
    const { t } = useLanguage();

    // State
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [view, setView] = useState<AppView>(AppView.SCAN);

    // Data State
    const [history, setHistory] = useState<ScanResult[]>([]);
    const [currentResults, setCurrentResults] = useState<ScanResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
    const [preferences, setPreferences] = useState<Preference[]>([]);

    // UI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [activeModel, setActiveModel] = useState('madeometer-instant');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isHistoryFetched, setIsHistoryFetched] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isEditingScan, setIsEditingScan] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackContext, setFeedbackContext] = useState<'GENERAL' | 'SCAN'>('GENERAL');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isFindingAlternatives, setIsFindingAlternatives] = useState(false);
    const [isFindingShoppingOptions, setIsFindingShoppingOptions] = useState(false);
    const [loadingMessages] = useState<string[] | undefined>(undefined);
    const [subscription, setSubscription] = useState<any>(null);

    const authAttempted = useRef(false);

    // Initial Auth Sync
    useEffect(() => {
        if (!isSessionPending && session) {
            const profile: UserProfile = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || undefined,
                isAdmin: !!(session.user as any).role?.includes('admin'),
                isGuest: session.user.isAnonymous || false,
                joinedAt: session.user.createdAt ? new Date(session.user.createdAt).getTime() : Date.now()
            };
            setCurrentUser(profile);
            loadUserData(profile.id);
        } else if (!isSessionPending && !session && !authAttempted.current) {
            authAttempted.current = true;
            signIn.anonymous().catch(() => {
                authAttempted.current = false;
            });
        }
    }, [session, isSessionPending]);

    const loadUserData = async (userId: string) => {
        const prefs = await getPreferences(userId);
        if (prefs) setPreferences(prefs);
        else {
            const global = await getGlobalPreferences();
            setPreferences(global || []);
        }

        try {
            const { data } = await (authClient as any).subscription.list();
            const active = data?.find((sub: any) => sub.status === "active" || sub.status === "trialing");
            setSubscription(active || null);
        } catch (err) {
            console.error("Failed to fetch subscription", err);
        }
    };

    // Location
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    lat: loc.coords.latitude,
                    lng: loc.coords.longitude
                });
            }
        })();
    }, []);

    // History Loading
    useEffect(() => {
        if (activeTab === 'history' && currentUser?.id && !isHistoryFetched) {
            const loadHistory = async () => {
                setIsHistoryLoading(true);
                try {
                    const userHistory = await getScanHistory(currentUser.id);
                    setHistory(userHistory);
                    setIsHistoryFetched(true);
                } catch (error) {
                    console.error("Failed to load history", error);
                    Alert.alert("Error", "Failed to load history.");
                } finally {
                    setIsHistoryLoading(false);
                }
            };
            loadHistory();
        }
    }, [activeTab, currentUser?.id, isHistoryFetched]);

    // Handlers
    const handleDeleteScan = async (id: string) => {
        Alert.alert(
            "Delete Scan",
            "Are you sure you want to delete this scan?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteScan(id);
                            setHistory(prev => prev.filter(h => h.id !== id));
                            if (selectedResult?.id === id) {
                                setSelectedResult(null);
                                setView(AppView.SCAN);
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete scan.");
                        }
                    }
                }
            ]
        );
    };
    const handleCameraClick = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const uri = result.assets[0].uri;
            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setPreviewImage(uri);
            performScan(base64, 'IMAGE', { uri, name: 'scan.jpg', type: 'image/jpeg' });
        }
    };

    const handleGalleryClick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const uri = result.assets[0].uri;
            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setPreviewImage(uri);
            performScan(base64, 'IMAGE', { uri, name: 'gallery.jpg', type: 'image/jpeg' });
        }
    };

    const performScan = async (data: string, type: 'IMAGE' | 'TEXT', fileData?: { uri: string; name: string; type: string }) => {
        setIsAnalyzing(true);
        setStatusMessage(t('status_processing'));
        setView(AppView.SCAN);

        try {
            const activePrefs = preferences.filter(p => p.active);
            const lang = 'en'; // Should ideally sync with LanguageContext

            const results = type === 'IMAGE'
                ? await analyzeImage(data, activePrefs, activeModel, lang, userLocation)
                : await analyzeText(data, activePrefs, activeModel, lang, userLocation);

            const initialResults = results.map(r => ({
                ...r,
                imageUrl: data,
                userId: currentUser?.id
            }));

            setCurrentResults(initialResults);
            if (initialResults.length === 1) {
                setSelectedResult(initialResults[0]);
                setView(AppView.DETAILS);
            } else if (initialResults.length > 1) {
                setView(AppView.CART);
            }

            setIsAnalyzing(false);
            setPreviewImage(null);

            // Background Upload & Save
            (async () => {
                try {
                    let publicUrl = undefined;
                    if (type === 'IMAGE' && fileData) {
                        publicUrl = await uploadFile(fileData);
                    }

                    const finalResults = initialResults.map(r => ({
                        ...r,
                        imageUrl: (type === 'IMAGE' && publicUrl) ? publicUrl : r.imageUrl
                    }));

                    for (const res of finalResults) {
                        await saveScan(res);
                    }

                    // Sync local state with public URL
                    if (publicUrl) {
                        setCurrentResults(prev => prev.map(p => {
                            const match = finalResults.find(f => f.id === p.id);
                            return match ? { ...p, imageUrl: publicUrl } : p;
                        }));

                        setSelectedResult(prev => {
                            if (!prev) return null;
                            const match = finalResults.find(f => f.id === prev.id);
                            return match ? { ...prev, imageUrl: publicUrl } : prev;
                        });
                    }

                    // Refresh history
                    const updatedHistory = await getScanHistory(currentUser?.id);
                    setHistory(updatedHistory);
                    setIsHistoryFetched(true);
                } catch (e) {
                    console.error("Background processing failed", e);
                }
            })();
        } catch (error) {
            console.error(error);
            Alert.alert("Analysis failed", "Please try again.");
            setIsAnalyzing(false);
            setPreviewImage(null);
        }
    };

    const handleReanalyze = async (id: string, model: string) => {
        const item = history.find(h => h.id === id) || currentResults.find(r => r.id === id);
        if (!item) return;

        setView(AppView.SCAN);
        if (item.imageUrl?.startsWith('data:image')) {
            setPreviewImage(item.imageUrl);
        }

        setActiveModel(model);
        setIsAnalyzing(true);

        try {
            const activePrefs = preferences.filter(p => p.active);
            const lang = 'en';
            let results: ScanResult[] = [];

            if (item.imageUrl) {
                results = await analyzeImage(item.imageUrl, activePrefs, model, lang, userLocation);
            } else {
                results = await analyzeText(item.itemName, activePrefs, model, lang, userLocation);
            }

            if (results.length > 0) {
                const newResult = { ...results[0], id: item.id, userId: currentUser?.id, timestamp: Date.now(), imageUrl: item.imageUrl };
                await saveScan(newResult); // Using saveScan (which might act as update if ID matched in backend) or updateScan

                setHistory(prev => prev.map(p => p.id === id ? newResult : p));
                setCurrentResults(prev => prev.map(p => p.id === id ? newResult : p));
                setSelectedResult(newResult);
                setView(AppView.DETAILS);
            } else {
                setView(AppView.DETAILS);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Re-analysis failed");
            setView(AppView.DETAILS);
        } finally {
            setIsAnalyzing(false);
            setPreviewImage(null);
        }
    };

    const handleFindAlternatives = async (id: string, refresh: boolean = false) => {
        const item = history.find(h => h.id === id) || currentResults.find(r => r.id === id);
        if (!item) return;

        setIsFindingAlternatives(true);
        try {
            const activePrefs = preferences.filter(p => p.active);
            const lang = 'en';

            const alts = await findProductAlternatives(
                item.itemName,
                userLocation,
                activePrefs,
                lang,
                undefined, // currency
                undefined, // country
                item.id,
                currentUser?.id,
                refresh
            );

            const updated = { ...item, alternatives: alts };
            // Persist
            await saveScan(updated);

            setHistory(prev => prev.map(p => p.id === id ? updated : p));
            setCurrentResults(prev => prev.map(p => p.id === id ? updated : p));
            setSelectedResult(updated);
        } catch (e) {
            console.error(e);
        } finally {
            setIsFindingAlternatives(false);
        }
    };

    const handleFindShoppingOptions = async (id: string, refresh: boolean = false) => {
        const item = history.find(h => h.id === id) || currentResults.find(r => r.id === id);
        if (!item) return;

        setIsFindingShoppingOptions(true);
        try {
            const lang = 'en';
            const options = await findShoppingOptions(
                item.itemName,
                userLocation,
                lang,
                undefined,
                undefined,
                item.id,
                currentUser?.id,
                refresh
            );

            const updated = { ...item, shoppingOptions: options };
            await saveScan(updated);

            setHistory(prev => prev.map(p => p.id === id ? updated : p));
            setCurrentResults(prev => prev.map(p => p.id === id ? updated : p));
            setSelectedResult(updated);
        } catch (e) {
            console.error(e);
        } finally {
            setIsFindingShoppingOptions(false);
        }
    };

    const handleFeedbackSubmit = async (type: string, message: string, email: string) => {
        const enrichedText = `Type: ${type}\nScan ID: ${selectedResult?.id || 'N/A'}\n\n${message}`;

        const payload = {
            email,
            text: enrichedText,
            source: selectedResult ? `Scan: ${selectedResult.itemName}` : 'General App Feedback',
            images: selectedResult?.imageUrl ? [selectedResult.imageUrl] : []
        };

        try {
            await saveFeedback(payload);
            setIsFeedbackOpen(false);
            Alert.alert("Success", "Feedback sent! Thank you.");
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to send feedback.");
        }
    };

    const handleTogglePreference = (id: string) => {
        setPreferences(prev => {
            const updated = prev.map(p =>
                p.id === id ? { ...p, active: !p.active } : p
            );
            savePreferences(updated, currentUser?.id);
            return updated;
        });
    };

    const handleAddPreference = (label: string) => {
        const newPref: Preference = {
            id: Date.now().toString(),
            label,
            active: true,
            isCustom: true,
            category: 'CRITERIA'
        };
        setPreferences(prev => {
            const updated = [newPref, ...prev];
            savePreferences(updated, currentUser?.id);
            return updated;
        });
    };

    const handleUpdatePreference = (id: string, label: string) => {
        setPreferences(prev => {
            const updated = prev.map(p =>
                p.id === id ? { ...p, label } : p
            );
            savePreferences(updated, currentUser?.id);
            return updated;
        });
    };

    const handleDeletePreference = (id: string) => {
        setPreferences(prev => {
            const updated = prev.filter(p => p.id !== id);
            savePreferences(updated, currentUser?.id);
            return updated;
        });
    };

    const handleSelectResult = async (item: ScanResult) => {
        setSelectedResult(item);
        setView(AppView.DETAILS);
    };

    const handleSearch = (query: string) => {
        performScan(query, 'TEXT');
    };

    const renderBottomNav = () => (
        <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab('home'); setView(AppView.SCAN); }}>
                <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={24} color={activeTab === 'home' ? '#d35457' : '#94A3B8'} />
                <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>{t('tab_home')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab('support'); setView(AppView.SUPPORT); }}>
                <Ionicons name={activeTab === 'support' ? 'heart' : 'heart-outline'} size={24} color={activeTab === 'support' ? '#d35457' : '#94A3B8'} />
                <Text style={[styles.navText, activeTab === 'support' && styles.navTextActive]}>{t('tab_support')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItemCenter} onPress={handleCameraClick}>
                <View style={styles.scanBtnOuter}>
                    <Ionicons name="camera" size={28} color="#fff" />
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab('history'); setView(AppView.HISTORY); }}>
                <Ionicons name={activeTab === 'history' ? 'time' : 'time-outline'} size={24} color={activeTab === 'history' ? '#d35457' : '#94A3B8'} />
                <Text style={[styles.navText, activeTab === 'history' && styles.navTextActive]}>{t('tab_history')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => { setActiveTab('profile'); setView(AppView.PROFILE); }}>
                <Ionicons name={activeTab === 'profile' ? 'person' : 'person-outline'} size={24} color={activeTab === 'profile' ? '#d35457' : '#94A3B8'} />
                <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>{t('tab_profile')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <Header
                onHome={() => { setActiveTab('home'); setView(AppView.SCAN); }}
                activeModel={activeModel}
                onModelChange={setActiveModel}
                subscription={subscription}
                isAdmin={currentUser?.isAdmin}
            />

            {/* Content */}
            <View style={styles.content}>
                {view === AppView.HISTORY && (
                    <HistoryList
                        history={history}
                        isLoading={isHistoryLoading}
                        onSelect={handleSelectResult}
                        onSelectGroup={(items) => {
                            setCurrentResults(items);
                            setView(AppView.CART);
                        }}
                        onDelete={handleDeleteScan}
                    />
                )}

                {view === AppView.SCAN && (
                    <Scanner
                        isAnalyzing={isAnalyzing}
                        previewImage={previewImage}
                        onCameraClick={handleCameraClick}
                        onGalleryClick={handleGalleryClick}
                        onSearch={handleSearch}
                        activeModel={activeModel}
                        onSupportClick={() => { setActiveTab('support'); setView(AppView.SUPPORT); }}
                        loadingMessages={loadingMessages}
                    />
                )}

                {view === AppView.DETAILS && selectedResult && (
                    <ScanResultCard
                        result={selectedResult}
                        onBack={() => {
                            if (currentResults.length > 1) setView(AppView.CART);
                            else if (activeTab === 'history') setView(AppView.HISTORY);
                            else setView(AppView.SCAN);
                        }}
                        onDelete={handleDeleteScan}
                        isAdmin={currentUser?.isAdmin}
                        onReanalyze={handleReanalyze}
                        onFindAlternatives={handleFindAlternatives}
                        onFindShoppingOptions={handleFindShoppingOptions}
                        isFindingAlternatives={isFindingAlternatives}
                        isFindingShoppingOptions={isFindingShoppingOptions}
                        showUsaMeter={preferences.find(p => p.id === 'show_usa_meter')?.active}
                        showPoliticalMeter={preferences.find(p => p.id === 'show_political_meter')?.active}
                        onFeedback={() => { setFeedbackContext('SCAN'); setIsFeedbackOpen(true); }}
                    />
                )}

                {view === AppView.CART && currentResults.length > 0 && (
                    <CartSummary
                        results={currentResults}
                        onSelectResult={handleSelectResult}
                        onBack={() => {
                            if (activeTab === 'history') setView(AppView.HISTORY);
                            else setView(AppView.SCAN);
                        }}
                        activePreferences={preferences}
                    />
                )}

                {view === AppView.PROFILE && (
                    <ProfileView
                        user={currentUser}
                        preferences={preferences}
                        onToggle={handleTogglePreference}
                        onAdd={handleAddPreference}
                        onUpdate={handleUpdatePreference}
                        onDelete={handleDeletePreference}
                        onBack={() => { setActiveTab('home'); setView(AppView.SCAN); }}
                        onLogout={async () => {
                            await authClient.signOut();
                            setCurrentUser(null);
                            setSubscription(null);
                        }}
                        onAuthRequest={() => setIsAuthModalOpen(true)}
                        subscription={subscription}
                    />
                )}
                {view === AppView.SUPPORT && (
                    <CommunityView onClose={() => { setActiveTab('home'); setView(AppView.SCAN); }} />
                )}
            </View>

            {/* Modals */}
            <AuthModal
                visible={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onLogin={async () => setIsAuthModalOpen(false)}
                onRegister={async () => setIsAuthModalOpen(false)}
            />

            <EditScanModal
                isOpen={isEditingScan}
                onClose={() => setIsEditingScan(false)}
                scanResult={selectedResult}
                onSave={(updated) => {
                    setSelectedResult(updated);
                    setIsEditingScan(false);
                }}
            />

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                isSubmitting={false}
                onSubmit={handleFeedbackSubmit}
                userEmail={currentUser?.email}
                context={feedbackContext}
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={() => { }}
                title="Delete Item"
                message="Are you sure you want to delete this?"
            />

            {/* Bottom Nav */}
            {renderBottomNav()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoMark: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#d35457',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 22,
    },
    appName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    modelSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    adminBadge: {
        backgroundColor: '#000',
        borderColor: '#EAB308',
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    adminBadgeText: {
        color: '#EAB308',
        fontSize: 8,
        fontWeight: '800',
    },
    langSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    langText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingBottom: Platform.OS === 'ios' ? 25 : 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navItemCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -35,
    },
    scanBtnOuter: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#d35457',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#d35457',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    navText: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 4,
        fontWeight: '500',
    },
    navTextActive: {
        color: '#000',
        fontWeight: '700',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
