import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BattlefieldCard from './BattlefieldCard';

const BattlefieldList = ({ cards, onCardAction, ...props }) => {
    const rowSize = cards.length <= 6 ? 2 : Math.ceil(cards.length / 3);

    const topRow = cards.slice(0, rowSize);
    const middleRow = cards.slice(rowSize, rowSize * 2);
    const bottomRow = cards.slice(rowSize * 2);

    const activeRows = bottomRow.length > 0 ? 3 : middleRow.length > 0 ? 2 : 1;

    // 1 Row: Push down significantly (~50% card height)
    // 2 Rows: Push down slightly (~25% card height)
    // 3 Rows: Top aligned
    const verticalSpacing = activeRows === 1 ? 'mt-32' : activeRows === 2 ? 'mt-16' : 'mt-0';

    const renderRow = (rowCards) => (
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
                            {...(props.getCardProps ? props.getCardProps(group.leader) : {})}
                            {...props}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col">
            {cards.length === 0 ? (
                <div className="text-gray-500 text-center italic opacity-50 m-auto">No permanents</div>
            ) : (
                <div className="flex w-full h-full overflow-x-auto scrollbar-hide">
                    <div
                        className={`mx-auto flex flex-col gap-1 p-2 min-w-max items-start ${verticalSpacing}`}
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        {renderRow(topRow)}
                        {renderRow(middleRow)}
                        {renderRow(bottomRow)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BattlefieldList;
