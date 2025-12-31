import React from 'react';
import BattlefieldCard from './BattlefieldCard';

const BattlefieldList = ({ cards, onCardAction, ...props }) => {
    const rowSize = Math.ceil(cards.length / 3);
    const topRow = cards.slice(0, rowSize);
    const middleRow = cards.slice(rowSize, rowSize * 2);
    const bottomRow = cards.slice(rowSize * 2);

    const renderRow = (rowCards) => (
        <div className="flex gap-4 min-w-max pr-6 items-center">
            {rowCards.map(group => (
                <div key={group.key} className="shrink-0 flex items-center justify-center">
                    <BattlefieldCard
                        card={group.leader}
                        count={group.count}
                        isRelative={true}
                        onAction={onCardAction}
                        {...(props.getCardProps ? props.getCardProps(group.leader) : {})}
                        {...props}
                    />
                </div>
            ))}
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col">
            {cards.length === 0 ? (
                <div className="text-gray-500 text-center italic opacity-50 m-auto">No permanents</div>
            ) : (
                <div
                    className="flex flex-col gap-1 p-2 overflow-x-auto h-full scrollbar-hide content-start"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {renderRow(topRow)}
                    {renderRow(middleRow)}
                    {renderRow(bottomRow)}
                </div>
            )}
        </div>
    );
};

export default BattlefieldList;
