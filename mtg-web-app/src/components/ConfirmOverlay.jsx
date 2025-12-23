import React, { useMemo } from 'react';
import { Sword, CheckCircle, X, CheckSquare, Link, Zap, Trash2 } from 'lucide-react';
import { TopBanner, ArtWindow, BottomBanner } from './RedesignedCardFrame';
import BattlefieldCard from './BattlefieldCard';

// Get mode-specific labels and styling
const getModeConfig = (mode) => {
    const configs = {
        'declare-attackers': {
            title: 'Declare Attackers',
            icon: Sword,
            confirmLabel: 'Confirm Attacks',
            color: 'red',
            showSelectAll: true
        },
        'equip': {
            title: 'Choose Target',
            icon: Link,
            confirmLabel: 'Equip',
            color: 'blue',
            showSelectAll: false
        },
        'activate-ability': {
            title: 'Choose Target',
            icon: Zap,
            confirmLabel: 'Confirm Target',
            color: 'purple',
            showSelectAll: false
        },
        'enchant': {
            title: 'Choose Target',
            icon: Zap,
            confirmLabel: 'Enchant',
            color: 'purple',
            showSelectAll: false
        },
        'remove-to-zone': {
            title: 'Select Zone',
            icon: Trash2,
            confirmLabel: 'Confirm',
            color: 'slate',
            showSelectAll: false
        }
    };
    return configs[mode] || configs['declare-attackers'];
};

