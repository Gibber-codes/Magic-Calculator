import React, { useState } from 'react';
import { Plus, Minus, Trash2, RotateCcw, Sparkles, Sword, Layers } from 'lucide-react';
import { TopBanner, ArtWindow, BottomBanner, PowerToughnessBanner } from './RedesignedCardFrame';
import { formatBigNumber } from '../utils/formatters';

// Constants
const CARD_WIDTH = 140;

// Card Colors - Hex mapping for SVGs
const getCardHexColors = (colors) => {
    // Default Gray (Artifact/Colorless)
    let c = { borderColor: '#6b7280', fillColor: '#374151', text: 'black' };

    if (!colors || colors.length === 0) return c;

    if (colors.length > 1) {
        // Gold
        return { borderColor: '#ca8a04', fillColor: '#eab308', text: 'black' };
    }

    const map = {
        'W': { borderColor: '#d4d4d8', fillColor: '#fef9c3', text: 'black' }, // Zinc/Yellow
        'U': { borderColor: '#2563eb', fillColor: '#60a5fa', text: 'black' }, // Blue
        'B': { borderColor: '#1f2937', fillColor: '#4b5563', text: 'white' }, // Dark Gray
        'R': { borderColor: '#b91c1c', fillColor: '#ef4444', text: 'black' }, // Red
        'G': { borderColor: '#15803d', fillColor: '#22c55e', text: 'black' }  // Green
    };

    return map[colors[0]] || c;
};

