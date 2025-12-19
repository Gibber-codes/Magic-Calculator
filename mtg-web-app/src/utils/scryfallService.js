import { getCardAbilities } from './keywordParser';

const SCRYFALL_BASE = 'https://api.scryfall.com';

/**
 * Fetches autocomplete suggestions from Scryfall.
 * @param {string} query 
 * @returns {Promise<string[]>} List of card names
 */
export async function searchScryfall(query) {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch(`${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MTG-Battlefield-App/1.0'
            }
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.warn('Scryfall rate limit hit');
                return [];
            }
            throw new Error(`Scryfall API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error searching Scryfall:', error);
        return [];
    }
}

/**
 * Fetches a single card by exact name.
 * Uses localStorage to cache results.
 * @param {string} name 
 * @returns {Promise<Object>} Scryfall card object
 */
export async function getScryfallCard(name) {
    const cacheKey = `scryfall_card_${name.toLowerCase()}`;

    // Cache expiration: 24 hours in milliseconds
    const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

    // Check Cache
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Check if cache entry has expired (older than 24 hours)
            const isExpired = Date.now() - timestamp > CACHE_EXPIRATION_MS;
            if (!isExpired) {
                // console.log('Cache hit for:', name);
                return data;
            }
            // console.log('Cache expired for:', name);
        }
    } catch (e) {
        console.warn('Error reading from cache:', e);
    }

    try {
        const response = await fetch(`${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MTG-Battlefield-App/1.0'
            }
        });

        if (!response.ok) throw new Error('Card not found');
        const data = await response.json();

        // Save to Cache
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Error writing to cache (likely quota exceeded):', e);
        }

        return data;
    } catch (error) {
        console.error('Error fetching card:', error);
        throw error;
    }
}

/**
 * Formats a Scryfall card object into the app's internal BattlefieldCard format.
 * @param {Object} scryfallCard 
 * @returns {Object} initial card definition for createBattlefieldCard
 */
export function formatScryfallCard(scryfallCard) {
    // Handle multi-face cards (transform, split, etc)
    // We prefer the front face for the main stats if available
    const primaryFace = scryfallCard.card_faces?.[0] || scryfallCard;
    const combinedColors = scryfallCard.colors || primaryFace.colors || [];

    // Attempt to extract power/toughness from primary face or root
    // Note: scryfall returns them as strings "2", "*", "1+*", etc.
    const p = primaryFace.power;
    const t = primaryFace.toughness;

    const oracleText = primaryFace.oracle_text || '';

    // Build base card object
    const baseCard = {
        name: scryfallCard.name,
        type_line: scryfallCard.type_line, // Keep full type line for parsing
        oracle_text: oracleText,
        colors: combinedColors,
        mana_cost: primaryFace.mana_cost || '',
        power: p,
        toughness: t,
        art_crop: primaryFace.image_uris?.art_crop || scryfallCard.image_uris?.art_crop || '',
        image_normal: scryfallCard.image_uris?.normal || primaryFace.image_uris?.normal || '',
        scryfall_id: scryfallCard.id,
        all_parts: scryfallCard.all_parts // Preserve for token fetching
    };

    // Parse abilities from oracle text
    const parsedAbilities = getCardAbilities(baseCard);

    return {
        ...baseCard,
        abilities: parsedAbilities.abilities,
        replacementEffects: parsedAbilities.replacementEffects,
        keywords: parsedAbilities.keywords,
        _parsed: parsedAbilities.parsed // Flag to indicate if abilities were auto-parsed
    };
}

/**
 * Fetches related token cards for a given Scryfall card object.
 * Looks at the 'all_parts' field for items with component: 'token'.
 * @param {Object} scryfallCard 
 * @returns {Promise<Array>} List of formatted token card objects
 */
export async function fetchRelatedTokens(scryfallCard) {
    if (!scryfallCard.all_parts) return [];

    const tokens = [];
    const layoutBlocklist = ['planar', 'scheme', 'vanguard']; // skip non-standard extras if needed

    for (const part of scryfallCard.all_parts) {
        // We generally want tokens or maybe meld parts if relevant, but user asked for tokens
        if (part.component === 'token') {
            try {
                // Fetch the token data
                // Note: The URI in all_parts usually points to the specific object
                const response = await fetch(part.uri);
                if (!response.ok) continue;

                const tokenData = await response.json();

                // Handle Double-Faced Tokens (like Roles or Modal Double-Faced Tokens) via splitting
                // If it has card_faces that are distinct (have their own image_uris), treat them as separate tokens
                if (tokenData.card_faces && tokenData.card_faces.length > 1 && tokenData.card_faces[0].image_uris) {
                    tokenData.card_faces.forEach(face => {
                        // Create a synthetic card object for the face
                        const faceData = {
                            ...tokenData,
                            name: face.name,
                            type_line: face.type_line,
                            oracle_text: face.oracle_text,
                            colors: face.colors || tokenData.colors,
                            mana_cost: face.mana_cost,
                            image_uris: face.image_uris,
                            card_faces: undefined // Prevent recursion/confusion in formatScryfallCard
                        };

                        const formatted = formatScryfallCard(faceData);
                        formatted.isToken = true;

                        // Add to list if not duplicate
                        if (!tokens.some(t => t.name === formatted.name)) {
                            tokens.push(formatted);
                        }
                    });
                } else {
                    // Standard Single-Face Processing
                    const formatted = formatScryfallCard(tokenData);
                    formatted.isToken = true;

                    if (!tokens.some(t => t.name === formatted.name)) {
                        tokens.push(formatted);
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch token part:', part.name, e);
            }
        }
    }

    return tokens;
}
