import React, { useState, useEffect } from 'react';
import { X, Zap, Plus, Minus, Trash2, RotateCcw, Link2, Unlink, Skull, Ghost, Repeat, ChevronDown, Sparkles } from 'lucide-react';
import { extractActivatedAbilities } from '../utils/keywordParser';
import { formatBigNumber } from '../utils/formatters';
import { calculateCardStats, isPlaceholderLand, BASIC_LAND_NAMES, BASIC_LAND_COLORS, isCreature } from '../utils/cardUtils';
import { createPortal } from 'react-dom';
import { TopBanner, ArtWindow, BottomBanner } from './RedesignedCardFrame';

// Constants
const CARD_WIDTH = 140;

// Card Colors - Hex mapping
const getCardHexColors = (colors) => {
    let c = { borderColor: '#6b7280', fillColor: '#374151', text: 'black' };
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
 * SelectionMenu - A fullscreen modal overlay for card actions
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
    const [modifyCount, setModifyCount] = useState(1);
    const [selectedCounterType, setSelectedCounterType] = useState('+1/+1');
    const [showCounterDropdown, setShowCounterDropdown] = useState(false);

    // Reset modifyCount when card changes
    useEffect(() => {
        setModifyCount(stackCount > 1 ? stackCount : 1);
    }, [selectedCard?.id, stackCount]);

    if (!selectedCard) return null;

    const card = selectedCard;
    const isStack = stackCount > 1;
    const colors = getCardHexColors(card.colors);

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

    // Counter info
    const countersObj = typeof card.counters === 'number' ? { '+1/+1': card.counters } : (card.counters || {});
    const currentSelectedCount = countersObj[selectedCounterType] || 0;

    // Get activated abilities
    const activatedAbilities = (card.abilities && card.abilities.length > 0)
        ? card.abilities.filter(a => a.cost)
        : extractActivatedAbilities(card.oracle_text || '');

    // Card type display
    let cardType = card.type_line ? card.type_line.split('—')[0]?.trim() || card.type_line : card.type;
    if (card.isToken && !cardType.toLowerCase().includes('token')) {
        cardType = `Token ${cardType}`;
    }

    const handleCounterAction = (change) => {
        if (onCounterChange) {
            const targets = isStack ? stackCards.slice(0, modifyCount) : [card];
            const proxyTargets = targets.map(t => ({ ...t, type: selectedCounterType, change }));
            onCounterChange('counter-update', proxyTargets, modifyCount);
        }
    };

    const KNOWN_COUNTERS = ['+1/+1', '-1/-1', 'Oil', 'Charge', 'Loyalty', 'Shield', 'Stun', 'Time', 'Verse'];

    // Render the card preview (scaled up)
    const renderCardPreview = () => (
        <div
            className="relative flex flex-col items-center rounded-xl transition-all duration-300 w-full scale-[1.75] shadow-[0_0_30px_rgba(34,197,94,0.6)] shadow-2xl ring-2 ring-green-500/50"
            style={{ paddingTop: attachments.length > 0 ? `${attachments.length * 28}px` : 0 }}
        >
            {/* Attached Equipment Banners */}
            {attachments.length > 0 && (
                <div className="absolute top-0 left-0 w-full flex flex-col items-center z-20">
                    {attachments.map((att, index) => {
                        const attColors = getCardHexColors(att.colors);
                        return (
                            <div key={att.id} className="relative w-full flex flex-col items-center"
                                style={{ zIndex: attachments.length - index }}>
                                <div className="relative z-10">
                                    <TopBanner width={CARD_WIDTH} height={24} colorIdentity={attColors.fillColor}>
                                        <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: 'white' }}>
                                            {att.name}
                                        </div>
                                    </TopBanner>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Top Banner */}
            <div className="z-30 relative" style={{ marginBottom: -4 }}>
                <TopBanner width={CARD_WIDTH} height={28} colorIdentity={colors.fillColor}>
                    <div className="w-full text-center text-[10px] font-bold truncate leading-tight" style={{ color: '#ffffff' }}>
                        {card.name}
                    </div>
                </TopBanner>
            </div>

            {/* Art Window */}
            <div className="z-30 relative">
                <ArtWindow width={CARD_WIDTH} height={100}>
                    {card.art_crop && (
                        <img
                            src={card.art_crop}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: card.activeFaceIndex === 1 ? '100% 15%' : '0% 15%' }}
                        />
                    )}
                </ArtWindow>

                {/* Counter Indicator */}
                {countersObj['+1/+1'] > 0 && (
                    <div className="absolute top-2 left-2 bg-green-600 rounded-lg px-1.5 h-6 flex items-center justify-center shadow-lg border border-green-800 z-20">
                        <span className="text-white text-[10px] font-bold">+{formatBigNumber(countersObj['+1/+1'])}</span>
                    </div>
                )}

                {/* Stack Count */}
                {isStack && (
                    <div className="absolute top-2 right-2 rounded-full h-6 px-2 flex items-center justify-center shadow-lg border-2 z-20 bg-blue-600 border-blue-400 text-white">
                        <span className="text-xs font-bold">x{stackCount}</span>
                    </div>
                )}
            </div>

            {/* Bottom Banner */}
            <div className="z-30 relative" style={{ marginTop: 4 }}>
                <BottomBanner width={CARD_WIDTH} height={28}>
                    <div style={{ width: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <div className="w-full flex justify-between items-center px-1">
                            <span className="text-[9px] font-semibold truncate flex-1 leading-tight" style={{ color: '#ffffff' }}>{cardType}</span>
                        </div>
                    </div>
                    {stats && (
                        <div className="text-[10px] font-bold flex gap-0.5 text-white">
                            <span>{formatBigNumber(stats.power)}</span>/<span>{formatBigNumber(stats.toughness)}</span>
                        </div>
                    )}
                </BottomBanner>
            </div>
        </div>
    );

    // Render action buttons
    const renderActions = () => (
        <div className="grid grid-cols-2 gap-2 w-full">
            {/* Tap/Untap */}
            <ActionButton
                icon={RotateCcw}
                label={card.tapped ? 'Untap' : 'Tap'}
                color={card.tapped ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600'}
                onClick={() => onAction('tap', card, modifyCount)}
            />

            {/* Transform */}
            {hasTransform && (
                <ActionButton
                    icon={Repeat}
                    label="Transform"
                    color="bg-purple-600 hover:bg-purple-500"
                    onClick={() => onAction('transform', card)}
                />
            )}

            {/* Equip */}
            {isEquipment && !isAttached && (
                <ActionButton
                    icon={Link2}
                    label="Equip"
                    color="bg-amber-600 hover:bg-amber-500"
                    onClick={() => onAction('equip', card)}
                />
            )}

            {/* Detach */}
            {isAttached && (
                <ActionButton
                    icon={Unlink}
                    label="Detach"
                    color="bg-amber-600 hover:bg-amber-500"
                    onClick={() => onAction('unequip-self', card)}
                />
            )}

            {/* Detach All */}
            {attachments.length > 0 && (
                <ActionButton
                    icon={Unlink}
                    label={`Detach All (${attachments.length})`}
                    color="bg-amber-700 hover:bg-amber-600"
                    onClick={() => onAction('unequip', card)}
                />
            )}

            {/* Graveyard */}
            <ActionButton
                icon={Skull}
                label="Graveyard"
                color="bg-slate-700 hover:bg-slate-600"
                onClick={() => onAction('graveyard', card, modifyCount)}
            />

            {/* Exile */}
            <ActionButton
                icon={Ghost}
                label="Exile"
                color="bg-slate-700 hover:bg-slate-600"
                onClick={() => onAction('exile', card, modifyCount)}
            />

            {/* Remove */}
            <ActionButton
                icon={Trash2}
                label="Remove"
                color="bg-red-700 hover:bg-red-600"
                onClick={() => onAction('delete', card, modifyCount)}
            />
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                onClick={onDeselect}
            />

            {/* Close Button */}
            <button
                className="absolute top-4 right-4 z-[110] bg-white/10 p-2 rounded-full text-white/70 hover:bg-white/20 active:scale-95 backdrop-blur-md"
                onClick={onDeselect}
            >
                <X className="w-6 h-6" />
            </button>

            {/* Main Content Container */}
            <div className="relative z-[101] pointer-events-auto flex flex-col items-center justify-start p-4 h-full w-full max-w-lg mx-auto overflow-y-auto overflow-x-hidden no-scrollbar">

                {/* Card Preview - Centered at top */}
                <div className="mt-12 mb-8 flex flex-col items-center">
                    {renderCardPreview()}
                </div>

                {/* Unified Control Panel */}
                <div className="w-full max-w-xs bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 space-y-4 shadow-xl">

                    {/* Stack Selector */}
                    {isStack && (
                        <div className="w-full pb-4 border-b border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400 font-medium">Modify Amount</span>
                                <span className="text-lg font-bold text-white">{modifyCount} / {stackCount}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={stackCount}
                                value={modifyCount}
                                onChange={(e) => setModifyCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    )}

                    {/* Land Conversion */}
                    {isPlaceholderLand(card) && (
                        <div className="w-full">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Convert to Basic Land</h4>
                            <div className="flex gap-2 flex-wrap justify-center">
                                {BASIC_LAND_NAMES.map(landName => {
                                    const style = BASIC_LAND_COLORS[landName];
                                    return (
                                        <button
                                            key={landName}
                                            onClick={() => onConvertLand?.(landName, modifyCount)}
                                            className="px-3 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 border-2 shadow-lg"
                                            style={{
                                                backgroundColor: style.fillColor,
                                                borderColor: style.borderColor,
                                                color: style.textColor
                                            }}
                                        >
                                            {landName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Counter Controls (Creatures) */}
                    {cardIsCreature && (
                        <div className="w-full pb-4 border-b border-slate-700/50 space-y-3">
                            {/* Stats Display */}
                            {stats && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400 font-medium">Stats</span>
                                    <div className="text-2xl font-black text-white tracking-wider">
                                        <span className={stats.counterPower > 0 ? 'text-green-400' : ''}>{formatBigNumber(stats.power)}</span>
                                        <span className="text-slate-500 mx-1">/</span>
                                        <span className={stats.counterToughness > 0 ? 'text-green-400' : ''}>{formatBigNumber(stats.toughness)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Counter Type Selector */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white font-semibold">
                                    <Sparkles size={16} className="text-purple-400" />
                                    <span className="text-sm">Counter</span>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCounterDropdown(!showCounterDropdown)}
                                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-sm border border-slate-600 transition-colors w-28 justify-between"
                                    >
                                        <span className="truncate">{selectedCounterType}</span>
                                        <ChevronDown size={14} className={`transition-transform ${showCounterDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showCounterDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-[60]" onClick={() => setShowCounterDropdown(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-40 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[70] overflow-hidden max-h-48 overflow-y-auto">
                                                {KNOWN_COUNTERS.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setSelectedCounterType(type);
                                                            setShowCounterDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${selectedCounterType === type ? 'bg-slate-700 text-white font-bold' : 'text-slate-300'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Counter Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleCounterAction(-1)}
                                    disabled={currentSelectedCount <= 0}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-red-400 shadow-sm border border-slate-600 transition-all active:scale-95"
                                >
                                    <Minus size={24} />
                                </button>
                                <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-xl h-12 border border-slate-700/50">
                                    <span className="text-white font-black text-2xl">{currentSelectedCount}</span>
                                </div>
                                <button
                                    onClick={() => handleCounterAction(1)}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 text-green-400 shadow-sm border border-slate-600 transition-all active:scale-95"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Activated Abilities */}
                    {activatedAbilities.length > 0 && (
                        <div className="w-full pb-4 border-b border-slate-700/50">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Abilities</h4>
                            <div className="flex flex-col gap-2">
                                {activatedAbilities.map((ability, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onActivateAbility(card, ability)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 font-bold text-left"
                                    >
                                        <Zap size={18} className="text-indigo-200 flex-shrink-0" />
                                        <span className="truncate text-sm">{ability.cost}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {renderActions()}
                </div>
            </div>
        </div>,
        document.body
    );
};

// Helper Component for Action Buttons
const ActionButton = ({ icon: Icon, label, color, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-sm ${color} text-white transition-all active:scale-95 shadow-lg w-full`}
    >
        <Icon size={18} />
        <span>{label}</span>
    </button>
);

export default SelectionMenu;
