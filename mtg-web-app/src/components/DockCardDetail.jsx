import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus } from 'lucide-react';
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

// Hex color mapping for the attachment/equipped banner dots (mirrors SelectionMenu)
const getCardHexColors = (colors) => {
    let c = { borderColor: '#6b7280', fillColor: '#374151', text: 'white' };
    if (!colors || colors.length === 0) return c;
    if (colors.length > 1) {
        return { borderColor: '#ca8a04', fillColor: '#eab308', text: 'black' };
    }
    const map = {
        'W': { borderColor: '#d4d4d8', fillColor: '#fef9c3', text: 'black' },
        'U': { borderColor: '#2563eb', fillColor: '#60a5fa', text: 'black' },
        'B': { borderColor: '#1f2937', fillColor: '#4b5563', text: 'white' },
        'R': { borderColor: '#b91c1c', fillColor: '#ef4444', text: 'black' },
        'G': { borderColor: '#15803d', fillColor: '#22c55e', text: 'black' }
    };
    return map[colors[0]] || c;
};

/**
 * In-flow card detail for the landscape dock. Mirrors the portrait
 * SelectionMenu "card unit" design (green glow, integrated header/art/footer
 * bars, full P/T breakdown, attachment banners) but is fluid-width to fit the
 * dock column and keeps dock-specific extras: a deselect button, the required
 * artist/© credit (Scryfall image guideline), and expandable oracle text.
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
    const colorDot = getColorDot(card.colors);
    const cardIsCreature = isCreature(card);
    const isAttached = !!card.attachedTo;
    const liveCard = allCards.find(c => c.id === card.id) || card;
    const stats = cardIsCreature ? calculateCardStats(liveCard, allCards) : null;

    const attachments = allCards.filter(c => c.attachedTo === card.id);

    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;
    if (card.isToken && cardType && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType}`;
    }

    return (
        <div className="animate-in fade-in duration-150">
            {/* The Card Unit — mirrors SelectionMenu, including the green glow.
                A crisp 1px green edge + soft outer halo; the dock hosts this in
                `bare` (chromeless, non-clipping) mode so the halo shows over the
                battlefield instead of being clipped by a panel border. */}
            <div
                className="relative w-full flex flex-col rounded-xl overflow-hidden"
                style={{
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.55), 0 0 18px 2px rgba(34, 197, 94, 0.45)'
                }}
            >
                {/* EQUIPPED-TO BANNER (this card is attached to something) */}
                {isAttached && (() => {
                    const equippedCreature = allCards.find(c => c.id === card.attachedTo);
                    if (!equippedCreature) return null;
                    const creatureColors = getCardHexColors(equippedCreature.colors);
                    const siblingAttachments = allCards.filter(c => c.attachedTo === equippedCreature.id && c.id !== card.id);

                    return (
                        <div className="flex flex-col border-b border-white/10">
                            <div
                                className="relative group border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onAction('select', equippedCreature); }}
                            >
                                <div className="h-8 bg-black/50 flex items-center justify-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: creatureColors.fillColor }}></div>
                                    <div className="flex-1 text-center min-w-0">
                                        <span className="text-white/90 font-bold text-xs truncate block">Equipped to: {equippedCreature.name}</span>
                                    </div>
                                </div>
                            </div>

                            {siblingAttachments.map(sibling => {
                                const sibColors = getCardHexColors(sibling.colors);
                                return (
                                    <div
                                        key={sibling.id}
                                        className="relative group border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); onAction('select', sibling); }}
                                    >
                                        <div className="h-8 bg-black/50 flex items-center justify-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: sibColors.fillColor }}></div>
                                            <div className="flex-1 text-center min-w-0">
                                                <span className="text-white/90 font-bold text-xs truncate block">{sibling.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* ATTACHMENT BANNERS (things attached to this card) */}
                {attachments.length > 0 && (
                    <div className="flex flex-col border-b border-white/10">
                        {attachments.length > 1 && (
                            <div className="h-6 bg-blue-600/80 flex items-center justify-center border-b border-white/10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                <span className="text-white font-bold text-xs">
                                    {attachments.length} Attachments
                                </span>
                            </div>
                        )}
                        {attachments.map((att) => {
                            const attColors = getCardHexColors(att.colors);
                            return (
                                <div
                                    key={att.id}
                                    className="relative group border-b border-white/5 last:border-b-0"
                                    onClick={(e) => { e.stopPropagation(); onAction('select', att); }}
                                >
                                    <div className="h-8 bg-black/50 flex items-center justify-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: attColors.fillColor }}></div>
                                        <div className="flex-1 text-center min-w-0">
                                            <span className="text-white/90 font-bold text-xs truncate block">{att.name}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction('unequip-self', att); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/80 rounded text-white transition-all"
                                        title="Unequip"
                                    >
                                        <Minus size={10} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* TOP HEADER: color dot + centered name + deselect */}
                <div className="h-8 bg-black/50 flex items-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <div className={`w-2.5 h-2.5 rounded-full ${colorDot} flex-shrink-0 border border-white/20 shadow-sm`}></div>
                    <div className="flex-1 text-center min-w-0">
                        <span className="text-white font-bold text-sm truncate block">{card.name}</span>
                    </div>
                    <button
                        onClick={onDeselect}
                        className="w-6 h-6 -mr-1 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
                        aria-label="Deselect card"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ART WINDOW */}
                <button
                    className="w-full h-[225px] relative bg-slate-900/30 overflow-hidden group cursor-zoom-in border-none p-0 outline-none"
                    onClick={(e) => { e.stopPropagation(); setShowFullImage(true); }}
                >
                    {card.art_crop ? (
                        <img
                            src={card.art_crop}
                            alt={card.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                            style={{ objectPosition: card.activeFaceIndex === 1 ? '100% 15%' : '0% 15%' }}
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-700/50 pointer-events-none"></div>
                    )}

                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.02) 10px, rgba(255,255,255,.02) 20px)' }}></div>

                    {/* Stack count badge */}
                    {isStack && (
                        <div className="absolute top-2 right-2 flex items-center justify-center h-8 px-2 rounded-full bg-blue-600 border-2 border-white/20 shadow-lg z-20">
                            <span className="text-white font-bold text-sm">x{formatBigNumber(stackCount)}</span>
                        </div>
                    )}

                    {/* P/T modifier breakdown (bottom-right) */}
                    {stats && (
                        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5 z-20 pointer-events-none">
                            <div className="text-[10px] text-white/90 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] px-1.5 py-0.5 bg-black/40 rounded backdrop-blur-sm border border-white/10">
                                <span className="text-white/70">Base: </span>
                                <span className="font-bold">{card.power || 0}/{card.toughness || 0}</span>
                            </div>
                            {stats.counterPower !== 0 && (
                                <div className="text-[10px] text-green-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] px-1.5 py-0.5 bg-black/40 rounded backdrop-blur-sm border border-white/10">
                                    <span className="text-white/70">Counters: </span>
                                    <span className="font-bold">+{stats.counterPower}/+{stats.counterToughness}</span>
                                </div>
                            )}
                            {stats.dynamicPower !== 0 && (
                                <div className="text-[10px] text-blue-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] px-1.5 py-0.5 bg-black/40 rounded backdrop-blur-sm border border-white/10">
                                    <span className="text-white/70">Attach: </span>
                                    <span className="font-bold">{stats.dynamicPower >= 0 ? '+' : ''}{stats.dynamicPower}/{stats.dynamicToughness >= 0 ? '+' : ''}{stats.dynamicToughness}</span>
                                </div>
                            )}
                            {(stats.tempPowerBonus !== 0 || stats.tempToughnessBonus !== 0) && (
                                <div className="text-[10px] text-amber-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] px-1.5 py-0.5 bg-black/40 rounded backdrop-blur-sm border border-white/10">
                                    <span className="text-white/70">Temp: </span>
                                    <span className="font-bold">{stats.tempPowerBonus >= 0 ? '+' : ''}{stats.tempPowerBonus}/{stats.tempToughnessBonus >= 0 ? '+' : ''}{stats.tempToughnessBonus}</span>
                                </div>
                            )}
                        </div>
                    )}
                </button>

                {/* BOTTOM FOOTER: type + total P/T */}
                <div className="h-8 bg-black/50 flex items-center justify-between px-3 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    <span className="text-white font-semibold text-xs truncate max-w-[180px]">{cardType}</span>
                    {stats && (
                        <div className="bg-black/85 border border-white/10 rounded-full px-3 py-0.5 shadow-lg">
                            <span className={`font-bold text-base ${stats.power > (card.power || 0) ? 'text-green-400' : 'text-white'}`}>
                                {formatBigNumber(stats.power)}/{formatBigNumber(stats.toughness)}
                            </span>
                        </div>
                    )}
                </div>

                {/* CREDIT + ORACLE (dock extras, not present in portrait) */}
                <div className="bg-black/40 px-3 pt-2 pb-1 flex flex-col gap-2 border-t border-white/5" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                    {/* Artist credit (Scryfall guideline: attribution must accompany art crops) */}
                    <div className="text-[10px] text-gray-400 leading-tight select-none">
                        {card.artist ? `Art: ${card.artist} · ` : ''}™ &amp; © Wizards of the Coast
                    </div>
                    {card.oracle_text && (
                        <button
                            className={`text-left text-slate-300 text-xs leading-relaxed bg-slate-800/50 border border-slate-700/60 rounded-lg px-2.5 py-2 ${oracleExpanded ? '' : 'line-clamp-4'}`}
                            onClick={() => setOracleExpanded(prev => !prev)}
                        >
                            {card.oracle_text}
                        </button>
                    )}
                </div>

                {/* CONTROLS */}
                <div className="border-t border-white/5 pb-2">
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
