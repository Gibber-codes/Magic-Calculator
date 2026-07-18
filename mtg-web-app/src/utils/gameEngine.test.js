import { describe, it, expect } from 'vitest';
import { GameEngine } from './gameEngine';

const doubler = (count = 1n) => ({
    type: 'double_tokens',
    multiplier: 2,
    count,
});

describe('GameEngine.applyModifiers', () => {
    const engine = new GameEngine([]);

    it('returns the base value with no doublers', () => {
        expect(engine.applyModifiers(1, [], 'create_token')).toBe(1);
        expect(engine.applyModifiers(5, [], 'create_token')).toBe(5);
    });

    it('doubles tokens with one doubler', () => {
        expect(engine.applyModifiers(1, [doubler()], 'create_token')).toBe(2);
    });

    it('quadruples tokens with two doublers (Doubling Season + Mondrak)', () => {
        const modifiers = [doubler(), doubler()];
        expect(engine.applyModifiers(1, modifiers, 'create_token')).toBe(4);
    });

    it('switches to BigInt exponential math past BIGINT_DOUBLER_THRESHOLD (12 doublers)', () => {
        const result = engine.applyModifiers(1, [doubler(12n)], 'create_token');
        expect(result).toEqual({
            value: 4096n, // 2^12
            isBigInt: true,
            doublerCount: 12,
        });
    });

    it('does not apply the BigInt token path to non-token effects', () => {
        // 12 token doublers but a counter effect: stays on the standard Number path
        const result = engine.applyModifiers(1, [doubler(12n)], 'add_counters');
        expect(result).toBe(4096);
    });
});

describe('GameEngine phase trigger casing (Tier 1D normalization)', () => {
    const endStepCard = {
        id: 1,
        name: 'End Stepper',
        zone: 'battlefield',
        abilities: [{ trigger: 'end_step', effect: 'add_counters', amount: 1, target: 'self' }],
    };
    const mainPhaseCard = {
        id: 2,
        name: 'Main Phaser',
        zone: 'battlefield',
        abilities: [{ trigger: 'main_phase', effect: 'add_counters', amount: 1, target: 'self' }],
    };

    it('accepts any casing for phase names', () => {
        const engine = new GameEngine([endStepCard]);
        expect(engine.checkPendingTriggers('end')).toBe(true);
        expect(engine.checkPendingTriggers('End')).toBe(true);
        expect(engine.processPhaseChange('END')).toHaveLength(1);
    });

    it('fires main-phase triggers at precombat main but NOT at main 2 (fires once per turn)', () => {
        const engine = new GameEngine([mainPhaseCard]);
        expect(engine.processPhaseChange('Main')).toHaveLength(1);
        expect(engine.processPhaseChange('Main 2')).toHaveLength(0);
        expect(engine.processPhaseChange('main 2')).toHaveLength(0);
    });

    it('finds ALL creatures for all_creatures_you_control, including tokens (Ouroboroid)', () => {
        const engine = new GameEngine([]);
        const pool = [
            { id: 1, name: 'Plain Creature', type: 'Creature', zone: 'battlefield' },
            // Token whose type field never got set to 'Creature' (varies by creation path)
            { id: 2, name: 'Goblin Token', type: 'Token', type_line: 'Token Creature — Goblin', isToken: true, zone: 'battlefield' },
            // Scryfall-shaped card: creature-ness only in type_line
            { id: 3, name: 'Scryfall Creature', type_line: 'Legendary Creature — Elf', zone: 'battlefield' },
            { id: 4, name: 'Enchantment', type: 'Enchantment', type_line: 'Enchantment', zone: 'battlefield' },
            { id: 5, name: 'Dead Creature', type: 'Creature', type_line: 'Creature — Bear', zone: 'graveyard' },
        ];
        const targets = engine.findTargets('all_creatures_you_control', pool);
        expect(targets.map(t => t.id).sort()).toEqual([1, 2, 3]);
    });

    it('processEndOfTurn resolves delayed end-step triggers once, and never standard ones', () => {
        const engine = new GameEngine([endStepCard]);
        engine.registerDelayedTrigger({
            phase: 'end_step',
            effect: 'sacrifice_cards',
            targets: [99],
            sourceId: 1,
            description: 'Sacrifice a token',
        });

        const first = engine.processEndOfTurn();
        // Only the delayed trigger — endStepCard's standard trigger must not fire here
        expect(first).toHaveLength(1);
        expect(first[0].ability.effect).toBe('sacrifice_cards');

        // Delayed triggers are one-shot
        expect(engine.processEndOfTurn()).toHaveLength(0);
    });
});
