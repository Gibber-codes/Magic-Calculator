import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import BattlefieldCard from './BattlefieldCard';
import { isCreature } from '../utils/cardUtils';

const BattlefieldList = ({ cards, onCardAction, ...props }) => {
    const [swapped, setSwapped] = useState(false);
    const { allCards = [], targetingMode = {}, ...restProps } = props;

    const creatures = cards.filter(g => isCreature(g.leader));
    const others = cards.filter(g => !isCreature(g.leader));

    // Auto-swap logic for targeting
    useEffect(() => {
        if (targetingMode.active) {
            // Find if there are valid targets or eligible attackers in the lists
            const listWithTargets = cards.filter(g => {
                const cardProps = restProps.getCardProps ? restProps.getCardProps(g.leader) : {};
                return cardProps.isValidTarget || cardProps.isEligibleAttacker;
            });

            if (listWithTargets.length > 0) {
                // If we have targets, check if they are in the bottom clumped list
                const targetsAreAtBottom = listWithTargets.some(g => {
                    const isGroupCreature = isCreature(g.leader);
                    // Bottom list is creatures if swapped=true
                    // Bottom list is others if swapped=false
                    return swapped ? isGroupCreature : !isGroupCreature;
                });

                if (targetsAreAtBottom) {
                    setSwapped(prev => !prev);
                }
            }
        }
    }, [targetingMode.active]);

    // Calculate cards attached to creatures to show them in the top list when swapped
    const creatureAttachments = useMemo(() => {
        if (!swapped || !allCards.length) return [];

        // Find all cards attached to any creature currently on battlefield
        const attachedToCreatures = allCards.filter(c => {
            if (!c.attachedTo || c.zone !== 'battlefield') return false;
            return creatures.some(g => g.cards.some(creature => creature.id === c.attachedTo));
        });

        if (attachedToCreatures.length === 0) return [];

        // Group into stacks
        const groups = [];
        const groupMap = new Map();
        attachedToCreatures.forEach(card => {
            const key = `attached-${card.name}`;
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
    }, [allCards, creatures, swapped]);

    let topRowFull = creatures;
    let middleRowFull = [];
    if (creatures.length > 4) {
        const mid = Math.ceil(creatures.length / 2);
        topRowFull = creatures.slice(0, mid);
        middleRowFull = creatures.slice(mid);
    }

    const activeRows = (topRowFull.length > 0 ? 1 : 0) + (middleRowFull.length > 0 ? 1 : 0) + (others.length > 0 ? 1 : 0);
    const verticalSpacing = activeRows <= 1 ? 'pt-32' : activeRows === 2 ? 'pt-16' : 'pt-0';

    const handleSwipe = (event, info) => {
        const isSwipeUp = info.offset.y < -60 || info.velocity.y < -500;
        if (isSwipeUp) {
            setSwapped(prev => !prev);
        }
    };

    const renderRow = (rowCards, extraClass = '') => {
        if (!rowCards || rowCards.length === 0) return null;
        return (
            <div className={`flex gap-4 min-w-max pr-6 items-center ${extraClass}`}>
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

    const renderClumpedRow = (rowCards) => {
        if (!rowCards || rowCards.length === 0) return null;
        return (
            <div className="flex flex-row justify-center -space-x-24 px-24 min-w-max mx-auto">
                <AnimatePresence mode='popLayout'>
                    {rowCards.map((group, index) => (
                        <motion.div
                            key={group.key}
                            layoutId={group.key}
                            layout
                            initial={group.leader.spawnSourcePos ? false : { opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="shrink-0 relative hover:z-50 hover:translate-y-[-8px] transition-transform duration-200"
                            style={{ zIndex: index }}
                        >
                            <BattlefieldCard
                                card={group.leader}
                                count={group.count}
                                isRelative={true}
                                onAction={onCardAction}
                                hideBanners={true}
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
        <div className="w-full h-full flex flex-col gap-8 overflow-hidden">
            {cards.length === 0 ? (
                <div className="text-gray-500 text-center italic opacity-50 m-auto">No permanents</div>
            ) : (
                <>
                    <motion.div
                        className="flex-1 flex flex-col h-full relative"
                        drag="y"
                        dragDirectionLock
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.05}
                        onDragEnd={handleSwipe}
                    >
                        {/* Helper Indicator */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none flex flex-col items-center z-10">
                            <div className="w-8 h-1 bg-white rounded-full mb-1" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">
                                Swipe Up to Switch
                            </span>
                        </div>

                        <div className="flex flex-col h-full relative z-10 overflow-hidden">
                            <LayoutGroup>
                                {/* Creatures Section Wrapper */}
                                <motion.div
                                    layout
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className={`w-full flex flex-col ${swapped ? 'order-2 mt-auto pb-32' : 'order-1 flex-1 min-h-0'} `}
                                >
                                    {(topRowFull.length > 0 || middleRowFull.length > 0) && (
                                        <div
                                            className={`overflow-x-auto scrollbar-hide w-full h-full flex flex-col ${!swapped ? verticalSpacing : ''}`}
                                            style={{ touchAction: 'pan-x' }}
                                        >
                                            {!swapped ? (
                                                <div className="flex flex-col gap-1 p-2 min-w-max items-start mx-auto flex-1 overflow-x-visible" style={{ scrollBehavior: 'smooth' }}>
                                                    {renderRow(topRowFull)}
                                                    {renderRow(middleRowFull)}
                                                </div>
                                            ) : (
                                                <div className="mt-auto">
                                                    {renderClumpedRow(creatures)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>

                                {/* Others Section Wrapper */}
                                <motion.div
                                    layout
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className={`w-full flex flex-col ${swapped ? 'order-1 flex-1 min-h-0' : 'order-2 mt-auto pb-32'} `}
                                >
                                    {((swapped ? [...others, ...creatureAttachments] : others)).length > 0 && (
                                        <div
                                            className={`overflow-x-auto scrollbar-hide w-full h-full flex flex-col ${swapped ? verticalSpacing : ''}`}
                                            style={{ touchAction: 'pan-x' }}
                                        >
                                            {swapped ? (
                                                <div className="flex flex-col p-2 min-w-max items-start mx-auto flex-1 overflow-x-visible" style={{ scrollBehavior: 'smooth' }}>
                                                    {renderRow([...others, ...creatureAttachments])}
                                                </div>
                                            ) : (
                                                <div className="mt-auto">
                                                    {renderClumpedRow(others)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            </LayoutGroup>
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
};

export default BattlefieldList;
