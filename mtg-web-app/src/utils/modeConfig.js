import { Sword, Link, Zap, Trash2, ShieldOff } from 'lucide-react';

/**
 * Get mode-specific labels and styling for targeting overlays
 * @param {string} mode - The targeting mode action
 * @returns {Object} Configuration with title, icon, confirmLabel, color, showSelectAll
 */
export const getModeConfig = (mode) => {
    const configs = {
        'declare-attackers': {
            title: 'Declare Attackers',
            icon: Sword,
            confirmLabel: 'Confirm Attacks',
            color: 'red',
            showSelectAll: true
        },
        'declare-blockers': {
            title: 'Declare Blockers',
            icon: ShieldOff,
            confirmLabel: 'Confirm Blockers',
            color: 'blue',
            showSelectAll: false
        },
        'equip': {
            title: 'Choose Target',
            icon: Link,
            confirmLabel: 'Equip',
            color: 'blue',
            showSelectAll: false
        },
        'activate-ability': {
            title: 'Choose Target',
            icon: Zap,
            confirmLabel: 'Confirm Target',
            color: 'purple',
            showSelectAll: false
        },
        'enchant': {
            title: 'Choose Target',
            icon: Zap,
            confirmLabel: 'Enchant',
            color: 'purple',
            showSelectAll: false
        },
        'remove-to-zone': {
            title: 'Select Zone',
            icon: Trash2,
            confirmLabel: 'Confirm',
            color: 'slate',
            showSelectAll: false
        },
        'resolve-trigger': {
            title: 'Resolve Trigger',
            icon: Zap,
            confirmLabel: 'Resolve',
            color: 'purple',
            showSelectAll: false
        }
    };
    return configs[mode] || configs['declare-attackers'];
};
