import { useState, useRef, useCallback } from 'react';

export const useBattlefieldCardInteractions = ({
    card,
    isSelected,
    onMouseDown,
    stackCards,
    isEligibleAttacker,
    isDeclaredAttacker,
    isTargeting,
    isTouch,
    onToggleStackSlider
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);

    const longPressTimerRef = useRef(null);
    const isLongPressingRef = useRef(false);

    const handlePointerDown = useCallback((e) => {
        if (e.button === 2) return;

        const canOpenSlider = (isEligibleAttacker || isDeclaredAttacker) && stackCards?.length > 1 && onToggleStackSlider;

        if (!isSelected && !canOpenSlider) return;

        isLongPressingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressingRef.current = true;
            if (canOpenSlider) {
                onToggleStackSlider();
            } else {
                setShowOverlay(true);
            }
        }, 500);
    }, [isSelected, isEligibleAttacker, isDeclaredAttacker, stackCards, onToggleStackSlider]);

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
        isLongPressing: isLongPressingRef,
        handlePointerDown,
        handlePointerUp,
        handlePointerMove,
        handleClick,
        handleMouseEnter,
        handleMouseLeave
    };
};
