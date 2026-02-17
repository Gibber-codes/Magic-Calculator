import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Search, Trash2, ChevronDown, Heart, History, Camera, ArrowLeft } from 'lucide-react';
import { getScryfallCard, formatScryfallCard, fetchRelatedTokens } from '../utils/scryfallService';
import { saveFavorite, removeFavorite, isFavorite, canAddFavorite } from '../utils/favorites';
import HeartIcon from './HeartIcon';
import FavoritesTab from './FavoritesTab';
import { toast } from 'react-hot-toast';
import ScannerButton from './Scanner/ScannerButton';

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
    onOpenScanner
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
    const inputRef = useRef(null);

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

    // Reset state when panel opens/closes
    useEffect(() => {
        if (!isOpen) {
            setIsInputFocused(false);
            setSearchQuery('');
            setPreviewCard(null);
            // Optional: reset to search tab so it starts fresh at recents
            setActiveTab('search');
        }
    }, [isOpen, setSearchQuery, setPreviewCard]);


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
                    ${isInputFocused || activeTab === 'favorites' ? 'top-0' : 'bottom-0'}
                    bg-slate-900/60 backdrop-blur-xl 
                    border-t border-white/10 
                    shadow-2xl z-[80] 
                    flex flex-col 
                    transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
                    ${isInputFocused || activeTab === 'favorites' ? 'rounded-b-3xl' : 'rounded-t-3xl'} overflow-hidden
                    ${isInputFocused || activeTab === 'favorites' ? 'h-screen' : 'h-[35vh]'}
                `}
            >
                {/* Content Wrapper - Responsive Height */}
                <div className={`flex flex-col w-full ${isInputFocused || activeTab === 'favorites' ? 'flex-1' : (searchResults.length > 0 ? 'max-h-[60vh] h-[60vh]' : 'max-h-[35vh]')}`}>

                    {/* Top Bar: Tabs & Close */}
                    <div className="flex items-center justify-between gap-3 px-4 pt-4 shrink-0">
                        {isInputFocused ? (
                            /* Active Search Bar - Replaces Tabs */
                            <div className="relative flex flex-1 items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md h-[46px] animate-in fade-in duration-200">
                                <button
                                    onClick={() => {
                                        setIsInputFocused(false);
                                        setSearchQuery('');
                                    }}
                                    className="p-3 text-white/40 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name..."
                                    className="flex-1 bg-transparent border-none text-white placeholder-white/30 px-2 focus:ring-0 focus:outline-none text-base font-medium h-full"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-3 text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Navigation Buttons Row */
                            <div className="flex flex-1 gap-2">
                                <button
                                    onClick={() => {
                                        setActiveTab('search');
                                        setIsInputFocused(true);
                                        setTimeout(() => inputRef.current?.focus(), 50);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                                >
                                    <Search size={16} />
                                    <span>Search</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('favorites')}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                                >
                                    <Heart size={16} />
                                    <span>Favorites</span>
                                </button>
                                <button
                                    onClick={onOpenScanner}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 text-sm font-bold transition-all"
                                >
                                    <Camera size={16} />
                                    <span>Scan</span>
                                </button>
                            </div>
                        )}

                        {/* Top-Right Close/Minimize Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (isInputFocused || activeTab === 'favorites') {
                                        setIsInputFocused(false);
                                        setActiveTab('search');
                                        setSearchQuery('');
                                        setPreviewCard(null);
                                    } else {
                                        onClose();
                                    }
                                }}
                                className="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/5 transition-all"
                                title={isInputFocused || activeTab === 'favorites' ? "Minimize" : "Close"}
                            >
                                {isInputFocused || activeTab === 'favorites' ? <ChevronDown size={20} /> : <X size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 overflow-y-auto overflow-x-auto px-6 pt-4 pb-4`}>

                        {/* SEARCH TAB CONTENT */}
                        {activeTab === 'search' && (
                            <div className="flex flex-col gap-4 min-h-full">

                                <div className={`${(!isSearching && searchResults.length > 0) ? 'grid grid-cols-2 gap-3 pb-20' : 'flex flex-row flex-1 items-center gap-4 min-w-min'}`}>

                                    {/* Loading State */}
                                    {isSearching && (
                                        <div className="flex items-center justify-center w-full min-w-[300px] h-32 text-blue-400">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-currentColor"></div>
                                        </div>
                                    )}

                                    {/* Search Results */}
                                    {!isSearching && searchResults.length > 0 && (
                                        <>
                                            {searchResults.map((name) => (
                                                <button
                                                    key={name}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        onSelectSearchResult(name);
                                                        setIsInputFocused(false);
                                                        document.activeElement?.blur();
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

                                    {/* Recent Cards (Default View) */}
                                    {!isSearching && !previewCard && searchResults.length === 0 && !isInputFocused && (
                                        <>
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

                                            {/* Hint when empty */}
                                            {recentCards.length === 0 && (
                                                <div className="w-full h-32 flex flex-col items-center justify-center text-white/30 border border-white/5 rounded-2xl bg-white/5">
                                                    <History size={24} className="mb-2 opacity-50" />
                                                    <span className="text-sm">Recently added cards will appear here</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Card Preview (Nested here or separate? Keeping logical flow) */}
                                    {/* Actually, PreviewCard logic was high up. Let's ensure it's handled. */}
                                    {/* If previewCard is set, we probably want to show it regardless of tab? Or only in Search? */}
                                    {/* In original code, previewCard hid everything else. Let's keep that behavior but within the tab content if generated from search */}
                                    {!isSearching && previewCard && (
                                        <div className="shrink-0 h-full flex gap-4 animate-in fade-in zoom-in duration-300 w-full justify-center">
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

                                    {/* Spacer for right padding */}
                                    <div className="w-2 shrink-0" />
                                </div>
                            </div>
                        )}

                        {/* FAVORITES TAB CONTENT */}
                        {activeTab === 'favorites' && (
                            <FavoritesTab onAddCard={(card) => {
                                onAddCard(card);
                                toast.success(`Added ${card.name}`);
                            }} />
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
