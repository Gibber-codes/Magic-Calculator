import { useState, useEffect, useRef, useCallback } from 'react';
import GameEngine from '../utils/gameEngine';

const PHASE_ORDER = ['Beginning', 'Main', 'Combat', 'Main 2', 'End'];

const COMBAT_STEPS = [
    'Beginning of Combat',
    'Declare Attackers',
    'Declare Blockers',
    'Combat Damage',
    'End of Combat'
];

/**
 * Custom hook for managing core game state including cards, phases, history, and ability stack.
 */
const useGameState = () => {
    // --- Core State ---
    const [cards, setCards] = useState([]);
    const [history, setHistory] = useState([]);
    const [actionLog, setActionLog] = useState([]);

    // --- Phase State ---
    const [currentPhase, setCurrentPhase] = useState(null);
    const [currentCombatStep, setCurrentCombatStep] = useState(null);

    // --- Ability Stack State ---
    const [abilityStack, setAbilityStack] = useState([]);
    const [isStackCollapsed, setIsStackCollapsed] = useState(false);

    // --- Engine Reference ---
    const gameEngineRef = useRef(null);

    // Initialize Engine
    useEffect(() => {
        gameEngineRef.current = new GameEngine(cards);
    }, []);

    useEffect(() => {
        if (gameEngineRef.current) {
            gameEngineRef.current.updateBattlefield(cards);
        }
    }, [cards]);

    // --- Actions ---

    const logAction = useCallback((desc) => {
        setActionLog(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), desc }, ...prev]);
    }, []);

    const saveHistoryState = useCallback((newCards) => {
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(cards))]);
        setCards(newCards);
    }, [cards]);

    const undo = useCallback(() => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setCards(prev);
            setHistory(prevHist => prevHist.slice(0, -1));
        }
    }, [history]);

    // --- Phase Management ---

    const handlePhaseChange = useCallback((phase, cardPositions = {}) => {
        setCurrentPhase(phase);
        logAction(`Phase: ${phase}`);

        // Initialize combat step when entering combat phase
        if (phase === 'Combat') {
            setCurrentCombatStep(COMBAT_STEPS[0]);
            logAction(`Combat Step: ${COMBAT_STEPS[0]}`);
        } else {
            setCurrentCombatStep(null);
        }

        // Return triggers for UI to add to stack (caller can use cardPositions for sorting)
        if (gameEngineRef.current) {
            const triggers = gameEngineRef.current.processPhaseChange(phase.toLowerCase(), true);
            return triggers;
        }
        return [];
    }, [logAction]);

    const advanceCombatStep = useCallback(() => {
        const currentIdx = COMBAT_STEPS.indexOf(currentCombatStep);
        if (currentIdx !== -1 && currentIdx < COMBAT_STEPS.length - 1) {
            const nextStep = COMBAT_STEPS[currentIdx + 1];
            setCurrentCombatStep(nextStep);
            logAction(`Combat Step: ${nextStep}`);
            return { nextStep, shouldDeclareAttackers: nextStep === 'Declare Attackers' };
        } else {
            // All combat steps complete, signal to advance phase
            return { shouldAdvancePhase: true };
        }
    }, [currentCombatStep, logAction]);

    const advancePhase = useCallback(() => {
        if (!currentPhase) {
            return 'Beginning';
        } else {
            const idx = PHASE_ORDER.indexOf(currentPhase);
            if (idx !== -1 && idx < PHASE_ORDER.length - 1) {
                return PHASE_ORDER[idx + 1];
            }
        }
        return null;
    }, [currentPhase]);

    const endTurn = useCallback(() => {
        logAction("Turn Ended");
        setCurrentPhase(null);
        setCurrentCombatStep(null);

        // Clear attacking status and temporary buffs from all creatures
        setCards(prev => prev.map(c => ({
            ...c,
            attacking: false,
            tempPowerBonus: 0,
            tempToughnessBonus: 0
        })));
    }, [logAction]);

    // --- Ability Stack Management ---

    const addToStack = useCallback((sourceCard, description, triggerType, triggerObj) => {
        let detectedType = triggerType;

        // Auto-detect type based on description if not provided
        if (!detectedType || detectedType === 'trigger') {
            if (description && description.toLowerCase().startsWith('at')) {
                detectedType = 'at';
            } else if (description && description.toLowerCase().startsWith('when')) {
                detectedType = 'when';
            }
        }

        const newAbility = {
            id: Date.now() + Math.random(),
            sourceName: sourceCard.name,
            sourceColors: sourceCard.colors || [],
            sourceId: sourceCard.id,
            description: description,
            triggerType: detectedType || 'when',
            trigger: triggerObj?.trigger, // Store the actual trigger type (e.g., 'deferred_token_creation')
            triggerObj: triggerObj,
            timestamp: Date.now()
        };

        setAbilityStack(prev => [...prev, newAbility]);
        logAction(`Triggered: ${sourceCard.name} - ${description}`);
    }, [logAction]);

    const resolveStackAbility = useCallback((ability, recentCards = [], startTargetingCallback) => {
        // Check if this ability needs targeting BEFORE resolution
        if (ability.triggerObj && ability.triggerObj.ability) {
            const abilityDef = ability.triggerObj.ability;
            const needsTargeting = abilityDef.target &&
                (abilityDef.target.includes('another') || abilityDef.target.includes('target')) &&
                !abilityDef.targetIds;

            if (needsTargeting && startTargetingCallback) {
                // Instead of resolving, initiate targeting mode
                // Return a special flag to tell the caller to start targeting
                return { needsTargeting: true, ability: ability };
            }
        }

        // Check if this is a deferred token creation
        if (ability.trigger === 'deferred_token_creation' && ability.triggerObj && ability.triggerObj.execute) {
            const result = ability.triggerObj.execute(cards);

            // Update card state with the new token
            const newCards = result.newCards || cards;
            const entryTriggers = result.triggers || [];

            setCards(newCards);
            logAction(`Created ${ability.description}`);

            // Add entry triggers to the stack
            entryTriggers.forEach(t => {
                const desc = t.ability.description || `${t.source.name}: ${t.ability.effect}`;
                addToStack(t.source, desc, t.ability.trigger, t);
            });

            saveHistoryState(newCards);
        } else if (ability.triggerObj && ability.triggerObj.execute) {
            // Regular trigger resolution
            const result = ability.triggerObj.execute(cards, recentCards);

            // Handle new return format { newCards, triggers }
            const newCards = result.newCards || result;
            const triggers = result.triggers || [];

            setCards(newCards);
            logAction(ability.triggerObj.log?.description || `Resolved: ${ability.sourceName} - ${ability.description}`);

            // Add any triggered abilities to the stack
            triggers.forEach(t => {
                // Check if this is a deferred creation (different structure)
                if (t.trigger === 'deferred_token_creation') {
                    addToStack(t.source, t.description, t.trigger, t);
                } else {
                    // Regular trigger
                    const desc = t.ability?.description || `${t.source.name} triggered`;
                    addToStack(t.source, desc, 'trigger', t);
                }
            });

            saveHistoryState(newCards);
        } else {
            logAction(`Resolved: ${ability.sourceName} - ${ability.description}`);
        }
        setAbilityStack(prev => prev.filter(a => a.id !== ability.id));
        return { needsTargeting: false };
    }, [cards, logAction, saveHistoryState, addToStack]);

    const removeFromStack = useCallback((ability) => {
        logAction(`Removed from stack: ${ability.sourceName}`);
        setAbilityStack(prev => prev.filter(a => a.id !== ability.id));
    }, [logAction]);

    const resolveAllStack = useCallback((recentCards = []) => {
        let currentCards = [...cards];
        const newAbilityStack = []; // To collect new triggers if we wanted to support them in resolveAll?
        // But resolving all assumes we clear the stack. New triggers might need to be resolved too?
        // For 'resolve all', usually we just crunch through everything.
        // If resolving one causes a trigger, we should probably add it to the stack so it resolves NEXT (or after).
        // Standard Magic: "Resolve stack" iteratively.
        // But for this "Resolve All" button, it's usually valid to just run everything.
        // If a trigger happens mid-resolution, it goes on top.
        // Implementing simple version: Just add to stack and let user decide, or ignore?
        // Better: Process current stack, gather triggers, add triggers to stack. 
        // "Resolve All" usually implies emptying the current stack.

        // Iterative approach
        // We need to loop because the stack might grow if we were truly simulating.
        // But here we are iterating over the SNAPSHOT `abilityStack`.
        // So new triggers will be added to the state but not executed in this loop.

        abilityStack.forEach(ability => {
            if (ability.triggerObj && ability.triggerObj.execute) {
                const result = ability.triggerObj.execute(currentCards, recentCards);
                const nextCards = result.newCards || result;
                const triggers = result.triggers || [];

                currentCards = nextCards;

                // Add new triggers to the REAL stack state (so they appear after this batch clears)
                triggers.forEach(t => {
                    const desc = t.ability.description || `${t.source.name} triggered`;
                    addToStack(t.source, desc, 'trigger', t);
                });

                logAction(ability.triggerObj.log?.description || `Resolved: ${ability.sourceName}`);
            } else {
                logAction(`Resolved: ${ability.sourceName} - ${ability.description}`);
            }
        });

        if (abilityStack.some(a => a.triggerObj)) {
            saveHistoryState(currentCards);
        }
        setAbilityStack([]); // Clears the ones we just resolved. New triggers from addToStack call above will be added via setState functional update.
    }, [cards, abilityStack, logAction, saveHistoryState, addToStack]);

    const clearStack = useCallback(() => {
        logAction("Stack cleared");
        setAbilityStack([]);
    }, [logAction]);

    return {
        // State
        cards,
        setCards,
        history,
        actionLog,
        currentPhase,
        setCurrentPhase,
        currentCombatStep,
        setCurrentCombatStep,
        abilityStack,
        setAbilityStack,
        isStackCollapsed,
        setIsStackCollapsed,
        gameEngineRef,

        // Actions
        logAction,
        saveHistoryState,
        undo,
        handlePhaseChange,
        advanceCombatStep,
        advancePhase,
        endTurn,

        // Stack Management
        addToStack,
        resolveStackAbility,
        removeFromStack,
        resolveAllStack,
        clearStack,

        // Constants (for external use)
        PHASE_ORDER,
        COMBAT_STEPS
    };
};

export default useGameState;
