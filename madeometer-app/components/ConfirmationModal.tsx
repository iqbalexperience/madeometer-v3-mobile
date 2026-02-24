
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel, 
  cancelLabel,
  isDestructive = true
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
        <div className="flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                {isDestructive ? <Trash2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                {title}
            </h3>
            
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                {message}
            </p>
            
            <div className="flex gap-3 w-full">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors active:scale-[0.98]"
                >
                    {cancelLabel || t('cancel')}
                </button>
                <button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    className={`flex-1 py-3 text-white font-bold rounded-xl text-xs transition-colors shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
                        isDestructive 
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                        : 'bg-brand hover:bg-brand-dark shadow-brand/20'
                    }`}
                >
                    {confirmLabel || t('delete')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
