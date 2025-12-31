import React from 'react';
import { Play, Plus, CheckCircle, Globe, ArrowRight, RotateCcw, X, MoreHorizontal } from 'lucide-react';

const BottomControlPanel = ({
    onStartTurn,
    onAddCard,
    onSelectAll,
    onOpenMore,
    landCount = 0,
    currentPhase,
    currentCombatStep,
    onAdvancePhase,
    onEndTurn,
    isTargetingMode = false,
    onCancelTargeting,
    onConfirmTargeting,
    confirmLabel = 'Confirm',
    isConfirmDisabled = false,
    showSelectAll = false,
    stackCount = 0,
    onResolveStackItem,
    onRejectStackItem
}) => {
    return (
        <div className="px-3 py-3 w-full animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2 justify-center items-center max-w-2xl mx-auto">

                {/* SLOT 1: GAME FLOW (Normal) or CONFIRM (Targeting) or RESOLVE (Stack) */}
                {isTargetingMode ? (
                    <button
                        onClick={onConfirmTargeting}
                        disabled={isConfirmDisabled}
                        className={`flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 transition-all active:scale-95 
                            ${!isConfirmDisabled
                                ? 'border-purple-500/50 bg-slate-800/90 hover:border-purple-400'
                                : 'border-slate-600/50 bg-slate-800/50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <CheckCircle className={`w-8 h-8 ${!isConfirmDisabled ? 'text-purple-400' : 'text-gray-500'}`} />
                            <span className={`text-xs font-bold uppercase tracking-wide ${!isConfirmDisabled ? 'text-purple-400' : 'text-gray-500'}`}>
                                {confirmLabel}
                            </span>
                        </div>
                    </button>
                ) : stackCount > 0 ? (
                    // RESOLVE STACK ITEM
                    <button
                        onClick={onResolveStackItem}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-emerald-500/50 bg-emerald-900/40 hover:border-emerald-400 hover:bg-emerald-900/60 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <div className="relative">
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">{stackCount}</div>
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">Resolve</span>
                        </div>
                    </button>
                ) : !currentPhase ? (
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
                        className={`flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 transition-all active:scale-95 
                            ${currentPhase === 'Main 1'
                                ? 'border-red-500/50 bg-slate-800/90 hover:border-red-400'
                                : currentPhase === 'Main 2'
                                    ? 'border-slate-500/50 bg-slate-800/90 hover:border-slate-400'
                                    : 'border-blue-500/50 bg-slate-800/90 hover:border-blue-400'
                            }`}
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3 text-center">
                            {currentPhase === 'Main 1' ? (
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

                {/* SLOT 2: ADD CARD (Normal) or SELECT ALL (Targeting - if enabled) */}
                {isTargetingMode ? (
                    showSelectAll ? (
                        <button
                            onClick={onSelectAll}
                            className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-purple-500/50 bg-slate-800/90 hover:border-purple-400 active:scale-95 transition-all"
                        >
                            <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                                <CheckCircle className="w-7 h-7 text-purple-400" />
                                <span className="text-purple-400 text-xs font-bold uppercase tracking-wide">Select All</span>
                            </div>
                        </button>
                    ) : (
                        <div className="w-[140px] hidden sm:block"></div> // Spacer if no select all
                    )
                ) : (
                    <button
                        onClick={onAddCard}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-blue-500/50 bg-slate-800/90 hover:border-blue-400 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <Plus className="w-7 h-7 text-blue-400" strokeWidth={2.5} />
                            <span className="text-blue-400 text-xs font-bold uppercase tracking-wide">Add Card</span>
                        </div>
                    </button>
                )}

                {/* SLOT 3: CANCEL (targeting mode) OR REJECT (Stack) OR END TURN/SelectAll (Normal) */}
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
                ) : stackCount > 0 ? (
                    // REJECT STACK ITEM
                    <button
                        onClick={onRejectStackItem}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-red-500/50 bg-red-900/40 hover:border-red-400 hover:bg-red-900/60 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <X className="w-7 h-7 text-red-400" />
                            <span className="text-red-400 text-xs font-bold uppercase tracking-wide">Reject</span>
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
                    <div className="flex-1 max-w-[140px]"></div>
                )}

                {/* SLOT 4: MORE - Hidden in Targeting Mode */}
                {!isTargetingMode && (!currentPhase || currentPhase.includes('Main')) && (
                    <button
                        onClick={onOpenMore}
                        className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-slate-500/50 bg-slate-800/90 hover:border-slate-400 active:scale-95 transition-all text-slate-400 hover:text-white"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <MoreHorizontal className="w-8 h-8" />
                        </div>
                    </button>
                )}

            </div>
        </div>
    );
};

export default BottomControlPanel;
