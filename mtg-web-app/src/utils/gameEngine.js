/**
 * MTG Game Engine
 * Handles phase management, triggered abilities, and replacement effects
 */
import { calculateCardStats } from './cardUtils';
import localCardData from '../data/scryfall_cards.json';
import { SIGNATURE_DATA } from '../data/signatureCards';

export class GameEngine {
    constructor(cards) {
        this.cards = cards || [];
        this.currentPhase = null;
        this.delayedTriggers = []; // Store triggers that happen at a later phase
    }

    /**
     * Update the battlefield state
     */
    updateBattlefield(cards) {
        this.cards = cards || [];
    }

    /**
     * Process a phase change and return all triggered effects
     * The returned array is ordered in battlefield order (by id).
     * Each trigger's execute(cards) recomputes values at RESOLUTION time,
     * so multiple Ouroboroids stack correctly.
     */
    processPhaseChange(phase, playerTurn = true) {
        this.currentPhase = phase;

        // 1. Standard Phase Triggers
        const standardTriggers = this.findTriggersForPhase(phase, playerTurn);

        // 2. Delayed Triggers (e.g. "at the beginning of the next end step")
        const delayed = this.processDelayedTriggers(phase);

        // Combine and Return
        const allTriggers = [...standardTriggers, ...delayed];
        return allTriggers.map(trigger => this.resolveEffect(trigger));
    }

    /**
     * Register a delayed trigger for a future phase (one-shot)
     */
    registerDelayedTrigger(triggerDef) {
        // triggerDef: { phase: 'end_step', effect: 'sacrifice', targets: [ids], sourceId: ... }
        this.delayedTriggers.push(triggerDef);
    }

    /**
     * Check and retrieve delayed triggers for the current phase 
     * Removes them from the storage (they are one-shot)
     */
    processDelayedTriggers(phase) {
        const triggerMap = {
            beginning: 'beginning_step',
            combat: 'beginning_of_combat',
            main: 'main_phase',
            'Main 2': 'main_phase',
            end: 'end_step',
            'End': 'end_step', // Support capital E from phase names
        };
        const currentTriggerType = triggerMap[phase];
        if (!currentTriggerType) return [];

        const matching = [];
        const remaining = [];

        this.delayedTriggers.forEach(dt => {
            if (dt.phase === currentTriggerType) {
                // Convert to actionable trigger format
                // finding source card again in case it changed but ID is key
                const source = this.cards.find(c => c.id === dt.sourceId) || { id: dt.sourceId, name: 'Delayed Source' };

                matching.push({
                    source: source,
                    ability: {
                        trigger: currentTriggerType,
                        effect: dt.effect,
                        targetIds: dt.targets, // specific IDs to target
                        description: dt.description || 'Delayed Trigger'
                    }
                });
            } else {
                remaining.push(dt);
            }
        });

        this.delayedTriggers = remaining;
        return matching;
    }

    /**
     * Find all triggered abilities that match the current phase
     */
    findTriggersForPhase(phase, playerTurn) {
        const triggers = [];
        const triggerMap = {
            beginning: 'beginning_step',
            combat: 'beginning_of_combat',
            main: 'main_phase',
            'Main 2': 'main_phase',
            end: 'end_step',
        };

        const triggerType = triggerMap[phase];
        if (!triggerType) return triggers;

        this.cards.forEach(card => {
            if (!card.abilities) return;

            card.abilities.forEach(ability => {
                // Check if trigger matches current phase
                if (ability.trigger === triggerType) {
                    // Check turn condition
                    if (ability.condition === 'your_turn' && !playerTurn) return;

                    triggers.push({
                        source: card,
                        ability: ability,
                    });
                }
            });
        });

        // Ensure triggers resolve in priority order:
        // 1. Token Creation (so tokens exist to receive counters)
        // 2. Battlefield order (left→right / oldest id first)
        triggers.sort((a, b) => {
            const aEffect = a.ability.effect || '';
            const bEffect = b.ability.effect || '';
            const aIsToken = aEffect.startsWith('create_token');
            const bIsToken = bEffect.startsWith('create_token');

            if (aIsToken && !bIsToken) return -1;
            if (!aIsToken && bIsToken) return 1;

            const aId = a.source.id ?? 0;
            const bId = b.source.id ?? 0;
            return aId - bId;
        });

        return triggers;
    }

    /**
     * Process an attack declaration
     * Returns triggers caused by these attackers
     */
    processAttackDeclaration(attackerIds) {
        const triggers = this.findAttackTriggers(attackerIds);
        return triggers.map(trigger => this.resolveEffect(trigger));
    }

    /**
     * Find triggers for attack event
     */
    findAttackTriggers(attackerIds) {
        const triggers = [];
        const attackers = this.cards.filter(c => attackerIds.includes(c.id));

        // 1. Check "Whenever this creature attacks" on the attackers themselves
        attackers.forEach(attacker => {
            if (!attacker.abilities) return;
            attacker.abilities.forEach(ability => {
                if (ability.trigger === 'on_attack') {
                    triggers.push({
                        source: attacker,
                        ability: ability
                    });
                }
            });

            // 2. Check for equipment-granted attack triggers
            // Find all equipment attached to this attacker
            const attachedEquipment = this.cards.filter(c => c.attachedTo === attacker.id);
            attachedEquipment.forEach(equipment => {
                if (!equipment.abilities) return;
                equipment.abilities.forEach(ability => {
                    // Check if this is an equipment-granted attack trigger
                    if (ability.trigger === 'on_attack' && ability.grantedBy === 'equipment') {
                        // This ability is granted to the equipped creature
                        triggers.push({
                            source: equipment, // Source is the equipment (for logging)
                            ability: {
                                ...ability,
                                // Override target to use equipped creature for power calculation
                                sourceCreature: attacker,
                                // Pass equipment source for accessing relatedTokens
                                source: equipment
                            }
                        });
                    }
                });
            });
        });

        // 3. Check global "Whenever a creature (you control) attacks"
        // (Not implemented yet, but placeholders would go here)

        return triggers;
    }

    /**
     * Find triggers for when tokens enter the battlefield
     */
    findTokenEntryTriggers(cards, newTokens) {
        if (!newTokens || newTokens.length === 0) return [];

        const triggers = [];
        cards.forEach(card => {
            if (card.zone !== 'battlefield') return;
            if (!card.abilities) return;

            card.abilities.forEach(ability => {
                if (ability.trigger === 'on_token_enter_battlefield') {
                    newTokens.forEach(token => {
                        triggers.push({
                            source: card,
                            ability: ability,
                        });
                    });
                }
            });
        });

        return triggers.map(trigger => this.resolveEffect(trigger));
    }

