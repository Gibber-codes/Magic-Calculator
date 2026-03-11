import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Plus, Zap } from 'lucide-react';

/**
 * Modal overlay for entering X mana cost for spells like Devastating Onslaught.
 * Shows card art, name, and a clean number input with +/- buttons.
 */
const XCostModal = ({ spell, onConfirm, onCancel }) => {
    const [xValue, setXValue] = useState(1);
    const inputRef = useRef(null);

    // Auto-focus and select all on mount
    useEffect(() => {
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 100);
    }, []);

    const handleConfirm = () => {
        const value = Math.max(1, parseInt(xValue) || 1);
        onConfirm(value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') onCancel();
    };

    const handleChange = (e) => {
        const raw = e.target.value;
        if (raw === '') {
            setXValue('');
        } else {
            const num = parseInt(raw);
            if (!isNaN(num)) setXValue(num);
        }
    };

    const handleBlur = () => {
        // Enforce minimum on blur
        if (xValue === '' || xValue < 1) setXValue(1);
    };

    if (!spell) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
        >
            <div
                className="relative bg-slate-900/95 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                    <X size={16} />
                </button>

                {/* Card Art & Name */}
                <div className="flex items-center gap-4 mb-6">
                    {(spell.image_normal || spell.art_crop) && (
                        <div className="w-16 h-22 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 shrink-0">
                            <img
                                src={spell.image_normal || spell.image_uris?.normal || spell.art_crop}
                                alt={spell.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div>
                        <h3 className="text-white font-bold text-lg leading-tight">{spell.name}</h3>
                        <p className="text-white/40 text-sm mt-1">{spell.mana_cost || '{X}{X}{R}'}</p>
                    </div>
                </div>

                {/* X Value Selector */}
                <div className="mb-6">
                    <label className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4 block text-center">
                        Choose value for X
                    </label>
                    <div className="flex items-center justify-center gap-6">
                        {/* Minus Button */}
                        <button
                            onClick={() => setXValue(Math.max(1, xValue - 1))}
                            className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-90"
                        >
                            <Minus size={22} />
                        </button>

                        {/* Tappable Number Display */}
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-2xl bg-red-500/10 border border-red-500/20" />
                            <input
                                ref={inputRef}
                                type="number"
                                min="1"
                                value={xValue}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                onKeyDown={handleKeyDown}
                                className="relative w-full h-full bg-transparent text-center text-white text-4xl font-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>

                        {/* Plus Button */}
                        <button
                            onClick={() => setXValue((parseInt(xValue) || 0) + 1)}
                            className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-90"
                        >
                            <Plus size={22} />
                        </button>
                    </div>
                </div>

                {/* Description */}
                <p className="text-white/30 text-sm mb-6 text-center">
                    Creates <span className="text-red-400 font-bold">{xValue || '?'}</span> token {xValue === 1 ? 'copy' : 'copies'} of target creature or artifact
                </p>

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Zap size={20} />
                    Cast for X = {xValue || '?'}
                </button>
            </div>
        </div>
    );
};

export default XCostModal;
