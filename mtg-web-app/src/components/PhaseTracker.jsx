import React from 'react';
import { RotateCcw, Play, ArrowRight, CheckSquare, CheckCircle } from 'lucide-react';

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
    onEndTurn,
    isAttackerStep,
    onToggleSelectAll,
    onConfirmAttackers
}) => {
    if (!isVisible) return null;

    // Use passed phaseInfo or fallback to local PHASE_INFO
    const effectivePhaseInfo = phaseInfo || PHASE_INFO;

    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 animate-in slide-in-from-bottom duration-200 w-auto max-w-[95vw]">
            {/* Combat Step Indicator Dots - Shows when in Combat Phase */}
            {currentPhase === 'Combat' && currentCombatStep && (
                <div className="flex items-center gap-2 mb-1 animate-in fade-in duration-300">
                    {COMBAT_STEPS.map((step, index) => {
                        const currentIdx = COMBAT_STEPS.indexOf(currentCombatStep);
                        const isActive = step === currentCombatStep;
                        const isPast = index < currentIdx;

                        return (
                            <div
                                key={step}
                                className="group relative"
                                title={step}
                            >
                                <div
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive
                                        ? 'bg-red-400 ring-2 ring-red-500/30 scale-125'
                                        : isPast
                                            ? 'bg-slate-500/50'
                                            : 'bg-slate-700'
                                        }`}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Phase Step Dots - Purely Visual */}
            <div className="flex items-center gap-3 px-4 mb-1">
                {PHASE_ORDER.map((phase) => {
                    const isActive = currentPhase === phase;
                    const info = effectivePhaseInfo[phase];
                    return (
                        <div
                            key={phase}
                            className="group relative flex flex-col items-center"
                            title={info?.label || phase}
                        >
                            <div
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isActive
                                    ? 'bg-blue-400 ring-4 ring-blue-500/20 scale-125'
                                    : 'bg-slate-600'
                                    }`}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons Pill */}
            {/* REMOVED: Buttons moved to BottomControlPanel. PhaseTracker is now purely visual. */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-600/50 shadow-2xl">
                <span className="text-gray-300 font-bold text-sm uppercase tracking-wide">
                    {currentPhase === 'Combat' && currentCombatStep ? currentCombatStep : effectivePhaseInfo[currentPhase]?.label || 'Set Phase'}
                </span>
            </div>
        </div>
    );
};

export default PhaseTracker;
