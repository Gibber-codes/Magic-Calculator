import React, { useState, useEffect } from 'react';
import { X, Zap, Plus, Minus, Sparkles, Layers, ChevronDown, Shield } from 'lucide-react';
import { extractActivatedAbilities } from '../utils/keywordParser';
import { formatBigNumber } from '../utils/formatters';
import { calculateCardStats, isPlaceholderLand, BASIC_LAND_NAMES, BASIC_LAND_COLORS } from '../utils/cardUtils';

const SelectedCardPanel = ({
    card,
    onClose,
    onActivateAbility,
    onCounterChange,
    onConvertLand,
    stackCount = 1,
    stackCards = [],
    allCards = []
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
    // Important: find the "live" version of the card in allCards to ensure we have latest state (counters, attachments)
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

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200 custom-scrollbar">
            <div className="p-4 space-y-6 pb-32"> {/* PB-32 for mobile safety */}
                {/* Header */}
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white leading-tight">{card.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-700">
                        <X size={20} />
                    </button>
                </div>

                {/* Land Conversion UI - Only for Placeholder Lands */}
                {isPlaceholderLand(card) && (
                    <div className="space-y-4">
                        {/* Conversion Amount Selector */}
                        {stackCount > 1 && (
                            <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-300">Convert Amount</span>
                                    <span className="text-lg font-bold text-white">{convertCount} / {stackCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max={stackCount}
                                    value={convertCount}
                                    onChange={(e) => setConvertCount(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        )}

                        {/* Land Type Buttons */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Convert to Basic Land</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {BASIC_LAND_NAMES.map(landName => {
                                    const landStyle = BASIC_LAND_COLORS[landName];
                                    return (
                                        <button
                                            key={landName}
                                            onClick={() => onConvertLand && onConvertLand(landName, convertCount)}
                                            className="flex items-center justify-between p-3 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
                                            style={{
                                                backgroundColor: landStyle.fillColor,
                                                borderColor: landStyle.borderColor,
                                                color: landStyle.textColor
                                            }}
                                        >
                                            <span className="font-bold text-lg">{landName}</span>
                                            <span
                                                className="text-xs px-2 py-1 rounded-lg font-semibold"
                                                style={{
                                                    backgroundColor: landStyle.borderColor,
                                                    color: landStyle.textColor === 'white' ? 'white' : 'black'
                                                }}
                                            >
                                                +{convertCount}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Card Image */}
                {!isPlaceholderLand(card) && card.image_normal && (
                    <div className="flex justify-center mb-4">
                        <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 w-64 aspect-[2.5/3.5] bg-black">
                            <img
                                src={card.image_normal}
                                alt={card.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                )}

                {/* Activated Ability Buttons */}
                {activatedAbilities.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                        {activatedAbilities.map((ability, index) => (
                            <button
                                key={index}
                                onClick={() => onActivateAbility(card, ability)}
                                className="flex items-center justify-between p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all font-bold text-left group"
                            >
                                <span className="flex items-center gap-2 truncate">
                                    <Zap size={18} className="flex-shrink-0 text-indigo-200 group-hover:text-white" />
                                    <span className="truncate text-sm">{ability.cost}</span>
                                </span>
                                <span className="text-xs bg-indigo-800 px-2 py-1 rounded text-indigo-200">Activate</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Creature Stats & Counters */}
                {isCreature && (
                    <div className="space-y-4">
                        {/* Stats Breakdown Card */}
                        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                            {/* Big Total */}
                            <div className="flex items-end justify-between border-b border-slate-600 pb-2 mb-2">
                                <span className="text-slate-400 text-sm font-semibold mb-1">Total Stats</span>
                                <div className="text-4xl font-black text-white tracking-widest flex items-baseline">
                                    <span className={counterPower > 0 || tempPower > 0 ? 'text-green-400' : counterPower < 0 ? 'text-red-400' : ''}>
                                        {formatBigNumber(totalPower)}
                                    </span>
                                    <span className="text-slate-500 mx-1 text-2xl">/</span>
                                    <span className={counterToughness > 0 || tempToughness > 0 ? 'text-green-400' : counterToughness < 0 ? 'text-red-400' : ''}>
                                        {formatBigNumber(totalToughness)}
                                    </span>
                                </div>
                            </div>

                            {/* Modifiers List */}
                            <div className="space-y-1 text-xs text-slate-300">
                                <div className="flex justify-between">
                                    <span>Base</span>
                                    <span className="font-mono opacity-70">{basePower}/{baseToughness}</span>
                                </div>
                                {counterPower !== 0 && (
                                    <div className="flex justify-between text-blue-300">
                                        <span>Counters</span>
                                        <span className="font-mono">
                                            {counterPower >= 0 ? '+' : ''}{counterPower}/{counterToughness >= 0 ? '+' : ''}{counterToughness}
                                        </span>
                                    </div>
                                )}
                                {(tempPower !== 0 || tempToughness !== 0) && (
                                    <div className="flex justify-between text-amber-300">
                                        <span>Modifiers</span>
                                        <span className="font-mono">
                                            {tempPower >= 0 ? '+' : ''}{tempPower}/{tempToughness >= 0 ? '+' : ''}{tempToughness}
                                        </span>
                                    </div>
                                )}
                                {(dynamicPower !== 0 || dynamicToughness !== 0) && (
                                    <div className="flex justify-between text-purple-300">
                                        <span>Attachments</span>
                                        <span className="font-mono">
                                            {dynamicPower >= 0 ? '+' : ''}{dynamicPower}/{dynamicToughness >= 0 ? '+' : ''}{dynamicToughness}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Generic Counter Controls */}
                        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white font-semibold">
                                    <Sparkles size={16} className="text-purple-400" />
                                    <span>Counter Type</span>
                                </div>

                                {/* Dropdown Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCounterDropdown(!showCounterDropdown)}
                                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-sm border border-slate-600 transition-colors w-32 justify-between"
                                    >
                                        <span className="truncate">{selectedCounterType}</span>
                                        <ChevronDown size={14} className={`transition-transform ${showCounterDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showCounterDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-[60]" onClick={() => setShowCounterDropdown(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[70] overflow-hidden max-h-64 overflow-y-auto">
                                                {KNOWN_COUNTERS.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setSelectedCounterType(type);
                                                            setShowCounterDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${selectedCounterType === type ? 'bg-slate-700 text-white font-bold' : 'text-slate-300'}`}
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
                                    // disabled={currentSelectedCount <= 0} // Can go negative? Probably not for counters.
                                    disabled={currentSelectedCount <= 0}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-800 text-red-400 shadow-sm border border-slate-600 transition-all active:scale-95"
                                >
                                    <Minus size={24} />
                                </button>

                                <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 rounded-xl h-12 border border-slate-700/50">
                                    <span className="text-white font-black text-2xl">{currentSelectedCount}</span>
                                </div>

                                <button
                                    onClick={() => handleCounterAction(1)}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-600 text-green-400 shadow-sm border border-slate-600 transition-all active:scale-95"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectedCardPanel;
