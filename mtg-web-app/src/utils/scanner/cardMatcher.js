import Fuse from 'fuse.js';

let fuseInstance = null;
let cardDatabase = null;

/**
 * Initialize Fuse with Scryfall card names
 */
async function initializeFuse() {
    if (!cardDatabase) {
        // Fetch all card names from Scryfall
        const response = await fetch('https://api.scryfall.com/catalog/card-names');
        const data = await response.json();
        cardDatabase = data.data.map(name => ({ name }));

        fuseInstance = new Fuse(cardDatabase, {
            keys: ['name'],
            threshold: 0.4, // 60% similarity required
            includeScore: true,
            ignoreLocation: true,
            minMatchCharLength: 3
        });
    }
}

/**
 * Match extracted text lines against Scryfall
 * @param {string} ocrText - Multi-line OCR output
 * @returns {Promise<Array>} - Matched cards with metadata
 */
export async function matchCards(ocrText) {
    await initializeFuse();

    const lines = ocrText.split('\n').filter(line => line.length > 2);
    const matches = [];

    for (const line of lines) {
        // Clean line for matching
        const cleaned = cleanTextForMatching(line);

        if (cleaned.length < 3) continue;

        // Search Fuse
        const results = fuseInstance.search(cleaned, { limit: 1 });

        if (results.length > 0 && results[0].score < 0.4) {
            const cardName = results[0].item.name;

            // Fetch full card details from Scryfall
            try {
                const cardData = await fetchCardDetails(cardName);
                matches.push({
                    name: cardName,
                    scryfallId: cardData.id,
                    imageUrl: cardData.image_uris?.small || cardData.image_uris?.normal,
                    power: cardData.power,
                    toughness: cardData.toughness,
                    confidence: 1 - results[0].score, // Higher = better
                    originalOCR: line,
                    data: cardData // Include full card data for game engine
                });
            } catch (error) {
                console.warn(`Failed to fetch details for ${cardName}`);
            }
        }
    }

    return matches;
}

/**
 * Clean OCR text for better matching
 */
function cleanTextForMatching(text) {
    return text
        .replace(/[^a-zA-Z\s,'-]/g, '') // Remove non-letter chars except punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .toLowerCase();
}

/**
 * Fetch full card details from Scryfall
 */
async function fetchCardDetails(cardName) {
    const encodedName = encodeURIComponent(cardName);
    const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodedName}`
    );

    if (!response.ok) {
        throw new Error(`Scryfall API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Manual search for user corrections
 * @param {string} query - User-typed card name
 * @returns {Array} - Top 5 matches
 */
export async function searchCards(query) {
    await initializeFuse();

    const results = fuseInstance.search(query, { limit: 5 });
    return results.map(r => r.item.name);
}
