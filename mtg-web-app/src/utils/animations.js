/**
 * playTokenFlight
 * High-performance token creation animation using Web Animations API (WAAPI).
 * 
 * @param {Object} sourceRect - BoundingClientRect of the resolving stack item (image part)
 * @param {Object} targetRect - BoundingClientRect of the target position on the battlefield
 * @param {string} cardArt - URL of the card art
 * @param {number} duration - Duration in ms (default 700)
 */
export const playTokenFlight = (sourceRect, targetRect, cardArt, duration = 700) => {
    if (!sourceRect || !targetRect) return Promise.resolve();

    // Create a temporary proxy element
    const proxy = document.createElement('div');
    proxy.style.position = 'fixed';
    proxy.style.left = '0';
    proxy.style.top = '0';
    proxy.style.width = '140px';
    proxy.style.height = '100px';
    proxy.style.zIndex = '1000000';
    proxy.style.pointerEvents = 'none';
    proxy.style.borderRadius = '12px';
    proxy.style.overflow = 'hidden';
    proxy.style.boxShadow = '0 0 30px rgba(34, 211, 238, 0.6), 0 0 60px rgba(34, 211, 238, 0.2)';
    proxy.style.backgroundColor = '#1a1a1a';
    proxy.style.border = '1px solid rgba(255, 255, 255, 0.1)';

    if (cardArt) {
        proxy.style.backgroundImage = `url(${cardArt})`;
        proxy.style.backgroundSize = 'cover';
        proxy.style.backgroundPosition = 'center 15%';
    }

    proxy.style.opacity = '1';

    document.body.appendChild(proxy);

    // Calculate start and end positions (center to center)
    const startX = sourceRect.left + sourceRect.width / 2 - 70;
    const startY = sourceRect.top + sourceRect.height / 2 - 50;
    const endX = targetRect.left + targetRect.width / 2 - 70;
    const endY = targetRect.top + targetRect.height / 2 - 50;

    // Calculate control point for a parabolic arc (above the midpoint)
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 200;

    const keyframes = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic Bezier Formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * midX + t ** 2 * endX;
        const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * midY + t ** 2 * endY;

        // Scale 0.4 to 1.0 
        const scale = 0.4 + (0.6 * t);

        // Slight rotation (Peak at midpoint)
        const rotation = Math.sin(t * Math.PI) * 12;

        keyframes.push({
            transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
            opacity: t < 0.1 ? t * 10 : 1, // Rapid fade in
            zIndex: t > 0.8 ? '10' : '1000000', // Tuck under target at the very end
            offset: t
        });
    }

    const animation = proxy.animate(keyframes, {
        duration: duration,
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
        fill: 'forwards'
    });

    return new Promise((resolve) => {
        animation.onfinish = () => {
            document.body.removeChild(proxy);
            resolve();
        };
    });
};