const ConfirmOverlay = ({
    isVisible,
    mode = 'declare-attackers',
    eligibleTargets = [],
    selectedIds = [],
    sourceCard = null,
    allCards = [],
    onSelectCard,
    onSelectAll,
    onConfirm,
    onCancel
}) => {
    if (!isVisible) return null;

    const config = getModeConfig(mode);
    const IconComponent = config.icon;

    // Group identical targets into stacks
    const targetStacks = useMemo(() => {
        const groups = [];
        const groupMap = new Map();

        eligibleTargets.forEach(card => {
            // Key for stacking - same name, tapped state, counters
            const key = `${card.name}|${card.tapped}|${JSON.stringify(card.counters)}`;

            if (!groupMap.has(key)) {
                const group = { key, leader: card, count: 1, cards: [card] };
                groupMap.set(key, group);
                groups.push(group);
            } else {
                const group = groupMap.get(key);
                group.count++;
                group.cards.push(card);
            }
        });
        return groups;
    }, [eligibleTargets]);

    const colorClasses = {
        red: {
            border: 'border-red-500/50',
            bg: 'bg-red-900/40',
            hoverBg: 'hover:bg-red-900/60',
            hoverBorder: 'hover:border-red-400',
            text: 'text-red-400',
            icon: 'text-red-500'
        },
        blue: {
            border: 'border-blue-500/50',
            bg: 'bg-blue-900/40',
            hoverBg: 'hover:bg-blue-900/60',
            hoverBorder: 'hover:border-blue-400',
            text: 'text-blue-400',
            icon: 'text-blue-500'
        },
        purple: {
            border: 'border-purple-500/50',
            bg: 'bg-purple-900/40',
            hoverBg: 'hover:bg-purple-900/60',
            hoverBorder: 'hover:border-purple-400',
            text: 'text-purple-400',
            icon: 'text-purple-500'
        },
        slate: {
            border: 'border-slate-500/50',
            bg: 'bg-slate-800/90',
            hoverBg: 'hover:bg-slate-700',
            hoverBorder: 'hover:border-slate-400',
            text: 'text-slate-300',
            icon: 'text-slate-400'
        }
    };

    const colors = colorClasses[config.color] || colorClasses.red;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Top Section: Eligible Targets Row */}
            <div className="flex-1 flex flex-col items-center justify-center pb-8 px-4 w-full">
                {/* Target Cards Row - Scrollable */}
                <div className="w-full max-w-6xl overflow-x-auto overflow-y-visible py-8 px-4">
                    <div className="flex gap-4 w-fit mx-auto">
                        {targetStacks.length > 0 ? (
                            targetStacks.map((stack) => {
                                const selectedCount = stack.cards.filter(c => selectedIds.includes(c.id)).length;
                                const attachments = allCards.filter(c => c.attachedTo === stack.leader.id);
                                return (
                                    <div
                                        key={stack.key}
                                        className="relative cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectCard(stack.leader.id);
                                        }}
                                    >
                                        <BattlefieldCard
                                            card={stack.leader}
                                            isRelative={true}
                                            count={stack.count}
                                            selectedCount={selectedCount}
                                            isSelected={selectedCount > 0}
                                            attachments={attachments}
                                            allCards={allCards}
                                            onMouseDown={(e) => {
                                                // Handle selection directly via BattlefieldCard's prop
                                                onSelectCard(stack.leader.id);
                                            }}
                                        // Don't pass isTargeting or isValidTarget - let selection state handle visuals
                                        />
                                        {/* Selection Overlay Indicator */}
                                        {(selectedCount > 0) && (
                                            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full px-2 py-1 shadow-lg flex items-center gap-1 z-[60] animate-in zoom-in pointer-events-none">
                                                <CheckCircle size={14} className="text-white" />
                                                {stack.count > 1 && (
                                                    <span className="text-white text-xs font-bold">{selectedCount}/{stack.count}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-gray-400 text-center py-8 text-lg">
                                No eligible targets available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Source Card Display - Full BattlefieldCard */}
            {sourceCard && (
                <div className="flex flex-col items-center pb-4">
                    <span className="text-gray-400 text-sm mb-2 font-medium">Source</span>
                    <div className="relative">
                        <BattlefieldCard
                            card={sourceCard}
                            isSelected={false}
                            isSource={true}
                            onMouseDown={() => { }}
                            onAction={() => { }}
                            allCards={allCards}
                            attachments={allCards.filter(c => c.attachedTo === sourceCard.id)}
                            isRelative={true}
                        />
                    </div>
                </div>
            )}

            {/* Bottom Control Bar */}
            <div className="px-3 py-3 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-700">
                <div className="flex gap-2 justify-center items-center max-w-2xl mx-auto">

                    {/* SELECT ALL Button (only for multi-select modes) */}
                    {config.showSelectAll && (
                        <button
                            onClick={onSelectAll}
                            className="flex-1 max-w-[140px] h-16 rounded-lg overflow-hidden shadow-lg border-2 border-blue-500/50 bg-slate-800/90 hover:border-blue-400 active:scale-95 transition-all"
                        >
                            <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                                <CheckSquare className="w-6 h-6 text-blue-400" />
                                <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wide">Select All</span>
                            </div>
                        </button>
                    )}

                    {/* CONFIRM Button */}
                    <button
                        onClick={onConfirm}
                        disabled={selectedIds.length === 0}
                        className={`flex-1 max-w-[180px] h-16 rounded-lg overflow-hidden shadow-lg border-2 
                            ${selectedIds.length > 0
                                ? `${colors.border} ${colors.bg} ${colors.hoverBg} ${colors.hoverBorder}`
                                : 'border-slate-600/50 bg-slate-800/50 opacity-50 cursor-not-allowed'
                            } active:scale-95 transition-all`}
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <IconComponent className={`w-6 h-6 ${selectedIds.length > 0 ? colors.icon : 'text-gray-500'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${selectedIds.length > 0 ? colors.text : 'text-gray-500'}`}>
                                {config.confirmLabel}
                            </span>
                        </div>
                    </button>

                    {/* CANCEL Button */}
                    <button
                        onClick={onCancel}
                        className="flex-1 max-w-[140px] h-16 rounded-lg overflow-hidden shadow-lg border-2 border-slate-600/50 bg-slate-800/90 hover:border-slate-400 active:scale-95 transition-all"
                    >
                        <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
                            <X className="w-6 h-6 text-gray-400" />
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wide">Cancel</span>
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ConfirmOverlay;
