import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import {
    X, Plus, Minus, Copy, Trash2, RotateCcw,
    History, Zap, Skull, Mountain, Hexagon, Sparkles, Ghost, User, Ban, Sword, ArrowLeft, ArrowRight, Play, CheckCircle, Search, ShieldOff,
    Menu, ChevronLeft, ChevronRight, Link as LinkIcon
} from 'lucide-react';

// Config
import { CARD_WIDTH, CARD_HEIGHT, CARD_GAP, APP_VERSION } from '../config/constants';

// Load card data from consolidated JSON file
import cardData from '../data/scryfall_cards.json';

import GameEngine from '../utils/gameEngine';
import { TopBanner, ArtWindow, BottomBanner, PowerToughnessBanner } from '../components/RedesignedCardFrame';
import { formatBigNumber } from '../utils/formatters';
import { getModeConfig } from '../utils/modeConfig';
import { getCardAbilities, extractActivatedAbilities, extractEffects, parseOracleText } from '../utils/keywordParser';
import {
    getTypeFromTypeLine, isCreature, isLand, createBattlefieldCard, isPlaceholderLand,
    isMinimalDisplayLand, BASIC_LAND_COLORS, calculateCardStats, sortBattlefieldCards,
    calculateEffectiveTotal
} from '../utils/cardUtils';

import { searchScryfall, getScryfallCard, formatScryfallCard, fetchRelatedTokens } from '../utils/scryfallService';
import { SIGNATURE_DATA } from '../data/signatureCards';
import LIFOStack from '../components/LIFOStack';
import AddCardPanel from '../components/AddCardPanel';
import HistoryPanel from '../components/HistoryPanel';

import PhaseTracker from '../components/PhaseTracker';
import BattlefieldCard from '../components/BattlefieldCard';
import BattlefieldList from '../components/BattlefieldList';
import CalculationMenu from '../components/CalculationMenu';
import SelectionMenu from '../components/SelectionMenu';
import BottomControlPanel from '../components/BottomControlPanel';
import MoreOptionsPanel from '../components/MoreOptionsPanel';
import CombatSummaryPanel from '../components/CombatSummaryPanel';
import RightDock from '../components/RightDock';
import DockCardDetail from '../components/DockCardDetail';
import DockTargetingPanel from '../components/DockTargetingPanel';
import StackStrip from '../components/StackStrip';
import DockStackList from '../components/DockStackList';
import BottomBar from '../components/BottomBar';
import WelcomeScreen from '../components/WelcomeScreen';
import AdBanner from '../components/AdBanner';
import ScannerButton from '../components/Scanner/ScannerButton';

// Lazy-loaded: pulls react-webcam + scanner UI out of the initial bundle.
// tesseract.js / fuse.js are already dynamically imported inside the modal.
const ScannerModal = lazy(() => import('../components/Scanner/ScannerModal'));
import XCostModal from '../components/XCostModal';

import useGameState from '../hooks/useGameState';
import useTargetingMode from '../hooks/useTargetingMode';
import usePhaseHandlers from '../hooks/usePhaseHandlers';
import useCardActions from '../hooks/useCardActions';
import useTargetingConfirm from '../hooks/useTargetingConfirm';
import useSearch from '../hooks/useSearch';
import { useBattlefieldLayout } from '../hooks/useBattlefieldLayout';
import { useScanner } from '../hooks/useScanner';
import useZoneView from '../hooks/useZoneView';

// Constants imported from config/constants.js
// PRESETS imported from config/presets.js
// getModeConfig imported from utils/modeConfig.js

// --- Helper Functions ---

// --- Helper Functions moved to utils/cardUtils.js ---




// --- Main Layout ---

