import { useSession } from '@/lib/auth-client';
import { AlertTriangle, Bug, Lightbulb, Mail, MessageSquare, Send, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (type: string, message: string, email: string) => void;
    isSubmitting: boolean;
    context?: 'GENERAL' | 'SCAN';
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, context = 'GENERAL' }) => {
    const { data: session } = useSession();
    const [type, setType] = useState(context === 'SCAN' ? 'INACCURATE_RESULT' : 'GENERAL');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        if (session?.user?.email) {
            if (!session.user.isAnonymous) {
                setEmail(session.user.email);
            }
        }
    }, [session, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !email.trim()) return;
        onSubmit(type, message, email);
        setMessage('');
        setType('GENERAL');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 overflow-hidden animate-in slide-in-from-bottom duration-300">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {context === 'SCAN' ? t('report_issue') : t('send_feedback_title')}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('category')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {context === 'SCAN' ? (
                                <button
                                    type="button"
                                    onClick={() => setType('INACCURATE_RESULT')}
                                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${type === 'INACCURATE_RESULT' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-500 border-gray-100'
                                        }`}
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                    {t('wrong_info')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setType('GENERAL')}
                                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${type === 'GENERAL' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-100'
                                        }`}
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    {t('general')}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setType('BUG')}
                                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${type === 'BUG' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-gray-500 border-gray-100'
                                    }`}
                            >
                                <Bug className="w-5 h-5" />
                                {t('app_bug')}
                            </button>

                            <button
                                type="button"
                                onClick={() => setType('FEATURE_REQUEST')}
                                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all col-span-2 ${type === 'FEATURE_REQUEST' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white text-gray-500 border-gray-100'
                                    }`}
                            >
                                <Lightbulb className="w-5 h-5" />
                                {t('feature_request')}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('email')}</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all placeholder:text-gray-400"
                                placeholder={t('email_placeholder')}
                                required
                                disabled={!session?.user.isAnonymous && !!session?.user.email}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('message')}</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all placeholder:text-gray-400 resize-none h-32"
                            placeholder={t('describe_issue')}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !message.trim()}
                        className="w-full py-4 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/25 flex items-center justify-center gap-2 hover:bg-brand-dark active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? t('sending') : (
                            <>
                                <Send className="w-4 h-4" />
                                {t('submit_feedback')}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default FeedbackModal;