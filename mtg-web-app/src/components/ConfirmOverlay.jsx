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
    stackSource = null, // Stack ability item to show instead of sourceCard
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

            {/* Source Display - Stack or Card */}
            {mode === 'resolve-trigger' ? (
                <div className="flex flex-col items-center pb-4">
                    <span className="text-gray-400 text-sm mb-2 font-medium">The Stack</span>
                    {/* Stack Container with Cascade - centered and explicit dimensions */}
                    <div className="relative flex items-center justify-center" style={{ width: '240px', height: '180px' }}>
                        {(!stackSource || stackSource.length === 0) ? (
                            <div className="text-gray-500 text-xs italic">Stack Empty</div>
                        ) : (
                            (Array.isArray(stackSource) ? stackSource : [stackSource]).slice(-4).map((item, index, visibleItems) => {
                                const depth = (visibleItems.length - 1) - index;

                                // Calculate cascade offsets
                                // Depth 0: Front
                                // Depth > 0: Behind, down and left
                                const translateX = -(depth * 16);
                                const translateY = (depth * 12);
                                const scale = 1 - (depth * 0.05);
                                const opacity = 1 - (depth * 0.15);
                                const zIndex = 50 - depth;
                                const isTop = depth === 0;

                                return (
                                    <div
                                        key={item.id || index}
                                        className="absolute"
                                        style={{
                                            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                                            zIndex: zIndex,
                                            opacity: Math.max(0, opacity),
                                            transformOrigin: 'bottom left',
                                            left: '35px',
                                            top: '20px'
                                        }}
                                    >
                                        {/* Full Card Structure */}
                                        <div className={`relative flex flex-col items-center rounded-xl transition-all duration-300 ${isTop ? 'shadow-[0_0_25px_rgba(59,130,246,1)]' : ''}`}>
                                            {/* Top Banner */}
                                            <div className="z-30 relative" style={{ marginBottom: '-4px' }}>
                                                <div style={{
                                                    width: '140px',
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    padding: '0px 4px',
                                                    boxSizing: 'border-box'
                                                }}>
                                                    {/* Color Indicator Dot */}
                                                    <div style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        backgroundColor: item.sourceColors?.[0]
                                                            ? (item.sourceColors[0] === 'R' ? 'rgb(239, 68, 68)' :
                                                                item.sourceColors[0] === 'U' ? 'rgb(59, 130, 246)' :
                                                                    item.sourceColors[0] === 'G' ? 'rgb(34, 197, 94)' :
                                                                        item.sourceColors[0] === 'W' ? 'rgb(255, 255, 255)' :
                                                                            item.sourceColors[0] === 'B' ? 'rgb(0, 0, 0)' : 'rgb(156, 163, 175)')
                                                            : 'rgb(156, 163, 175)',
                                                        flexShrink: 0,
                                                        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 1px 2px',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                                    }} />
                                                    {/* Card Name */}
                                                    <div style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                        <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: 'rgb(255, 255, 255)' }}>
                                                            {item.sourceName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Art */}
                                            <div className="z-30 relative">
                                                <div style={{
                                                    width: '140px',
                                                    height: '100px',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    backgroundColor: 'rgb(26, 26, 26)',
                                                    boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 4px',
                                                    position: 'relative'
                                                }}>
                                                    <img
                                                        alt={item.sourceName}
                                                        className="w-full h-full object-cover"
                                                        src={item.sourceArt || 'https://via.placeholder.com/140x100'}
                                                        style={{ objectPosition: '0% 15%' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Bottom Banner */}
                                            <div className="z-30 relative" style={{ marginTop: '4px' }}>
                                                <div style={{
                                                    width: '140px',
                                                    height: '28px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0px 4px',
                                                    boxSizing: 'border-box'
                                                }}>
                                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            <div className="w-full flex justify-center items-center px-1">
                                                                <span className="text-[9px] font-semibold truncate leading-tight text-center" style={{ color: 'rgb(255, 255, 255)' }}>
                                                                    {item.description}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : sourceCard ? (
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
            ) : null}

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
