import React from 'react';
import BattlefieldCard from './BattlefieldCard';

const PermanentList = ({ permanents, onCardAction, ...props }) => {
    return (
        <div className="w-full h-full flex flex-col justify-center">
            {permanents.length === 0 ? (
                <div className="text-gray-500 text-center italic opacity-50">No other permanents</div>
            ) : (
                <div
                    className="flex overflow-x-auto gap-4 p-4 snap-x snap-mandatory min-h-[220px] items-center scrollbar-hide"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {permanents.map(group => (
                        <div key={group.key} className="snap-center shrink-0">
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
                    {/* Padding element for easier scrolling to the last item */}
                    <div className="w-4 shrink-0" />
                </div>
            )}
        </div>
    );
};

export default PermanentList;
