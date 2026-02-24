
import React, { useState, useEffect, useRef } from 'react';
import {
    ScanResult, UserProfile, Preference, Feedback, AppView
} from './types';
import {
    getScanHistory, saveScan, deleteScan,
    updateScan, savePreferences, getPreferences,
    saveFeedback, getGlobalPreferences
} from './services/database';
import { analyzeImage, analyzeText, findProductAlternatives, findShoppingOptions } from './services/geminiService';
import { useLanguage } from './contexts/LanguageContext';
import { useSession, signIn, signUp, signOut, authClient } from '@/lib/auth-client';
import { useMinioUpload } from '@/hooks/upload';

// Components
import Header from './components/Header';
import BottomNavigation, { Tab } from './components/BottomNavigation';
import Scanner from './components/Scanner';
import ScanResultCard from './components/ScanResultCard';
import CartSummary from './components/CartSummary';
import HistoryList from './components/HistoryList';
import ProfileView from './components/ProfileView';
import CommunityView from './components/CommunityView';
import AuthModal from './components/AuthModal';
import EditScanModal from './components/EditScanModal';
import FeedbackModal from './components/FeedbackModal';
import ConfirmationModal from './components/ConfirmationModal';

// Image Resizer Utility
const resizeImage = (file: File, maxDimension: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

const App: React.FC = () => {
    // Access global context settings
    const { currency, shoppingCountry, language, t, isInitialLoading } = useLanguage();

    // Session Management
    const { data: session, isPending: isSessionPending, refetch } = useSession();

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
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [activeModel, setActiveModel] = useState('madeometer-instant');
    const [loadingMessages, setLoadingMessages] = useState<string[] | undefined>(undefined);
    const [subscription, setSubscription] = useState<any>(null);

    // Default Location: Copenhagen, Denmark (Lat: 55.6761, Lng: 12.5683)
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | undefined>({ lat: 55.6761, lng: 12.5683 });

    // Modals
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingScan, setEditingScan] = useState<ScanResult | null>(null);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackContext, setFeedbackContext] = useState<'GENERAL' | 'SCAN'>('GENERAL');
    const [isFindingAlternatives, setIsFindingAlternatives] = useState(false);
    const [isFindingShoppingOptions, setIsFindingShoppingOptions] = useState(false); // New Loading State
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isHistoryFetched, setIsHistoryFetched] = useState(false);



    const { uploadFile } = useMinioUpload();

    // Delete Modal State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

    // Preference Loading Logic
    const refreshPreferences = async (userId: string) => {
        const userPrefs = await getPreferences(userId);

        if (userPrefs) {
            setPreferences(userPrefs);
        } else {
            // Fallback to global defaults if no user data found (e.g. first time)
            const globalPrefs = await getGlobalPreferences();
            setPreferences(globalPrefs);
        }
    };


    const authAttempted = useRef(false);

    // Sync Session to Current User Profile
    useEffect(() => {
        if (!isSessionPending && session) {
            const profile: UserProfile = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name || undefined,
                isAdmin: !!session.user.role?.includes('admin'),
                isGuest: session.user.isAnonymous || false,
                joinedAt: session.user.createdAt ? new Date(session.user.createdAt).getTime() : Date.now()
            };
            setCurrentUser(profile);

            // Trigger data loading for the user
            const loadUserData = async () => {
                await refreshPreferences(profile.id);
                try {
                    const { data } = await authClient.subscription.list();
                    const active = data?.find(sub => sub.status === "active" || sub.status === "trialing");
                    setSubscription(active || null);
                } catch (err) {
                    console.error("Failed to fetch subscription", err);
                }
            };
            loadUserData();
        } else if (!isSessionPending && !session && !authAttempted.current) {
            // No session, trigger anonymous sign in
            authAttempted.current = true;
            signIn.anonymous().catch(() => {
                authAttempted.current = false;
            });
        }
    }, [session, isSessionPending]);

    // Defer history loading until the history tab is active
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
                } finally {
                    setIsHistoryLoading(false);
                }
            };
            loadHistory();
        }
    }, [activeTab, currentUser?.id, isHistoryFetched]);



    // Initialize
    useEffect(() => {
        // Get Location for Better Grounding, fallback to default (Denmark) if failed
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Location access denied or failed, using default (Denmark)", error);
                }
            );
        }
    }, []);

    // Auto-enable Political Score for US Guests
    useEffect(() => {
        if (userLocation && currentUser?.isGuest) {
            // Approx USA Bounds: Lat 24-50, Lng -125 to -66
            const isUSA = userLocation.lat > 24 && userLocation.lat < 50 && userLocation.lng > -125 && userLocation.lng < -66;

            if (isUSA) {
                setPreferences(prev => {
                    const polMeter = prev.find(p => p.id === 'show_political_meter');
                    // Only enable if it exists and is currently inactive
                    if (polMeter && !polMeter.active) {
                        const updated = prev.map(p => p.id === 'show_political_meter' ? { ...p, active: true } : p);
                        // Persist change for this session
                        savePreferences(updated, currentUser.id);
                        return updated;
                    }
                    return prev;
                });
            }
        }
    }, [userLocation, currentUser]);

    const handleRequestLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Location access denied or failed", error);
                    alert("Could not access location. Defaulting to Denmark context.");
                    // Reset to default
                    setUserLocation({ lat: 55.6761, lng: 12.5683 });
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    // Handlers
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === 'home') setView(AppView.SCAN);
        if (tab === 'history') setView(AppView.HISTORY);
        if (tab === 'profile') setView(AppView.SCAN); // Reset view to SCAN for profile tab context
        if (tab === 'support') setView(AppView.COMMUNITY);
    };

    const handleCameraClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file);
        };
        input.click();
    };

    const handleGalleryClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file);
        };
        input.click();
    };

    const handleImageFile = async (file: File) => {
        try {
            const isInstant = activeModel === 'madeometer-instant';
            const maxDim = isInstant ? 512 : 800;
            const quality = isInstant ? 0.6 : 0.8;

            const resizedBase64 = await resizeImage(file, maxDim, quality);
            setPreviewImage(resizedBase64);
            performScan(resizedBase64, 'IMAGE', file);
        } catch (e) {
            console.error("Image processing failed", e);
            alert("Could not process image.");
        }
    };

    const handleSearch = (query: string) => {
        performScan(query, 'TEXT');
    };

    // Helper to get active criteria excluding display-only features
    const getActiveCriteria = (): Preference[] => {
        return preferences
            .filter(p => p.active && p.category !== 'FEATURE');
    };

    const performScan = async (data: string, type: 'IMAGE' | 'TEXT', file?: File) => {
        setIsAnalyzing(true);
        setView(AppView.SCAN);

        // Build user constraints string (exclude display features)
        const activePrefs = getActiveCriteria();
        // Default to Danish ('da') if not set
        const savedLang = localStorage.getItem('madeometer_lang') || 'da';

        try {
            // Start Upload in background immediately using the resized base64 data
            const uploadPromise = (type === 'IMAGE')
                ? uploadFile(dataURLtoFile(data, file?.name || 'scan.jpg'))
                : Promise.resolve(undefined);

            // Wait ONLY for analysis
            const results = type === 'IMAGE'
                ? await analyzeImage(data, activePrefs, activeModel, savedLang, userLocation)
                : await analyzeText(data, activePrefs, activeModel, savedLang, userLocation);

            // Attach User ID to initial results
            const initialResults = results.map(r => ({
                ...r,
                imageUrl: data,
                userId: currentUser?.id
            }));

            // Immediately show results
            setCurrentResults(initialResults);
            if (initialResults.length === 1) {
                setSelectedResult(initialResults[0]);
                setView(AppView.DETAILS);
            } else if (initialResults.length > 1) {
                setView(AppView.CART);
            }

            // End primary loading state
            setIsAnalyzing(false);
            setPreviewImage(null);

            // Background Work: Wait for upload completion and save to database
            (async () => {
                try {
                    const uploadedUrl = await uploadPromise;

                    // Finalize results with MinIO URL if applicable
                    const finalResults = initialResults.map(r => ({
                        ...r,
                        imageUrl: (type === 'IMAGE' && uploadedUrl) ? uploadedUrl : r.imageUrl
                    }));

                    // Save scans to database
                    for (const res of finalResults) {
                        await saveScan(res);
                    }

                    // Refresh global history
                    const updatedHistory = await getScanHistory(currentUser?.id);
                    setHistory(updatedHistory);
                    setIsHistoryFetched(true);

                    // Update local UI state with public MinIO URL if it changed
                    if (uploadedUrl) {
                        setCurrentResults(prev => prev.map(p => {
                            const match = finalResults.find(f => f.id === p.id);
                            return match ? { ...p, imageUrl: uploadedUrl } : p;
                        }));

                        setSelectedResult(prev => {
                            if (!prev) return null;
                            const match = finalResults.find(f => f.id === prev.id);
                            return match ? { ...prev, imageUrl: uploadedUrl } : prev;
                        });
                    }
                } catch (bgError) {
                    console.error("Background scan processing failed", bgError);
                }
            })();

        } catch (error) {
            console.error("Scan failed", error);
            alert("Analysis failed. Please try again.");
            setIsAnalyzing(false);
            setPreviewImage(null);
        }
    };

    const handleReanalyze = async (id: string, model: string) => {
        const item = history.find(h => h.id === id) || currentResults.find(r => r.id === id);
        if (!item) return;

        // Switch view to SCAN to show loading animation and "close" the current details card
        setView(AppView.SCAN);

        // If available, show the original image in the scanner background
        if (item.imageUrl && item.imageUrl.startsWith('data:image')) {
            setPreviewImage(item.imageUrl);
        }

        setActiveModel(model);
        setIsAnalyzing(true);

        try {
            const activePrefs = getActiveCriteria();
            // Default to Danish ('da') if not set
            const savedLang = localStorage.getItem('madeometer_lang') || 'da';
            let results: ScanResult[] = [];

            // Determine if we should scan image or text
            if (item.imageUrl) {
                results = await analyzeImage(item.imageUrl, activePrefs, model, savedLang, userLocation);
            } else {
                results = await analyzeText(item.itemName, activePrefs, model, savedLang, userLocation);
            }

            if (results.length > 0) {
                const newResult = { ...results[0], id: item.id, userId: currentUser?.id, timestamp: Date.now(), }; // Keep ID to update
                await updateScan(newResult);

                const newResult_2 = { ...newResult, imageUrl: item.imageUrl }

                // Refresh UI
                setHistory(prev => prev.map(p => p.id === id ? newResult_2 : p));
                setCurrentResults(prev => prev.map(p => p.id === id ? newResult_2 : p));
                setSelectedResult(newResult_2);

                // Switch back to details view with new result
                setView(AppView.DETAILS);
            } else {
                // If failed to get new results, just show old one
                setView(AppView.DETAILS);
            }
        } catch (e) {
            console.error(e);
            alert("Re-analysis failed");
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
            const activePrefs = getActiveCriteria();
            // Get language preference from storage since we are outside provider context in this scope
            const savedLang = localStorage.getItem('madeometer_lang') || 'da';

            let currentLoc = userLocation;
            if (navigator.geolocation) {
                try {
                    const pos: any = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: false });
                    });
                    currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(currentLoc);
                } catch (e) {
                    console.warn("Location refresh failed, using stored/default", e);
                }
            }

            // PASS CONTEXT OVERRIDES TO AI SERVICE
            const alts = await findProductAlternatives(
                item.itemName,
                currentLoc,
                activePrefs,
                savedLang,
                currency,
                shoppingCountry,
                item.id,
                currentUser?.id,
                refresh // isRefresh
            );

            const newAlts = alts.map((a: any) => ({
                name: a.name,
                reason: a.reason,
                website: a.website,
                price: a.price,
                findAt: a.findAt,
                ownerCountryCode: a.ownerCountryCode
            }));

            const updated = { ...item, alternatives: newAlts };
            await updateScan(updated);

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
            // Get language preference from storage since we are outside provider context in this scope
            const savedLang = localStorage.getItem('madeometer_lang') || 'da';

            let currentLoc = userLocation;
            if (navigator.geolocation) {
                try {
                    const pos: any = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: false });
                    });
                    currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(currentLoc);
                } catch (e) {
                    console.warn("Location refresh failed, using stored/default", e);
                }
            }

            const options = await findShoppingOptions(
                item.itemName,
                currentLoc,
                savedLang,
                currency,
                shoppingCountry,
                item.id,
                currentUser?.id,
                refresh // isRefresh
            );

            const updated = { ...item, shoppingOptions: options };
            await updateScan(updated);

            setHistory(prev => prev.map(p => p.id === id ? updated : p));
            setCurrentResults(prev => prev.map(p => p.id === id ? updated : p));
            setSelectedResult(updated);

        } catch (e) {
            console.error(e);
        } finally {
            setIsFindingShoppingOptions(false);
        }
    };

    // Preference Handlers
    const togglePreference = async (id: string) => {
        const updated = preferences.map(p => p.id === id ? { ...p, active: !p.active } : p);
        setPreferences(updated);
        await savePreferences(updated, currentUser?.id);
    };

    const addPreference = async (label: string, description?: string) => {
        const newPref: Preference = {
            id: `custom_${Date.now()}`,
            label,
            description,
            active: true,
            isCustom: true
        };
        const updated = [...preferences, newPref];
        setPreferences(updated);
        await savePreferences(updated, currentUser?.id);
    };

    const updatePreference = async (id: string, label: string, description?: string) => {
        const updated = preferences.map(p => p.id === id ? { ...p, label, description } : p);
        setPreferences(updated);
        await savePreferences(updated, currentUser?.id);
    };

    const deletePreference = async (id: string) => {
        const updated = preferences.filter(p => p.id !== id);
        setPreferences(updated);
        await savePreferences(updated, currentUser?.id);
    };

    // Auth Handlers
    const handleLogin = async (email: string, pass: string) => {
        await signIn.email({
            email,
            password: pass,
        }, {
            onSuccess: () => {
                setIsAuthOpen(false);
            },
            onError: (ctx) => {
                console.error("Login failed:", ctx.error);
                alert(ctx.error.message || "Failed to login");
            }
        });
    };

    const handleRegister = async (name: string, email: string, pass: string) => {
        await signUp.email({
            email,
            password: pass,
            name,
        }, {
            onSuccess: async () => {
                await refetch();
                // Better-auth automatically converts the anonymous session to a registered one
                // if sign up is called with an active anonymous session.
                setIsAuthOpen(false);

                // Note: session data should be updated in the hook state after refetch() completes.
                // However, since currentUser is synced in an useEffect, we might need a safer way
                // to get the ID immediately. Let's try to get it from the direct session object.
                if (session?.user?.id) {
                    await savePreferences(preferences, session.user.id);
                }
            },
            onError: (ctx) => {
                console.error("Registration failed:", ctx.error);
                alert(ctx.error.message || "Failed to register");
            }
        });
    };

    const handleLogout = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    setHistory([]);
                    setIsHistoryFetched(false);
                    setView(AppView.SCAN);
                    setActiveTab('home');
                }

            }
        });
    };

    // CRUD for Scans
    const handleSaveEdit = async (updatedResult: ScanResult) => {
        await updateScan(updatedResult);
        const updatedHistory = await getScanHistory(currentUser?.id);
        setHistory(updatedHistory);
        setIsHistoryFetched(true);

        if (selectedResult?.id === updatedResult.id) setSelectedResult(updatedResult);
        setCurrentResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
        setIsEditOpen(false);
        setEditingScan(null);
    };

    const handleDeleteRequest = (id: string) => {
        setDeleteConfirmation({ isOpen: true, id });
    };

    const handleConfirmDelete = async () => {
        const id = deleteConfirmation.id;
        if (!id) return;

        await deleteScan(id);
        const updatedHistory = await getScanHistory(currentUser?.id);
        setHistory(updatedHistory);
        setIsHistoryFetched(true);


        if (selectedResult?.id === id) {
            setView(AppView.SCAN);
            setSelectedResult(null);
        }

        const newResults = currentResults.filter(r => r.id !== id);
        setCurrentResults(newResults);

        if (newResults.length === 0 && view === AppView.CART) {
            setView(AppView.SCAN);
        }

        setDeleteConfirmation({ isOpen: false, id: null });
    };

    const handleFeedbackSubmit = async (type: string, message: string, email: string) => {
        const enrichedText = `Type: ${type}\nScan ID: ${selectedResult?.id || 'N/A'}\n\n${message}`;

        const feedbackPayload = {
            email: email,
            text: enrichedText,
            source: selectedResult ? `Scan: ${selectedResult.itemName}` : 'General App Feedback',
            images: selectedResult?.imageUrl ? [selectedResult.imageUrl] : []
        };

        try {
            await saveFeedback(feedbackPayload);
            setIsFeedbackOpen(false);
            alert("Feedback sent! Thank you.");
        } catch (e) {
            console.error(e);
            alert("Failed to send feedback. Please try again later.");
        }
    };

    // Render Logic
    const renderContent = () => {
        if (activeTab === 'profile') {
            return (
                <ProfileView
                    user={currentUser}
                    preferences={preferences}
                    onToggle={togglePreference}
                    onAdd={addPreference}
                    onUpdate={updatePreference}
                    onDelete={deletePreference}
                    onBack={() => setActiveTab('home')}
                    onAuthRequest={() => setIsAuthOpen(true)}
                    onLogout={handleLogout}
                    onFeedback={() => { setFeedbackContext('GENERAL'); setIsFeedbackOpen(true); }}
                    subscription={subscription}
                />
            );
        }

        if (activeTab === 'support') {
            return <CommunityView onClose={() => setActiveTab('home')} />;
        }

        // Show Detail/Cart Views regardless of tab if a result is selected
        if (view === AppView.DETAILS && selectedResult) {
            return (
                <ScanResultCard
                    result={selectedResult}
                    onBack={() => {
                        if (activeTab === 'history') setView(AppView.HISTORY);
                        else if (currentResults.length > 1) setView(AppView.CART);
                        else setView(AppView.SCAN);
                    }}
                    showUsaMeter={preferences.find(p => p.id === 'show_usa_meter')?.active}
                    showPoliticalMeter={preferences.find(p => p.id === 'show_political_meter')?.active}
                    showStatusBanner={preferences.find(p => p.id === 'show_status_banner')?.active ?? true}
                    showShopping={preferences.find(p => p.id === 'show_shopping_options')?.active ?? true}
                    showAlternatives={preferences.find(p => p.id === 'show_alternatives')?.active ?? true}
                    activeCriteriaCount={getActiveCriteria().length}
                    onEdit={(res) => { setEditingScan(res); setIsEditOpen(true); }}
                    onDelete={handleDeleteRequest}
                    onFeedback={(id) => { setFeedbackContext('SCAN'); setIsFeedbackOpen(true); }}
                    onUpdate={handleSaveEdit}
                    onReanalyze={handleReanalyze}
                    onFindAlternatives={handleFindAlternatives}
                    onFindShoppingOptions={handleFindShoppingOptions}
                    isFindingAlternatives={isFindingAlternatives}
                    isFindingShoppingOptions={isFindingShoppingOptions}
                    isAdmin={currentUser?.isAdmin}
                    userLocation={userLocation}
                    onRequestLocation={handleRequestLocation}
                    isGuest={currentUser?.isGuest}
                    onAuthRequest={() => setIsAuthOpen(true)}
                />
            );
        }

        if (view === AppView.CART && currentResults.length > 0) {
            return (
                <CartSummary
                    results={currentResults}
                    onSelectResult={(res) => { setSelectedResult(res); setView(AppView.DETAILS); }}
                    onBack={() => {
                        if (activeTab === 'history') setView(AppView.HISTORY);
                        else setView(AppView.SCAN);
                    }}
                    activePreferences={preferences.filter(p => p.active)}
                />
            );
        }

        // Priority 1: Scanner (Home) View - This must always show when SCAN mode is active or analyzing
        if (view === AppView.SCAN || isAnalyzing) {
            return (
                <Scanner
                    isAnalyzing={isAnalyzing}
                    previewImage={previewImage}
                    onCameraClick={handleCameraClick}
                    onGalleryClick={handleGalleryClick}
                    onSearch={handleSearch}
                    activeModel={activeModel}
                    onSupportClick={() => setActiveTab('support')}
                    loadingMessages={loadingMessages}
                />
            );
        }

        if (activeTab === 'history' && view === AppView.HISTORY) {
            return (
                <HistoryList
                    history={history}
                    onSelect={(item) => { setSelectedResult(item); setView(AppView.DETAILS); }}
                    onSelectGroup={(items) => { setCurrentResults(items); setView(AppView.CART); }}
                    onDelete={handleDeleteRequest}
                    isLoading={isHistoryLoading}
                />

            );
        }

        // Fallback Home Tab Logic (Scanner)
        return (
            <Scanner
                isAnalyzing={isAnalyzing}
                previewImage={previewImage}
                onCameraClick={handleCameraClick}
                onGalleryClick={handleGalleryClick}
                onSearch={handleSearch}
                activeModel={activeModel}
                onSupportClick={() => setActiveTab('support')}
                loadingMessages={loadingMessages}
            />
        );
    };

    if (isSessionPending || isInitialLoading) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-9999">
                <div className="relative">
                    <div className="w-24 h-24 bg-brand/20 rounded-3xl absolute inset-0 animate-ping opacity-20" />
                    <div className="relative w-24 h-24 bg-black border border-white/10 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl">
                        <img
                            src="/logo.png"
                            alt="Made O'Meter"
                            className="w-16 h-16 object-contain animate-pulse"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand/50" />
                    </div>
                </div>
                <div className="mt-8 flex flex-col items-center gap-2">
                    <p className="text-white font-bold text-lg tracking-tight">Made O'Meter</p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-brand rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-brand rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-brand rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-neutral-950 text-white font-sans antialiased flex justify-center overflow-hidden">
            <div className={`w-full h-full mx-auto relative shadow-2xl overflow-hidden transition-all duration-300 max-w-[450px] bg-black`}>
                <div className="absolute inset-0 overflow-y-auto no-scrollbar bg-transparent flex flex-col">
                    <Header
                        onHome={() => { setView(AppView.SCAN); setActiveTab('home'); }}
                        activeModel={activeModel}
                        onModelChange={setActiveModel}
                        subscription={subscription}
                        isAdmin={currentUser?.isAdmin}
                    />
                    <main className="flex-1 flex flex-col w-full relative">
                        {renderContent()}
                    </main>
                </div>

                <BottomNavigation
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onScanClick={() => {
                        setView(AppView.SCAN);
                        setActiveTab('home');
                        handleCameraClick();
                    }}
                    isHidden={isAnalyzing}
                />

                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={() => setIsAuthOpen(false)}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                />

                <EditScanModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    scanResult={editingScan}
                    onSave={handleSaveEdit}
                />

                <FeedbackModal
                    isOpen={isFeedbackOpen}
                    onClose={() => setIsFeedbackOpen(false)}
                    onSubmit={handleFeedbackSubmit}
                    isSubmitting={false}
                    context={feedbackContext}
                />

                <ConfirmationModal
                    isOpen={deleteConfirmation.isOpen}
                    onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
                    onConfirm={handleConfirmDelete}
                    title="Delete Scan?"
                    message="This action cannot be undone. This scan will be removed from your history."
                />
            </div>
        </div>
    );
};

export default App;
