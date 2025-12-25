import React from 'react';
import { Play, X, Layers, Zap, RefreshCw, Clock } from 'lucide-react';

const STACK_OFFSET_X = 16; // px - offset to the left
const STACK_OFFSET_Y = 12; // px - offset downward
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
    depth = 0, // 0 is top card
    isTop,
    onResolve,
    onRemove
}) => {
    // Calculate transform based on depth (how far back in stack)
    // Depth 0 = Front (No offset)
    // Depth 1 = Behind 1 (Offset DOWN and to the LEFT)
    const translateX = -(depth * STACK_OFFSET_X); // Negative = move left
    const translateY = (depth * STACK_OFFSET_Y); // Positive = move down
    const scale = 1 - (depth * 0.05);
    const opacity = 1 - (depth * 0.15); // Fade out reduced items

    // Z-Index: Top card has highest
    const zIndex = 50 - depth;

    const TriggerIcon = getTriggerIcon(item.triggerType);

    return (
        <div
            className={`
                absolute left-0 top-0
                transition-all duration-300 ease-out
                ${isTop ? 'pointer-events-auto shadow-2xl shadow-black/50' : 'pointer-events-none select-none'}
            `}
            style={{
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                zIndex: zIndex,
                opacity: Math.max(0, opacity),
                transformOrigin: 'bottom left',
                width: '320px', // Container width
                height: '100px' // Container height
            }}
        >
            <div className="flex items-center gap-3">
                {/* Card Image Structure (User Provided) */}
                <div className="relative shrink-0 z-30">
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
                            src={item.sourceArt || 'https://cards.scryfall.io/art_crop/front/7/1/71dadbb3-7b8a-4656-973f-65a3284afe07.jpg?1682206565'} // Fallback if no art logic
                            style={{ objectPosition: '0% 15%' }}
                        />
                        {/* Optional: Add gradient if art is missing or for text contrast if text overlays (not needed here) */}
                    </div>
                </div>

                {/* Text Info (To the right of the card image) */}
                <div className="flex-1 min-w-0 bg-slate-900/80 backdrop-blur-sm p-3 rounded-r-lg border-y border-r border-slate-700/50 -ml-1 h-[90px] flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold text-sm truncate" title={item.sourceName}>
                            {item.sourceName}
                        </span>
                        {isTop && <TriggerIcon size={14} className="text-slate-400 shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-400 font-mono leading-tight line-clamp-2">
                        {item.description}
                    </div>

                    {/* Actions */}
                    {isTop && (
                        <div className="flex gap-2 mt-2 justify-end">
                            <button
                                onClick={(e) => { e.stopPropagation(); onResolve(item); }}
                                className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors uppercase"
                            >
                                Resolve
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

const TriggeredAbilityStack = ({
    items = [],
    onResolve,
    onRemove,
    isCollapsed,
    onToggleCollapse
}) => {
    if (!items || items.length === 0) return null;

    const visibleItems = items.slice(-MAX_VISIBLE_STACK);
    const hiddenCount = Math.max(0, items.length - MAX_VISIBLE_STACK);

    return (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-[60] perspective-1000">
            {/* Main Stack Container */}
            <div className="relative w-[320px] h-[100px]">

                {/* Render Items */}
                {visibleItems.map((item, index) => {
                    const depth = (visibleItems.length - 1) - index;
                    return (
                        <StackItem
                            key={item.id}
                            item={item}
                            depth={depth}
                            isTop={depth === 0}
                            onResolve={onResolve}
                            onRemove={onRemove}
                        />
                    );
                })}

                {/* Hidden Items Indicator */}
                {hiddenCount > 0 && (
                    <div
                        className="absolute -top-6 right-0 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] px-2 py-1 rounded-full shadow-xl flex items-center gap-1"
                        style={{ transform: `translateX(-${(visibleItems.length) * STACK_OFFSET_X}px)` }}
                    >
                        <Layers size={10} />
                        +{hiddenCount} more
                    </div>
                )}
            </div>
        </div>
    );
};

export default TriggeredAbilityStack;
