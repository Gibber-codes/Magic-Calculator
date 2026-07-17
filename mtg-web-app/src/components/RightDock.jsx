import React from 'react';
import { Hand } from 'lucide-react';

/**
 * Contextual dock for the landscape layout — always a right-side floating
 * overlay (never a column), so the battlefield stays full-width. Hosts the
 * selected card detail, targeting confirmation, and the expanded trigger stack.
 *
 * `bare` renders it chromeless (transparent, no border, no title, no clipping)
 * so a self-contained floating unit — e.g. the glowing card detail — can show
 * its own surface and glow over the battlefield, portrait-style.
 */
const RightDock = ({ title = 'Selected', children, overlay = false, bare = false }) => {
    // Bare overlays reach the top of the screen — the transparent header floats
    // over the battlefield, so the card panel shows through it. Chromed panels
    // stay below the header (top-16) to keep their opaque edge clear of it.
    const position = overlay
        ? `absolute ${bare ? 'top-0' : 'top-16'} bottom-0 right-0 z-40 w-[300px] max-w-[85vw] animate-in slide-in-from-right duration-200`
        : 'h-full w-[32%] min-w-[280px] max-w-[360px] shrink-0';

    // Chrome: the opaque panel look, or nothing (bare). Bare must NOT clip, so
    // the card unit's outer glow can spill over the battlefield.
    const chrome = bare
        ? 'overflow-visible'
        : overlay
            ? 'shadow-2xl border-l border-slate-700/60 bg-slate-900/95 backdrop-blur-md overflow-hidden'
            : 'border-l border-slate-700/60 bg-slate-900/80 backdrop-blur-md overflow-hidden';

    return (
        // data-dock marks this as a protected surface for the battlefield's
        // click-anywhere-to-deselect rule. Bare docks are chromeless, so only
        // their content (e.g. DockCardDetail's card unit) marks itself — clicks
        // on the transparent area around it count as background.
        <div data-dock={bare ? undefined : true} className={`${position} ${chrome} flex flex-col`}>
            {!bare && (
                <div className="px-4 pt-2 pb-1 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">
                        {title}
                    </span>
                </div>
            )}
            {/* Extra horizontal/top padding in bare mode gives the glow room before the scroll box clips it. */}
            <div className={`flex-1 min-h-0 overflow-y-auto touch-scroll ${bare ? 'px-5 pt-4 pb-4' : 'px-3 pb-3'}`}>
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
