import React, { useState } from 'react';
import { X, Play, Layers, Sparkles, ChevronDown, ChevronUp, Zap, RefreshCw, Clock } from 'lucide-react';
import { TopBanner } from './RedesignedCardFrame';

/**
 * TriggeredAbilityStack Component
 * 
 * Visual representation of the MTG stack for triggered abilities.
 * Displays abilities in LIFO order with card name banners.
 * 
 * Trigger Types (Signal Words):
 * - "When" - Single, non-recurring event (ETB/LTB)
 * - "Whenever" - Repeating event (casting, attacking, etc.)
 * - "At" - Time-based trigger (beginning of phases/steps)
 */

// Card color mapping (matching App.jsx)
const getCardHexColors = (colors) => {
    let c = { borderColor: '#6b7280', fillColor: '#374151', text: 'black' };

    if (!colors || colors.length === 0) return c;

    if (colors.length > 1) {
        return { borderColor: '#ca8a04', fillColor: '#eab308', text: 'black' };
    }

    const map = {
        'W': { borderColor: '#d4d4d8', fillColor: '#fef9c3', text: 'black' },
        'U': { borderColor: '#2563eb', fillColor: '#60a5fa', text: 'black' },
        'B': { borderColor: '#1f2937', fillColor: '#4b5563', text: 'white' },
        'R': { borderColor: '#b91c1c', fillColor: '#ef4444', text: 'black' },
        'G': { borderColor: '#15803d', fillColor: '#22c55e', text: 'black' }
    };

    return map[colors[0]] || c;
};

/**
 * Get trigger type info based on the signal word
 * Returns styling and icon for each trigger type
 */
const getTriggerTypeInfo = (triggerType) => {
    const types = {
        'when': {
            label: 'When',
            description: 'Single event',
            icon: Zap,
            bgColor: 'bg-blue-600',
            textColor: 'text-blue-100',
            borderColor: 'border-blue-400'
        },
        'whenever': {
            label: 'Whenever',
            description: 'Repeating event',
            icon: RefreshCw,
            iconClass: 'animate-spin-slow',
            bgColor: 'bg-purple-600',
            textColor: 'text-purple-100',
            borderColor: 'border-purple-400'
        },
        'at': {
            label: 'At',
            description: 'Phase trigger',
            icon: Clock,
            bgColor: 'bg-emerald-600',
            textColor: 'text-emerald-100',
            borderColor: 'border-emerald-400'
        }
    };

    return types[triggerType] || types['when'];
};

// Single Stack Item Component
const StackItem = ({
    item,
    index,
    isTop,
    isHovered,
    onHover,
    onLeave,
    onResolve,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
    isDragging
}) => {
    const colors = getCardHexColors(item.sourceColors);
    const triggerInfo = getTriggerTypeInfo(item.triggerType);
    const TriggerIcon = triggerInfo.icon;
    const ITEM_WIDTH = 280;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
            className={`
        relative transition-all duration-300 ease-out cursor-move
        ${isHovered ? 'z-50 scale-105' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isTop ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}
      `}
            style={{
                marginTop: index === 0 ? 0 : -12,
                zIndex: 100 - index,
                transform: isHovered ? `translateY(-${4}px)` : 'translateY(0)',
            }}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={onLeave}
        >
            {/* Card Name Banner */}
            <TopBanner
                width={ITEM_WIDTH}
                height={32}
                borderColor={colors.borderColor}
                fillColor={colors.fillColor}
            >
                <div className="w-full flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TriggerIcon size={12} className={`flex-shrink-0 ${triggerInfo.iconClass || ''}`} style={{ color: '#000' }} />
                        <span className="text-[11px] font-bold truncate" style={{ color: 'black' }}>
                            {item.sourceName}
                        </span>
                    </div>
                </div>
            </TopBanner>

            {/* Ability Description Panel - Only visible on hover */}
            {isHovered && (
                <div
                    className="bg-slate-800/95 backdrop-blur-sm border-x border-b border-slate-600 rounded-b-lg px-3 py-2 shadow-lg"
                    style={{ width: ITEM_WIDTH }}
                >
                    <p className="text-[10px] text-gray-300 leading-relaxed line-clamp-2">
                        {item.description}
                    </p>
                </div>
            )}
        </div>
    );
};

