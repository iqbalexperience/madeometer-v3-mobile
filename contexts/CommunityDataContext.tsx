import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSupporters, getTips } from '../lib/api';
import { useSession } from '../lib/auth-client';

interface Donor {
    id: string;
    name: string;
    amount: number;
    message?: string;
    badge: string;
    createdAt: number;
}

interface CommunityContextType {
    tips: any[];
    isTipsLoading: boolean;
    donors: Donor[];
    totalDonors: number;
    isDonorsLoading: boolean;
    isDonorsLoadingMore: boolean;
    hasInitializedTips: boolean;
    hasInitializedDonors: boolean;
    totalTips: number;
    selectedTip: any | null;
    setSelectedTip: (tip: any | null) => void;
    fetchSupporters: (pageNum: number, isMore?: boolean) => Promise<void>;
    refreshTips: (search?: string, sortField?: string, sortOrder?: string, page?: number, pageSize?: number, isMore?: boolean) => Promise<void>;
}

const CommunityDataContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tips, setTips] = useState<any[]>([]);
    const [isTipsLoading, setIsTipsLoading] = useState(false);
    const [totalTips, setTotalTips] = useState(0);
    const [donors, setDonors] = useState<Donor[]>([]);
    const [totalDonors, setTotalDonors] = useState(0);
    const [isDonorsLoading, setIsDonorsLoading] = useState(false);
    const [isDonorsLoadingMore, setIsDonorsLoadingMore] = useState(false);
    const [selectedTip, setSelectedTip] = useState<any | null>(null);

    const [hasInitializedTips, setHasInitializedTips] = useState(false);
    const [hasInitializedDonors, setHasInitializedDonors] = useState(false);

    const { data: session } = useSession();

    useEffect(() => {
        if (!session) {
            setTips([]);
            setDonors([]);
            setTotalTips(0);
            setTotalDonors(0);
            setHasInitializedTips(false);
            setHasInitializedDonors(false);
            setSelectedTip(null);
        }
    }, [session]);

    const fetchTipsData = useCallback(async (search = '', sortField = 'createdAt', sortOrder = 'desc', page = 1, pageSize = 10, isMore = false) => {
        setIsTipsLoading(true);
        try {
            const data = await getTips(search, sortField, sortOrder, page, pageSize);
            if (isMore) {
                setTips(prev => [...prev, ...data.tips]);
            } else {
                setTips(data.tips);
            }
            setTotalTips(data.total || 0);
            if (!isMore && !search && sortField === 'createdAt' && sortOrder === 'desc') {
                setHasInitializedTips(true);
            }
        } catch (error) {
            console.error("Failed to fetch tips:", error);
        } finally {
            setIsTipsLoading(false);
        }
    }, []);

    const fetchSupportersData = useCallback(async (pageNum: number, isMore: boolean = false) => {
        try {
            if (isMore) setIsDonorsLoadingMore(true);
            else setIsDonorsLoading(true);

            const data = await getSupporters(pageNum, 10);

            if (data.supporters) {
                const mapped = data.supporters.map((s: any) => ({
                    ...s,
                    badge: s.amount >= 50 ? "Legend" : s.amount >= 20 ? "Supporter" : "Fan",
                    message: s.comment
                }));
                setDonors(prev => isMore ? [...prev, ...mapped] : mapped);
                setTotalDonors(data.total);
                if (pageNum === 1) setHasInitializedDonors(true);
            }
        } catch (err) {
            console.error("Failed to fetch supporters:", err);
        } finally {
            setIsDonorsLoading(false);
            setIsDonorsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        // We no longer auto-fetch on mount because the provider is at the root.
        // Components will call refreshTips or fetchSupporters if they need data.
    }, []);

    const value = {
        tips,
        isTipsLoading,
        donors,
        totalDonors,
        totalTips,
        isDonorsLoading,
        isDonorsLoadingMore,
        hasInitializedTips,
        hasInitializedDonors,
        selectedTip,
        setSelectedTip,
        fetchSupporters: fetchSupportersData,
        refreshTips: fetchTipsData
    };

    return (
        <CommunityDataContext.Provider value={value}>
            {children}
        </CommunityDataContext.Provider>
    );
};

export const useCommunityData = () => {
    const context = useContext(CommunityDataContext);
    if (!context) {
        throw new Error("useCommunityData must be used within a CommunityDataProvider");
    }
    return context;
};
