import { useState, useCallback } from 'react';

export function useScanner(onCardsAdded) {
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const openScanner = useCallback(() => {
        setIsScannerOpen(true);
    }, []);

    const closeScanner = useCallback(() => {
        setIsScannerOpen(false);
    }, []);

    const handleCardsConfirmed = useCallback((cards) => {
        // Add cards to battlefield
        onCardsAdded(cards);

        // Cache for quick access later
        // Note: dynamic import to avoid circular dependencies if utils import hooks (unlikely but safe)
        // or just to keep initialization light
        import('../utils/scanner/scanCache').then(({ cacheScannedCard }) => {
            cards.forEach(card => cacheScannedCard(card));
        });

        closeScanner();
    }, [onCardsAdded, closeScanner]);

    return {
        isScannerOpen,
        openScanner,
        closeScanner,
        handleCardsConfirmed
    };
}