// Main Stack Component
const TriggeredAbilityStack = ({
    items = [],
    onResolve,
    onRemove,
    onResolveAll,
    onClear,
    onReorder,
    isCollapsed = false,
    onToggleCollapse
}) => {
    const [hoveredId, setHoveredId] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);

    if (items.length === 0) return null;

    // Get the most recent item (last in array since we're adding to bottom)
    const mostRecentItem = items[items.length - 1];

    // Drag handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        // Reorder the items
        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);

        // Call the onReorder callback with the new order
        if (onReorder) {
            onReorder(newItems);
        }

        setDraggedIndex(null);
    };

    return (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
            {/* Stack Header */}
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-t-xl px-4 py-3 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-amber-400" />
                        <span className="text-white font-bold text-sm">The Stack</span>
                        <span className="bg-amber-600 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                            {items.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Clear Stack Button */}
                        <button
                            onClick={onClear}
                            className="bg-red-600/60 hover:bg-red-500 text-white text-[10px] font-bold py-1 px-2 rounded flex items-center gap-1 transition-colors"
                            title="Clear the stack"
                        >
                            <X size={10} />
                        </button>

                        {/* Collapse Toggle */}
                        <button
                            onClick={onToggleCollapse}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title={isCollapsed ? "Expand stack" : "Collapse stack"}
                        >
                            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stack Items Container */}
            {!isCollapsed && (
                <div
                    className="bg-slate-900/80 backdrop-blur-sm border-x border-slate-600 shadow-2xl max-h-[60vh] overflow-y-auto"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#4b5563 #1f2937'
                    }}
                >
                    <div className="flex flex-col px-4 py-4">
                        {/* Render items in order - oldest at top, newest at bottom */}
                        {items.map((item, index) => (
                            <StackItem
                                key={item.id}
                                item={item}
                                index={index}
                                isTop={false} // No longer highlighting top
                                isHovered={hoveredId === item.id}
                                onHover={setHoveredId}
                                onLeave={() => setHoveredId(null)}
                                onResolve={onResolve}
                                onRemove={onRemove}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                isDragging={draggedIndex === index}
                            />
                        ))}
                    </div>

                    {/* Stack Resolution Info */}
                    <div className="px-4 pb-3 pt-2 border-t border-slate-700 text-center">
                        <p className="text-[9px] text-gray-500 italic mb-2">
                            Newest ability at bottom
                        </p>
                    </div>
                </div>
            )}

            {/* Action Buttons - Bottom section for most recent item */}
            {!isCollapsed && mostRecentItem && (
                <div className="bg-slate-900/95 backdrop-blur-md border-x border-b border-slate-600 rounded-b-xl px-4 py-3 shadow-2xl">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onResolve(mostRecentItem)}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-md"
                        >
                            <Play size={12} />
                            Resolve
                        </button>
                        <button
                            onClick={() => onRemove(mostRecentItem)}
                            className="flex-1 bg-red-600/80 hover:bg-red-500 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-md"
                        >
                            <X size={12} />
                            Remove
                        </button>
                    </div>
                </div>
            )}

            {/* Collapsed View - Just show count */}
            {isCollapsed && items.length > 0 && (
                <div className="bg-slate-900/80 backdrop-blur-sm border-x border-b border-slate-600 rounded-b-xl px-4 py-2">
                    <p className="text-[10px] text-gray-400 text-center">
                        {items.length} {items.length === 1 ? 'ability' : 'abilities'} waiting to resolve
                    </p>
                </div>
            )}
        </div>
    );
};

export default TriggeredAbilityStack;
