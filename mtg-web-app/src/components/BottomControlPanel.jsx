import React from 'react';
import { Play, Plus, CheckCircle, Globe, ArrowRight, RotateCcw, X, MoreHorizontal } from 'lucide-react';

const CardButton = ({
    onClick,
    disabled = false,
    colorTheme = 'blue', // blue, red, green, purple, yellow, slate, emerald
    icon: Icon,
    label,
    topLabel,
    subLabel,
    rotation = 0,
    translateY = 0,
    isActive = true
}) => {
    // Original style mappings
    const getStyles = () => {
        if (disabled) return 'border-slate-600/50 bg-slate-800/50 opacity-50 cursor-not-allowed';

        switch (colorTheme) {
            case 'purple': // Confirm / Select
                return 'border-purple-500/50 bg-slate-800/90 hover:border-purple-400 text-purple-400';
            case 'emerald': // Resolve
                return 'border-emerald-500/50 bg-emerald-900/40 hover:border-emerald-400 hover:bg-emerald-900/60 text-emerald-400';
            case 'blue': // Add Card / Next Phase
                return 'border-blue-500/50 bg-slate-800/90 hover:border-blue-400 text-blue-400';
            case 'red': // Cancel / Reject / Attack / Main 1
                return 'border-red-500/50 bg-slate-800/90 hover:border-red-400 text-red-400';
            case 'red-transparent': // Cancel specific (was bg-red-900/40)
                return 'border-red-500/50 bg-red-900/40 hover:border-red-400 hover:bg-red-900/60 text-red-400';
            case 'green': // Start Turn / Main Phase 1
                return 'border-green-500/50 bg-slate-800/90 hover:border-green-400 text-green-400';
            case 'yellow': // Calculate
                return 'border-yellow-500/50 bg-slate-800/90 hover:border-yellow-400 text-yellow-400 text-yellow-400 fill-current';
            case 'orange': // Declare Attackers (Combat)
                return 'border-orange-500/50 bg-slate-800/90 hover:border-orange-400 text-orange-400';
            case 'slate': // Clean Up / End Turn
                return 'border-slate-500/50 bg-slate-800/90 hover:border-slate-400 text-gray-400';
            default:
                return 'border-slate-500/50 bg-slate-800/90 hover:border-slate-400 text-gray-400';
        }
    };

    const baseStyles = getStyles();

    // Extract text color class for internal elements if needed, though usually inherited or explicit
    const textColorClass = baseStyles.match(/text-[\w-]+/)?.[0] || 'text-gray-400';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative
                w-[100px] h-[140px] rounded-xl 
                transition-all duration-300 ease-out
                border-2 shadow-lg
                ${baseStyles}
                ${isActive ? 'shadow-2xl' : 'opacity-0 pointer-events-none'}
                active:scale-95
            `}
            style={{
                transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                transformOrigin: 'bottom center',
                marginBottom: -50 // Pull them down so they poke up
            }}
        >
            {/* Inner Layout (Mimicking Card but with original button feel) */}
            <div className="h-full flex flex-col">

                {/* Header (Main Action Label) */}
                <div className="h-8 w-full flex items-center justify-center border-b border-white/10 bg-black/40">
                    <span className={`text-xs font-bold uppercase tracking-wide leading-tight ${textColorClass}`}>
                        {label}
                    </span>
                </div>

                {/* Main Icon Area - Expands to fill the rest of the card */}
                <div className="flex-1 flex items-center justify-center p-3 relative">
                    <Icon className={`w-12 h-12 ${textColorClass}`} strokeWidth={2} />
                    {subLabel && (
                        <div className="absolute top-2 right-2 bg-slate-900/80 rounded-full px-2 py-0.5 border border-white/10 shadow-lg">
                            <span className="text-[10px] font-bold text-white">{subLabel.split(' ')[0]}</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

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
    onConfirmTargeting,
    confirmLabel = 'Confirm',
    isConfirmDisabled = false,
    showSelectAll = false,
    stackCount = 0,
    onResolveStackItem,
    onRejectStackItem,
    autoMode = false,
    onDeclareAttackers,
    isTargetingMode = false,
    onCancelTargeting,
    hasEndStepActions = false,
    targetingMode = {}
}) => {
    // 1. Collect Active Buttons
    const buttons = [];

    // --- LEFT ACTION ---
    if (isTargetingMode) {
        buttons.push({
            id: 'confirm',
            onClick: onConfirmTargeting,
            disabled: isConfirmDisabled,
            colorTheme: isConfirmDisabled ? 'slate' : 'purple',
            icon: CheckCircle,
            label: isConfirmDisabled ? 'Select' : confirmLabel,
        });
    } else if (stackCount > 0) {
        buttons.push({
            id: 'resolve',
            onClick: onResolveStackItem,
            colorTheme: "emerald",
            icon: CheckCircle,
            label: "Resolve",
            subLabel: `${stackCount} Item${stackCount > 1 ? 's' : ''}`,
        });
    } else if (autoMode) {
        if (currentPhase === 'Main 2') {
            if (hasEndStepActions) {
                buttons.push({ id: 'cleanup', onClick: onEndTurn, colorTheme: "slate", icon: RotateCcw, label: "Clean Up" });
            } else {
                buttons.push({ id: 'calculate', onClick: onEndTurn, colorTheme: "yellow", icon: Play, label: "Calculate" });
            }
        } else {
            buttons.push({ id: 'calculate', onClick: onAdvancePhase, colorTheme: "yellow", icon: Play, label: "Calculate" });
        }
    } else if (!currentPhase) {
        buttons.push({ id: 'start', onClick: onStartTurn, colorTheme: "green", icon: Play, label: "Start Turn" });
    } else {
        const theme = currentPhase === 'Main 1' ? 'red' : currentPhase === 'Main 2' ? 'slate' : 'blue';
        const icon = (currentPhase === 'Main 1' || currentPhase === 'Combat') ? ArrowRight : currentPhase === 'Main 2' ? RotateCcw : ArrowRight;
        const labelText = currentPhase === 'Main 1' ? 'Attack!' : currentPhase === 'Combat' ? 'Declare Blocks' : currentPhase === 'Main 2' ? 'End Turn' : 'Next Phase';
        buttons.push({ id: 'phase', onClick: onAdvancePhase, colorTheme: theme, icon: icon, label: labelText });
    }

    // --- CENTER ACTION ---
    if (isTargetingMode) {
        if (showSelectAll) {
            buttons.push({ id: 'selectAll', onClick: onSelectAll, colorTheme: "purple", icon: CheckCircle, label: "Select All" });
        }
    } else {
        buttons.push({ id: 'add', onClick: onAddCard, colorTheme: "blue", icon: Plus, label: "Add Card" });
    }

    // --- RIGHT ACTION ---
    if (isTargetingMode) {
        buttons.push({ id: 'cancel', onClick: onCancelTargeting, colorTheme: "red", icon: X, label: "Cancel" });
    } else if (stackCount > 0) {
        buttons.push({ id: 'reject', onClick: onRejectStackItem, colorTheme: "red", icon: X, label: "Reject" });
    } else if (currentPhase && currentPhase !== 'Main 2') {
        buttons.push({ id: 'endTurn', onClick: onEndTurn, colorTheme: "slate", icon: RotateCcw, label: "End Turn" });
    } else if (autoMode) {
        buttons.push({ id: 'declareAttackers', onClick: onDeclareAttackers, colorTheme: "red", icon: ArrowRight, label: "Attack" });
    } else if (!isTargetingMode) {
        buttons.push({ id: 'more', onClick: onOpenMore, colorTheme: "slate", icon: MoreHorizontal, label: "More" });
    }

    return (
        <div className="fixed bottom-0 left-0 w-full flex justify-center items-end pointer-events-none z-50 overflow-visible" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-end justify-center -space-x-4 pointer-events-auto pb-4">
                {buttons.map((btn, index) => {
                    let rotation = 0;
                    let translateY = 0;
                    let zIndex = 10;
                    const total = buttons.length;

                    if (total === 2) {
                        rotation = index === 0 ? -4 : 4;
                        zIndex = 10 + index;
                    } else if (total === 3) {
                        if (index === 0) rotation = -6;
                        if (index === 1) {
                            rotation = 0;
                            translateY = -10;
                            zIndex = 30; // Center is on top
                        }
                        if (index === 2) {
                            rotation = 6;
                            zIndex = 10;
                        }
                    }

                    return (
                        <div key={btn.id} className="transition-all" style={{ zIndex }}>
                            <CardButton
                                {...btn}
                                rotation={rotation}
                                translateY={translateY}
                                isActive={true}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomControlPanel;
