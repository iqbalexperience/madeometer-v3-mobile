import React from 'react';
import { Home, Heart, Camera, Clock, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type Tab = 'home' | 'support' | 'history' | 'profile';

interface BottomNavigationProps {
  activeTab: Tab | string;
  onTabChange: (tab: Tab) => void;
  onScanClick: () => void;
  isHidden?: boolean;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange, onScanClick, isHidden = false }) => {
  const { t } = useLanguage();

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_6px_rgba(0,0,0,0.03)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] max-w-[450px] mx-auto ${isHidden ? 'translate-y-[120%]' : 'translate-y-0'}`}>
      <div className="w-full pb-[0.6rem] pt-[0.8rem] px-1">
        <div className="grid grid-cols-5 items-end">
            
            <NavButton 
                isActive={activeTab === 'home'} 
                onClick={() => onTabChange('home')} 
                icon={Home} 
                label={t('tab_home')} 
            />
            
            <NavButton 
                isActive={activeTab === 'support'} 
                onClick={() => onTabChange('support')} 
                icon={Heart} 
                label={t('tab_support')} 
            />

            {/* Scan Action - Center */}
            <div className="flex justify-center">
                <button
                    onClick={onScanClick}
                    className="flex items-center justify-center w-[3.7rem] h-[3.7rem] mb-[3px] rounded-full bg-brand text-white shadow-lg shadow-brand/30 active:scale-95 transition-all hover:bg-brand-dark group"
                >
                    <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={2} />
                </button>
            </div>

            <NavButton 
                isActive={activeTab === 'history'} 
                onClick={() => onTabChange('history')} 
                icon={Clock} 
                label={t('tab_history')} 
            />
            
            <NavButton 
                isActive={activeTab === 'profile'} 
                onClick={() => onTabChange('profile')} 
                icon={User} 
                label={t('tab_profile')} 
            />
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ isActive, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-1 transition-colors duration-200 ${
      isActive 
        ? 'text-slate-900' 
        : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    <Icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
        {label}
    </span>
  </button>
);

export default BottomNavigation;