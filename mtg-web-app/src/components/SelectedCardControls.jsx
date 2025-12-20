import React, { useState, useEffect } from 'react';
import { Zap, Plus, Minus, Sparkles, ChevronDown, Trash2, RotateCcw, Sword, Repeat } from 'lucide-react';
import { extractActivatedAbilities } from '../utils/keywordParser';
import { formatBigNumber } from '../utils/formatters';
import { calculateCardStats, isPlaceholderLand, BASIC_LAND_NAMES, BASIC_LAND_COLORS } from '../utils/cardUtils';

const SelectedCardControls = ({
    card,
    onActivateAbility,
    onCounterChange,
    onConvertLand,
    onAction,
    stackCount = 1,
    stackCards = [],
    allCards = [],
    isTouch = false
}) => {
    // Local state for how many cards in the stack to modify
    const [modifyCount, setModifyCount] = useState(1);
    const [convertCount, setConvertCount] = useState(1);
    const [selectedCounterType, setSelectedCounterType] = useState('+1/+1');
    const [showCounterDropdown, setShowCounterDropdown] = useState(false);

    // Reset modifyCount and convertCount when card changes or stack changes
    useEffect(() => {
        const count = stackCount > 1 ? stackCount : 1;
        setModifyCount(count);
        setConvertCount(count);
    }, [card?.id, stackCount]);

    if (!card) return null;

    // Use pre-parsed/manual abilities if available, otherwise parse text
    const activatedAbilities = (card.abilities && card.abilities.length > 0)
        ? card.abilities
        : extractActivatedAbilities(card.oracle_text);

    // Check if this is a creature (can have +1/+1 counters)
    const isCreature = card.type === 'Creature' || (card.type_line && card.type_line.includes('Creature'));
    const isStack = stackCount > 1;

    // Parse counters object
    const countersObj = typeof card.counters === 'number' ? { '+1/+1': card.counters } : (card.counters || {});

    // Use centralized stats calculation
    // Important: find the "live" version of the card in allCards to ensure we have latest state
    const liveCard = allCards.find(c => c.id === card.id) || card;
    const stats = calculateCardStats(liveCard, allCards);
    const totalPower = stats.power;
    const totalToughness = stats.toughness;
    const basePower = stats.basePower;
    const baseToughness = stats.baseToughness;
    const counterPower = stats.counterPower;
    const counterToughness = stats.counterToughness;
    const tempPower = stats.tempPowerBonus;
    const tempToughness = stats.tempToughnessBonus;
    const dynamicPower = stats.dynamicPower;
    const dynamicToughness = stats.dynamicToughness;

    // Determine current count of SELECTED type
    const currentSelectedCount = countersObj[selectedCounterType] || 0;

    const handleCounterAction = (change) => {
        if (onCounterChange) {
            // Pass the cards to modify based on modifyCount
            const targets = isStack ? stackCards.slice(0, modifyCount) : [card];

            // Map targets to include the payload instructions (type/change)
            const proxyTargets = targets.map(t => ({ ...t, type: selectedCounterType, change }));

            // Pass the ARRAY of proxies as the second argument
            onCounterChange('counter-update', proxyTargets, modifyCount);
        }
    };

    const KNOWN_COUNTERS = [
        '+1/+1',
        '-1/-1',
        'Oil',
        'Charge',
        'Loyalty',
        'Shield',
        'Stun',
        'Time',
        'Verse'
    ];

    // Gather all hanging action buttons
    const hangingActions = [];

    // 1. Activated Abilities (Zap)
    activatedAbilities.forEach((ability, idx) => {
        hangingActions.push({
            id: `ability-${idx}`,
            icon: Zap,
            label: ability.cost,
            color: 'bg-indigo-600',
            onClick: () => onActivateAbility && onActivateAbility(card, ability)
        });
    });

    // 2. Standard Actions (Tap, Delete)
    hangingActions.push({
        id: 'tap',
        icon: RotateCcw,
        label: 'Tap/Untap',
        color: 'bg-slate-700',
        onClick: () => onAction && onAction('tap', card)
    });

    hangingActions.push({
        id: 'delete',
        icon: Trash2,
        label: 'Remove',
        color: 'bg-red-600',
        onClick: () => onAction && onAction('delete', card, stackCount)
    });

    // 3. Conditional Actions (Equip, Transform)
    if (card.type_line?.includes('Equipment')) {
        hangingActions.push({
            id: 'equip',
            icon: Sword,
            label: 'Equip',
            color: 'bg-amber-600',
            onClick: () => onAction && onAction('equip', card)
        });
    }

    if (card.card_faces && card.card_faces.length > 1) {
        hangingActions.push({
            id: 'transform',
            icon: Repeat,
            label: 'Transform',
            color: 'bg-emerald-600',
            onClick: () => onAction && onAction('transform', card)
        });
    }

    return (

        <div className="w-full bg-slate-900 rounded-b-xl overflow-hidden pointer-events-auto" onClick={e => e.stopPropagation()}>



            {/* Land Conversion UI */}
            {isPlaceholderLand(card) && (
                <div className="space-y-3">
                    {/* Conversion Amount Selector */}
                    {stackCount > 1 && (
                        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400">Convert Amount</span>
                                <span className="text-sm font-bold text-white">{convertCount} / {stackCount}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={stackCount}
                                value={convertCount}
                                onChange={(e) => setConvertCount(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    )}

                    {/* Land Type Buttons */}
                    <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-1.5">
                            {BASIC_LAND_NAMES.map(landName => {
                                const landStyle = BASIC_LAND_COLORS[landName];
                                return (
                                    <button
                                        key={landName}
                                        onClick={() => onConvertLand && onConvertLand(landName, convertCount)}
                                        className="flex items-center justify-center p-2 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 border"
                                        style={{
                                            backgroundColor: landStyle.fillColor,
                                            borderColor: landStyle.borderColor,
                                            color: landStyle.textColor
                                        }}
                                        title={`Convert to ${landName}`}
                                    >
                                        <span className="font-bold text-xs">{landName.substring(0, 1)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}


            {/* Creature Stats & Counters */}
            {isCreature && (
                <div className="space-y-3">
                    {/* Stats Breakdown Text Only (P/T + Modifiers) */}
                    <div className="px-2 pt-2 pb-1 bg-slate-900 flex flex-col items-center">
                        {/* Optional: Show mod breakdown text here if desired, otherwise just P/T is on card frame */}
                        <div className="text-[10px] text-slate-400 flex gap-2">
                            <span>Counters:</span>
                            <span className="text-white font-mono">
                                {counterPower >= 0 ? '+' : ''}{counterPower}/{counterToughness >= 0 ? '+' : ''}{counterToughness}
                            </span>
                        </div>
                    </div>

                    {/* Compact Dark Box Counter Controls */}
                    <div className="bg-slate-800 rounded-xl p-1.5 shadow-lg border-2 border-slate-700 mt-1">
                        <div className="flex items-center justify-between gap-1">

                            {/* Counter Type Selector (Minimal) */}
                            <div className="relative flex-1">
                                <button
                                    onClick={() => setShowCounterDropdown(!showCounterDropdown)}
                                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-950 px-1.5 py-1 rounded text-[10px] text-slate-200 font-bold border border-slate-700 w-full justify-between"
                                >
                                    <span className="truncate">{selectedCounterType}</span>
                                    <ChevronDown size={8} />
                                </button>
                                {showCounterDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setShowCounterDropdown(false)} />
                                        <div className="absolute left-0 bottom-full mb-1 w-32 bg-white border border-slate-300 rounded-lg shadow-xl z-[70] max-h-32 overflow-y-auto">
                                            {KNOWN_COUNTERS.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setSelectedCounterType(type);
                                                        setShowCounterDropdown(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-slate-100 text-slate-800"
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleCounterAction(-1)}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-slate-200 active:scale-95"
                                >
                                    <Minus size={12} />
                                </button>
                                <button
                                    onClick={() => handleCounterAction(1)}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-slate-200 active:scale-95"
                                >
                                    <Plus size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Minimal Stack Slider */}
                        {isStack && (
                            <div className="mt-1.5 px-0.5">
                                <input
                                    type="range"
                                    min="1"
                                    max={stackCount}
                                    value={modifyCount}
                                    onChange={(e) => setModifyCount(parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="text-[8px] text-slate-400 text-center mt-0.5">Apply to {modifyCount}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SelectedCardControls;
