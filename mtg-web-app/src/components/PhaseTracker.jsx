import React from 'react';
import { RotateCcw, Play, ArrowRight } from 'lucide-react';

const PHASE_ORDER = ['Beginning', 'Main', 'Combat', 'Main 2', 'End'];
const PHASE_INFO = {
    Beginning: { label: 'Untap/Upkeep', icon: RotateCcw },
    Main: { label: 'Main Phase', icon: () => <span className="text-lg">⚡</span> },
    Combat: { label: 'Combat', icon: () => <span className="text-lg">⚔️</span> },
    'Main 2': { label: 'Main Phase 2', icon: () => <span className="text-lg">⚡</span> },
    End: { label: 'End Step', icon: () => <span className="text-lg">📜</span> }
};

const COMBAT_STEPS = [
    'Beginning of Combat',
    'Declare Attackers',
    'Declare Blockers',
    'Combat Damage',
    'End of Combat'
];

const PhaseTracker = ({
    isVisible,
    currentPhase,
    currentCombatStep,
    phaseInfo,
    onPhaseChange,
    onAdvancePhase,
    onAdvanceCombatStep,
    onEndTurn
}) => {
    if (!isVisible) return null;

    // Use passed phaseInfo or fallback to local PHASE_INFO
    const effectivePhaseInfo = phaseInfo || PHASE_INFO;

    return (
        <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-700 flex-shrink-0 z-40 animate-in slide-in-from-bottom duration-200">
            {/* Combat Step Indicator - Shows when in Combat Phase */}
            {currentPhase === 'Combat' && currentCombatStep && (
                <div className="px-4 pt-4 flex justify-center">
                    <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-600/50 shadow-lg">
                        <div className="flex items-center gap-2">
                            {COMBAT_STEPS.map((step, index) => {
                                const currentIdx = COMBAT_STEPS.indexOf(currentCombatStep);
                                const isActive = step === currentCombatStep;
                                const isPast = index < currentIdx;

                                return (
                                    <React.Fragment key={step}>
                                        {/* Combat Step Bubble */}
                                        <div
                                            className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isActive
                                                    ? 'bg-blue-500 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800'
                                                    : isPast
                                                        ? 'bg-green-600/50 text-green-200'
                                                        : 'bg-slate-700 text-slate-400'
                                                    }`}
                                            >
                                                {index + 1}
                                            </div>
                                            <div
                                                className={`text-[9px] mt-1 max-w-[60px] text-center leading-tight transition-all duration-300 ${isActive
                                                    ? 'text-blue-300 font-semibold'
                                                    : isPast
                                                        ? 'text-green-300/70'
                                                        : 'text-slate-500'
                                                    }`}
                                            >
                                                {step}
                                            </div>
                                        </div>

                                        {/* Connector Line */}
                                        {index < COMBAT_STEPS.length - 1 && (
                                            <div
                                                className={`w-8 h-0.5 mb-4 transition-all duration-300 ${index < currentIdx ? 'bg-green-500/50' : 'bg-slate-600'}`}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Phase Buttons */}
            <div className="p-4 flex justify-center">
                <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50 shadow-xl">
                    <div className="flex items-center gap-3 px-4">
                        {PHASE_ORDER.map((phase) => {
                            const info = effectivePhaseInfo[phase];
                            const Icon = info?.icon || (() => null);
                            const isActive = currentPhase === phase;
                            return (
                                <button
                                    key={phase}
                                    onClick={() => onPhaseChange(phase)}
                                    className={`flex flex-col items-center gap-1 transition-all duration-300 hover:scale-110 active:scale-95 ${isActive ? 'text-blue-400 scale-110' : 'text-gray-600 hover:text-gray-400'}`}
                                    title={info?.label || phase}
                                >
                                    <div className={`p-2 rounded-full ${isActive ? 'bg-blue-500/20 ring-2 ring-blue-500' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                        {typeof Icon === 'function' ? <Icon size={16} /> : <Icon size={16} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-8 w-px bg-slate-700 mx-2" />

                    <div className="flex gap-2">
                        {!currentPhase ? (
                            <button
                                onClick={() => onPhaseChange('Beginning')}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
                            >
                                <Play size={20} fill="currentColor" />
                                START TURN
                            </button>
                        ) : currentPhase === 'End' ? (
                            <button
                                onClick={onEndTurn}
                                className="px-6 py-2 bg-slate-700 hover:bg-red-900/50 text-gray-300 hover:text-red-200 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                            >
                                <RotateCcw size={16} />
                                End Turn
                            </button>
                        ) : currentPhase === 'Combat' ? (
                            <>
                                <button
                                    onClick={onAdvanceCombatStep}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                                >
                                    Next Step <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={onEndTurn}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2"
                                >
                                    <RotateCcw size={14} />
                                    End Turn
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onAdvancePhase}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                                >
                                    Next Phase <ArrowRight size={16} />
                                </button>
                                <button
                                    onClick={onEndTurn}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2"
                                >
                                    <RotateCcw size={14} />
                                    End Turn
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhaseTracker;
