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
    cardPositions
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

    return {
        // Phase State
        passingPhase,

        // Phase Handlers
        handlePhaseChange,
        handleSmartPhaseAdvance,
        handleStartTurn,
        advanceCombatStep,
        advancePhase
    };
};

export default usePhaseHandlers;
