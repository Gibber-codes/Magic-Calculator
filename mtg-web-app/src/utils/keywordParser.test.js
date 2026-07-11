import { describe, it, expect } from 'vitest';
import { extractTriggers } from './keywordParser';

describe('extractTriggers', () => {
    it('returns an empty array for missing oracle text', () => {
        expect(extractTriggers(undefined)).toEqual([]);
        expect(extractTriggers('')).toEqual([]);
    });

    it('detects an ETB trigger (Elvish Visionary)', () => {
        const triggers = extractTriggers(
            'When Elvish Visionary enters the battlefield, draw a card.'
        );
        expect(triggers).toHaveLength(1);
        expect(triggers[0].trigger).toBe('on_enter_battlefield');
    });

    it('detects an attack trigger (Hero of Bladehold)', () => {
        const triggers = extractTriggers(
            'Whenever Hero of Bladehold attacks, create two 1/1 white Soldier creature tokens that are tapped and attacking.'
        );
        expect(triggers).toHaveLength(1);
        expect(triggers[0].trigger).toBe('on_attack');
    });

    it('detects a landfall trigger (Lotus Cobra)', () => {
        const triggers = extractTriggers(
            'Landfall — Whenever a land you control enters, you may add one mana of any color.'
        );
        expect(triggers).toHaveLength(1);
        expect(triggers[0].trigger).toBe('on_land_enter_battlefield');
    });
});
