// ============================================
// KEYWORD HANDLER FUNCTIONS
// ============================================
// This file contains individual handler functions for each keyword ability type
// Extracted from keywordParser.js for better maintainability

/**
 * @typedef {Object} Card
 * @property {string} [oracle_text] - The oracle text of the card
 * @property {string} [name] - The name of the card
 * @property {string} [type_line] - The type line of the card
 * @property {string} [mana_cost] - The mana cost of the card
 */

/**
 * @typedef {Object} KeywordResult
 * @property {string} keyword - The normalized keyword string
 * @property {string} type - The type of keyword (ability, evasion, etc.)
 * @property {string} description - Description of the ability
 * @property {string} [cost] - Activation or additional cost
 * @property {string} [condition] - Condition for the ability
 */

/**
 * Handler for Addendum keyword
 * @param {Card} card - The card object
 * @param {string} [params] - Additional parameters for the keyword
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleAddendum({ oracle_text } = {}, params) {
    return {
        keyword: 'addendum',
        type: 'conditional',
        condition: 'cast_during_main_phase',
        description: params || 'Addendum effect'
    };
}

/**
 * Handler for Ascend keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleAscend(_card) {
    return {
        keyword: 'ascend',
        type: 'state_based',
        description: 'Gain the city\'s blessing if you control ten or more permanents'
    };
}

/**
 * Handler for Deathtouch keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleDeathtouch(_card) {
    return {
        keyword: 'deathtouch',
        type: 'ability',
        description: 'Any amount of damage this deals to a creature is enough to destroy it'
    };
}

/**
 * Handler for Lifelink keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleLifelink(_card) {
    return {
        keyword: 'lifelink',
        type: 'ability',
        description: 'Damage dealt by this creature also causes you to gain that much life'
    };
}

/**
 * Handler for Flying keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleFlying(_card) {
    return {
        keyword: 'flying',
        type: 'evasion',
        description: 'This creature can only be blocked by creatures with flying or reach'
    };
}

/**
 * Handler for First Strike keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleFirstStrike(_card) {
    return {
        keyword: 'first strike',
        type: 'combat',
        description: 'This creature deals combat damage before creatures without first strike'
    };
}

/**
 * Handler for Double Strike keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleDoubleStrike(_card) {
    return {
        keyword: 'double strike',
        type: 'combat',
        description: 'This creature deals both first-strike and regular combat damage'
    };
}

/**
 * Handler for Vigilance keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleVigilance(_card) {
    return {
        keyword: 'vigilance',
        type: 'ability',
        description: 'Attacking doesn\'t cause this creature to tap'
    };
}

/**
 * Handler for Trample keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleTrample(_card) {
    return {
        keyword: 'trample',
        type: 'combat',
        description: 'This creature can deal excess combat damage to the player or planeswalker it\'s attacking'
    };
}

/**
 * Handler for Haste keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleHaste(_card) {
    return {
        keyword: 'haste',
        type: 'ability',
        description: 'This creature can attack and tap as soon as it comes under your control'
    };
}

/**
 * Handler for Menace keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleMenace(_card) {
    return {
        keyword: 'menace',
        type: 'evasion',
        description: 'This creature can only be blocked by two or more creatures'
    };
}

/**
 * Handler for Reach keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleReach(_card) {
    return {
        keyword: 'reach',
        type: 'ability',
        description: 'This creature can block creatures with flying'
    };
}

/**
 * Handler for Hexproof keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleHexproof(_card) {
    return {
        keyword: 'hexproof',
        type: 'protection',
        description: 'This creature can\'t be the target of spells or abilities your opponents control'
    };
}

/**
 * Handler for Indestructible keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleIndestructible(_card) {
    return {
        keyword: 'indestructible',
        type: 'powerToughness',
        description: 'Damage and effects that say "destroy" don\'t destroy this permanent'
    };
}

/**
 * Handler for Defender keyword
 * @param {Card} _card - The card object (unused)
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleDefender(_card) {
    return {
        keyword: 'defender',
        type: 'restriction',
        description: 'This creature can\'t attack'
    };
}

/**
 * Handler for Equip keyword (activated ability)
 * @param {Card} _card - The card object
 * @param {string} [params] - The equip cost
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleEquip(_card, params) {
    const cost = params || '{?}';
    return {
        keyword: 'equip',
        type: 'activated',
        cost: cost,
        description: `Equip ${cost}: Attach to target creature you control. Equip only as a sorcery.`
    };
}

/**
 * Handler for Outlast keyword (activated ability)
 * @param {Card} _card - The card object
 * @param {string} [params] - The outlast cost
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleOutlast(_card, params) {
    const cost = params || '{?}';
    return {
        keyword: 'outlast',
        type: 'activated',
        cost: cost,
        description: `Outlast ${cost}: Put a +1/+1 counter on this creature. Outlast only as a sorcery.`
    };
}

/**
 * Handler for Crew keyword (activated ability)
 * @param {Card} _card - The card object
 * @param {string} [params] - The crew power
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleCrew(_card, params) {
    const power = params || '?';
    return {
        keyword: 'crew',
        type: 'activated',
        cost: `Tap creatures with total power ${power} or more`,
        description: `Crew ${power}: Tap any number of creatures you control with total power ${power} or more: This Vehicle becomes an artifact creature until end of turn.`
    };
}

/**
 * Handler for Fortify keyword (activated ability)
 * @param {Card} _card - The card object
 * @param {string} [params] - The fortify cost
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleFortify(_card, params) {
    const cost = params || '{?}';
    return {
        keyword: 'fortify',
        type: 'activated',
        cost: cost,
        description: `Fortify ${cost}: Attach to target land you control. Fortify only as a sorcery.`
    };
}

/**
 * Handler for Flashback keyword
 * @param {Card} _card - The card object
 * @param {string} [params] - The flashback cost
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleFlashback(_card, params) {
    const cost = params || '{?}';
    return {
        keyword: 'flashback',
        type: 'alternative_cost',
        cost: cost,
        description: `Flashback ${cost}: You may cast this card from your graveyard for its flashback cost. Then exile it.`
    };
}

/**
 * Handler for Kicker keyword
 * @param {Card} _card - The card object
 * @param {string} [params] - The kicker cost
 * @returns {KeywordResult} The parsed keyword ability
 */
