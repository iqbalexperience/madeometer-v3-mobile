import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useFeatureGate } from '../contexts/FeatureGateContext';
import DonationView from './DonationView';
import TipsView from './TipsView';

import { useLanguage } from '../contexts/LanguageContext';

interface CommunityViewProps {
    onClose?: () => void;
}

const CommunityView: React.FC<CommunityViewProps> = ({ onClose }) => {
    const { plan, isLoading: isCheckingSubscription } = useFeatureGate();
    const isPaidUser = plan === 'plus';
    const { data: session } = useSession();
    const { t } = useLanguage();

    return (
        <div className="flex flex-col pt-4 min-h-full">
            <div className="bg-white rounded-t-[1.4rem] p-5 shadow-2xl relative flex flex-col flex-1">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {isCheckingSubscription ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-brand/10 border-t-brand rounded-full animate-spin" />
                            <Sparkles className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('checking_membership')}</p>
                        </div>
                    </div>
                ) : isPaidUser ? (
                    <TipsView />
                ) : (
                    <DonationView session={session} />
                )}
            </div>
        </div>
    );
};

export default CommunityView;
