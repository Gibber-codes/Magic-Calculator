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
    }, [logAction]);

    // --- Ability Stack Management ---

    const addToStack = useCallback((sourceCard, description, triggerType = null, triggerObj = null) => {
        let detectedType = triggerType;
        if (!detectedType && description) {
            const lowerDesc = description.toLowerCase();
            if (lowerDesc.startsWith('at ') || lowerDesc.includes('at the beginning')) {
                detectedType = 'at';
            } else if (lowerDesc.startsWith('whenever ')) {
                detectedType = 'whenever';
            } else if (lowerDesc.startsWith('when ')) {
                detectedType = 'when';
            } else {
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
            triggerObj: triggerObj,
            timestamp: Date.now()
        };

        setAbilityStack(prev => [...prev, newAbility]);
        logAction(`Triggered: ${sourceCard.name} - ${description}`);
    }, [logAction]);

    const resolveStackAbility = useCallback((ability, recentCards = []) => {
        if (ability.triggerObj && ability.triggerObj.execute) {
            const updatedCards = ability.triggerObj.execute(cards, recentCards);
            logAction(ability.triggerObj.log?.description || `Resolved: ${ability.sourceName} - ${ability.description}`);
            saveHistoryState(updatedCards);
        } else {
            logAction(`Resolved: ${ability.sourceName} - ${ability.description}`);
        }
        setAbilityStack(prev => prev.filter(a => a.id !== ability.id));
    }, [cards, logAction, saveHistoryState]);

    const removeFromStack = useCallback((ability) => {
        logAction(`Removed from stack: ${ability.sourceName}`);
        setAbilityStack(prev => prev.filter(a => a.id !== ability.id));
    }, [logAction]);

    const resolveAllStack = useCallback((recentCards = []) => {
        let currentCards = [...cards];
        abilityStack.forEach(ability => {
            if (ability.triggerObj && ability.triggerObj.execute) {
                currentCards = ability.triggerObj.execute(currentCards, recentCards);
                logAction(ability.triggerObj.log?.description || `Resolved: ${ability.sourceName}`);
            } else {
                logAction(`Resolved: ${ability.sourceName} - ${ability.description}`);
            }
        });
        if (abilityStack.some(a => a.triggerObj)) {
            saveHistoryState(currentCards);
        }
        setAbilityStack([]);
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
