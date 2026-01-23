import React from 'react';
import { Sword, Zap, X } from 'lucide-react';
import { calculateCardStats } from '../utils/cardUtils';
import { formatBigNumber } from '../utils/formatters';

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

    // Calculate damage for each attacker and group by name + power
    const groupedAttackers = unblockedAttackers.reduce((acc, attacker) => {
        const stats = calculateCardStats(attacker, cards);
        const power = Math.max(0, stats.power);
        const count = attacker.isVirtualStack ? BigInt(attacker.virtualStackSize || 0n) : 1n;
        const key = `${attacker.name}-${power}`;

        if (!acc[key]) {
            acc[key] = {
                name: attacker.name,
                power: power,
                count: 0n,
                totalPower: 0n,
                art: attacker.art_crop || attacker.image_normal
            };
        }
        acc[key].count += count;
        acc[key].totalPower += BigInt(power) * count;
        return acc;
    }, {});

    const attackerDetails = Object.values(groupedAttackers);

    // Total damage (using BigInt for max precision)
    const totalDamageBig = attackerDetails.reduce((sum, a) => sum + a.totalPower, 0n);
    const totalDamage = formatBigNumber(totalDamageBig);

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
                            {attackerDetails.map((attacker, idx) => (
                                <li
                                    key={`${attacker.name}-${attacker.power}-${idx}`}
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
                                        <div className="flex flex-col justify-center">
                                            <span className="text-sm font-medium text-gray-200">
                                                {formatBigNumber(attacker.count)} × {attacker.power}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-red-400 font-bold">
                                        {formatBigNumber(attacker.totalPower)}
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
