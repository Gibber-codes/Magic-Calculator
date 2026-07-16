import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BattlefieldCard from './BattlefieldCard';
import { getCardZone } from '../utils/cardUtils';
import ZoneTabs from './ZoneTabs';

/**
 * Battlefield card area with zone tabs.
 * Only the active zone ('creatures' | 'others') is rendered in the DOM — the
 * inactive zone's cards are unmounted entirely (perf win on huge battlefields).
 * Tap a tab or swipe vertically on the card area to switch zones.
 */
const BattlefieldList = ({
    cards,
    onCardAction,
    activeZone = 'creatures',
    onZoneChange,
    zoneCounts,
    pinned = false,
    onBlockedSwitch,
    ...props
}) => {
    const { targetingMode = {}, ...restProps } = props;
    // allCards is accepted but not forwarded to BattlefieldCard (matches prior behavior).
    delete restProps.allCards;

    const zoneCards = cards.filter(g => getCardZone(g.leader) === activeZone);

    // Auto-switch view when targeting starts and the eligible cards are all in
    // the hidden zone (e.g. equip target selection while viewing Others).
    useEffect(() => {
        if (!targetingMode.active) return;
        const eligible = cards.filter(g => {
            const cardProps = restProps.getCardProps ? restProps.getCardProps(g.leader) : {};
            return cardProps.isValidTarget || cardProps.isEligibleAttacker;
        });
        if (eligible.length === 0) return;
        const zones = new Set(eligible.map(g => getCardZone(g.leader)));
        if (!zones.has(activeZone)) {
            onZoneChange?.([...zones][0]);
        }
        // Intentionally only on targeting activation — mirrors the old auto-swap behavior.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetingMode.active]);

    // Creatures split into two rows when the row would get long
    let topRow = zoneCards;
    let secondRow = [];
    if (activeZone === 'creatures' && zoneCards.length > 4) {
        const mid = Math.ceil(zoneCards.length / 2);
        topRow = zoneCards.slice(0, mid);
        secondRow = zoneCards.slice(mid);
    }

    const otherZone = activeZone === 'creatures' ? 'others' : 'creatures';

    const handleSwipe = (event, info) => {
        const isVerticalSwipe = Math.abs(info.offset.y) > 60 || Math.abs(info.velocity.y) > 500;
        if (!isVerticalSwipe) return;
        if (pinned) {
            onBlockedSwitch?.(otherZone);
        } else {
            onZoneChange?.(otherZone);
        }
    };

    const renderRow = (rowCards) => {
        if (!rowCards || rowCards.length === 0) return null;
        return (
            <div className="flex gap-4 min-w-max pr-6 items-center">
                <AnimatePresence mode='popLayout'>
                    {rowCards.map(group => (
                        <motion.div
                            key={group.key}
                            layoutId={group.key}
                            layout
                            initial={group.leader.spawnSourcePos ? false : { opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="shrink-0 flex items-center justify-center"
                        >
                            <BattlefieldCard
                                card={group.leader}
                                count={group.count}
                                isRelative={true}
                                onAction={onCardAction}
                                {...(restProps.getCardProps ? restProps.getCardProps(group.leader) : {})}
                                {...restProps}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col gap-2 overflow-hidden">
            <ZoneTabs
                activeZone={activeZone}
                onZoneChange={onZoneChange}
                counts={zoneCounts}
                pinned={pinned}
                onBlockedSwitch={onBlockedSwitch}
            />

            <motion.div
                className="flex-1 flex flex-col relative min-h-0"
                drag="y"
                dragDirectionLock
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.05}
                onDragEnd={handleSwipe}
            >
                {zoneCards.length === 0 ? (
                    <div className="text-gray-500 text-center italic opacity-50 m-auto select-none">
                        {activeZone === 'creatures' ? 'No creatures' : 'No other permanents'}
                    </div>
                ) : (
                    <div
                        className="flex-1 overflow-x-auto scrollbar-hide w-full flex flex-col justify-center"
                        style={{ touchAction: 'pan-x' }}
                    >
                        <motion.div
                            key={activeZone}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="flex flex-col gap-1 p-2 min-w-max items-start mx-auto"
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {renderRow(topRow)}
                            {renderRow(secondRow)}
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default BattlefieldList;
