import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ArrowRight } from 'lucide-react';

/**
 * Thin inline trigger-stack strip for landscape — sits below the battlefield
 * card row. Unmounted entirely when the stack is empty (reclaims the space).
 * Tap the strip to expand the full stack in the dock; "Resolve →" resolves
 * the top item.
 */
const StackStrip = ({ items = [], onResolveTop, onToggleExpand, isExpanded = false }) => {
    if (items.length === 0) return null;

    // Top of the LIFO stack is the end of the array; show the newest 1–2 names
    const topNames = [...items].slice(-2).reverse().map(i => i.sourceName).join(' · ');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="shrink-0 mx-3 mb-2"
            >
                <div
                    className={`flex items-center gap-2 h-11 px-3 rounded-lg border cursor-pointer select-none transition-colors
                        ${isExpanded
                            ? 'border-indigo-400/70 bg-indigo-950/60'
                            : 'border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-950/60'}`}
                    onClick={onToggleExpand}
                    role="button"
                    aria-expanded={isExpanded}
                >
                    <Layers className="w-4 h-4 text-indigo-300 shrink-0" />
                    <span className="text-indigo-200 text-xs font-bold whitespace-nowrap">
                        {items.length} trigger{items.length !== 1 ? 's' : ''} on stack
                    </span>
                    <span className="flex-1 text-indigo-300/70 text-xs truncate">
                        {topNames}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onResolveTop?.();
                        }}
                        className="flex items-center gap-1 h-9 px-3 -mr-1 rounded-md text-emerald-300 text-xs font-bold hover:bg-emerald-900/40 active:scale-95 transition-all shrink-0"
                    >
                        Resolve
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StackStrip;