export function handleKicker(_card, params) {
    const cost = params || '{?}';
    return {
        keyword: 'kicker',
        type: 'additional_cost',
        cost: cost,
        description: `Kicker ${cost}: You may pay an additional ${cost} as you cast this spell.`
    };
}

// ============================================
// KEYWORD FUNCTION REGISTRY
// ============================================
// Maps keyword names to their handler functions

export const KEYWORD_HANDLERS = {
    'addendum': handleAddendum,
    'ascend': handleAscend,
    'deathtouch': handleDeathtouch,
    'lifelink': handleLifelink,
    'flying': handleFlying,
    'first strike': handleFirstStrike,
    'double strike': handleDoubleStrike,
    'vigilance': handleVigilance,
    'trample': handleTrample,
    'haste': handleHaste,
    'menace': handleMenace,
    'reach': handleReach,
    'hexproof': handleHexproof,
    'indestructible': handleIndestructible,
    'defender': handleDefender,
    'equip': handleEquip,
    'outlast': handleOutlast,
    'crew': handleCrew,
    'fortify': handleFortify,
    'flashback': handleFlashback,
    'kicker': handleKicker,
};

// ============================================
// KEYWORD TYPE LOOKUPS
// ============================================
// Use Sets for O(1) lookup performance

export const ABILITY_KEYWORDS = new Set([
    'deathtouch',
    'lifelink',
    'vigilance',
    'haste',
    'reach',
]);

export const EVASION_KEYWORDS = new Set([
    'flying',
    'menace',
    'fear',
    'intimidate',
    'shadow',
    'horsemanship',
]);

export const COMBAT_KEYWORDS = new Set([
    'first strike',
    'double strike',
    'trample',
]);

export const PROTECTION_KEYWORDS = new Set([
    'hexproof',
    'shroud',
    'ward',
]);

export const POWER_TOUGHNESS_KEYWORDS = new Set([
    'indestructible',
]);

export const RESTRICTION_KEYWORDS = new Set([
    'defender',
    'can\'t attack',
    'can\'t block',
]);

/**
 * Get the type category for a keyword
 */
export function getKeywordType(keyword) {
    const lowerKeyword = keyword.toLowerCase();

    if (ABILITY_KEYWORDS.has(lowerKeyword)) return 'ability';
    if (EVASION_KEYWORDS.has(lowerKeyword)) return 'evasion';
    if (COMBAT_KEYWORDS.has(lowerKeyword)) return 'combat';
    if (PROTECTION_KEYWORDS.has(lowerKeyword)) return 'protection';
    if (POWER_TOUGHNESS_KEYWORDS.has(lowerKeyword)) return 'powerToughness';
    if (RESTRICTION_KEYWORDS.has(lowerKeyword)) return 'restriction';

    return 'other';
}

/**
 * Parse a keyword ability using the handler registry
 */
export function parseKeywordAbility(keywordString, card) {
    if (!keywordString) return null;

    // Extract keyword and parameters
    // Format: "keyword" or "keyword params"
    const parts = keywordString.trim().split(/\s+/);
    const keyword = parts[0].toLowerCase();
    const params = parts.slice(1).join(' ');

    // Look up handler
    const handler = KEYWORD_HANDLERS[keyword];

    if (handler) {
        return handler(card, params);
    }

    // Fallback for unknown keywords
    return {
        keyword: keyword,
        type: getKeywordType(keyword),
        description: keywordString,
        params: params || null
    };
}
