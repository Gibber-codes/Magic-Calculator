import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Detect if the device supports hover (mouse/trackpad)
 */
export const useIsTouchDevice = () => {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        // Robust detection: Check hardware capability OR pointer type
        // This ensures phones, tablets, and hybrids get the touch-optimized UI (tap-to-hover)
        const checkTouch = () => {
            return (
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (window.matchMedia('(pointer: coarse)').matches)
            );
        };

        setIsTouch(checkTouch());

        // Listen for changes (e.g. plugging in a mouse/monitor? rare but good to have)
        const mediaQuery = window.matchMedia('(pointer: coarse)');
        const handler = (e) => setIsTouch(checkTouch() || e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return isTouch;
};


/**
 * Replace hover with tap-to-toggle on touch devices
 * @param {boolean} initialState - Starting expanded state
 * @returns {object} { isExpanded, toggleExpand, handlers }
 */
export const useTapToExpand = (initialState = false) => {
    const [isExpanded, setIsExpanded] = useState(initialState);
    const isTouch = useIsTouchDevice();

    const toggleExpand = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const collapse = useCallback(() => {
        setIsExpanded(false);
    }, []);

    // Return different handlers based on device type
    const handlers = isTouch
        ? {
            onClick: toggleExpand,
            // Prevent default hover behavior
            onMouseEnter: undefined,
            onMouseLeave: undefined,
        }
        : {
            onMouseEnter: () => setIsExpanded(true),
            onMouseLeave: () => setIsExpanded(false),
            onClick: undefined,
        };

    return { isExpanded, toggleExpand, collapse, handlers, isTouch };
};


/**
 * Long-press detection for touch devices
 * @param {function} onLongPress - Callback after long press completes
 * @param {number} delay - Duration in ms (default 500)
 */
export const useLongPress = (onLongPress, delay = 500) => {
    const [isPressing, setIsPressing] = useState(false);
    const timeoutRef = useRef(null);
    const targetRef = useRef(null);

    const start = useCallback((e) => {
        targetRef.current = e.target;
        setIsPressing(true);

        timeoutRef.current = setTimeout(() => {
            onLongPress?.(e);
            setIsPressing(false);
        }, delay);
    }, [onLongPress, delay]);

    const cancel = useCallback(() => {
        setIsPressing(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        isPressing,
        handlers: {
            onTouchStart: start,
            onTouchEnd: cancel,
            onTouchMove: cancel,
            onTouchCancel: cancel,
            // Also support mouse for testing
            onMouseDown: start,
            onMouseUp: cancel,
            onMouseLeave: cancel,
        },
    };
};


/**
 * Touch-friendly action menu (replaces hover action buttons)
 * @param {Array} actions - Array of action objects { id, label, icon, color, handler }
 */
export const useTouchActionMenu = (actions = []) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);
    const isTouch = useIsTouchDevice();

    const openMenu = useCallback((card) => {
        setSelectedCard(card);
        setIsOpen(true);
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
        setSelectedCard(null);
    }, []);

    const handleAction = useCallback((actionId) => {
        const action = actions.find(a => a.id === actionId);
        if (action?.handler && selectedCard) {
            action.handler(selectedCard);
        }
        closeMenu();
    }, [actions, selectedCard, closeMenu]);

    // Get card interaction handlers
    const getCardHandlers = useCallback((card) => {
        if (isTouch) {
            return {
                onClick: (e) => {
                    e.stopPropagation();
                    openMenu(card);
                },
            };
        }
        return {}; // Desktop uses hover-based buttons
    }, [isTouch, openMenu]);

    return {
        isOpen,
        selectedCard,
        openMenu,
        closeMenu,
        handleAction,
        getCardHandlers,
        isTouch,
    };
};


/**
 * Swipe gesture detection
 * @param {object} handlers - { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }
 * @param {number} threshold - Min distance to trigger swipe (default 50)
 */
export const useSwipe = (handlers = {}, threshold = 50) => {
    const touchStart = useRef({ x: 0, y: 0 });
    const touchEnd = useRef({ x: 0, y: 0 });

    const onTouchStart = useCallback((e) => {
        touchStart.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
        };
    }, []);

    const onTouchMove = useCallback((e) => {
        touchEnd.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
        };
    }, []);

    const onTouchEnd = useCallback(() => {
        const deltaX = touchStart.current.x - touchEnd.current.x;
        const deltaY = touchStart.current.y - touchEnd.current.y;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY && absX > threshold) {
            // Horizontal swipe
            if (deltaX > 0) {
                handlers.onSwipeLeft?.();
            } else {
                handlers.onSwipeRight?.();
            }
        } else if (absY > absX && absY > threshold) {
            // Vertical swipe
            if (deltaY > 0) {
                handlers.onSwipeUp?.();
            } else {
                handlers.onSwipeDown?.();
            }
        }
    }, [handlers, threshold]);

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
};


/**
 * Prevent pull-to-refresh while allowing normal scroll
 */
export const usePreventPullToRefresh = () => {
    useEffect(() => {
        let startY = 0;

        const handleTouchStart = (e) => {
            startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            const y = e.touches[0].clientY;
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

            // Prevent pull-to-refresh when at top and pulling down
            if (scrollTop === 0 && y > startY) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);
};
