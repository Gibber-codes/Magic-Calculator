/**
 * playTokenFlight
 * High-performance token creation animation using Web Animations API (WAAPI).
 * 
 * @param {Object} sourceRect - BoundingClientRect of the resolving stack item (image part)
 * @param {Object} targetRect - BoundingClientRect of the target position on the battlefield
 * @param {Object} card - Full card object for metadata
 * @param {number} duration - Duration in ms (default 700)
 */
export const playTokenFlight = (sourceRect, targetRect, card, duration = 700) => {
    if (!sourceRect || !targetRect || !card) return Promise.resolve();

    const CARD_WIDTH = 140;
    const BANNER_HEIGHT = 28;
    const ART_HEIGHT = 100;
    const FULL_HEIGHT = BANNER_HEIGHT + ART_HEIGHT + BANNER_HEIGHT + 4; // Including margins

    // Create a temporary proxy element
    const proxy = document.createElement('div');
    proxy.style.position = 'fixed';
    proxy.style.left = '0';
    proxy.style.top = '0';
    proxy.style.width = `${CARD_WIDTH}px`;
    proxy.style.height = `${FULL_HEIGHT}px`;
    proxy.style.zIndex = '1000000';
    proxy.style.pointerEvents = 'none';
    proxy.style.display = 'flex';
    proxy.style.flexDirection = 'column';
    proxy.style.alignItems = 'center';
    proxy.style.opacity = '1';

    // 1. Top Banner
    const topBanner = document.createElement('div');
    topBanner.style.width = '100%';
    topBanner.style.height = `${BANNER_HEIGHT}px`;
    topBanner.style.display = 'flex';
    topBanner.style.alignItems = 'center';
    topBanner.style.justifyContent = 'center';
    topBanner.style.gap = '6px';
    topBanner.style.padding = '0 4px';
    topBanner.style.boxSizing = 'border-box';
    topBanner.style.marginBottom = '-4px';
    topBanner.style.zIndex = '30';
    topBanner.style.position = 'relative';

    // Data Extraction Helpers
    const name = card.name || card.sourceName || 'Token';

    let type = card.type_line || card.type || card.sourceType || 'Permanent';
    if (type.includes(' — ')) type = type.split(' — ')[0]; // Take primary type for space

    const pt = (card.power !== undefined && card.toughness !== undefined)
        ? `${card.power}/${card.toughness}`
        : card.sourcePT;

    // Color Dot Mapping
    let colorDot = card.sourceColor;
    if (!colorDot && card.colors && card.colors.length > 0) {
        const colorMap = {
            'W': '#f8f6d8', 'U': '#c1d7e9', 'B': '#bab1ab',
            'R': '#e49977', 'G': '#a3c095', 'M': '#c0aa48'
        };
        const c = card.colors.length > 1 ? 'M' : card.colors[0];
        colorDot = colorMap[c] || '#94a3b8';
    }

    if (colorDot) {
        const dot = document.createElement('div');
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = colorDot;
        dot.style.flexShrink = '0';
        dot.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
        dot.style.border = '1px solid rgba(255,255,255,0.2)';
        topBanner.appendChild(dot);
    }

    const nameDiv = document.createElement('div');
    nameDiv.className = 'w-full text-center text-[10px] font-bold truncate leading-tight';
    nameDiv.style.color = 'white';
    nameDiv.textContent = name;
    topBanner.appendChild(nameDiv);

    // 2. Art Window
    const artWindow = document.createElement('div');
    artWindow.style.width = '100%';
    artWindow.style.height = `${ART_HEIGHT}px`;
    artWindow.style.borderRadius = '6px';
    artWindow.style.overflow = 'hidden';
    artWindow.style.backgroundColor = '#1a1a1a';
    artWindow.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    artWindow.style.position = 'relative';
    artWindow.style.zIndex = '30';

    const cardArt = card.art_crop || card.image_normal || card.sourceArt;
    if (cardArt) {
        const img = document.createElement('img');
        img.src = cardArt;
        img.className = 'w-full h-full object-cover';
        img.style.objectPosition = '0% 15%';
        artWindow.appendChild(img);
    }

    // 3. Bottom Banner
    const bottomBanner = document.createElement('div');
    bottomBanner.style.width = '100%';
    bottomBanner.style.height = `${BANNER_HEIGHT}px`;
    bottomBanner.style.display = 'flex';
    bottomBanner.style.alignItems = 'center';
    bottomBanner.style.justifyContent = 'center';
    bottomBanner.style.padding = '0 4px';
    bottomBanner.style.boxSizing = 'border-box';
    bottomBanner.style.marginTop = '4px';
    bottomBanner.style.zIndex = '30';
    bottomBanner.style.position = 'relative';

    const typeLine = document.createElement('div');
    typeLine.style.width = '80%';
    typeLine.style.display = 'flex';
    typeLine.style.alignItems = 'center';
    typeLine.style.justifyContent = 'center';
    typeLine.style.overflow = 'hidden';

    const typeSpan = document.createElement('span');
    typeSpan.className = 'text-[9px] font-semibold truncate flex-1 leading-tight text-center';
    typeSpan.style.color = 'white';
    typeSpan.textContent = type;
    typeLine.appendChild(typeSpan);
    bottomBanner.appendChild(typeLine);

    if (pt) {
        const ptDiv = document.createElement('div');
        ptDiv.className = 'text-[10px] font-bold flex gap-0.5 text-white';
        ptDiv.textContent = pt;
        bottomBanner.appendChild(ptDiv);
    }

    proxy.appendChild(topBanner);
    proxy.appendChild(artWindow);
    proxy.appendChild(bottomBanner);

    document.body.appendChild(proxy);

    // Calculate start and end positions (center to center)
    const startX = sourceRect.left + sourceRect.width / 2 - CARD_WIDTH / 2;
    const startY = sourceRect.top + sourceRect.height / 2 - FULL_HEIGHT / 2;
    const endX = targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2;
    const endY = targetRect.top + targetRect.height / 2 - FULL_HEIGHT / 2;

    // Standard straight-line flight for all ability-spawned cards
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const keyframes = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic Bezier Formula with linear midpoint = straight line
        const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * midX + t ** 2 * endX;
        const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * midY + t ** 2 * endY;

        // Scale 0.4 to 1.0 
        const scale = 0.4 + (0.6 * t);

        // No rotation for a cleaner straight-line feel
        const rotation = 0;

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
