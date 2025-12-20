/**
 * SIGNATURE_DATA maps card names to hand-crafted ability and metadata definitions.
 * This is used for complex cards that are difficult to parse perfectly from oracle text,
 * or cards that require unique engine-level logic.
 */
export const SIGNATURE_DATA = {
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
    }
};
