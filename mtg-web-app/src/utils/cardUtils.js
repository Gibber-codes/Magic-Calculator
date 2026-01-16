import cardData from '../data/scryfall_cards.json';
import { getCardAbilities } from './keywordParser';

export const getTypeFromTypeLine = (typeLine) => {
    if (!typeLine) return 'Other';
    const primary = typeLine.split(' — ')[0];
    const candidates = primary.split(' ');
    const knownTypes = ['Creature', 'Enchantment', 'Artifact', 'Planeswalker', 'Instant', 'Sorcery', 'Land'];
    return candidates.find(t => knownTypes.includes(t)) || candidates[0];
};

export const isCreature = (c) => c.type_line && c.type_line.toLowerCase().includes('creature');
export const isLand = (c) => c.type_line && c.type_line.toLowerCase().includes('land') && !isCreature(c);

/**
 * Calculates the total number of items in a stack of cards,
 * accounting for virtualized tokens that represent astronomical counts.
 */
export const calculateEffectiveTotal = (stackCards = []) => {
    return stackCards.reduce((acc, c) => {
        const val = c.isVirtualStack ? BigInt(c.virtualStackSize || 0n) : 1n;
        return acc + val;
    }, 0n);
};


export const createBattlefieldCard = (cardDef, extra = {}, context = {}) => {
    const { cards = [], gameEngineRef = null } = context;
    const type = getTypeFromTypeLine(cardDef.type_line);

    // Check for local overrides in cardData
    const localDef = cardData.find(c => c.name === cardDef.name);
    const mergedDef = localDef ? { ...cardDef, ...localDef } : cardDef;

    // Use the parser to get abilities and replacement effects dynamically
    const parseDef = mergedDef._parsed ? { ...mergedDef, abilities: null } : mergedDef;
    const { abilities, replacementEffects, entersWithCounters } = getCardAbilities(parseDef);

    // Determine initial counters based on "Enters with X counters" keywords
    let initialCounters = {};
    if (entersWithCounters > 0 && gameEngineRef?.current) {
        const modifiers = gameEngineRef.current.findReplacementEffects('add_counters', cards);
        const finalCount = gameEngineRef.current.applyModifiers(entersWithCounters, modifiers, 'add_counters');
        if (finalCount > 0) {
            initialCounters = { '+1/+1': finalCount };
        }
    }

    // Determine active face index if it's a double-faced card
    // Cases:
    // 1. created via 'create_token_copy' where 'activeFaceIndex' might be passed in extra
    // 2. created via 'create_attached_token' with a specific tokenName "Virtuous Role" which matches the back face

    let activeFaceIndex = 0;
    if (extra.activeFaceIndex !== undefined) {
        activeFaceIndex = extra.activeFaceIndex;
    } else if (mergedDef.card_faces) {
        // Try to match the requested name to a face
        const faceIndex = mergedDef.card_faces.findIndex(f => f.name === mergedDef.name);
        if (faceIndex !== -1) {
            activeFaceIndex = faceIndex;
        }
    }

    // Prepare Active Face Data
    let finalName = mergedDef.name;
    let finalTypeLine = mergedDef.type_line;
    let finalPower = mergedDef.power;
    let finalToughness = mergedDef.toughness;
    let finalOracle = mergedDef.oracle_text;
    let finalArt = mergedDef.art_crop;
    let finalImage = mergedDef.image_normal;
    let finalColors = mergedDef.colors;

    if (mergedDef.card_faces && mergedDef.card_faces[activeFaceIndex]) {
        const face = mergedDef.card_faces[activeFaceIndex];
        finalName = face.name;
        finalTypeLine = face.type_line;
        finalPower = face.power;
        finalToughness = face.toughness;
        finalOracle = face.oracle_text;
        finalArt = face.art_crop || finalArt; // Fallback to card art if face has none
        finalImage = face.image_normal || finalImage;
        finalColors = face.colors || finalColors;
    }

    const finalType = getTypeFromTypeLine(finalTypeLine);

    return {
        id: Date.now() + Math.random(),
        name: finalName,
        type: finalType,
        type_line: finalTypeLine,
        power: finalPower !== '' ? parseInt(finalPower) || undefined : undefined,
        toughness: finalToughness !== '' ? parseInt(finalToughness) || undefined : undefined,
        oracle_text: finalOracle || '',
        colors: finalColors || [],
        art_crop: finalArt || '',
        image_normal: finalImage || '',
        counters: initialCounters, // Use calculated starting counters
        tapped: false,
        zone: 'battlefield', // Default zone
        attachedTo: null, // ID of card this is attached to
        abilities: abilities || [],
        replacementEffects: replacementEffects || [],
        entersWithCounters: entersWithCounters, // Add entersWithCounters to the return object
        activeFaceIndex,
        card_faces: mergedDef.card_faces, // Ensure faces are passed through
        ...extra,
    };
};

