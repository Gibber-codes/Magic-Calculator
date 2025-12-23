import React from 'react';
import { Play, Plus, CheckCircle, Globe, ArrowRight, RotateCcw, X } from 'lucide-react';

const BottomControlPanel = ({
    onStartTurn,
    onAddCard,
    onSelectAll,
    onOpenLands,
    landCount = 0,
    currentPhase,
    currentCombatStep,
    onAdvancePhase,
    onEndTurn,
    isTargetingMode = false,
    onCancelTargeting,
    stackCount = 0
}) => {
    return (
        <div className="px-3 py-3 w-full animate-in slide-in-from-bottom duration-300">
            <div className="flex gap-2 justify-center items-center max-w-2xl mx-auto">

                {/* GAME FLOW BUTTON (Slot 1) */}
                {!currentPhase ? (
                    // START TURN
                    <button
                        onClick={onStartTurn}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-green-500/50 bg-slate-800/90 hover:border-green-400 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <Play className="w-8 h-8 text-green-400 fill-current" />
                            <span className="text-green-400 text-xs font-bold uppercase tracking-wide">Start Turn</span>
                        </div>
                    </button>
                ) : (
                    // SMART PHASE BUTTON
                    <button
                        onClick={onAdvancePhase}
                        disabled={stackCount > 0} // Disable or change visual if stack is active (optional, user wanted it to 'stop')
                        className={`flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 transition-all active:scale-95 
                            ${stackCount > 0
                                ? 'border-purple-500/50 bg-slate-800/90 cursor-not-allowed opacity-80'
                                : currentPhase === 'Main 1'
                                    ? 'border-red-500/50 bg-slate-800/90 hover:border-red-400'
                                    : currentPhase === 'Main 2'
                                        ? 'border-slate-500/50 bg-slate-800/90 hover:border-slate-400'
                                        : 'border-blue-500/50 bg-slate-800/90 hover:border-blue-400'
                            }`}
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3 text-center">
                            {stackCount > 0 ? (
                                <>
                                    <div className="relative">
                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold">{stackCount}</div>
                                        <RotateCcw className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <span className="text-purple-400 text-[10px] font-bold uppercase tracking-wide leading-tight">Resolve Stack</span>
                                </>
                            ) : currentPhase === 'Main 1' ? (
                                <>
                                    <ArrowRight className="w-8 h-8 text-red-400" />
                                    <span className="text-red-400 text-[10px] font-bold uppercase tracking-wide leading-tight">Attack!</span>
                                </>
                            ) : currentPhase === 'Combat' ? (
                                <>
                                    <ArrowRight className="w-8 h-8 text-orange-400" />
                                    <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wide leading-tight">Declare Attackers</span>
                                </>
                            ) : currentPhase === 'Main 2' ? (
                                <>
                                    <RotateCcw className="w-8 h-8 text-gray-400" />
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wide leading-tight">End Turn</span>
                                </>
                            ) : currentPhase === 'Beginning' ? (
                                <>
                                    <ArrowRight className="w-8 h-8 text-green-400" />
                                    <span className="text-green-400 text-[10px] font-bold uppercase tracking-wide leading-tight">Main Phase 1</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="w-8 h-8 text-blue-400" />
                                    <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wide leading-tight">Next Phase</span>
                                </>
                            )}
                        </div>
                    </button>
                )}

                {/* ADD CARD Button (Slot 2) */}
                <button
                    onClick={onAddCard}
                    className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-blue-500/50 bg-slate-800/90 hover:border-blue-400 active:scale-95 transition-all"
                >
                    <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                        <Plus className="w-7 h-7 text-blue-400" strokeWidth={2.5} />
                        <span className="text-blue-400 text-xs font-bold uppercase tracking-wide">Add Card</span>
                    </div>
                </button>

                {/* SLOT 3: CANCEL (targeting mode) OR SELECT ALL (Main 2 or no phase) OR END TURN (other phases) */}
                {isTargetingMode ? (
                    <button
                        onClick={onCancelTargeting}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-red-500/50 bg-red-900/40 hover:border-red-400 hover:bg-red-900/60 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <X className="w-7 h-7 text-red-400" />
                            <span className="text-red-400 text-xs font-bold uppercase tracking-wide">Cancel</span>
                        </div>
                    </button>
                ) : (currentPhase && currentPhase !== 'Main 2') ? (
                    <button
                        onClick={onEndTurn}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-slate-500/50 bg-slate-800/90 hover:border-red-400/80 hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <RotateCcw className="w-7 h-7 text-gray-400 group-hover:text-red-300" />
                            <span className="text-gray-400 group-hover:text-red-300 text-xs font-bold uppercase tracking-wide">End Turn</span>
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={onSelectAll}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-purple-500/50 bg-slate-800/90 hover:border-purple-400 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <CheckCircle className="w-7 h-7 text-purple-400" />
                            <span className="text-purple-400 text-xs font-bold uppercase tracking-wide">Select All</span>
                        </div>
                    </button>
                )}

                {/* LANDS Button (Slot 4) - Only visible during Main Phases or when no turn is active */}
                {(!currentPhase || currentPhase.includes('Main')) && (
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
                )}

            </div>
        </div>
    );
};

export default BottomControlPanel;
