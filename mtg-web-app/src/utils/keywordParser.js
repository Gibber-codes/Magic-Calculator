import { SIGNATURE_DATA } from '../data/signatureCards';

// ============================================
// TRIGGER PATTERNS
// ============================================

export const TRIGGER_PATTERNS = [
    // Helm of the Host trigger
    {
        pattern: /at the beginning of combat on your turn/i,
        trigger: 'beginning_of_combat',
        condition: 'your_turn'
    },
    // Ouroboroid trigger (same as Helm but explicit in case of variations)
    // Ouroboroid trigger (same as Helm but explicit in case of variations)
    // Duplicate removed

    // Mobilize X (Equipment-granted attack trigger)
    {
        pattern: /mobilize X, where X is its power.*?\(Whenever it attacks, create X tapped and attacking/i,
        trigger: 'on_attack',
        target: 'equipped_creature', // Special target for equipment-granted abilities
        grantedBy: 'equipment' // Mark this as equipment-granted
    },
    // Equipped Creature Attack Trigger (Captain's Claws/Hammer of Nazahn)
    {
        pattern: /whenever equipped creature attacks/i,
        trigger: 'on_attack',
        target: 'equipped_creature',
        grantedBy: 'equipment'
    },
    // Generic "Whenever [Card Name] attacks" Trigger (Hero of Bladehold)
    // Matches "Whenever Hero of Bladehold attacks" but EXCLUDES "this creature" to avoid double triggers
    {
        pattern: /whenever (?!an opponent|this creature)(?:.*?) attacks/i,
        trigger: 'on_attack',
        target: 'this'
    },
    // Attack Trigger
    {
        pattern: /whenever this creature attacks/i,
        trigger: 'on_attack',
        target: 'this'
    },
    // Enters or Attacks Trigger (Ellivere)
    {
        pattern: /whenever (.*) enters or attacks/i,
        trigger: 'on_enter_or_attack',
        target: 'self'
    },
    // Enters the Battlefield Trigger
    {
        pattern: /when (.*) enters( the battlefield)?/i,
        trigger: 'on_enter_battlefield',
        target: 'self'
    },
    // Token Entry Trigger (Wildwood Mentor)
    {
        pattern: /Whenever a token you control enters/i,
        trigger: 'on_token_enter_battlefield',
        target: 'self'
    },
    // Landfall (Mossborn Hydra)
    {
        pattern: /Whenever a land you control enters/i,
        trigger: 'on_land_enter_battlefield',
        target: 'self'
    },
];

// ============================================
// EFFECT PATTERNS
// ============================================

export const EFFECT_PATTERNS = [
    // =====================
    // ORTHION PATTERNS (Must be FIRST - very specific, and text matches generic patterns too)
    // =====================
    {
        pattern: /create a token that.*copy of.*target creature you control/i,
        effect: 'orthion_copy_single',
        target: 'target_creature_you_control'
    },
    {
        pattern: /create five tokens that.*copies of.*target creature you control/i,
        effect: 'orthion_copy_five',
        target: 'target_creature_you_control'
    },

    // =====================
    // SPECIFIC EFFECTS
    // =====================
    // Helm of the Host effect - create token copy
    {
        pattern: /create a token that's a copy of equipped creature/i,
        effect: 'create_token_copy',
        target: 'equipped_creature'
    },
    // Ouroboroid effect - put X +1/+1 counters on each creature you control
    {
        pattern: /put X \+1\/\+1 counters on each creature you control, where X is this creature's power/i,
        effect: 'add_counters',
        amount: 'this.power',
        target: 'all_creatures_you_control'
    },
    // Add counters to self (Wildwood Mentor)
    {
        pattern: /put a \+1\/\+1 counter on this creature/i,
        effect: 'add_counters',
        amount: 1,
        target: 'self'
    },
    // Double counters on self (Mossborn Hydra)
    {
        pattern: /double the number of \+1\/\+1 counters on this creature/i,
        effect: 'double_counters',
        target: 'self'
    },
    // Wildwood Mentor attack trigger - give +X/+X to another attacking creature
    {
        pattern: /another target attacking creature gets \+X\/\+X.*where X is this creature's power/i,
        effect: 'buff_creature',
        amount: 'this.power',
        target: 'another_attacking_creature'
    },
    // Battle Cry (Hero of Bladehold)
    {
        pattern: /each other attacking creature gets \+1\/\+0/i,
        effect: 'buff_creature',
        amount: 1,
        target: 'all_other_attacking_creatures',
        buffType: 'power' // Only add to power
    },
    // Create Attached Token (Ellivere)
    {
        pattern: /create (?:an?|two|three) (.*?) tokens? attached to (.*)/i,
        effect: 'create_attached_token',
        parseTarget: (match) => match[2].trim().toLowerCase().replace(/\s+/g, '_'),
        parseTokenName: (match) => match[1].trim()
    },

    // =====================
    // MOBILIZE X PATTERN (Equipment-specific)
    // =====================
    {
        pattern: /create X tapped and attacking (?:\d+\/\d+ )?(?:\w+ )?(\w+) creature tokens/i,
        effect: 'create_mobilize_warriors',
        amount: 'equipped_creature.power', // X = equipped creature's power
        target: 'battlefield',
        parseTokenName: (match) => match[1], // Extract just the subtype (e.g., "Warrior")
        delayedEffect: 'sacrifice_at_end_step'
    },

    // =====================
    // GENERIC FALLBACK PATTERNS (Must be LAST)
    // =====================
    // Creation of generic token copy (fallback)
    {
        pattern: /create (.*) tokens? that (are|is a) cop(ies|y) of (it|this creature)/i,
        effect: 'create_token_copy',
        target: 'self',
        parseAmount: (match) => {
            const amountStr = match[1].toLowerCase();
            const numberMap = { 'a': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
            return numberMap[amountStr] || parseInt(amountStr) || 1;
        }
    },
    // Create tokens using Scryfall related token data
    // Only parses: amount + tapped/attacking flag. Actual token data comes from source.relatedTokens
    // EXCLUDES copy effects (handled separately)
    {
        pattern: /create (?:an?|two|three|four|five|\d+) (?:\d+\/\d+ )?(?!tokens? that)[^.]*?tokens?(?: that are)?(?: tapped and attacking)?/i,
        effect: 'create_related_token',
        target: 'self',
        parseAmount: (match) => {
            const fullMatch = match[0].toLowerCase();
            if (fullMatch.includes('two')) return 2;
            if (fullMatch.includes('three')) return 3;
            if (fullMatch.includes('four')) return 4;
            if (fullMatch.includes('five')) return 5;
            // Check for numeric (e.g., "create 3 tokens")
            const numMatch = fullMatch.match(/create (\d+)/);
            if (numMatch) return parseInt(numMatch[1]);
            return 1;
        },
        parseTappedAndAttacking: (match) => {
            return match[0].toLowerCase().includes('tapped and attacking');
        }
    },
    // Create named token (e.g. "Create a Lander token") and optionally parse props from reminder text
    // E.g. "create a Lander token. (It's an artifact with...)"
    {
        pattern: /create (?:an?|two|three|four) (.*?) tokens?[\s\S]*?(?:\(It(?:'s| is) ([\s\S]*?)\))?/i,
        effect: 'create_named_token',
        target: 'self',
        parseAmount: (match) => {
            const fullMatch = match[0].toLowerCase();
            if (fullMatch.includes('two')) return 2;
            if (fullMatch.includes('three')) return 3;
            return 1;
        },
        parseName: (match) => match[1].trim(),
        parseProperties: (match) => {
            const description = match[2]; // Capture group 2 is the description part (because of non-capturing groups)
            if (!description) return null;

            // Simple heuristics
            const props = { type: 'Token', power: 0, toughness: 0, colors: [] };
            const lowerDesc = description.toLowerCase();

            // Type
            if (lowerDesc.includes('artifact')) props.type = 'Token Artifact';
            if (lowerDesc.includes('creature')) props.type = 'Token Creature';
            if (lowerDesc.includes('enchantment')) props.type = 'Token Enchantment';
            if (lowerDesc.includes('construct')) props.type_line += ' — Construct'; // Example
            // Stats (e.g. "2/2")
            const statMatch = description.match(/(\d+)\/(\d+)/);
            if (statMatch) {
                props.power = parseInt(statMatch[1]);
                props.toughness = parseInt(statMatch[2]);
            }
            // Colors
            if (lowerDesc.includes('red')) props.colors.push('R');
            if (lowerDesc.includes('green')) props.colors.push('G');
            if (lowerDesc.includes('blue')) props.colors.push('U');
            if (lowerDesc.includes('black')) props.colors.push('B');
            if (lowerDesc.includes('white')) props.colors.push('W');
            if (lowerDesc.includes('colorless')) props.colors = [];

            // Refine Type Line if it's a creature
            if (lowerDesc.includes('creature')) {
                // Try to find subtypes? Too complex for regex, just default to Token Creature
            }

            return props;
        }
    }
];

// ============================================
// REPLACEMENT EFFECT PATTERNS
// ============================================

export const REPLACEMENT_PATTERNS = [
    // Active voice: Doubling Season ("If an effect would create one or more tokens...")
    {
        pattern: /if.*would.*create.*one or more.*tokens.*twice that many.*instead/i,
        type: 'double_tokens',
        scope: 'all_tokens'
    },
    // Passive voice: Mondrak ("If one or more tokens would be created...")
    {
        pattern: /if one or more tokens would be created.*twice that many.*tokens are created instead/i,
        type: 'double_tokens',
        scope: 'all_tokens'
    },
    // Active voice: Doubling Season ("If an effect would place one or more counters...")
    {
        pattern: /if.*would.*(put|place|placed).*one or more.*counters.*twice that many.*instead/i,
        type: 'double_counters',
        scope: 'all_counters'
    },
    // Passive voice: Vorinclex ("If one or more ... counters would be put...")
    {
        pattern: /if.*one or more.*counters would.*(put|place|placed).*twice that many.*instead/i,
        type: 'double_counters',
        scope: 'all_counters'
    },
];

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * Extract triggered abilities from oracle text
 */
export function extractTriggers(oracleText) {
    if (!oracleText) return [];

    const triggers = [];

    // Split oracle text into sentences (by newline)
    const sentences = oracleText.split(/\n/);

    for (const { pattern, ...triggerData } of TRIGGER_PATTERNS) {
        // Find ALL matching sentences
        const matchingSentences = sentences.filter(sentence => pattern.test(sentence));

        if (matchingSentences.length > 0) {
            // Process each matching sentence
            matchingSentences.forEach(matchingSentence => {
                const effects = extractEffects(matchingSentence);
                // Only add if we actually found effects (optional optimization, but good for filtering out Reminder Text that doesn't have effects we support yet)
                // Actually, finding no effects might be valid if we default to 'unknown'
                triggers.push({
                    ...triggerData,
                    effects: effects.length > 0 ? effects : [{ effect: 'unknown' }],
                    original: matchingSentence
                });
            });
        } else if (pattern.test(oracleText)) {
            // Fallback: Check full text if no individual sentence matched (e.g. multi-line patterns)
            const effects = extractEffects(oracleText);
            triggers.push({
                ...triggerData,
                effects: effects.length > 0 ? effects : [{ effect: 'unknown' }],
                original: oracleText
            });
        }
    }

    return triggers;
}

/**
 * Extract effects from oracle text
 */
export function extractEffects(oracleText) {
    if (!oracleText) return [];

    const effects = [];

    for (const { pattern, parseAmount, parseName, parseProperties, parseTarget, parseTokenName, parseTappedAndAttacking, ...effectData } of EFFECT_PATTERNS) {
        const match = oracleText.match(pattern);
        if (match) {
            const effect = { ...effectData };
            if (parseAmount) {
                effect.amount = parseAmount(match);
            }
            if (parseName) {
                effect.tokenName = parseName(match);
            }
            if (parseProperties) {
                effect.tokenProps = parseProperties(match);
            }
            if (parseTarget) {
                effect.target = parseTarget(match);
            }
            if (parseTokenName) {
                effect.tokenName = parseTokenName(match);
            }
            if (parseTappedAndAttacking) {
                effect.tappedAndAttacking = parseTappedAndAttacking(match);
            }
            effects.push(effect);
        }
    }

    return effects;
}

/**
 * Extract "Enters the battlefield with X +1/+1 counters"
 */
export function extractEntersWithCounters(oracleText) {
    if (!oracleText) return 0;

    // Pattern: "enters the battlefield with [amount] +1/+1 counters"
    // Also matches "Hydra enters with..."
    const pattern = /enters(?: the battlefield)? with (an?|one|two|three|four|five|six|seven|eight|nine|ten|\d+) \+1\/\+1 counters?(?: on it)?/i;
    const match = oracleText.match(pattern);

    if (match) {
        const amountStr = match[1].toLowerCase();
        const numberMap = {
            'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3,
            'four': 4, 'five': 5, 'six': 6, 'seven': 7,
            'eight': 8, 'nine': 9, 'ten': 10
        };
        return numberMap[amountStr] || parseInt(amountStr) || 0;
    }

    return 0;
}

/**
 * Extract replacement effects from oracle text
 */
export function extractReplacementEffects(oracleText) {
    if (!oracleText) return [];

    const replacements = [];

    for (const { pattern, ...replacementData } of REPLACEMENT_PATTERNS) {
        if (pattern.test(oracleText)) {
            replacements.push(replacementData);
        }
    }

    return replacements;
}

/**
 * Extract activated abilities from oracle text
 * Looks for "Cost: Effect" pattern
 */
export function extractActivatedAbilities(oracleText) {
    if (!oracleText) return [];

    return oracleText.split('\n')
        .map(line => {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex === -1) return null;

            const cost = line.substring(0, separatorIndex).trim();
            const effect = line.substring(separatorIndex + 1).trim();

            // Filter out non-ability lines that might have colons (unlikely in oracle text but good to be safe)
            // e.g. "Flavor text: quoted" - Scryfall oracle text shouldn't have flavor text usually, but
            // some keywords might be formatted differently.
            // Valid costs mostly contain symbols {}, numbers, or keywords "Sacrifice", "Pay".

            return { cost, effect, original: line };
        })
        .filter(Boolean);
}

/**
 * Full parse of oracle text into game-ready structure
 */
export function parseOracleText(card) {
    const oracleText = card.oracle_text || '';

    // Extract Aura target (e.g., "Enchant creature", "Enchant permanent")
    const enchantMatch = oracleText.match(/^Enchant\s+(.+)$/im);
    const auraTarget = enchantMatch ? enchantMatch[1].trim().toLowerCase() : null;

    return {
        triggers: extractTriggers(oracleText),
        effects: extractEffects(oracleText),
        replacementEffects: extractReplacementEffects(oracleText),
        activated: extractActivatedAbilities(oracleText),
        entersWithCounters: extractEntersWithCounters(oracleText),
        auraTarget: auraTarget
    };
}

/**
 * Get card abilities - prefers manual definitions, falls back to parsing
 */
export function getCardAbilities(card) {
    // Priority 1: Use Signature Data for special cards
    const signature = SIGNATURE_DATA[card.name];
    if (signature) {
        return {
            abilities: signature.abilities || [],
            replacementEffects: signature.replacementEffects || [],
            keywords: signature.keywords || [],
            parsed: false,
            isSignature: true
        };
    }

    // Priority 2: Use manually defined abilities
    let abilities = card.abilities || [];
    let replacements = card.replacementEffects || [];
    let keywords = card.keywords || [];

    // If no abilities are manually defined, or if replacement effects/keywords are missing,
    // we proceed to parse the oracle text.
    if (abilities.length === 0 || replacements.length === 0 || keywords.length === 0) {
        // Priority 3: Parse from oracle text
        const parsed = parseOracleText(card);

        // Convert triggers to abilities format expected by gameEngine
        const triggeredAbilities = [];
        parsed.triggers.forEach(t => {
            const baseAbility = {
                condition: t.condition,
                grantedBy: t.grantedBy,
                effect: t.effects[0]?.effect || 'unknown',
                target: t.effects[0]?.target || 'self',
                amount: t.effects[0]?.amount,
                tokenName: t.effects[0]?.tokenName,
                tokenProps: t.effects[0]?.tokenProps,
                tappedAndAttacking: t.effects[0]?.tappedAndAttacking,
                buffType: t.effects[0]?.buffType,
                delayedEffect: t.effects[0]?.delayedEffect,
                description: t.description || t.effects[0]?.effect || 'Triggered ability'
            };

            if (t.trigger === 'on_enter_or_attack') {
                triggeredAbilities.push({ ...baseAbility, trigger: 'on_enter_battlefield' });
                triggeredAbilities.push({ ...baseAbility, trigger: 'on_attack' });
            } else {
                triggeredAbilities.push({ ...baseAbility, trigger: t.trigger });
            }
        });

        // Convert Activated Abilities to gameEngine format
        const activatedAbilities = parsed.activated.map((ability) => {
            const found = extractEffects(ability.effect);
            let effectData = (found && found.length > 0) ? found[0] : { effect: 'unknown' };

            return {
                trigger: 'activated',
                cost: ability.cost,
                effect: effectData.effect,
                target: effectData.target || 'target_creature_you_control',
                amount: effectData.amount,
                tokenName: effectData.tokenName,
                tokenProps: effectData.tokenProps,
                buffType: effectData.buffType,
                description: ability.original
            };
        });

        abilities = abilities.length > 0 ? abilities : [...triggeredAbilities, ...activatedAbilities];
        replacements = replacements.length > 0 ? replacements : parsed.replacementEffects;
        keywords = keywords.length > 0 ? keywords : parsed.keywords;
    }

    return {
        abilities,
        replacementEffects: replacements,
        keywords,
        parsed: true
    };
}

export default {
    extractTriggers,
    extractEffects,
    extractReplacementEffects,
    extractActivatedAbilities,
    parseOracleText,
    getCardAbilities,
    TRIGGER_PATTERNS,
    EFFECT_PATTERNS,
    REPLACEMENT_PATTERNS,
};