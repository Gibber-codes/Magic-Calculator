import { describe, it, expect } from 'vitest';
import { calculateUnblockedDamage } from './combatUtils';

const creature = (overrides) => ({
    zone: 'battlefield',
    type_line: 'Creature',
    ...overrides,
});

describe('calculateUnblockedDamage', () => {
    it('returns 0 for an empty battlefield', () => {
        expect(calculateUnblockedDamage([])).toBe(0);
        expect(calculateUnblockedDamage(null)).toBe(0);
    });

    it('sums only unblocked attackers, as BigInt', () => {
        const cards = [
            creature({ id: 1, name: 'Grizzly Bears', power: '2', toughness: '2', attacking: true }),
            creature({ id: 2, name: 'Serra Angel', power: '4', toughness: '4', attacking: true, isBlocked: true }),
            creature({ id: 3, name: 'Wall of Omens', power: '0', toughness: '4' }),
        ];
        expect(calculateUnblockedDamage(cards)).toBe(2n);
    });

    it('multiplies damage by virtual stack size (TESTING.md §4: 1000 attacking 2/2s deal 2000)', () => {
        const cards = [
            creature({
                id: 1, name: 'Soldier Token', power: '2', toughness: '2',
                attacking: true, isVirtualStack: true, virtualStackSize: 1000,
            }),
        ];
        expect(calculateUnblockedDamage(cards)).toBe(2000n);
    });

    it('stays precise past Number.MAX_SAFE_INTEGER with BigInt stack sizes', () => {
        const cards = [
            creature({
                id: 1, name: 'Soldier Token', power: '2', toughness: '2',
                attacking: true, isVirtualStack: true, virtualStackSize: 10n ** 18n,
            }),
        ];
        expect(calculateUnblockedDamage(cards)).toBe(2n * 10n ** 18n);
    });
});