    /**
     * Find triggers for when lands enter the battlefield
     */
    findLandEntryTriggers(cards, newLands) {
        if (!newLands || newLands.length === 0) return [];

        const triggers = [];
        cards.forEach(card => {
            if (card.zone !== 'battlefield') return;
            if (!card.abilities) return;

            card.abilities.forEach(ability => {
                if (ability.trigger === 'on_land_enter_battlefield') {
                    newLands.forEach(land => {
                        triggers.push({
                            source: card,
                            ability: ability,
                        });
                    });
                }
            });
        });

        return triggers.map(trigger => this.resolveEffect(trigger));
    }

    /**
     * Process Enters the Battlefield triggers for a specific card
     */
    processEntersBattlefield(enteringCard) {
        const triggers = [];
        if (!enteringCard) return [];

        // 1. Check for card's own ETB triggers
        if (enteringCard.abilities) {
            enteringCard.abilities.forEach(ability => {
                if (ability.trigger === 'on_enter_battlefield') {
                    triggers.push({
                        source: enteringCard,
                        ability: ability
                    });
                }
            });
        }

        const ownResults = triggers.map(trigger => this.resolveEffect(trigger));
        let otherResults = [];

        // 2. Check for "When token enters" triggers (Wildwood Mentor) from OTHER cards
        if (enteringCard.isToken) {
            otherResults = [...otherResults, ...this.findTokenEntryTriggers(this.cards, [enteringCard])];
        }

        // 3. Check for Landfall
        const isLand = enteringCard.type_line && enteringCard.type_line.toLowerCase().includes('land');
        if (isLand) {
            otherResults = [...otherResults, ...this.findLandEntryTriggers(this.cards, [enteringCard])];
        }

        return [...ownResults, ...otherResults];
    }

    /**
     * Resolve a triggered ability effect into a "trigger object"
     * IMPORTANT: We do NOT precompute X here.
     * X / baseValue is recomputed inside trigger.execute(cards) at RESOLUTION time,
     * so earlier triggers can change the board (e.g. buff other Ouroboroids).
     */
    resolveEffect(trigger) {
        const { source, ability } = trigger;
        const engine = this;

        // We return an object that holds ability info and
        // an execute(cards) function that recomputes everything.
        const result = {
            source,
            ability,
            targets: [],
            baseValue: null,
            finalValue: null,
            modifiers: [],
            log: {
                description: '',
                equation: '',
                modifierSteps: [],
            },

            /**
             * Execute this trigger on a given cards array.
             * Returns { newCards, triggers }
             */
            execute(cards, knownCards = []) {
                const abilityToUse = this.ability || ability;
                const currentCards = cards || engine.cards || [];

                // Get the live source from the current board state
                const liveSource =
                    currentCards.find(c => c.id === source.id) || source;

                // Calculate base effect (e.g. X = this.power = base + counters)
                const baseValue = engine.calculateBaseValue(liveSource, abilityToUse, currentCards);

                // Determine targets from CURRENT board
                // Skip automatic target finding for abilities that require manual targeting
                const requiresManualTargeting = abilityToUse.target &&
                    typeof abilityToUse.target === 'string' &&
                    (abilityToUse.target.includes('another') || abilityToUse.target.includes('target')) &&
                    !abilityToUse.targetIds;

                const targets = requiresManualTargeting
                    ? [] // Don't auto-find targets; UI will prompt for selection
                    : abilityToUse.targetIds
                        ? currentCards.filter(c => abilityToUse.targetIds.includes(c.id))
                        : engine.findTargets(abilityToUse.target, currentCards, liveSource);

                // Check for replacement effects from CURRENT board
                const modifiers = engine.findReplacementEffects(
                    abilityToUse.effect,
                    currentCards
                );

                // Apply modifiers (Doubling Season, etc.)
                const finalValue = engine.applyModifiers(
                    baseValue,
                    modifiers,
                    abilityToUse.effect
                );

                // Generate a fresh log
                const log = engine.generateLog(
                    liveSource,
                    abilityToUse,
                    baseValue,
                    finalValue,
                    modifiers,
                    targets
                );

                // Update the trigger object so UI can read accurate info
                this.baseValue = baseValue;
                this.finalValue = finalValue;
                this.targets = targets;
                this.modifiers = modifiers;
                this.log = log;

                // Actually apply the effect
                // executeEffect now returns { newCards, triggers }
                // Pass sourceId so effects like create_related_token can find the source card
                const executionResult = engine.executeEffect(
                    currentCards,
                    targets,
                    { ...abilityToUse, sourceId: liveSource.id },
                    finalValue,
                    knownCards
                );

                return executionResult;
            },
        };

        return result;
    }

    /**
     * Calculate the base value for an effect
     * Handles "this.power" as basePower + +1/+1 counters + dynamic buffs
     * Handles "equipped_creature.power" for equipment-granted abilities
     */
    calculateBaseValue(source, ability, currentCards = this.cards) {
        const amount = ability.amount;

        // Handle equipment-granted abilities that reference equipped creature
        if (typeof amount === 'string' && amount.startsWith('equipped_creature.')) {
            const property = amount.split('.')[1];
            const equippedCreature = ability.sourceCreature; // Set by findAttackTriggers

            if (!equippedCreature) return 1; // Fallback

            // For power: printed power + +1/+1 counters + temporary buffs + attachments
            if (property === 'power') {
                const stats = calculateCardStats(equippedCreature, currentCards);
                return Math.max(0, stats.power);
            }

            const value = equippedCreature[property];
            return parseInt(value) || 0;
        }

        // Handle dynamic values like "this.power"
        if (typeof amount === 'string' && amount.startsWith('this.')) {
            const property = amount.split('.')[1];

            // For power: printed power + +1/+1 counters + temporary buffs + attachments
            if (property === 'power') {
                const stats = calculateCardStats(source, currentCards);
                return Math.max(0, stats.power);
            }

            const value = source[property];
            return parseInt(value) || 0;
        }

        // Handle static numeric values or defaults
        if (amount === undefined) {
            // Defaults for specific effects without explicit amount
            if (ability.effect === 'orthion_copy_five') return 5;
            return 1;
        }
        return parseInt(amount) || 1;
    }

