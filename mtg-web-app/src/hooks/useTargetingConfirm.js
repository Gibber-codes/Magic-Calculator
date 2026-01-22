import { useCallback } from 'react';
import { isCreature, isLand } from '../utils/cardUtils';

/**
 * Hook for targeting confirmation and eligibility logic
 * Extracts targeting-related handlers from App.jsx
 */
const useTargetingConfirm = ({
    // Game State
    cards,
    setCards,
    gameEngineRef,
    logAction,
    addToStack,
    abilityStack,
    resolveStackAbility,
    recentCards,

    // Targeting
    targetingMode,
    setTargetingMode,
    startTargetingMode,
    cancelTargeting,
    handleConfirmAttackers,
    advanceCombatStep // New dependency
}) => {

    // Resolve ability that requires targeting
    const handleResolveWithTargeting = useCallback((ability) => {
        const result = resolveStackAbility(ability, cards, startTargetingMode);

        if (result && result.needsTargeting) {
            const sourceCard = cards.find(c => c.id === ability.sourceId);
            if (!sourceCard) return;

            const abilityDef = ability.triggerObj.ability;
            const targetSpec = abilityDef.target || 'creature';

            let targetType = 'permanent';
            if (targetSpec.includes('creature')) {
                targetType = 'creature';
            } else if (targetSpec.includes('nonland_permanent') || targetSpec.includes('nonland')) {
                targetType = 'nonland_permanent';
            }

            startTargetingMode({
                sourceId: null,
                action: 'resolve-trigger',
                mode: 'single',
                data: {
                    stackAbility: ability,
                    targetType: targetType,
                    targetSpec: targetSpec,
                    sourceCard: sourceCard
                }
            });
        }
    }, [cards, resolveStackAbility, startTargetingMode]);

    // Unified Eligibility Check
    const isCardEligible = useCallback((c) => {
        if (!targetingMode.active) return false;
        if (targetingMode.sourceId === c.id) return false;

        if (targetingMode.action === 'declare-attackers') {
            const isCreatureCard = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature'));
            return isCreatureCard && !c.tapped;
        }

        if (targetingMode.action === 'declare-blockers') {
            const isCreatureCard = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature'));
            // Simply select any attacking creature
            return isCreatureCard && c.attacking;
        }

        if (targetingMode.action === 'equip') return c.type === 'Creature';

        if (targetingMode.action === 'activate-ability' || targetingMode.action === 'resolve-trigger') {
            const targetType = targetingMode.data?.targetType || 'creature';
            const targetSpec = targetingMode.data?.targetSpec || '';
            const abilityTarget = targetingMode.data?.target || '';

            // Handle nonland permanent targeting
            if (targetType === 'nonland_permanent' || targetSpec.includes('nonland') || abilityTarget.includes('nonland')) {
                const isLandCard = c.type_line?.toLowerCase().includes('land');
                return !isLandCard;
            }

            // Handle creature targeting
            if (targetType.toLowerCase() === 'creature' || abilityTarget.includes('creature')) {
                const isCreatureCard = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')) || c.isToken;

                if (targetingMode.action === 'resolve-trigger') {
                    const stackAbilityTarget = targetingMode.data?.stackAbility?.triggerObj?.ability?.target || '';
                    if (stackAbilityTarget.includes('attacking')) {
                        const excludeSource = stackAbilityTarget.includes('another');
                        const sourceId = targetingMode.data?.stackAbility?.sourceId;
                        if (excludeSource && sourceId && c.id === sourceId) {
                            return false;
                        }
                        return isCreatureCard && c.attacking;
                    }
                }

                const excludeSource = abilityTarget.includes('another') || targetSpec.includes('another');
                const sourceId = targetingMode.sourceId || targetingMode.data?.sourceCard?.id;
                if (excludeSource && sourceId && c.id === sourceId) {
                    return false;
                }
                return isCreatureCard;
            }
            return true;
        }

        if (targetingMode.action === 'enchant') {
            const auraTarget = targetingMode.data?.auraTarget;
            if (!auraTarget || auraTarget.includes('permanent')) return true;
            if (auraTarget.includes('creature')) return isCreature(c);
            if (auraTarget.includes('land')) return isLand(c);
            if (auraTarget.includes('planeswalker')) return c.type_line?.toLowerCase().includes('planeswalker');
            return true;
        }

        if (targetingMode.action === 'remove-to-zone') return true;
        return false;
    }, [targetingMode]);

    // Handle targeting confirmation
    const handleConfirmTargetingAction = useCallback(() => {
        if (!targetingMode.active) return;

        if (targetingMode.action === 'declare-attackers') {
            const hasTriggers = handleConfirmAttackers();
            // Only auto-advance if NO triggers were added to the stack.
            // If triggers exist, user must resolve them first.
            if (!hasTriggers && advanceCombatStep) {
                setTimeout(() => advanceCombatStep(), 300);
            } else if (hasTriggers) {
                logAction("Resolve triggers before declaring blockers.");
            }
        } else if (targetingMode.action === 'declare-blockers') {
            const blockedIds = targetingMode.selectedIds;

            if (blockedIds.length > 0) {
                setCards(prev => prev.map(c => {
                    if (blockedIds.includes(c.id)) {
                        return { ...c, isBlocked: true };
                    }
                    return c;
                }));
                logAction(`Marked ${blockedIds.length} attackers as blocked.`);
            } else {
                logAction("No attackers marked as blocked.");
            }

            // Clear targeting
            cancelTargeting();

            // Auto-advance to Next Step (Combat Damage) - Pass updated cards to prevent stale closure
            if (advanceCombatStep) setTimeout(() => {
                let currentCards = cards;
                if (blockedIds.length > 0) {
                    currentCards = cards.map(c => {
                        if (blockedIds.includes(c.id)) {
                            return { ...c, isBlocked: true };
                        }
                        return c;
                    });
                }
                advanceCombatStep(currentCards);
            }, 150);

        } else if (targetingMode.action === 'resolve-trigger') {
            const topAbility = abilityStack[abilityStack.length - 1];
            if (topAbility) {
                // 1. Capture variables and position before we clear state
                const targets = targetingMode.selectedIds.map(id => cards.find(c => c.id === id));
                const currentAbilityStack = [...abilityStack];
                const stackEl = document.getElementById(`stack-item-${topAbility.id}`);
                const stackRect = stackEl ? stackEl.getBoundingClientRect() : null;
                const spawnPos = stackRect ? { x: stackRect.left, y: stackRect.top } : null;

                // 2. Clear targeting UI immediately
                cancelTargeting();

                // 3. Resolve after delay so battlefield returns to normal first
                setTimeout(() => {
                    resolveStackAbility(topAbility, cards, startTargetingMode, targets, spawnPos);

                    const nextAbility = currentAbilityStack.length > 1 ? currentAbilityStack[currentAbilityStack.length - 2] : null;

                    if (nextAbility) {
                        const abilityDef = nextAbility.triggerObj?.ability;
                        const explicitRequired = abilityDef?.requiresTarget;

                        if (explicitRequired) {
                            const targetSpec = abilityDef.target || '';
                            let targetType = 'permanent';
                            if (targetSpec.includes('creature')) {
                                targetType = 'creature';
                            } else if (targetSpec.includes('nonland_permanent') || targetSpec.includes('nonland')) {
                                targetType = 'nonland_permanent';
                            }

                            setTargetingMode({
                                active: true,
                                sourceId: null,
                                action: 'resolve-trigger',
                                mode: 'single',
                                selectedIds: [],
                                data: {
                                    stackAbility: nextAbility,
                                    targetType: targetType,
                                    targetSpec: targetSpec,
                                    sourceCard: cards.find(c => c.id === nextAbility.sourceId)
                                }
                            });
                        }
                    }
                }, 500);
            }
        } else if (targetingMode.action === 'activate-ability') {
            // 1. Capture variables and position
            const targetId = targetingMode.selectedIds[0];
            const targetCard = cards.find(c => c.id === targetId);
            const sourceCard = cards.find(c => c.id === targetingMode.sourceId);
            const abilityDef = targetingMode.data;
            const topAbility = abilityStack[abilityStack.length - 1]; // Current top item
            const stackEl = topAbility ? document.getElementById(`stack-item-${topAbility.id}`) : null;
            const stackRect = stackEl ? stackEl.getBoundingClientRect() : null;
            const spawnPos = stackRect ? { x: stackRect.left, y: stackRect.top } : null;

            // 2. Clear targeting immediately
            cancelTargeting();

            if (targetCard && sourceCard && abilityDef && gameEngineRef.current) {
                // 3. Resolve after delay
                setTimeout(() => {
                    if (abilityDef.effect === 'attach' || abilityDef.effect === 'equip' || abilityDef.isEquip) {
                        logAction(`Equipped ${sourceCard.name} to ${targetCard.name}`);
                        setCards(prev => prev.map(c => {
                            if (c.id === sourceCard.id) {
                                return { ...c, attachedTo: targetCard.id, zone: 'attached' };
                            }
                            return c;
                        }));
                    } else {
                        const desc = abilityDef.description || 'Activated Ability';
                        const abilityWithTarget = { ...abilityDef, targetIds: [targetCard.id] };

                        try {
                            const triggerObj = gameEngineRef.current.resolveEffect({
                                source: sourceCard,
                                ability: abilityWithTarget
                            });
                            const result = triggerObj.execute(cards, recentCards);
                            let newCards = result.newCards || result;
                            const triggers = result.triggers || [];

                            // Tag new cards with spawn position
                            if (spawnPos) {
                                const oldIds = new Set(cards.map(c => c.id));
                                const taggedCards = newCards.filter(c => !oldIds.has(c.id));
                                const newCardsCount = taggedCards.length;

                                // MEGA-SWARM CONFIG:
                                const VISUAL_CAP = 50;
                                const TIME_CAP = 4000;

                                const visualStep = Math.max(1, Math.floor(newCardsCount / VISUAL_CAP));
                                const staggerDelay = Math.min(200, TIME_CAP / Math.max(1, newCardsCount));

                                let newIndex = 0;
                                newCards = newCards.map(c => {
                                    const isExisting = oldIds.has(c.id);

                                    // CLEANUP: Strip animation tags from EXISTING cards
                                    if (isExisting && (c.spawnSourcePos || c.spawnDelay)) {
                                        const { spawnSourcePos, spawnDelay, isNewToken, flightDuration, ...rest } = c;
                                        return rest;
                                    }

                                    if (!isExisting) {
                                        const currentIndex = newIndex++;
                                        const isWithinVisualCap = (currentIndex % visualStep === 0) && (currentIndex / visualStep < VISUAL_CAP);

                                        return {
                                            ...c,
                                            spawnSourcePos: isWithinVisualCap ? spawnPos : null,
                                            spawnDelay: currentIndex * staggerDelay,
                                            flightDuration: 1000,
                                            isNewToken: true
                                        };
                                    }
                                    return c;
                                });

                                if (newCardsCount > VISUAL_CAP) {
                                    console.log(`[MegaSwarm] Targeting: Distributed ${VISUAL_CAP} flights across ${newCardsCount} cards. Stagger: ${staggerDelay.toFixed(1)}ms`);
                                }
                            }

                            setCards(newCards);
                            logAction(`Activated: ${desc}`);

                            triggers.forEach(t => {
                                const tDesc = t.description || t.ability?.description || 'Triggered Ability';
                                addToStack(t.source, tDesc, 'trigger', t);
                            });

                        } catch (e) {
                            console.error("Failed to resolve ability:", e);
                            logAction(`Error activating ability: ${e.message}`);
                        }
                    }
                }, 500);
            }
        } else if (targetingMode.action === 'enchant') {
            const targetId = targetingMode.selectedIds[0];
            const targetCard = cards.find(c => c.id === targetId);
            const sourceCard = cards.find(c => c.id === targetingMode.sourceId);

            if (targetCard && sourceCard) {
                logAction(`Enchanted ${targetCard.name} with ${sourceCard.name}`);
                setCards(prev => prev.map(c => {
                    if (c.id === sourceCard.id) {
                        return { ...c, attachedTo: targetCard.id, zone: 'attached' };
                    }
                    return c;
                }));
                cancelTargeting();
            }
        } else if (targetingMode.action === 'remove-to-zone') {
            const targetId = targetingMode.selectedIds[0];
            const targetCard = cards.find(c => c.id === targetId);
            const zone = targetingMode.data?.zone || 'graveyard';

            if (targetCard) {
                const result = gameEngineRef.current.processAction('delete', targetCard, cards);
                setCards(result.newCards);
                logAction(`Moved ${targetCard.name} to ${zone}`);
                cancelTargeting();
            }
        }
    }, [
        targetingMode,
        cards,
        setCards,
        abilityStack,
        gameEngineRef,
        recentCards,
        logAction,
        addToStack,
        resolveStackAbility,
        startTargetingMode,
        setTargetingMode,
        cancelTargeting,
        handleConfirmAttackers
    ]);

    return {
        handleResolveWithTargeting,
        isCardEligible,
        handleConfirmTargetingAction
    };
};

export default useTargetingConfirm;
