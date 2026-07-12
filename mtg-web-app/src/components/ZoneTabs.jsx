import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Sparkles, Pin, Hand } from 'lucide-react';
import { formatBigNumber } from '../utils/formatters';

const TAB_CONFIG = {
    creatures: { label: 'Creatures', icon: Swords, activeClasses: 'border-amber-500/70 bg-amber-950/40 text-amber-300' },
    others: { label: 'Others', icon: Sparkles, activeClasses: 'border-blue-500/70 bg-blue-950/40 text-blue-300' }
};

/**
 * Zone tab row above the battlefield card area.
 * Counts include virtual token stacks (BigInt) — always formatted, never Number().
 * While the trigger stack holds the view (`pinned`), tapping the other tab
 * shakes it and reports the blocked attempt via onBlockedSwitch (toast lives in the parent).
 */
const ZoneTabs = ({
    activeZone,
    onZoneChange,
    counts = { creatures: 0n, others: 0n },
    pinned = false,
    onBlockedSwitch
}) => {
    const [shakeZone, setShakeZone] = useState(null);

    const handleTap = (zone) => {
        if (zone === activeZone) return;
        if (pinned) {
            setShakeZone(zone);
            if (onBlockedSwitch) onBlockedSwitch(zone);
            return;
        }
        onZoneChange(zone);
    };

    return (
        <div className="flex items-center justify-between px-3 pt-1 shrink-0">
            <div className="flex items-center gap-2">
                {['creatures', 'others'].map(zone => {
                    const { label, icon: Icon, activeClasses } = TAB_CONFIG[zone];
                    const isActive = zone === activeZone;
                    return (
                        <motion.button
                            key={zone}
                            onClick={() => handleTap(zone)}
                            animate={shakeZone === zone ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                            transition={{ duration: 0.35 }}
                            onAnimationComplete={() => setShakeZone(null)}
                            className={`flex items-center gap-1.5 h-11 px-4 rounded-full border text-sm font-bold transition-colors active:scale-95
                                ${isActive
                                    ? activeClasses
                                    : 'border-slate-600/50 bg-slate-800/60 text-gray-400 hover:text-gray-200'}`}
                        >
                            {isActive && pinned ? <Pin className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                            <span>{label}</span>
                            <span className={`min-w-[1.5rem] text-center px-1.5 py-0.5 rounded-full text-xs font-bold
                                ${isActive ? 'bg-black/40 text-white' : 'bg-slate-900/60 text-gray-400'}`}>
                                {formatBigNumber(counts[zone] ?? 0n)}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Right-side hint */}
            {pinned ? (
                <div className="flex items-center gap-1 text-amber-400/90 text-xs font-semibold select-none">
                    <Pin className="w-3 h-3" />
                    held by stack
                </div>
            ) : (
                <div className="flex items-center gap-1 text-gray-500 text-xs select-none">
                    <Hand className="w-3 h-3" />
                    swipe or tap
                </div>
            )}
        </div>
    );
};

export default ZoneTabs;
