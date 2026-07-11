import { describe, it, expect } from 'vitest';
import { normalizePhase, formatPhaseName, PHASE_TRIGGER_MAP, PHASES } from './phaseUtils';

describe('normalizePhase', () => {
    it('maps every UI title-case value to canonical form', () => {
        expect(normalizePhase('Beginning')).toBe('beginning');
        expect(normalizePhase('Main')).toBe('main1');
        expect(normalizePhase('Combat')).toBe('combat');
        expect(normalizePhase('Main 2')).toBe('main2');
        expect(normalizePhase('End')).toBe('end');
    });

    it('maps legacy lowercase engine spellings to canonical form', () => {
        expect(normalizePhase('main')).toBe('main1');
        expect(normalizePhase('main 2')).toBe('main2');
        expect(normalizePhase('end')).toBe('end');
    });

    it('is tolerant of whitespace and mixed case', () => {
        expect(normalizePhase(' MAIN 2 ')).toBe('main2');
        expect(normalizePhase('COMBAT')).toBe('combat');
    });

    it('returns null for unknown or non-string input', () => {
        expect(normalizePhase('cleanup')).toBeNull();
        expect(normalizePhase(null)).toBeNull();
        expect(normalizePhase(undefined)).toBeNull();
        expect(normalizePhase(3)).toBeNull();
    });
});

describe('PHASE_TRIGGER_MAP', () => {
    it('has no entry for main2 — main-phase triggers fire once per turn, precombat', () => {
        expect(PHASE_TRIGGER_MAP[PHASES.MAIN2]).toBeUndefined();
        expect(PHASE_TRIGGER_MAP[PHASES.MAIN1]).toBe('main_phase');
    });
});

describe('formatPhaseName', () => {
    it('formats canonical phases as display names', () => {
        expect(formatPhaseName('main1')).toBe('Main');
        expect(formatPhaseName('main 2')).toBe('Main 2');
        expect(formatPhaseName('End')).toBe('End');
    });
});
