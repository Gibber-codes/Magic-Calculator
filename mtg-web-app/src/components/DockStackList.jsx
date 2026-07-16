import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Zap, RefreshCw, Clock, Layers, Trash2 } from 'lucide-react';

const getTriggerIcon = (triggerType) => {
    switch (triggerType) {
        case 'whenever': return RefreshCw;
        case 'at': return Clock;
        default: return Zap;
    }
};

/**
 * Expanded trigger stack for the landscape dock. The top of the LIFO stack
 * (last array item) is listed first and is the only resolvable/removable item —
 * matching the engine's strict LIFO resolution order.
 */
const DockStackList = ({
    items = [],
    onResolve,
    onRemove,
    onResolveAll,
    onClear
}) => {
    if (items.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center select-none">
                <Layers className="w-7 h-7 text-gray-600" />
                <p className="text-gray-500 text-sm">Stack is empty</p>
            </div>
        );
    }

    const ordered = [...items].reverse(); // newest (resolves first) on top

    return (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-300" />
                <span className="text-white font-bold text-sm flex-1">
                    {items.length} trigger{items.length !== 1 ? 's' : ''} on stack
                </span>
            </div>
            <p className="text-gray-500 text-[11px] leading-snug -mt-1">
                Resolves top-down (last in, first out).
            </p>

            <div className="flex flex-col gap-1.5">
                <AnimatePresence mode="popLayout">
                    {ordered.map((item, index) => {
                        const isTop = index === 0;
                        const TriggerIcon = getTriggerIcon(item.triggerType);
                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`rounded-lg border p-2 ${isTop
                                    ? 'border-indigo-400/60 bg-indigo-950/50'
                                    : 'border-slate-700/60 bg-slate-800/50 opacity-80'}`}
                            >
                                <div className="flex items-start gap-2">
                                    {item.sourceArt && (
                                        <img
                                            src={item.sourceArt}
                                            alt=""
                                            className="w-9 h-9 rounded object-cover border border-slate-600 shrink-0"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <TriggerIcon size={11} className="text-indigo-300 shrink-0" />
                                            <span className="text-white text-xs font-semibold truncate">{item.sourceName}</span>
                                        </div>
                                        <div className="text-slate-400 text-[11px] leading-snug line-clamp-2 mt-0.5">
                                            {item.description}
                                        </div>
                                    </div>
                                </div>

                                {isTop && (
                                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                                        <button
                                            onClick={() => onResolve?.(item)}
                                            className="h-9 flex items-center justify-center gap-1.5 rounded-md bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold active:scale-95 transition-all"
                                        >
                                            <Play className="w-3.5 h-3.5" />
                                            Resolve
                                        </button>
                                        <button
                                            onClick={() => onRemove?.(item)}
                                            className="h-9 flex items-center justify-center gap-1.5 rounded-md bg-red-900/30 hover:bg-red-900/50 border border-red-500/40 text-red-300 text-xs font-bold active:scale-95 transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {items.length > 1 && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                    <button
                        onClick={onResolveAll}
                        className="h-10 flex items-center justify-center gap-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold active:scale-95 transition-all"
                    >
                        <Play className="w-3.5 h-3.5" />
                        Resolve All
                    </button>
                    <button
                        onClick={onClear}
                        className="h-10 flex items-center justify-center gap-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-red-500/30 text-red-300/90 text-xs font-bold active:scale-95 transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
};

export default DockStackList;
