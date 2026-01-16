import { useState, useRef, useEffect, useCallback } from 'react';

export const useBattlefieldCardInteractions = ({
    card,
    isSelected,
    onMouseDown,
    onAction,
    onStackSelectionChange,
    stackCards,
    count,
    isEligibleAttacker,
    isDeclaredAttacker,
    isTargeting,
    isTouch
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [deleteCount, setDeleteCount] = useState(count);

    const longPressTimerRef = useRef(null);
    const isLongPressingRef = useRef(false);

    // Sync deleteCount with count
    useEffect(() => {
        if (count > 0) {
            setDeleteCount(count);
        }
    }, [count]);

    const handlePointerDown = useCallback((e) => {
        if (!isSelected) return;
        if (e.button === 2) return;

        isLongPressingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressingRef.current = true;
            setShowOverlay(true);
        }, 500);
    }, [isSelected]);

    const handlePointerUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        setTimeout(() => {
            isLongPressingRef.current = false;
        }, 50);
        setShowOverlay(false);
    }, []);

    const handlePointerMove = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    }, []);

    const handleStackChange = useCallback((e, newCount) => {
        e.stopPropagation();
        const safeCount = Math.max(1, Math.min(count, newCount));

        if (onStackSelectionChange && stackCards && (isEligibleAttacker || isDeclaredAttacker)) {
            onStackSelectionChange(stackCards, safeCount);
        } else {
            setDeleteCount(safeCount);
        }
    }, [count, onStackSelectionChange, stackCards, isEligibleAttacker, isDeclaredAttacker]);

    const cycleSelection = useCallback((e, displayCount) => {
        e.stopPropagation();
        let nextCount;
        if (displayCount === 1) {
            nextCount = Math.ceil(count / 2);
            if (nextCount === 1) nextCount = count;
        } else if (displayCount === Math.ceil(count / 2) && count > 2) {
            nextCount = count;
        } else {
            nextCount = 1;
        }
        handleStackChange(e, nextCount);
    }, [count, handleStackChange]);

    const handleClick = useCallback((e) => {
        if (isTouch && !isLongPressingRef.current) {
            e.stopPropagation();
            onMouseDown(e, card);
        }
    }, [isTouch, onMouseDown, card]);

    const handleMouseEnter = useCallback(() => {
        if (!isTargeting) setIsHovered(true);
    }, [isTargeting]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    return {
        isHovered,
        showOverlay,
        deleteCount,
        isLongPressing: isLongPressingRef,
        handlePointerDown,
        handlePointerUp,
        handlePointerMove,
        handleStackChange,
        cycleSelection,
        handleClick,
        handleMouseEnter,
        handleMouseLeave
    };
};
