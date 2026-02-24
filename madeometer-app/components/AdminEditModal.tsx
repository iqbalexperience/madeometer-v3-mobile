
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Image as ImageIcon, Search, RefreshCw, Upload, CheckSquare, Square } from 'lucide-react';
import { fetchUnsplashImage } from '../services/geminiService';

interface AdminEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    type: 'brand' | 'product' | 'preference';
    onSave: (updatedItem: any) => void;
}

const AdminEditModal: React.FC<AdminEditModalProps> = ({ isOpen, onClose, item, type, onSave }) => {
    const [formData, setFormData] = useState<any>({});
    const [imageQuery, setImageQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (item) {
            setFormData({ ...item });
            setImageQuery(item.name || item.label || '');
        }
    }, [item, isOpen]);

    if (!isOpen || !item) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleImageSearch = async () => {
        if (!imageQuery.trim()) return;
        setIsSearching(true);
        try {
            const url = await fetchUnsplashImage(imageQuery);
            if (url) {
                setFormData({ ...formData, imageUrl: url });
            } else {
                alert("No image found");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (limit to ~500KB to prevent IndexedDB bloat)
            if (file.size > 500000) {
                alert("File is too large. Please select an image under 500KB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 capitalize">Edit {type}</h2>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Image Section (Only for Brand/Product) */}
                    {(type === 'brand' || type === 'product') && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Image</label>
                            <div className="flex gap-4 items-start">
                                <div
                                    className="w-24 h-24 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {formData.imageUrl ? (
                                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Upload className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={imageQuery}
                                            onChange={(e) => setImageQuery(e.target.value)}
                                            placeholder="Search Unsplash..."
                                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleImageSearch}
                                            disabled={isSearching}
                                            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                                            title="Search Unsplash"
                                        >
                                            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                            title="Upload from Device"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.imageUrl || ''}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="Or paste Image URL..."
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-brand"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Common Fields */}
                    {type !== 'preference' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                disabled // Key field usually shouldn't change without re-keying DB
                                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm font-bold cursor-not-allowed"
                            />
                        </div>
                    )}

                    {/* Preference Specific Fields */}
                    {type === 'preference' && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">ID (Unique)</label>
                                <input
                                    type="text"
                                    value={formData.id || ''}
                                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                    disabled={!!item.id} // Disable if editing existing
                                    placeholder="e.g. avoid_sugar"
                                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-brand ${!!item.id ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Label</label>
                                <input
                                    type="text"
                                    value={formData.label || ''}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Description</label>
                                <input
                                    type="text"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Type</label>
                                <select
                                    value={formData.category || 'CRITERIA'}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                >
                                    <option value="CRITERIA">Criteria (Avoidance Rule)</option>
                                    <option value="FEATURE">Feature (App Toggle)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setFormData({ ...formData, active: !formData.active })}>
                                {formData.active ? <CheckSquare className="w-5 h-5 text-brand" /> : <Square className="w-5 h-5 text-gray-300" />}
                                <span className="text-sm font-bold text-gray-700">Enabled by Default</span>
                            </div>
                        </>
                    )}

                    {type === 'brand' && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Owner Company</label>
                                <input
                                    type="text"
                                    value={formData.ownerCompany || ''}
                                    onChange={(e) => setFormData({ ...formData, ownerCompany: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Country</label>
                                    <input
                                        type="text"
                                        value={formData.ownerCountry || ''}
                                        onChange={(e) => setFormData({ ...formData, ownerCountry: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Flag</label>
                                    <input
                                        type="text"
                                        value={formData.ownerFlag || ''}
                                        onChange={(e) => setFormData({ ...formData, ownerFlag: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-lg text-center focus:outline-none focus:border-brand"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {type === 'product' && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Brand Name</label>
                                <input
                                    type="text"
                                    value={formData.brandName || ''}
                                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Verdict</label>
                                <select
                                    value={formData.verdict || 'NEUTRAL'}
                                    onChange={(e) => setFormData({ ...formData, verdict: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-brand"
                                >
                                    <option value="RECOMMENDED">RECOMMENDED</option>
                                    <option value="NEUTRAL">NEUTRAL</option>
                                    <option value="AVOID">AVOID</option>
                                </select>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        className="w-full py-4 mt-2 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2 hover:bg-brand-dark active:scale-[0.98] transition-all"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};
export default AdminEditModal;
