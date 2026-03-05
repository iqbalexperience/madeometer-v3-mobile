
import { CreditCard, ExternalLink, Heart, MessageSquare, ShieldCheck, Trophy, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

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

const CommunityView: React.FC<CommunityViewProps> = ({ onClose }) => {
    const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(10);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t } = useLanguage();

    const [donors, setDonors] = useState<Donor[]>([
        { id: '1', name: "Elena K.", amount: 50, badge: "Legend", message: "Keep up the great work! 🌍" },
        { id: '2', name: "Marcus T.", amount: 25, badge: "Supporter", message: "Love this app." },
        { id: '3', name: "Sarah L.", amount: 20, badge: "Supporter" },
        { id: '4', name: "David B.", amount: 15, badge: "Fan", message: "Transparency matters." },
        { id: '5', name: "Jenny W.", amount: 10, badge: "Fan" },
    ]);

    const handleDonate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const finalAmount = selectedAmount === 'custom' ? parseFloat(customAmount) : selectedAmount;
        if (!finalAmount || finalAmount <= 0) {
            setIsSubmitting(false);
            return;
        }
        setTimeout(() => {
            const stripeDemoUrl = "https://stripe.com";
            window.open(stripeDemoUrl, '_blank');
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
        }, 1500);
    };

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

                <div className="mb-6 mt-2 text-center">
                    <div className="w-16 h-16 bg-brand/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-brand fill-brand animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">{t('support_mission')}</h2>
                    <p className="text-gray-500 text-[13px] font-medium leading-relaxed max-w-xs mx-auto">
                        {t('support_desc')}
                    </p>
                </div>

                <form onSubmit={handleDonate} className="mb-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">{t('select_amount')}</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {[5, 10, 25].map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                                className={`py-2.5 rounded-xl border font-bold text-[13px] transition-all ${selectedAmount === amt
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                €{amt}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setSelectedAmount('custom')}
                            className={`py-2.5 rounded-xl border font-bold text-[13px] transition-all ${selectedAmount === 'custom'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            {t('custom')}
                        </button>
                    </div>

                    {selectedAmount === 'custom' && (
                        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.50"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    placeholder={t('enter_amount')}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none text-sm font-bold bg-white text-gray-900"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 mb-4">
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-gray-400">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('your_name')}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none text-sm bg-white text-gray-900"
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute left-3 top-3 text-gray-400">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('leave_comment')}
                                rows={2}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none text-sm bg-white resize-none text-gray-900"
                                maxLength={140}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 rounded-xl bg-[#635BFF] text-white font-bold shadow-lg shadow-[#635BFF]/30 hover:bg-[#5851E3] transition-all active:scale-[0.98] text-[13px] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {isSubmitting ? (
                            <>{t('processing')}...</>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4 text-white/90" />
                                {t('pay')} {selectedAmount !== 'custom' ? `€${selectedAmount}` : customAmount ? `€${customAmount}` : ''} {t('with_card')}
                                <ExternalLink className="w-3 h-3 text-white/50 group-hover:text-white transition-colors" />
                            </>
                        )}
                    </button>

                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium">
                        <ShieldCheck className="w-3 h-3 text-gray-400" />
                        {t('secured_by')} <span className="font-bold text-gray-500">Stripe</span>
                    </div>
                </form>

                <div className="mb-4 flex items-center gap-2 px-1">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-gray-900">{t('recent_supporters')}</h3>
                </div>

                <div className="space-y-3">
                    {donors.map((donor, idx) => (
                        <div key={donor.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full text-xs shadow-sm ${donor.amount >= 50 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                            donor.amount >= 20 ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' :
                                                'bg-white border border-gray-200 text-gray-500'
                                        }`}>
                                        {donor.name.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-900 text-[13px]">{donor.name}</span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{donor.badge}</span>
                                    </div>
                                </div>
                                <div className="font-mono text-brand font-bold bg-brand/5 px-2 py-1 rounded-lg text-xs">€{donor.amount}</div>
                            </div>
                            {donor.message && (
                                <div className="mt-2 ml-11 text-xs text-gray-600 italic bg-white p-2 rounded-lg border border-gray-100 relative">
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-white border-t border-l border-gray-100 transform rotate-45"></div>
                                    "{donor.message}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="h-40 w-full shrink-0"></div>
            </div>
        </div>
    );
};
export default CommunityView;
