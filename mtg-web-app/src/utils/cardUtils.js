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

    // 2. Process Temporary Buffs
    const tempPowerBonus = parseInt(card.tempPowerBonus) || 0;
    const tempToughnessBonus = parseInt(card.tempToughnessBonus) || 0;

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
    const isSelfDynamic = activeOracle.toLowerCase().includes('for each') && activeOracle.toLowerCase().includes('enchantment');

    if (isSelfDynamic) {
        let count = getEnchantmentCount();
        if (activeOracle.toLowerCase().includes('each other enchantment')) {
            count = Math.max(0, count - 1);
        }

        const staticMatch = activeOracle.match(/gets \+?(-?\d+)\/\+?(-?\d+)/i);
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
        power: basePower + counterPower + tempPowerBonus + dynamicPower,
        toughness: baseToughness + counterToughness + tempToughnessBonus + dynamicToughness,
        basePower,
        baseToughness,
        counterPower,
        counterToughness,
        tempPowerBonus,
        tempToughnessBonus,
        dynamicPower,
        dynamicToughness
    };
};
