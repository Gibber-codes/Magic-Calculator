import { calculateCardStats, calculateEffectiveTotal } from './cardUtils';

/**
 * Calculates the total damage dealt by all unblocked attacking creatures.
 * 
 * @param {Array} cards - The current state of all cards on the battlefield.
 * @returns {number} The total damage amount.
 */
export const calculateUnblockedDamage = (cards) => {
    if (!cards || cards.length === 0) return 0;

    // Filter for attacking creatures that are NOT blocked
    const unblockedAttackers = cards.filter(c =>
        c.attacking === true &&
        c.isBlocked !== true &&
        c.zone === 'battlefield' // Ensure they are still on the battlefield
    );

    // Use BigInt for calculation to avoid precision loss with astronomical numbers
    let totalDamageBig = 0n;

    unblockedAttackers.forEach(attacker => {
        const stats = calculateCardStats(attacker, cards);
        const count = attacker.isVirtualStack ? BigInt(attacker.virtualStackSize || 0n) : 1n;
        const damage = BigInt(Math.max(0, stats.power));

        totalDamageBig += damage * count;
    });

    return totalDamageBig;
};
