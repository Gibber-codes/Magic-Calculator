import React, { useState, useRef } from 'react';
import { X, Plus, Search, Trash2 } from 'lucide-react';

const AddCardPanel = ({
    isOpen,
    onClose,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    previewCard,
    setPreviewCard,
    recentCards,
    onAddCard,
    onAddToRecents,
    onDeleteRecent,
    onSelectSearchResult,
    presets,
    loadingPreset,
    onLoadPreset
}) => {
    // Local State for Long Press Interactions
    const [activeLongPressId, setActiveLongPressId] = useState(null);
    const [multiAddCount, setMultiAddCount] = useState(1);
    const longPressTimerRef = useRef(null);

    // Handlers
    const handleTouchStart = (e, id) => {
        // Clear any existing timer
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

        longPressTimerRef.current = setTimeout(() => {
            setActiveLongPressId(id);
            setMultiAddCount(1); // Reset counter on open
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
        }, 500); // 500ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchMove = () => {
        // Cancel if moving (scrolling)
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // Mouse handlers for testing on desktop (optional but good for consistency/hybrid devices)
    const handleMouseDown = (e, id) => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
            setActiveLongPressId(id);
            setMultiAddCount(1);
        }, 500);
    };

    const handleMouseUp = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-96 max-w-full bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add Card</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
                {/* Search Input */}
                <div className="relative mb-6">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Scryfall..."
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        autoFocus
                    />
                    <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
                </div>

                {/* Add Card Preview / Results */}
                {isSearching ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                        {searchResults.map((name) => (
                            <button
                                key={name}
                                onClick={() => onSelectSearchResult(name)}
                                className="w-full text-left p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 transition-colors"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                ) : previewCard ? (
                    <div className="flex flex-col h-full space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="relative flex-1 bg-black rounded-xl overflow-hidden shadow-2xl ring-2 ring-blue-500/50">
                            {(previewCard.image_normal || previewCard.image_uris?.normal) ? (
                                <img alt="Ouroboroid" className="w-full h-full object-cover" src={previewCard.image_normal || previewCard.image_uris?.normal} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">No Image</div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onAddCard(previewCard)}
                                className="col-span-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all"
                            >
                                Add to Battlefield
                            </button>
                            <button
                                onClick={() => onAddToRecents(previewCard)}
                                className="py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg font-medium transition-all"
                            >
                                Track Only
                            </button>
                            <button
                                onClick={() => { setPreviewCard(null); setSearchQuery(''); }}
                                className="py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg font-medium transition-all"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Quick Add Land */}
                        <button
                            onClick={() => onAddCard({
                                name: 'Land',
                                type: 'Land',
                                type_line: 'Land',
                                isPlaceholderLand: true,
                                colors: []
                            })}
                            className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all flex items-center justify-center gap-2 border border-slate-600"
                        >
                            <Plus size={18} className="text-gray-400" />
                            <span>Add Placeholder Land</span>
                        </button>

                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recent / Common</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {recentCards.map((c, i) => {
                                const isMenuOpen = activeLongPressId === i;
                                const uniqueKey = `${c.name}-${i}`;

                                return (
                                    <div
                                        key={uniqueKey}
                                        className="group relative aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 transition-all bg-slate-800 touch-none select-none"
                                        style={{
                                            transform: isMenuOpen ? 'scale(0.95)' : 'scale(1)',
                                            zIndex: isMenuOpen ? 20 : 1
                                        }}
                                        onTouchStart={(e) => handleTouchStart(e, i)}
                                        onTouchEnd={handleTouchEnd}
                                        onTouchMove={handleTouchMove}
                                        onMouseDown={(e) => handleMouseDown(e, i)}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                        onClick={(e) => {
                                            // Handle click only if menu NOT open and NOT a long press
                                            if (!isMenuOpen) {
                                                onAddCard(c);
                                            }
                                        }}
                                        onContextMenu={(e) => e.preventDefault()} // Prevent native context menu
                                    >
                                        {/* Background Image */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            {(c.image_normal || c.image_uris?.normal || c.art_crop || c.image_uris?.art_crop) ? (
                                                <img
                                                    src={c.image_normal || c.image_uris?.normal || c.art_crop || c.image_uris?.art_crop}
                                                    alt={c.name}
                                                    className="w-full h-full object-cover transition-all duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 p-2 text-center text-[10px] font-bold">
                                                    {c.name}
                                                </div>
                                            )}
                                        </div>

                                        {/* Context Menu Overlay */}
                                        {isMenuOpen && (
                                            <div
                                                className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-2 gap-3 animate-in fade-in duration-200"
                                                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                                            >
                                                {/* Add Multiple Controls */}
                                                <div className="flex items-center gap-2 w-full justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMultiAddCount(prev => Math.max(1, prev - 1));
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded-full hover:bg-slate-600 text-white font-bold"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-white font-mono text-lg w-6 text-center">{multiAddCount}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMultiAddCount(prev => prev + 1);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded-full hover:bg-slate-600 text-white font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Pass count to onAddCard for batch addition
                                                        onAddCard(c, multiAddCount);
                                                        setActiveLongPressId(null);
                                                        setMultiAddCount(1);
                                                    }}
                                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs border border-blue-400 shadow-lg active:scale-95 transition-all"
                                                >
                                                    Add {multiAddCount}
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteRecent(i);
                                                        setActiveLongPressId(null);
                                                    }}
                                                    className="w-full py-2 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-lg font-bold text-xs border border-red-900/50 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Trash2 size={14} /> Remove
                                                </button>

                                                {/* Close Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveLongPressId(null);
                                                        setMultiAddCount(1);
                                                    }}
                                                    className="absolute top-1 right-1 p-1 text-gray-400 hover:text-white"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {recentCards.length === 0 && (
                                <div className="col-span-2 text-center text-gray-600 text-sm py-8 border-2 border-dashed border-slate-700 rounded-lg">
                                    No recent cards
                                </div>
                            )}
                        </div>

                        {/* Presets Section */}
                        <div className="pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Presets</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(presets).map(([presetName, preset]) => (
                                    <button
                                        key={presetName}
                                        onClick={() => onLoadPreset(presetName)}
                                        disabled={loadingPreset !== null}
                                        className="group relative aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 hover:ring-blue-500/50 hover:shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer bg-slate-800 text-left disabled:opacity-50"
                                    >
                                        {/* Background Image / Art */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            {preset.image ? (
                                                <img
                                                    src={preset.image}
                                                    alt={presetName}
                                                    className="w-full h-full object-cover group-hover:opacity-100 transition-all duration-300 opacity-80"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 p-2 text-center">
                                                    <span className="text-[10px] font-bold opacity-20 uppercase">Preset</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-90 transition-opacity pointer-events-none" />

                                        {/* Content */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none flex flex-col gap-1">
                                            <div className="text-white font-bold text-[10px] md:text-sm leading-tight drop-shadow-md line-clamp-2">
                                                {presetName}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-md">
                                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                                                        {preset.cards?.length || 0} Cards
                                                    </span>
                                                </div>
                                                {loadingPreset === presetName && (
                                                    <div className="animate-spin h-2 w-2 border-b-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="absolute top-2 right-2 p-1.5 bg-blue-600/40 text-blue-200 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md">
                                            <Plus size={12} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddCardPanel;
