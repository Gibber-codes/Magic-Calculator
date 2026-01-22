/**
 * MTG Game Engine
 * Handles phase management, triggered abilities, and replacement effects
 */
import { calculateCardStats, getTypeFromTypeLine } from './cardUtils';
import localCardData from '../data/scryfall_cards.json';
import { SIGNATURE_DATA } from '../data/signatureCards';
import { formatBigNumber } from './formatters';

// Performance optimization: limit physical token objects to prevent memory issues
const MAX_PHYSICAL_TOKENS = 20;
// Threshold for switching to BigInt exponential calculation
const BIGINT_DOUBLER_THRESHOLD = 10;


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
        // flatMap handles both single triggers and arrays of triggers from token creation
        return allTriggers.flatMap(trigger => this.resolveEffect(trigger));
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
     * Check if there are any pending triggers for a specific phase (Delayed or Standard)
     * Non-destructive peek.
     */
    checkPendingTriggers(phase) {
        // 1. Check Delayed Triggers
        const triggerMap = {
            beginning: 'beginning_step',
            combat: 'beginning_of_combat',
            main: 'main_phase',
            'Main 2': 'main_phase',
            end: 'end_step',
            'End': 'end_step',
        };
        const currentTriggerType = triggerMap[phase];
        if (!currentTriggerType) return false;

        const hasDelayed = this.delayedTriggers.some(dt => dt.phase === currentTriggerType);
        if (hasDelayed) return true;

        // 2. Check Standard Triggers (Card Abilities)
        // We reuse the logic from findTriggersForPhase but exit early if found
        // Optimization: plain for-loop to break early
        for (const card of this.cards) {
            if (card.abilities) {
                for (const ability of card.abilities) {
                    if (ability.trigger === currentTriggerType) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Process an attack declaration
     * Returns triggers caused by these attackers
     */
    processAttackDeclaration(attackerIds) {
        const triggers = this.findAttackTriggers(attackerIds);
        // flatMap handles both single triggers and arrays of triggers from token creation
        return triggers.flatMap(trigger => this.resolveEffect(trigger));
    }

    /**
     * Find all triggered abilities that match "on_attack" for a set of attackers
     */
    findAttackTriggers(attackerIds) {
        const triggers = [];
        const attackers = this.cards.filter(c => attackerIds.includes(c.id));

        attackers.forEach(creature => {
            // 1. Check the creature itself for attack triggers
            if (creature.abilities) {
                creature.abilities.forEach(ability => {
                    if (ability.trigger === 'on_attack') {
                        triggers.push({
                            source: creature,
                            ability: ability
                        });
                    }
                });
            }

            // 2. Check for "Battle cry" and other keywords that imply attack triggers
            // (Standard keyword handlers might already be in abilities, but check oracle_text just in case)
            if (creature.oracle_text?.toLowerCase().includes('battle cry')) {
                // Check if this is already handled by an explicit ability to avoid duplicates
                // We check for the functional effect because the parser might have generated it from reminder text
                // without preserving the "Battle cry" name in the description.
                const alreadyHasBattleCry = creature.abilities?.some(a =>
                    a.trigger === 'on_attack' &&
                    a.effect === 'buff_creature' &&
                    a.target === 'all_other_attacking_creatures'
                );

                if (!alreadyHasBattleCry) {
                    // Battle cry logic: each OTHER attacking creature gets +1/+0
                    triggers.push({
                        source: creature,
                        ability: {
                            trigger: 'on_attack',
                            effect: 'buff_creature',
                            target: 'all_other_attacking_creatures',
                            amount: 1,
                            buffType: 'power',
                            description: 'Battle cry (Whenever this creature attacks, each other attacking creature gets +1/+0 until end of turn.)'
                        }
                    });
                }
            }

            // 3. Check for equipment/auras attached to this creature
            const attachments = this.cards.filter(c => c.attachedTo === creature.id);
            attachments.forEach(attachment => {
                if (attachment.abilities) {
                    attachment.abilities.forEach(ability => {
                        if (ability.trigger === 'on_attack') {
                            triggers.push({
                                source: attachment,
                                ability: {
                                    ...ability,
                                    sourceCreature: creature // Store which creature triggered it for stat refs (e.g. Ouroboroid-like buffs)
                                }
                            });
                        }
                    });
                }
            });
        });

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
                            ability: {
                                ...ability,
                                triggerCardId: token.id // Pass the ID of the token that triggered it
                            },
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

        console.log('[ETB] Processing:', enteringCard.name, 'Has abilities:', enteringCard.abilities?.length || 0);

        // FALLBACK: If this is a signature card but doesn't have abilities loaded, load them now
        if (!enteringCard.abilities || enteringCard.abilities.length === 0) {
            const signature = SIGNATURE_DATA[enteringCard.name];
            console.log('[ETB] Checking SIGNATURE_DATA for:', enteringCard.name, 'Found:', !!signature);
            if (signature && signature.abilities) {
                console.log('[ETB] Loading abilities from SIGNATURE_DATA:', signature.abilities);
                // Mutate the card to add abilities (this is acceptable since we're processing it)
                enteringCard.abilities = signature.abilities;
                enteringCard.replacementEffects = signature.replacementEffects || [];
                enteringCard.keywords = signature.keywords || [];
            }
        }

        // 1. Check for card's own ETB triggers
        if (enteringCard.abilities) {
            enteringCard.abilities.forEach(ability => {
                console.log('[ETB] Checking ability:', ability.trigger, ability.description);
                if (ability.trigger === 'on_enter_battlefield') {
                    console.log('[ETB] Found ETB trigger!');
                    triggers.push({
                        source: enteringCard,
                        ability: ability
                    });
                }
            });
        }

        console.log('[ETB] Total triggers found:', triggers.length);

        // flatMap handles both single triggers and arrays of triggers from token creation
        const ownResults = triggers.flatMap(trigger => this.resolveEffect(trigger));
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
     * Returns an executable object to be placed on the Stack.
     */
    resolveEffect(trigger) {
        const { source, ability } = trigger;
        const currentCards = this.cards || [];

        // 1. Calculate projected value (for UI description)
        let baseValue = 1;
        try {
            baseValue = this.calculateBaseValue(source, ability, currentCards);
        } catch (e) {
            console.error("Error calculating base value:", e);
        }

        const modifiers = this.findReplacementEffects(ability.effect, currentCards);
        const finalValue = this.applyModifiers(baseValue, modifiers, ability.effect);

        // 2. Generate Description
        const log = this.generateLog(source, ability, baseValue, finalValue, modifiers, []);

        // 3. Return Executable Object
        return {
            id: `${Date.now()}-${Math.random()}`,
            source: source,
            ability: ability,
            description: log.description || ability.effect,
            trigger: ability.trigger,
            execute: (cards, _recent, targets) => {
                // Re-calculate at resolution time for accuracy
                const resolveBase = this.calculateBaseValue(source, ability, cards);
                const resolveMods = this.findReplacementEffects(ability.effect, cards);
                const resolveFinal = this.applyModifiers(resolveBase, resolveMods, ability.effect);

                // Resolve Targets (if not manually provided)
                let finalTargets = targets;
                if (!finalTargets || finalTargets.length === 0) {
                    // Try to auto-find targets (e.g. 'self', 'equipped_creature')
                    const liveSource = cards.find(c => c.id === source.id) || source;
                    finalTargets = this.findTargets(ability.target, cards, liveSource);
                }

                return this.executeEffect(cards, finalTargets || [], { ...ability, sourceId: source.id, triggerCardId: ability.triggerCardId }, resolveFinal, _recent);
            }
        };
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

            // Use live creature to ensure up-to-date stats
            const liveEquipped = currentCards.find(c => c.id === equippedCreature.id) || equippedCreature;

            // For power: printed power + +1/+1 counters + temporary buffs + attachments
            if (property === 'power') {
                const stats = calculateCardStats(liveEquipped, currentCards);
                return Math.max(0, stats.power);
            }

            const value = liveEquipped[property];
            return parseInt(value) || 0;
        }

        // Handle dynamic values like "this.power"
        if (typeof amount === 'string' && amount.startsWith('this.')) {
            const property = amount.split('.')[1];

            // Use live source to ensure up-to-date stats (e.g. counters added while on stack)
            const liveSource = currentCards.find(c => c.id === source.id) || source;

            // For power: printed power + +1/+1 counters + temporary buffs + attachments
            if (property === 'power') {
                const stats = calculateCardStats(liveSource, currentCards);
                return Math.max(0, stats.power);
            }

            const value = liveSource[property];
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

            case 'trigger_card':
                if (source && source.triggerCardId) {
                    const target = pool.find(c => c.id === source.triggerCardId);
                    return target ? [target] : [];
                }
                return [];

            case 'all_permanents_you_control':
                return pool;

            case 'another_creature_you_control':
            case 'another_target_creature_you_control':
                return pool.filter(c =>
                    c.id !== source?.id &&
                    (c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')))
                );

            case 'target_creature_you_control':
                // For now, treat as "all creatures you control" (UI handles picking)
                return pool.filter(c => c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')));


            case 'creature':
                // Used for "another target creature"
                return pool.filter(c => c.type_line && c.type_line.includes('Creature'));

            case 'all_other_attacking_creatures':
            case 'another_attacking_creature':
            case 'another_target_attacking_creature':
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
                        count: card.isVirtualStack ? BigInt(card.tokenCount || 1n) : 1n
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
                        count: card.isVirtualStack ? BigInt(card.tokenCount || 1n) : 1n
                    });
                }

            });
        });

        return modifiers;
    }

    /**
     * Apply modifiers to base value
     * Uses BigInt exponential calculation for large token doubler counts to prevent freezing
     */
    applyModifiers(baseValue, modifiers, effectType) {
        // Check if this is a token creation effect
        const isTokenCreation = /^create_.*token/.test(effectType) || effectType.startsWith('orthion_copy');

        // Count total effective token doublers from all modifiers (including virtual stacks)
        let totalDoublers = 0n;
        modifiers.forEach(m => {
            if (m.type === 'double_tokens') {
                totalDoublers += BigInt(m.count || 1n);
            }
        });

        // For token creation with many doublers, use BigInt exponential calculation
        if (isTokenCreation && totalDoublers > BigInt(BIGINT_DOUBLER_THRESHOLD)) {
            let result = BigInt(baseValue);

            // Use BigInt for all operations to prevent precision loss or overflow
            modifiers.forEach(modifier => {
                if (modifier.multiplier) {
                    const mCount = BigInt(modifier.count || 1n);
                    const mValue = BigInt(Math.floor(modifier.multiplier));
                    // Multiply result by (multiplier ^ count)
                    // For doublers, this is result * 2^N
                    result *= mValue ** mCount;
                }
            });

            return {
                value: result,
                isBigInt: true,
                doublerCount: Number(totalDoublers) // Store for logging purposes (capped at Number limit for log)
            };
        }


        // Standard calculation for reasonable numbers
        let value = baseValue;

        modifiers.forEach(modifier => {
            if (modifier.multiplier) {
                // Apply the multiplier N times (for virtualized stacks)
                value *= Math.pow(modifier.multiplier, Number(modifier.count || 1n));
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

            log.description = `${source.name} triggered: Add ${finalValue} +1 / +1 counter(s) to ${targetDesc} `;
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
                buffNotation = `+ ${finalValue}/+0`;
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
        switch (ability.effect) {
            case 'add_counters':
            case 'double_counters':
                return this._handleCounterEffects(cards, targets, ability, value);

            case 'buff_creature':
                return this._handleBuffEffects(cards, targets, ability, value);

            case 'create_deferred_token':
            case 'create_attached_token':
            case 'create_token':
            case 'create_token_copy':
            case 'create_copy_token':
            case 'create_related_token':
            case 'create_named_token':
            case 'create_mobilize_warriors':
            case 'create_deferred_token_copy':
            case 'orthion_copy_single':
            case 'orthion_copy_five':
                return this._handleTokenEffects(cards, targets, ability, value, knownCards);

            case 'cleanup_existing_roles':
                const targetId = ability.target;
                return { ...this.performRoleCleanup(cards, targetId), triggers: [] };

            case 'sacrifice_cards':
            case 'destroy_permanent':
            case 'exile_permanent':
            case 'equip':
            case 'attach':
                return this._handlePermanentEffects(cards, targets, ability, value);

            default:
                return { newCards: cards, triggers: [] };
        }
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

    /**
     * Specialized handler for counter-related effects
     */
    _handleCounterEffects(cards, targets, ability, value) {
        let newCards = [...cards];
        if (ability.effect === 'add_counters') {
            targets.forEach(target => {
                const cardIndex = newCards.findIndex(c => c.id === target.id);
                if (cardIndex !== -1) {
                    const current = newCards[cardIndex].counters || 0;
                    let nextCounters;
                    if (typeof current === 'number') {
                        nextCounters = { '+1/+1': current + value };
                    } else {
                        const oldVal = current['+1/+1'] || 0;
                        nextCounters = { ...current, '+1/+1': oldVal + value };
                    }
                    newCards[cardIndex] = { ...newCards[cardIndex], counters: nextCounters };
                }
            });
        } else if (ability.effect === 'double_counters') {
            targets.forEach(target => {
                const cardIndex = newCards.findIndex(c => c.id === target.id);
                if (cardIndex !== -1) {
                    const current = newCards[cardIndex].counters || 0;
                    const oldVal = typeof current === 'number' ? current : (current['+1/+1'] || 0);
                    if (oldVal > 0) {
                        const modifiers = this.findReplacementEffects('add_counters', newCards);
                        const finalAdded = this.applyModifiers(oldVal, modifiers, 'add_counters');
                        newCards[cardIndex] = {
                            ...newCards[cardIndex],
                            counters: { ...(typeof current === 'object' ? current : {}), '+1/+1': oldVal + finalAdded }
                        };
                    }
                }
            });
        }
        return { newCards, triggers: [] };
    }

    /**
     * Specialized handler for temporary buff effects
     */
    _handleBuffEffects(cards, targets, ability, value) {
        let newCards = [...cards];
        const buffType = ability.buffType || 'both';
        let toughnessValue = value;

        if (ability.toughnessAmount && ability.toughnessAmount !== ability.amount) {
            toughnessValue = this.calculateBaseValue(
                targets.length > 0 ? targets[0] : (newCards.find(c => c.id === ability.sourceId) || {}),
                { ...ability, amount: ability.toughnessAmount },
                newCards
            );
        }

        targets.forEach(target => {
            const cardIndex = newCards.findIndex(c => c.id === target.id);
            if (cardIndex !== -1) {
                const currentCard = newCards[cardIndex];
                let pBonus = currentCard.tempPowerBonus || 0;
                let tBonus = currentCard.tempToughnessBonus || 0;

                if (['power', 'both', 'split'].includes(buffType)) pBonus += value;
                if (['toughness', 'both', 'split'].includes(buffType)) tBonus += toughnessValue;

                newCards[cardIndex] = { ...currentCard, tempPowerBonus: pBonus, tempToughnessBonus: tBonus };
            }
        });
        return { newCards, triggers: [] };
    }

    /**
     * Specialized handler for all token creation effects
     * Supports virtualized token stacks for astronomically large counts (BigInt)
     */
    _handleTokenEffects(cards, targets, ability, value, knownCards = []) {
        let newCards = [...cards];
        let newTriggers = [];

        // Check if value is a BigInt result object from applyModifiers
        const isBigResult = typeof value === 'object' && value.isBigInt;
        const tokenCount = isBigResult ? value.value : value;
        const isVirtualized = isBigResult || (typeof tokenCount === 'number' && tokenCount > MAX_PHYSICAL_TOKENS);

        // For virtualized tokens with extremely large counts, create a representative stack
        if (isVirtualized) {
            return this._createVirtualizedTokenStack(newCards, targets, ability, tokenCount, knownCards);
        }

        // Helper for sequential creation (only used for small counts now)
        const processSequentialTokens = (createFn, amount) => {
            for (let i = 0; i < amount; i++) {
                const token = createFn(i);
                newTriggers.push(...this.findTokenEntryTriggers(newCards, [token]));
                newCards.push(token);
            }
            return { newCards, triggers: newTriggers };
        };


        const target = targets[0];

        switch (ability.effect) {
            case 'create_deferred_token':
                const tokenName = ability.tokenName;
                const nextAbility = { ...ability, effect: 'create_attached_token', target: 'another_creature_you_control', requiresTarget: true };
                newTriggers.push({
                    id: `${Date.now()}-deferred-${Math.random()}`,
                    source: newCards.find(c => c.id === ability.sourceId) || { id: ability.sourceId, name: 'Source' },
                    trigger: 'deferred_token_creation',
                    ability: nextAbility,
                    description: `Create ${tokenName}`,
                    sourceName: ability.source?.name || 'Ability',
                    sourceArt: SIGNATURE_DATA[tokenName]?.art_crop || ability.source?.art_crop,
                    sourceRotation: SIGNATURE_DATA[tokenName]?.image_rotation || 0,
                    tokenTemplate: SIGNATURE_DATA[tokenName],
                    execute: (currentCards, _recent, currentTargets) => this.executeEffect(currentCards, currentTargets, nextAbility, 1, _recent)
                });
                return { newCards, triggers: newTriggers };

            case 'create_attached_token':
                if (!target) return { newCards, triggers: [] };
                const template = SIGNATURE_DATA[ability.tokenName] || { name: ability.tokenName, type: 'Token', type_line: 'Token' };
                const finalValue = this.applyModifiers(1, this.findReplacementEffects('create_token', newCards), 'create_token');
                const newTokens = Array.from({ length: finalValue }, (_, i) => ({
                    id: Date.now() + i + Math.random(),
                    name: template.name,
                    type: template.type || 'Enchantment',
                    type_line: template.type_line || 'Token Enchantment — Aura Role',
                    oracle_text: template.oracle_text || '',
                    power: template.power || 0,
                    toughness: template.toughness || 0,
                    attachedTo: target.id,
                    zone: 'attached',
                    isToken: true,
                    type: getTypeFromTypeLine(template.type_line || template.type || 'Enchantment'),
                    tapped: false,
                    counters: {},
                    colors: template.colors || ['W'],
                    abilities: template.abilities || [],
                    isRole: true
                }));

                if (template.isRole) {
                    const clean = this.performRoleCleanup(newCards, target.id);
                    return { newCards: [...clean.newCards, ...newTokens], triggers: this.findTokenEntryTriggers(clean.newCards, newTokens) };
                }
                return { newCards: [...newCards, ...newTokens], triggers: this.findTokenEntryTriggers(newCards, newTokens) };

            case 'create_token':
                return processSequentialTokens((i) => {
                    const t = targets[0] || { name: 'Token', type: 'Creature', power: 1, toughness: 1 };
                    return {
                        id: Date.now() + i + Math.random(),
                        name: `${t.name} Token`,
                        type: t.type || 'Creature',
                        type_line: t.isToken ? t.type_line : `Token ${t.type_line || 'Creature'}`,
                        power: t.power, toughness: t.toughness, counters: 0, isToken: true,
                        type: getTypeFromTypeLine(t.type_line || t.type || 'Creature'),
                        tapped: false, zone: 'battlefield'
                    };
                }, value);

            case 'create_token_copy':
            case 'create_copy_token':
                if (!target) return { newCards, triggers: [] };
                return processSequentialTokens((i) => {
                    let cleanType = (target.type_line || 'Creature').replace(/Legendary\s?/g, '');
                    if (!cleanType.toLowerCase().includes('token')) cleanType = `Token ${cleanType}`;
                    const tokenCopy = { ...target, id: Date.now() + i + Math.random(), type_line: cleanType, isToken: true, tapped: false, counters: 0, attachedTo: null, zone: 'battlefield' };
                    if (tokenCopy.abilities) {
                        tokenCopy.abilities.forEach(a => {
                            if (a.trigger === 'on_enter_battlefield') newTriggers.push(this.resolveEffect({ source: tokenCopy, ability: a }));
                        });
                    }
                    return tokenCopy;
                }, value);

            case 'create_related_token':
                const kCards = Array.isArray(knownCards) ? knownCards : [];
                const source = newCards.find(c => c.id === ability.sourceId) || targets[0] || kCards.find(c => c.relatedTokens?.length > 0);
                const related = source?.relatedTokens?.[0] || kCards.find(c => c.isToken || c.type_line?.includes('Token'));
                return processSequentialTokens((i) => related ? {
                    ...related, id: Date.now() + i + Math.random(), isToken: true, tapped: ability.tappedAndAttacking, attacking: ability.tappedAndAttacking, counters: 0, zone: 'battlefield', attachedTo: null,
                    type: related.type_line?.includes('Creature') ? 'Creature' : 'Token'
                } : {
                    id: Date.now() + i + Math.random(), name: 'Token', type: 'Creature', type_line: 'Token Creature', power: 1, toughness: 1, colors: [], counters: 0,
                    isToken: true, type: 'Creature', tapped: ability.tappedAndAttacking, attacking: ability.tappedAndAttacking, zone: 'battlefield'
                }, value);

            case 'create_named_token':
                return this._handleNamedTokenCreation(newCards, targets, ability, value, knownCards, newTriggers);

            case 'create_mobilize_warriors':
                const mkCards = Array.isArray(knownCards) ? knownCards : [];
                const equipSource = newCards.find(c => c.id === ability.sourceId) || ability.source || targets[0];
                const warriorData = equipSource?.relatedTokens?.find(t => t.name.toLowerCase().includes('warrior')) || mkCards.find(c => c.name.toLowerCase().includes('warrior'));
                const warriorIds = [];
                this.registerDelayedTrigger({ phase: 'end_step', effect: 'sacrifice_cards', targets: warriorIds, sourceId: equipSource?.id || 0, description: `Sacrifice ${value} Warriors` });

                return processSequentialTokens((i) => {
                    const w = {
                        ...(warriorData || { name: 'Warrior Token', type_line: 'Token Creature — Warrior', power: 1, toughness: 1, colors: ['R'] }),
                        id: Date.now() + i + Math.random(), isToken: true, tapped: true, attacking: true, counters: 0, zone: 'battlefield',
                        type: 'Creature'
                    };
                    warriorIds.push(w.id);
                    return w;
                }, value);

            case 'orthion_copy_single':
            case 'orthion_copy_five':
            case 'create_deferred_token_copy':
                return this._handleOrthionStyleCopies(newCards, targets, ability, value, newTriggers);

            default: return { newCards, triggers: newTriggers };
        }
    }

    /**
     * Specialized handler for removal and equipment/attachment
     */
    _handlePermanentEffects(cards, targets, ability, value) {
        let newCards = [...cards];
        const target = targets[0];
        if (!target) return { newCards, triggers: [] };

        if (['destroy_permanent', 'exile_permanent'].includes(ability.effect)) {
            const zone = ability.effect === 'destroy_permanent' ? 'graveyard' : 'exile';
            newCards = newCards.map(c => {
                if (c.id === target.id) return { ...c, zone, attachedTo: null, tapped: false };
                if (c.attachedTo === target.id) return { ...c, attachedTo: null };
                return c;
            });
        } else if (ability.effect === 'sacrifice_cards') {
            const ids = ability.targetIds || [];
            newCards = newCards.filter(c => !ids.includes(c.id));
        } else if (['equip', 'attach'].includes(ability.effect)) {
            newCards = newCards.map(c => c.id === ability.sourceId ? { ...c, attachedTo: target.id } : c);
        }
        return { newCards, triggers: [] };
    }

    /**
     * Logic for Orthion and Helm of the Host style copies
     */
    _handleOrthionStyleCopies(newCards, targets, ability, value, newTriggers) {
        const isOrthion = ability.effect.startsWith('orthion');
        const count = value || (ability.effect === 'orthion_copy_five' ? 5 : 1);
        const sourceCard = newCards.find(sc => sc.id === ability.sourceId);
        const template = isOrthion ? targets[0] : (ability.target === 'equipped_creature' ? (sourceCard ? newCards.find(c => c.id === sourceCard.attachedTo) : null) : targets[0]);

        if (!template) return { newCards, triggers: newTriggers };

        const ids = [];
        if (isOrthion) {
            this.registerDelayedTrigger({ phase: 'end_step', effect: 'sacrifice_cards', targets: ids, sourceId: ability.sourceId || 0, description: `Sacrifice ${count} ${template.name} tokens` });
        }

        for (let i = 0; i < count; i++) {
            const token = {
                ...template, id: Date.now() + Math.random() + i,
                type_line: (template.type_line || 'Creature').replace(/Legendary\s?/g, '').replace(/^/, 'Token '),
                isToken: true, tapped: false, counters: 0, attachedTo: null, zone: 'battlefield', haste: true
            };
            ids.push(token.id);
            newCards.push(token);
            newTriggers.push(...this.findTokenEntryTriggers(newCards, [token]), ...this.processEntersBattlefield(token));
        }
        return { newCards, triggers: newTriggers };
    }

    /**
     * Named token logic (helper for _handleTokenEffects)
     */
    _handleNamedTokenCreation(newCards, targets, ability, value, knownCards = [], newTriggers) {
        const tokenName = typeof ability.tokenName === 'function' ? ability.tokenName() : ability.tokenName;
        const amount = value || 1;
        const kCards = Array.isArray(knownCards) ? knownCards : [];
        const source = newCards.find(c => c.id === ability.sourceId) || targets[0] || kCards.find(c => c.relatedTokens?.length > 0);

        let template = localCardData.find(c => this._isMatch(c.name, tokenName)) ||
            source?.relatedTokens?.find(t => this._isMatch(t.name, tokenName)) ||
            SIGNATURE_DATA[tokenName] || SIGNATURE_DATA[tokenName.replace(' Role', '')];

        if (!template) return { newCards, triggers: newTriggers };

        for (let i = 0; i < amount; i++) {
            const token = {
                ...template, id: Date.now() + Math.random() + i, isToken: true, zone: 'battlefield', counters: 0,
                type_line: template.type_line || template.type
            };

            if (token.type_line?.includes('Role')) {
                newTriggers.push({
                    trigger: 'deferred_token_creation', source: ability.source || { id: ability.sourceId, name: tokenName },
                    description: `Create ${tokenName} Role`, requiresTarget: true,
                    ability: { target: 'another_creature_you_control', requiresTarget: true, effect: 'create_attached_token', tokenName: tokenName },
                    execute: (currentCards, _, manualTargets) => {
                        const t = manualTargets?.[0];
                        if (!t) return { newCards: currentCards, triggers: [] };
                        const role = { ...token, id: Date.now() + Math.random(), attachedTo: t.id, zone: 'attached' };
                        const clean = this.performRoleCleanup([...currentCards, role], t.id);
                        return { newCards: clean.newCards, triggers: [...this.findTokenEntryTriggers(currentCards, [role]), ...this.processEntersBattlefield(role)] };
                    }
                });
            } else {
                newCards.push(token);
                newTriggers.push(...this.findTokenEntryTriggers(newCards, [token]));
            }
        }
        return { newCards, triggers: newTriggers };
    }

    _isMatch(sName, pName) {
        if (!sName || !pName) return false;
        const s = sName.toLowerCase();
        const p = pName.toLowerCase().replace(' role', '').replace(' token', '').trim();
        return s.includes(p) || p.includes(s) || (s.includes('//') && s.split('//').some(f => f.trim().includes(p)));
    }

    /**
     * Creates a virtualized token stack for astronomically large token counts
     * Instead of creating 2^2058 individual tokens, creates:
     * - Up to MAX_PHYSICAL_TOKENS visual representative tokens
     * - One "virtual stack" token that holds the total count as BigInt
     */
    _createVirtualizedTokenStack(cards, targets, ability, totalCount, knownCards = []) {
        let newCards = [...cards];

        // Get token template
        const template = this._getTokenTemplateForVirtualization(targets[0], ability, knownCards, cards);
        if (!template) {
            console.warn('[VirtualStack] No template found for virtualization');
            return { newCards, triggers: [] };
        }

        // Convert to BigInt if not already
        const count = typeof totalCount === 'bigint' ? totalCount : BigInt(totalCount);
        const physicalCount = count > BigInt(MAX_PHYSICAL_TOKENS) ? MAX_PHYSICAL_TOKENS : Number(count);

        // Create visual representative tokens (max MAX_PHYSICAL_TOKENS)
        const tokens = [];
        for (let i = 0; i < physicalCount; i++) {
            tokens.push({
                ...template,
                id: Date.now() + i + Math.random(),
                isToken: true,
                zone: 'battlefield',
                tapped: ability.tappedAndAttacking || false,
                attacking: ability.tappedAndAttacking || false,
                counters: 0,
            });
        }

        // If we have more than MAX_PHYSICAL_TOKENS, create a virtual stack token
        if (count > BigInt(MAX_PHYSICAL_TOKENS)) {
            const remainingCount = count - BigInt(physicalCount);
            const formattedTotal = formatBigNumber(count);

            tokens.push({
                ...template,
                id: Date.now() + physicalCount + Math.random(),
                isToken: true,
                isVirtualStack: true,
                tokenCount: count,              // Total count as BigInt
                virtualStackSize: remainingCount, // How many are "hidden" in this stack
                zone: 'battlefield',
                tapped: ability.tappedAndAttacking || false,
                attacking: ability.tappedAndAttacking || false,
                counters: 0,
                // Update display name to show count
                displayName: `${template.name} (×${formattedTotal})`,
            });
        }



        console.log(`[VirtualStack] Created ${physicalCount} physical tokens + 1 virtual stack representing ${formatBigNumber(count)} total tokens`);

        return {
            newCards: [...newCards, ...tokens],
            triggers: [], // Skip individual ETB triggers for virtualized stacks to prevent cascading
        };
    }

    /**
     * Helper to get token template for virtualization
     */
    _getTokenTemplateForVirtualization(target, ability, knownCards, cards) {
        // Try to find template from various sources
        if (target) {
            let cleanType = (target.type_line || 'Creature').replace(/Legendary\s?/g, '');
            if (!cleanType.toLowerCase().includes('token')) cleanType = `Token ${cleanType}`;
            return {
                ...target,
                type_line: cleanType,
                name: target.name || 'Token',
            };
        }

        // Check for named token
        if (ability.tokenName) {
            const tokenName = typeof ability.tokenName === 'function' ? ability.tokenName() : ability.tokenName;
            const template = SIGNATURE_DATA[tokenName] || localCardData.find(c => this._isMatch(c.name, tokenName));
            if (template) return template;
        }

        // Check source's related tokens
        const source = cards.find(c => c.id === ability.sourceId);
        if (source?.relatedTokens?.[0]) {
            return source.relatedTokens[0];
        }

        // Fallback generic token
        return {
            name: 'Token',
            type: 'Creature',
            type_line: 'Token Creature',
            power: 1,
            toughness: 1,
            colors: [],
        };
    }
}


export default GameEngine;
