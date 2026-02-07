import Fuse from 'fuse.js';
import { formatScryfallCard, getScryfallCard } from '../scryfallService';

let fuseInstance = null;
let cardDatabase = null;

/**
 * Initialize Fuse with Scryfall card names
 */
async function initializeFuse() {
    if (!cardDatabase) {
        console.log('Fetching card database from Scryfall...');
        try {
            const response = await fetch('https://api.scryfall.com/catalog/card-names');
            if (!response.ok) throw new Error(`Scryfall Catalog API failed: ${response.status}`);

            const data = await response.json();
            cardDatabase = data.data.map(name => ({ name }));
            console.log(`Loaded ${cardDatabase.length} card names.`);

            fuseInstance = new Fuse(cardDatabase, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
                ignoreLocation: true,
                minMatchCharLength: 3
            });
        } catch (err) {
            console.error('Failed to initialize Fuse:', err);
            // Fallback to empty to prevent crashes
            cardDatabase = [];
            fuseInstance = new Fuse([], {});
            throw err;
        }
    }
}

/**
 * Match extracted text lines against Scryfall
 * @param {string} ocrText - Multi-line OCR output
 * @returns {Promise<Array>} - Matched cards with metadata
 */
export async function matchCards(ocrResult) {
    await initializeFuse();
    console.log('Card database status:', cardDatabase ? `${cardDatabase.length} cards loaded` : 'NOT LOADED');

    // Handle both string (legacy) and object verification
    const lines = typeof ocrResult === 'string'
        ? ocrResult.split('\n').map(text => ({ text, confidence: 70 }))
        : ocrResult.lines;

    console.log(`Processing ${lines.length} lines for matching against database...`);
    const matches = [];

    for (const lineObj of lines) {
        const { text, confidence } = lineObj;

        // Relaxed confidence check - significantly lowered to allow "dim" but correct text
        if (confidence < 20) {
            console.log(`Skipping very low confidence line: "${text}" (${confidence}%)`);
            continue;
        }

        // Clean line for matching
        const cleaned = cleanTextForMatching(text);

        if (cleaned.length < 3) continue;

        // Search Fuse
        // Lower threshold = stricter matching (0.0 is exact, 1.0 is anything)
        const results = fuseInstance.search(cleaned, { limit: 5 });

        if (results.length > 0) {
            const bestMatch = results[0];

            console.log(`Potential match for "${cleaned}": "${bestMatch.item.name}" (Score: ${bestMatch.score})`);

            // Relaxed Fuse score check (0.5 is standard fuzzy-ish)
            // Fuse score: 0 is perfect, 1 is bad.
            if (bestMatch.score > 0.5) {
                console.log(`Rejected match "${bestMatch.item.name}" - Score ${bestMatch.score} too high`);
                continue;
            }

            const cardName = bestMatch.item.name;

            // Calculate combined confidence
            // Fuse Confidence (inverted score): 0.1 score -> 0.9 confidence
            const matchConfidence = 1 - bestMatch.score;
            // OCR Confidence: 80 -> 0.8
            const ocrConfidence = confidence / 100;

            // Final confidence is a weighted average or product
            const finalConfidence = (matchConfidence * 0.6) + (ocrConfidence * 0.4);

            console.log(`ACCEPTED: "${cleaned}" -> "${cardName}"`, {
                ocrConf: confidence,
                fuseScore: bestMatch.score,
                finalConf: finalConfidence
            });

            // Fetch full card details from Scryfall (uses cache)
            try {
                const cardData = await getScryfallCard(cardName);
                const formatted = formatScryfallCard(cardData);

                matches.push({
                    ...formatted,
                    scryfallId: formatted.scryfall_id, // Backward compatibility
                    imageUrl: formatted.image_normal,   // Backward compatibility
                    confidence: finalConfidence,
                    originalOCR: text
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
 * Manual search for user corrections
 * @param {string} query - User-typed card name
 * @returns {Array} - Top 5 matches
 */
export async function searchCards(query) {
    await initializeFuse();

    const results = fuseInstance.search(query, { limit: 5 });
    return results.map(r => r.item.name);
}