/**
 * Calculates total Power and Toughness for a creature, 
 * including counters, temporary buffs, and attachments (Roles, Equipment).
 */
export const calculateCardStats = (card, allCards = [], externalAttachments = null) => {
    if (!card) return { power: 0, toughness: 0 };

    const activeFaceIndex = card.activeFaceIndex !== undefined ? card.activeFaceIndex : 0;

    // Determine active face data
    let activeName = card.name;
    let activePower = card.power;
    let activeToughness = card.toughness;
    let activeOracle = card.oracle_text || '';
    let activeType = card.type_line || '';

    if (card.card_faces && card.card_faces[activeFaceIndex]) {
        const face = card.card_faces[activeFaceIndex];
        activeName = face.name;
        activePower = face.power;
        activeToughness = face.toughness;
        activeOracle = face.oracle_text || '';
        activeType = face.type_line || '';
    }

    const basePower = parseInt(activePower) || 0;
    const baseToughness = parseInt(activeToughness) || 0;

    // 1. Process Counters
    let countersObj = {};
    if (typeof card.counters === 'number') {
        countersObj = { '+1/+1': card.counters };
    } else if (typeof card.counters === 'object' && card.counters !== null) {
        countersObj = card.counters;
    }
    const plusOne = (countersObj['+1/+1'] || 0);
    const minusOne = (countersObj['-1/-1'] || 0);
    const counterPower = plusOne - minusOne;
    const counterToughness = plusOne - minusOne;

    // 2. Process Temporary & Permanent Buffs
    const tempPowerBonus = parseInt(card.tempPowerBonus) || 0;
    const tempToughnessBonus = parseInt(card.tempToughnessBonus) || 0;
    const permPowerBonus = parseInt(card.permPowerBonus) || 0;
    const permToughnessBonus = parseInt(card.permToughnessBonus) || 0;

    // 3. Process Attachments and Dynamic/Static Buffs
    let dynamicPower = 0;
    let dynamicToughness = 0;

    const attachments = externalAttachments || allCards.filter(c => c.attachedTo === card.id);

    // Helper to count enchantments accurately (global count)
    const getEnchantmentCount = () => {
        if (!allCards || !Array.isArray(allCards)) return 0;
        return allCards.filter(c => {
            if (!c) return false;

            // Check active face only if defined, otherwise check all faces (fallback)
            const cActiveIdx = c.activeFaceIndex !== undefined ? c.activeFaceIndex : 0;
            let typeText = (c.type_line || c.type || '').toLowerCase();

            if (c.card_faces && c.card_faces[cActiveIdx]) {
                typeText = (c.card_faces[cActiveIdx].type_line || '').toLowerCase();
            }

            // If activeFaceIndex IS tracked (DFC aware), stricter check
            let isE = false;
            if (c.card_faces) {
                // It is a DFC. Use active face.
                const face = c.card_faces[cActiveIdx];
                const faceType = (face.type_line || '').toLowerCase();
                isE = faceType.includes('enchantment');
            } else {
                // Normal card - use robust check including metadata
                isE = typeText.includes('enchantment') || c.isRole || c.isAura || c.special_buff === 'enchantment_count';
            }

            const zone = (c.zone || '').toLowerCase();
            const offBoard = ['hand', 'library', 'graveyard', 'exile', 'stack'].includes(zone);

            return isE && !offBoard;
        }).length;
    };

    attachments.forEach(att => {
        // Use ACTIVE face of attachment
        const attActiveIdx = att.activeFaceIndex !== undefined ? att.activeFaceIndex : 0;
        let attOracle = (att.oracle_text || '').toLowerCase();
        let attSpecial = att.special_buff === 'enchantment_count';
        let attName = (att.name || '').toLowerCase();

        if (att.card_faces) {
            // Default to face 0 if no active index explicitly set yet
            const face = att.card_faces[attActiveIdx];
            if (face) {
                attOracle = (face.oracle_text || '').toLowerCase();
                attName = (face.name || '').toLowerCase();
                // Inherit special buff if it seems relevant or if it's explicitly the Virtuous face
                attSpecial = face.special_buff === 'enchantment_count' || attName.includes('virtuous');
            }
        }

        const isDynamic = attOracle.includes('for each') && attOracle.includes('enchantment') ||
            attSpecial;

        const staticMatch = attOracle.match(/gets \+?(-?\d+)\/\+?(-?\d+)/i);

        if (isDynamic) {
            let count = getEnchantmentCount();
            if (attOracle.includes('each other enchantment')) {
                count = Math.max(0, count - 1);
            }

            let mP = 1, mT = 1;
            if (staticMatch) {
                const p = parseInt(staticMatch[1]);
                const t = parseInt(staticMatch[2]);
                if (!isNaN(p)) mP = p;
                if (!isNaN(t)) mT = t;
            }

            dynamicPower += mP * count;
            dynamicToughness += mT * count;
        } else if (staticMatch) {
            dynamicPower += parseInt(staticMatch[1]) || 0;
            dynamicToughness += parseInt(staticMatch[2]) || 0;
        }
    });

    // Also check the card itself (using ACTIVE face)
    // Strip reminder text (in parentheses) to avoid double-counting buffs from attached enchantments
    const oracleWithoutReminder = activeOracle.replace(/\([^)]*\)/g, '').toLowerCase();
    const isSelfDynamic = oracleWithoutReminder.includes('for each') && oracleWithoutReminder.includes('enchantment');

    // Check if this card has enchantment attachments
    const hasEnchantmentAttachment = attachments.some(att => {
        const attType = (att.type_line || att.type || '').toLowerCase();
        return attType.includes('enchantment') || attType.includes('aura') || att.isRole || att.isAura;
    });

    // Only apply self-dynamic buff if the oracle text itself (not reminder text) has "for each enchantment"
    // AND the card has enchantment attachments
    if (isSelfDynamic && hasEnchantmentAttachment) {
        let count = getEnchantmentCount();
        if (oracleWithoutReminder.includes('each other enchantment')) {
            count = Math.max(0, count - 1);
        }

        const staticMatch = oracleWithoutReminder.match(/gets \+?(-?\d+)\/\+?(-?\d+)/i);
        if (staticMatch) {
            const mP = parseInt(staticMatch[1]);
            const mT = parseInt(staticMatch[2]);
            if (!isNaN(mP)) dynamicPower += mP * count;
            if (!isNaN(mT)) dynamicToughness += mT * count;
        } else {
            dynamicPower += count;
            dynamicToughness += count;
        }
    }

    return {
        power: basePower + counterPower + tempPowerBonus + permPowerBonus + dynamicPower,
        toughness: baseToughness + counterToughness + tempToughnessBonus + permToughnessBonus + dynamicToughness,
        basePower,
        baseToughness,
        counterPower,
        counterToughness,
        tempPowerBonus,
        tempToughnessBonus,
        permPowerBonus,
        permToughnessBonus,
        dynamicPower,
        dynamicToughness
    };
};

