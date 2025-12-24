import { useState, useEffect, useRef, useCallback } from 'react';
import GameEngine from '../utils/gameEngine';

// --- Constants ---

const TURN_STRUCTURE = {
    'Beginning': ['Untap', 'Upkeep', 'Draw'],
    'Main': ['Pre-Combat Main'],
    'Combat': ['Beginning of Combat', 'Declare Attackers', 'Declare Blockers', 'Combat Damage', 'End of Combat'],
    'Main 2': ['Post-Combat Main'], // Maps to 'Main 2' phase for UI compatibility
    'End': ['End', 'Cleanup']
};

// Flattened sequence for easy traversal
const FULL_TURN_SEQUENCE = [
    { phase: 'Beginning', step: 'Untap' },
    { phase: 'Beginning', step: 'Upkeep' },
    { phase: 'Beginning', step: 'Draw' },
    { phase: 'Main', step: 'Pre-Combat Main' },
    { phase: 'Combat', step: 'Beginning of Combat' },
    { phase: 'Combat', step: 'Declare Attackers' },
    { phase: 'Combat', step: 'Declare Blockers' },
    { phase: 'Combat', step: 'Combat Damage' },
    { phase: 'Combat', step: 'End of Combat' },
    { phase: 'Main 2', step: 'Post-Combat Main' },
    { phase: 'End', step: 'End' },
    { phase: 'End', step: 'Cleanup' }
];

// For UI compatibility, expose standard phases
const PHASE_ORDER = ['Beginning', 'Main', 'Combat', 'Main 2', 'End'];
const COMBAT_STEPS = TURN_STRUCTURE['Combat'];

/**
 * Custom hook for managing core game state including cards, phases, history, and ability stack.
 */
