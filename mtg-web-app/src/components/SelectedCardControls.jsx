import React, { useState, useEffect, useRef } from 'react';
import { Zap, Plus, Minus, Sparkles, ChevronDown, Trash2, RotateCcw, Sword, Repeat, Lock, Unlock } from 'lucide-react';
import { extractActivatedAbilities } from '../utils/keywordParser';
import { formatBigNumber } from '../utils/formatters';
import { calculateCardStats, isPlaceholderLand, BASIC_LAND_NAMES, BASIC_LAND_COLORS } from '../utils/cardUtils';

const SelectedCardControls = ({
    card,
    onActivateAbility,
    onCounterChange,
    onConvertLand,
    onAction,
    onDeselect,
    stackCount = 1,
    stackCards = [],
    allCards = [],
    isTouch = false
}) => {
    // Local state
    const [modifyCount, setModifyCount] = useState(1);
    const [convertCount, setConvertCount] = useState(1);
    const [selectedCounterType, setSelectedCounterType] = useState('+1/+1');
    const [showCounterDropdown, setShowCounterDropdown] = useState(false);

    // New State for Modifier Interface
    const [activeModifierMode, setActiveModifierMode] = useState('counters'); // 'counters' | 'pt-perm' | 'pt-temp'
    const [isPTLocked, setIsPTLocked] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // For sliders, we limit selection to the number of physical card objects in the stack
    const sliderMax = stackCards.length > 0 ? stackCards.length : 1;

    // Reset modifyCount and convertCount when card changes or stack changes
    useEffect(() => {
        setModifyCount(sliderMax);
        setConvertCount(sliderMax);
    }, [card?.id, sliderMax]);


    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!card) return null;

    // Use centralized stats calculation
    const liveCard = allCards.find(c => c.id === card.id) || card;
    const stats = calculateCardStats(liveCard, allCards);

    const isCreature = card.type === 'Creature' || (card.type_line && card.type_line.includes('Creature'));
    const isStack = stackCount > 1n;
    const displayCount = formatBigNumber(stackCount);

    // Determine current count of SELECTED type (for display)
    const countersObj = typeof card.counters === 'number' ? { '+1/+1': card.counters } : (card.counters || {});

    const currentSelectedCount = countersObj[selectedCounterType] || 0;

    const handlePTUpdate = (powerChange, toughnessChange, type) => {
        if (!onCounterChange) return;
        const targets = isStack ? stackCards.slice(0, modifyCount) : [card];
        const proxyTargets = targets.map(target => ({
            ...target,
            type: type === 'pt-perm' ? 'permanent' : 'temporary',
            powerChange,
            toughnessChange
        }));
        onCounterChange('pt-update', proxyTargets, modifyCount);
    };

    const handleCounterUpdate = (change) => {
        if (onCounterChange) {
            const targets = isStack ? stackCards.slice(0, modifyCount) : [card];
            const proxyTargets = targets.map(t => ({ ...t, type: selectedCounterType, change }));
            onCounterChange('counter-update', proxyTargets, modifyCount);
        }
    };

    const MODIFIER_OPTIONS = [
        { id: 'counters', label: 'Counters', icon: Plus, color: 'text-indigo-400', border: 'border-slate-700' },
        { id: 'pt-perm', label: 'P/T Modifier (perm)', icon: Zap, color: 'text-emerald-400', border: 'border-emerald-600' },
        { id: 'pt-temp', label: 'P/T Modifier (temp)', icon: Zap, color: 'text-amber-400', border: 'border-amber-500' }
    ];

    const currentMode = MODIFIER_OPTIONS.find(o => o.id === activeModifierMode);

    const KNOWN_COUNTERS = [
        '+1/+1', '-1/-1', 'Oil', 'Charge', 'Loyalty', 'Shield', 'Stun', 'Time', 'Verse'
    ];

    // Gather hanging actions logic (Activated Abilities, etc.)
    const rawAbilities = (card.abilities && card.abilities.length > 0)
        ? card.abilities
        : extractActivatedAbilities(card.oracle_text);

    // Filter out triggered abilities (only show Activated abilities or manual ones)
    const activatedAbilities = rawAbilities.filter(ability =>
        !ability.trigger || ability.trigger === 'activated'
    );

    const hangingActions = [];
    activatedAbilities.forEach((ability, idx) => {
        hangingActions.push({
            id: `ability-${idx}`,
            icon: Zap,
            label: ability.cost,
            color: 'bg-indigo-600',
            onClick: () => onActivateAbility && onActivateAbility(card, ability)
        });
    });

    hangingActions.push({
        id: 'tap', icon: RotateCcw, label: 'Tap/Untap', color: 'bg-slate-700',
        onClick: () => onAction && onAction('tap', card)
    });

    hangingActions.push({
        id: 'delete', icon: Trash2, label: 'Remove', color: 'bg-red-600',
        onClick: () => onAction && onAction('delete', card, stackCount)
    });



    if (card.card_faces && card.card_faces.length > 1) {
        hangingActions.push({
            id: 'transform', icon: Repeat, label: 'Transform', color: 'bg-emerald-600',
            onClick: () => onAction && onAction('transform', card)
        });
    }

    return (
        <div className="w-full rounded-b-xl overflow-hidden pointer-events-auto" onClick={e => e.stopPropagation()}>
            <div className="p-3 bg-black/50 backdrop-blur-md">

                {/* Activated Abilities */}
                {activatedAbilities.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {activatedAbilities.map((ability, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (onActivateAbility) {
                                        onActivateAbility(card, ability);
                                        // Close the menu if the ability requires targeting
                                        if (ability.requiresTarget && onDeselect) {
                                            onDeselect();
                                        }
                                    }
                                }}
                                className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-lg px-3 py-2 text-left transition-all active:scale-98 group"
                            >
                                <div className="flex items-start gap-2">
                                    <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5 group-hover:text-indigo-300" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-indigo-300 text-xs font-semibold truncate">{ability.cost}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Land Conversion UI */}
                {isPlaceholderLand(card) && (
                    <div className="space-y-3 mb-4">
                        {stackCount > 1 && (
                            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-400">Convert Amount</span>
                                    <span className="text-sm font-bold text-white">{convertCount} / {displayCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max={sliderMax}

                                    value={convertCount}
                                    onChange={(e) => setConvertCount(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-1.5">
                            {BASIC_LAND_NAMES.map(landName => (
                                <button
                                    key={landName}
                                    onClick={() => onConvertLand && onConvertLand(landName, convertCount)}
                                    className="flex items-center justify-center p-2 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 border"
                                    style={{
                                        backgroundColor: BASIC_LAND_COLORS[landName].fillColor,
                                        borderColor: BASIC_LAND_COLORS[landName].borderColor,
                                        color: BASIC_LAND_COLORS[landName].textColor
                                    }}
                                >
                                    <span className="font-bold text-xs">{landName.substring(0, 1)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Creature Modification Interface */}
                {isCreature && (
                    <div className="w-full space-y-2 animate-in fade-in duration-300">

                        {/* Mode Dropdown */}
                        <div className="relative mb-2" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-600 rounded-lg px-3 py-2 flex items-center justify-between text-white text-sm font-medium transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <currentMode.icon className={`w-4 h-4 ${currentMode.color}`} />
                                    <span>
                                        {activeModifierMode === 'counters' ?
                                            (selectedCounterType === '+1/+1' ? '+1/+1 Counter' : selectedCounterType) :
                                            currentMode.label}
                                    </span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="fixed inset-x-0 top-auto bottom-0 mb-1 bg-white rounded-t-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom duration-200 max-h-[60vh] overflow-y-auto">
                                    {/* Counters Section */}
                                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                                        <div className="text-slate-600 text-xs font-bold uppercase">Counters</div>
                                    </div>
                                    {KNOWN_COUNTERS.map(type => (
                                        <button key={type}
                                            onClick={() => {
                                                setActiveModifierMode('counters');
                                                setSelectedCounterType(type);
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 text-sm flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3 text-indigo-500" />
                                            <span>{type} {type !== '+1/+1' && type !== '-1/-1' ? 'Counter' : ''}</span>
                                        </button>
                                    ))}

                                    {/* Modifiers Section */}
                                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 border-t">
                                        <div className="text-slate-600 text-xs font-bold uppercase">Power/Toughness</div>
                                    </div>
                                    {MODIFIER_OPTIONS.slice(1).map(opt => (
                                        <button key={opt.id}
                                            onClick={() => { setActiveModifierMode(opt.id); setIsDropdownOpen(false); }}
                                            className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 text-sm flex items-center gap-2"
                                        >
                                            <opt.icon className={`w-4 h-4 ${opt.id === 'pt-perm' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Controls Area */}
                        {activeModifierMode === 'counters' && (
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <button onClick={() => handleCounterUpdate(-1)} className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                    <Minus className="w-5 h-5" />
                                </button>
                                <div className="w-16 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                                    <span className={`text-white text-2xl font-bold`}>
                                        {selectedCounterType === '+1/+1' ? (card.counters?.['+1/+1'] || (typeof card.counters === 'number' ? card.counters : 0)) : (card.counters?.[selectedCounterType] || 0)}
                                    </span>
                                </div>
                                <button onClick={() => handleCounterUpdate(1)} className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {(activeModifierMode === 'pt-perm' || activeModifierMode === 'pt-temp') && (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-slate-400 text-xs font-semibold">Link P/T</span>
                                    <button
                                        onClick={() => setIsPTLocked(!isPTLocked)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all active:scale-95 ${isPTLocked ? (activeModifierMode === 'pt-perm' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500') : 'bg-slate-600 hover:bg-slate-500'}`}
                                    >
                                        {isPTLocked ? <Lock className="w-3.5 h-3.5 text-white" /> : <Unlock className="w-3.5 h-3.5 text-white" />}
                                        <span className="text-white text-xs font-bold">{isPTLocked ? 'Locked' : 'Unlocked'}</span>
                                    </button>
                                </div>

                                {isPTLocked ? (
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-16 text-slate-400 text-xs font-semibold">P/T</div>
                                        <button onClick={() => handlePTUpdate(-1, -1, activeModifierMode)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <div className="flex-1 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                            <span className={`${activeModifierMode === 'pt-perm' ? 'text-emerald-400' : 'text-amber-400'} text-lg font-bold`}>
                                                {activeModifierMode === 'pt-perm' ?
                                                    `+${stats.permPowerBonus}/+${stats.permToughnessBonus}` :
                                                    `+${stats.tempPowerBonus}/+${stats.tempToughnessBonus}`}
                                            </span>
                                        </div>
                                        <button onClick={() => handlePTUpdate(1, 1, activeModifierMode)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-16 text-slate-400 text-xs font-semibold">Power</div>
                                            <button onClick={() => handlePTUpdate(-1, 0, activeModifierMode)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <div className="flex-1 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                                <span className={`${activeModifierMode === 'pt-perm' ? 'text-emerald-400' : 'text-amber-400'} text-lg font-bold`}>
                                                    {activeModifierMode === 'pt-perm' ? `+${stats.permPowerBonus}` : `+${stats.tempPowerBonus}`}
                                                </span>
                                            </div>
                                            <button onClick={() => handlePTUpdate(1, 0, activeModifierMode)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-16 text-slate-400 text-xs font-semibold">Toughness</div>
                                            <button onClick={() => handlePTUpdate(0, -1, activeModifierMode)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <div className="flex-1 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                                <span className={`${activeModifierMode === 'pt-perm' ? 'text-emerald-400' : 'text-amber-400'} text-lg font-bold`}>
                                                    {activeModifierMode === 'pt-perm' ? `+${stats.permToughnessBonus}` : `+${stats.tempToughnessBonus}`}
                                                </span>
                                            </div>
                                            <button onClick={() => handlePTUpdate(0, 1, activeModifierMode)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white active:scale-95 transition-all">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Apply Slider (Shared) */}
                        {stackCount > 1 && (
                            <div className="px-2">
                                <input
                                    type="range"
                                    min="1"
                                    max={sliderMax}
                                    value={modifyCount}
                                    onChange={(e) => setModifyCount(parseInt(e.target.value))}
                                    className={`w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer ${activeModifierMode === 'pt-perm' ? 'accent-emerald-500' :
                                        activeModifierMode === 'pt-temp' ? 'accent-amber-500' :
                                            'accent-indigo-500'
                                        }`}
                                />
                                <div className="text-xs text-slate-400 text-center mt-1">
                                    Apply to {modifyCount} of {displayCount}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onAction && onAction('tap', card)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-white font-semibold text-sm transition-all active:scale-95"
                            >
                                <RotateCcw size={16} />
                                <span>{card.tapped ? 'Untap' : 'Tap'}</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (onAction) {
                                        onAction('delete', card, stackCount);
                                        // Close the menu if we're removing the last card or the entire stack
                                        if ((stackCount === 1 || modifyCount === stackCount) && onDeselect) {
                                            onDeselect();
                                        }
                                    }
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600/50 hover:bg-red-500/50 border border-red-500/50 text-white font-semibold text-sm transition-all active:scale-95"
                            >
                                <Trash2 size={16} />
                                <span>Remove</span>
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SelectedCardControls;
