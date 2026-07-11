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
