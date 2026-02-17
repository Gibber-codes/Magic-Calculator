import { useEffect, useCallback } from 'react';
import { searchScryfall, getScryfallCard, formatScryfallCard } from '../utils/scryfallService';

/**
 * Hook for card search logic
 * Manages the debounced Scryfall API calls
 * State is managed by App.jsx to avoid circular dependencies with useCardActions
 */
const useSearch = ({
    // Search state (managed by App.jsx)
    searchQuery,
    setSearchQuery,
    setSearchResults,
    setIsSearching,

    // Handler from useCardActions
    handleAddToRecents
}) => {

    // Debounced Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                const results = await searchScryfall(searchQuery);
                setSearchResults(results);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, setSearchResults, setIsSearching]);

    // Handle selecting a search result
    const handleSelectSearchResult = useCallback(async (name) => {
        // Clear search immediately to snap back to recents
        setSearchQuery('');
        setSearchResults([]);

        try {
            const fetchedCardData = await getScryfallCard(name);
            const formatted = formatScryfallCard(fetchedCardData);
            handleAddToRecents(formatted);
        } catch (e) {
            console.error(e);
        }
    }, [handleAddToRecents, setSearchQuery, setSearchResults]);

    return {
        handleSelectSearchResult
    };
};

export default useSearch;