// Land type constants
export const BASIC_LAND_NAMES = ['Forest', 'Island', 'Mountain', 'Plains', 'Swamp'];

export const BASIC_LAND_COLORS = {
    'Forest': { colors: ['G'], borderColor: '#15803d', fillColor: '#22c55e', textColor: 'black' },
    'Island': { colors: ['U'], borderColor: '#2563eb', fillColor: '#60a5fa', textColor: 'black' },
    'Mountain': { colors: ['R'], borderColor: '#b91c1c', fillColor: '#ef4444', textColor: 'black' },
    'Plains': { colors: ['W'], borderColor: '#d4d4d8', fillColor: '#fef9c3', textColor: 'black' },
    'Swamp': { colors: ['B'], borderColor: '#1f2937', fillColor: '#4b5563', textColor: 'black' },
};

export const PLACEHOLDER_LAND = {
    name: 'Land',
    type: 'Land',
    type_line: 'Land',
    isPlaceholderLand: true,
    colors: [],
    // Grey colors
    borderColor: '#6b7280',
    fillColor: '#374151',
    textColor: 'black'
};

export const isPlaceholderLand = (card) => {
    return card?.isPlaceholderLand === true || card?.name === 'Land';
};

export const isBasicLand = (card) => {
    if (!card?.name) return false;
    return BASIC_LAND_NAMES.includes(card.name);
};

