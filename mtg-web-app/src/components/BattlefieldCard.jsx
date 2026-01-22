import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { RotateCcw, Shield } from 'lucide-react';
import { isLand, isCreature, calculateCardStats, calculateEffectiveTotal, isMinimalDisplayLand, getCardHexColors } from '../utils/cardUtils';
import { formatBigNumber } from '../utils/formatters';
import { useIsTouchDevice } from '../hooks/useTouchInteractions';
import { playTokenFlight } from '../utils/animations';

import { useBattlefieldCardInteractions } from '../hooks/useBattlefieldCardInteractions';
import {
    AttachmentBanners,
    CardHeader,
    CardArt,
    CardFooter,
    MinimalLandDisplay
} from './BattlefieldCardVisuals';

// Constants
const CARD_WIDTH = 140;

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
    isRelative = false,
    isPendingOnStack = false
}) => {
    const stats = calculateCardStats(card, allCards, attachments);
    const colors = getCardHexColors(card.colors);
    const isTouch = useIsTouchDevice();

    const bannerHeight = 28;
    const artHeight = 100;

    // Use our new interaction hook
    const {
        isHovered,
        showOverlay,
        deleteCount,
        handlePointerDown,
        handlePointerUp,
        handlePointerMove,
        handleClick,
        handleMouseEnter,
        handleMouseLeave
    } = useBattlefieldCardInteractions({
        card, isSelected, onMouseDown, onAction, onStackSelectionChange,
        stackCards, count, isEligibleAttacker, isDeclaredAttacker, isTargeting, isTouch
    });

    const countersObj = typeof card.counters === 'object' ? (card.counters || {}) : { '+1/+1': card.counters || 0 };
    const plusOne = countersObj['+1/+1'] || 0;
    const isModified = stats.counterPower !== 0;

    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;
    if (card.isToken && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType} `;
    }

    const displayCount = isEligibleAttacker || isDeclaredAttacker ? selectedCount : deleteCount;

    // --- Animation Logic ---
    const [isMounted, setIsMounted] = useState(false);
    const [spawnOffset, setSpawnOffset] = useState(null);
    const cardRef = useRef(null);

    const [landedIds, setLandedIds] = useState(() => new Set());
    const animatedIds = useRef(new Set());

    // DERIVED STATE: arrivedCount is now perfectly in sync with state
    const arrivedCount = useMemo(() => {
        const currentCards = (stackCards && stackCards.length > 0) ? stackCards : [card];
        // A card has "arrived" if it was never spawning, OR it has finished its flight
        return currentCards.filter(c => !c.spawnSourcePos || landedIds.has(c.id)).length;
    }, [stackCards, card, landedIds]);

    useEffect(() => {
        requestAnimationFrame(() => setIsMounted(true));
    }, []);

    useLayoutEffect(() => {
        const currentCards = (stackCards && stackCards.length > 0) ? stackCards : [card];
        // Only process cards that haven't been animated yet AND haven't landed yet
        const cardsToProcess = currentCards.filter(c =>
            (c.spawnDelay !== undefined || c.spawnSourcePos) &&
            !animatedIds.current.has(c.id) &&
            !landedIds.has(c.id)
        );

        if (cardsToProcess.length > 0 && cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();

            // Set spawn offset for the primary card if it's new and has a source position
            if (card.spawnSourcePos && !spawnOffset) {
                setSpawnOffset({
                    x: card.spawnSourcePos.x - rect.left,
                    y: card.spawnSourcePos.y - rect.top
                });
            }

            cardsToProcess.forEach((c) => {
                animatedIds.current.add(c.id);
                const delay = c.spawnDelay || 0;

                setTimeout(async () => {
                    // Only run flight animation if source position is provided
                    if (c.spawnSourcePos) {
                        await playTokenFlight({
                            left: c.spawnSourcePos.x,
                            top: c.spawnSourcePos.y,
                            width: 140,
                            height: 100
                        }, rect, c, c.flightDuration || 700);
                    }

                    // Update state to trigger re-calc of arrivedCount
                    setLandedIds(prev => {
                        const next = new Set(prev);
                        next.add(c.id);
                        return next;
                    });
                }, delay);
            });
        }
    }, [stackCards, card.id, landedIds]);

    const isStack = count > 1;

    // Calculate effective total including virtualized counts
    const effectiveTotal = useMemo(() => {
        const items = stackCards.length > 0 ? stackCards : [card];
        return calculateEffectiveTotal(items);
    }, [stackCards, card]);


    const isVirtualStack = stackCards.some(c => c.isVirtualStack) || (effectiveTotal > 1000n && card.isToken);

    // Minimal Land View
    if (isMinimalDisplayLand(card)) {
        return (
            <MinimalLandDisplay
                card={card}
                count={count}
                x={x}
                y={y}
                isRelative={isRelative}
                isSelected={isSelected}
                isHovered={isHovered}
                isTargeting={isTargeting}
                onMouseDown={onMouseDown}
                onAction={onAction}
                setIsHovered={handleMouseEnter} // Re-using state setter wrapper
                CARD_WIDTH={CARD_WIDTH}
                landColors={getCardHexColors(card.colors)}
            />
        );
    }

    // derived glow classes
    let activeGlow = '';
    if (isSource) {
        activeGlow = 'shadow-[0_0_25px_rgba(59,130,246,1)] scale-105 z-40 animate-pulse';
    } else if (isValidTarget || isEligibleAttacker) {
        // If the card is a valid candidate (target or attacker),
        // it glows RED if selected, and BLUE if just potentially available.
        if (isDeclaredAttacker || selectedCount > 0) {
            activeGlow = 'shadow-[0_0_25px_rgba(220,38,38,1)] scale-105 z-40';
        } else {
            activeGlow = 'shadow-[0_0_25px_rgba(59,130,246,1)] z-40';
        }
    }

    return (
        <>
            <motion.div
                ref={cardRef}
                id={`card-${card.id}`}

                initial={spawnOffset ? {
                    x: spawnOffset.x,
                    y: spawnOffset.y,
                    scale: 0.6,
                    opacity: 0
                } : false}
                animate={{
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: (isPendingOnStack || (card.spawnSourcePos && !landedIds.has(card.id)) || (arrivedCount === 0 && (stackCards.length > 0 || card.spawnSourcePos))) ? 0 : (card.tapped && !isSelected ? 0.8 : 1)
                }}
                transition={{
                    type: "spring",
                    stiffness: 80,
                    damping: 15,
                    opacity: { duration: 0.3 }
                }}
                className={`${isRelative ? 'relative' : 'absolute'} cursor-pointer flex flex-col items-center
                    ${isHovered ? 'z-50' : ''}
                    ${!isDragging && isMounted && !spawnOffset ? 'transition-[box-shadow] duration-200 ease-out' : ''}
                rounded-xl`}
                data-card-ids={(stackCards.length > 0 ? stackCards : [card]).map(c => c.id).join(' ')}

                style={{

                    width: CARD_WIDTH,
                    zIndex: isHovered ? 50 : (isSelected ? 60 : (arrivedCount > 0 ? 30 : 0)),
                    ...(isRelative ? {} : { left: x, top: y }),
                }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerMove={handlePointerMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                <div className={`relative flex flex-col items-center rounded-xl transition-all duration-300 w-full ${activeGlow}`}

                    style={{ paddingTop: attachments.length > 0 ? '28px' : 0 }}
                >
                    <AttachmentBanners
                        attachments={attachments}
                        CARD_WIDTH={CARD_WIDTH}
                        onAction={onAction}
                        isEligibleAttacker={isEligibleAttacker}
                    />
                    <CardHeader
                        card={card}
                        CARD_WIDTH={CARD_WIDTH}
                        bannerHeight={bannerHeight}
                    />
                    {/* Render Art with appropriate count badge */}
                    {(() => {
                        // If we have a virtual stack info, use it for the badge
                        const artCard = isVirtualStack ? {
                            ...card,
                            isVirtualStack: true,
                            tokenCount: effectiveTotal
                        } : card;

                        return (
                            <CardArt
                                card={artCard}
                                CARD_WIDTH={CARD_WIDTH}
                                artHeight={artHeight}
                                isModified={isModified}
                                plusOne={plusOne}
                                countersObj={countersObj}
                                isStack={isStack}
                                arrivedCount={arrivedCount}
                            />
                        );
                    })()}

                    <CardFooter
                        card={card}
                        cardType={cardType}
                        totalPower={stats.power}
                        totalToughness={stats.toughness}
                        CARD_WIDTH={CARD_WIDTH}
                        bannerHeight={bannerHeight}
                    />
                </div>

                {/* Tapped Indicator */}
                {card.tapped && !isSelected && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                        <RotateCcw size={32} className="text-white drop-shadow-md opacity-80" />
                    </div>
                )}

                {/* Blocked Indicator - Simple Red Shield */}
                {card.isBlocked && (
                    <div className="absolute -top-2 -right-2 z-50 bg-red-600/90 rounded-full p-1.5 shadow-lg border border-white/20 animate-in zoom-in duration-200" title="Blocked">
                        <Shield size={14} className="text-white fill-red-400" />
                    </div>
                )}
            </motion.div >

            {/* Long Press Overlay */}
            {showOverlay && createPortal(
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
            )}
        </>
    );
};

export default BattlefieldCard;
