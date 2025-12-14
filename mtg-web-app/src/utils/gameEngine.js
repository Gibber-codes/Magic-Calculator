/**
 * MTG Game Engine
 * Handles phase management, triggered abilities, and replacement effects
 */

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
        });

        // 2. Check global "Whenever a creature (you control) attacks"
        // (Not implemented yet, but placeholders would go here)

        return triggers;
    }

    /**
     * Process Enters the Battlefield triggers for a specific card
     */
    processEntersBattlefield(enteringCard) {
        const triggers = [];
        if (!enteringCard || !enteringCard.abilities) return triggers;

        enteringCard.abilities.forEach(ability => {
            if (ability.trigger === 'on_enter_battlefield') {
                triggers.push({
                    source: enteringCard,
                    ability: ability
                });
            }
        });

        return triggers.map(trigger => this.resolveEffect(trigger));
    }

    /**
     * Resolve a triggered ability effect into a "trigger object"
     * IMPORTANT: We do NOT precompute X here.
     * X / baseValue is recomputed inside trigger.execute(cards) at RESOLUTION time,
     * so earlier triggers can change the board (e.g. buff other Ouroboroids).
     */
    resolveEffect(trigger) {
        const { source, ability } = trigger;

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
             * - Recomputes source (live version from cards)
             * - Recomputes baseValue (X)
             * - Recomputes targets and replacement effects
             * - Applies effect
             * - Updates result.log so UI logs are accurate
             */
            execute: (cards, knownCards = []) => {
                const currentCards = cards || this.cards || [];

                // Get the live source from the current board state
                const liveSource =
                    currentCards.find(c => c.id === source.id) || source;

                // Calculate base effect (e.g. X = this.power = base + counters)
                const baseValue = this.calculateBaseValue(liveSource, ability);

                // Determine targets from CURRENT board
                const targets = ability.targetIds
                    ? currentCards.filter(c => ability.targetIds.includes(c.id))
                    : this.findTargets(ability.target, currentCards, liveSource);

                // Check for replacement effects from CURRENT board
                const modifiers = this.findReplacementEffects(
                    ability.effect,
                    currentCards
                );

                // Apply modifiers (Doubling Season, etc.)
                const finalValue = this.applyModifiers(
                    baseValue,
                    modifiers,
                    ability.effect
                );

                // Generate a fresh log
                const log = this.generateLog(
                    liveSource,
                    ability,
                    baseValue,
                    finalValue,
                    modifiers,
                    targets
                );

                // Update the trigger object so UI can read accurate info
                result.baseValue = baseValue;
                result.finalValue = finalValue;
                result.targets = targets;
                result.modifiers = modifiers;
                result.log = log;

                // Actually apply the effect
                const newCards = this.executeEffect(
                    currentCards,
                    targets,
                    ability,
                    finalValue,
                    knownCards
                );

                return newCards;
            },
        };

        return result;
    }

    /**
     * Calculate the base value for an effect
     * Handles "this.power" as basePower + +1/+1 counters
     */
    calculateBaseValue(source, ability) {
        const amount = ability.amount;

        // Handle dynamic values like "this.power"
        if (typeof amount === 'string' && amount.startsWith('this.')) {
            const property = amount.split('.')[1];

            // For power: printed power + +1/+1 counters
            if (property === 'power') {
                const basePower = parseInt(source.power) || 0;
                const counters = parseInt(source.counters) || 0;
                return basePower + counters;
            }

            const value = source[property];
            return parseInt(value) || 0;
        }

        // Handle static numeric values
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

            case 'target_creature_you_control':
                // For now, treat as "all creatures you control";
                // UI could eventually refine this to pick a single one.
                return pool.filter(c => c.type === 'Creature');

            case 'creature':
                // Used for "another target creature"
                return pool.filter(c => c.type_line && c.type_line.includes('Creature'));

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

        if (ability.effect === 'create_token') {
            log.description = `${source.name} triggered: Create ${finalValue} token(s)`;
            log.equation = `Base: ${baseValue} token(s)`;
        }

        if (ability.effect === 'create_token_copy') {
            log.description = `${source.name} triggered: Create ${finalValue} token copy(s)`;
            log.equation = `Base: ${baseValue} copy(s)`;
        }

        if (ability.effect === 'create_named_token') {
            log.description = `${source.name} triggered: Create ${finalValue} ${ability.tokenName || ''} token(s)`;
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
     */
    executeEffect(cards, targets, ability, value) {
        const newCards = [...cards];

        if (ability.effect === 'add_counters') {
            targets.forEach(target => {
                const cardIndex = newCards.findIndex(c => c.id === target.id);
                if (cardIndex !== -1) {
                    newCards[cardIndex] = {
                        ...newCards[cardIndex],
                        counters: (newCards[cardIndex].counters || 0) + value,
                    };
                }
            });
        }

        if (ability.effect === 'create_token') {
            // Basic generic token creation: copies the source stats if possible
            // You can expand this later for specific token definitions.
            const tokenTargets = targets.length ? targets : [];
            const newTokens = [];

            tokenTargets.forEach(target => {
                for (let i = 0; i < value; i++) {
                    newTokens.push({
                        id: Date.now() + i + Math.random(),
                        name: `${target.name} Token`,
                        type: 'Creature',
                        power: target.power,
                        toughness: target.toughness,
                        counters: 0,
                        isToken: true,
                        tapped: false,
                        zone: 'battlefield',
                    });
                }
            });

            return [...newCards, ...newTokens];
        }

        if (ability.effect === 'create_token_copy') {
            const tokenTargets = targets.length ? targets : [];
            const newTokens = [];

            tokenTargets.forEach(target => {
                for (let i = 0; i < value; i++) {
                    // Logic for Helm of the Host: Non-legendary copy with Haste
                    // We remove "Legendary" from type line and ensure clean state
                    let cleanTypeLine = target.type_line
                        ? target.type_line.replace('Legendary ', '').replace('Legendary', '')
                        : target.type_line || 'Creature';

                    // Ensure "Token" is in the type line
                    if (!cleanTypeLine.toLowerCase().includes('token')) {
                        cleanTypeLine = `Token ${cleanTypeLine}`;
                    }

                    newTokens.push({
                        ...target, // Copy all props
                        id: Date.now() + i + Math.random(), // New ID
                        type_line: cleanTypeLine,
                        isToken: true,
                        tapped: false,
                        counters: 0,
                        attachedTo: null, // Don't copy attachments
                        zone: target.zone || 'battlefield', // Ensure visibility
                        // We could add "Haste" to keywords if we had a keyword array, 
                        // for now we trust the game state or visual indicator isn't strict.
                        // Ideally we'd add it to proper keyword state.
                    });
                }
            });

            return [...newCards, ...newTokens];
        }

        if (ability.effect === 'create_named_token') {
            const tokenName = ability.tokenName || 'Token';
            const amount = value || 1;
            const newTokens = [];

            // Token Definitions
            const tokenDefs = {
                'Lander': {
                    type: 'Token Artifact',
                    type_line: 'Token Artifact',
                    power: 0,
                    toughness: 0,
                    colors: [],
                    art_crop: 'https://cards.scryfall.io/art_crop/front/8/5/85ef1950-219f-401b-8ff5-914f9aaec122.jpg?1752946491',
                    image_normal: 'https://cards.scryfall.io/large/front/8/5/85ef1950-219f-401b-8ff5-914f9aaec122.jpg?1752946491'
                },
                'Treasure': { type: 'Token Artifact — Treasure', type_line: 'Token Artifact — Treasure', power: 0, toughness: 0, colors: [] },
                'Food': { type: 'Token Artifact — Food', type_line: 'Token Artifact — Food', power: 0, toughness: 0, colors: [] },
                'Clue': { type: 'Token Artifact — Clue', type_line: 'Token Artifact — Clue', power: 0, toughness: 0, colors: [] }
            };

            // Locate source to find relatedTokens (assuming target is self/source)
            const sourceCard = targets[0];

            // Helper for flexible matching:
            // 1. Exact Name match
            // 2. Token Name includes the Scryfall Token Name (e.g. "1/1 white Soldier creature" includes "Soldier")
            // 3. Scryfall Token Name includes Token Name (e.g. "Lander" includes "Lander")
            const isMatch = (scryfallName, parsedName) => {
                const s = scryfallName.toLowerCase();
                const p = parsedName.toLowerCase();
                return s === p || p.includes(s) || s.includes(p);
            };

            // 1. Check Source's specific related tokens
            let relatedToken = sourceCard?.relatedTokens?.find(t => isMatch(t.name, tokenName));

            // 2. If not found, check the GLOBAL known cards (Recents/Common)
            if (!relatedToken && knownCards.length > 0) {
                relatedToken = knownCards.find(c =>
                    (c.isToken || (c.type_line && c.type_line.includes('Token'))) &&
                    isMatch(c.name, tokenName)
                );
            }
            // Priority: 0. Scryfall Related Token, 1. Parsed Props, 2. Hardcoded Def, 3. Generic Default
            const hardcoded = tokenDefs[tokenName];
            const parsed = ability.tokenProps;

            const type = relatedToken
                ? (relatedToken.type_line || 'Token')
                : (parsed?.type || hardcoded?.type || 'Token Creature');

            const power = relatedToken
                ? (parseInt(relatedToken.power) || 0)
                : (parsed?.power !== undefined ? parsed.power : (hardcoded?.power !== undefined ? hardcoded.power : 1));

            const toughness = relatedToken
                ? (parseInt(relatedToken.toughness) || 0)
                : (parsed?.toughness !== undefined ? parsed.toughness : (hardcoded?.toughness !== undefined ? hardcoded.toughness : 1));

            const colors = relatedToken
                ? (relatedToken.colors || [])
                : (parsed?.colors || hardcoded?.colors || []);

            // If we have a real token image, let's use it!
            const image = relatedToken ? relatedToken.image_normal : hardcoded?.image_normal;
            const art = relatedToken ? relatedToken.art_crop : hardcoded?.art_crop;

            for (let i = 0; i < amount; i++) {
                // If we found a specific related token from Scryfall, clone it directly
                // This ensures we get Art, Oracle Text, Abilities, etc.
                if (relatedToken) {
                    newTokens.push({
                        ...relatedToken, // Spread full Scryfall object
                        id: Date.now() + i + Math.random(),
                        isToken: true,
                        tapped: false, // Default unless modified by 'tapped and attacking' later
                        counters: 0,
                        zone: 'battlefield',
                        // Ensure essential internals aren't overwritten by old data if any
                        attachedTo: null
                    });
                } else {
                    // Fallback to manual construction
                    newTokens.push({
                        id: Date.now() + i + Math.random(),
                        name: `${tokenName} Token`,
                        type: type,
                        type_line: type,
                        power: power,
                        toughness: toughness,
                        colors: colors,
                        counters: 0,
                        isToken: true,
                        tapped: false,
                        zone: 'battlefield',
                        image_normal: image,
                        art_crop: art
                    });
                }
            }
            return [...newCards, ...newTokens];
        }

        if (ability.effect === 'orthion_copy_single' || ability.effect === 'orthion_copy_five') {
            // Log specific for Orthion
            // Find target (should be passed in targets array)
            const target = targets[0];
            if (!target) return newCards; // Should have a target

            // Use calculated value (which includes modifiers) instead of checking effect name again
            const count = value || (ability.effect === 'orthion_copy_five' ? 5 : 1);
            const newTokens = [];

            for (let i = 0; i < count; i++) {
                // Clean up type line (remove Legendary)
                let cleanTypeLine = target.type_line
                    ? target.type_line.replace('Legendary ', '').replace('Legendary', '')
                    : target.type_line || 'Creature';

                if (!cleanTypeLine.toLowerCase().includes('token')) {
                    cleanTypeLine = `Token ${cleanTypeLine}`;
                }

                newTokens.push({
                    ...target,
                    id: Date.now() + i + Math.random(),
                    type_line: cleanTypeLine,
                    isToken: true,
                    tapped: false,
                    counters: 0,
                    attachedTo: null,
                    zone: 'battlefield',
                    haste: true // Explicitly grant haste
                });
            }

            // Register Delayed Trigger to sacrifice these specific tokens
            this.registerDelayedTrigger({
                phase: 'end_step',
                effect: 'sacrifice_cards',
                targets: newTokens.map(t => t.id),
                sourceId: ability.sourceId || 0, // Should be passed when resolving
                description: `Sacrifice ${count} ${target.name} token(s) created by Orthion`
            });

            return [...newCards, ...newTokens];
        }

        if (ability.effect === 'sacrifice_cards') {
            // Remove specific cards by ID
            // ability.targetIds contains the IDs
            const idsToRemove = ability.targetIds || [];
            return newCards.filter(c => !idsToRemove.includes(c.id));
        }

        return newCards;
    }

    /**
     * Process a manual action (like adding a counter to a specific card)
     * (This part is basically unchanged from your original engine)
     */
    processAction(action, targetCard, cards) {
        const result = {
            newCards: [...cards],
            log: {
                description: '',
                equation: '',
                modifierSteps: [],
            },
        };

        if (!targetCard) return result;

        if (action === 'counter+') {
            const modifiers = this.findReplacementEffects('add_counters', result.newCards);
            const baseValue = 1;
            const finalValue = this.applyModifiers(baseValue, modifiers, 'add_counters');

            result.newCards = result.newCards.map(c =>
                c.id === targetCard.id
                    ? { ...c, counters: (c.counters || 0) + finalValue }
                    : c
            );

            result.log.description = `Added counter(s) to ${targetCard.name}`;
            result.log.equation = `Base: +${baseValue} counter`;
            result.log.modifierSteps = modifiers.map(mod => ({
                source: mod.source.name,
                description: `${mod.source.name}: ×${mod.multiplier} = +${finalValue} counters`,
            }));
        }

        if (action === 'counter-') {
            result.newCards = result.newCards.map(c =>
                c.id === targetCard.id
                    ? { ...c, counters: Math.max(0, (c.counters || 0) - 1) }
                    : c
            );

            result.log.description = `Removed counter from ${targetCard.name}`;
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

        return result;
    }
}

export default GameEngine;
