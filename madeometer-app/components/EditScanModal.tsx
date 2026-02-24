import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Flag, Package, ChevronDown } from 'lucide-react';
import { ScanResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EditScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedResult: ScanResult) => void;
  scanResult: ScanResult | null;
}

const COUNTRIES = [
    { name: "USA", flag: "🇺🇸" },
    { name: "UK", flag: "🇬🇧" }, // Changed from United Kingdom
    { name: "China", flag: "🇨🇳" },
    { name: "Germany", flag: "🇩🇪" },
    { name: "France", flag: "🇫🇷" },
    { name: "Italy", flag: "🇮🇹" },
    { name: "Spain", flag: "🇪🇸" },
    { name: "Denmark", flag: "🇩🇰" },
    { name: "Sweden", flag: "🇸🇪" },
    { name: "Norway", flag: "🇳🇴" },
    { name: "Finland", flag: "🇫🇮" },
    { name: "Netherlands", flag: "🇳🇱" },
    { name: "Belgium", flag: "🇧🇪" },
    { name: "Switzerland", flag: "🇨🇭" },
    { name: "Austria", flag: "🇦🇹" },
    { name: "Japan", flag: "🇯🇵" },
    { name: "South Korea", flag: "🇰🇷" },
    { name: "Taiwan", flag: "🇹🇼" },
    { name: "India", flag: "🇮🇳" },
    { name: "Australia", flag: "🇦🇺" },
    { name: "New Zealand", flag: "🇳🇿" },
    { name: "Canada", flag: "🇨🇦" },
    { name: "Mexico", flag: "🇲🇽" },
    { name: "Brazil", flag: "🇧🇷" },
    { name: "Israel", flag: "🇮🇱" },
    { name: "Ireland", flag: "🇮🇪" },
    { name: "Poland", flag: "🇵🇱" },
    { name: "Portugal", flag: "🇵🇹" },
    { name: "Russia", flag: "🇷🇺" },
    { name: "Turkey", flag: "🇹🇷" },
    { name: "Vietnam", flag: "🇻🇳" },
    { name: "Thailand", flag: "🇹🇭" },
    { name: "Malaysia", flag: "🇲🇾" },
    { name: "Indonesia", flag: "🇮🇩" },
    { name: "Singapore", flag: "🇸🇬" },
    { name: "Philippines", flag: "🇵🇭" },
    { name: "South Africa", flag: "🇿🇦" },
    { name: "Saudi Arabia", flag: "🇸🇦" },
    { name: "UAE", flag: "🇦🇪" },
    { name: "Argentina", flag: "🇦🇷" },
    { name: "Chile", flag: "🇨🇱" },
    { name: "Colombia", flag: "🇨🇴" },
    { name: "Czech Republic", flag: "🇨🇿" },
    { name: "Greece", flag: "🇬🇷" },
    { name: "Hungary", flag: "🇭🇺" },
    { name: "Iceland", flag: "🇮🇸" },
    { name: "Luxembourg", flag: "🇱🇺" },
    { name: "Ukraine", flag: "🇺🇦" }
].sort((a, b) => a.name.localeCompare(b.name));

const EditScanModal: React.FC<EditScanModalProps> = ({ isOpen, onClose, onSave, scanResult }) => {
  const [formData, setFormData] = useState<Partial<ScanResult>>({});
  const { t } = useLanguage();

  useEffect(() => {
    if (scanResult) {
        setFormData({
            itemName: scanResult.itemName,
            ownerCompany: scanResult.ownerCompany,
            ownerCountry: scanResult.ownerCountry,
            verdict: scanResult.verdict,
            ownerFlag: scanResult.ownerFlag
        });
    }
  }, [scanResult, isOpen]);

  if (!isOpen || !scanResult) return null;

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const updatedResult: ScanResult = { 
          ...scanResult, 
          ...formData,
          validatedBy: 'admin', 
          lastValidated: Date.now()
      } as ScanResult;

      onSave(updatedResult);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedName = e.target.value;
      const countryData = COUNTRIES.find(c => c.name === selectedName);
      
      setFormData(prev => ({
          ...prev,
          ownerCountry: selectedName,
          ownerFlag: countryData ? countryData.flag : prev.ownerFlag
      }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('edit_details')}</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">{t('status')}</label>
                 <div className="grid grid-cols-3 gap-2">
                     {(['RECOMMENDED', 'NEUTRAL', 'AVOID'] as const).map((v) => (
                         <button
                            key={v}
                            type="button"
                            onClick={() => setFormData({...formData, verdict: v})}
                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                formData.verdict === v 
                                ? v === 'RECOMMENDED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : v === 'AVOID' ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-white text-gray-500 border-gray-100'
                            }`}
                         >
                             {v === 'RECOMMENDED' ? 'OK' : v}
                         </button>
                     ))}
                 </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('product_name')}</label>
                <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        value={formData.itemName}
                        onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('owner_company')}</label>
                <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        value={formData.ownerCompany}
                        onChange={(e) => setFormData({...formData, ownerCompany: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
                    />
                </div>
            </div>

            <div className="flex gap-3">
                 <div className="space-y-1.5 flex-[0.3]">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('flag')}</label>
                    <input 
                        type="text" 
                        value={formData.ownerFlag}
                        onChange={(e) => setFormData({...formData, ownerFlag: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all"
                        placeholder="🏳️"
                    />
                </div>
                <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('country')}</label>
                    <div className="relative">
                        <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={formData.ownerCountry}
                            onChange={handleCountryChange}
                            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all appearance-none"
                        >
                            <option value="">{t('select_country')}</option>
                            {COUNTRIES.map((country) => (
                                <option key={country.name} value={country.name}>
                                    {country.name}
                                </option>
                            ))}
                            {formData.ownerCountry && !COUNTRIES.some(c => c.name === formData.ownerCountry) && (
                                <option value={formData.ownerCountry}>{formData.ownerCountry}</option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            <button 
                type="submit" 
                className="w-full py-4 mt-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all"
            >
                <Save className="w-4 h-4" />
                {t('save_validate')}
            </button>
        </form>
      </div>
    </div>
  );
};
export default EditScanModal;