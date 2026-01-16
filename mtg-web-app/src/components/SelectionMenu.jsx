import React, { useState, useEffect } from 'react';
import { X, Zap, Plus, Minus, Trash2, RotateCcw, Link2, Unlink, Skull, Ghost, Repeat, ChevronDown, Sparkles, Wand2, Calculator, Sword } from 'lucide-react';
import { extractActivatedAbilities } from '../utils/keywordParser';
import { formatBigNumber } from '../utils/formatters';
import { calculateCardStats, isPlaceholderLand, BASIC_LAND_NAMES, BASIC_LAND_COLORS, isCreature } from '../utils/cardUtils';
import { createPortal } from 'react-dom';
import { TopBanner } from './RedesignedCardFrame';
import SelectedCardControls from './SelectedCardControls';

// Get color identity dot color
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

// Card Colors - Hex mapping for Attachment Banners
const getCardHexColors = (colors) => {
    // Default Gray (Artifact/Colorless)
    let c = { borderColor: '#6b7280', fillColor: '#374151', text: 'white' };

    if (!colors || colors.length === 0) return c;

    if (colors.length > 1) {
        // Gold
        return { borderColor: '#ca8a04', fillColor: '#eab308', text: 'black' };
    }

    const map = {
        'W': { borderColor: '#d4d4d8', fillColor: '#fef9c3', text: 'black' }, // Zinc/Yellow
        'U': { borderColor: '#2563eb', fillColor: '#60a5fa', text: 'black' }, // Blue
        'B': { borderColor: '#1f2937', fillColor: '#4b5563', text: 'white' }, // Dark Gray
        'R': { borderColor: '#b91c1c', fillColor: '#ef4444', text: 'black' }, // Red
        'G': { borderColor: '#15803d', fillColor: '#22c55e', text: 'black' }  // Green
    };

    return map[colors[0]] || c;
};

/**
 * SelectionMenu - A redesign based on 'selected-card-exact-design.html'
 * Merges the card preview and controls into a single 300px wide unit.
 */
