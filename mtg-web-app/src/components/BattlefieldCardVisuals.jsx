import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Trash2 } from 'lucide-react';
import { TopBanner, ArtWindow, BottomBanner } from './RedesignedCardFrame';
import { getCardHexColors, isCreature } from '../utils/cardUtils';
import { formatBigNumber } from '../utils/formatters';

export const AttachmentBanners = ({ attachments, CARD_WIDTH, bannerHeight, onAction, isEligibleAttacker }) => {
    if (!attachments || attachments.length === 0) return null;

    return (
        <div className="absolute top-0 left-0 w-full flex flex-col items-center z-20 pointer-events-auto transition-all duration-300 ease-out">
            {attachments.length > 1 ? (
                <div className="relative w-full z-10">
                    <TopBanner width={CARD_WIDTH} height={bannerHeight || 24} colorIdentity="#374151">
                        <div className="w-full text-center text-[10px] font-bold truncate leading-tight flex items-center justify-center p-1" style={{ color: 'white' }}>
                            {attachments.length} Attachments
                        </div>
                    </TopBanner>
                </div>
            ) : (
                attachments.map((att) => {
                    const attColors = getCardHexColors(att.colors);
                    const isNew = !!att.spawnSourcePos; // Hide if currently in flight

                    return (
                        <motion.div
                            key={att.id}
                            initial={isNew ? { opacity: 0, y: -20 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={isNew ? { delay: (att.spawnDelay || 0) / 1000 + (att.flightDuration || 700) / 1000, duration: 0.3 } : {}}
                            className="relative w-full z-10 transition-all duration-300"
                        >
                            <div
                                className="flex flex-col items-center cursor-pointer"
                                onClick={(e) => {
                                    if (isEligibleAttacker) return;
                                    e.stopPropagation();
                                    onAction && onAction('select', att);
                                }}
                            >
                                <div className="relative z-10">
                                    <TopBanner width={CARD_WIDTH} height={bannerHeight || 24} colorIdentity={attColors.fillColor}>
                                        <div className="w-full text-center text-[10px] font-bold truncate leading-tight flex items-center justify-center" style={{ color: 'white' }}>
                                            {att.name}
                                        </div>
                                    </TopBanner>
                                </div>
                            </div>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
};

export const CardHeader = ({ card, CARD_WIDTH, bannerHeight }) => {
    const colors = getCardHexColors(card.colors);
    const activeIdx = card.activeFaceIndex !== undefined ? card.activeFaceIndex : 0;
    const face = (card.card_faces || [])[activeIdx] || card;
    // Use displayName if present (for virtual token stacks), otherwise use face/card name
    const displayName = card.displayName || face.name || card.name;

    return (
        <div className="z-30 relative" style={{ marginBottom: -4 }}>
            <TopBanner width={CARD_WIDTH} height={bannerHeight} colorIdentity={colors.fillColor}>
                <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: '#ffffff' }}>
                    {displayName}
                </div>
            </TopBanner>
        </div>
    );
};


export const CardArt = ({ card, CARD_WIDTH, artHeight, isModified, plusOne, countersObj, isStack, arrivedCount }) => {
    return (
        <div className="z-30 relative">
            <ArtWindow width={CARD_WIDTH} height={artHeight}>
                {card.art_crop ? (
                    <img
                        src={card.art_crop}
                        alt={card.name}
                        className="w-full h-full object-cover"
                        style={{
                            objectPosition: (card.activeFaceIndex === 1) ? '100% 15%' : '0% 15%'
                        }}
                    />
                ) : null}
            </ArtWindow>

            {/* Virtual Stack Indicator - for astronomically large token counts */}
            {card.isVirtualStack && (
                <div className="absolute top-2 right-2 rounded-lg h-7 px-2 flex items-center justify-center shadow-lg border-2 z-30 bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400">
                    <span className="text-white font-bold leading-none whitespace-nowrap"
                        style={{ fontSize: (card.tokenCount?.toString().length > 30) ? '9px' : '10px' }}>
                        {formatBigNumber(card.tokenCount).includes('×') ? '' : '×'}
                        {formatBigNumber(card.tokenCount)}
                    </span>
                </div>
            )}


            {/* Counter Indicators */}
            {isModified && isCreature(card) && (
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20">
                    {plusOne > 0 &&
                        <div className="bg-green-600 rounded-lg px-1.5 h-6 flex items-center justify-center shadow-lg border border-green-800">
                            <span className="text-white text-[10px] font-bold">+{formatBigNumber(plusOne)}</span>
                        </div>
                    }
                    {Object.entries(countersObj).map(([type, val]) => {
                        if (type === '+1/+1' || val <= 0) return null;
                        const isBad = type === '-1/-1';
                        return (
                            <div key={type} className={`${isBad ? 'bg-red-800 border-red-900' : 'bg-purple-600 border-purple-800'} rounded-lg px-1.5 h-6 flex items-center justify-center shadow-lg border`}>
                                <span className="text-white text-[10px] font-bold">{isBad ? '-' : ''}{val} {type === '-1/-1' ? '' : type.substring(0, 3)}</span>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Stack Count (Only show if NOT virtual stack w/ its own badge) */}
            {isStack && !card.isVirtualStack && (
                <div className={`absolute top-2 right-2 rounded-full h-6 px-2 flex items-center justify-center shadow-lg border-2 z-20 ${arrivedCount > 0 ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-600 text-white'}`}>
                    <span className="text-xs font-bold">x{arrivedCount}</span>
                </div>
            )}

        </div>
    );
};


export const CardFooter = ({ card, cardType, totalPower, totalToughness, CARD_WIDTH, bannerHeight }) => {
    return (
        <div className="z-30 relative" style={{ marginTop: 4 }}>
            <BottomBanner width={CARD_WIDTH} height={bannerHeight}>
                {isCreature(card) && (
                    <div className="w-full flex justify-end pr-1">
                        <div className="text-[10px] font-bold flex gap-0.5 text-white">
                            <span>{formatBigNumber(totalPower)}</span>/<span>{formatBigNumber(totalToughness)}</span>
                        </div>
                    </div>
                )}
            </BottomBanner>
        </div>
    );
};

export const MinimalLandDisplay = ({
    card,
    count,
    x,
    y,
    isRelative,
    isSelected,
    isHovered,
    isTargeting,
    onMouseDown,
    onAction,
    setIsHovered,
    CARD_WIDTH,
    bannerHeight,
    landColors
}) => {
    const displayText = (card.isPlaceholderLand || card.name === 'Land')
        ? `Land: ${count}`
        : `${card.name}: ${count}`;

    return (
        <div
            className={`${isRelative ? 'relative' : 'absolute'} cursor-pointer flex flex-col items-center
                ${isHovered ? 'z-50' : ''}
                ${isSelected ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] scale-105 z-40 rounded-lg' : ''}
                ${card.tapped ? 'opacity-70' : ''}
                transition-all duration-200 ease-out`}
            style={{
                width: CARD_WIDTH,
                ...(isRelative ? {} : { left: x, top: y }),
            }}
            onMouseDown={(e) => onMouseDown(e, card)}
            onMouseEnter={() => !isTargeting && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Tap Indicator */}
            {card.tapped && (
                <div className="absolute -top-2 -right-2 z-50">
                    <div className="bg-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg border border-amber-400">
                        TAPPED
                    </div>
                </div>
            )}

            {/* Single Banner for Land */}
            <div className="relative">
                <TopBanner
                    width={CARD_WIDTH}
                    height={bannerHeight || 24}
                    colorIdentity={landColors.fillColor}
                >
                    <div
                        className="w-full text-center text-sm font-bold truncate leading-tight"
                        style={{ color: landColors.textColor }}
                    >
                        {displayText}
                    </div>
                </TopBanner>
            </div>

            {/* Hover Actions (Tap/Delete) */}
            {isHovered && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-50">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction('tap', card); }}
                        className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow-lg border border-slate-500"
                        title="Tap/Untap"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction('delete', card, count); }}
                        className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-red-400"
                        title="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
