import React from 'react';
import { X, Plus, Search } from 'lucide-react';

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
    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
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
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recent / Common</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {recentCards.map((c, i) => (
                                <div key={i} className="flex gap-1 group">
                                    <button
                                        onClick={() => onAddCard(c)}
                                        className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-center text-gray-300 truncate transition-colors"
                                    >
                                        {c.name}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteRecent(i); }}
                                        className="p-2 bg-slate-800 text-gray-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove from history"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {recentCards.length === 0 && (
                                <div className="col-span-2 text-center text-gray-600 text-sm py-8 border-2 border-dashed border-slate-700 rounded-lg">
                                    No recent cards
                                </div>
                            )}
                        </div>

                        {/* Presets Section */}
                        <div className="pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Presets</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.keys(presets).map(presetName => (
                                    <button
                                        key={presetName}
                                        onClick={() => onLoadPreset(presetName)}
                                        disabled={loadingPreset !== null}
                                        className="w-full p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs text-left text-gray-300 flex justify-between items-center group transition-all"
                                    >
                                        <span>{presetName}</span>
                                        {loadingPreset === presetName ? (
                                            <div className="animate-spin h-3 w-3 border-b-2 border-white rounded-full"></div>
                                        ) : (
                                            <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                        )}
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
