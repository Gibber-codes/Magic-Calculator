import { RotateCcw, Zap, Sword, History } from 'lucide-react';

export const APP_VERSION = '1.0.0';

// AdSense Configuration
export const ADSENSE_CLIENT_ID = 'ca-pub-XXXXXXXXXX'; // Replace with actual ID
export const ADSENSE_SLOT_ID = 'YYYYYYYY'; // Replace with actual Slot ID

// True once the placeholder IDs above are replaced with real ones.
// AdBanner refuses to load real ads while this is false, even in production builds.
export const ADSENSE_CONFIGURED =
    !ADSENSE_CLIENT_ID.includes('XXXXXXXXXX') && !ADSENSE_SLOT_ID.includes('YYYYYYYY');

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
