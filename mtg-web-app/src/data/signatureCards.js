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
    'Ellivere of the Wild Court': {
        name: 'Ellivere of the Wild Court',
        abilities: [
            {
                trigger: 'on_enter_battlefield',
                effect: 'create_attached_token',
                tokenName: 'Virtuous', // Matches face name of "Monster // Virtuous"
                target: 'another_creature_you_control',
                amount: 1,
                description: 'create a Virtuous Role token attached to another target creature you control'
            },
            {
                trigger: 'on_attack',
                effect: 'create_attached_token',
                tokenName: 'Virtuous',
                target: 'another_creature_you_control',
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
        toughness: 0
    },
    'Virtuous Role': {
        name: 'Virtuous',
        type: 'Token Enchantment — Aura Role',
        type_line: 'Token Enchantment — Aura Role',
        oracle_text: 'Enchanted creature gets +1/+1 for each enchantment you control.',
        isRole: true,
        power: 0,
        toughness: 0
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
