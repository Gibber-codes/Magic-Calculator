import { useState, useCallback } from 'react';
import { createBattlefieldCard } from '../utils/cardUtils';

/**
 * Custom hook for managing targeting mode and multi-select/stack selection.
 * @param {Object} gameState - The game state object from useGameState
 */
const useTargetingMode = (gameState) => {
    const {
        cards,
        setCards,
        logAction,
        saveHistoryState,
        gameEngineRef,
        addToStack,
        setCurrentCombatStep,
        setAbilityStack,
        setCurrentPhase
    } = gameState;

    // --- Targeting Mode State ---
    const [targetingMode, setTargetingMode] = useState({
        active: false,
        sourceId: null,
        action: null,
        mode: 'single', // 'single' | 'multiple'
        selectedIds: [],
        data: null // Generic data payload (e.g. ability definition)
    });

    // --- Actions ---

    const cancelTargeting = useCallback(() => {
        setTargetingMode({ active: false, sourceId: null, action: null, mode: 'single', selectedIds: [], data: null });
    }, []);

    const startTargetingMode = useCallback((options) => {
        setTargetingMode({
            active: true,
            sourceId: options.sourceId || null,
            action: options.action,
            mode: options.mode || 'single',
            selectedIds: options.selectedIds || [],
            data: options.data || null
        });
    }, []);

    const handleZoneSelection = useCallback((zone) => {
        if (!targetingMode.active || targetingMode.action !== 'remove-to-zone') return;

        const sourceCard = cards.find(c => c.id === targetingMode.sourceId);
        if (!sourceCard) return;

        logAction(`${sourceCard.name} sent to ${zone}`);

        setCards(prev => prev.map(c => {
            if (c.id === sourceCard.id) {
                return { ...c, zone: zone, attachedTo: null };
            }
            if (c.attachedTo === sourceCard.id) {
                return { ...c, attachedTo: null, zone: 'battlefield' };
            }
            return c;
        }));

        cancelTargeting();
    }, [targetingMode, cards, logAction, setCards, cancelTargeting]);

    const handleTargetSelection = useCallback((targetCard) => {
        if (!targetingMode.active) return;
        if (targetingMode.sourceId === targetCard.id) return;

        const sourceCard = cards.find(c => c.id === targetingMode.sourceId);

        if (targetingMode.action === 'equip') {
            logAction(`Equipped ${sourceCard?.name} to ${targetCard.name}`);

            setCards(prev => prev.map(c => {
                if (c.id === sourceCard.id) {
                    return { ...c, attachedTo: targetCard.id, zone: 'attached' };
                }
                return c;
            }));
            cancelTargeting();
        } else if (targetingMode.action === 'enchant') {
            const auraDef = targetingMode.data;
            logAction(`Enchanted ${targetCard.name} with ${auraDef.name}`);

            const newAura = createBattlefieldCard(auraDef, {
                attachedTo: targetCard.id,
                zone: 'attached'
            }, { cards, gameEngineRef });

            setCards(prev => [...prev, newAura]);
            saveHistoryState([...cards, newAura]);

            // Process ETB for Aura?
            if (gameEngineRef.current) {
                const etbTriggers = gameEngineRef.current.processEntersBattlefield(newAura);
                etbTriggers.forEach(t => {
                    const description = t.ability.description || `When ${t.source.name} enters: ${t.ability.effect}`;
                    addToStack(t.source, description, t.ability.trigger || 'on_enter_battlefield', t);
                });
            }
            cancelTargeting();
        } else if (targetingMode.action === 'activate-ability') {
            const abilityDef = targetingMode.data;

            // Special handling for equip/attach effects
            // logic moved to App.jsx onConfirm
            setTargetingMode(prev => ({ ...prev, selectedIds: [targetCard.id] }));
        } else if (targetingMode.action === 'resolve-trigger') {
            // Just select the target. Resolution happens in App.jsx onConfirm.
            setTargetingMode(prev => ({ ...prev, selectedIds: [targetCard.id] }));
        }

    }, [targetingMode, cards, logAction, setCards, cancelTargeting, gameEngineRef, addToStack]);

    const handleMultiSelect = useCallback((card, visibleStacks) => {
        if (targetingMode.action === 'declare-attackers') {
            const isCreature = card.type === 'Creature' || (card.type_line && card.type_line.includes('Creature'));
            if (!isCreature) return;
            if (card.tapped) return;

            // Single card click behavior (toggle 1)
            setTargetingMode(prev => {
                const exists = prev.selectedIds.includes(card.id);
                // If it's part of a stack, we might want to smarter toggle?
                // For now, simple toggle of the specific card clicked (leader)
                const newIds = exists
                    ? prev.selectedIds.filter(id => id !== card.id)
                    : [...prev.selectedIds, card.id];
                return { ...prev, selectedIds: newIds };
            });
        }
    }, [targetingMode]);

    const updateStackSelection = useCallback((stackCards, count) => {
        if (targetingMode.action !== 'declare-attackers') return;

        const stackIds = stackCards.map(c => c.id);
        const otherSelectedIds = targetingMode.selectedIds.filter(id => !stackIds.includes(id));
        const newStackSelection = stackIds.slice(0, count);

        setTargetingMode(prev => ({
            ...prev,
            selectedIds: [...otherSelectedIds, ...newStackSelection]
        }));
    }, [targetingMode.selectedIds, targetingMode.action]);

    const handleToggleSelectAll = useCallback(() => {
        if (targetingMode.action !== 'declare-attackers') return;

        // Find all eligible attackers (untapped creatures on battlefield)
        const eligibleAttackers = cards.filter(c =>
            c.zone === 'battlefield' &&
            !c.tapped &&
            (c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')))
        );
        const eligibleIds = eligibleAttackers.map(c => c.id);

        setTargetingMode(prev => {
            // Check if all eligible are already selected
            const allSelected = eligibleIds.length > 0 && eligibleIds.every(id => prev.selectedIds.includes(id));

            if (allSelected) {
                // Clear all attackers
                return { ...prev, selectedIds: [] };
            } else {
                // Select all eligible
                return { ...prev, selectedIds: eligibleIds };
            }
        });
    }, [targetingMode.action, cards]);

    const handleConfirmAttackers = useCallback(() => {
        const attackers = cards.filter(c => targetingMode.selectedIds.includes(c.id));
        const attackerIds = attackers.map(c => c.id);

        // Save state before modifying
        saveHistoryState(cards);

        setCards(prev => prev.map(c => {
            if (attackerIds.includes(c.id)) {
                // Check for Vigilance
                const isVigilance = c.type_line?.toLowerCase().includes('vigilance') ||
                    c.oracle_text?.toLowerCase().includes('vigilance') ||
                    (c.abilities && c.abilities.some(a => a.keyword === 'vigilance'));

                return { ...c, tapped: !isVigilance, attacking: true };
            }
            return c;
        }));

        // Process attack triggers
        if (gameEngineRef.current) {
            console.log(`[Confirm] Processing attack triggers for:`, attackerIds);
            const triggers = gameEngineRef.current.processAttackDeclaration(attackerIds);
            console.log(`[Confirm] Triggers found:`, triggers.length);

            triggers.forEach(t => {
                const description = t.ability.description ||
                    `Whenever ${t.source.name} attacks: ${t.ability.effect}`;
                addToStack(t.source, description, 'on_attack', t);
            });
        }

        logAction(`Declared ${attackers.length} attackers`);
        cancelTargeting();

        // Advance to Main Phase 2 after declaring attackers
        setCurrentPhase('Main 2');
        setCurrentCombatStep(null);
    }, [cards, targetingMode.selectedIds, saveHistoryState, setCards, gameEngineRef, addToStack, logAction, cancelTargeting, setCurrentPhase, setCurrentCombatStep]);

    return {
        // State
        targetingMode,
        setTargetingMode,

        // Actions
        startTargetingMode,
        cancelTargeting,
        handleZoneSelection,
        handleTargetSelection,
        handleMultiSelect,
        handleToggleSelectAll,
        updateStackSelection,
        handleConfirmAttackers
    };
};

export default useTargetingMode;
