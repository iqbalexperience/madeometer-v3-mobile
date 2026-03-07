"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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
    totalTips: number;
    fetchSupporters: (pageNum: number, isMore?: boolean) => Promise<void>;
    refreshTips: (search?: string, sortField?: string, sortOrder?: string, page?: number, pageSize?: number, isMore?: boolean) => Promise<void>;
}

const CommunityDataContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tips, setTips] = useState<any[]>([]);
    const [isTipsLoading, setIsTipsLoading] = useState(true);
    const [totalTips, setTotalTips] = useState(0);
    const [donors, setDonors] = useState<Donor[]>([]);
    const [totalDonors, setTotalDonors] = useState(0);
    const [isDonorsLoading, setIsDonorsLoading] = useState(true);
    const [isDonorsLoadingMore, setIsDonorsLoadingMore] = useState(false);

    const fetchTips = useCallback(async (search = '', sortField = 'createdAt', sortOrder = 'desc', page = 1, pageSize = 10, isMore = false) => {
        setIsTipsLoading(true);
        try {
            const response = await axios.get(`/api/tips?isPublished=true&search=${encodeURIComponent(search)}&sortField=${sortField}&sortOrder=${sortOrder}&page=${page}&pageSize=${pageSize}`);
            if (isMore) {
                setTips(prev => [...prev, ...response.data.tips]);
            } else {
                setTips(response.data.tips);
            }
            setTotalTips(response.data.total || 0);
        } catch (error) {
            console.error("Failed to fetch tips:", error);
        } finally {
            setIsTipsLoading(false);
        }
    }, []);

    const fetchSupporters = useCallback(async (pageNum: number, isMore: boolean = false) => {
        try {
            if (isMore) setIsDonorsLoadingMore(true);
            else setIsDonorsLoading(true);

            const res = await fetch(`/api/madeometer/db/supporters?page=${pageNum}&pageSize=5`);
            const data = await res.json();

            if (data.supporters) {
                const mapped = data.supporters.map((s: any) => ({
                    ...s,
                    badge: s.amount >= 50 ? "Legend" : s.amount >= 20 ? "Supporter" : "Fan",
                    message: s.comment
                }));
                setDonors(prev => isMore ? [...prev, ...mapped] : mapped);
                setTotalDonors(data.total);
            }
        } catch (err) {
            console.error("Failed to fetch supporters:", err);
        } finally {
            setIsDonorsLoading(false);
            setIsDonorsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchTips();
        fetchSupporters(1);
    }, [fetchTips, fetchSupporters]);

    const value = {
        tips,
        isTipsLoading,
        donors,
        totalDonors,
        totalTips,
        isDonorsLoading,
        isDonorsLoadingMore,
        fetchSupporters,
        refreshTips: fetchTips
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
