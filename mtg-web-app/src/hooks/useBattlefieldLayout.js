import { useMemo } from 'react';
import { CARD_WIDTH, CARD_GAP } from '../config/constants';
import { isCreature, isMinimalDisplayLand } from '../utils/cardUtils';

/**
 * Hook to calculate visual stacking and 2D positions for cards on the battlefield.
 */
export const useBattlefieldLayout = ({
    cards,
    activePanel,
    showSearchOverlay,
    creatureScrollX,
    othersScrollX,
    landsScrollX,
    verticalOffsetY,
    windowSize,
    battlefieldRef
}) => {
    // Layout Constants (could be moved to constants.js if needed)
    const BOTTOM_BAR_HEIGHT = 0;
    const TOP_BAR_HEIGHT = 0;

    // 1. Identify cards on the battlefield that are not attached to anything
    const visibleRawCards = useMemo(() => {
        return cards.filter(c => c.zone === 'battlefield' && !c.attachedTo);
    }, [cards]);

    // 2. Group identical cards into stacks for the UI
    const visibleStacks = useMemo(() => {
        const groups = [];
        const groupMap = new Map();

        visibleRawCards.forEach(card => {
            // Find attachments for this card to include in identity check
            const attachments = cards.filter(c => c.attachedTo === card.id);
            const attachmentKey = attachments.map(a => a.name).sort().join(',');

            // Key defines identity for stacking. Identical cards MUST group.
            // Includes power, toughness, counters, etc. so tokens with different buffs split.
            const key = `${card.name}|${card.power}|${card.toughness}|${card.tapped}|${JSON.stringify(card.counters)}|${card.faceDown || false}|${card.type_line}|${card.isToken}|${card.tempPowerBonus || 0}|${card.tempToughnessBonus || 0}|[${attachmentKey}]`;

            if (!groupMap.has(key)) {
                const group = { key, leader: card, count: 1, cards: [card], id: card.id };
                groupMap.set(key, group);
                groups.push(group);
            } else {
                const group = groupMap.get(key);
                group.count++;
                group.cards.push(card);
            }
        });
        return groups;
    }, [visibleRawCards, cards]);

    // 3. Calculate 2D coordinates for each stack
    const cardPositions = useMemo(() => {
        if (!battlefieldRef?.current) return {};

        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        const usableHeight = containerHeight - BOTTOM_BAR_HEIGHT - TOP_BAR_HEIGHT;

        const centerX = containerWidth / 2;
        const centerY = usableHeight / 2;

        const baseSpread = 250;
        const scaleFactor = Math.min(1, usableHeight / 900);
        const spread = Math.max(220, baseSpread * scaleFactor);

        const positions = {};

        // Filter stacks by row
        const lands = visibleStacks.filter(g => isMinimalDisplayLand(g.leader));
        const creatures = visibleStacks.filter(g => isCreature(g.leader));
        const others = visibleStacks.filter(g => !isCreature(g.leader) && !isMinimalDisplayLand(g.leader));

        // Helper to position a row of cards
        const layoutRow = (items, yPos, xOffset = 0) => {
            const finalY = yPos + verticalOffsetY;
            const count = items.length;
            if (count === 0) return;
            const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;

            const EDGE_PADDING = 8;
            let startX = centerX - totalWidth / 2;

            if (totalWidth > containerWidth) {
                startX = EDGE_PADDING;
            } else {
                startX = Math.max(EDGE_PADDING, startX);
            }

            items.forEach((group, index) => {
                positions[group.leader.id] = {
                    id: group.leader.id,
                    x: startX + index * (CARD_WIDTH + CARD_GAP) + xOffset,
                    y: finalY - (200 / 2) // CARD_HEIGHT/2 hardcoded for displacement
                };
            });
        };

        // Visual Order: Creatures (Top) -> Others (Middle) -> Lands (Bottom)
        layoutRow(creatures, centerY - spread, creatureScrollX);
        layoutRow(others, centerY, othersScrollX);
        layoutRow(lands, centerY + 215, landsScrollX);

        return positions;
    }, [visibleStacks, cards, activePanel, showSearchOverlay, creatureScrollX, othersScrollX, landsScrollX, verticalOffsetY, windowSize, battlefieldRef]);

    return { visibleRawCards, visibleStacks, cardPositions };
};
