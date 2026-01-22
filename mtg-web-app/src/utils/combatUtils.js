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

    let totalDamage = 0;

    unblockedAttackers.forEach(attacker => {
        // Calculate effective stats (including buffs, counters, etc.)
        const stats = calculateCardStats(attacker, cards);

        // Handle stacks (if multiple of the same token are attacking as a stack)
        // Note: Currently, 'attacking' is a property on individual card objects. 
        // If the stack logic is purely visual, individual cards have the state. 
        // If a stack object has 'attacking', we'd need to multiply by count.
        // Based on current architecture, usually individual tokens are flattened for state actions like attacking.
        // However, let's allow for the possibility of stack-based keys if that ever changes.
        // For now, consistent with useGameState, we assume flattened cards for combat or robust objects.

        const count = attacker.isVirtualStack ? BigInt(attacker.tokenCount || 1n) : 1n;
        const damage = BigInt(Math.max(0, stats.power));

        // Use BigInt for calculation then convert safely for display/return
        // Capping at safe integer for UI display purposes as 'number' type is requested
        const totalForCard = damage * count;

        // Accumulate (convert to number for simple return, assuming damage won't exceed Number.MAX_SAFE_INTEGER in typical usage)
        totalDamage += Number(totalForCard);
    });

    return totalDamage;
};
