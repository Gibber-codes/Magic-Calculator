import { RotateCcw, Zap, Sword, History } from 'lucide-react';

// Layout Constants
export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 200;
export const CARD_GAP = 12;

// Phase Flow
export const PHASE_ORDER = ['Beginning', 'Main', 'Combat', 'Main 2', 'End'];

export const PHASE_INFO = {
    Beginning: { label: 'Untap/Upkeep', icon: RotateCcw },
    Main: { label: 'Main Phase', icon: Zap },
    Combat: { label: 'Combat', icon: Sword },
    'Main 2': { label: 'Main Phase 2', icon: Zap },
    End: { label: 'End Step', icon: History }
};

export const COMBAT_STEPS = [
    'Beginning of Combat',
    'Declare Attackers',
    'Declare Blockers',
    'Combat Damage',
    'End of Combat'
];
