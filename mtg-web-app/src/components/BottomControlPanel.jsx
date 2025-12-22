import React from 'react';
import { Play, Plus, CheckCircle, Globe } from 'lucide-react';

const BottomControlPanel = ({
    onStartTurn,
    onAddCard,
    onSelectAll,
    onOpenLands,
    landCount = 0
}) => {
    return (
        <div className="px-3 py-3 w-full">
            <div className="flex gap-2 justify-center items-center max-w-2xl mx-auto">

                {/* START TURN Button */}
                <button
                    onClick={onStartTurn}
                    className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-green-500/50 bg-slate-800/90 hover:border-green-400 active:scale-95 transition-all"
                >
                    <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                        <Play className="w-8 h-8 text-green-400 fill-current" />
                        <span className="text-green-400 text-xs font-bold uppercase tracking-wide">Start Turn</span>
                    </div>
                </button>

                {/* ADD CARD Button */}
                <button
                    onClick={onAddCard}
                    className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-blue-500/50 bg-slate-800/90 hover:border-blue-400 active:scale-95 transition-all"
                >
                    <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                        <Plus className="w-7 h-7 text-blue-400" strokeWidth={2.5} />
                        <span className="text-blue-400 text-xs font-bold uppercase tracking-wide">Add Card</span>
                    </div>
                </button>

                {/* SELECT ALL Button */}
                <button
                    onClick={onSelectAll}
                    className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-purple-500/50 bg-slate-800/90 hover:border-purple-400 active:scale-95 transition-all"
                >
                    <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                        <CheckCircle className="w-7 h-7 text-purple-400" />
                        <span className="text-purple-400 text-xs font-bold uppercase tracking-wide">Select All</span>
                    </div>
                </button>

                {/* LANDS Button */}
                <button
                    onClick={onOpenLands}
                    className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-emerald-500/50 bg-slate-800/90 hover:border-emerald-400 active:scale-95 transition-all relative"
                >
                    <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                        <Globe className="w-7 h-7 text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">Lands</span>
                    </div>
                    {/* Count Badge */}
                    {landCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold">{landCount}</span>
                        </div>
                    )}
                </button>

            </div>
        </div>
    );
};

export default BottomControlPanel;