const Game = () => {
    // --- Game State (from hook) ---
    const gameState = useGameState();
    const {
        cards, setCards,
        history, actionLog,
        currentPhase, setCurrentPhase,
        currentCombatStep, setCurrentCombatStep,
        activeZone, setActiveZone, zoneCounts, turnNumber,
        abilityStack, setAbilityStack, isStackCollapsed, setIsStackCollapsed,
        gameEngineRef,
        logAction, saveHistoryState, undo, redo, future,
        handlePhaseChange: baseHandlePhaseChange, advanceCombatStep: baseAdvanceCombatStep,
        advancePhase: baseAdvancePhase, endTurn,
        addToStack, resolveStackAbility, removeFromStack, resolveAllStack, clearStack,
        PHASE_ORDER, COMBAT_STEPS
    } = gameState;

    // --- Targeting Mode (from hook) ---
    const targeting = useTargetingMode(gameState);
    const {
        targetingMode, setTargetingMode,
        startTargetingMode, cancelTargeting,
        handleZoneSelection, handleTargetSelection,
        handleMultiSelect: baseHandleMultiSelect,
        handleToggleSelectAll,
        updateStackSelection, setSliderStackKey, handleConfirmAttackers
    } = targeting;

    // --- Zone View (stack auto-force + pin) ---
    const { pinned: zonePinned, toast: zoneToast, handleBlockedSwitch } = useZoneView({
        abilityStack,
        cards,
        activeZone,
        setActiveZone,
        targetingActive: targetingMode.active
    });

    // --- Local UI State ---
    const [selectedCard, setSelectedCard] = useState(null);
    const [recentCards, setRecentCards] = useState([]);
    const [activePanel, setActivePanel] = useState(null);

    // Search State
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [previewCard, setPreviewCard] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showCalculationMenu, setShowCalculationMenu] = useState(false);
    // Landscape: whether the trigger stack is expanded into the dock
    const [isStackExpanded, setIsStackExpanded] = useState(false);
    const [autoMode, setAutoMode] = useState(true); // Auto Calculation Mode State (Default: True)
    const [hasEndStepActions, setHasEndStepActions] = useState(false); // Track if cleanup is needed

    const battlefieldRef = useRef(null);
    const dragRef = useRef({ startX: 0, startY: 0, initialScrollX: 0, initialOffsetY: 0, axis: null, rowType: null });
    const [creatureScrollX, setCreatureScrollX] = useState(0);
    const [othersScrollX, setOthersScrollX] = useState(0);
    const [landsScrollX, setLandsScrollX] = useState(0);
    const [verticalOffsetY, setVerticalOffsetY] = useState(0);
    // Track window size to force re-calc of layout on resize (fixes stale visual positions)
    const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 0, height: typeof window !== 'undefined' ? window.innerHeight : 0 });
    // Landscape two-column layout (battlefield + dock). Portrait keeps the legacy layout.
    const isLandscape = windowSize.width > windowSize.height && windowSize.width >= 640;
    // Very narrow landscape (e.g. iPhone SE, 667×375): the dock becomes a
    // slide-over above the battlefield instead of claiming column width.
    const isCompactLandscape = isLandscape && windowSize.width < 740;
    const BOTTOM_BAR_HEIGHT = 0; // Floating UI now
    const TOP_BAR_HEIGHT = 0;   // Floating UI now

    // --- Onboarding & Updates Logic ---
    const [showWelcome, setShowWelcome] = useState(false);
    const [hasUnreadUpdate, setHasUnreadUpdate] = useState(false);

    useEffect(() => {
        // Check for first-time welcome
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setShowWelcome(true);
        }

        // Check for updates (Badge Logic)
        const lastSeenVersion = localStorage.getItem('lastSeenVersion');
        if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
            setHasUnreadUpdate(true);
        }
    }, []);

    const handleClearUpdateBadge = () => {
        setHasUnreadUpdate(false);
        localStorage.setItem('lastSeenVersion', APP_VERSION);
    };

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initial centering - place "Others" row at comfortable position on mount/resize
    useEffect(() => {
        if (battlefieldRef.current) {
            const containerHeight = window.innerHeight; // Use window height directly for consistency
            const usableHeight = containerHeight - BOTTOM_BAR_HEIGHT - TOP_BAR_HEIGHT;
            // CenterY should be LOCAL to the container (which starts after Top Bar)
            const centerY = usableHeight / 2;

            // Dynamic spread based on available height
            // Card height is 200px. We need >210px gap to avoid overlap.
            const baseSpread = 250;
            const scaleFactor = Math.min(1, usableHeight / 900);
            const spread = Math.max(220, baseSpread * scaleFactor); // Min 220px to clear cards

            // For "Others" row to be centered visually:
            // The row's center line should be at TARGET_Y + (CARD_HEIGHT/2).
            // Or simply align the center line with the visual center.
            // Let's align center-to-center.

            const othersBaseY = centerY;
            // TARGET_CENTER_Y should be centerY to align the middle row (Others) to the middle of the screen
            const TARGET_CENTER_Y = centerY;

            setVerticalOffsetY(TARGET_CENTER_Y - othersBaseY);
        }
    }, []); // Run once on mount

    // --- Logic ---

    // Filter Cards for View - Unified Battlefield
    // Exclude attached cards from main grid
    // --- Layout (from hook) ---
    const { visibleStacks, cardPositions } = useBattlefieldLayout({
        cards, activePanel, showSearchOverlay, creatureScrollX, othersScrollX, landsScrollX,
        verticalOffsetY, windowSize, battlefieldRef, abilityStack, targetingMode
    });

    // --- Phase Handlers (from hook) ---
    const {
        passingPhase,
        handlePhaseChange,
        handleSmartPhaseAdvance,
        handleStartTurn,
        advanceCombatStep,
        advancePhase,
        handleAutoCalculate
    } = usePhaseHandlers({
        gameState,
        targeting,
        cards,
        setCards,
        cardPositions,
        setHasEndStepActions
    });

    // Timer for delayed targeting
    const targetingTimerRef = useRef(null);

    // Effect: Auto-open targeting for top stack item if it requires targets
    // This prevents the "Resolve Twice" feel (Click Stack -> Click Overlay)
    // NOTE: Kept in App.jsx due to dependency on handleResolveWithTargeting
    useEffect(() => {
        // Clear any pending targeting triggers
        if (targetingTimerRef.current) {
            clearTimeout(targetingTimerRef.current);
            targetingTimerRef.current = null;
        }

        if (abilityStack.length > 0 && !targetingMode.active) {
            const topItem = abilityStack[abilityStack.length - 1];
            const abilityDef = topItem.triggerObj?.ability;

            if (abilityDef) {
                const explicitRequired = abilityDef.requiresTarget;
                const textHeuristic = abilityDef.target &&
                    typeof abilityDef.target === 'string' &&
                    (abilityDef.target.includes('target') || abilityDef.target.includes('another')) &&
                    !abilityDef.targetIds;

                if (explicitRequired || textHeuristic) {
                    // Delay targeting mode to allow stack animation (Flight + Reveal) to finish
                    targetingTimerRef.current = setTimeout(() => {
                        handleResolveWithTargeting(topItem);
                        targetingTimerRef.current = null;
                    }, 600);
                }
            }
        }

        return () => {
            if (targetingTimerRef.current) {
                clearTimeout(targetingTimerRef.current);
            }
        };
    }, [abilityStack, targetingMode.active]);

    // Effect: collapse the dock stack view when the stack empties
    useEffect(() => {
        if (abilityStack.length === 0 && isStackExpanded) {
            setIsStackExpanded(false);
        }
    }, [abilityStack.length, isStackExpanded]);

    // Effect: Auto-advance from Declare Attackers to Declare Blockers when stack clears
    useEffect(() => {
        // Only auto-advance if we are in 'Declare Attackers' AND stack is empty AND we are not currently targeting
        if (
            currentPhase === 'Combat' &&
            currentCombatStep === 'Declare Attackers' &&
            abilityStack.length === 0 &&
            !targetingMode.active
        ) {
            // Small delay to ensure users see the stack cleared
            const timer = setTimeout(() => {
                // Re-check conditions inside timeout to be safe
                if (currentCombatStep === 'Declare Attackers' && abilityStack.length === 0) {
                    logAction("Attack triggers resolved. Advancing to Blockers.");
                    advanceCombatStep();
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [currentPhase, currentCombatStep, abilityStack.length, targetingMode.active, advanceCombatStep, logAction]);

    // Wrap handleMultiSelect to pass visibleStacks
    const handleMultiSelect = (card) => {
        baseHandleMultiSelect(card, visibleStacks);
    };

    // --- End Actions ---

    // --- Card Actions (from hook) ---
    const {
        handleLandConversion,
        handleCardAction,
        handleAddCard,
        handleAddToRecents,
        handleDeleteRecent,
        handleLoadPreset,
        handleActivateAbility,
        pendingXCostSpell,
        castXSpell,
        cancelXSpell
    } = useCardActions({
        // Game State
        cards,
        setCards,
        gameEngineRef,
        logAction,
        saveHistoryState,
        addToStack,
        currentPhase,

        // UI State
        selectedCard,
        setSelectedCard,
        recentCards,
        setRecentCards,
        visibleStacks,
        setPreviewCard,
        setSearchQuery,
        setSearchResults,
        setShowSearchOverlay,
        setActivePanel,

        // Targeting
        setTargetingMode,
        startTargetingMode
    });

    // --- Search (from hook) ---
    const { handleSelectSearchResult } = useSearch({
        searchQuery,
        setSearchQuery,
        setSearchResults,
        setIsSearching,
        handleAddToRecents
    });

    // --- Targeting Confirm (from hook) ---
    const {
        handleResolveWithTargeting,
        isCardEligible,
        handleConfirmTargetingAction
    } = useTargetingConfirm({
        // Game State
        cards,
        setCards,
        gameEngineRef,
        logAction,
        addToStack,
        abilityStack,
        resolveStackAbility,
        recentCards,

        // Targeting
        targetingMode,
        setTargetingMode,
        startTargetingMode,
        cancelTargeting,
        handleConfirmAttackers,
        advanceCombatStep // Pass advance handler
    });

    // --- Scanner Logic ---
    const {
        isScannerOpen,
        openScanner,
        closeScanner,
        handleCardsConfirmed
    } = useScanner((scannedCards) => {
        scannedCards.forEach(card => {
            if (card) {
                handleAddToRecents(card);
            }
        });
        setActivePanel('add');
    });

    const handleOpenScanner = () => {
        setActivePanel(null);
        openScanner();
    };

    const handleCloseScanner = () => {
        closeScanner();
        setActivePanel('add');
    };

    // --- Render ---

    // Calculate Land Count for Badge
    const landCount = cards.filter(c => c.zone === 'battlefield' && isLand(c)).length;

    // Unified Battlefield List (excluding lands which are in side panel)
    const unfilteredBattlefieldCards = visibleStacks.filter(g => {
        // Basic filter: hide lands reserved for side panel
        if (isMinimalDisplayLand(g.leader)) return false;

        // Targeting filter: if targeting mode is active, only show eligible cards
        // Check if ANY card in the stack is eligible
        if (targetingMode.active) {
            const hasEligibleCard = g.cards.some(c => isCardEligible(c));
            if (!hasEligibleCard) return false;
        }

        return true;
    });

    const battlefieldCards = sortBattlefieldCards(unfilteredBattlefieldCards, cards);

    // Shared between SelectionMenu (portrait) and DockCardDetail (landscape)
    const selectedStackCards = selectedCard
        ? (visibleStacks.find(g => g.cards.some(c => c.id === selectedCard.id))?.cards || [selectedCard])
        : [];

    const handleSelectedCounterChange = (action, cardsToModify) => {
        if (!gameEngineRef.current) return;
        let updatedCards = [...cards];
        cardsToModify.forEach(cardToModify => {
            const result = gameEngineRef.current.processAction(action, cardToModify, updatedCards, recentCards);
            updatedCards = result.newCards;
        });
        saveHistoryState(updatedCards);
        if (selectedCard) {
            const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id);
            if (updatedSelectedCard) setSelectedCard(updatedSelectedCard);
        }
    };

    const handleActivateAbilityLogged = (card, ability) => {
        logAction(`Activated: ${ability.cost}`);
        handleActivateAbility(card, ability);
    };

    // --- Landscape chrome helpers ---
    const PHASE_DISPLAY_NAMES = { 'Beginning': 'Beginning', 'Main': 'Main 1', 'Combat': 'Combat', 'Main 2': 'Main 2', 'End': 'End' };
    const phaseLabel = currentPhase
        ? (currentPhase === 'Combat' && currentCombatStep ? currentCombatStep : PHASE_DISPLAY_NAMES[currentPhase] || currentPhase)
        : null;

    // Top-bar chevron: granular skip (combat steps inside Combat, phases otherwise)
    const handleChevronAdvance = () => {
        if (currentPhase === 'Combat') advanceCombatStep();
        else advancePhase();
    };

    const dockHasContent = targetingMode.active
        || (isStackExpanded && abilityStack.length > 0)
        || !!selectedCard
        || currentCombatStep === 'Combat Damage';

    const handleBgClick = (e) => {
        // Only close panels if the click was directly on the background container
        // If target !== currentTarget, it means the click was on a child element
        if (e.target !== e.currentTarget) {
            return;
        }

        // Close panels when clicking the background
        if (activePanel) {
            setActivePanel(null);
        } else if (!targetingMode.active && selectedCard) {
            // If no panel is open, clicking background deselects card
            setSelectedCard(null);
        }

        if (targetingMode.sliderStackKey) {
            setSliderStackKey(null);
        }
    };

    return (
        <div
            className="fixed inset-0 flex flex-col text-white overflow-hidden touch-auto battlefield-bg"
            style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                backgroundSize: '40px 40px',
                backgroundColor: '#0f172a'
            }}
        >
            {/* Top Bar: Navigation & Menu */}
            <div className="absolute top-0 left-0 w-full px-4 py-3 z-50 flex justify-between items-center pointer-events-none" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>

                {/* Left: Menu Button (+ turn/phase readout in landscape) */}
                <div className="pointer-events-auto flex items-center gap-3">
                    <button
                        onClick={() => setShowCalculationMenu(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-gray-300 active:scale-95 transition-all shadow-lg backdrop-blur-sm relative"
                    >
                        <Menu className="w-5 h-5" />
                        {hasUnreadUpdate && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 shadow-sm animate-pulse" />
                        )}
                    </button>
                    {isLandscape && (
                        <div className="text-sm font-bold text-gray-100 select-none whitespace-nowrap drop-shadow-md">
                            Turn {turnNumber}
                            {phaseLabel && <span className="text-gray-400 font-semibold"> · {phaseLabel}</span>}
                        </div>
                    )}
                </div>

                {/* Center: Title (compact in landscape — gameplay real estate wins) */}
                <h1 className={`font-bold drop-shadow-md select-none pointer-events-auto ${isLandscape ? 'text-sm text-gray-300' : 'text-lg text-white'}`}>
                    Magic Calculator
                </h1>

                {/* Right: phase chevrons (landscape) / undo-redo (portrait) */}
                {isLandscape ? (
                    <div className="pointer-events-auto flex gap-2">
                        {/* Phases only advance — the back chevron stays disabled (use Undo below) */}
                        <button
                            disabled
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-600/50 shadow-lg backdrop-blur-sm bg-slate-900/50 text-gray-600 cursor-not-allowed"
                            aria-label="Previous phase (unavailable)"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleChevronAdvance}
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-600/50 shadow-lg backdrop-blur-sm bg-slate-800/80 hover:bg-slate-700 text-gray-300 active:scale-95 transition-all"
                            aria-label="Next phase"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="pointer-events-auto flex gap-2">
                        {/* Back / Undo */}
                        <button
                            onClick={undo}
                            disabled={history.length === 0}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border border-slate-600/50 shadow-lg backdrop-blur-sm transition-all
              ${history.length > 0
                                    ? 'bg-slate-800/80 hover:bg-slate-700 text-gray-300 active:scale-95'
                                    : 'bg-slate-900/50 text-gray-600 cursor-not-allowed'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Forward / Redo */}
                        <button
                            onClick={redo}
                            disabled={!future || future.length === 0}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border border-slate-600/50 shadow-lg backdrop-blur-sm transition-all
              ${future && future.length > 0
                                    ? 'bg-slate-800/80 hover:bg-slate-700 text-gray-300 active:scale-95'
                                    : 'bg-slate-900/50 text-gray-600 cursor-not-allowed'
                                }`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Triggered Ability Stack (Overlay) — portrait only; landscape uses the
                inline StackStrip + dock expansion */}
            {!isLandscape && (
                <LIFOStack
                    items={abilityStack}
                    onResolve={handleResolveWithTargeting}
                    onRemove={removeFromStack}
                    onResolveAll={resolveAllStack}
                    onClear={clearStack}
                    onReorder={setAbilityStack}
                    isCollapsed={isStackCollapsed}
                    onToggleCollapse={() => setIsStackCollapsed(prev => !prev)}
                />
            )}

            {/* Main Content Area - battlefield + contextual dock in landscape */}
            <div
                className={`flex-1 flex ${isLandscape ? 'flex-row' : 'flex-col'} pt-16 pb-0 overflow-hidden relative`}
                onClick={handleBgClick}
            >
                <div className="flex-1 relative min-h-0 flex flex-col" ref={battlefieldRef}>
                    <div className="flex-1 min-h-0">
                    <BattlefieldList
                        cards={battlefieldCards}
                        activeZone={activeZone}
                        onZoneChange={setActiveZone}
                        zoneCounts={zoneCounts}
                        pinned={zonePinned}
                        onBlockedSwitch={handleBlockedSwitch}
                        onCardAction={handleCardAction}
                        onStackSelectionChange={updateStackSelection}
                        allCards={cards}
                        onActivateAbility={(card, ability) => {
                            logAction(`Activated: ${ability.cost}`);
                            handleActivateAbility(card, ability);
                        }}
                        onConvertLand={handleLandConversion}
                        onCounterChange={(action, cardsToModify, count) => {
                            if (!gameEngineRef.current) return;
                            let updatedCards = [...cards];
                            cardsToModify.forEach(cardToModify => {
                                const result = gameEngineRef.current.processAction(action, cardToModify, updatedCards, recentCards);
                                updatedCards = result.newCards;
                            });
                            const actionLabel = action === 'counter+' ? 'Added +1/+1 counter to' : 'Removed +1/+1 counter from';
                            logAction(`${actionLabel} ${count} ${selectedCard?.name || 'card'}(s)`);
                            saveHistoryState(updatedCards);
                            if (selectedCard) {
                                const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id);
                                if (updatedSelectedCard) setSelectedCard(updatedSelectedCard);
                            }
                        }}
                        getCardProps={(card) => {
                            const group = visibleStacks.find(g => g.cards.some(c => c.id === card.id));
                            const stackCards = group ? group.cards : [card];
                            const attachments = cards.filter(c => c.attachedTo === card.id);

                            // Check if ANY card in the stack is eligible
                            const eligibleCard = stackCards.find(c => isCardEligible(c));
                            const isStackEligible = !!eligibleCard;

                            // Calculate selection count for targeting mode
                            const targetSelectedCount = targetingMode.active
                                ? targetingMode.selectedIds.filter(id => stackCards.some(c => c.id === id)).length
                                : 0;

                            return {
                                isSelected: selectedCard?.id === card.id,
                                stackCards: stackCards,
                                attachments: attachments,
                                isPendingOnStack: stackCards.some(c =>
                                    abilityStack.some(a => {
                                        const isSource = a.sourceId === c.id;
                                        const effect = a.triggerObj?.ability?.effect || a.ability?.effect;
                                        return isSource && (effect === 'equip' || effect === 'attach');
                                    })
                                ) || (targetingMode.active &&
                                    (targetingMode.action === 'equip' ||
                                        targetingMode.action === 'resolve-trigger' ||
                                        (targetingMode.action === 'activate-ability' && (targetingMode.data?.effect === 'equip' || targetingMode.data?.isEquip))) &&
                                    stackCards.some(c => c.id === (targetingMode.sourceId || targetingMode.data?.sourceCard?.id || targetingMode.data?.stackAbility?.sourceId))),


                                // Targeting Props
                                isTargeting: targetingMode.active, // General targeting flag
                                isEligibleAttacker: targetingMode.active && targetingMode.action === 'declare-attackers' && isStackEligible,
                                isDeclaredAttacker: targetingMode.active && targetingMode.selectedIds?.includes(card.id),
                                isValidTarget: targetingMode.active && targetingMode.action !== 'declare-attackers' && isStackEligible,
                                isSource: targetingMode.active && targetingMode.sourceId === card.id,

                                selectedCount: targetSelectedCount,

                                isStackSliderOpen: !!group && targetingMode.sliderStackKey === group.key,
                                onToggleStackSlider: () => {
                                    if (targetingMode.sliderStackKey === group?.key) {
                                        setSliderStackKey(null);
                                    } else {
                                        if (targetSelectedCount === 0) {
                                            updateStackSelection(stackCards, stackCards.length);
                                        }
                                        setSliderStackKey(group?.key ?? null);
                                    }
                                },

                                onMouseDown: (e) => {
                                    if (targetingMode.active) {
                                        e.stopPropagation();
                                        if (isStackEligible) {
                                            // During Declare Attackers, tapping a multi-card stack opens the
                                            // count slider directly (defaults to selecting the whole stack)
                                            // instead of immediately toggling all-or-nothing — this is the
                                            // discoverable entry point for partial attacker selection on touch.
                                            if (targetingMode.action === 'declare-attackers' && stackCards.length > 1) {
                                                if (targetingMode.sliderStackKey !== group?.key) {
                                                    if (targetSelectedCount === 0) {
                                                        updateStackSelection(stackCards, stackCards.length);
                                                    }
                                                    setSliderStackKey(group?.key ?? null);
                                                }
                                                return;
                                            }

                                            // If stacked, prefer the eligible card (likely NOT the source)
                                            // If multiple eligible, just pick the first one matching logic
                                            const targetToSelect = eligibleCard || card;

                                            if (targetingMode.mode === 'multiple') handleMultiSelect(targetToSelect);
                                            else handleTargetSelection(targetToSelect);
                                        }
                                    } else {
                                        if (selectedCard?.id === card.id) setSelectedCard(null);
                                        else setSelectedCard(card);
                                    }
                                }
                            };
                        }}
                        targetingMode={targetingMode}
                    />
                    </div>

                    {/* Inline trigger-stack strip (landscape) — absent when the stack is empty */}
                    {isLandscape && (
                        <StackStrip
                            items={abilityStack}
                            isExpanded={isStackExpanded}
                            onToggleExpand={() => setIsStackExpanded(prev => !prev)}
                            onResolveTop={() => {
                                const topItem = abilityStack[abilityStack.length - 1];
                                if (topItem) handleResolveWithTargeting(topItem);
                            }}
                        />
                    )}
                </div>

                {/* Right Dock (landscape only). Priority: targeting > stack > selection > combat summary.
                    On compact viewports it renders as a slide-over, and only when it has content. */}
                {isLandscape && (!isCompactLandscape || dockHasContent) && (
                    <RightDock
                        overlay={isCompactLandscape}
                        title={targetingMode.active ? 'Choose targets' : (isStackExpanded && abilityStack.length > 0) ? 'Trigger stack' : currentCombatStep === 'Combat Damage' && !selectedCard ? 'Combat' : 'Selected'}>
                        {targetingMode.active ? (
                            <DockTargetingPanel
                                targetingMode={targetingMode}
                                cards={cards}
                                onConfirm={handleConfirmTargetingAction}
                                onCancel={cancelTargeting}
                                onSelectAll={handleToggleSelectAll}
                                isConfirmDisabled={targetingMode.selectedIds.length === 0 && !['declare-attackers', 'declare-blockers'].includes(targetingMode.action)}
                            />
                        ) : (isStackExpanded && abilityStack.length > 0) ? (
                            <DockStackList
                                items={abilityStack}
                                onResolve={handleResolveWithTargeting}
                                onRemove={removeFromStack}
                                onResolveAll={() => resolveAllStack(recentCards)}
                                onClear={clearStack}
                            />
                        ) : selectedCard ? (
                            <DockCardDetail
                                selectedCard={selectedCard}
                                stackCount={calculateEffectiveTotal(selectedStackCards)}
                                stackCards={selectedStackCards}
                                allCards={cards}
                                onAction={handleCardAction}
                                onDeselect={() => setSelectedCard(null)}
                                onActivateAbility={handleActivateAbilityLogged}
                                onConvertLand={handleLandConversion}
                                onCounterChange={handleSelectedCounterChange}
                            />
                        ) : currentCombatStep === 'Combat Damage' ? (
                            <CombatSummaryPanel
                                cards={cards}
                                isVisible={true}
                                variant="dock"
                                onClose={() => advanceCombatStep()}
                            />
                        ) : null}
                    </RightDock>
                )}
            </div>

            {/* Thin persistent bottom bar (landscape) — replaces the fanned card buttons */}
            {isLandscape && activePanel !== 'add' && (
                <BottomBar
                    onUndo={undo}
                    canUndo={history.length > 0}
                    onAddCard={() => setActivePanel('add')}
                    onNextPhase={() => {
                        if (!currentPhase) handleStartTurn();
                        else handleSmartPhaseAdvance();
                    }}
                    nextPhaseLabel={!currentPhase ? 'Start turn' : currentPhase === 'Main 2' ? 'End turn' : 'Next phase'}
                    onAutoCalculate={() => {
                        if (currentPhase === 'Main 2') {
                            endTurn();
                            setHasEndStepActions(false);
                        } else {
                            handleAutoCalculate();
                        }
                    }}
                    onOpenMore={() => setActivePanel(activePanel === 'more' ? null : 'more')}
                    disablePhaseActions={targetingMode.active}
                />
            )}



            {/* Zone pin toast ("Resolve stack triggers first.") */}
            {zoneToast && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-lg bg-slate-900/95 border border-amber-500/50 text-amber-300 text-sm font-semibold shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
                    {zoneToast}
                </div>
            )}

            {/* Phase Tracker - Floating above Controls */}
            <PhaseTracker
                isVisible={(!!currentPhase || !!passingPhase) && !autoMode}
                currentPhase={currentPhase}
                currentCombatStep={currentCombatStep}
                passingPhase={passingPhase}
                onPhaseChange={handlePhaseChange}
                onAdvancePhase={advancePhase}
                onAdvanceCombatStep={advanceCombatStep}
                onEndTurn={endTurn}
                isAttackerStep={currentCombatStep === 'Declare Attackers'}
                onToggleSelectAll={handleToggleSelectAll}
                onConfirmAttackers={handleConfirmAttackers}
            />

            {/* Declare Attackers Title - Floating above Control Panel (portrait only; dock handles landscape) */}
            {!isLandscape && targetingMode.active && targetingMode.action === 'declare-attackers' && (
                <div className="fixed left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom duration-200" style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-6 py-3 rounded-lg border border-red-500/50 shadow-2xl">
                        <Sword className="w-7 h-7 text-red-500" />
                        <h2 className="text-white font-bold text-2xl">Declare Attackers</h2>
                        {targetingMode.selectedIds && targetingMode.selectedIds.length > 0 && (
                            <span className="bg-red-900/40 text-red-400 text-sm px-3 py-1 rounded-full font-bold">
                                {formatBigNumber(calculateEffectiveTotal(cards.filter(c => targetingMode.selectedIds.includes(c.id))))} Selected
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Declare Blockers Title - Floating above Control Panel (portrait only; dock handles landscape) */}
            {!isLandscape && targetingMode.active && targetingMode.action === 'declare-blockers' && (
                <div className="fixed left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom duration-200" style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-6 py-3 rounded-lg border border-blue-500/50 shadow-2xl">
                        <ShieldOff className="w-7 h-7 text-blue-500" />
                        <h2 className="text-white font-bold text-2xl">Declare Blockers</h2>
                        {targetingMode.selectedIds && targetingMode.selectedIds.length > 0 ? (
                            <span className="bg-blue-900/40 text-blue-300 text-sm px-3 py-1 rounded-full font-bold">
                                {formatBigNumber(calculateEffectiveTotal(cards.filter(c => targetingMode.selectedIds.includes(c.id))))} Blocked
                            </span>
                        ) : (
                            <span className="text-gray-400 text-sm italic">
                                Select blocked attackers
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Combat Summary Panel - floating in portrait; the dock hosts it in landscape */}
            <CombatSummaryPanel
                cards={cards}
                isVisible={currentCombatStep === 'Combat Damage' && !isLandscape}
                onClose={() => advanceCombatStep()}
            />

            {/* New Bottom Control Panel, Selection Menu, or Attacker Confirmation */}
            {/* Hide controls if Add Panel is open, to let it replace the bottom area */}
            {/* Portrait-only bottom area: the fanned control panel and the SelectionMenu
                overlay. Landscape uses the thin BottomBar + dock instead. */}
            {activePanel === 'add' || isLandscape ? null : selectedCard ? (
                <SelectionMenu
                    selectedCard={selectedCard}
                    stackCount={calculateEffectiveTotal(selectedStackCards)}
                    stackCards={selectedStackCards}
                    allCards={cards}

                    onAction={handleCardAction}
                    onDeselect={() => setSelectedCard(null)}
                    onActivateAbility={handleActivateAbilityLogged}
                    onConvertLand={handleLandConversion}
                    onCounterChange={handleSelectedCounterChange}
                />
            ) : (
                <BottomControlPanel
                    onStartTurn={handleStartTurn}
                    onAddCard={() => setActivePanel('add')}
                    onSelectAll={handleToggleSelectAll}
                    onOpenMore={() => setActivePanel(activePanel === 'more' ? null : 'more')}
                    landCount={landCount}
                    // New Props for Navigation
                    currentPhase={currentPhase}
                    currentCombatStep={currentCombatStep}
                    onEndTurn={() => {
                        endTurn();
                        setHasEndStepActions(false);
                    }}
                    stackCount={abilityStack.length}
                    // Targeting Mode Props
                    isTargetingMode={targetingMode.active}
                    onCancelTargeting={cancelTargeting}
                    onConfirmTargeting={handleConfirmTargetingAction}
                    targetingMode={targetingMode}
                    confirmLabel={getModeConfig(targetingMode.action).confirmLabel}
                    showSelectAll={getModeConfig(targetingMode.action).showSelectAll}
                    isConfirmDisabled={targetingMode.selectedIds.length === 0 && !['declare-attackers', 'declare-blockers'].includes(targetingMode.action)}
                    onResolveStackItem={() => {
                        const topItem = abilityStack[abilityStack.length - 1];
                        if (topItem) handleResolveWithTargeting(topItem);
                    }}
                    onRejectStackItem={() => {
                        const topItem = abilityStack[abilityStack.length - 1];
                        if (topItem) removeFromStack(topItem);
                    }}
                    autoMode={autoMode}
                    onAdvancePhase={autoMode ? handleAutoCalculate : handleSmartPhaseAdvance}
                    hasEndStepActions={hasEndStepActions}
                    onDeclareAttackers={() => {
                        // SYNC STATE: Ensure we are formally in Combat phase so subsequent steps (Blockers) work
                        setCurrentPhase('Combat');
                        setCurrentCombatStep('Declare Attackers');

                        setTargetingMode({
                            active: true,
                            mode: 'multiple',
                            action: 'declare-attackers',
                            sourceId: null,
                            selectedIds: []
                        });
                        logAction("Select creatures to attack, then Confirm.");
                    }}
                />
            )}

            {/* More Options / Lands Panel */}
            {activePanel === 'more' && (
                <MoreOptionsPanel
                    cards={cards}
                    onClose={() => setActivePanel(null)}
                    onAddLand={(landName) => {
                        getScryfallCard(landName).then(def => {
                            if (def) handleAddCard(def, 1);
                        });
                    }}
                    onRemoveLand={(landId) => {
                        const result = gameEngineRef.current.processAction('delete', { id: landId }, cards);
                        setCards(result.newCards);
                        saveHistoryState(result.newCards);
                    }}
                    onSelectAll={handleToggleSelectAll}
                />
            )}

            <CalculationMenu
                isOpen={showCalculationMenu}
                onClose={() => setShowCalculationMenu(false)}
                autoMode={autoMode}
                onToggleAutoMode={() => {
                    setAutoMode(!autoMode);
                    setShowCalculationMenu(false);
                }}
                hasUnreadUpdate={hasUnreadUpdate}
                onClearBadge={handleClearUpdateBadge}
                onOpenTutorial={() => {
                    setShowWelcome(true);
                    setShowCalculationMenu(false);
                }}
            />

            {/* X Cost Modal */}
            {pendingXCostSpell && (
                <XCostModal
                    spell={pendingXCostSpell.def}
                    onConfirm={castXSpell}
                    onCancel={cancelXSpell}
                />
            )}

            <AddCardPanel
                isOpen={activePanel === 'add'}
                onClose={() => setActivePanel(null)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                previewCard={previewCard}
                setPreviewCard={setPreviewCard}
                recentCards={recentCards}
                onAddCard={handleAddCard}
                onAddToRecents={handleAddToRecents}
                onDeleteRecent={handleDeleteRecent}
                onSelectSearchResult={handleSelectSearchResult}
                onOpenScanner={handleOpenScanner}
            />

            <HistoryPanel
                isOpen={activePanel === 'history'}
                onClose={() => setActivePanel(null)}
                actionLog={actionLog}
                historyLength={history.length}
                onUndo={undo}
            />

            {/* Welcome Screen Overlay */}
            <WelcomeScreen
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
            />

            {/* Scanner Components — lazy-loaded, only mounted while open */}
            {isScannerOpen && (
                <Suspense
                    fallback={
                        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                            <p className="text-white text-lg animate-pulse">Loading scanner…</p>
                        </div>
                    }
                >
                    <ScannerModal
                        isOpen={isScannerOpen}
                        onClose={handleCloseScanner}
                        onCardsConfirmed={handleCardsConfirmed}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default Game;
