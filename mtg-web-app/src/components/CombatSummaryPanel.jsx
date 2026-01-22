import React from 'react';
import { Sword, Zap, X } from 'lucide-react';
import { calculateCardStats } from '../utils/cardUtils';

/**
 * Combat Summary Panel
 * Displays a breakdown of unblocked attackers and total damage during Combat Damage step.
 */
const CombatSummaryPanel = ({ cards, isVisible, onClose }) => {
    if (!isVisible) return null;

    // Filter for unblocked attackers
    const unblockedAttackers = cards.filter(c =>
        c.attacking === true &&
        c.isBlocked !== true &&
        c.zone === 'battlefield'
    );

    // Calculate damage for each attacker
    const attackerDetails = unblockedAttackers.map(attacker => {
        const stats = calculateCardStats(attacker, cards);
        return {
            id: attacker.id,
            name: attacker.name,
            power: Math.max(0, stats.power),
            art: attacker.art_crop || attacker.image_normal
        };
    });

    // Total damage
    const totalDamage = attackerDetails.reduce((sum, a) => sum + a.power, 0);

    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom duration-300"
            style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
        >
            <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-red-500/50 shadow-2xl overflow-hidden min-w-[280px] max-w-[400px]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-red-900/30 border-b border-red-500/30">
                    <div className="flex items-center gap-2">
                        <Zap className="w-6 h-6 text-red-400" />
                        <h2 className="text-white font-bold text-lg">Combat Damage</h2>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Attacker List */}
                <div className="px-4 py-3 max-h-[200px] overflow-y-auto">
                    {attackerDetails.length === 0 ? (
                        <p className="text-gray-400 text-sm italic text-center py-2">
                            No unblocked attackers
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {attackerDetails.map(attacker => (
                                <li
                                    key={attacker.id}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        {attacker.art && (
                                            <img
                                                src={attacker.art}
                                                alt=""
                                                className="w-8 h-8 rounded object-cover border border-slate-600"
                                            />
                                        )}
                                        <span className="text-gray-200 truncate max-w-[180px]">
                                            {attacker.name}
                                        </span>
                                    </div>
                                    <span className="text-red-400 font-bold">
                                        {attacker.power}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 bg-red-900/20 border-t border-red-500/30">
                    <span className="text-gray-300 font-medium">Total Damage</span>
                    <span className="text-red-400 font-bold text-xl">
                        {totalDamage}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CombatSummaryPanel;