export const isMinimalDisplayLand = (card) => {
    return isPlaceholderLand(card) || isBasicLand(card);
};

/**
 * Card Colors - Hex mapping for SVGs
 */
export const getCardHexColors = (colors) => {
    // Default Gray (Artifact/Colorless)
    let c = { borderColor: '#6b7280', fillColor: '#374151', text: 'black' };

    if (!colors || colors.length === 0) return c;

    if (colors.length > 1) {
        // Gold
        return { borderColor: '#ca8a04', fillColor: '#eab308', text: 'black' };
    }

    const map = {
        'W': { borderColor: '#d4d4d8', fillColor: '#fef9c3', text: 'black' }, // Zinc/Yellow
        'U': { borderColor: '#2563eb', fillColor: '#60a5fa', text: 'black' }, // Blue
        'B': { borderColor: '#1f2937', fillColor: '#4b5563', text: 'white' }, // Dark Gray
        'R': { borderColor: '#b91c1c', fillColor: '#ef4444', text: 'black' }, // Red
        'G': { borderColor: '#15803d', fillColor: '#22c55e', text: 'black' }  // Green
    };

    return map[colors[0]] || c;
};

/**
 * Sorting logic for battlefield stacks
 */
export const sortBattlefieldCards = (stacks, allCards) => {
    return [...stacks].sort((a, b) => {
        // 1. Creatures First
        const aIsCreature = isCreature(a.leader);
        const bIsCreature = isCreature(b.leader);

        if (aIsCreature && !bIsCreature) return -1;
        if (!aIsCreature && bIsCreature) return 1;

        if (aIsCreature) {
            // Both are Creatures

            // 2. Equipped Creatures First (Creatures with attachments)
            const aAttachments = allCards.filter(c => c.attachedTo === a.leader.id);
            const bAttachments = allCards.filter(c => c.attachedTo === b.leader.id);
            const aEquipped = aAttachments.length > 0;
            const bEquipped = bAttachments.length > 0;

            if (aEquipped && !bEquipped) return -1;
            if (!aEquipped && bEquipped) return 1;

            // 3. Greatest Power First
            const aStats = calculateCardStats(a.leader, allCards, aAttachments);
            const bStats = calculateCardStats(b.leader, allCards, bAttachments);
            if (aStats.power !== bStats.power) return bStats.power - aStats.power;

            // 4. Highest Stacks First
            if (a.count !== b.count) return b.count - a.count;

            return 0;
        } else {
            // Non-Creatures

            // 5. Equipment First
            const aIsEquipment = a.leader.type_line && a.leader.type_line.includes('Equipment');
            const bIsEquipment = b.leader.type_line && b.leader.type_line.includes('Equipment');

            if (aIsEquipment && !bIsEquipment) return -1;
            if (!aIsEquipment && bIsEquipment) return 1;

            return 0;
        }
    });
};
