import React from 'react';
import { Undo2, Plus, ChevronRight, Play, MoreHorizontal } from 'lucide-react';

const BarButton = ({ onClick, disabled = false, icon: Icon, label, accent = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1.5 h-11 px-3 sm:px-4 rounded-lg text-sm font-semibold transition-all active:scale-95
            ${accent
                ? 'border border-amber-500/60 bg-amber-950/30 text-amber-300 hover:border-amber-400'
                : disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
    >
        <Icon className="w-4 h-4" />
        <span className="whitespace-nowrap">{label}</span>
    </button>
);

/**
 * Thin persistent bottom bar for landscape: Undo · Add · Next phase (accented)
 * · Auto · More. Rendered in-flow at the bottom of the root column — no
 * gestures. While targeting mode owns the flow (disablePhaseActions), the
 * phase/Auto/More buttons HIDE (not just disable) so the floating targeting
 * box can drop into their space; Undo and Add stay on the left.
 */
const BottomBar = ({
    onUndo,
    canUndo = false,
    onAddCard,
    onNextPhase,
    nextPhaseLabel = 'Next phase',
    onAutoCalculate,
    onOpenMore,
    disablePhaseActions = false
}) => {
    return (
        <div
            className={`shrink-0 border-t border-slate-700/60 bg-slate-900/90 backdrop-blur-md flex items-center px-2 z-50 ${disablePhaseActions ? 'justify-start gap-2' : 'justify-around'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', minHeight: '3.5rem' }}
        >
            <BarButton onClick={onUndo} disabled={!canUndo} icon={Undo2} label="Undo" />
            <BarButton onClick={onAddCard} icon={Plus} label="Add" />
            {!disablePhaseActions && (
                <>
                    <BarButton onClick={onNextPhase} icon={ChevronRight} label={nextPhaseLabel} accent />
                    <BarButton onClick={onAutoCalculate} icon={Play} label="Auto" />
                    <BarButton onClick={onOpenMore} icon={MoreHorizontal} label="More" />
                </>
            )}
        </div>
    );
};

export default BottomBar;
