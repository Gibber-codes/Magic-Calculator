import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import { Play, X, Layers, Zap, RefreshCw, Clock } from 'lucide-react';
import { formatBigNumber } from '../utils/formatters';
import { TopBanner, ArtWindow, BottomBanner } from './RedesignedCardFrame';

const CARD_SPACING = 15; // px between cards horizontally (base spacing for newest card)
const MAX_VISIBLE_STACK = 4;

/**
 * Get trigger type icon
 */
const getTriggerIcon = (triggerType) => {
    switch (triggerType) {
        case 'whenever': return RefreshCw;
        case 'at': return Clock;
        default: return Zap;
    }
};

const StackItem = ({
    item,
    index, // 0 = newest (rightmost rendered), 1 = second newest, etc.
    totalRendered, // Total cards currently being rendered
    isTop,
    isNew = false,
    isExiting = false,
    isMounted = true,
    isHidden = false,
    onResolve,
    onRemove
}) => {
    // Strategy: Center the entire group.
    // Total Width = CARD_WIDTH + (totalRendered - 1) * CARD_SPACING
    // Group Start X = (100% - Total Width) / 2
    // Item X = Group Start X + ((totalRendered - 1 - index) * CARD_SPACING)

    // Using CSS transforms for cleaner calc
    // But we need the offset.
    const cardWidth = 360;

    // Position Calculation
    // We want the whole cluster centered.
    // Let's assume the container is centered (left-1/2 -translate-x-1/2) in the parent.
    // That means "0px" in the parent is the Screen Center.
    // So we position relative to that center.

    // Progressive spacing - gaps between OLDER cards get smaller
    // This creates a "hiding" effect where lower cards are more obscured
    const getCardSpacing = (gapIndex) => {
        // gapIndex represents which gap this is from the LEFT (oldest card side)
        // Gap 0 is between the two oldest cards (should be smallest)
        // Gap n-1 is between the newest two cards (should be largest)

        // We want gaps to INCREASE as we move toward newer cards
        // So we reverse the index for the calculation
        const reversedIndex = (totalRendered - 2) - gapIndex;

        // Exponential decay: Smoother but tight
        // 15 -> 12 -> 9.6 -> 7.6
        const spacingMultiplier = Math.pow(0.8, reversedIndex);
        return CARD_SPACING * Math.max(spacingMultiplier, 0.15); // Minimum 15% (~2px)
    };

    // Calculate cumulative offset for this card
    let cumulativeOffset = 0;
    for (let i = 0; i < (totalRendered - 1 - index); i++) {
        cumulativeOffset += getCardSpacing(i);
    }

    // Calculate total width of the stack for centering
    let totalStackWidth = cardWidth;
    for (let i = 0; i < totalRendered - 1; i++) {
        totalStackWidth += getCardSpacing(i);
    }

    const startX = -totalStackWidth / 2; // Start X relative to center
    const itemX = startX + cumulativeOffset;

    // Progressive vertical offset - older cards move down more
    // This creates a "cascading down" effect in addition to the horizontal cascade
    const getVerticalOffset = (cardIndex) => {
        // Each card gets progressively more vertical offset
        return cardIndex * 5; // Linear, subtle downward offset
    };

    const itemY = getVerticalOffset(index);

    // Z-index: newest card (index 0) has highest
    const zIndex = 50 - index;

    const TriggerIcon = getTriggerIcon(item.triggerType);

    // Dynamic Animation Variants
    const initialVariants = React.useMemo(() => {
        if (!isNew) return { opacity: 0, scale: 0.9, y: -50 };

        // Try to find source on battlefield
        if (item.sourceId) {
            const sourceEl = document.getElementById(`card-${item.sourceId}`);
            if (sourceEl) {
                const sourceRect = sourceEl.getBoundingClientRect();

                // New Stack Item Layout:
                // - Total Width = 360px
                // - Card Frame (left side) = 140px wide
                // - Card Frame Center relative to Stack Center = 70 - 180 = -110px
                //
                // Target: Stack is centered at screen center bottom.
                // We want the CARD FRAME to start aligned with the source card.

                const targetStackCenterX = window.innerWidth / 2;
                const targetStackCenterY = window.innerHeight - 180; // Approx bottom-32 center

                // Card frame center is 70px from left edge of stack item
                // Stack item center is at 180px from left edge of stack item
                // Offset = 70 - 180 = -110px
                const targetCardFrameCenterX = targetStackCenterX - 110;
                const targetCardFrameCenterY = targetStackCenterY; // Vertically centered

                const sourceCenterX = sourceRect.left + sourceRect.width / 2;
                const sourceCenterY = sourceRect.top + sourceRect.height / 2;

                const deltaX = sourceCenterX - targetCardFrameCenterX;
                const deltaY = sourceCenterY - targetCardFrameCenterY;

                return {
                    x: deltaX,
                    y: deltaY,
                    scale: 1, // Start at same size as battlefield card
                    opacity: 1 // Visible immediately so we see the image fly
                };
            }
        }

        // Fallback: Drop from top
        return { y: -150, scale: 0.8, opacity: 0 };
    }, [isNew, item.sourceId]);

    return (
        <motion.div
            layout // Enable FLIP for reordering
            initial={initialVariants}
            animate={{ x: 0, y: 0, scale: Math.pow(0.95, index), opacity: isHidden ? 0 : Math.pow(0.75, index) }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            transition={{
                type: "spring",
                stiffness: 120, // Slow flight
                damping: 18,
                mass: 1,
                opacity: { duration: 0.2 }
            }}
            className={`
                absolute
                stack-item
                ${isTop ? 'pointer-events-auto' : 'pointer-events-none select-none'}
            `}
            id={`stack-item-${item.id}`}
            style={{
                left: `calc(50% + ${itemX}px)`,
                top: `${itemY}px`,
                zIndex: zIndex,
                width: '360px',
                height: '160px',
                // filter handled via style for performance
                filter: `brightness(${Math.pow(0.7, index)}) contrast(${Math.pow(0.85, index)})${index === 0 ? ' drop-shadow(0 4px 14px rgba(34, 211, 238, 0.5))' : ''}`
            }}
        >
            <div className="flex items-stretch gap-0 h-full">
                {/* REDESIGNED CARD FRAME - Vertical Layout */}
                <div className="relative flex flex-col items-center rounded-xl transition-all duration-300 shrink-0 z-30" style={{ width: 140 }}>
                    {/* Top Banner */}
                    <div className="z-30 relative" style={{ marginBottom: -4 }}>
                        <TopBanner width={140} height={28} colorIdentity={item.sourceColor || null}>
                            <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: '#ffffff' }}>
                                {item.sourceName}
                            </div>
                        </TopBanner>
                    </div>

                    {/* Art Window */}
                    <div className="z-30 relative">
                        <ArtWindow width={140} height={100}>
                            <img
                                alt={item.sourceName}
                                className="w-full h-full object-cover"
                                src={item.sourceArt || 'https://cards.scryfall.io/art_crop/front/7/1/71dadbb3-7b8a-4656-973f-65a3284afe07.jpg?1682206565'}
                                style={{
                                    objectPosition: '0% 15%',
                                    transform: `rotate(${item.sourceRotation || 0}deg)`
                                }}
                            />
                        </ArtWindow>
                    </div>

                    {/* Bottom Banner */}
                    <div className="z-30 relative" style={{ marginTop: 4 }}>
                        <BottomBanner width={140} height={28}>
                            <div style={{ width: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <div className="w-full flex justify-between items-center px-1">
                                    <span className="text-[9px] font-semibold truncate flex-1 leading-tight" style={{ color: '#ffffff' }}>
                                        {item.sourceType || 'Ability'}
                                    </span>
                                </div>
                            </div>
                            {item.sourcePT && (
                                <div className="text-[10px] font-bold flex gap-0.5 text-white">
                                    <span>{item.sourcePT}</span>
                                </div>
                            )}
                        </BottomBanner>
                    </div>
                </div>

                {/* Info Panel - Slides out from the right */}
                <motion.div
                    initial={isNew ? { x: -50, opacity: 0 } : false}
                    animate={isNew ? { x: 0, opacity: 1 } : false}
                    transition={{
                        delay: 0.4,
                        duration: 0.4,
                        ease: "easeOut"
                    }}
                    className="flex-1 min-w-0 bg-black/60 backdrop-blur-md p-3 rounded-r-xl rounded-l-none -ml-2 flex flex-col justify-center shadow-none border-t border-b border-r border-white/10"
                    style={{ height: 160 }} // Match card frame height
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold text-sm truncate" title={item.sourceName}>
                            {item.sourceName}
                        </span>
                        {isTop && <TriggerIcon size={14} className="text-slate-400 shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-300 font-mono leading-tight line-clamp-4 opacity-80">
                        {item.description}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

const CountUp = ({ to }) => {
    const count = useMotionValue(0);
    const [rounded, setRounded] = useState(0);

    useEffect(() => {
        const controls = animate(count, to, {
            duration: 0.5,
            ease: "circOut",
            onUpdate: (v) => setRounded(Math.round(v))
        });
        return () => controls.stop();
    }, [to, count]);

    return formatBigNumber(rounded);
};

const LIFOStack = ({
    items = [],
    onResolve,
    onRemove,
    isCollapsed,
    onToggleCollapse
}) => {
    const [newItemIds, setNewItemIds] = React.useState(new Set());
    const [exitingItemIds, setExitingItemIds] = React.useState(new Set());
    const seenItemsRef = React.useRef(new Set());
    const isFirstRender = React.useRef(true);
    const [isMounted, setIsMounted] = React.useState(false);

    const [renderedItems, setRenderedItems] = React.useState(items);
    const processingRef = React.useRef(false);

    // Initial sync
    React.useEffect(() => {
        if (isFirstRender.current) {
            setRenderedItems(items);
            // Mark all initial items as seen so they don't animate in
            items.forEach(item => seenItemsRef.current.add(item.id));
            isFirstRender.current = false;
            return;
        }
    }, [items]); // Depend on items for initial sync, but only runs once due to isFirstRender.current

    // Enable transitions after mount
    React.useEffect(() => {
        requestAnimationFrame(() => {
            setIsMounted(true);
        });
    }, []);

    // Sync loop: Queue additions, Immediate removals
    React.useEffect(() => {
        if (isFirstRender.current) return; // Skip on first render, handled by initial sync

        const currentRenderedIds = new Set(renderedItems.map(i => i.id));
        const targetIds = new Set(items.map(i => i.id));

        // 1. Handle Removals (Delayed for Animation)
        // Items in renderedItems but NOT in items (and not already exiting)
        const itemsToRemove = renderedItems.filter(i =>
            !targetIds.has(i.id) && !exitingItemIds.has(i.id)
        );

        if (itemsToRemove.length > 0) {
            // Mark as exiting immediately
            const removingIds = itemsToRemove.map(i => i.id);
            setExitingItemIds(prev => {
                const next = new Set(prev);
                removingIds.forEach(id => next.add(id));
                return next;
            });

            // Schedule actual removal after animation
            setTimeout(() => {
                setRenderedItems(prev => prev.filter(i => !removingIds.includes(i.id)));
                setExitingItemIds(prev => {
                    const next = new Set(prev);
                    removingIds.forEach(id => next.delete(id));
                    return next;
                });
                // Also remove from seenItemsRef
                removingIds.forEach(id => seenItemsRef.current.delete(id));
            }, 400); // 400ms match CSS animation duration

            return;
        }

        // 2. Handle Additions Sequential
        const missingItems = items.filter(i => !currentRenderedIds.has(i.id));

        if (missingItems.length > 0 && !processingRef.current) {
            processingRef.current = true;

            // Get the NEXT item to add (preserve order)
            // We want to add the oldest missing item first to maintain stack order?
            // Actually, LIFO stack, usually we add to the end.
            const newItem = missingItems[0];
            const newItemId = newItem.id;

            // Mark as New so it animates
            setNewItemIds(prev => {
                const next = new Set(prev);
                next.add(newItemId);
                return next;
            });

            // Determine dynamic delay based on backlog size
            // If we have a lot of items waiting, go FASTER
            const backlogSize = missingItems.length;
            const dynamicDelay = backlogSize > 5 ? 50 : 200; // Fast processing for bursts

            setTimeout(() => {
                setRenderedItems(prev => {
                    const newRendered = [...prev];
                    // Append to end
                    newRendered.push(newItem);
                    return newRendered;
                });

                // Mark as seen after it's added to renderedItems
                seenItemsRef.current.add(newItemId);
                processingRef.current = false;

                // Cleanup animation flag after it finishes
                setTimeout(() => {
                    setNewItemIds(prev => {
                        const next = new Set(prev);
                        next.delete(newItemId);
                        return next;
                    });
                }, 500); // Animation duration

            }, dynamicDelay);
        }
    }, [items, renderedItems]);

    // If empty, render empty placeholder to keep component mounted
    if (!renderedItems || renderedItems.length === 0) {
        return <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-[60] perspective-1000 w-[360px] h-[160px] pointer-events-none" />;
    }

    const visibleItems = renderedItems.slice(-MAX_VISIBLE_STACK);
    const hiddenCount = Math.max(0, renderedItems.length - MAX_VISIBLE_STACK);

    return (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-[60] perspective-1000" id="stack-container">
            {/* Main Stack Container */}
            <div className="relative w-[360px] h-[160px]" id="stack-list">

                {/* Render Items - reversed so newest is first */}
                {[...visibleItems].reverse().map((item, index) => {
                    const isTop = index === 0; // First item (newest) is top
                    const isNew = newItemIds.has(item.id);

                    // Logic simplified: If it's in the list, we show it.
                    // 'isNew' controls the entrance animation.
                    const isHidden = false;

                    return (
                        <StackItem
                            key={item.id}
                            item={item}
                            index={index}
                            totalRendered={visibleItems.length}
                            isTop={isTop}
                            isNew={isNew}
                            isExiting={exitingItemIds.has(item.id)}
                            isMounted={isMounted}
                            isHidden={isHidden}
                            onResolve={onResolve}
                            onRemove={onRemove}
                        />
                    );
                })}

                {/* Hidden Items Indicator */}
                <AnimatePresence>
                    {hiddenCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute -top-6 left-0 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] px-2 py-1 rounded-full shadow-xl flex items-center gap-1 z-0"
                        >
                            <Layers size={10} />
                            +<CountUp to={hiddenCount} /> more
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LIFOStack;
