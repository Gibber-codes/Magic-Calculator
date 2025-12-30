/**
 * SIGNATURE_DATA maps card names to hand-crafted ability and metadata definitions.
 * This is used for complex cards that are difficult to parse perfectly from oracle text,
 * or cards that require unique engine-level logic.
 */
export const SIGNATURE_DATA = {
    'Extravagant Replication': {
        name: 'Extravagant Replication',
        type: 'Enchantment',
        type_line: 'Enchantment',
        abilities: [
            {
                trigger: 'beginning_step',
                effect: 'create_copy_token',
                target: 'another_nonland_permanent_you_control',
                amount: 1,
                requiresTarget: true,
                description: 'create a token copy of another target nonland permanent you control'
            }
        ]
    },
    'Mondrak, Glory Dominus': {
        name: 'Mondrak, Glory Dominus',
        type: 'Creature',
        type_line: 'Legendary Creature — Phyrexian Horror',
        abilities: [
            {
                trigger: 'activated',
                cost: '{1}{W/P}{W/P}, Sacrifice two other artifacts and/or creatures',
                effect: 'add_counters',
                counterType: 'indestructible',
                amount: 1,
                description: 'Put an indestructible counter on Mondrak'
            }
        ],
        replacementEffects: [
            {
                type: 'double_tokens',
                description: 'If one or more tokens would be created under your control, twice that many of those tokens are created instead.'
            }
        ]
    },
    'Helm of the Host': {
        name: 'Helm of the Host',
        type: 'Artifact',
        type_line: 'Legendary Artifact — Equipment',
        abilities: [
            {
                trigger: 'beginning_of_combat',
                effect: 'create_deferred_token_copy',
                target: 'equipped_creature',
                amount: 1,
                description: 'create a token that is a copy of equipped creature'
            },
            {
                trigger: 'activated',
                cost: '{5}',
                effect: 'equip',
                target: 'creature',
                amount: null,
                requiresTarget: true,
                description: 'Equip {5}'
            }
        ]
    },
    'Ellivere of the Wild Court': {
        name: 'Ellivere of the Wild Court',
        abilities: [
            {
                trigger: 'on_enter_battlefield',
                effect: 'create_deferred_token',
                tokenName: 'Virtuous',
                // target: explicitly removed, as the initial buffer trigger is targetless
                amount: 1,
                description: 'create a Virtuous Role token attached to another target creature you control'
            },
            {
                trigger: 'on_attack',
                effect: 'create_deferred_token',
                tokenName: 'Virtuous',
                // target: explicitly removed
                amount: 1,
                description: 'create a Virtuous Role token attached to another target creature you control'
            }
        ]
    },
    'Virtuous': {
        name: 'Virtuous',
        type: 'Token Enchantment — Aura Role',
        type_line: 'Token Enchantment — Aura Role',
        oracle_text: 'Enchanted creature gets +1/+1 for each enchantment you control.',
        isRole: true,
        power: 0,
        toughness: 0,
        art_crop: 'https://cards.scryfall.io/border_crop/front/2/7/27927100-2587-4e05-9957-eb183d46c1f0.jpg?1695406612',
        image_rotation: 180
    },
    'Virtuous Role': {
        name: 'Virtuous',
        type: 'Token Enchantment — Aura Role',
        type_line: 'Token Enchantment — Aura Role',
        oracle_text: 'Enchanted creature gets +1/+1 for each enchantment you control.',
        isRole: true,
        power: 0,
        toughness: 0,
        art_crop: 'https://cards.scryfall.io/border_crop/front/2/7/27927100-2587-4e05-9957-eb183d46c1f0.jpg?1695406612',
        image_rotation: 180
    },
    // Basic Lands - minimal display, no abilities
    'Forest': {
        name: 'Forest',
        type: 'Land',
        type_line: 'Basic Land — Forest',
        oracle_text: '{T}: Add {G}.',
        colors: ['G'],
        isBasicLand: true
    },
    'Island': {
        name: 'Island',
        type: 'Land',
        type_line: 'Basic Land — Island',
        oracle_text: '{T}: Add {U}.',
        colors: ['U'],
        isBasicLand: true
    },
    'Mountain': {
        name: 'Mountain',
        type: 'Land',
        type_line: 'Basic Land — Mountain',
        oracle_text: '{T}: Add {R}.',
        colors: ['R'],
        isBasicLand: true
    },
    'Plains': {
        name: 'Plains',
        type: 'Land',
        type_line: 'Basic Land — Plains',
        oracle_text: '{T}: Add {W}.',
        colors: ['W'],
        isBasicLand: true
    },
    'Swamp': {
        name: 'Swamp',
        type: 'Land',
        type_line: 'Basic Land — Swamp',
        oracle_text: '{T}: Add {B}.',
        colors: ['B'],
        isBasicLand: true
    },
    // Placeholder Land
    'Land': {
        name: 'Land',
        type: 'Land',
        type_line: 'Land',
        oracle_text: '',
        colors: [],
        isPlaceholderLand: true
    }
};
