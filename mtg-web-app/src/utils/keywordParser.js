import { SIGNATURE_DATA } from '../data/signatureCards';
import {
    KEYWORD_HANDLERS,
    getKeywordType,
    parseKeywordAbility,
    ABILITY_KEYWORDS,
    EVASION_KEYWORDS,
    COMBAT_KEYWORDS,
    PROTECTION_KEYWORDS,
    POWER_TOUGHNESS_KEYWORDS,
    RESTRICTION_KEYWORDS
} from './keywordHandlers';
import { parseTokenProperties, parseTokenAmount, parseTappedAndAttacking } from './tokenParsing';

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
    // Landfall (Mossborn Hydra / Lotus Cobra)
    {
        pattern: /Whenever a land (?:you control enters|enters the battlefield under your control)/i,
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
    // Add counters to self (Wildwood Mentor / Mossborn Hydra variations)
    {
        pattern: /put (a|one|two|three|X) \+1\/\+1 counters? on (?:this creature|it)/i,
        effect: 'add_counters',
        parseAmount: (match) => {
            const val = (match[1] || 'a').toLowerCase();
            const map = { 'a': 1, 'one': 1, 'two': 2, 'three': 3 };
            if (val === 'x') return 'this.power'; // Heuristic
            return map[val] || parseInt(val) || 1;
        },
        target: 'self'
    },
    // Add counters to target
    {
        pattern: /put (a|one|two|three) \+1\/\+1 counters? on target creature/i,
        effect: 'add_counters',
        parseAmount: (match) => {
            const val = (match[1] || 'a').toLowerCase();
            const map = { 'a': 1, 'one': 1, 'two': 2, 'three': 3 };
            return map[val] || parseInt(val) || 1;
        },
        target: 'target_creature'
    },
    // Double counters on self (Mossborn Hydra)
    {
        pattern: /double the number of \+1\/\+1 counters on this creature/i,
        effect: 'double_counters',
        target: 'self'
    },
    // Battle Cry (Hero of Bladehold) - MUST come before generic buff pattern
    {
        pattern: /each other attacking creature gets \+1\/\+0/i,
        effect: 'buff_creature',
        amount: 1,
        target: 'all_other_attacking_creatures',
        buffType: 'power' // Only add to power
    },
    // Buff creature (generic gets +X/+X or +X/+Y)
    {
        pattern: /(.*) (?:gets|gain\(s\)) \+([X\d]+)\/\+([X\d]+)/i,
        effect: 'buff_creature',
        parseAmount: (match) => {
            if (match[2] === 'X') return 'this.power';
            return parseInt(match[2]);
        },
        parseToughnessAmount: (match) => {
            if (match[3] === 'X') return 'this.power';
            return parseInt(match[3]);
        },
        parseBuffType: (match) => {
            const powerVal = match[2];
            const toughnessVal = match[3];

            // If power and toughness are different, we need to handle them separately
            if (powerVal !== toughnessVal) {
                // Return 'split' to indicate different values for power and toughness
                return 'split';
            }

            // If both are 0, no buff
            if (powerVal === '0' && toughnessVal === '0') return 'none';

            // If only power is non-zero
            if (powerVal !== '0' && toughnessVal === '0') return 'power';

            // If only toughness is non-zero
            if (powerVal === '0' && toughnessVal !== '0') return 'toughness';

            // Both are the same and non-zero
            return 'both';
        },
        parseTarget: (match) => {
            const t = match[1].toLowerCase();
            // Check for "another" patterns FIRST - they're more specific and take priority
            if (t.includes('another target attacking creature')) return 'another_target_attacking_creature';
            if (t.includes('another target creature')) return 'another_target_creature_you_control';
            if (t.includes('each other attacking creature')) return 'all_other_attacking_creatures';
            if (t.includes('each creature you control')) return 'all_creatures_you_control';
            // Default to self only if no other patterns matched
            if (t.includes('this creature') || t.includes('it')) return 'self';
            return 'self';
        }
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
    // Equip / Attach effect
    {
        pattern: /Attach\s+(?:to\s+)?target\s+creature/i, // Match "Attach to target creature" or "Attach target creature"
        effect: 'attach',
        target: 'target_creature_you_control'
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
        parseAmount: (match) => parseTokenAmount(match[0]),
        parseTappedAndAttacking: (match) => parseTappedAndAttacking(match[0])
    },
    // Create named token (e.g. "Create a Lander token") and optionally parse props from reminder text
    // E.g. "create a Lander token. (It's an artifact with...)"
    {
        pattern: /create (?:an?|two|three|four) (.*?) tokens?[\s\S]*?(?:\(It(?:'s| is) ([\s\S]*?)\))?/i,
        effect: 'create_named_token',
        target: 'self',
        parseAmount: (match) => parseTokenAmount(match[0]),
        parseName: (match) => match[1].trim(),
        parseProperties: (match) => parseTokenProperties(match[2])
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
// HELPER FUNCTIONS
// ============================================

/**
 * Parse an activated ability string into cost and effect components
 * @param {string} abilityText - The ability text in "Cost: Effect" format
 * @returns {Object} Object with cost and effect properties
 */
export function parseActivatedAbility(abilityText) {
    if (!abilityText) return null;

    // Handle "Equip [Cost]" specially
    const equipMatch = abilityText.match(/^Equip\s+(.+?)(?:\s*\(.*\))?$/i);
    if (equipMatch) {
        return {
            cost: equipMatch[1].trim(),
            effect: 'Attach to target creature you control.',
            isEquip: true
        };
    }

    const separatorIndex = abilityText.indexOf(':');
    if (separatorIndex === -1) return null;

    const cost = abilityText.substring(0, separatorIndex).trim();
    const effect = abilityText.substring(separatorIndex + 1).trim();

    return { cost, effect };
}

/**
 * Parse mana cost from a cost string
 * @param {string} costString - The cost string (e.g., "{2}{R}")
 * @returns {Object} Parsed mana cost
 */
export function parseManaCost(costString) {
    if (!costString) return { generic: 0, colors: [] };

    const manaSymbols = costString.match(/\{[^}]+\}/g) || [];
    const colors = [];
    let generic = 0;

    for (const symbol of manaSymbols) {
        const inner = symbol.slice(1, -1); // Remove { }

        if (/^\d+$/.test(inner)) {
            generic += parseInt(inner);
        } else if (['W', 'U', 'B', 'R', 'G'].includes(inner)) {
            colors.push(inner);
        } else if (inner === 'C') {
            // Colorless mana
            generic += 1;
        }
        // Could extend for hybrid, phyrexian, etc.
    }

    return { generic, colors };
}

/**
 * Determine if an ability requires a target
 * @param {string} effectText - The effect text
 * @returns {boolean} True if the ability requires targeting
 */
export function requiresTarget(effectText) {
    if (!effectText) return false;

    const targetPatterns = [
        /target creature/i,
        /target player/i,
        /target permanent/i,
        /target opponent/i,
        /target artifact/i,
        /target enchantment/i,
    ];

    return targetPatterns.some(pattern => pattern.test(effectText));
}

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * Extract triggered abilities from oracle text
 * @param {string} oracleText - The card's oracle text
 * @returns {Array<Object>} List of triggered abilities found
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
 * @param {string} oracleText - The card's oracle text
 * @returns {Array<Object>} List of effects found
 */
export function extractEffects(oracleText) {
    if (!oracleText) return [];

    const effects = [];

    for (const { pattern, parseAmount, parseName, parseProperties, parseTarget, parseTokenName, parseTappedAndAttacking, parseBuffType, parseToughnessAmount, ...effectData } of EFFECT_PATTERNS) {
        const match = oracleText.match(pattern);
        if (match) {
            const effect = { ...effectData };
            if (parseAmount) {
                effect.amount = parseAmount(match);
            }
            if (parseToughnessAmount) {
                effect.toughnessAmount = parseToughnessAmount(match);
            }
            if (parseBuffType) {
                effect.buffType = parseBuffType(match);
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
 * @param {string} oracleText - The card's oracle text
 * @returns {number} The number of counters (0 if none)
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
 * @param {string} oracleText - The card's oracle text
 * @returns {Array<Object>} List of replacement effects
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
 * @param {string} oracleText - The card's oracle text
 * @returns {Array<Object>} List of activated abilities
 */
export function extractActivatedAbilities(oracleText) {
    if (!oracleText) return [];

    return oracleText.split('\n')
        .map(line => {
            const parsed = parseActivatedAbility(line);
            if (!parsed) return null;

            return {
                cost: parsed.cost,
                effect: parsed.effect,
                requiresTarget: requiresTarget(parsed.effect),
                original: line
            };
        })
        .filter(Boolean);
}

/**
 * Full parse of oracle text into game-ready structure
 * @param {Object} card - The card object
 * @param {string} [card.oracle_text] - The oracle text to parse
 * @returns {Object} Structured ability data
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
 * Uses granular fallback to avoid re-parsing when only some parts are missing
 * @param {Object} card - The card object
 * @returns {Object} Complete abilities, keywords, and replacement effects
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

    // Priority 2: Check what's already defined
    const hasAbilities = card.abilities && card.abilities.length > 0;
    const hasReplacements = card.replacementEffects && card.replacementEffects.length > 0;
    const hasKeywords = card.keywords && card.keywords.length > 0;

    // If everything is defined, return early
    if (hasAbilities && hasReplacements && hasKeywords) {
        return {
            abilities: card.abilities,
            replacementEffects: card.replacementEffects,
            keywords: card.keywords,
            parsed: false
        };
    }

    // Priority 3: Parse only what's missing from oracle text
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
            requiresTarget: ability.requiresTarget,
            description: ability.original
        };
    });

    // Use granular fallback - only use parsed data for missing components
    return {
        abilities: card.abilities || [...triggeredAbilities, ...activatedAbilities],
        replacementEffects: card.replacementEffects || parsed.replacementEffects,
        keywords: card.keywords || parsed.keywords,
        parsed: !(hasAbilities && hasReplacements && hasKeywords)
    };
}

export default {
    // Main parsing functions
    extractTriggers,
    extractEffects,
    extractReplacementEffects,
    extractActivatedAbilities,
    parseOracleText,
    getCardAbilities,
    extractEntersWithCounters,

    // Helper functions
    parseActivatedAbility,
    parseManaCost,
    requiresTarget,

    // Pattern constants
    TRIGGER_PATTERNS,
    EFFECT_PATTERNS,
    REPLACEMENT_PATTERNS,
};