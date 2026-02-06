import { toast } from 'react-hot-toast'; // Assuming toast is available or needs to be passed

// Constants
const FAVORITES_KEY = 'combocalc_favorites';
const CARD_USAGE_KEY = 'combocalc_card_usage';
const MAX_FAVORITES = 30;

// --- Favorites Management ---

export const getFavorites = () => {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
            console.error('Favorites data is corrupted (not an array). Resetting.');
            return [];
        }
        return parsed;
    } catch (e) {
        console.error('Failed to parse favorites:', e);
        return [];
    }
};

export const isFavorite = (cardId) => {
    const favorites = getFavorites();
    return favorites.some(f => f.id === cardId);
};

export const canAddFavorite = () => {
    const favorites = getFavorites();
    return favorites.length < MAX_FAVORITES;
};

export const saveFavorite = (card, isManual = true) => {
    try {
        const favorites = getFavorites();

        // Check if already exists to avoid duplicates
        if (favorites.some(f => f.id === card.id)) {
            return { success: false, reason: 'already_exists' };
        }

        if (favorites.length >= MAX_FAVORITES) {
            return { success: false, reason: 'limit_reached' };
        }

        const newFavorite = {
            id: card.id,
            name: card.name,
            // Store necessary data to reconstruct/display the card
            // Using whatever props are available on the card object
            image_normal: card.image_normal || card.image_uris?.normal,
            art_crop: card.art_crop || card.image_uris?.art_crop,
            scryfall_uri: card.scryfall_uri,
            mana_cost: card.mana_cost,
            type_line: card.type_line,
            oracle_text: card.oracle_text,
            power: card.power,
            toughness: card.toughness,
            colors: card.colors,

            // Meta data
            dateAdded: new Date().toISOString(),
            manualSave: isManual
        };

        const updatedFavorites = [...favorites, newFavorite];
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));

        // Only show toast if manual action - consumers can choose to show toast otherwise
        // if (isManual) {
        //   // If we had a global toast function we'd call it here, but often better to return status
        // }

        return { success: true };
    } catch (e) {
        console.error('Failed to save favorite:', e);
        if (e.name === 'QuotaExceededError') {
            return { success: false, reason: 'storage_full' };
        }
        return { success: false, reason: 'error' };
    }
};

export const removeFavorite = (cardId) => {
    try {
        const favorites = getFavorites();
        const filtered = favorites.filter(f => f.id !== cardId);

        if (filtered.length === favorites.length) {
            return { success: false, reason: 'not_found' }; // Nothing changed
        }

        localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
        return { success: true };
    } catch (e) {
        console.error('Failed to remove favorite:', e);
        return { success: false, reason: 'error' };
    }
};


// --- Usage Tracking (Auto-Save) ---

const getCardUsage = () => {
    try {
        const stored = localStorage.getItem(CARD_USAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to parse card usage:', e);
        return {};
    }
};

export const trackCardUsage = (cardId) => {
    try {
        const usage = getCardUsage();
        const currentCount = usage[cardId] || 0;
        const newCount = currentCount + 1;

        usage[cardId] = newCount;
        localStorage.setItem(CARD_USAGE_KEY, JSON.stringify(usage));

        return newCount;
    } catch (e) {
        console.error('Failed to track card usage:', e);
        return 0;
    }
};

export const checkAutoSaveCandidate = (card) => {
    // If already favorite, ignore
    if (isFavorite(card.id)) return false;

    const usage = getCardUsage();
    const count = usage[card.id] || 0;

    // Check threshold (2 uses)
    if (count >= 2) {
        // Attempt to auto-save
        // Using 'false' for isManual
        const result = saveFavorite(card, false);
        return result.success;
    }

    return false;
};
