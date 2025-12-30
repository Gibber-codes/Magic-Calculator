import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Plus, Minus, Copy, Trash2, RotateCcw,
  History, Zap, Skull, Mountain, Hexagon, Sparkles, Ghost, User, Ban, Sword, ArrowLeft, ArrowRight, Play, CheckCircle, Search, ShieldOff,
  Menu, ChevronLeft, ChevronRight, Link
} from 'lucide-react';

// Config
import { CARD_WIDTH, CARD_HEIGHT, CARD_GAP } from './config/constants';
import { PRESETS } from './config/presets';

// Load card data from consolidated JSON file
import cardData from './data/scryfall_cards.json';

import GameEngine from './utils/gameEngine';
import { TopBanner, ArtWindow, BottomBanner, PowerToughnessBanner } from './components/RedesignedCardFrame';
import { formatBigNumber } from './utils/formatters';
import { getModeConfig } from './utils/modeConfig';
import { getCardAbilities, extractActivatedAbilities, extractEffects, parseOracleText } from './utils/keywordParser';
import { getTypeFromTypeLine, isCreature, isLand, createBattlefieldCard, isPlaceholderLand, isMinimalDisplayLand, BASIC_LAND_COLORS } from './utils/cardUtils';
import { searchScryfall, getScryfallCard, formatScryfallCard, fetchRelatedTokens } from './utils/scryfallService';
import { SIGNATURE_DATA } from './data/signatureCards';
import LIFOStack from './components/LIFOStack';
import AddCardPanel from './components/AddCardPanel';
import HistoryPanel from './components/HistoryPanel';

import PhaseTracker from './components/PhaseTracker';
import BattlefieldCard from './components/BattlefieldCard';
import BattlefieldList from './components/BattlefieldList';
import CalculationMenu from './components/CalculationMenu';
import SelectionMenu from './components/SelectionMenu';
import BottomControlPanel from './components/BottomControlPanel';
import LandsPanel from './components/LandsPanel';

import useGameState from './hooks/useGameState';
import useTargetingMode from './hooks/useTargetingMode';
import usePhaseHandlers from './hooks/usePhaseHandlers';
import useCardActions from './hooks/useCardActions';
import useTargetingConfirm from './hooks/useTargetingConfirm';
import useSearch from './hooks/useSearch';

// Constants imported from config/constants.js
// PRESETS imported from config/presets.js
// getModeConfig imported from utils/modeConfig.js

// --- Helper Functions ---

// --- Helper Functions moved to utils/cardUtils.js ---




// --- Main Layout ---

