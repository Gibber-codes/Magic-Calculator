import React, { useState, useEffect } from 'react';
import { X, Zap, Plus, Minus, Sparkles, Layers } from 'lucide-react';
import { extractActivatedAbilities } from '../utils/keywordParser';
import { formatBigNumber } from '../utils/formatters';

const SelectedCardPanel = ({
    card,
    onClose,
    onActivateAbility,
    onCounterChange,
    stackCount = 1,
    stackCards = []
}) => {
    // Local state for how many cards in the stack to modify
    const [modifyCount, setModifyCount] = useState(1);

    // Reset modifyCount when card changes or stack changes
    useEffect(() => {
        setModifyCount(stackCount > 1 ? stackCount : 1);
    }, [card?.id, stackCount]);

    if (!card) return null;

    // Use pre-parsed/manual abilities if available, otherwise parse text
    const activatedAbilities = (card.abilities && card.abilities.length > 0)
        ? card.abilities
        : extractActivatedAbilities(card.oracle_text);

    // Check if this is a creature (can have +1/+1 counters)
    const isCreature = card.type === 'Creature' || (card.type_line && card.type_line.includes('Creature'));
    const isStack = stackCount > 1;
    const currentCounters = card.counters || 0;

    const handleCounterAction = (action) => {
        if (onCounterChange) {
            // Pass the cards to modify based on modifyCount
            const cardsToModify = isStack ? stackCards.slice(0, modifyCount) : [card];
            onCounterChange(action, cardsToModify, modifyCount);
        }
    };

    const cycleModifyCount = () => {
        if (modifyCount === 1) {
            // 1 -> Half
            const half = Math.ceil(stackCount / 2);
            setModifyCount(half === 1 ? stackCount : half);
        } else if (modifyCount === Math.ceil(stackCount / 2) && stackCount > 2) {
            // Half -> All
            setModifyCount(stackCount);
        } else {
            // All -> 1
            setModifyCount(1);
        }
    };

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-4 space-y-6">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white leading-tight">{card.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Card Image */}
                {card.image_normal && (
                    <div className="flex justify-center mb-4">
                        <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 w-64">
                            <img
                                src={card.image_normal}
                                alt={card.name}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    </div>
                )}

                {/* Activated Ability Buttons - Two Column Grid */}
                {activatedAbilities.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {activatedAbilities.map((ability, index) => (
                            <button
                                key={index}
                                onClick={() => onActivateAbility(card, ability)}
                                className="flex items-center justify-start gap-2 p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all font-bold text-left"
                            >
                                <Zap size={18} className="flex-shrink-0" />
                                <span className="truncate text-sm">{ability.cost}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Counter Controls - Creatures Only */}
                {isCreature && (
                    <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-green-400" />
                            <span className="text-white font-semibold">+1/+1 Counters</span>
                        </div>

                        {/* Counter Buttons with Badge in Middle */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleCounterAction('counter-')}
                                disabled={currentCounters <= 0}
                                className="flex-1 flex items-center justify-center p-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:opacity-50 text-white shadow-lg transition-all"
                            >
                                <Minus size={20} />
                            </button>

                            <div className="bg-green-600 px-4 py-2 rounded-full">
                                <span className="text-white font-bold text-lg">{formatBigNumber(currentCounters)}</span>
                            </div>

                            <button
                                onClick={() => handleCounterAction('counter+')}
                                className="flex-1 flex items-center justify-center p-3 rounded-lg bg-green-600 hover:bg-green-500 text-white shadow-lg transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectedCardPanel;
