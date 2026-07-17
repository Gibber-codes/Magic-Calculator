import React from 'react';
import { Check, X, CheckCircle } from 'lucide-react';
import { getModeConfig } from '../utils/modeConfig';
import { calculateEffectiveTotal } from '../utils/cardUtils';

/**
 * Targeting confirmation panel for the landscape floating box. Replaces the
 * floating Declare Attackers/Blockers banners and the BottomControlPanel
 * confirm/cancel buttons — the battlefield stays fully visible while choosing
 * targets. Mode context ("Choose targets", the phase name) lives in the app
 * header, so the panel is just source context + actions.
 */
const DockTargetingPanel = ({
    targetingMode,
    cards = [],
    onConfirm,
    onCancel,
    onSelectAll,
    isConfirmDisabled = false
}) => {
    if (!targetingMode?.active) return null;

    const config = getModeConfig(targetingMode.action);

    const sourceCard = targetingMode.sourceId
        ? cards.find(c => c.id === targetingMode.sourceId)
        : (targetingMode.data?.sourceCard || null);

    const abilityDescription = targetingMode.data?.description
        || targetingMode.data?.ability?.description
        || targetingMode.data?.stackAbility?.description
        || '';

    const selectedCount = calculateEffectiveTotal(
        cards.filter(c => targetingMode.selectedIds?.includes(c.id))
    );
    const isCombatMode = ['declare-attackers', 'declare-blockers'].includes(targetingMode.action);

    return (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
            {/* Source card context */}
            {sourceCard && (
                <div className="flex items-start gap-2.5 bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5">
                    {(sourceCard.art_crop || sourceCard.image_normal) && (
                        <img
                            src={sourceCard.art_crop || sourceCard.image_normal}
                            alt={sourceCard.name}
                            className="w-12 h-12 rounded object-cover border border-slate-600 shrink-0"
                        />
                    )}
                    <div className="min-w-0">
                        <div className="text-white font-semibold text-xs truncate">{sourceCard.name}</div>
                        {abilityDescription && (
                            <div className="text-slate-400 text-[11px] leading-snug line-clamp-3 mt-0.5">
                                {abilityDescription}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Instruction when nothing selected yet */}
            {selectedCount === 0n && (
                <p className="text-gray-500 text-xs leading-snug">
                    {isCombatMode
                        ? 'Tap creatures on the battlefield to select them.'
                        : 'Tap a highlighted card on the battlefield to choose it.'}
                </p>
            )}

            {/* Select All (attackers) */}
            {config.showSelectAll && (
                <button
                    onClick={onSelectAll}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-purple-500/50 bg-slate-800/80 hover:border-purple-400 text-purple-300 text-sm font-bold transition-all active:scale-95"
                >
                    <CheckCircle className="w-4 h-4" />
                    Select All
                </button>
            )}

            {/* Confirm / Cancel */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={onConfirm}
                    disabled={isConfirmDisabled}
                    className={`h-14 flex flex-col items-center justify-center gap-0.5 rounded-lg border font-bold text-sm transition-all active:scale-95
                        ${isConfirmDisabled
                            ? 'border-slate-600/50 bg-slate-800/50 text-gray-500 cursor-not-allowed'
                            : 'border-emerald-500/60 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300'}`}
                >
                    <Check className="w-5 h-5" />
                    {isConfirmDisabled ? 'Select' : config.confirmLabel}
                </button>
                <button
                    onClick={onCancel}
                    className="h-14 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-red-500/60 bg-red-900/30 hover:bg-red-900/50 text-red-300 font-bold text-sm transition-all active:scale-95"
                >
                    <X className="w-5 h-5" />
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default DockTargetingPanel;