const useGameState = () => {
    // --- Core State ---
    const [cards, setCards] = useState([]);
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);
    const [actionLog, setActionLog] = useState([]);

    // --- Phase State ---
    const [currentPhase, setCurrentPhase] = useState(null);
    const [currentCombatStep, setCurrentCombatStep] = useState(null);

    // --- Ability Stack State ---
    const [abilityStack, setAbilityStack] = useState([]);
    const [isStackCollapsed, setIsStackCollapsed] = useState(false);
    const resolvingAbilities = useRef(new Set()); // Track abilities currently being resolved

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
        setFuture([]); // Clear redo stack on new action
    }, [cards]);

    const undo = useCallback(() => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setFuture(prevFuture => [JSON.parse(JSON.stringify(cards)), ...prevFuture]); // Push current to future
            setCards(prev);
            setHistory(prevHist => prevHist.slice(0, -1));
        }
    }, [history, cards]);

    const redo = useCallback(() => {
        if (future.length > 0) {
            const next = future[0];
            setHistory(prevHist => [...prevHist, JSON.parse(JSON.stringify(cards))]); // Push current to history
            setCards(next);
            setFuture(prevFuture => prevFuture.slice(1));
        }
    }, [future, cards]);

    // --- Phase Management ---

    // Helper: Untap all cards
    const untapAll = useCallback(() => {
        setCards(prev => prev.map(c => ({ ...c, tapped: false })));
        logAction('Untapped all permanents');
    }, [logAction]);

    const handlePhaseChange = useCallback((phase, cardPositions = {}) => {
        // Special Handling: Untap Step
        // If we are entering 'Beginning', we impliedly start at Untap -> Upkeep -> Draw
        // But the UI currently calls this with just the Phase name.

        // Logic Refinement:
        // 1. If phase is 'Beginning', we trigger untap.
        // 2. We set currentPhase to 'Beginning' and maybe track step internally if we wanted full granularity exposed.
        // For now, we keep the UI phase-based but execute step logic.

        setCurrentPhase(phase);
        logAction(`Phase: ${phase}`);

        if (phase === 'Beginning') {
            untapAll();
        }

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
    }, [logAction, untapAll]);

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

        // Process End phase - this will trigger delayed effects like Orthion's token sacrifices
        let endTriggers = [];
        if (gameEngineRef.current) {
            endTriggers = gameEngineRef.current.processPhaseChange('End', true);
        }

        // Clear phase state
        setCurrentPhase(null);
        setCurrentCombatStep(null);

        // Clear attacking status and temporary buffs from all creatures
        setCards(prev => {
            let updatedCards = prev.map(c => ({
                ...c,
                attacking: false,
                tempPowerBonus: 0,
                tempToughnessBonus: 0
            }));

            // Process sacrifice triggers if any
            endTriggers.forEach(trigger => {
                if (trigger.ability && trigger.ability.effect === 'sacrifice_cards') {
                    const idsToRemove = trigger.ability.targetIds || [];
                    updatedCards = updatedCards.filter(c => !idsToRemove.includes(c.id));
                    logAction(trigger.ability.description || 'Sacrificed tokens at end of turn');
                }
            });

            return updatedCards;
        });

        return endTriggers;
    }, [logAction, gameEngineRef]);

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
        // Guard: Prevent resolving the same ability multiple times
        if (resolvingAbilities.current.has(ability.id)) {
            console.log('⚠️ Already resolving:', ability.id, '- skipping duplicate call');
            return { needsTargeting: false };
        }

        // Mark this ability as being resolved
        resolvingAbilities.current.add(ability.id);
        console.log('🔍 Starting resolution for:', ability.id, ability.sourceName);

        // Check if this ability needs targeting BEFORE resolution
        if (ability.triggerObj && ability.triggerObj.ability) {
            const abilityDef = ability.triggerObj.ability;
            const needsTargeting = abilityDef.target &&
                typeof abilityDef.target === 'string' &&
                (abilityDef.target.includes('another') || abilityDef.target.includes('target')) &&
                !abilityDef.targetIds;

            if (needsTargeting && startTargetingCallback) {
                // Instead of resolving, initiate targeting mode
                // Return a special flag to tell the caller to start targeting
                resolvingAbilities.current.delete(ability.id); // Remove from resolving set
                return { needsTargeting: true, ability: ability };
            }
        }

        // Check if this ability needs targeting BEFORE resolution
        if (ability.triggerObj && ability.triggerObj.execute) {
            // Regular trigger resolution
            const result = ability.triggerObj.execute(cards, recentCards);

            // Handle new return format { newCards, triggers }
            const resultNewCards = result.newCards || result;
            const triggers = result.triggers || [];

            // MERGE LOGIC: Handle updates to existing cards (by ID) vs new cards
            // GameEngine might return existing cards with updated properties (e.g. zone: 'graveyard')
            const updatedCards = (() => {
                const newIds = new Set(resultNewCards.map(c => c.id));
                const kept = cards.filter(c => !newIds.has(c.id));
                return [...kept, ...resultNewCards];
            })();

            setCards(updatedCards);
            logAction(ability.triggerObj.log?.description || `Resolved: ${ability.sourceName} - ${ability.description}`);

            // Update stack state: remove the resolved ability AND add new triggers
            setAbilityStack(prev => {
                const filtered = prev.filter(a => a.id !== ability.id);
                const newAbilities = triggers.map((t, index) => {
                    const isDeferred = t.trigger === 'deferred_token_creation';
                    const desc = isDeferred ? t.description : (t.ability?.description || `${t.source.name} triggered`);
                    const type = isDeferred ? t.trigger : 'trigger';

                    // Use token template info if available for better UI
                    let displayName = t.source.name;
                    let displayColors = t.source.colors || [];

                    if (isDeferred && t.tokenTemplate) {
                        displayName = `Creating: ${t.tokenTemplate.name}`;
                        displayColors = t.tokenTemplate.colors || [];
                    }

                    return {
                        id: `${Date.now()}-${Math.random()}-${performance.now()}-${index}`,
                        sourceName: displayName,
                        sourceColors: displayColors,
                        sourceId: t.source?.id,
                        description: desc,
                        triggerType: type,
                        trigger: t.trigger,
                        triggerObj: t,
                        timestamp: Date.now()
                    };
                });

                return [...filtered, ...newAbilities];
            });

            saveHistoryState(updatedCards);
        } else {
            logAction(`Resolved: ${ability.sourceName} - ${ability.description}`);
            setAbilityStack(prev => prev.filter(a => a.id !== ability.id));
        }

        // Cleanup: Remove from resolving set
        resolvingAbilities.current.delete(ability.id);
        console.log('✅ Finished resolving:', ability.id);

        return { needsTargeting: false };
    }, [cards, logAction, saveHistoryState, addToStack]);

    const removeFromStack = useCallback((ability) => {
        logAction(`Removed from stack: ${ability.sourceName}`);
        setAbilityStack(prev => prev.filter(a => a.id !== ability.id));
    }, [logAction]);

    const resolveAllStack = useCallback((recentCards = []) => {
        let currentCards = [...cards];
        const newTriggers = [];

        // Resolve all items currently on the stack. 
        // We iterate in reverse to simulate LIFO resolution (top of stack first)
        const stackToResolve = [...abilityStack].reverse();

        stackToResolve.forEach(ability => {
            // Skip if no execute function (just a text item)
            if (ability.triggerObj && ability.triggerObj.execute) {
                const result = ability.triggerObj.execute(currentCards, recentCards);

                // Handle return formats
                const nextCards = result.newCards || result;
                const triggers = result.triggers || [];

                currentCards = nextCards;
                newTriggers.push(...triggers);

                logAction(ability.triggerObj.log?.description || `Resolved: ${ability.sourceName}`);
            } else {
                logAction(`Resolved: ${ability.sourceName} - ${ability.description}`);
            }
        });

        // Update cards with final state
        setCards(currentCards);

        if (stackToResolve.length > 0) {
            saveHistoryState(currentCards);
        }

        // Set stack to ONLY the new triggers (replacing the resolved ones)
        const newStackItems = newTriggers.map((t, index) => {
            const isDeferred = t.trigger === 'deferred_token_creation';
            const desc = isDeferred ? t.description : (t.ability?.description || `${t.source.name} triggered`);
            const type = isDeferred ? t.trigger : 'trigger';

            // Use token template info if available for better UI
            let displayName = t.source.name;
            let displayColors = t.source.colors || [];

            if (isDeferred && t.tokenTemplate) {
                displayName = `Creating: ${t.tokenTemplate.name}`;
                displayColors = t.tokenTemplate.colors || [];
            }

            return {
                id: `${Date.now()}-${Math.random()}-${performance.now()}-${index}`,
                sourceName: displayName,
                sourceColors: displayColors,
                sourceId: t.source.id,
                description: desc,
                triggerType: type,
                trigger: t.trigger,
                triggerObj: t,
                timestamp: Date.now()
            };
        });

        setAbilityStack(newStackItems);

    }, [cards, abilityStack, logAction, saveHistoryState]);

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
        redo,
        future,
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
