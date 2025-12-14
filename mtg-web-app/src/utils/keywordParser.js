/**
 * MTG Keyword Parser - Simplified
 * Focuses on: Token doubling (Mondrak) and Beginning of Combat triggers (Helm)
 */

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

    // Attack Trigger
    {
        pattern: /whenever this creature attacks/i,
        trigger: 'on_attack',
        target: 'this'
    },
    // Enters the Battlefield Trigger
    {
        pattern: /when (.*) enters( the battlefield)?/i,
        trigger: 'on_enter_battlefield',
        target: 'self'
    },
];

// ============================================
// EFFECT PATTERNS
// ============================================

export const EFFECT_PATTERNS = [
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
    // Create token copy effect (e.g. Gruff Triplets)
    // Matches: "create two tokens that are copies of it"
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

    for (const { pattern, ...triggerData } of TRIGGER_PATTERNS) {
        if (pattern.test(oracleText)) {
            const effects = extractEffects(oracleText);
            triggers.push({
                ...triggerData,
                effects: effects.length > 0 ? effects : [{ effect: 'unknown' }]
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

    for (const { pattern, parseAmount, parseName, parseProperties, ...effectData } of EFFECT_PATTERNS) {
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
            effects.push(effect);
        }
    }

    return effects;
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

    return {
        triggers: extractTriggers(oracleText),
        effects: extractEffects(oracleText),
        replacementEffects: extractReplacementEffects(oracleText),
    };
}

/**
 * Get card abilities - prefers manual definitions, falls back to parsing
 */
export function getCardAbilities(card) {
    // Priority 1: Use manually defined abilities
    // Priority 1: Use manually defined abilities
    if (card.abilities && card.abilities.length > 0) {
        // Even if abilities are defined, we might be missing replacement effects in the JSON.
        // So we should try to parse them if they are missing.
        let replacements = card.replacementEffects || [];
        if (replacements.length === 0 && card.oracle_text) {
            replacements = extractReplacementEffects(card.oracle_text);
        }

        return {
            abilities: card.abilities,
            replacementEffects: replacements,
            parsed: false
        };
    }

    // Priority 2: Parse from oracle text
    const parsed = parseOracleText(card);

    // Convert triggers to abilities format expected by gameEngine
    const abilities = parsed.triggers.map(t => ({
        trigger: t.trigger,
        condition: t.condition,
        effect: t.effects[0]?.effect || 'unknown',
        target: t.effects[0]?.target || 'self',
        amount: t.effects[0]?.amount,
        tokenName: t.effects[0]?.tokenName,
        tokenProps: t.effects[0]?.tokenProps,
    }));

    return {
        abilities,
        replacementEffects: parsed.replacementEffects,
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