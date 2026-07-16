import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatBigNumber } from '../utils/formatters';
import { calculateCardStats, isCreature } from '../utils/cardUtils';
import SelectedCardControls from './SelectedCardControls';

// Color identity dot (mirrors SelectionMenu's mapping)
const getColorDot = (colors) => {
    if (!colors || colors.length === 0) return 'bg-slate-500';
    if (colors.length > 1) return 'bg-yellow-500';
    const map = {
        'W': 'bg-amber-100',
        'U': 'bg-blue-500',
        'B': 'bg-slate-800',
        'R': 'bg-red-500',
        'G': 'bg-green-500'
    };
    return map[colors[0]] || 'bg-slate-500';
};

/**
 * In-flow card detail for the landscape dock — replaces the SelectionMenu
 * overlay so the battlefield stays visible during selection.
 * Shows the artist credit under the art crop (Scryfall image guideline).
 */
const DockCardDetail = ({
    selectedCard,
    stackCount = 1n,
    stackCards = [],
    allCards = [],
    onAction,
    onDeselect,
    onActivateAbility,
    onConvertLand,
    onCounterChange
}) => {
    const [showFullImage, setShowFullImage] = useState(false);
    const [oracleExpanded, setOracleExpanded] = useState(false);

    if (!selectedCard) return null;

    const card = selectedCard;
    const isStack = stackCount > 1n;
    const cardIsCreature = isCreature(card);
    const liveCard = allCards.find(c => c.id === card.id) || card;
    const stats = cardIsCreature ? calculateCardStats(liveCard, allCards) : null;

    const attachments = allCards.filter(c => c.attachedTo === card.id);
    const equippedTo = card.attachedTo ? allCards.find(c => c.id === card.attachedTo) : null;

    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;
    if (card.isToken && cardType && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType}`;
    }

    return (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
            {/* Header: color dot + name + deselect */}
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${getColorDot(card.colors)} shrink-0 border border-white/20`} />
                <span className="flex-1 text-white font-bold text-sm truncate">{card.name}</span>
                <button
                    onClick={onDeselect}
                    className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                    aria-label="Deselect card"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Art */}
            <button
                className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-800/60 cursor-zoom-in border border-white/10 p-0"
                onClick={() => setShowFullImage(true)}
            >
                {card.art_crop ? (
                    <img
                        src={card.art_crop}
                        alt={card.name}
                        className="w-full h-full object-cover pointer-events-none"
                        style={{ objectPosition: card.activeFaceIndex === 1 ? '100% 15%' : '0% 15%' }}
                    />
                ) : (
                    <div className="w-full h-full bg-slate-700/50" />
                )}

                {isStack && (
                    <div className="absolute top-1.5 right-1.5 flex items-center h-7 px-2 rounded-full bg-blue-600 border border-white/20 shadow-lg">
                        <span className="text-white font-bold text-xs">x{formatBigNumber(stackCount)}</span>
                    </div>
                )}

                {stats && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 border border-white/10 rounded-full px-2.5 py-0.5">
                        <span className={`font-bold text-sm ${stats.power > (card.power || 0) ? 'text-green-400' : 'text-white'}`}>
                            {formatBigNumber(stats.power)}/{formatBigNumber(stats.toughness)}
                        </span>
                    </div>
                )}
            </button>

            {/* Artist credit (Scryfall guideline: attribution must accompany art crops) */}
            <div className="text-[10px] text-gray-500 leading-tight select-none -mt-1">
                {card.artist ? `Art: ${card.artist} · ` : ''}™ &amp; © Wizards of the Coast
            </div>

            {/* Type + base stats */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-gray-300 text-xs font-semibold truncate">{cardType}</span>
                {stats && (
                    <span className="text-gray-500 text-[10px] shrink-0">
                        Base {card.power || 0}/{card.toughness || 0}
                    </span>
                )}
            </div>

            {/* Oracle text */}
            {card.oracle_text && (
                <button
                    className={`text-left text-slate-300 text-xs leading-relaxed bg-slate-800/50 border border-slate-700/60 rounded-lg px-2.5 py-2 ${oracleExpanded ? '' : 'line-clamp-4'}`}
                    onClick={() => setOracleExpanded(prev => !prev)}
                >
                    {card.oracle_text}
                </button>
            )}

            {/* Equipped to / attachments */}
            {equippedTo && (
                <button
                    onClick={() => onAction && onAction('select', equippedTo)}
                    className="flex items-center gap-2 h-11 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 transition-colors text-left"
                >
                    <div className={`w-2 h-2 rounded-full ${getColorDot(equippedTo.colors)} shrink-0`} />
                    <span className="text-white/90 text-xs font-semibold truncate">Equipped to: {equippedTo.name}</span>
                </button>
            )}
            {attachments.map(att => (
                <button
                    key={att.id}
                    onClick={() => onAction && onAction('select', att)}
                    className="flex items-center gap-2 h-11 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 transition-colors text-left"
                >
                    <div className={`w-2 h-2 rounded-full ${getColorDot(att.colors)} shrink-0`} />
                    <span className="text-white/90 text-xs font-semibold truncate">{att.name}</span>
                </button>
            ))}

            {/* Actions */}
            <div className="rounded-xl overflow-hidden border border-white/5">
                <SelectedCardControls
                    card={card}
                    stackCount={stackCount}
                    stackCards={stackCards}
                    allCards={allCards}
                    onAction={onAction}
                    onActivateAbility={onActivateAbility}
                    onConvertLand={onConvertLand}
                    onCounterChange={onCounterChange}
                    onDeselect={onDeselect}
                />
            </div>

            {/* Full card image zoom (portal escapes the dock's backdrop-filter containing block) */}
            {showFullImage && createPortal(
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300"
                    onClick={() => setShowFullImage(false)}
                >
                    <div className="relative h-full max-h-[90vh] aspect-[2.5/3.5] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 shrink-0 animate-in zoom-in-95 duration-300">
                        <img
                            src={card.image_normal || card.image_uris?.normal || card.art_crop}
                            alt={card.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <button
                        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={() => setShowFullImage(false)}
                    >
                        <X size={22} />
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DockCardDetail;