const SelectionMenu = ({
    selectedCard,
    stackCount = 1,
    stackCards = [],
    allCards = [],
    onAction,
    onDeselect,
    onActivateAbility,
    onConvertLand,
    onCounterChange
}) => {


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onDeselect();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDeselect]);

    if (!selectedCard) return null;

    const card = selectedCard;
    const isStack = stackCount > 1;
    const colorDot = getColorDot(card.colors);

    // Get attachments
    const attachments = allCards.filter(c => c.attachedTo === card.id);
    const isAttached = !!card.attachedTo;

    // Check card types
    const cardIsCreature = isCreature(card);
    const isEquipment = card.type_line?.toLowerCase().includes('equipment');
    const hasTransform = card.card_faces && card.card_faces.length >= 2;

    // Calculate stats for creatures
    const liveCard = allCards.find(c => c.id === card.id) || card;
    const stats = cardIsCreature ? calculateCardStats(liveCard, allCards) : null;



    // Card type display
    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;
    if (card.isToken && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType}`;
    }



    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center animate-in fade-in duration-200" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.5)', paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>

            {/* Main Container */}
            <div className="relative">



                {/* The Card Unit (300px width) - Clean card with outer green glow */}
                <div
                    className="relative w-[300px] flex flex-col rounded-xl overflow-hidden shadow-2xl"
                    style={{
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        boxShadow: '0 0 40px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.3)'
                    }}
                >
                    {/* EQUIPPED TO BANNER (if this card is attached to something) */}
                    {isAttached && (() => {
                        const equippedCreature = allCards.find(c => c.id === card.attachedTo);
                        if (!equippedCreature) return null;
                        const creatureColors = getCardHexColors(equippedCreature.colors);

                        // Find other attachments on the same creature (Siblings)
                        const siblingAttachments = allCards.filter(c => c.attachedTo === equippedCreature.id && c.id !== card.id);

                        return (
                            <div className="flex flex-col border-b border-white/10">
                                {/* Parent Creature Banner */}
                                <div
                                    className="relative group border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); onAction('select', equippedCreature); }}
                                >
                                    <div className="h-8 bg-black/50 flex items-center justify-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                        {/* Color Identity Dot */}
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: creatureColors.fillColor }}></div>
                                        {/* Equipped Creature Name */}
                                        <div className="flex-1 text-center min-w-0">
                                            <span className="text-white/90 font-bold text-xs truncate block">Equipped to: {equippedCreature.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sibling Attachments */}
                                {siblingAttachments.map(sibling => {
                                    const sibColors = getCardHexColors(sibling.colors);
                                    return (
                                        <div
                                            key={sibling.id}
                                            className="relative group border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); onAction('select', sibling); }}
                                        >
                                            <div className="h-8 bg-black/50 flex items-center justify-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                                {/* Color Identity Dot */}
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: sibColors.fillColor }}></div>
                                                {/* Sibling Name */}
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

                    {/* ATTACHMENT BANNERS (Inside Card, Top) */}
                    {attachments.length > 0 && (
                        <div className="flex flex-col border-b border-white/10">
                            {/* Total Attachment Count (shown when 2+ attachments) */}
                            {attachments.length > 1 && (
                                <div className="h-6 bg-blue-600/80 flex items-center justify-center border-b border-white/10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                                    <span className="text-white font-bold text-xs">
                                        {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
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
                                            {/* Color Identity Dot */}
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: attColors.fillColor }}></div>
                                            {/* Attachment Name */}
                                            <div className="flex-1 text-center min-w-0">
                                                <span className="text-white/90 font-bold text-xs truncate block">{att.name}</span>
                                            </div>
                                        </div>

                                        {/* Quick Unequip Action */}
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

                    {/* TOP HEADER: Name + Color Dot */}
                    <div className="h-8 bg-black/50 flex items-center justify-center gap-1.5 px-2 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                        {/* Color Identity Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full ${colorDot} flex-shrink-0 border border-white/20 shadow-sm`}></div>
                        {/* Card Name */}
                        <div className="flex-1 text-center min-w-0">
                            <span className="text-white font-bold text-sm truncate block">{card.name}</span>
                        </div>
                    </div>

                    {/* ART WINDOW */}
                    <div className="w-full h-[225px] relative bg-slate-900/30 overflow-hidden group">
                        {/* Art Image */}
                        {card.art_crop ? (
                            <img
                                src={card.art_crop}
                                alt={card.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                style={{ objectPosition: card.activeFaceIndex === 1 ? '100% 15%' : '0% 15%' }}
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-700/50"></div>
                        )}

                        {/* Subtle Pattern Overlay */}
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.02) 10px, rgba(255,255,255,.02) 20px)' }}></div>

                        {/* Stack Count Badge */}
                        {isStack && (
                            <div className="absolute top-2 right-2 flex items-center justify-center h-8 px-2 rounded-full bg-blue-600 border-2 border-white/20 shadow-lg z-20">
                                <span className="text-white font-bold text-sm">x{formatBigNumber(stackCount)}</span>
                            </div>
                        )}


                        {/* P/T Modifier Breakdown Overlay (Bottom Right) */}
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
                    </div>

                    {/* BOTTOM FOOTER: Type + Total P/T */}
                    <div className="h-8 bg-black/50 flex items-center justify-between px-3 relative z-10" style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                        <span className="text-white font-semibold text-xs truncate max-w-[180px] text-shadow-sm">{cardType}</span>
                        {stats && (
                            <div className="bg-black/85 border border-white/10 rounded-full px-3 py-0.5 shadow-lg">
                                <span className={`font-bold text-base ${stats.power > (card.power || 0) ? 'text-green-400' : 'text-white'}`}>
                                    {formatBigNumber(stats.power)}/{formatBigNumber(stats.toughness)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* CONTROLS SECTION */}
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
                    {/* End Controls */}

                </div>
                {/* End Card Unit */}

                {/* Close Hint */}
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm whitespace-nowrap cursor-pointer" onClick={onDeselect}>
                    Tap outside to close
                </div>

                {/* Backdrop Click Handler (Invisible layer covering screen except card) */}
                <div className="fixed inset-0 -z-10" onClick={onDeselect}></div>
            </div>
        </div>,
        document.body
    );
};

export default SelectionMenu;
