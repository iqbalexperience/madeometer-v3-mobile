import React, { useState } from 'react';
import { X, Shield, FileText, Lock, RefreshCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'TERMS' | 'PRIVACY'>('TERMS');
  const { t } = useLanguage();

  const handleResetCookies = () => {
    // In a real app, this would clear cookie consent flags. 
    // Here we clear local storage to simulate a full reset.
    if (confirm("This will reset your local preferences and logout. Continue?")) {
        localStorage.clear();
        alert("Cookie preferences and local data have been reset.");
        window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        {/* Modal Content */}
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white shrink-0 z-10">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('legal_info')}</h2>
                <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 mx-5 mt-4 bg-gray-100 rounded-xl shrink-0">
                <button
                    onClick={() => setActiveTab('TERMS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                        activeTab === 'TERMS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    {t('terms_of_use')}
                </button>
                <button
                    onClick={() => setActiveTab('PRIVACY')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                        activeTab === 'PRIVACY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Lock className="w-4 h-4" />
                    {t('privacy_policy')}
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-600 leading-relaxed">
                {activeTab === 'TERMS' ? (
                    <div className="space-y-6">
                        <Section title="1. Introduction">
                            Welcome to Made O'Meter, a non-profit application designed to help users identify the origin of products and brands through AI-powered analysis.
                            <br/><br/>
                            These Terms of Use govern your use of our application and services. By accessing or using Made O'Meter, you agree to be bound by these terms.
                        </Section>

                        <Section title="2. Acceptance of Terms">
                            By using Made O'Meter, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
                            <br/><br/>
                            If you do not agree with any part of these terms, you may not use our services.
                        </Section>

                        <Section title="3. Use of Service">
                            Made O'Meter is provided as-is and is intended for personal, non-commercial use. You agree to use the application in compliance with all applicable laws and regulations.
                            <br/><br/>
                            You may not:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Use the service for any illegal purpose.</li>
                                <li>Attempt to reverse engineer, decompile, or disassemble the app.</li>
                                <li>Use automated systems to access the service without permission.</li>
                                <li>Upload malicious content.</li>
                            </ul>
                        </Section>

                        <Section title="5. User Content">
                             When you upload images or other content to Made O'Meter, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process that content for the purpose of providing our services.
                             <br/><br/>
                             You represent and warrant that:
                             <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>You own or have the necessary rights to the content you upload.</li>
                                <li>Your content does not violate the privacy rights, publicity rights, copyright, or other rights of any person.</li>
                            </ul>
                        </Section>

                        <Section title="7. Disclaimers">
                            Made O'Meter is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the reliability, accuracy, or availability of the application.
                            <br/><br/>
                            We do not warrant that:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>The service will be uninterrupted or error-free.</li>
                                <li>Defects will be corrected.</li>
                                <li>The application is free of viruses or other harmful components.</li>
                                <li>Analysis results will be accurate or meet your requirements.</li>
                            </ul>
                            <br/>
                            To the fullest extent permitted by law, we disclaim all warranties and liability related to your use of Made O'Meter.
                        </Section>

                        <Section title="8. Changes to Terms">
                            We may update these Terms of Use from time to time. We will notify users of any material changes by posting the new terms on our application. Your continued use of Made O'Meter after such changes constitutes your acceptance of the new terms.
                        </Section>

                        <Section title="9. Contact Us">
                            If you have any questions or concerns about these Terms of Use, please contact us at:
                            <br/>
                            <span className="text-brand font-bold block mt-1">support@madeometer.com</span>
                        </Section>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Section title="1. Introduction">
                            Made O'Meter is a non-profit, private application designed to help users identify the origin of products and brands through AI-powered analysis.
                            <br/><br/>
                            We are committed to protecting your privacy and handling your data with transparency and care. This Privacy Policy explains how we collect, use, and protect your information.
                        </Section>

                        <Section title="2. Information We Collect">
                            We collect the following types of information when you use Made O'Meter:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Images you upload for analysis</li>
                                <li>Device information (browser type, operating system)</li>
                                <li>Usage data (features used, time spent on the application)</li>
                                <li>IP address and general location data</li>
                                <li>Any feedback or corrections you provide</li>
                            </ul>
                        </Section>

                        <Section title="3. How We Use Your Information">
                            We use the information we collect to:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Provide and improve our AI analysis services</li>
                                <li>Develop new features and functionality</li>
                                <li>Monitor and analyze usage patterns</li>
                                <li>Prevent fraudulent or unauthorized use</li>
                                <li>Communicate with you about the application</li>
                            </ul>
                        </Section>

                        <Section title="4. Information Sharing">
                            We do not sell your personal information. We may share your information in the following circumstances:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>With service providers who help us operate the application</li>
                                <li>To comply with legal obligations</li>
                                <li>To protect our rights, privacy, safety, or property</li>
                                <li>In connection with a business transfer or merger</li>
                            </ul>
                        </Section>

                        <Section title="Cookies and tracking technologies">
                            We use cookies and similar tracking technologies to ensure that the application functions properly, to improve performance and user experience, and to understand how our services are used. Some cookies are strictly necessary for the operation of the application, while others help us analyze usage and improve our services.
                            
                            <h4 className="font-bold text-gray-900 mt-3 mb-1">How we use cookies</h4>
                            Cookies allow us to recognize your device, remember your preferences, and provide a more consistent and efficient experience. We may use first-party cookies as well as third-party cookies provided by analytics or infrastructure partners who assist us in operating and improving the application.

                            <h4 className="font-bold text-gray-900 mt-3 mb-1">Managing your cookie preferences</h4>
                            You can manage or withdraw your cookie consent at any time. By clearing your cookie consent, non-essential cookies will be disabled and removed where possible. Please note that restricting certain cookies may affect the availability or functionality of some features of the application.
                            
                            <button 
                                onClick={handleResetCookies}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                            >
                                <RefreshCcw className="w-3 h-3" />
                                Reset cookie consent
                            </button>
                        </Section>

                        <Section title="6. Data Retention">
                            We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You may request deletion of your data by contacting us.
                        </Section>

                        <Section title="7. Children's Privacy">
                            Made O'Meter is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us.
                        </Section>

                        <Section title="8. Changes to Privacy Policy">
                            We may update this Privacy Policy from time to time. We will notify users of any material changes by posting the new policy on our application. Your continued use of Made O'Meter after such changes constitutes your acceptance of the new policy.
                        </Section>

                        <Section title="9. Contact Us">
                            If you have any questions or concerns about our Privacy Policy or data practices, please contact us at:
                            <br/>
                            <span className="text-brand font-bold block mt-1">privacy@madeometer.com</span>
                        </Section>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                 <button 
                    onClick={onClose}
                    className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-[0.98]"
                >
                    {t('i_understand')}
                </button>
            </div>
        </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div>
        <h3 className="text-gray-900 font-bold text-base mb-2">{title}</h3>
        <div className="text-gray-600 leading-relaxed space-y-2">
            {children}
        </div>
    </div>
);

export default LegalModal;