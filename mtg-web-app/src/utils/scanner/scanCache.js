const CACHE_KEY = 'combocalc_recent_scans';
const MAX_CACHE_SIZE = 20;

/**
 * Add card to recent scans
 */
export function cacheScannedCard(card) {
    const cache = getRecentScans();

    // Remove if already exists (move to front)
    const filtered = cache.filter(c => c.scryfallId !== card.scryfallId);

    // Add to front
    filtered.unshift({
        name: card.name,
        scryfallId: card.scryfallId,
        imageUrl: card.imageUrl,
        timestamp: Date.now()
    });

    // Limit cache size
    const trimmed = filtered.slice(0, MAX_CACHE_SIZE);

    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
}

/**
 * Get recent scans
 */
export function getRecentScans() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch (error) {
        return [];
    }
}

/**
 * Clear cache
 */
export function clearScanCache() {
    localStorage.removeItem(CACHE_KEY);
}
