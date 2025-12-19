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
                tokenName: 'Virtuous Role',
                target: 'another_creature_you_control',
                amount: 1,
                description: 'create a Virtuous Role token attached to another target creature you control'
            },
            {
                trigger: 'on_attack',
                effect: 'create_attached_token',
                tokenName: 'Virtuous Role',
                target: 'another_creature_you_control',
                amount: 1,
                description: 'create a Virtuous Role token attached to another target creature you control'
            }
        ]
    },
    'Virtuous Role': {
        name: 'Virtuous Role',
        type: 'Token Enchantment — Aura Role',
        type_line: 'Token Enchantment — Aura Role',
        oracle_text: 'Enchanted creature gets +1/+1 for each enchantment you control.',
        isToken: true,
        isRole: true,
        isAura: true,
        auraTarget: 'creature',
        // metadata for engine to calculate buffs
        special_buff: 'enchantment_count'
    },
    'Monster': {
        name: 'Monster',
        type: 'Token Enchantment — Aura Role',
        type_line: 'Token Enchantment — Aura Role',
        oracle_text: 'Enchanted creature gets +1/+1 and has trample.',
        isToken: true,
        isRole: true,
        isAura: true,
        auraTarget: 'creature'
    },
    'Virtuous': {
        name: 'Virtuous',
        type: 'Token Enchantment — Aura Role',
        type_line: 'Token Enchantment — Aura Role',
        oracle_text: 'Enchanted creature gets +1/+1 for each enchantment you control.',
        isToken: true,
        isRole: true,
        isAura: true,
        auraTarget: 'creature',
        special_buff: 'enchantment_count'
    }
};
