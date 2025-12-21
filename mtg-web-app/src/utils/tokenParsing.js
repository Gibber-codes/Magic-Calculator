/**
 * Token Parsing Utilities
 * helper functions for parsing token information from oracle text
 */

/**
 * Parsed token properties
 * @typedef {Object} TokenProperties
 * @property {string} type - The type line of the token
 * @property {number} power - Power of the token
 * @property {number} toughness - Toughness of the token
 * @property {string[]} colors - Colors of the token
 */

/**
 * Parse token properties from reminder text description
 * e.g. "It's a 2/2 white Knight creature with vigilance"
 * 
 * @param {string} description - The reminder text description
 * @returns {TokenProperties|null} Parsed properties or null
 */
export function parseTokenProperties(description) {
    if (!description) return null;

    // Simple heuristics
    const props = { type: 'Token', power: 0, toughness: 0, colors: [] };
    const lowerDesc = description.toLowerCase();

    // Type
    if (lowerDesc.includes('artifact')) props.type = 'Token Artifact';
    if (lowerDesc.includes('creature')) props.type = 'Token Creature';
    if (lowerDesc.includes('enchantment')) props.type = 'Token Enchantment';

    // Subtypes additions (very basic)
    if (lowerDesc.includes('construct')) props.type += ' — Construct';

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

    return props;
}

/**
 * Parse amount string to number
 * Handles "one", "two", "three", "four", "five" and numeric digits
 * 
 * @param {string} text - The text containing the number
 * @param {number} defaultValue - Default value if no number found
 * @returns {number} The parsed amount
 */
export function parseTokenAmount(text, defaultValue = 1) {
    if (!text) return defaultValue;

    const lowerText = text.toLowerCase();

    if (lowerText.includes('a ') || lowerText.includes('an ')) return 1;
    if (lowerText.includes('one')) return 1;
    if (lowerText.includes('two')) return 2;
    if (lowerText.includes('three')) return 3;
    if (lowerText.includes('four')) return 4;
    if (lowerText.includes('five')) return 5;

    // Check for numeric (e.g., "create 3 tokens")
    const numMatch = lowerText.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0]);

    return defaultValue;
}

/**
 * Check if text implies tapped and attacking
 * @param {string} text 
 * @returns {boolean}
 */
export function parseTappedAndAttacking(text) {
    return text ? text.toLowerCase().includes('tapped and attacking') : false;
}