const App = () => {
  // --- Game State (from hook) ---
  const gameState = useGameState();
  const {
    cards, setCards,
    history, actionLog,
    currentPhase, setCurrentPhase,
    currentCombatStep, setCurrentCombatStep,
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
    updateStackSelection, handleConfirmAttackers
  } = targeting;

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
  const [loadingPreset, setLoadingPreset] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCalculationMenu, setShowCalculationMenu] = useState(false);

  const battlefieldRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, initialScrollX: 0, initialOffsetY: 0, axis: null, rowType: null });
  const [creatureScrollX, setCreatureScrollX] = useState(0);
  const [othersScrollX, setOthersScrollX] = useState(0);
  const [landsScrollX, setLandsScrollX] = useState(0);
  const [verticalOffsetY, setVerticalOffsetY] = useState(0);
  // Track window size to force re-calc of layout on resize (fixes stale visual positions)
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 0, height: typeof window !== 'undefined' ? window.innerHeight : 0 });
  const [isPortrait, setIsPortrait] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);
  const BOTTOM_BAR_HEIGHT = 0; // Floating UI now
  const TOP_BAR_HEIGHT = 0;   // Floating UI now

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
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
  const visibleRawCards = useMemo(() => {
    return cards.filter(c => c.zone === 'battlefield' && !c.attachedTo);
  }, [cards]);

  // Group Identical Cards for Stacking
  const visibleStacks = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    visibleRawCards.forEach(card => {
      // Find attachments for this card
      const attachments = cards.filter(c => c.attachedTo === card.id);
      // Create a unique key for attachments (based on name so identical setups stack)
      const attachmentKey = attachments.map(a => a.name).sort().join(',');

      // Key defines identity for stacking
      // Includes temporary buffs so modified creatures split from the stack
      const key = `${card.name}|${card.power}|${card.toughness}|${card.tapped}|${JSON.stringify(card.counters)}|${card.faceDown || false}|${card.type_line}|${card.isToken}|${card.tempPowerBonus || 0}|${card.tempToughnessBonus || 0}|[${attachmentKey}]`;

      if (!groupMap.has(key)) {
        const group = { key, leader: card, count: 1, cards: [card], id: card.id }; // Added 'id' for easier access
        groupMap.set(key, group);
        groups.push(group);
      } else {
        const group = groupMap.get(key);
        group.count++;
        group.cards.push(card);
      }
    });
    return groups;
  }, [visibleRawCards, cards]);

  // Grouped Layout Calculation
  const cardPositions = useMemo(() => {
    if (!battlefieldRef.current) return {};
    // Use window dimensions if ref is not ready or to maintain consistency
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // Account for bottom navigation bar (combat tracker + phase buttons) AND top header
    const usableHeight = containerHeight - BOTTOM_BAR_HEIGHT - TOP_BAR_HEIGHT;

    const centerX = containerWidth / 2;
    // CenterY should be LOCAL to the container
    const centerY = usableHeight / 2;

    // Dynamic spread based on available height
    // Card height is 200px. We need >210px gap to avoid overlap.
    const baseSpread = 250;
    const scaleFactor = Math.min(1, usableHeight / 900);
    const spread = Math.max(220, baseSpread * scaleFactor); // Min 220px

    // Dynamic Row Offsets
    // Creatures: Up by 1 spread
    // Others: Center
    // Lands: Down by 1 spread
    // Dynamic Row Offsets
    // Creatures: Up by 1 spread
    // Others: Center
    // Lands: Down by fixed amount (tight gap) to account for minimal display height
    const creatureRowY = centerY - spread;
    const othersRowY = centerY;
    const landsRowY = centerY + 215; // Tight gap (Others bottom at +100, Land top at +115)

    const positions = {};

    // Group cards by category using STACKS
    // Use type_line for flexible matching (e.g. "Artifact Creature" goes to creatures, "Token Creature" goes to creatures)
    // Helpers moved to module scope for reuse

    // Note: isCreature and isLand are now available in module scope

    const lands = visibleStacks.filter(g => isMinimalDisplayLand(g.leader));
    const creatures = visibleStacks.filter(g => isCreature(g.leader));
    // Others now includes Non-Basic Lands (Complex Lands)
    const others = visibleStacks.filter(g => !isCreature(g.leader) && !isMinimalDisplayLand(g.leader));

    // Helper to position a row of cards
    const layoutRow = (items, yPos, xOffset = 0) => {
      // Apply GLOBAL vertical offset to everything
      const finalY = yPos + verticalOffsetY;
      const count = items.length;
      if (count === 0) return;
      const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;

      // Calculate centered startX, but clamp to 0 (with small padding) if row is too wide
      const EDGE_PADDING = 8;
      let startX = centerX - totalWidth / 2;

      // If the row is wider than the screen, start from left edge + padding
      // This allows horizontal scroll to reveal all cards
      if (totalWidth > containerWidth) {
        startX = EDGE_PADDING;
      } else {
        // Even for centered rows, don't let startX go negative
        startX = Math.max(EDGE_PADDING, startX);
      }

      items.forEach((group, index) => {
        positions[group.leader.id] = {
          id: group.leader.id,
          x: startX + index * (CARD_WIDTH + CARD_GAP) + xOffset,
          // Convert Center Line Y to Top Edge Y for rendering
          y: finalY - (200 / 2)
        };
      });
    };

    // Define Rows (Y positions)
    // Visual Order (Top to Bottom): Creatures -> Others -> Lands

    // Creatures at Top
    layoutRow(creatures, creatureRowY, creatureScrollX);

    // Others (Artifacts/Enchantments) under creatures
    layoutRow(others, othersRowY, othersScrollX);

    // Lands at bottom
    layoutRow(lands, landsRowY, landsScrollX);

    // Fallback/Overflow handling would be needed for many cards, but simple rows for now.

    return positions;
  }, [visibleStacks, cards, activePanel, showSearchOverlay, creatureScrollX, othersScrollX, landsScrollX, verticalOffsetY, windowSize]);

  // --- Phase Handlers (from hook) ---
  const {
    passingPhase,
    handlePhaseChange,
    handleSmartPhaseAdvance,
    handleStartTurn,
    advanceCombatStep,
    advancePhase
  } = usePhaseHandlers({
    gameState,
    targeting,
    cards,
    setCards,
    cardPositions
  });

  // Effect: Auto-open targeting for top stack item if it requires targets
  // This prevents the "Resolve Twice" feel (Click Stack -> Click Overlay)
  // NOTE: Kept in App.jsx due to dependency on handleResolveWithTargeting
  useEffect(() => {
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
          handleResolveWithTargeting(topItem);
        }
      }
    }
  }, [abilityStack, targetingMode.active]);

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
    handleActivateAbility
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
    loadingPreset,
    setLoadingPreset,
    setPreviewCard,
    setSearchQuery,
    setSearchResults,
    setShowSearchOverlay,

    // Targeting
    setTargetingMode,
    startTargetingMode
  });

  // --- Search (from hook) ---
  const { handleSelectSearchResult } = useSearch({
    searchQuery,
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
    handleConfirmAttackers
  });

  // --- Render ---

  // Calculate Land Count for Badge
  const landCount = cards.filter(c => c.zone === 'battlefield' && isLand(c)).length;

  // Unified Battlefield List (excluding lands which are in side panel)
  const battlefieldCards = visibleStacks.filter(g => {
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
  };

  return (
    <div
      className="flex flex-col h-screen w-full text-white overflow-hidden relative selection-none touch-none battlefield-bg"
      style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
        backgroundSize: '40px 40px',
        backgroundColor: '#0f172a'
      }}
    >
      {/* Top Bar: Navigation & Menu */}
      <div className="absolute top-0 left-0 w-full px-4 py-3 z-50 flex justify-between items-center pointer-events-none">

        {/* Left: Menu Button */}
        <button
          onClick={() => setShowCalculationMenu(true)}
          className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-gray-300 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: Title */}
        <h1 className="text-white font-bold text-lg drop-shadow-md select-none pointer-events-auto">
          Magic Calculator
        </h1>

        {/* Right: History Navigation (Undo/Redo) */}
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
      </div>

      {/* Triggered Ability Stack (Overlay) - Always visible */}
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

      {/* Main Content Area - Split View */}
      <div
        className="flex-1 flex flex-col pt-16 pb-0 overflow-hidden"
        onClick={handleBgClick}
      >
        <div className="flex-1 relative min-h-0" ref={battlefieldRef}>
          <BattlefieldList
            cards={battlefieldCards}
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

                // Targeting Props
                isTargeting: targetingMode.active, // General targeting flag
                isEligibleAttacker: targetingMode.active && targetingMode.action === 'declare-attackers' && isStackEligible,
                isDeclaredAttacker: targetingMode.active && targetingMode.selectedIds?.includes(card.id),
                isValidTarget: targetingMode.active && targetingMode.action !== 'declare-attackers' && isStackEligible,
                isSource: targetingMode.active && targetingMode.sourceId === card.id,

                selectedCount: targetSelectedCount,

                onMouseDown: (e) => {
                  if (targetingMode.active) {
                    e.stopPropagation();
                    if (isStackEligible) {
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
          />
        </div>
      </div>



      {/* Phase Tracker - Floating above Controls */}
      <PhaseTracker
        isVisible={!!currentPhase || !!passingPhase}
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

      {/* Declare Attackers Title - Floating above Control Panel */}
      {targetingMode.active && targetingMode.action === 'declare-attackers' && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-6 py-3 rounded-lg border border-red-500/50 shadow-2xl">
            <Sword className="w-7 h-7 text-red-500" />
            <h2 className="text-white font-bold text-2xl">Declare Attackers</h2>
            {targetingMode.selectedIds && targetingMode.selectedIds.length > 0 && (
              <span className="bg-red-900/40 text-red-400 text-sm px-3 py-1 rounded-full font-bold">
                {targetingMode.selectedIds.length} Selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* New Bottom Control Panel, Selection Menu, or Attacker Confirmation */}
      {/* Hide controls if Add Panel is open, to let it replace the bottom area */}
      {activePanel === 'add' ? null : selectedCard ? (
        <SelectionMenu
          selectedCard={selectedCard}
          stackCount={visibleStacks.find(g => g.cards.some(c => c.id === selectedCard.id))?.cards.length || 1}
          stackCards={visibleStacks.find(g => g.cards.some(c => c.id === selectedCard.id))?.cards || [selectedCard]}
          allCards={cards}
          onAction={handleCardAction}
          onDeselect={() => setSelectedCard(null)}
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
            saveHistoryState(updatedCards);
            if (selectedCard) {
              const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id);
              if (updatedSelectedCard) setSelectedCard(updatedSelectedCard);
            }
          }}
        />
      ) : (
        <BottomControlPanel
          onStartTurn={handleStartTurn}
          onAddCard={() => setActivePanel('add')}
          onSelectAll={handleToggleSelectAll}
          onOpenLands={() => setActivePanel(activePanel === 'lands' ? null : 'lands')}
          landCount={landCount}
          // New Props for Navigation
          currentPhase={currentPhase}
          currentCombatStep={currentCombatStep}
          onAdvancePhase={handleSmartPhaseAdvance}
          onEndTurn={endTurn}
          stackCount={abilityStack.length}
          // Targeting Mode Props
          isTargetingMode={targetingMode.active}
          onCancelTargeting={cancelTargeting}
          onConfirmTargeting={handleConfirmTargetingAction}
          confirmLabel={getModeConfig(targetingMode.action).confirmLabel}
          showSelectAll={getModeConfig(targetingMode.action).showSelectAll}
          isConfirmDisabled={targetingMode.selectedIds.length === 0}
          onResolveStackItem={() => {
            const topItem = abilityStack[abilityStack.length - 1];
            if (topItem) handleResolveWithTargeting(topItem);
          }}
          onRejectStackItem={() => {
            const topItem = abilityStack[abilityStack.length - 1];
            if (topItem) removeFromStack(topItem);
          }}
        />
      )}

      {/* Lands Management Panel */}
      {activePanel === 'lands' && (
        <LandsPanel
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
        />
      )}

      <CalculationMenu isOpen={showCalculationMenu} onClose={() => setShowCalculationMenu(false)} />

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
        presets={PRESETS}
        loadingPreset={loadingPreset}
        onLoadPreset={handleLoadPreset}
      />

      <HistoryPanel
        isOpen={activePanel === 'history'}
        onClose={() => setActivePanel(null)}
        actionLog={actionLog}
        historyLength={history.length}
        onUndo={undo}
      />


    </div>
  );
};

export default App;