const BattlefieldCard = ({
    card,
    x,
    y,
    isSelected,
    onMouseDown,
    onAction,
    isTargeting,
    isSource,
    isValidTarget,
    isEligibleAttacker,
    isDeclaredAttacker,
    attachments = [],
    count = 1,
    selectedCount = 0,
    stackCards = [],
    onStackSelectionChange
}) => {
    const colors = getCardHexColors(card.colors);
    const basePower = parseInt(card.power) || 0;
    const baseToughness = parseInt(card.toughness) || 0;
    const counters = parseInt(card.counters) || 0;
    const tempPowerBonus = parseInt(card.tempPowerBonus) || 0;
    const tempToughnessBonus = parseInt(card.tempToughnessBonus) || 0;
    const totalPower = basePower + counters + tempPowerBonus;
    const totalToughness = baseToughness + counters + tempToughnessBonus;
    const isModified = counters > 0;
    const isBuffed = tempPowerBonus > 0 || tempToughnessBonus > 0;
    // User requested to show the first part of type line (e.g. "Legendary Artifact" instead of "Equipment")
    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;

    if (card.isToken && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType}`;
    }

    // Dimensions for SVG Components to fit CARD_WIDTH (140)
    const bannerHeight = 28;
    const artHeight = 100;

    // Hover State
    const [isHovered, setIsHovered] = useState(false);
    const [isEquipmentHovered, setIsEquipmentHovered] = useState(false);
    const [hoveredAttachmentId, setHoveredAttachmentId] = useState(null);

    // Local delete count for stacks (how many to delete when clicking delete button)
    const [deleteCount, setDeleteCount] = useState(1);

    // Sync deleteCount with count for default selection (select all by default)
    React.useEffect(() => {
        if (count > 1) {
            setDeleteCount(count);
        }
    }, [count]);

    // --- Can Hover Helper ---
    // Determines if the card should respond to mouse enter
    const canHover = () => {
        if (isTargeting) return false;

        // Stacks can always hover (for selection UI)
        if (count > 1) return true;

        // Normal cards can hover unless in targeting/attacker mode
        return !isDeclaredAttacker && !isEligibleAttacker;
    };

    // Is this a stack that should show selection UI?
    const isStack = count > 1;
    const showStackUI = isHovered && isStack;
    const showActionButtons = isHovered;

    // Determine what count to display in the indicator
    // If in targeting mode (attacker declaration), use selectedCount
    // Otherwise, use deleteCount for general stack operations
    const displayCount = isEligibleAttacker || isDeclaredAttacker ? selectedCount : deleteCount;

    // Define actions based on Card Type
    const getHoverActions = () => {

        const actions = [
            { id: 'delete', icon: Trash2, label: 'Remove', color: 'bg-red-600' },
            { id: 'tap', icon: RotateCcw, label: 'Tap/Untap', color: 'bg-slate-700' }
        ];

        // Equipment
        if (card.type_line?.includes('Equipment')) {
            actions.unshift({ id: 'equip', icon: Sword, label: 'Equip', color: 'bg-slate-600' });
        }

        return actions;
    };

    const handleActionClick = (e, actionId) => {
        e.stopPropagation(); // Prevent card selection

        // For all actions on stacks, pass the count
        if (isStack) {
            onAction && onAction(actionId, card, deleteCount);
        } else {
            onAction && onAction(actionId, card);
        }
    };

    const handleStackChange = (e, newCount) => {
        e.stopPropagation();
        const safeCount = Math.max(1, Math.min(count, newCount));

        // If in targeting mode, update via parent callback
        if (onStackSelectionChange && stackCards && (isEligibleAttacker || isDeclaredAttacker)) {
            onStackSelectionChange(stackCards, safeCount);
        } else {
            // Otherwise, update local delete count
            setDeleteCount(safeCount);
        }
    };

    const cycleSelection = (e) => {
        e.stopPropagation();

        let nextCount;
        if (displayCount === 1) {
            // 1 -> Half
            nextCount = Math.ceil(count / 2);
            // Edge case: if count is 2, half is 1. Skip to All.
            if (nextCount === 1) nextCount = count;
        } else if (displayCount === Math.ceil(count / 2) && count > 2) {
            // Half -> All
            nextCount = count;
        } else {
            // All (or any other value) -> 1
            nextCount = 1;
        }

        handleStackChange(e, nextCount);
    };

    return (
        <div
            className={`absolute cursor-pointer flex flex-col items-center
                ${isHovered ? 'z-50' : ''}
                ${isSelected && !isDeclaredAttacker ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] scale-105 z-40 rounded-xl' : ''}
                ${isEligibleAttacker ? 'shadow-[0_0_20px_rgba(59,130,246,0.8)]' : ''}
                ${isDeclaredAttacker ? 'shadow-[0_0_25px_rgba(220,38,38,1)]' : ''}
                transition-all duration-200 ease-out
                ${card.tapped ? 'opacity-80' : ''}`}
            style={{
                width: CARD_WIDTH,
                left: x,
                top: y,
                touchAction: 'none'
            }}
            onMouseDown={(e) => onMouseDown(e, card)}
            onMouseEnter={() => {
                if (canHover()) {
                    setIsHovered(true);
                }
            }}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Targeting Visuals */}
            {
                isSource && (
                    <div className="absolute inset-0 z-40 rounded-xl ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900 animate-pulse pointer-events-none" />
                )
            }
            {
                isValidTarget && (
                    <div className="absolute inset-0 z-40 rounded-xl ring-4 ring-red-500 ring-offset-2 ring-offset-slate-900 pointer-events-none" />
                )
            }

            {/* Attached Equipment Banners - Stacked Above */}
            <div className="absolute bottom-full left-0 w-full flex flex-col-reverse items-center z-20 pointer-events-auto transition-all duration-300 ease-out"
                style={{
                    marginBottom: -98,
                }}
                onMouseMove={(e) => {
                    // Coordinate-Based Detection with Z-Awareness
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetFromBottom = rect.bottom - e.clientY;

                    // Card Layout Constants
                    const VISIBLE_STRIP = 28;
                    const CARD_HEIGHT = 124;

                    // Find the front-most card (lowest index) that contains the mouse
                    let hitIndex = -1;

                    for (let i = 0; i < attachments.length; i++) {
                        const itemBottom = i * VISIBLE_STRIP;
                        const itemTop = itemBottom + CARD_HEIGHT;

                        if (offsetFromBottom >= itemBottom && offsetFromBottom <= itemTop) {
                            hitIndex = i;
                            break;
                        }
                    }

                    // Fallback to last item if we are way above
                    if (hitIndex === -1 && attachments.length > 0) {
                        const maxTop = (attachments.length - 1) * VISIBLE_STRIP + CARD_HEIGHT;
                        if (offsetFromBottom > maxTop) hitIndex = attachments.length - 1;
                    }

                    if (hitIndex !== -1) {
                        setHoveredAttachmentId(attachments[hitIndex].id);
                        setIsEquipmentHovered(true);
                    }
                }}
                onMouseLeave={() => {
                    setIsEquipmentHovered(false);
                    setHoveredAttachmentId(null);
                }}
            >
                {attachments.map((att, index) => {
                    const attColors = getCardHexColors(att.colors);

                    // Calculate Hovered Index
                    const hoveredIndex = attachments.findIndex(a => a.id === hoveredAttachmentId);

                    // Cascade Lift Logic
                    const shouldLift = hoveredIndex !== -1 && index >= hoveredIndex;

                    // Fixed tight stack spread
                    const fixedSpread = -96;

                    // Lift logic
                    const baseTransform = index * 2;
                    const activeLift = shouldLift ? (baseTransform - 18) : baseTransform;

                    return (
                        <div key={att.id}
                            className="relative transition-all duration-300 ease-out flex flex-col items-center pointer-events-auto"
                            style={{
                                zIndex: attachments.length - index,
                                marginTop: index === attachments.length - 1 ? 0 : fixedSpread,
                                transform: `translateY(${activeLift}px)`,
                            }}
                            onMouseLeave={() => setHoveredAttachmentId(null)}
                        >
                            {/* Unequip Action Button (Circular Overlay - Left Edge) */}
                            {hoveredAttachmentId === att.id && (
                                <div className="absolute left-0 top-0 z-50 pt-2 -translate-x-1/2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAction && onAction('unequip-self', att);
                                        }}
                                        className="bg-slate-600 w-9 h-9 rounded-full shadow-lg border-2 border-white/20 flex items-center justify-center group relative transform transition-all hover:scale-110"
                                        title="Unequip"
                                    >
                                        <Minus size={16} className="text-white drop-shadow-sm" />
                                        {/* Tooltip - Left side */}
                                        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50 border border-white/10">
                                            Unequip
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Container for Banner + Art components */}
                            <div
                                className="flex flex-col items-center cursor-pointer"
                                onMouseDown={(e) => {
                                    e.stopPropagation(); // Prevent creature's onMouseDown from firing
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction && onAction('select', att);
                                }}
                            >
                                {/* Top Banner (Name) */}
                                <div className="relative z-10" style={{ marginBottom: -4 }}>
                                    <TopBanner
                                        width={CARD_WIDTH}
                                        height={28}
                                        borderColor={attColors.borderColor}
                                        fillColor={attColors.fillColor}
                                    >
                                        <div className="w-full text-center text-[10px] font-bold truncate leading-tight flex items-center justify-center gap-1" style={{ color: 'black' }}>
                                            <Sword size={10} className="opacity-50" />
                                            {att.name}
                                        </div>
                                    </TopBanner>
                                </div>

                                {/* Art Window */}
                                <div className="relative z-0">
                                    <ArtWindow
                                        width={CARD_WIDTH}
                                        height={100}
                                        borderColor={attColors.borderColor}
                                    >
                                        {att.art_crop ? (
                                            <img
                                                src={att.art_crop}
                                                alt={att.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : null}
                                    </ArtWindow>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Top Banner - Name */}
            <div className="z-30 relative" style={{ marginBottom: -4 }}>
                <TopBanner
                    width={CARD_WIDTH}
                    height={bannerHeight}
                    borderColor={colors.borderColor}
                    fillColor={colors.fillColor}
                >
                    <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: 'black' }}>
                        {card.name}
                    </div>
                </TopBanner>
            </div>

            {/* Art Window */}
            <div className="z-30 relative">
                <ArtWindow
                    width={CARD_WIDTH}
                    height={artHeight}
                    borderColor={colors.borderColor}
                >
                    {card.art_crop ? (
                        <img
                            src={card.art_crop}
                            alt={card.name}
                            className="w-full h-full object-cover"
                        />
                    ) : null}
                </ArtWindow>

                {/* Counter Indicator Overlay on Art */}
                {isModified && card.type === 'Creature' && (
                    <div className="absolute top-2 left-2 bg-green-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-green-800 z-20">
                        <span className="text-white text-[10px] font-bold">+{formatBigNumber(card.counters)}</span>
                    </div>
                )}

                {/* Stack Count Indicator (always visible for stacks) */}
                {isStack && (
                    <div className={`absolute top-2 right-2 rounded-full h-6 px-2 flex items-center justify-center shadow-lg border-2 z-20 ${isHovered && displayCount > 0
                        ? (isEligibleAttacker || isDeclaredAttacker ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400') + ' text-white'
                        : 'bg-slate-800 border-slate-600 text-white'
                        }`}>
                        <span className="text-xs font-bold">
                            {isHovered && displayCount > 0 ? `${displayCount}/${count}` : `x${count}`}
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Banner - Type Line */}
            <div className="z-30 relative" style={{ marginTop: -4 }}>
                <BottomBanner
                    width={CARD_WIDTH}
                    height={bannerHeight}
                    borderColor={colors.borderColor}
                    fillColor={colors.fillColor}
                >
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-[9px] font-semibold truncate flex-1 leading-tight" style={{ color: 'black' }}>
                            {cardType}
                        </span>
                    </div>
                </BottomBanner>
            </div>

            {/* Floating P/T Banner - Creatures Only */}
            {
                card.type === 'Creature' && (
                    <div className="absolute -bottom-3 -right-2 filter drop-shadow-md z-40">
                        <PowerToughnessBanner
                            width={46}
                            height={34}
                            borderColor={colors.borderColor}
                            fillColor={colors.fillColor}
                        >
                            <div className={`text-[10px] font-bold flex gap-0.5 ${isBuffed ? 'text-blue-700' : isModified ? 'text-green-900' : 'text-black'}`}>
                                <span>{formatBigNumber(totalPower)}</span>
                                <span>/</span>
                                <span>{formatBigNumber(totalToughness)}</span>
                            </div>
                        </PowerToughnessBanner>
                    </div>
                )
            }

            {/* Tapped Indicator */}
            {
                card.tapped && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                        <RotateCcw size={32} className="text-white drop-shadow-md opacity-80" />
                    </div>
                )
            }

            {/* Action Buttons (shown when hovering - left side) */}
            {
                showActionButtons && (
                    <div className="absolute left-0 top-0 flex flex-col gap-3 z-50 pt-2 -translate-x-1/2">
                        {getHoverActions().map((action, index) => (
                            <button
                                key={action.id}
                                onClick={(e) => handleActionClick(e, action.id)}
                                className={`${action.color} w-9 h-9 rounded-full shadow-lg border-2 border-white/20 flex items-center justify-center group relative transform transition-all hover:scale-110 hover:z-50`}
                                title={action.label}
                                style={{
                                    transitionDelay: `${index * 50}ms`
                                }}
                            >
                                <action.icon size={16} className="text-white drop-shadow-sm" />

                                {/* Tooltip - Left side */}
                                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50 border border-white/10">
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )
            }

            {/* Vertical Stack Sidebar (Right Edge) */}
            {
                showStackUI && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center gap-3 z-50 py-3 px-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-600 shadow-2xl">

                        {/* Cycle Button */}
                        <button
                            onClick={cycleSelection}
                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg border border-blue-400 transition-all hover:scale-110 active:scale-95"
                            title="Toggle Amount (1 / Half / All)"
                        >
                            <Layers size={16} />
                        </button>

                        {/* Vertical Slider Wrapper */}
                        <div className="py-2 h-32 flex items-center justify-center w-8">
                            <input
                                type="range"
                                min="1"
                                max={count}
                                step="1"
                                value={displayCount}
                                onChange={(e) => handleStackChange(e, parseInt(e.target.value))}
                                className="-rotate-90 w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                            />
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default BattlefieldCard;
