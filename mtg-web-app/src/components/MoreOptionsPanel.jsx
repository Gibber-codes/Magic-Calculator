import React, { useState } from 'react';
import { X, Globe, Settings, Trash2, RefreshCw, CheckCircle } from 'lucide-react';

const MoreOptionsPanel = ({ cards, onClose, onAddLand, onRemoveLand, onSelectAll }) => {
    const lands = cards.filter(c => c.zone === 'battlefield' && c.type_line?.toLowerCase().includes('land'));
    const basicLandTypes = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];

    // Tab state if we want to expand later, for now just show Lands + maybe System actions
    const [activeTab, setActiveTab] = useState('lands');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end animate-in slide-in-from-bottom duration-300">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-slate-900 rounded-t-2xl w-full max-h-[80vh] overflow-y-auto relative z-10 border-t border-slate-700 shadow-2xl pb-10">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between z-20">
                    <h2 className="text-white text-xl font-bold">Menu</h2>
                    <button onClick={onClose} className="p-2 -mr-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">




                    {/* Select All Action */}
                    <button
                        onClick={() => {
                            onSelectAll();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 bg-slate-800/80 hover:bg-purple-900/30 border border-slate-700 hover:border-purple-500/50 rounded-xl p-4 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-700 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                            <CheckCircle className="w-5 h-5 text-slate-300 group-hover:text-purple-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-white font-bold text-lg group-hover:text-purple-300">Select All Cards</h3>
                            <p className="text-slate-400 text-sm group-hover:text-purple-300/60">Select every permanent on board</p>
                        </div>
                    </button>

                    {/* Placeholder for future options */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 opacity-50">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-5 h-5 text-slate-400" />
                            <h3 className="text-slate-300 font-bold text-lg">Game Settings</h3>
                        </div>
                        <p className="text-slate-500 text-sm">Additional options coming soon.</p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MoreOptionsPanel;
