import { useState, useCallback } from 'react';

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
        setCurrentCombatStep
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
        } else if (targetingMode.action === 'activate-ability') {
            const abilityDef = targetingMode.data;
            if (abilityDef && gameEngineRef.current) {
                // Determine effect description
                const desc = abilityDef.description || 'Activated Ability';

                // Construct ability object with PRE-SELECTED TARGETS
                const abilityWithTarget = {
                    ...abilityDef,
                    targetIds: [targetCard.id] // Explicitly set the target ID we just picked
                };

                try {
                    const triggerObj = gameEngineRef.current.resolveEffect({
                        source: sourceCard,
                        ability: abilityWithTarget
                    });

                    addToStack(sourceCard, `Activated: ${desc}`, 'activated', triggerObj);
                } catch (e) {
                    console.error("Failed to resolve manual ability:", e);
                }
            }
        }

        cancelTargeting();
    }, [targetingMode, cards, logAction, setCards, cancelTargeting]);

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

                return isVigilance ? c : { ...c, tapped: true };
            }
            return c;
        }));

        // Process attack triggers
        if (gameEngineRef.current) {
            const triggers = gameEngineRef.current.processAttackDeclaration(attackerIds);
            triggers.forEach(t => {
                const description = t.ability.description ||
                    `Whenever ${t.source.name} attacks: ${t.ability.effect}`;
                addToStack(t.source, description, 'on_attack', t);
            });
        }

        logAction(`Declared ${attackers.length} attackers`);
        cancelTargeting();
    }, [cards, targetingMode.selectedIds, saveHistoryState, setCards, gameEngineRef, addToStack, logAction, cancelTargeting]);

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
        updateStackSelection,
        handleConfirmAttackers
    };
};

export default useTargetingMode;
