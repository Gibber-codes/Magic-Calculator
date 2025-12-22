import React from 'react';
import { X } from 'lucide-react';

const LandsPanel = ({ cards, onClose, onAddLand, onRemoveLand }) => {
    const lands = cards.filter(c => c.zone === 'battlefield' && c.type_line?.toLowerCase().includes('land'));

    const basicLandTypes = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end animate-in slide-in-from-bottom duration-300">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-slate-900 rounded-t-2xl w-full max-h-[80vh] overflow-y-auto relative z-10 border-t border-slate-700 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between z-20">
                    <h2 className="text-white text-lg font-bold">Lands ({lands.length})</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Quick Add Basic Lands */}
                <div className="p-4 border-b border-slate-700">
                    <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-bold">Quick Add Basic Lands</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {basicLandTypes.map(land => (
                            <button
                                key={land}
                                onClick={() => onAddLand(land)}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-lg px-2 py-3 text-white text-sm font-medium transition-all active:scale-95 flex flex-col items-center gap-1"
                            >
                                <div className={`w-4 h-4 rounded-full ${land === 'Plains' ? 'bg-yellow-200' :
                                        land === 'Island' ? 'bg-blue-400' :
                                            land === 'Swamp' ? 'bg-purple-900' :
                                                land === 'Mountain' ? 'bg-red-500' :
                                                    'bg-green-600'
                                    }`} />
                                {land}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current Lands */}
                <div className="p-4 safe-pb">
                    <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider font-bold">On Battlefield</h3>
                    {lands.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 bg-slate-800/30 rounded-lg border border-slate-800 border-dashed">
                            No lands on battlefield
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {lands.map(land => (
                                <div key={land.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-slate-700">
                                    <span className="text-white text-sm truncate pr-2">{land.name}</span>
                                    <button
                                        onClick={() => onRemoveLand(land.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2 py-1 rounded text-xs transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LandsPanel;
