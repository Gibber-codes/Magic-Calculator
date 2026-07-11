/**
 * Canonical phase identifiers and casing normalization.
 *
 * The engine speaks canonical lowercase phases only; UI state keeps its
 * title-case values ('Beginning', 'Main', 'Combat', 'Main 2', 'End') as a
 * display concern. normalizePhase() is the boundary between the two —
 * every engine entry point that accepts a phase runs its input through it.
 */

export const PHASES = {
    BEGINNING: 'beginning',
    MAIN1: 'main1',
    COMBAT: 'combat',
    MAIN2: 'main2',
    END: 'end',
};

// Every phase spelling that appears in the codebase (UI values, legacy
// lowercase calls, auto-calculate's 'main 2'), mapped to canonical form.
const PHASE_ALIASES = {
    beginning: PHASES.BEGINNING,
    main: PHASES.MAIN1,
    main1: PHASES.MAIN1,
    'main 1': PHASES.MAIN1,
    combat: PHASES.COMBAT,
    main2: PHASES.MAIN2,
    'main 2': PHASES.MAIN2,
    end: PHASES.END,
};

/**
 * Normalize any phase spelling to its canonical lowercase form.
 * @param {*} input - e.g. 'Main 2', 'main', 'End'
 * @returns {string|null} canonical phase, or null if unrecognized
 */
export function normalizePhase(input) {
    if (typeof input !== 'string') return null;
    return PHASE_ALIASES[input.trim().toLowerCase()] || null;
}

/**
 * Which trigger type fires when each canonical phase begins.
 *
 * main2 deliberately has NO entry: main-phase triggers fire once per turn,
 * at the precombat main phase. Mapping main2 → 'main_phase' would fire them
 * a second time each turn. (This matches pre-normalization behavior, where
 * the lowercase 'main 2' the engine received matched no map key.)
 */
export const PHASE_TRIGGER_MAP = {
    [PHASES.BEGINNING]: 'beginning_step',
    [PHASES.MAIN1]: 'main_phase',
    [PHASES.COMBAT]: 'beginning_of_combat',
    [PHASES.END]: 'end_step',
};

/**
 * Display name for a phase in any spelling (title-case, for UI/log text).
 */
export function formatPhaseName(phase) {
    const names = {
        [PHASES.BEGINNING]: 'Beginning',
        [PHASES.MAIN1]: 'Main',
        [PHASES.COMBAT]: 'Combat',
        [PHASES.MAIN2]: 'Main 2',
        [PHASES.END]: 'End',
    };
    return names[normalizePhase(phase)] || String(phase ?? '');
}