    /**
     * Find targets based on target specification
     * Uses provided cards array (current board) if available
     */
    findTargets(targetSpec, cards = this.cards, source = null) {
        const pool = cards || [];

        switch (targetSpec) {
            case 'equipped_creature':
                if (source && source.attachedTo) {
                    const target = pool.find(c => c.id === source.attachedTo);
                    return target ? [target] : [];
                }
                return [];
            case 'all_creatures_you_control':
                return pool.filter(c => c.type === 'Creature');

            case 'self':
                return source ? [source] : [];

            case 'this':
                // "this" is usually handled via source; we return empty here
                return [];

            case 'all_permanents_you_control':
                return pool;

            case 'another_target_creature_you_control':
            case 'target_creature_you_control':
                // For now, treat as "all creatures you control" (UI handles picking)
                return pool.filter(c => c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')));

            case 'creature':
                // Used for "another target creature"
                return pool.filter(c => c.type_line && c.type_line.includes('Creature'));

            case 'all_other_attacking_creatures':
            case 'another_attacking_creature':
                // Return attacking creatures that are NOT the source
                return pool.filter(c =>
                    c.attacking &&
                    c.id !== source?.id &&
                    (c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')))
                );

            case 'another_nonland_permanent_you_control':
                // Return all nonland permanents except the source
                return pool.filter(c =>
                    c.zone === 'battlefield' &&
                    c.id !== source?.id &&
                    !(c.type_line?.toLowerCase().includes('land'))
                );

            default:
                return [];
        }
    }

    /**
         * Find replacement effects that apply to this effect type
         * Uses current board state (cards param)
         */
    findReplacementEffects(effectType, cards = this.cards) {
        const modifiers = [];
        const pool = cards || [];

        pool.forEach(card => {
            if (!card.replacementEffects) return;

            card.replacementEffects.forEach(effect => {
                if (effectType === 'add_counters' && effect.type === 'double_counters') {
                    modifiers.push({
                        source: card,
                        type: effect.type,
                        multiplier: 2,
                    });
                }

                // Generalized check for ANY token creation effect
                // Matches "create_token", "create_token_copy", "create_named_token", "orthion_copy_...", etc.
                const isTokenCreation = /^create_.*token/.test(effectType) || effectType.startsWith('orthion_copy');

                if (isTokenCreation && effect.type === 'double_tokens') {
                    modifiers.push({
                        source: card,
                        type: effect.type,
                        multiplier: 2,
                    });
                }
            });
        });

        return modifiers;
    }

    /**
     * Apply modifiers to base value
     */
    applyModifiers(baseValue, modifiers, _effectType) {
        let value = baseValue;

        modifiers.forEach(modifier => {
            if (modifier.multiplier) {
                value *= modifier.multiplier;
            }
        });

        return value;
    }

    /**
     * Generate detailed calculation log
     */
    generateLog(source, ability, baseValue, finalValue, modifiers, targets) {
        const log = {
            description: '',
            equation: '',
            modifierSteps: [],
        };

        if (ability.effect === 'add_counters') {
            const targetDesc =
                targets.length > 1
                    ? `each of ${targets.length} creatures`
                    : targets.length === 1
                        ? targets[0].name
                        : 'target';

            log.description = `${source.name} triggered: Add ${finalValue} +1/+1 counter(s) to ${targetDesc}`;
            log.equation = `Base: ${baseValue} counter(s)`;
        }

        if (ability.effect === 'buff_creature') {
            const targetDesc =
                targets.length > 1
                    ? `each of ${targets.length} creatures`
                    : targets.length === 1
                        ? targets[0].name
                        : 'another attacking creature';

            const buffType = ability.buffType || 'both';
            let buffNotation;

            if (buffType === 'power') {
                buffNotation = `+${finalValue}/+0`;
            } else if (buffType === 'toughness') {
                buffNotation = `+0/+${finalValue}`;
            } else {
                buffNotation = `+${finalValue}/+${finalValue}`;
            }

            log.description = `${source.name} triggered: Give ${buffNotation} to ${targetDesc}`;
            log.equation = `X = ${source.name}'s power (${baseValue})`;
        }

        if (ability.effect === 'create_token') {
            log.description = `${source.name} triggered: Create ${finalValue} token(s)`;
            log.equation = `Base: ${baseValue} token(s)`;
        }

        if (ability.effect === 'create_token_copy') {
            log.description = `${source.name} triggered: Create ${finalValue} token copy(s)`;
            log.equation = `Base: ${baseValue} copy(s)`;
        }

        if (ability.effect === 'create_copy_token') {
            const targetName = targets[0]?.name || 'target permanent';
            log.description = `${source.name} triggered: Create a token copy of ${targetName}`;
            log.equation = `Base: ${baseValue} copy`;
        }

        if (ability.effect === 'create_named_token') {
            log.description = `${source.name} triggered: Create ${finalValue} ${ability.tokenName || ''} token(s)`;
            log.equation = `Base: ${baseValue} token(s)`;
        }

        if (ability.effect === 'create_mobilize_warriors') {
            const tokenSubtype = ability.tokenName || 'Warrior';
            log.description = `${source.name} triggered: Create ${finalValue} tapped and attacking ${tokenSubtype} token(s)`;
            log.equation = `Base: ${baseValue} token(s)`;
        }

        modifiers.forEach(modifier => {
            if (ability.effect === 'add_counters') {
                log.modifierSteps.push({
                    source: modifier.source.name,
                    description: `${modifier.source.name}: ×${modifier.multiplier} = ${finalValue} counter(s)`,
                });
            } else if (/^create_.*token/.test(ability.effect) || ability.effect.startsWith('orthion_copy')) {
                log.modifierSteps.push({
                    source: modifier.source.name,
                    description: `${modifier.source.name}: ×${modifier.multiplier} = ${finalValue} token(s)`,
                });
            }
        });

        return log;
    }

    /**
     * Execute the effect on the battlefield
     * Now returns { newCards, triggers }
     */
    executeEffect(cards, targets, ability, value, knownCards = []) {
        const newCards = [...cards];
        const newTriggers = [];

        if (ability.effect === 'add_counters') {
            targets.forEach(target => {
                const cardIndex = newCards.findIndex(c => c.id === target.id);
                if (cardIndex !== -1) {
                    const current = newCards[cardIndex].counters || 0;
                    let nextCounters;

                    if (typeof current === 'number') {
                        // Legacy: Assume +1/+1 is what was meant if it was a number
                        nextCounters = { '+1/+1': current + value };
                    } else {
                        // Object: Update +1/+1
                        const oldVal = current['+1/+1'] || 0;
                        nextCounters = { ...current, '+1/+1': oldVal + value };
                    }

                    newCards[cardIndex] = {
                        ...newCards[cardIndex],
                        counters: nextCounters,
                    };
                }
            });
            // No tokens created, so no triggers from this effect
        }

        if (ability.effect === 'double_counters') {
            targets.forEach(target => {
                const cardIndex = newCards.findIndex(c => c.id === target.id);
                if (cardIndex !== -1) {
                    const current = newCards[cardIndex].counters || 0;
                    const oldVal = typeof current === 'number' ? current : (current['+1/+1'] || 0);

                    if (oldVal > 0) {
                        // In MTG, doubling means adding counters equal to current count
                        const modifiers = this.findReplacementEffects('add_counters', newCards);
                        const finalAdded = this.applyModifiers(oldVal, modifiers, 'add_counters');

                        let nextCounters;
                        if (typeof current === 'number') {
                            nextCounters = { '+1/+1': oldVal + finalAdded };
                        } else {
                            nextCounters = { ...current, '+1/+1': oldVal + finalAdded };
                        }

                        newCards[cardIndex] = {
                            ...newCards[cardIndex],
                            counters: nextCounters,
                        };
                    }
                }
            });
        }

        if (ability.effect === 'buff_creature') {
            const buffType = ability.buffType || 'both'; // 'power', 'toughness', or 'both'
            // Apply temporary buff to targets
            targets.forEach(target => {
                const cardIndex = newCards.findIndex(c => c.id === target.id);
                if (cardIndex !== -1) {
                    const currentCard = newCards[cardIndex];
                    let pBonus = currentCard.tempPowerBonus || 0;
                    let tBonus = currentCard.tempToughnessBonus || 0;

                    if (buffType === 'power' || buffType === 'both') pBonus += value;
                    if (buffType === 'toughness' || buffType === 'both') tBonus += value;

                    newCards[cardIndex] = {
                        ...currentCard,
                        tempPowerBonus: pBonus,
                        tempToughnessBonus: tBonus,
                    };
                }
            });
            // No tokens created, so no triggers from this effect
        }

        // Helper to process generic token creation sequentially
        const processSequentialTokens = (createFn) => {
            const newTokens = [];

            for (let i = 0; i < value; i++) {
                // Create ONE token
                const token = createFn(i);

                // Check triggers: Only EXISTING cards see this token enter
                // The new token does NOT see itself (unless we added it first, which we won't per user req)
                // This creates the 5/5, 4/4, 3/3... pattern for Wildwood Mentor copies
                const triggers = this.findTokenEntryTriggers(newCards, [token]);
                newTriggers.push(...triggers);

                // Now add token to the world so it can see future tokens
                newCards.push(token);
                newTokens.push(token);
            }
            return { newCards, triggers: newTriggers };
        };

        if (ability.effect === 'create_token') {
            return processSequentialTokens((i) => {
                let tokenTypeLine = targets[0]?.type_line ? `Token ${targets[0].type_line}` : 'Token';
                const target = targets[0] || { name: 'Token', type: 'Creature', power: 1, toughness: 1 }; // Fallback
                if (target.isToken) tokenTypeLine = target.type_line;

                return {
                    id: Date.now() + i + Math.random(),
                    name: `${target.name} Token`,
                    type: target.type || 'Creature',
                    type_line: tokenTypeLine,
                    power: target.power,
                    toughness: target.toughness,
                    counters: 0,
                    isToken: true,
                    tapped: false,
                    zone: 'battlefield'
                };
            });
        }

        if (ability.effect === 'create_token_copy') {
            // If multiple targets (unlikely for copy unless X targets?), handle first or iterate? 
            // Usually copy target is single.
            const target = targets[0];
            if (!target) return { newCards, triggers: [] };

            return processSequentialTokens((i) => {
                let cleanTypeLine = target.type_line
                    ? target.type_line.replace('Legendary ', '').replace('Legendary', '')
                    : target.type_line || 'Creature';

                if (!cleanTypeLine.toLowerCase().includes('token')) {
                    cleanTypeLine = `Token ${cleanTypeLine}`;
                }

                const tokenCopy = {
                    ...target,
                    id: Date.now() + i + Math.random(),
                    type_line: cleanTypeLine,
                    isToken: true,
                    tapped: false,
                    counters: 0,
                    attachedTo: null,
                    zone: target.zone || 'battlefield',
                };

                // Process the token copy's OWN ETB abilities
                if (tokenCopy.abilities) {
                    tokenCopy.abilities.forEach(ability => {
                        if (ability.trigger === 'on_enter_battlefield') {
                            const triggerObj = this.resolveEffect({ source: tokenCopy, ability });
                            newTriggers.push(triggerObj);
                        }
                    });
                }

                // Also check for other cards' "when a token enters" triggers
                const otherTriggers = this.findTokenEntryTriggers(newCards, [tokenCopy]);
                newTriggers.push(...otherTriggers);

                return tokenCopy;
            });
        }

        // create_copy_token: Creates a token copy of any nonland permanent (for Extravagant Replication)
        if (ability.effect === 'create_copy_token') {
            const target = targets[0];
            if (!target) return { newCards, triggers: [] };

            return processSequentialTokens((i) => {
                // Build type line for the token copy
                let cleanTypeLine = target.type_line || target.type || 'Permanent';
                if (!cleanTypeLine.toLowerCase().includes('token')) {
                    cleanTypeLine = `Token ${cleanTypeLine}`;
                }

                const tokenCopy = {
                    ...target,
                    id: Date.now() + i + Math.random(),
                    type_line: cleanTypeLine,
                    isToken: true,
                    tapped: false,
                    counters: 0,
                    attachedTo: null,
                    zone: 'battlefield',
                };

                // Process the token copy's OWN ETB abilities
                if (tokenCopy.abilities) {
                    tokenCopy.abilities.forEach(ability => {
                        if (ability.trigger === 'on_enter_battlefield') {
                            const triggerObj = this.resolveEffect({ source: tokenCopy, ability });
                            newTriggers.push(triggerObj);
                        }
                    });
                }

                // Check for other cards' "when a token enters" triggers
                const otherTriggers = this.findTokenEntryTriggers(newCards, [tokenCopy]);
                newTriggers.push(...otherTriggers);

                return tokenCopy;
            });
        }

        // NEW: create_related_token - uses Scryfall relatedTokens from the source card
        // Parser only extracts amount and tappedAndAttacking flag
        if (ability.effect === 'create_related_token') {
            const amount = value || 1;
            const isTappedAndAttacking = ability.tappedAndAttacking || false;

            // Get the source card that triggered this ability (for relatedTokens lookup)
            // The source is stored on the ability object by resolveEffect
            const sourceCard = newCards.find(c => c.id === ability.sourceId) ||
                targets[0] ||
                knownCards.find(c => c.relatedTokens && c.relatedTokens.length > 0);

            // Get the first related token (most cards only create one type of token)
            let relatedToken = sourceCard?.relatedTokens?.[0];

            // Fallback: search knownCards for any token
            if (!relatedToken && knownCards.length > 0) {
                relatedToken = knownCards.find(c =>
                    c.isToken || (c.type_line && c.type_line.includes('Token'))
                );
            }

            // Create tokens
            for (let i = 0; i < amount; i++) {
                let token;

                if (relatedToken) {
                    // Use full Scryfall token data
                    token = {
                        ...relatedToken,
                        id: Date.now() + i + Math.random(),
                        isToken: true,
                        tapped: isTappedAndAttacking,
                        attacking: isTappedAndAttacking,
                        counters: 0,
                        zone: 'battlefield',
                        attachedTo: null,
                        // Ensure type is set for BattlefieldCard P/T display
                        type: relatedToken.type_line?.includes('Creature') ? 'Creature' : 'Token',
                    };
                } else {
                    // Minimal fallback token
                    token = {
                        id: Date.now() + i + Math.random(),
                        name: 'Token',
                        type: 'Creature',
                        type_line: 'Token Creature',
                        power: 1,
                        toughness: 1,
                        colors: [],
                        counters: 0,
                        isToken: true,
                        tapped: isTappedAndAttacking,
                        attacking: isTappedAndAttacking,
                        zone: 'battlefield',
                    };
                }

                // Sequential Trigger Check
                const triggers = this.findTokenEntryTriggers(newCards, [token]);
                newTriggers.push(...triggers);
                newCards.push(token);
            }
            return { newCards, triggers: newTriggers };
        }

        const tokenDefs = {
            'Lander': { type: 'Token Artifact', type_line: 'Token Artifact', power: 0, toughness: 0, colors: [], art_crop: 'https://cards.scryfall.io/art_crop/front/8/5/85ef1950-219f-401b-8ff5-914f9aaec122.jpg?1752946491', image_normal: 'https://cards.scryfall.io/large/front/8/5/85ef1950-219f-401b-8ff5-914f9aaec122.jpg?1752946491' },
            'Treasure': { type: 'Token Artifact — Treasure', type_line: 'Token Artifact — Treasure', power: 0, toughness: 0, colors: [] },
            'Food': { type: 'Token Artifact — Food', type_line: 'Token Artifact — Food', power: 0, toughness: 0, colors: [] },
            'Clue': { type: 'Token Artifact — Clue', type_line: 'Token Artifact — Clue', power: 0, toughness: 0, colors: [] }
        };

        const isMatch = (scryfallName, parsedName) => {
            if (!scryfallName || !parsedName) return false;
            const s = scryfallName.toLowerCase();
            const pValue = (typeof parsedName === 'function' ? parsedName() : parsedName).toLowerCase();

            // Clean up parsed name (e.g. "Virtuous Role" -> "virtuous")
            const pWord = pValue.replace(' role', '').replace(' token', '').trim();

            // 1. Direct/substring match
            if (s === pValue || s.includes(pValue) || pValue.includes(s)) return true;

            // 2. Fuzzy word match
            if (s.includes(pWord)) return true;

            // 3. DFC face matching: "Monster // Virtuous" should match "Virtuous"
            if (s.includes('//')) {
                const faces = s.split('//').map(f => f.trim());
                if (faces.some(face => face === pWord || face.includes(pWord))) return true;
            }

            return false;
        };

        if (ability.effect === 'cleanup_existing_roles') {
            const targetId = ability.target;
            const cleanupResult = this.performRoleCleanup(newCards, targetId);
            return { newCards: cleanupResult.newCards, triggers: newTriggers };
        }

        if (ability.effect === 'create_named_token' || ability.effect === 'create_attached_token') {
            const tokenName = (typeof ability.tokenName === 'function' ? ability.tokenName() : ability.tokenName) || 'Token';
            const amount = value || 1;
            const target = targets[0]; // For attached tokens, this is the host

            // Find the source card that triggered this
            const sourceCard = newCards.find(c => c.id === ability.sourceId) ||
                (ability.effect === 'create_named_token' ? targets[0] : null) ||
                knownCards.find(c => c.relatedTokens && c.relatedTokens.length > 0);


            // 1. Priority: Search local scryfall_cards.json for manual overrides
            // This allows the user to define "Virtuous" exactly how they want it, bypassing split cards
            let relatedToken = localCardData.find(c => isMatch(c.name, tokenName));

            // 2. Look for related token on the source card
            if (!relatedToken) {
                relatedToken = sourceCard?.relatedTokens?.find(t => isMatch(t.name, tokenName));
            }

            // 3. Fallback: Search knownCards for any matching token
            if (!relatedToken && knownCards.length > 0) {
                relatedToken = knownCards.find(c =>
                    (c.isToken || (c.type_line && c.type_line.includes('Token'))) &&
                    isMatch(c.name, tokenName)
                );
            }

            // 4. Fallback: Use SIGNATURE_DATA for known tokens (Virtuous Role, Monster Role, etc.)
            if (!relatedToken) {
                const signatureToken = SIGNATURE_DATA[tokenName] || SIGNATURE_DATA[tokenName.replace(' Role', '')];
                if (signatureToken) {
                    relatedToken = {
                        name: signatureToken.name,
                        type_line: signatureToken.type_line || signatureToken.type,
                        oracle_text: signatureToken.oracle_text,
                        isToken: true,
                        isRole: signatureToken.isRole,
                        colors: [],
                        power: 0,
                        toughness: 0,
                        // Provide defaults for anything else so it behaves like a "real" card
                        art_crop: signatureToken.art_crop || '',
                        image_normal: signatureToken.image_normal || ''
                    };
                }
            }

            const hardcoded = tokenDefs[tokenName];
            const parsed = ability.tokenProps;

            // Merge metadata
            // If relatedToken (from local JSON or scryfall) is found, use its type/stats
            const mergedType = relatedToken ? (relatedToken.type_line || 'Token') : (parsed?.type || hardcoded?.type || (ability.effect === 'create_attached_token' ? 'Enchantment' : 'Token Creature'));
            const power = relatedToken ? (relatedToken.power !== '' ? parseInt(relatedToken.power) : (hardcoded?.power !== undefined ? hardcoded.power : 1)) : (parsed?.power !== undefined ? parsed.power : (hardcoded?.power !== undefined ? hardcoded.power : 1));
            const toughness = relatedToken ? (relatedToken.toughness !== '' ? parseInt(relatedToken.toughness) : (hardcoded?.toughness !== undefined ? hardcoded.toughness : 1)) : (parsed?.toughness !== undefined ? parsed.toughness : (hardcoded?.toughness !== undefined ? hardcoded.toughness : 1));
            const colors = relatedToken ? (relatedToken.colors || []) : (parsed?.colors || hardcoded?.colors || []);
            const image = relatedToken ? relatedToken.image_normal : hardcoded?.image_normal;
            const art = relatedToken ? relatedToken.art_crop : hardcoded?.art_crop;
            const oracle = relatedToken ? relatedToken.oracle_text : hardcoded?.oracle_text;

            const isAttached = ability.effect === 'create_attached_token';
            let loopCount = amount;
            let currentTargets = targets;

            for (let i = 0; i < loopCount; i++) {
                const target = currentTargets[i] || targets[0]; // fallback to targets[0] if not multi
                let token = {
                    id: Date.now() + i + Math.random(),
                    name: (hardcoded?.name || tokenName),
                    type: mergedType,
                    type_line: mergedType,
                    power,
                    toughness,
                    colors,
                    oracle_text: oracle,
                    counters: 0,
                    isToken: true,
                    tapped: false,
                    zone: isAttached && target ? 'attached' : 'battlefield',
                    attachedTo: isAttached && target ? target.id : null,
                    image_normal: image,
                    art_crop: art
                };

                // Use relatedToken data if available
                if (relatedToken) {
                    let activeFaceIndex = 0;
                    let faceData = {};

                    if (relatedToken.card_faces) {
                        const idx = relatedToken.card_faces.findIndex(f => isMatch(f.name, tokenName));
                        if (idx !== -1) {
                            activeFaceIndex = idx;
                            const face = relatedToken.card_faces[idx];
                            // Capture face data to overwrite top-level props
                            faceData = {
                                name: face.name,
                                type_line: face.type_line,
                                oracle_text: face.oracle_text,
                                power: face.power,
                                toughness: face.toughness,
                                art_crop: face.art_crop || relatedToken.art_crop,
                                image_normal: face.image_normal || relatedToken.image_normal,
                                colors: face.colors || relatedToken.colors
                            };
                        }
                    }

                    token = {
                        ...token,
                        ...relatedToken,
                        ...faceData, // Overwrite with specific face data
                        activeFaceIndex,
                        id: token.id, // Keep generated ID
                        zone: token.zone,
                        attachedTo: token.attachedTo
                    };
                }

                if (token.type_line?.includes('Role') && token.attachedTo) {
                    // Sequential Trigger Check
                    const triggers = this.findTokenEntryTriggers([...this.cards, ...newCards], [token]);
                    newTriggers.push(...triggers);
                    newCards.push(token);

                    // AUTOMATIC: Handle Role Rule (Clean up old roles immediately)
                    // newCards is a parameter but we want to update the accumulated result for THIS effect
                    const cleanupResult = this.performRoleCleanup(newCards, token.attachedTo);
                    // Clean up old roles immediately and update the newCards array in place
                    const finalCards = cleanupResult.newCards;
                    newCards.length = 0;
                    newCards.push(...finalCards);
                } else {
                    newCards.push(token);
                }
            }
            return { newCards, triggers: newTriggers };
        }

        if (ability.effect === 'create_mobilize_warriors') {
            // Create X tapped and attacking tokens based on equipped creature's power
            // Token name comes from ability.tokenName (e.g., "Warrior")
            const tokenSubtype = ability.tokenName || 'Warrior';

            // Try to find the related token from the equipment source
            // Look up the LIVE equipment from current cards to get updated relatedTokens
            const equipmentSourceId = ability.source?.id;
            const liveEquipment = equipmentSourceId
                ? newCards.find(c => c.id === equipmentSourceId) || ability.source
                : ability.source || targets[0];

            const isMatch = (scryfallName, parsedName) => {
                const s = (scryfallName || '').toLowerCase();
                const p = (parsedName || '').toLowerCase();
                return s === p || p.includes(s) || s.includes(p);
            };

            // Look for related token on the live equipment (has relatedTokens after fetch)
            let relatedToken = liveEquipment?.relatedTokens?.find(t => isMatch(t.name, tokenSubtype));

            // Fallback: search in knownCards for a matching token
            if (!relatedToken && knownCards && knownCards.length > 0) {
                relatedToken = knownCards.find(c =>
                    (c.isToken || (c.type_line && c.type_line.includes('Token'))) &&
                    isMatch(c.name, tokenSubtype)
                );
            }

            // Use related token data or minimal fallback
            const tokenPower = relatedToken?.power || '1';
            const tokenToughness = relatedToken?.toughness || '1';
            const tokenColors = relatedToken?.colors || ['R'];
            const tokenArt = relatedToken?.art_crop;
            const tokenImage = relatedToken?.image_normal;
            const tokenTypeLine = relatedToken?.type_line || `Token Creature — ${tokenSubtype}`;
            const tokenName = relatedToken?.name || `${tokenSubtype} Token`;


            const mobilizeTokenGroup = {
                tokenIds: [],
                count: value,
                subtypeName: tokenSubtype
            };

            // Register delayed sacrifice trigger for end step
            this.registerDelayedTrigger({
                phase: 'end_step',
                effect: 'sacrifice_cards',
                targets: mobilizeTokenGroup.tokenIds, // Will be populated via reference
                sourceId: liveEquipment?.id || 0, // Equipment or source creature
                description: `Sacrifice ${value} ${tokenSubtype} token(s) created by mobilize`
            });

            // Create tokens sequentially
            for (let i = 0; i < value; i++) {
                let warriorToken;

                if (relatedToken) {
                    // Use full related token data (preserves art, abilities, etc.)
                    // Explicitly set power/toughness to ensure P/T box displays
                    // Also ensure 'type' is set to 'Creature' so BattlefieldCard renders the P/T box
                    warriorToken = {
                        ...relatedToken,
                        id: Date.now() + i + Math.random(),
                        power: tokenPower,
                        toughness: tokenToughness,
                        type: (relatedToken.type_line && relatedToken.type_line.includes('Creature')) ? 'Creature' : 'Creature',
                        isToken: true,
                        tapped: true, // Mobilize creates tapped tokens
                        attacking: true, // Mobilize creates attacking tokens
                        counters: 0,
                        zone: 'battlefield',
                        attachedTo: null
                    };
                } else {
                    // Fallback to constructed token
                    warriorToken = {
                        id: Date.now() + i + Math.random(),
                        name: tokenName,
                        type: 'Creature',
                        type_line: tokenTypeLine,
                        power: tokenPower,
                        toughness: tokenToughness,
                        colors: tokenColors,
                        counters: 0,
                        isToken: true,
                        tapped: true,
                        attacking: true,
                        zone: 'battlefield',
                        art_crop: tokenArt,
                        image_normal: tokenImage
                    };
                }

                // Track this token for end-step sacrifice
                mobilizeTokenGroup.tokenIds.push(warriorToken.id);

                // Check for token entry triggers (e.g., Wildwood Mentor)
                const triggers = this.findTokenEntryTriggers(newCards, [warriorToken]);
                newTriggers.push(...triggers);

                newCards.push(warriorToken);
            }

            return { newCards, triggers: newTriggers };
        }

        if (ability.effect === 'orthion_copy_single' || ability.effect === 'orthion_copy_five') {
            // Find target (should be passed in targets array)
            const target = targets[0];
            if (!target) return { newCards, triggers: [] };

            // Use calculated value (which includes modifiers) instead of checking effect name again
            const count = value || (ability.effect === 'orthion_copy_five' ? 5 : 1);

            // Track tokens for end-step sacrifice (will be populated as they're created)
            const orthionTokenGroup = {
                tokenIds: [],
                count: count,
                targetName: target.name
            };

            // Register delayed sacrifice trigger now (IDs will be added as tokens are created)
            this.registerDelayedTrigger({
                phase: 'end_step',
                effect: 'sacrifice_cards',
                targets: orthionTokenGroup.tokenIds, // Will be populated via reference
                sourceId: ability.sourceId || 0,
                description: `Sacrifice ${count} ${target.name} token(s) created by Orthion`
            });

            // Instead of creating tokens immediately, create deferred creation triggers
            // Each will resolve sequentially from the stack
            for (let i = 0; i < count; i++) {
                // Clean up type line (remove Legendary)
                let cleanTypeLine = target.type_line
                    ? target.type_line.replace('Legendary ', '').replace('Legendary', '')
                    : target.type_line || 'Creature';

                if (!cleanTypeLine.toLowerCase().includes('token')) {
                    cleanTypeLine = `Token ${cleanTypeLine}`;
                }

                // Create a deferred token creation trigger
                const deferredCreation = {
                    trigger: 'deferred_token_creation',
                    source: ability.source || { name: 'Orthion' },
                    description: `Create ${target.name} token`,
                    tokenTemplate: {
                        ...target,
                        type_line: cleanTypeLine,
                        isToken: true,
                        tapped: false,
                        counters: 0,
                        attachedTo: null,
                        zone: 'battlefield',
                        haste: true
                    },
                    orthionTokenGroup: orthionTokenGroup, // Reference to track IDs
                    execute: ((currentCards) => {
                        // This will be called when this item is resolved from the stack
                        const newToken = {
                            ...deferredCreation.tokenTemplate,
                            id: Date.now() + Math.random()
                        };

                        // Add token ID to orthion group for end-step sacrifice
                        if (deferredCreation.orthionTokenGroup) {
                            deferredCreation.orthionTokenGroup.tokenIds.push(newToken.id);
                        }

                        // Create the token
                        const updatedCards = [...currentCards, newToken];

                        // Find entry triggers for THIS token
                        const entryTriggers = this.findTokenEntryTriggers(currentCards, [newToken]);

                        return { newCards: updatedCards, triggers: entryTriggers };
                    }).bind(this) // Bind to preserve 'this' context
                };

                newTriggers.push(deferredCreation);
            }

            return { newCards, triggers: newTriggers };
        }

        if (ability.effect === 'sacrifice_cards') {
            // Remove specific cards by ID
            // ability.targetIds contains the IDs
            const idsToRemove = ability.targetIds || [];
            return { newCards: newCards.filter(c => !idsToRemove.includes(c.id)), triggers: [] };
        }

        return { newCards, triggers: [] };
    }

    /**
     * Helper to perform role cleanup (State-Based Action)
     * When multiple Roles controlled by the same player are attached to the same creature,
     * all but the newest one are put into the graveyard.
     */
    performRoleCleanup(cards, targetId) {
        const newCards = [...cards];
        const roles = newCards.filter(c =>
            c.type_line && (c.type_line.includes('Role') || (c.name && c.name.includes('Role'))) &&
            c.attachedTo === targetId &&
            c.zone !== 'graveyard'
        );

        if (roles.length > 1) {
            // Sort by ID (assume higher ID is newer)
            roles.sort((a, b) => a.id - b.id);
            const rolesToDestroy = roles.slice(0, roles.length - 1);
            const idsToDestroy = rolesToDestroy.map(r => r.id);

            return {
                newCards: newCards.map(c => {
                    if (idsToDestroy.includes(c.id)) {
                        return {
                            ...c,
                            zone: 'graveyard',
                            tapped: false,
                            attachedTo: null
                        };
                    }
                    return c;
                })
            };
        }

        return { newCards };
    }

    /**
     * Process a manual action (like adding a counter to a specific card)
     * (This part is basically unchanged from your original engine)
     */
    processAction(action, targetCard, cards) {
        const result = {
            newCards: [...cards],
            triggers: [], // New for manual token creation
            log: {
                description: '',
                equation: '',
                modifierSteps: [],
            },
        };

        if (!targetCard) return result;

        if (action === 'counter-update') {
            const { type = '+1/+1', change = 1 } = targetCard; // extracted from payload passed as targetCard proxy

            const modifiers = type === '+1/+1' ? this.findReplacementEffects('add_counters', result.newCards) : [];
            const baseValue = change;
            const finalValue = type === '+1/+1' && change > 0
                ? this.applyModifiers(baseValue, modifiers, 'add_counters')
                : baseValue;

            result.newCards = result.newCards.map(c => {
                if (c.id !== targetCard.id) return c;

                const current = c.counters || {};
                // Helper to get numeric value whether strict object or legacy number
                const getVal = (t) => (typeof current === 'number' ? (t === '+1/+1' ? current : 0) : (current[t] || 0));

                const currentVal = getVal(type);
                const newVal = Math.max(0, currentVal + finalValue);

                const nextCounters = typeof current === 'number'
                    ? (type === '+1/+1' ? newVal : { '+1/+1': current, [type]: newVal })
                    : { ...current, [type]: newVal };

                // Cleanup
                if (newVal === 0 && typeof nextCounters === 'object') delete nextCounters[type];

                return { ...c, counters: nextCounters };
            });

            result.log.description = `Modified ${type} counters on ${targetCard.name}`;
            result.log.equation = `Delta: ${finalValue} (${baseValue} base)`;
            if (modifiers.length > 0) {
                result.log.modifierSteps = modifiers.map(mod => ({
                    source: mod.source.name,
                    description: `${mod.source.name}: ×${mod.multiplier} = ${finalValue} counters`,
                }));
            }
        }

        // LEGACY / SHORTCUT HANDLERS (Mapped to new system)
        if (action === 'counter+') {
            // Re-route to standard update if possible, but for now duplicate logic for safety
            const modifiers = this.findReplacementEffects('add_counters', result.newCards);
            const baseValue = 1;
            const finalValue = this.applyModifiers(baseValue, modifiers, 'add_counters');

            result.newCards = result.newCards.map(c => {
                if (c.id !== targetCard.id) return c;
                const current = c.counters || {};
                const val = typeof current === 'number' ? current : (current['+1/+1'] || 0);
                const newVal = val + finalValue;
                const nextCounters = typeof current === 'number' ? newVal : { ...current, '+1/+1': newVal };
                // Migrate to object if mixing? No, keep simple if legacy.
                // Actually, let's migrate to object to support future mixing
                return { ...c, counters: typeof current === 'number' ? { '+1/+1': newVal } : nextCounters };
            });

            result.log.description = `Added +1/+1 counter(s) to ${targetCard.name}`;
            result.log.equation = `Base: +${baseValue} counter`;
            result.log.modifierSteps = modifiers.map(mod => ({
                source: mod.source.name,
                description: `${mod.source.name}: ×${mod.multiplier} = +${finalValue} counters`,
            }));
        }

        if (action === 'counter-') {
            result.newCards = result.newCards.map(c => {
                if (c.id !== targetCard.id) return c;
                const current = c.counters || {};
                const val = typeof current === 'number' ? current : (current['+1/+1'] || 0);
                const newVal = Math.max(0, val - 1);

                let nextCounters;
                if (typeof current === 'number') {
                    nextCounters = newVal === 0 ? {} : { '+1/+1': newVal }; // Migrate to object
                } else {
                    nextCounters = { ...current, '+1/+1': newVal };
                    if (newVal === 0) delete nextCounters['+1/+1'];
                }

                return { ...c, counters: nextCounters };
            });

            result.log.description = `Removed +1/+1 counter from ${targetCard.name}`;
            result.log.equation = `Base: -1 counter`;
        }

        if (action === 'create-token') {
            const modifiers = this.findReplacementEffects('create_token', result.newCards);
            const baseValue = 1;
            const finalValue = this.applyModifiers(baseValue, modifiers, 'create_token');

            const newTokens = Array.from({ length: finalValue }, (_, i) => {
                let tokenTypeLine = targetCard.type_line ? `Token ${targetCard.type_line}` : 'Token';
                if (targetCard.isToken) tokenTypeLine = targetCard.type_line; // Prevent "Token Token"

                return {
                    id: Date.now() + i + Math.random(),
                    name: `${targetCard.name} Token`,
                    type: targetCard.type,
                    type_line: tokenTypeLine,
                    power: targetCard.power,
                    toughness: targetCard.toughness,
                    counters: 0,
                    tapped: false,
                    isToken: true,
                    zone: 'battlefield',
                    art_crop: targetCard.art_crop,
                    image_normal: targetCard.image_normal
                };
            });

            // Check for triggers!
            const triggers = this.findTokenEntryTriggers(result.newCards, newTokens);
            result.triggers = triggers;

            result.newCards = [...result.newCards, ...newTokens];

            result.log.description = `Created ${targetCard.name} token(s)`;
            result.log.equation = `Base: ${baseValue} token`;
            result.log.modifierSteps = modifiers.map(mod => ({
                source: mod.source.name,
                description: `${mod.source.name}: ×${mod.multiplier} = ${finalValue} tokens`,
            }));
        }

        if (action === 'tap') {
            result.newCards = result.newCards.map(c =>
                c.id === targetCard.id
                    ? { ...c, tapped: !c.tapped }
                    : c
            );

            const nowTapped = !targetCard.tapped;
            result.log.description = `${nowTapped ? 'Tapped' : 'Untapped'} ${targetCard.name}`;
            result.log.equation = '';
        }

        if (action === 'pt-update') {
            // payload: { type: 'permanent' | 'temporary', powerChange, toughnessChange }
            const { type = 'permanent', powerChange = 0, toughnessChange = 0 } = targetCard;

            result.newCards = result.newCards.map(c => {
                if (c.id !== targetCard.id) return c;

                if (type === 'permanent') {
                    const currentP = c.permPowerBonus || 0;
                    const currentT = c.permToughnessBonus || 0;
                    return {
                        ...c,
                        permPowerBonus: currentP + powerChange,
                        permToughnessBonus: currentT + toughnessChange
                    };
                } else {
                    const currentP = c.tempPowerBonus || 0;
                    const currentT = c.tempToughnessBonus || 0;
                    return {
                        ...c,
                        tempPowerBonus: currentP + powerChange,
                        tempToughnessBonus: currentT + toughnessChange
                    };
                }
            });

            const label = type === 'permanent' ? 'Permanent' : 'Temporary';
            const signP = powerChange >= 0 ? '+' : '';
            const signT = toughnessChange >= 0 ? '+' : '';
            result.log.description = `${label} Buff: ${signP}${powerChange}/${signT}${toughnessChange} to ${targetCard.name}`;
            result.log.equation = '';
        }

        return result;
    }
}

export default GameEngine;
