import React from 'react';
import { Hand } from 'lucide-react';

/**
 * Contextual dock for the landscape two-column layout.
 * Hosts the selected card detail, targeting confirmation, and the expanded
 * trigger stack — anything that used to float over the battlefield.
 */
const RightDock = ({ title = 'Selected', children, overlay = false }) => {
    // 'overlay' is the small-viewport fallback (e.g. iPhone SE landscape):
    // the dock slides over the battlefield instead of claiming column width.
    return (
        <div className={overlay
            ? 'absolute top-16 bottom-0 right-0 z-40 w-[300px] max-w-[85vw] shadow-2xl border-l border-slate-700/60 bg-slate-900/95 backdrop-blur-md flex flex-col overflow-hidden animate-in slide-in-from-right duration-200'
            : 'h-full w-[32%] min-w-[280px] max-w-[360px] shrink-0 border-l border-slate-700/60 bg-slate-900/80 backdrop-blur-md flex flex-col overflow-hidden'}>
            <div className="px-4 pt-2 pb-1 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">
                    {title}
                </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto touch-scroll px-3 pb-3">
                {children || (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4 select-none">
                        <Hand className="w-8 h-8 text-gray-600" />
                        <p className="text-gray-500 text-sm leading-snug">
                            Tap a card to see details<br />and actions
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RightDock;
