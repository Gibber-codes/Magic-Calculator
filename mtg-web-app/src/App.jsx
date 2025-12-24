import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Plus, Minus, Copy, Trash2, RotateCcw,
  History, Zap, Skull, Mountain, Hexagon, Sparkles, Ghost, User, Ban, Sword, ArrowLeft, ArrowRight, Play, CheckCircle, Search, ShieldOff,
  Menu, ChevronLeft, ChevronRight
} from 'lucide-react';

// Load card data from consolidated JSON file
import cardData from './data/scryfall_cards.json';

import GameEngine from './utils/gameEngine';
import { TopBanner, ArtWindow, BottomBanner, PowerToughnessBanner } from './components/RedesignedCardFrame';
import { formatBigNumber } from './utils/formatters';
import { getCardAbilities, extractActivatedAbilities, extractEffects, parseOracleText } from './utils/keywordParser';
import { getTypeFromTypeLine, isCreature, isLand, createBattlefieldCard, isPlaceholderLand, isMinimalDisplayLand, BASIC_LAND_COLORS } from './utils/cardUtils';
import { searchScryfall, getScryfallCard, formatScryfallCard, fetchRelatedTokens } from './utils/scryfallService';
import { SIGNATURE_DATA } from './data/signatureCards';
import TriggeredAbilityStack from './components/TriggeredAbilityStack';
import AddCardPanel from './components/AddCardPanel';
import HistoryPanel from './components/HistoryPanel';



import PhaseTracker from './components/PhaseTracker';
import BattlefieldCard from './components/BattlefieldCard';
import CreatureList from './components/CreatureList';
import PermanentList from './components/PermanentList';
import CalculationMenu from './components/CalculationMenu';
import SelectionMenu from './components/SelectionMenu';
import BottomControlPanel from './components/BottomControlPanel';
import ConfirmOverlay from './components/ConfirmOverlay';
import LandsPanel from './components/LandsPanel';

import useGameState from './hooks/useGameState';
import useTargetingMode from './hooks/useTargetingMode';

// Constants
const CARD_WIDTH = 140;
const CARD_HEIGHT = 200;
const CARD_GAP = 12;

const PHASE_ORDER = ['Beginning', 'Main', 'Combat', 'Main 2', 'End'];
const PHASE_INFO = {
  Beginning: { label: 'Untap/Upkeep', icon: RotateCcw },
  Main: { label: 'Main Phase', icon: Zap },
  Combat: { label: 'Combat', icon: Sword },
  'Main 2': { label: 'Main Phase 2', icon: Zap },
  End: { label: 'End Step', icon: History }
};

const COMBAT_STEPS = [
  'Beginning of Combat',
  'Declare Attackers',
  'Declare Blockers',
  'Combat Damage',
  'End of Combat'
];

