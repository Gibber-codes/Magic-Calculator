import { useEffect, useRef, useState, useCallback } from 'react';
import { getCardZone } from '../utils/cardUtils';

/**
 * Stack → zone auto-force rule for the battlefield view tabs.
 *
 * - While triggers are on the stack, the view is forced to the TOP item's
 *   source-card zone and the tabs are pinned (manual switching blocked with
 *   a shake + toast). Teaches the stack mechanic without a tutorial.
 * - Edge cases: if the source card left the battlefield or the item has no
 *   sourceId, the current view is kept (still pinned) rather than guessing.
 * - While targeting mode is active the rule is suspended entirely — eligible
 *   targets may live in either zone and the player must be able to reach them.
 * - When the stack clears, the pin lifts but the view does NOT snap back.
 */
const useZoneView = ({ abilityStack, cards, activeZone, setActiveZone, targetingActive = false }) => {
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    const pinned = abilityStack.length > 0 && !targetingActive;

    useEffect(() => {
        if (targetingActive || abilityStack.length === 0) return;
        const topItem = abilityStack[abilityStack.length - 1];
        const sourceCard = topItem.sourceId ? cards.find(c => c.id === topItem.sourceId) : null;
        if (!sourceCard) return;
        const zone = getCardZone(sourceCard);
        if (zone !== activeZone) setActiveZone(zone);
    }, [abilityStack, cards, activeZone, setActiveZone, targetingActive]);

    const showToast = useCallback((message) => {
        setToast(message);
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 2200);
    }, []);

    useEffect(() => () => clearTimeout(toastTimerRef.current), []);

    const handleBlockedSwitch = useCallback(() => {
        showToast('Resolve stack triggers first.');
    }, [showToast]);

    return { pinned, toast, handleBlockedSwitch };
};

export default useZoneView;
