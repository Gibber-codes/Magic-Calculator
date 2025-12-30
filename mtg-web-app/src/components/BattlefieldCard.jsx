import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, Trash2, RotateCcw, Sparkles, Sword, Layers, Repeat, Maximize2, Zap, X } from 'lucide-react';
import { TopBanner, ArtWindow, BottomBanner, PowerToughnessBanner } from './RedesignedCardFrame';
import { calculateCardStats, isPlaceholderLand, isBasicLand, isMinimalDisplayLand, BASIC_LAND_COLORS } from '../utils/cardUtils';
import { formatBigNumber } from '../utils/formatters';
import { useIsTouchDevice } from '../hooks/useTouchInteractions';
import SelectedCardControls from './SelectedCardControls';
import { extractActivatedAbilities } from '../utils/keywordParser';

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
    onStackSelectionChange,
    isDragging = false,
    allCards = [],
    onActivateAbility,
    onCounterChange,
    onConvertLand,
    isRelative = false
}) => {
    const stats = calculateCardStats(card, allCards, attachments);
    const colors = getCardHexColors(card.colors);

    // Extract counters for visual indicator
    const countersObj = typeof card.counters === 'object' ? (card.counters || {}) : { '+1/+1': card.counters || 0 };
    const plusOne = countersObj['+1/+1'] || 0;

    const totalPower = stats.power;
    const totalToughness = stats.toughness;
    const counterPower = stats.counterPower;
    const counterToughness = stats.counterToughness;
    const tempPowerBonus = stats.tempPowerBonus;
    const tempToughnessBonus = stats.tempToughnessBonus;
    const basePower = stats.basePower;
    const baseToughness = stats.baseToughness;

    // Local check for modified/buffed state for styling
    const isModified = counterPower !== 0; // Simple check for counters
    const isBuffed = tempPowerBonus > 0 || tempToughnessBonus > 0 || stats.dynamicPower > 0;
    // User requested to show the first part of type line (e.g. "Legendary Artifact" instead of "Equipment")
    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;

    if (card.isToken && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType}`;
    }

    // Dimensions for SVG Components to fit CARD_WIDTH (140)
    const bannerHeight = 28;
    const artHeight = 100;

    // Touch device detection
    const isTouch = useIsTouchDevice();

    // Hover State
    const [isHovered, setIsHovered] = useState(false);
    const [isEquipmentHovered, setIsEquipmentHovered] = useState(false);
    const [hoveredAttachmentId, setHoveredAttachmentId] = useState(null);

    // Local delete count for stacks (how many to delete when clicking delete button)
    const [deleteCount, setDeleteCount] = useState(1);

    // Overlay State (Long Press)
    const [showOverlay, setShowOverlay] = useState(false);
    const longPressTimerRef = useRef(null);
    const isLongPressingRef = useRef(false);

    const handlePointerDown = (e) => {
        // Only trigger on selected cards
        if (!isSelected) return;

        // Don't trigger if right click
        if (e.button === 2) return;

        isLongPressingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressingRef.current = true;
            setShowOverlay(true);
        }, 500); // 500ms hold time
    };

    const handlePointerUp = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        // Small delay to clear flag so click handlers don't fire if it WAS a long press
        setTimeout(() => {
            isLongPressingRef.current = false;
        }, 50);

        setShowOverlay(false);
    };

    const handlePointerMove = () => {
        // Cancel if moved significantly (though simple clear on move is safer for strictly static holds)
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    };

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
    const showStackUI = false; // Hover effect removed as requested
    const showActionButtons = false; // Hover effect removed as requested

    // Determine what count to display in the indicator
    // If in targeting mode (attacker declaration), use selectedCount
    // Otherwise, use deleteCount for general stack operations
    const displayCount = isEligibleAttacker || isDeclaredAttacker ? selectedCount : deleteCount;

    const getHoverActions = () => {
        // IF SELECTED: Return abilities too, so we can render them on the side
        if (isSelected) {
            const abilities = (card.abilities && card.abilities.length > 0)
                ? card.abilities
                : extractActivatedAbilities(card.oracle_text);

            const abilityActions = abilities.map((ability, idx) => ({
                id: `ability-${idx}`,
                icon: Zap,
                label: ability.cost,
                color: 'bg-indigo-600',
                ability: ability
            }));

            const coreActions = [
                { id: 'tap', icon: RotateCcw, label: 'Tap/Untap', color: 'bg-slate-700' },
                { id: 'delete', icon: Trash2, label: 'Remove', color: 'bg-red-600' }
            ];

            if (card.type_line?.includes('Equipment')) {
                coreActions.unshift({ id: 'equip', icon: Sword, label: 'Equip', color: 'bg-slate-600' });
            }
            if (card.card_faces && card.card_faces.length > 1) {
                coreActions.unshift({ id: 'transform', icon: Repeat, label: 'Transform', color: 'bg-indigo-600' });
            }

            return [...abilityActions, ...coreActions];
        }

        const actions = [
            { id: 'delete', icon: Trash2, label: 'Remove', color: 'bg-red-600' },
            { id: 'tap', icon: RotateCcw, label: 'Tap/Untap', color: 'bg-slate-700' }
        ];

        // Equipment
        if (card.type_line?.includes('Equipment')) {
            actions.unshift({ id: 'equip', icon: Sword, label: 'Equip', color: 'bg-slate-600' });
        }

        // Transform/Flip for Double-faced cards
        if (card.card_faces && card.card_faces.length > 1) {
            actions.unshift({ id: 'transform', icon: Repeat, label: 'Transform', color: 'bg-indigo-600' });
        }

        return actions;
    };

    const handleActionClick = (e, action) => {
        e.stopPropagation(); // Prevent card selection

        const actionId = action.id || action;

        // Special handling for activated abilities
        if (action.ability) {
            onActivateAbility && onActivateAbility(card, action.ability);
            return;
        }

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

    const useMinimalLandDisplay = isMinimalDisplayLand(card);

    // Get land-specific colors
    const getLandColors = () => {
        if (isPlaceholderLand(card)) {
            return {
                borderColor: '#6b7280',
                fillColor: '#374151',
                textColor: 'black'
            };
        }
        if (isBasicLand(card)) {
            return BASIC_LAND_COLORS[card.name] || {
                borderColor: '#6b7280',
                fillColor: '#374151',
                textColor: 'black'
            };
        }
        return null;
    };

    const landColors = useMinimalLandDisplay ? getLandColors() : null;

    if (useMinimalLandDisplay) {
        const displayText = isPlaceholderLand(card)
            ? `Land: ${count}`
            : `${card.name}: ${count}`;

        return (
            <div
                className={`${isRelative ? 'relative' : 'absolute'} cursor-pointer flex flex-col items-center
                    ${isHovered ? 'z-50' : ''}
                    ${isSelected ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] scale-105 z-40 rounded-lg' : ''}
                    ${card.tapped ? 'opacity-70' : ''}
                    ${!isDragging ? 'transition-all duration-200 ease-out' : ''}`}
                style={{
                    width: CARD_WIDTH,
                    ...(isRelative ? {} : { left: x, top: y }),
                }}
                onMouseDown={(e) => onMouseDown(e, card)}
                onMouseEnter={() => !isTargeting && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Tap Indicator */}
                {card.tapped && (
                    <div className="absolute -top-2 -right-2 z-50">
                        <div className="bg-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg border border-amber-400">
                            TAPPED
                        </div>
                    </div>
                )}

                {/* Single Banner for Land */}
                <div className="relative">
                    <TopBanner
                        width={CARD_WIDTH}
                        height={28}
                        colorIdentity={landColors.fillColor}
                    >
                        <div
                            className="w-full text-center text-sm font-bold truncate leading-tight"
                            style={{ color: landColors.textColor }}
                        >
                            {displayText}
                        </div>
                    </TopBanner>
                </div>

                {/* Hover Actions (Tap/Delete) */}
                {isHovered && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-50">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction('tap', card); }}
                            className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow-lg border border-slate-500"
                            title="Tap/Untap"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction('delete', card, count); }}
                            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-red-400"
                            title="Remove"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const cardGlowClass = isSource
        ? 'shadow-[0_0_25px_rgba(59,130,246,1)] scale-105 z-40 animate-pulse'
        : isValidTarget || isDeclaredAttacker ? 'shadow-[0_0_25px_rgba(220,38,38,1)] scale-105 z-40'
            : isSelected ? 'shadow-[0_0_40px_rgba(34,197,94,0.8)] scale-[1.3] z-[60]'
                : isEligibleAttacker ? 'shadow-[0_0_20px_rgba(59,130,246,1)] z-40'
                    : '';

    // --- Render Logic Extracted ---
    const renderCardContent = (isOverlay = false) => {
        // Dynamic scale for overlay
        // FIX: List view card should NOT scale or glow when selected. Only overlay.
        const scaleClass = isOverlay ? 'scale-[1.75]' : '';

        // FIX: Shadow/Glow only on overlay if selected
        const shadowClass = isOverlay
            ? 'shadow-[0_0_30px_rgba(34,197,94,0.6)] shadow-2xl' // Green glow on overlay
            : isDragging || isTargeting || isDeclaredAttacker // Keep other operational glows
                ? ''
                : ''; // No selection glow on base card

        // Show controls only if it's the overlay AND selected
        // MODIFICATION: Controls now moved to bottom sticky SelectionMenu
        const showControls = false;

        // Determine which glow to apply
        let activeGlow = '';
        if (isOverlay && isSelected) {
            // Overlay gets the selection glow
            // We use ring for overlay to make it sharp
            activeGlow = 'ring-2 ring-green-500/50';
        } else if (!isOverlay) {
            // List view card: use cardGlowClass EXCLUDING selection
            // Re-derive non-selection glow:
            if (isSource) activeGlow = 'shadow-[0_0_25px_rgba(59,130,246,1)] scale-105 z-40 animate-pulse';
            else if (isValidTarget || isDeclaredAttacker) activeGlow = 'shadow-[0_0_25px_rgba(220,38,38,1)] scale-105 z-40';
            else if (isEligibleAttacker) activeGlow = 'shadow-[0_0_20px_rgba(59,130,246,1)] z-40';
        }

        return (
            <div className={`relative flex flex-col items-center rounded-xl transition-all duration-300 w-full ${scaleClass} ${shadowClass} ${activeGlow}`}
                style={{
                    paddingTop: attachments.length > 0 ? '28px' : 0
                }}
                onClick={(e) => {
                    // Stop propagation to prevent auto-close when clicking card in overlay
                    if (isOverlay) e.stopPropagation();
                }}
            >
                {/* Attached Equipment Banners */}
                {attachments.length > 0 && (
                    <div className="absolute top-0 left-0 w-full flex flex-col items-center z-20 pointer-events-auto transition-all duration-300 ease-out">

                        {/* Multiple Attachments: Single Summary Banner */}
                        {attachments.length > 1 ? (
                            <div className="relative w-full z-10">
                                <TopBanner width={CARD_WIDTH} height={28} colorIdentity="#374151">
                                    <div className="w-full text-center text-[10px] font-bold truncate leading-tight flex items-center justify-center p-1" style={{ color: 'white' }}>
                                        {attachments.length} Attachments
                                    </div>
                                </TopBanner>
                            </div>
                        ) : (
                            /* Single Attachment: Show valid card banner */
                            attachments.map((att) => {
                                const attColors = getCardHexColors(att.colors);
                                return (
                                    <div key={att.id} className="relative w-full z-10 transition-all duration-300">
                                        <div
                                            className="flex flex-col items-center cursor-pointer"
                                            onClick={(e) => {
                                                if (isEligibleAttacker) return;
                                                e.stopPropagation();
                                                onAction && onAction('select', att);
                                            }}
                                        >
                                            <div className="relative z-10">
                                                <TopBanner width={CARD_WIDTH} height={28} colorIdentity={attColors.fillColor}>
                                                    <div className="w-full text-center text-[10px] font-bold truncate leading-tight flex items-center justify-center" style={{ color: 'white' }}>
                                                        {att.name}
                                                    </div>
                                                </TopBanner>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Top Banner */}
                <div className="z-30 relative" style={{ marginBottom: -4 }}>
                    <TopBanner width={CARD_WIDTH} height={bannerHeight} colorIdentity={colors.fillColor}>
                        <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: '#ffffff' }}>
                            {(() => {
                                const activeIdx = card.activeFaceIndex !== undefined ? card.activeFaceIndex : 0;
                                const face = (card.card_faces || [])[activeIdx] || card;
                                return face.name || card.name;
                            })()}
                        </div>
                    </TopBanner>
                </div>

                {/* Art Window */}
                <div className="z-30 relative">
                    <ArtWindow width={CARD_WIDTH} height={artHeight}>
                        {card.art_crop ? (
                            <img
                                src={card.art_crop}
                                alt={card.name}
                                className="w-full h-full object-cover"
                                style={{
                                    objectPosition: (card.activeFaceIndex === 1) ? '100% 15%' : '0% 15%'
                                }}
                            />
                        ) : null}
                    </ArtWindow>

                    {/* Counter Indicators */}
                    {isModified && card.type === 'Creature' && (
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20">
                            {plusOne > 0 &&
                                <div className="bg-green-600 rounded-lg px-1.5 h-6 flex items-center justify-center shadow-lg border border-green-800">
                                    <span className="text-white text-[10px] font-bold">+{formatBigNumber(plusOne)}</span>
                                </div>
                            }
                            {Object.entries(countersObj).map(([type, val]) => {
                                if (type === '+1/+1' || val <= 0) return null;
                                const isBad = type === '-1/-1';
                                return (
                                    <div key={type} className={`${isBad ? 'bg-red-800 border-red-900' : 'bg-purple-600 border-purple-800'} rounded-lg px-1.5 h-6 flex items-center justify-center shadow-lg border`}>
                                        <span className="text-white text-[10px] font-bold">{isBad ? '-' : ''}{val} {type === '-1/-1' ? '' : type.substring(0, 3)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Stack Count */}
                    {isStack && (
                        <div className={`absolute top-2 right-2 rounded-full h-6 px-2 flex items-center justify-center shadow-lg border-2 z-20 ${displayCount > 0 ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-white'}`}>
                            <span className="text-xs font-bold">x{count}</span>
                        </div>
                    )}
                </div>

                {/* Bottom Banner */}
                <div className="z-30 relative" style={{ marginTop: 4 }}>
                    <BottomBanner width={CARD_WIDTH} height={bannerHeight}>
                        <div style={{ width: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <div className="w-full flex justify-between items-center px-1">
                                <span className="text-[9px] font-semibold truncate flex-1 leading-tight" style={{ color: '#ffffff' }}>{cardType}</span>
                            </div>
                        </div>
                        {card.type === 'Creature' && (
                            <div className="text-[10px] font-bold flex gap-0.5 text-white">
                                <span>{formatBigNumber(totalPower)}</span>/<span>{formatBigNumber(totalToughness)}</span>
                            </div>
                        )}
                    </BottomBanner>
                </div>

                {/* EXTENDED SELECTION CONTROLS (Only in Overlay) */}
                {showControls && !isDragging && !isTargeting && !isDeclaredAttacker && (
                    <>
                        {/* Bottom: Extended Controls */}
                        <div className="w-full z-10 -mt-1 scale-[0.85] origin-top">
                            {/* Scaled down slightly to fit width nicely */}
                            <SelectedCardControls
                                card={card}
                                stackCount={count}
                                stackCards={stackCards}
                                allCards={allCards}
                                onActivateAbility={onActivateAbility}
                                onCounterChange={onCounterChange}
                                onConvertLand={onConvertLand}
                                onAction={onAction}
                                isTouch={isTouch}
                            />
                        </div>

                        {/* Left Side: Hanging Actions */}
                        <div className="absolute top-4 -left-12 flex flex-col gap-3 z-[60]">
                            {getHoverActions().map((action, index) => (
                                <button
                                    key={action.id}
                                    onClick={(e) => handleActionClick(e, action)}
                                    className={`${action.color} w-10 h-10 rounded-full shadow-lg border-2 border-white/20 flex items-center justify-center group relative transform transition-all hover:scale-110 active:scale-95 touch-target`}
                                    title={action.label}
                                >
                                    <action.icon size={18} className="text-white drop-shadow-sm" />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Prevent animation on mount
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        requestAnimationFrame(() => setIsMounted(true));
    }, []);

    return (
        <>
            {/* 1. Normal List Render (Placeholder) */}
            <div
                className={`${isRelative ? 'relative' : 'absolute'} cursor-pointer flex flex-col items-center
                    ${isHovered ? 'z-50' : ''}
                    ${!isDragging && isMounted ? 'transition-[transform,box-shadow,opacity] duration-200 ease-out' : ''}
                    ${card.tapped && !isSelected ? 'opacity-80' : ''}
                    rounded-xl`}
                style={{
                    width: CARD_WIDTH,
                    ...(isRelative ? {} : { left: x, top: y }),
                }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerMove={handlePointerMove}
                onMouseDown={(e) => {
                    if (!isTouch && !isLongPressingRef.current) {
                        e.stopPropagation();
                        onMouseDown(e, card);
                    }
                }}
                onClick={(e) => {
                    if (isTouch && !isLongPressingRef.current) {
                        e.stopPropagation();
                        onMouseDown(e, card);
                    }
                }}
            >
                {/* Render content without controls for list view */}
                {renderCardContent(false)}

                {/* Tapped Indicator (Visual only, List view) */}
                {card.tapped && !isSelected && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                        <RotateCcw size={32} className="text-white drop-shadow-md opacity-80" />
                    </div>
                )}
            </div >

            {/* Selection overlay moved to SelectionMenu component */}

            {/* Long Press Overlay (Original Image View) */}
            {
                showOverlay && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
                        <div className="relative w-[90vw] h-[90vh] flex items-center justify-center p-4">
                            <img
                                src={card.image_normal}
                                alt={card.name}
                                className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100 transition-transform duration-300"
                            />
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
};

export default BattlefieldCard;