// Presets Definition
const PRESETS = {
  'Ouroboroid Season': {
    cards: ['Ouroboroid', 'Doubling Season', 'Orthion, Hero of Lavabrink', 'Finale of Devastation'],
    image: '/Ouroboroid_season.png'
  },
  'Phyrexian Multiplication': {
    cards: ['Helm of the Host', 'Mondrak, Glory Dominus'],
    image: '/helmed_mondrak.png'
  }
};

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
  const [passingPhase, setPassingPhase] = useState(null); // For animated phase transitions
  const pendingPhasePassRef = useRef(null); // Tracks paused phase animation state


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
      const key = `${card.name}|${card.power}|${card.toughness}|${card.tapped}|${JSON.stringify(card.counters)}|${card.faceDown || false}|${card.type_line}|${card.isToken}|[${attachmentKey}]`;

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

  // --- Actions (using hooks with local wrappers) ---

  // Wrap phase change to add triggers to stack with position sorting
  // Returns true if triggers were added to the stack
  const handlePhaseChange = (phase) => {
    const triggers = baseHandlePhaseChange(phase, cardPositions);
    if (triggers && triggers.length > 0) {
      // Sort triggers by battlefield position
      const sortedTriggers = [...triggers].sort((a, b) => {
        const aAttachedTo = a.source.attachedTo;
        const bAttachedTo = b.source.attachedTo;
        const posA = aAttachedTo ? cardPositions[aAttachedTo] : cardPositions[a.source.id];
        const posB = bAttachedTo ? cardPositions[bAttachedTo] : cardPositions[b.source.id];
        if (!posA || !posB) return 0;
        const samePosition = Math.abs(posA.x - posB.x) < 5 && Math.abs(posA.y - posB.y) < 5;
        if (samePosition) {
          if (aAttachedTo && !bAttachedTo) return 1;
          if (!aAttachedTo && bAttachedTo) return -1;
          return 0;
        }
        return posB.x - posA.x;
      });
      sortedTriggers.forEach(t => {
        const description = t.ability?.description ||
          `At the beginning of combat: ${t.ability?.effect || 'triggered ability'}`;
        addToStack(t.source, description, 'at', t);
      });
      return true; // Triggers were added
    }
    return false; // No triggers added
  };

  // Smart Phase Advance (Game Flow Button)
  const handleSmartPhaseAdvance = () => {
    // 1. Safety Check: Stack must be empty
    if (abilityStack && abilityStack.length > 0) {
      logAction(`Must resolve ${abilityStack.length} item(s) on the stack first!`);
      return;
    }

    if (!currentPhase) {
      handlePhaseChange('Main');
      return;
    }

    if (currentPhase === 'Beginning') {
      handlePhaseChange('Main');
    } else if (currentPhase === 'Main') {
      // Transition to Combat - beginning of combat triggers will go on stack
      // User must resolve them before declaring attackers
      handlePhaseChange('Combat');
    } else if (currentPhase === 'Combat') {
      // In Combat phase: if not already in targeting mode, trigger attacker selection
      // Otherwise, advance to Main 2
      if (!targetingMode.active) {
        setTargetingMode({
          active: true,
          mode: 'multiple',
          action: 'declare-attackers',
          sourceId: null,
          selectedIds: []
        });
        logAction("Select creatures to attack, then Confirm.");
      } else {
        // Already declared attackers (or in some other targeting mode), go to Main 2
        handlePhaseChange('Main 2');
      }
    } else if (currentPhase === 'Main 2') {
      endTurn();
    }
  };

  // Handle Start Turn - processes Beginning phase (untap + triggers) then lands on Main 1
  // Shows animated visual of passing through Beginning steps
  // Pauses if triggers go on the stack, resumes when stack is empty
  const handleStartTurn = () => {
    // Clear attacking status from previous turn
    setCards(prev => prev.map(c => ({
      ...c,
      attacking: false
    })));

    // Process Beginning phase (untap all, check for beginning_step triggers)
    const hadTriggers = handlePhaseChange('Beginning');

    // Animated phase passing through Beginning steps
    const beginningSteps = ['Untap', 'Upkeep', 'Draw'];

    // If triggers were added, pause animation and let them resolve
    // After resolution, animation will continue and land on Main
    if (hadTriggers) {
      setPassingPhase('Beginning');
      pendingPhasePassRef.current = { steps: beginningSteps, stepIndex: 0 };
      return;
    }

    // No triggers, animate through steps then immediately land on Main 1
    startPhasePassAnimation(beginningSteps, 0);
  };

  // Reusable function to animate through phase steps, then land on Main
  const startPhasePassAnimation = (steps, startIndex) => {
    let stepIndex = startIndex;

    // Show animation starting
    setPassingPhase(steps[stepIndex] || 'Beginning');

    const animateSteps = () => {
      if (stepIndex < steps.length) {
        setPassingPhase(steps[stepIndex]);
        stepIndex++;
        setTimeout(animateSteps, 200); // 200ms per step (slightly faster)
      } else {
        // Animation complete, land on Main 1
        setPassingPhase(null);
        pendingPhasePassRef.current = null;
        handlePhaseChange('Main');
      }
    };

    // Start animation immediately
    setTimeout(animateSteps, 100);
  };

  // Effect: Resume phase passing when stack becomes empty
  useEffect(() => {
    if (pendingPhasePassRef.current && abilityStack.length === 0) {
      const { steps, stepIndex } = pendingPhasePassRef.current;
      pendingPhasePassRef.current = null; // Clear before starting

      // Small delay to let UI update
      setTimeout(() => {
        startPhasePassAnimation(steps, stepIndex);
      }, 300);
    }
  }, [abilityStack.length]);

  // Wrap advanceCombatStep to handle declare attackers mode
  const advanceCombatStep = () => {
    const result = baseAdvanceCombatStep();
    if (result.shouldDeclareAttackers) {
      setTargetingMode({
        active: true,
        mode: 'multiple',
        action: 'declare-attackers',
        sourceId: null,
        selectedIds: []
      });
      logAction("Select creatures to attack, then Confirm.");
    } else if (result.shouldAdvancePhase) {
      advancePhase();
    }
  };

  // Wrap advancePhase 
  const advancePhase = () => {
    const nextPhase = baseAdvancePhase();
    if (nextPhase) {
      handlePhaseChange(nextPhase);
    }
  };

  // Wrap handleMultiSelect to pass visibleStacks
  const handleMultiSelect = (card) => {
    baseHandleMultiSelect(card, visibleStacks);
  };

  // --- End Actions ---

  // Land Conversion Handler
  const handleLandConversion = (landType, count) => {
    if (!selectedCard || !isPlaceholderLand(selectedCard)) return;

    const stack = visibleStacks.find(s => s.cards.some(c => c.id === selectedCard.id));
    if (!stack) return;

    const landsToConvert = stack.cards.slice(0, count);
    const landsToKeep = stack.cards.slice(count);

    const newLands = landsToConvert.map((oldLand) => {
      const landDef = SIGNATURE_DATA[landType] || {
        name: landType,
        type: 'Land',
        type_line: `Basic Land — ${landType}`,
        colors: BASIC_LAND_COLORS[landType]?.colors || []
      };

      return createBattlefieldCard({
        ...landDef,
        isBasicLand: true
      }, {}, { cards, gameEngineRef });
    });

    setCards(current => {
      const withoutConverted = current.filter(c => !landsToConvert.some(l => l.id === c.id));
      return [...withoutConverted, ...newLands];
    });

    if (landsToKeep.length === 0) {
      setSelectedCard(newLands[0] || null);
    } else {
      // Keep selection on remaining placeholder
      setSelectedCard(landsToKeep[0]);
    }

    logAction(`Converted ${count} Land → ${landType}`);
    saveHistoryState([...cards.filter(c => !landsToConvert.some(l => l.id === c.id)), ...newLands]);
  };

  const handleCardAction = (action, specificCard = null, deleteCount = 1) => {
    const targetCard = specificCard;
    if (!targetCard) return;

    if (action === 'select') {
      setSelectedCard(targetCard);
      return;
    }

    if (action === 'transform') {
      const newCards = cards.map(c => {
        if (c.id === targetCard.id) {
          const faces = c.card_faces || [];
          if (faces.length < 2) return c;

          // Calculate next face index
          const currentIdx = c.activeFaceIndex !== undefined ? c.activeFaceIndex : 0;
          const nextIdx = (currentIdx + 1) % faces.length;
          const newFace = faces[nextIdx];

          // Update top-level props to match new face for easier rendering
          return {
            ...c,
            activeFaceIndex: nextIdx,
            name: newFace.name,
            type_line: newFace.type_line,
            oracle_text: newFace.oracle_text,
            power: newFace.power,
            toughness: newFace.toughness,
            // Only update art if the new face has its own art
            art_crop: newFace.art_crop || c.art_crop,
            image_normal: newFace.image_normal || c.image_normal
          };
        }
        return c;
      });
      setCards(newCards);
      logAction(`${targetCard.name} transformed.`);
      return;
    }

    // Handle trigger action - add ability to stack
    if (action === 'trigger') {
      let description = 'Triggered ability';
      let abilityToTrigger = null;

      if (targetCard.abilities && targetCard.abilities.length > 0) {
        // Use first ability
        abilityToTrigger = targetCard.abilities[0];
        description = abilityToTrigger.description || abilityToTrigger.type || 'Triggered ability';
      } else if (targetCard.oracle_text) {
        // Try to parse triggers from text if not already parsed
        // We imported parseOracleText at top level now
        const parsed = parseOracleText(targetCard);
        if (parsed.triggers.length > 0) {
          // Convert trigger format to ability format
          const t = parsed.triggers[0];
          abilityToTrigger = {
            trigger: t.trigger,
            condition: t.condition,
            effect: t.effects[0]?.effect || 'unknown',
            target: t.effects[0]?.target || 'self',
            amount: t.effects[0]?.amount,
            tokenName: t.effects[0]?.tokenName,
            tokenProps: t.effects[0]?.tokenProps,
          };
          description = `Triggered: ${abilityToTrigger.effect}`;
        }
      }

      // Create executable trigger object if engine is available
      if (abilityToTrigger && gameEngineRef.current) {
        try {
          const triggerObj = gameEngineRef.current.resolveEffect({
            source: targetCard,
            ability: abilityToTrigger
          });
          addToStack(targetCard, description, 'trigger', triggerObj);
          return;
        } catch (e) {
          console.error("Failed to create trigger object:", e);
        }
      }

      // Fallback to text-only stack item
      addToStack(targetCard, description);
      return;
    }

    let newCards = [...cards]; // Copy first

    if (action === 'graveyard') {
      logAction(`${targetCard.name} sent to graveyard`);
      newCards = newCards.map(c => {
        if (c.id === targetCard.id) {
          return { ...c, zone: 'graveyard', attachedTo: null };
        }
        if (c.attachedTo === targetCard.id) {
          // Detach attached cards when card goes to graveyard
          return { ...c, attachedTo: null, zone: 'battlefield' };
        }
        return c;
      });
    } else if (action === 'exile') {
      logAction(`${targetCard.name} exiled`);
      newCards = newCards.map(c => {
        if (c.id === targetCard.id) {
          return { ...c, zone: 'exile', attachedTo: null };
        }
        if (c.attachedTo === targetCard.id) {
          // Detach attached cards when card is exiled
          return { ...c, attachedTo: null, zone: 'battlefield' };
        }
        return c;
      });
    } else if (action === 'delete') {
      if (currentPhase) {
        // During a turn, initiate zone selection
        setTargetingMode({
          active: true,
          sourceId: targetCard.id,
          action: 'remove-to-zone',
          mode: 'single',
          selectedIds: []
        });
        setSelectedCard(null);
        return; // Don't execute removal yet, wait for zone selection
      } else {
        // No turn active, remove the card(s) directly

        if (deleteCount > 1) {
          // Multi-card deletion (deleting from a stack)
          console.log('Deleting stack:', targetCard.name, 'isToken:', targetCard.isToken, 'Count:', deleteCount);

          // STRICT MATCHING: ensuring we target the specific visual stack
          const stackCards = newCards.filter(c =>
            c.name === targetCard.name &&
            c.zone === targetCard.zone &&
            !c.attachedTo &&
            c.tapped === targetCard.tapped &&
            c.counters === targetCard.counters &&
            !!c.isToken === !!targetCard.isToken
          );

          console.log('Matches found:', stackCards.length);

          // If we found matching cards, delete up to `deleteCount` of them
          if (stackCards.length > 0) {
            logAction(`Removed ${deleteCount} ${targetCard.name}(s)`);
            let removedCount = 0;
            const cardsToRemoveIds = [];

            newCards = newCards.map(c => {
              if (c.name === targetCard.name &&
                c.zone === targetCard.zone &&
                !c.attachedTo &&
                c.tapped === targetCard.tapped &&
                c.counters === targetCard.counters &&
                !!c.isToken === !!targetCard.isToken &&
                removedCount < deleteCount) {

                removedCount++;
                cardsToRemoveIds.push(c.id);
                return null; // Delete
              }
              return c;
            }).filter(Boolean);

            // Detach equipment from removed cards
            newCards = newCards.map(c => {
              if (c.attachedTo && cardsToRemoveIds.includes(c.attachedTo)) {
                return { ...c, attachedTo: null, zone: 'battlefield' };
              }
              return c;
            });
          } else {
            // Fallback: If strict match failed (shouldn't happen, but safety), delete target by ID
            console.warn('Strict match failed, falling back to single delete');
            logAction(`Removed ${targetCard.name}`);
            newCards = newCards.map(c => {
              if (c.id === targetCard.id) return null;
              if (c.attachedTo === targetCard.id) return { ...c, attachedTo: null, zone: 'battlefield' };
              return c;
            }).filter(Boolean);
          }

        } else {
          // Single card deletion fallback (delete by specific ID)
          logAction(`Removed ${targetCard.name}`);
          newCards = newCards.map(c => {
            if (c.id === targetCard.id) return null; // Delete target
            if (c.attachedTo === targetCard.id) {
              // Distinguish between Aura and Equipment
              const isAura = c.type_line && c.type_line.toLowerCase().includes('aura');
              if (isAura) {
                return null; // Auras are removed when host leaves
              }
              // Equipment stays on battlefield
              return { ...c, attachedTo: null, zone: 'battlefield' };
            }
            return c;
          }).filter(Boolean);
        }



        saveHistoryState(newCards);
        return;
      }
    } else if (action === 'unequip') {
      logAction(`Unequipped all from ${targetCard.name}`);
      newCards = newCards.map(c => {
        if (c.attachedTo === targetCard.id) {
          return { ...c, attachedTo: null, zone: 'battlefield' };
        }
        return c;
      });
      saveHistoryState(newCards);
      return;
    } else if (action === 'unequip-self') {
      logAction(`Unequipped ${targetCard.name}`);
      newCards = newCards.map(c => {
        if (c.id === targetCard.id) {
          return { ...c, attachedTo: null, zone: 'battlefield' };
        }
        return c;
      });
      saveHistoryState(newCards);
      return;
    } else if (action === 'equip') {
      // Start Targeting Mode
      setTargetingMode({
        active: true,
        sourceId: targetCard.id,
        action: 'equip',
        mode: 'single',
        selectedIds: []
      });
      return;
    } else {
      // Delegate to GameEngine for actions that support replacement effects (counters, tapping)
      if (['counter+', 'counter-', 'counter-update', 'tap'].includes(action) && gameEngineRef.current) {
        // Handle multiple cards in a stack
        if (deleteCount > 1) {
          // Find all cards in the stack with the same name, zone, and state
          const stackCards = cards.filter(c =>
            c.name === targetCard.name &&
            c.zone === targetCard.zone &&
            !c.attachedTo &&
            c.tapped === targetCard.tapped &&
            c.counters === targetCard.counters
          );

          // Apply action to the specified number of cards
          let processedCount = 0;
          let updatedCards = [...cards];

          for (const stackCard of stackCards) {
            if (processedCount >= deleteCount) break;

            const result = gameEngineRef.current.processAction(action, stackCard, updatedCards, recentCards);
            updatedCards = result.newCards;

            if (result.triggers) {
              result.triggers.forEach(t => addToStack(t.source, t.ability.description || 'Triggered', 'trigger', t));
            }

            processedCount++;
          }

          logAction(`${action === 'tap' ? 'Tapped/Untapped' : 'Modified counters on'} ${deleteCount} ${targetCard.name}(s)`);
          saveHistoryState(updatedCards);
          return;
        } else {
          // Single card action
          const result = gameEngineRef.current.processAction(action, targetCard, cards, recentCards);

          if (result.log.description) {
            logAction(result.log.description);
          }

          if (result.triggers) {
            result.triggers.forEach(t => addToStack(t.source, t.ability.description || 'Triggered', 'trigger', t));
          }

          saveHistoryState(result.newCards);
          return;
        }
      }

      // Standard updates for other actions (e.g. Copy)
      newCards = newCards.map(c => {
        if (c.id !== targetCard.id) return c;

        // Fallback or specific non-engine actions
        switch (action) {
          default:
            return c;
        }
      });

      if (action === 'copy') {
        const copy = { ...targetCard, id: Date.now() + Math.random(), name: targetCard.name + ' (Copy)', isToken: true };
        newCards.push(copy);
        logAction(`Copied ${targetCard.name}`);
      }

      saveHistoryState(newCards);
    };
  };

  const handleAddCard = (def, count = 1) => {
    // 1. Close UI immediately to trigger layout reset
    setActivePanel(null); // Close the panel
    setPreviewCard(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchOverlay(false); // Reset overlay state
    // 2. Defer card addition slightly to allow ResizeObserver to catch the new layout size
    setTimeout(() => {
      let currentCards = [...cards];
      const addedCards = [];

      // Create multiple cards if count > 1
      for (let i = 0; i < count; i++) {
        // --- Aura Handling ---
        const isAura = def.type_line && def.type_line.toLowerCase().includes('aura');
        if (isAura) {
          // Auras require targeting upon entry
          const parsed = parseOracleText(def);
          startTargetingMode({
            action: 'enchant',
            sourceId: null, // New card doesn't have an ID yet
            data: { ...def, auraTarget: parsed.auraTarget },
            mode: 'single'
          });
          logAction(`Cast ${def.name}, select a target...`);
          return; // Stop processing for this card - targeting will finish it
        }

        const newCard = createBattlefieldCard(def, {}, { cards: currentCards, gameEngineRef });
        currentCards = [...currentCards, newCard];
        addedCards.push(newCard);

        // Process ETB Triggers for each card
        if (gameEngineRef.current) {
          gameEngineRef.current.updateBattlefield(currentCards); // Ensure engine has latest state
          const etbTriggers = gameEngineRef.current.processEntersBattlefield(newCard);
          etbTriggers.forEach(t => {
            let description = t.ability.description;
            if (!description) {
              if (t.ability.trigger === 'on_token_enter_battlefield') {
                description = `${t.source.name}: Token entered`;
              } else {
                description = `When ${t.source.name} enters: ${t.ability.effect}`;
              }
            }
            addToStack(t.source, description, t.ability.trigger || 'on_enter_battlefield', t);
          });
        }
      }

      // Save the final batch state to history
      saveHistoryState(currentCards);

      // Add to Recent Cards (if not already there by name)
      setRecentCards(prev => {
        if (prev.some(c => c.name === def.name)) return prev;
        return [def, ...prev].slice(0, 10); // Keep last 10
      });

      // Auto-Fetch Tokens and Add to Recents
      // Use the first card from the batch for token fetching
      const referenceCard = addedCards[0];
      if (def.all_parts || def.scryfall_id) {
        const tokenFetchPromise = def.all_parts
          ? fetchRelatedTokens(def)
          : getScryfallCard(def.name).then(fetchRelatedTokens);

        tokenFetchPromise.then(tokens => {
          if (tokens && tokens.length > 0) {
            // Update the main cards on the battlefield with these tokens
            const addedIds = addedCards.map(c => c.id);
            setCards(current => current.map(c =>
              addedIds.includes(c.id) ? { ...c, relatedTokens: tokens } : c
            ));

            setRecentCards(prev => {
              const newTokens = tokens.filter(t => !prev.some(p => p.name === t.name));
              if (newTokens.length === 0) return prev;
              return [...newTokens, ...prev].slice(0, 20);
            });
            logAction(`Added ${tokens.length} related token(s) to recents`);
          }
        }).catch(err => console.warn('Failed to auto-fetch tokens', err));
      }

      logAction(`Added ${count} ${def.name}(s)`);
    }, 50); // 50ms is enough for React to render the "closed" state and ResizeObserver to fire
  };

  const handleAddToRecents = (def) => {
    // Add to Recent Cards (if not already there by name)
    setRecentCards(prev => {
      if (prev.some(c => c.name === def.name)) return prev;
      return [def, ...prev].slice(0, 10); // Keep last 10
    });

    // Reset Search UI but keep panel open to show updated recent list
    setPreviewCard(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchOverlay(false); // Go back to the list view within the panel
  };

  const handleDeleteRecent = (index) => {
    setRecentCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoadPreset = async (presetName) => {
    if (loadingPreset) return;
    setLoadingPreset(presetName);

    const preset = PRESETS[presetName];
    const cardNames = preset.cards || [];
    // We don't add them to battlefield, just to recents

    // Process sequentially to keep order
    for (const name of cardNames) {
      try {
        // 1. Try to find in LOCAL data first (for custom cards like Ouroboroid)
        // Normalize name for check (case insensitive)
        // cardData here refers to the top-level module variable
        const localCard = cardData.find(c => c.name.toLowerCase() === name.toLowerCase());

        if (localCard) {
          // Found locally, skip Scryfall
          const def = localCard;

          setRecentCards(prev => {
            if (prev.some(c => c.name === def.name)) return prev;
            return [def, ...prev].slice(0, 20);
          });
          continue;
        }

        // 2. Fallback to Scryfall
        // Renaming to avoid shadowing the top-level cardData variable
        let scryfallData = await getScryfallCard(name);
        if (scryfallData) {
          const formatted = formatScryfallCard(scryfallData);
          setRecentCards(prev => {
            if (prev.some(c => c.name === formatted.name)) return prev;
            return [formatted, ...prev].slice(0, 20); // Increased limit due to presets
          });
        }
      } catch (e) {
        console.error(`Failed to load preset card ${name}:`, e);
      }
    }

    setLoadingPreset(null);
  };

  const handleActivateAbility = (card, abilityDef) => {
    // 0. SPECIAL HANDLING: Manual Ability Definitions (from JSON) with requiresTarget flag
    if (abilityDef.requiresTarget) {
      startTargetingMode({
        sourceId: card.id,
        action: 'activate-ability',
        mode: 'single',
        data: abilityDef
      });
      return;
    }

    // 1. CHECK IF THIS ABILITY NEEDS A TARGET (from parsed or manual definition)
    // This MUST come before direct execution to ensure targeting mode is triggered
    const needsTarget = abilityDef.target && abilityDef.target.includes('target');

    if (needsTarget) {
      let type = 'permanent';
      if (abilityDef.target.includes('creature')) type = 'creature';

      startTargetingMode({
        sourceId: card.id,
        action: 'activate-ability',
        mode: 'single',
        data: {
          ...abilityDef,
          targetType: type
        }
      });
      return;
    }

    // 2. If it's a manual effect code (no spaces) and no target required, execute directly
    if (abilityDef.effect && !abilityDef.effect.includes(' ') && gameEngineRef.current) {
      try {
        const abilityObj = {
          trigger: 'activated',
          effect: abilityDef.effect,
          description: abilityDef.description || abilityDef.effect,
          target: abilityDef.target || 'self'
        };

        const triggerObj = gameEngineRef.current.resolveEffect({
          source: card,
          ability: abilityObj
        });
        addToStack(card, `Activated: ${abilityObj.description}`, 'activated', triggerObj);
        return;
      } catch (e) {
        console.warn("Manual execution failed, trying parse fallback", e);
      }
    }

    // 3. Try to parse the effect text (fallback for raw oracle text)
    const effects = extractEffects(abilityDef.effect);

    if (!effects || effects.length === 0) {
      console.warn("No effects parsed");
      return;
    }

    // 4. Use the first parsed effect
    const parsedEffect = effects[0];

    // Check if the parsed effect requires a target (fallback for raw text parsing)
    if (parsedEffect.target && parsedEffect.target.includes('target')) {
      let type = 'permanent';
      if (parsedEffect.target.includes('creature')) type = 'creature';

      startTargetingMode({
        sourceId: card.id,
        action: 'activate-ability',
        mode: 'single',
        data: {
          ...parsedEffect,
          targetType: type
        }
      });
      return;
    }

    // 5. Construct an ability object compatible with GameEngine (no target needed)
    const abilityObj = {
      trigger: 'activated',
      effect: parsedEffect.effect,
      target: parsedEffect.target || 'self',
      amount: parsedEffect.amount,
      tokenName: parsedEffect.tokenName,
      tokenProps: parsedEffect.tokenProps,
      description: abilityDef.original || abilityDef.effect
    };

    // 6. Resolve and Add to Stack
    if (gameEngineRef.current) {
      try {
        const triggerObj = gameEngineRef.current.resolveEffect({
          source: card,
          ability: abilityObj
        });

        // Log it
        addToStack(card, `Activated: ${abilityObj.description}`, 'activated', triggerObj);
      } catch (e) {
        console.error("Failed to resolve activated ability:", e);
      }
    }
  };

  // --- Search Logic ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchScryfall(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSearchResult = async (name) => {
    setIsSearching(true);
    setSearchResults([]); // Clear list so preview renders
    try {
      const fetchedCardData = await getScryfallCard(name);
      const formatted = formatScryfallCard(fetchedCardData);
      setPreviewCard(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResolveWithTargeting = (ability) => {
    // Attempt to resolve, check if targeting is needed
    const result = resolveStackAbility(ability, recentCards, startTargetingMode);

    if (result && result.needsTargeting) {
      // Get the source card
      const sourceCard = cards.find(c => c.id === ability.sourceId);
      if (!sourceCard) return;

      // Determine target type from ability
      const abilityDef = ability.triggerObj.ability;
      const targetSpec = abilityDef.target || 'creature';

      // Parse target type from the target spec
      let targetType = 'permanent'; // Default to any permanent
      if (targetSpec.includes('creature')) {
        targetType = 'creature';
      } else if (targetSpec.includes('nonland_permanent') || targetSpec.includes('nonland')) {
        targetType = 'nonland_permanent';
      }

      // Start targeting mode with the ability stored in data
      startTargetingMode({
        sourceId: sourceCard.id,
        action: 'resolve-trigger',
        mode: 'single',
        data: {
          stackAbility: ability,
          targetType: targetType,
          targetSpec: targetSpec // Pass full spec for advanced filtering
        }
      });
    }
  };

  const handleBgClick = (e) => {
    if (e.target === battlefieldRef.current || e.target.classList.contains('battlefield-bg')) {
      if (activePanel !== 'add') {
        setActivePanel(null);
      }
      // Stop Selecting card when clicking anywhere else
      setSelectedCard(null);
    }
  };

  // --- Render ---

  // Unified Eligibility Check
  const isCardEligible = (c) => {
    if (!targetingMode.active) return false;
    if (targetingMode.sourceId === c.id) return false;
    if (targetingMode.action === 'declare-attackers') {
      const isCreature = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature'));
      // Allow clicking even if already selected to enable deselect/reselect-count
      return isCreature && !c.tapped;
    }
    if (targetingMode.action === 'equip') return c.type === 'Creature';
    if (targetingMode.action === 'activate-ability' || targetingMode.action === 'resolve-trigger') {
      const targetType = targetingMode.data?.targetType || 'creature';
      const targetSpec = targetingMode.data?.targetSpec || '';
      // Also check the ability's target property directly (for activated abilities)
      const abilityTarget = targetingMode.data?.target || '';

      // Handle nonland permanent targeting (e.g., Extravagant Replication)
      if (targetType === 'nonland_permanent' || targetSpec.includes('nonland') || abilityTarget.includes('nonland')) {
        const isLandCard = c.type_line?.toLowerCase().includes('land');
        return !isLandCard; // Allow any permanent except lands
      }

      // Handle creature targeting (including "another target creature you control" for Orthion)
      if (targetType.toLowerCase() === 'creature' || abilityTarget.includes('creature')) {
        const isCreatureCard = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')) || c.isToken;
        if (targetingMode.action === 'resolve-trigger') {
          const stackAbilityTarget = targetingMode.data?.stackAbility?.triggerObj?.ability?.target || '';
          if (stackAbilityTarget.includes('attacking')) return isCreatureCard && c.attacking;
        }
        return isCreatureCard;
      }
      return true;
    }
    if (targetingMode.action === 'enchant') {
      const auraTarget = targetingMode.data?.auraTarget;
      if (!auraTarget || auraTarget.includes('permanent')) return true;
      if (auraTarget.includes('creature')) return isCreature(c);
      if (auraTarget.includes('land')) return isLand(c);
      if (auraTarget.includes('planeswalker')) return c.type_line?.toLowerCase().includes('planeswalker');
      return true;
    }
    if (targetingMode.action === 'remove-to-zone') return true;
    return false;
  };

  const creatures = visibleStacks.filter(g => isCreature(g.leader));
  // Keep lands for count but DO NOT render them in main view anymore
  const lands = visibleStacks.filter(g => isMinimalDisplayLand(g.leader));
  const permanents = visibleStacks.filter(g => !isCreature(g.leader) && !isMinimalDisplayLand(g.leader));
  const nonCreatures = [...permanents]; // Removed lands from display

  // Calculate Land Count for Badge
  const landCount = cards.filter(c => c.zone === 'battlefield' && isLand(c)).length;

  return (
    <div
      className="flex flex-col h-screen w-full text-white overflow-hidden relative selection-none touch-none"
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

      {/* Triggered Ability Stack (Overlay) */}
      {!selectedCard && (
        <TriggeredAbilityStack
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

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex flex-col pt-16 pb-0 overflow-hidden">
        {/* Top Half: Creatures */}
        <div className="flex-1 relative min-h-0">
          <CreatureList
            creatures={creatures}
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
              logAction(`${actionLabel} ${count} ${selectedCard?.name || 'creature'}(s)`);
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
              const eligible = isCardEligible(card);
              return {
                isSelected: selectedCard?.id === card.id,
                stackCards: stackCards,
                attachments: attachments,
                isTargeting: targetingMode.active && targetingMode.mode === 'single',
                isEligibleAttacker: targetingMode.active && eligible,
                isDeclaredAttacker: targetingMode.active && targetingMode.selectedIds?.includes(card.id),
                isSource: targetingMode.active && targetingMode.sourceId === card.id,
                isValidTarget: false,
                selectedCount: targetingMode.active ? targetingMode.selectedIds.filter(id => stackCards.some(c => c.id === id)).length : 0,
                onMouseDown: (e) => {
                  if (targetingMode.active) {
                    e.stopPropagation();
                    if (eligible) {
                      if (targetingMode.mode === 'multiple') handleMultiSelect(card);
                      else handleTargetSelection(card);
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

        {/* Bottom Half: Permanents Only (No Lands) */}
        <div className="flex-1 relative min-h-0">
          <PermanentList
            permanents={nonCreatures} // Now excludes lands
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
              const eligible = isCardEligible(card);
              return {
                isSelected: selectedCard?.id === card.id,
                stackCards: stackCards,
                attachments: attachments,
                isTargeting: targetingMode.active && targetingMode.mode === 'single',
                isEligibleAttacker: targetingMode.active && eligible,
                isDeclaredAttacker: false,
                isSource: targetingMode.active && targetingMode.sourceId === card.id,
                selectedCount: 0,
                onMouseDown: (e) => {
                  if (targetingMode.active) {
                    e.stopPropagation();
                    if (eligible) {
                      if (targetingMode.mode === 'multiple') handleMultiSelect(card);
                      else handleTargetSelection(card);
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
      {selectedCard ? (
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
      ) : targetingMode.active ? (
        <ConfirmOverlay
          isVisible={true}
          mode={targetingMode.action}
          eligibleTargets={cards.filter(c => c.zone === 'battlefield' && isCardEligible(c))}
          selectedIds={targetingMode.selectedIds || []}
          sourceCard={targetingMode.sourceId ? cards.find(c => c.id === targetingMode.sourceId) : null}
          allCards={cards}
          onSelectCard={(cardId) => {
            const card = cards.find(c => c.id === cardId);
            if (card) {
              if (targetingMode.mode === 'multiple') {
                handleMultiSelect(card);
              } else {
                handleTargetSelection(card);
              }
            }
          }}
          onSelectAll={handleToggleSelectAll}
          onConfirm={targetingMode.action === 'declare-attackers' ? handleConfirmAttackers : () => { }}
          onCancel={cancelTargeting}
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