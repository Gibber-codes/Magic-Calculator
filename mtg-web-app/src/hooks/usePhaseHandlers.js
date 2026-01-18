import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for phase-related game handlers
 * Extracts phase change, smart advance, and turn start logic from App.jsx
 * 
 * @param {Object} params - Dependencies from App.jsx
 * @param {Object} params.gameState - Game state from useGameState hook
 * @param {Object} params.targeting - Targeting state from useTargetingMode hook
 * @param {Array} params.cards - Current card array
 * @param {Function} params.setCards - Card state setter
 * @param {Object} params.cardPositions - Card position map for trigger sorting
 * @returns {Object} Phase handler functions and state
 */
const usePhaseHandlers = ({
    gameState,
    targeting,
    cards,
    setCards,
    cardPositions,
    setHasEndStepActions
}) => {
    // Destructure what we need from gameState
    const {
        currentPhase,
        abilityStack,
        logAction,
        addToStack,
        handlePhaseChange: baseHandlePhaseChange,
        advanceCombatStep: baseAdvanceCombatStep,
        advancePhase: baseAdvancePhase,
        endTurn
    } = gameState;

    // Destructure targeting
    const { targetingMode, setTargetingMode } = targeting;

    // Local state for phase animation
    const [passingPhase, setPassingPhase] = useState(null);
    const pendingPhasePassRef = useRef(null);

    // Wrap phase change to add triggers to stack with position sorting
    // Returns true if triggers were added to the stack
    const handlePhaseChange = useCallback((phase) => {
        const triggers = baseHandlePhaseChange(phase, cardPositions);
        if (triggers && triggers.length > 0) {
            // Sort triggers by battlefield position
            const sortedTriggers = [...triggers].sort((a, b) => {
                const aAttachedTo = a.source.attachedTo;
                const bAttachedTo = b.source.attachedTo;
                const posA = aAttachedTo ? cardPositions[aAttachedTo] : cardPositions[a.source.id];
                const posB = bAttachedTo ? cardPositions[bAttachedTo] : cardPositions[b.source.id];
                if (!posA || !posB) return 0;
                const samePosition = Math.abs(posA.x - posB.x) < 5 && Math.abs(posA.y - posB.y) < 5;
                if (samePosition) {
                    if (aAttachedTo && !bAttachedTo) return 1;
                    if (!aAttachedTo && bAttachedTo) return -1;
                    return 0;
                }
                return posB.x - posA.x;
            });

            const triggersToAdd = sortedTriggers;

            triggersToAdd.forEach(t => {
                const description = t.ability?.description ||
                    `At the beginning of combat: ${t.ability?.effect || 'triggered ability'}`;
                addToStack(t.source, description, 'at', t);
            });
            return true;
        }
        return false;
    }, [baseHandlePhaseChange, cardPositions, cards, setCards, logAction, addToStack]);

    // Smart Phase Advance (Game Flow Button)
    const handleSmartPhaseAdvance = useCallback(() => {
        if (abilityStack && abilityStack.length > 0) {
            logAction(`Must resolve ${abilityStack.length} item(s) on the stack first!`);
            return;
        }

        if (!currentPhase) {
            handlePhaseChange('Main');
            return;
        }

        if (currentPhase === 'Beginning') {
            handlePhaseChange('Main');
        } else if (currentPhase === 'Main') {
            handlePhaseChange('Combat');
        } else if (currentPhase === 'Combat') {
            if (!targetingMode.active) {
                setTargetingMode({
                    active: true,
                    mode: 'multiple',
                    action: 'declare-attackers',
                    sourceId: null,
                    selectedIds: []
                });
                logAction("Select creatures to attack, then Confirm.");
            } else {
                handlePhaseChange('Main 2');
            }
        } else if (currentPhase === 'Main 2') {
            endTurn();
        }
    }, [abilityStack, currentPhase, handlePhaseChange, targetingMode.active, setTargetingMode, logAction, endTurn]);

    // Animate through phase steps
    const startPhasePassAnimation = useCallback((steps, startIndex) => {
        let stepIndex = startIndex;
        setPassingPhase(steps[stepIndex] || 'Beginning');

        const animateSteps = () => {
            if (stepIndex < steps.length) {
                setPassingPhase(steps[stepIndex]);
                stepIndex++;
                setTimeout(animateSteps, 200);
            } else {
                setPassingPhase(null);
                pendingPhasePassRef.current = null;
                handlePhaseChange('Main');
            }
        };

        setTimeout(animateSteps, 100);
    }, [handlePhaseChange]);

    // Handle Start Turn
    const handleStartTurn = useCallback(() => {
        setCards(prev => prev.map(c => ({
            ...c,
            attacking: false
        })));

        const hadTriggers = handlePhaseChange('Beginning');
        const beginningSteps = ['Untap', 'Upkeep', 'Draw'];

        if (hadTriggers) {
            setPassingPhase('Beginning');
            pendingPhasePassRef.current = { steps: beginningSteps, stepIndex: 0 };
            return;
        }

        startPhasePassAnimation(beginningSteps, 0);
    }, [setCards, handlePhaseChange, startPhasePassAnimation]);

    // Effect: Resume phase passing when stack becomes empty
    useEffect(() => {
        if (pendingPhasePassRef.current && abilityStack.length === 0) {
            const { steps, stepIndex } = pendingPhasePassRef.current;
            pendingPhasePassRef.current = null;

            setTimeout(() => {
                startPhasePassAnimation(steps, stepIndex);
            }, 300);
        }
    }, [abilityStack.length, startPhasePassAnimation]);

    // Wrap advanceCombatStep
    const advanceCombatStep = useCallback(() => {
        const result = baseAdvanceCombatStep();
        if (result.shouldDeclareAttackers) {
            setTargetingMode({
                active: true,
                mode: 'multiple',
                action: 'declare-attackers',
                sourceId: null,
                selectedIds: []
            });
            logAction("Select creatures to attack, then Confirm.");
        } else if (result.shouldAdvancePhase) {
            const nextPhase = baseAdvancePhase();
            if (nextPhase) {
                handlePhaseChange(nextPhase);
            }
        }
    }, [baseAdvanceCombatStep, baseAdvancePhase, setTargetingMode, logAction, handlePhaseChange]);

    // Wrap advancePhase
    const advancePhase = useCallback(() => {
        const nextPhase = baseAdvancePhase();
        if (nextPhase) {
            handlePhaseChange(nextPhase);
        }
    }, [baseAdvancePhase, handlePhaseChange]);

    // Automatic Calculations Mode Logic
    const handleAutoCalculate = useCallback(() => {
        // Logic:
        // 1. Untap/Upkeep/Draw (Beginning)
        // 2. Pre-Combat Main (Main)
        // 3. Combat Steps (Combat)
        // 4. Post-Combat Main (Main 2) - STOP HERE based on requirements

        // We can re-use handlePhaseChange to generate triggers for each phase
        // BUT we need to be careful about state updates (setCards) happening multiple times in one event loop
        // Ideally, gameEngine should support simulating a full turn sequence

        // SIMPLIFIED APPROACH:
        // Trigger 'Beginning', 'Main', 'Combat', 'Main 2' sequentially and collect all triggers.
        // Then push them all to the stack.
        // Finally set UI phase to 'Main 2'.

        logAction("Running Auto-Calculation...");

        const phasesToRun = ['beginning', 'main', 'combat', 'main 2'];
        let allTriggers = [];

        // We need to use a temporary copy of cards to simulate the progression through phases
        // so that later phases see the state changes from earlier ones (e.g. untapping)
        // However, usePhaseHandlers relies on `baseHandlePhaseChange` which calls engine functions that return triggers.
        // Those engine functions might assume they are working on the *current* cards.

        // Let's use gameEngineRef directly if possible for cleaner simulation
        if (!gameState.gameEngineRef.current) return;

        const engine = gameState.gameEngineRef.current;
        let currentSimulatedCards = [...cards]; // Start with current state

        // 1. Phase: Beginning (Untap is handled inside processPhaseChange('beginning'))
        // Note: engine.processPhaseChange returns triggers. It might NOT return the *new card state* if it's just checking for triggers.
        // Actually, looking at usePhaseHandlers, `handlePhaseChange` calls `baseHandlePhaseChange` which calls `engine.processPhaseChange`.
        // And `handleStartTurn` manually calls `setCards` to clear attacking/etc.

        // Let's replicate `handleStartTurn` cleanup first
        currentSimulatedCards = currentSimulatedCards.map(c => ({
            ...c,
            attacking: false,
            tapped: false // Untap all (part of Beginning usually, but we do it explicitly here for safety)
        }));

        phasesToRun.forEach(phase => {
            // Get triggers for this phase
            const phaseTriggers = engine.processPhaseChange(phase, true);
            if (phaseTriggers && phaseTriggers.length > 0) {
                allTriggers = [...allTriggers, ...phaseTriggers];
            }
        });

        // Update global card state (mainly untapping and cleanup)
        setCards(currentSimulatedCards);

        // Add collected triggers to stack
        if (allTriggers.length > 0) {
            // Sort all collected triggers by position (optional, but good for UX)
            // Reuse the existing sorting logic if we can, or just dump them
            const sortedTriggers = [...allTriggers].sort((a, b) => {
                const posA = cardPositions[a.source.id];
                const posB = cardPositions[b.source.id];
                if (!posA || !posB) return 0;
                return posB.x - posA.x; // Right-to-Left priority
            });

            sortedTriggers.forEach(t => {
                const description = t.ability?.description || `${t.source.name} triggered`; // Generic fallbacks
                addToStack(t.source, description, 'at', t);
            });
        } else {
            logAction("Auto-Calc: No triggers found.");
        }

        // Check if Clean Up is needed (End Step Triggers)
        const needsCleanup = engine && typeof engine.checkPendingTriggers === 'function'
            ? engine.checkPendingTriggers('end')
            : false;

        if (setHasEndStepActions) {
            setHasEndStepActions(needsCleanup);
        }

        if (needsCleanup) {
            // Set final state to 'Main 2' so the "Clean Up" button appears
            if (gameState.setCurrentPhase) {
                gameState.setCurrentPhase('Main 2');
            }
            logAction("End Step actions detected. Use 'Clean Up' to resolve.");
        } else {
            // No cleanup needed? End turn automatically to avoid redundant clicks
            logAction("No end-step actions. Closing turn.");
            endTurn();
        }
    }, [cards, setCards, addToStack, logAction, gameState, cardPositions, setHasEndStepActions, endTurn]);

    return {
        // Phase State
        passingPhase,

        // Phase Handlers
        handlePhaseChange,
        handleSmartPhaseAdvance,
        handleStartTurn,
        advanceCombatStep,
        advancePhase,
        handleAutoCalculate // Export new handler
    };
};

export default usePhaseHandlers;
