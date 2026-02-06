import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Search, Trash2, ChevronDown, Heart, History } from 'lucide-react';
import { getScryfallCard, formatScryfallCard, fetchRelatedTokens } from '../utils/scryfallService';
import { saveFavorite, removeFavorite, isFavorite, canAddFavorite } from '../utils/favorites';
import HeartIcon from './HeartIcon';
import FavoritesTab from './FavoritesTab';
import { toast } from 'react-hot-toast';

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

    // State for bottom sheet expansion
    const [isExpanded, setIsExpanded] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [previewingSearchCard, setPreviewingSearchCard] = useState(null);
    const searchLongPressTimerRef = useRef(null);

    // Tab State
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'favorites'

    // Limit Modal State
    const [showLimitModal, setShowLimitModal] = useState(false);

    // Expand when search activates or results appear
    useEffect(() => {
        if (isSearching || searchResults.length > 0 || previewCard) {
            setIsExpanded(true);
        }
    }, [isSearching, searchResults, previewCard]);

    // Reset input focus state when panel closes
    useEffect(() => {
        if (!isOpen) {
            setIsInputFocused(false);
        }
    }, [isOpen]);


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

    // Search result long-press handlers
    const handleSearchTouchStart = (e, cardName) => {
        if (searchLongPressTimerRef.current) clearTimeout(searchLongPressTimerRef.current);

        searchLongPressTimerRef.current = setTimeout(async () => {
            try {
                const fetchedCardData = await getScryfallCard(cardName);
                const formatted = formatScryfallCard(fetchedCardData);

                // Fetch related tokens
                if (fetchedCardData.all_parts) {
                    const tokens = await fetchRelatedTokens(fetchedCardData);
                    formatted.relatedTokens = tokens;
                }

                setPreviewingSearchCard(formatted);
                if (navigator.vibrate) navigator.vibrate(50);
            } catch (e) {
                console.error('Failed to fetch card for preview:', e);
            }
        }, 500);
    };

    const handleSearchTouchEnd = () => {
        if (searchLongPressTimerRef.current) {
            clearTimeout(searchLongPressTimerRef.current);
            searchLongPressTimerRef.current = null;
        }
    };

    const handleSearchTouchMove = () => {
        if (searchLongPressTimerRef.current) {
            clearTimeout(searchLongPressTimerRef.current);
            searchLongPressTimerRef.current = null;
        }
    };

    // Favorites Handlers
    const handleToggleFavorite = (e, card) => {
        e.stopPropagation();
        const cardId = card.id || card.oracle_id || card.name;

        if (isFavorite(cardId)) {
            removeFavorite(cardId);
            toast.success("Removed from Favorites");
        } else {
            if (canAddFavorite()) {
                const result = saveFavorite({ ...card, id: cardId });
                if (result.success) {
                    toast.success("Added to Favorites");
                } else if (result.reason === 'limit_reached') {
                    setShowLimitModal(true);
                } else if (result.reason === 'already_exists') {
                    toast('Already in favorites', { icon: 'ℹ️' });
                }
            } else {
                setShowLimitModal(true);
            }
        }
        // Force update to refresh heart icons immediately
        setMultiAddCount(prev => prev);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop to close on click outside - elevated z-index to be above battlefield cards */}
            <div
                className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]"
                onClick={(e) => {
                    console.log('AddCardPanel backdrop clicked');
                    onClose();
                }}
            />

            {/* Bottom Sheet Panel */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`
                    add-card-panel
                    fixed left-0 right-0 
                    ${isInputFocused ? 'top-0' : 'bottom-0'}
                    bg-slate-900/60 backdrop-blur-xl 
                    border-t border-white/10 
                    shadow-2xl z-[80] 
                    flex flex-col 
                    transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
                    ${isInputFocused ? 'rounded-b-3xl' : 'rounded-t-3xl'} overflow-hidden
                    ${isInputFocused ? 'h-screen' : 'h-[35vh]'}
                `}
            >
                {/* Content Wrapper - Fixed Height */}
                <div className={`flex flex-col w-full ${searchResults.length > 0 || activeTab === 'favorites' ? 'max-h-[60vh] h-[60vh]' : 'max-h-[35vh]'}`}>

                    {/* Top Bar: Search Input & Tabs */}
                    <div className="flex flex-col gap-3 px-4 pt-4 shrink-0">
                        {/* Search Bar Row */}
                        <div
                            className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shrink-0 h-14"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Search className="ml-4 text-white/50" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (activeTab !== 'search') setActiveTab('search');
                                }}
                                onFocus={() => {
                                    setIsInputFocused(true);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Search cards..."
                                className="flex-1 bg-transparent border-none text-white placeholder-white/30 px-4 py-3 focus:ring-0 focus:outline-none text-lg font-medium"
                            />

                            {/* Favorites Toggle Button - Always on the right of input */}
                            <button
                                onClick={() => setActiveTab(activeTab === 'favorites' ? 'search' : 'favorites')}
                                className={`
                                    p-3 flex items-center justify-center transition-all
                                    ${activeTab === 'favorites' ? 'text-pink-500 bg-pink-500/10' : 'text-white/40 hover:text-white'}
                                `}
                                title="Favorites"
                            >
                                <Heart size={22} className={activeTab === 'favorites' ? 'fill-current' : ''} />
                            </button>

                            <button
                                onClick={() => {
                                    if (isInputFocused) {
                                        setIsInputFocused(false);
                                        setSearchQuery('');
                                        setPreviewCard(null);
                                    } else {
                                        onClose();
                                    }
                                }}
                                className="p-2 mr-2 text-white/60 hover:text-white transition-colors"
                                title={isInputFocused ? "Minimize" : "Close"}
                            >
                                {isInputFocused ? <ChevronDown size={20} /> : <X size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 overflow-y-auto overflow-x-auto px-6 pt-4 pb-4`}>

                        {/* FAVORITES TAB CONTENT */}
                        {activeTab === 'favorites' && (
                            <FavoritesTab onAddCard={(card) => {
                                onAddCard(card);
                                toast.success(`Added ${card.name}`);
                            }} />
                        )}

                        {/* SEARCH TAB CONTENT */}
                        {activeTab === 'search' && (
                            <div className={`${(!isSearching && searchResults.length > 0) ? 'grid grid-cols-2 gap-3 pb-20' : 'flex flex-row h-full items-center gap-4 min-w-min'}`}>

                                {/* Loading State */}
                                {isSearching && (
                                    <div className="flex items-center justify-center w-full min-w-[300px] h-64 text-blue-400">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-currentColor"></div>
                                    </div>
                                )}

                                {/* Search Results - Compact Grid */}
                                {!isSearching && searchResults.length > 0 && (
                                    <>
                                        {searchResults.map((name) => (
                                            <button
                                                key={name}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    onSelectSearchResult(name);
                                                    document.activeElement.blur();
                                                }}
                                                onTouchStart={(e) => handleSearchTouchStart(e, name)}
                                                onTouchEnd={handleSearchTouchEnd}
                                                onTouchMove={handleSearchTouchMove}
                                                onContextMenu={(e) => e.preventDefault()}
                                                className="
                                                group relative w-full
                                                bg-slate-800/50 border border-white/5
                                                hover:bg-slate-700/50 hover:border-blue-500/30
                                                rounded-xl overflow-hidden
                                                transition-all duration-200
                                                p-4 text-left flex items-center
                                            "
                                            >
                                                <span className="font-medium text-white/90 text-sm group-hover:text-blue-300 transition-colors line-clamp-2">
                                                    {name}
                                                </span>
                                            </button>
                                        ))}
                                    </>
                                )}

                                {/* Card Preview / Actions */}
                                {!isSearching && previewCard && (
                                    <div className="shrink-0 h-full flex gap-4 animate-in fade-in zoom-in duration-300">
                                        <div className="relative shrink-0 w-32 h-44 group z-20">
                                            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                                                <img
                                                    src={previewCard.image_normal || previewCard.image_uris?.normal}
                                                    alt={previewCard.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute top-2 right-2 z-[100]">
                                                <HeartIcon
                                                    filled={isFavorite(previewCard.id || previewCard.oracle_id || previewCard.name)}
                                                    onClick={(e) => handleToggleFavorite(e, previewCard)}
                                                    className="w-9 h-9 shadow-2xl"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center gap-3 w-[200px]">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        onAddCard(previewCard);
                                                        setPreviewCard(null);
                                                        setSearchQuery('');
                                                        setIsInputFocused(false);
                                                    }}
                                                    className="flex-1 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-95"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={(e) => handleToggleFavorite(e, previewCard)}
                                                    className={`
                                                         w-14 items-center justify-center flex rounded-xl border transition-all
                                                         ${isFavorite(previewCard.id || previewCard.oracle_id || previewCard.name)
                                                            ? 'bg-pink-600/20 border-pink-500 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                                                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                        }
                                                     `}
                                                    title="Toggle Favorite"
                                                >
                                                    <Heart size={20} className={isFavorite(previewCard.id || previewCard.oracle_id || previewCard.name) ? 'fill-current' : ''} />
                                                </button>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onAddToRecents(previewCard)}
                                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/80 font-medium rounded-xl border border-white/5 transition-all"
                                                >
                                                    Track
                                                </button>
                                                <button
                                                    onClick={() => { setPreviewCard(null); setSearchQuery(''); }}
                                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/5 transition-all"
                                                >
                                                    Back
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Recent Cards & Presets (Default View when not searching/previewing) */}
                                {!isSearching && !previewCard && searchResults.length === 0 && (
                                    <>
                                        {/* Recent Cards */}
                                        {recentCards.map((c, i) => (
                                            <div
                                                key={`${c.name}-${i}`}
                                                className="relative shrink-0 w-32 h-44 group"
                                                onTouchStart={(e) => handleTouchStart(e, i)}
                                                onTouchEnd={handleTouchEnd}
                                                onContextMenu={(e) => e.preventDefault()}
                                            >
                                                <div
                                                    className={`
                                                    absolute inset-0 rounded-2xl overflow-hidden shadow-lg 
                                                    transition-all duration-300
                                                    ${activeLongPressId === i ? 'scale-95 ring-2 ring-blue-500' : 'hover:scale-105 active:scale-95'}
                                                `}
                                                    onClick={() => {
                                                        if (activeLongPressId !== i) {
                                                            onAddCard(c);
                                                            setIsInputFocused(false);
                                                        }
                                                    }}
                                                >
                                                    <img
                                                        src={c.image_normal || c.image_uris?.normal || c.art_crop}
                                                        alt={c.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <div className="absolute top-2 right-2 z-[100]">
                                                    <HeartIcon
                                                        filled={isFavorite(c.id || c.oracle_id || c.name)}
                                                        onClick={(e) => handleToggleFavorite(e, c)}
                                                        className="w-9 h-9 shadow-2xl"
                                                    />
                                                </div>

                                                {/* Context Menu (Long Press) */}
                                                {activeLongPressId === i && (
                                                    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setMultiAddCount(Math.max(1, multiAddCount - 1)); }}
                                                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xl font-bold"
                                                            >-</button>
                                                            <span className="text-2xl font-bold text-white font-mono">{multiAddCount}</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setMultiAddCount(multiAddCount + 1); }}
                                                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xl font-bold"
                                                            >+</button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAddCard(c, multiAddCount);
                                                                setActiveLongPressId(null);
                                                                setMultiAddCount(1);
                                                                setIsInputFocused(false);
                                                            }}
                                                            className="w-full py-2 bg-blue-600 rounded-lg text-white font-bold text-sm"
                                                        >
                                                            Add {multiAddCount}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDeleteRecent(i); setActiveLongPressId(null); }}
                                                            className="w-full py-2 bg-red-500/20 text-red-300 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Presets Divider */}
                                        <div className="w-[1px] h-32 bg-white/10 mx-2 shrink-0 my-auto" />

                                        {/* Presets */}
                                        {Object.entries(presets).map(([presetName, preset]) => (
                                            <button
                                                key={presetName}
                                                onClick={() => onLoadPreset(presetName)}
                                                disabled={loadingPreset !== null}
                                                className="
                                                relative shrink-0 w-32 h-44
                                                rounded-2xl overflow-hidden 
                                                hover:ring-2 hover:ring-purple-500/50 
                                                transition-all group shadow-lg
                                            "
                                            >
                                                <img
                                                    src={preset.image || 'https://cards.scryfall.io/art_crop/front/7/d/7dea1d30-bf8f-4ba6-993d-4c326e85a73e.jpg?1562919927'}
                                                    alt={presetName}
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-transparent to-transparent" />
                                                <div className="absolute bottom-3 left-3 right-3 text-left">
                                                    <div className="text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-0.5">Preset</div>
                                                    <div className="text-white font-bold text-base leading-tight mb-1">{presetName}</div>
                                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-md">
                                                        <span className="text-[10px] font-mono text-white/90">{preset.cards?.length} Cards</span>
                                                    </div>
                                                </div>
                                                {loadingPreset === presetName && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                        <div className="animate-spin h-8 w-8 border-2 border-purple-500 rounded-full border-t-transparent"></div>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </>
                                )}

                                {/* Spacer for right padding */}
                                <div className="w-2 shrink-0" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Result Preview Overlay */}
            {previewingSearchCard && (
                <div
                    className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        setPreviewingSearchCard(null);
                    }}
                >
                    <div className="relative w-72 h-[25rem] mb-8 shrink-0 z-20">
                        <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] ring-2 ring-white/20">
                            <img
                                src={previewingSearchCard.image_normal || previewingSearchCard.image_uris?.normal}
                                alt={previewingSearchCard.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute top-4 right-4 z-[100]">
                            <HeartIcon
                                filled={isFavorite(previewingSearchCard.id || previewingSearchCard.oracle_id || previewingSearchCard.name)}
                                onClick={(e) => handleToggleFavorite(e, previewingSearchCard)}
                                className="w-14 h-14"
                            />
                        </div>
                    </div>

                    {/* Related Tokens */}
                    {previewingSearchCard.relatedTokens && previewingSearchCard.relatedTokens.length > 0 && (
                        <div className="w-full max-w-sm shrink-0">
                            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3 pl-1">Tokens created</h3>
                            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
                                {previewingSearchCard.relatedTokens.map((token, i) => (
                                    <div key={i} className="shrink-0 w-32 aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-lg border border-white/10 snap-center">
                                        <img
                                            src={token.image_normal || token.image_uris?.normal}
                                            alt={token.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Limit Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart size={32} className="fill-current" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Favorites Full</h3>
                        <p className="text-gray-400 mb-6">
                            You have reached the limit of 30 favorite cards. Please remove some before adding more.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowLimitModal(false);
                                    setActiveTab('favorites');
                                }}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                            >
                                Manage
                            </button>
                            <button
                                onClick={() => setShowLimitModal(false)}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddCardPanel;
