import React, { useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Layers, Zap, RefreshCw, Clock } from 'lucide-react';

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
    const cardWidth = 320;

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

                // Approximate Target Position (Fixed Stack at bottom center)
                // Stack Item Width = 320px
                // Image Width = 140px. Image is on the Left.
                // Image Center is 70px from Left Edge.
                // Stack Item Center is 160px from Left Edge.
                // Image Offset from Center = 70 - 160 = -90px.

                const targetStackCenterX = window.innerWidth / 2;
                const targetStackCenterY = window.innerHeight - 180; // Approx bottom-32 center

                // We want the IMAGE (not the stack center) to start at the SOURCE.
                // TargetImageX = TargetStackCenterX - 90.

                const targetImageCenterX = targetStackCenterX - 90;

                const sourceCenterX = sourceRect.left + sourceRect.width / 2;
                const sourceCenterY = sourceRect.top + sourceRect.height / 2;

                const deltaX = sourceCenterX - targetImageCenterX; // Calculate delta relative to Image Center
                const deltaY = sourceCenterY - targetStackCenterY;

                return {
                    x: deltaX,
                    y: deltaY,
                    scale: 0.4, // Start smaller (card size-ish)
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
                width: '320px',
                height: '100px',
                // filter handled via style for performance
                filter: `brightness(${Math.pow(0.7, index)}) contrast(${Math.pow(0.85, index)})${index === 0 ? ' drop-shadow(0 4px 14px rgba(34, 211, 238, 0.5))' : ''}`
            }}
        >
            <div className="flex items-center gap-0 w-full h-full">
                {/* Card Image Structure - Static relative to parent */}
                <div className="relative shrink-0 z-30 h-full">
                    <div style={{
                        width: '140px',
                        height: '100%',
                        borderRadius: '12px 0 0 12px',
                        overflow: 'hidden',
                        backgroundColor: 'rgb(26, 26, 26)',
                        position: 'relative'
                    }}>
                        <img
                            alt={item.sourceName}
                            className="w-full h-full object-cover"
                            src={item.sourceArt || 'https://cards.scryfall.io/art_crop/front/7/1/71dadbb3-7b8a-4656-973f-65a3284afe07.jpg?1682206565'}
                            style={{
                                objectPosition: '0% 15%',
                                transform: `rotate(${item.sourceRotation || 0}deg)`
                            }}
                        />
                    </div>
                </div>

                {/* Text Info - Delayed Slide Out Animation */}
                <motion.div
                    initial={isNew ? { x: -50, opacity: 0 } : false}
                    animate={isNew ? { x: 0, opacity: 1 } : false}
                    transition={{
                        delay: 0.4, // Wait for flight to mostly finish
                        duration: 0.4,
                        ease: "easeOut"
                    }}
                    className="flex-1 min-w-0 bg-black/60 backdrop-blur-md p-3 rounded-r-xl rounded-l-none -ml-2 h-full flex flex-col justify-center shadow-none border-t border-b border-r border-white/10"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold text-sm truncate" title={item.sourceName}>
                            {item.sourceName}
                        </span>
                        {isTop && <TriggerIcon size={14} className="text-slate-400 shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-300 font-mono leading-tight line-clamp-3 opacity-80">
                        {item.description}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
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
        // Find items that are in 'items' but not yet in 'renderedItems'
        // We need to preserve the order from 'items'
        // Let's find the first missing item
        const firstMissingIndex = items.findIndex(i => !currentRenderedIds.has(i.id));

        if (firstMissingIndex !== -1 && !processingRef.current) {
            processingRef.current = true;
            const newItem = items[firstMissingIndex];
            const newItemId = newItem.id;

            // Mark as New so it animates
            setNewItemIds(prev => {
                const next = new Set(prev);
                next.add(newItemId);
                return next;
            });

            // Add to rendered list with a slight delay to allow 'New' state to set?
            // No, we add it, and because it's in newItemIds, it animates.

            // Wait a bit before adding the next one?
            setTimeout(() => {
                setRenderedItems(prev => {
                    // Re-construct the list based on 'items' order up to this new item
                    // Or just append? 'items' is the source of truth for order.
                    // We should take 'items' up to the point we have processed.
                    // Actually, simpler: just match 'items' structure filtering out unseen ones.
                    // But we want to add ONE.
                    const newRendered = [...prev];
                    // Insert at correct position? 
                    // Since it's a stack, usually append. 
                    // But let's be safe: insert at proper index?
                    // Stack usually pushes to end.
                    newRendered.splice(firstMissingIndex, 0, newItem);
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

            }, 200); // 200ms delay between additions
        }
    }, [items, renderedItems]);

    // If empty, render empty placeholder to keep component mounted
    if (!renderedItems || renderedItems.length === 0) {
        return <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-[60] perspective-1000 w-[320px] h-[100px] pointer-events-none" />;
    }

    const visibleItems = renderedItems.slice(-MAX_VISIBLE_STACK);
    const hiddenCount = Math.max(0, renderedItems.length - MAX_VISIBLE_STACK);

    return (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-[60] perspective-1000">
            {/* Main Stack Container */}
            <div className="relative w-[320px] h-[100px]">

                {/* Render Items - reversed so newest is first */}
                {[...visibleItems].reverse().map((item, index) => {
                    const isTop = index === 0; // First item (newest) is top
                    const isNew = newItemIds.has(item.id);
                    // Hide if not yet seen AND not currently animating in
                    // When timeout fires: seen=true, isNew=true -> Visible & Animating
                    const isSeen = seenItemsRef.current.has(item.id);
                    // Force visibility if it's new (so the animation logic runs)
                    const isHidden = !isSeen && !isNew;

                    // If it is New, we MUST render it visibly for motion to happen

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
                {hiddenCount > 0 && (
                    <div
                        className="absolute -top-6 left-0 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] px-2 py-1 rounded-full shadow-xl flex items-center gap-1"
                    >
                        <Layers size={10} />
                        +{hiddenCount} more
                    </div>
                )}
            </div>
        </div>
    );
};

export default LIFOStack;
