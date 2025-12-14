import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Plus, Minus, Copy, Trash2, RotateCcw,
  History, Zap, Skull, Mountain, Hexagon, Sparkles, Ghost, User, Ban, Sword, ArrowLeft, ArrowRight, Play, CheckCircle, Search, ShieldOff
} from 'lucide-react';

// Load card data from consolidated JSON file
import cardData from './data/scryfall_cards.json';

import GameEngine from './utils/gameEngine';
import { TopBanner, ArtWindow, BottomBanner, PowerToughnessBanner } from './components/RedesignedCardFrame';
import { formatBigNumber } from './utils/formatters';
import { getCardAbilities, extractActivatedAbilities, extractEffects, parseOracleText } from './utils/keywordParser';
import { searchScryfall, getScryfallCard, formatScryfallCard, fetchRelatedTokens } from './utils/scryfallService';
import TriggeredAbilityStack from './components/TriggeredAbilityStack';
import AddCardPanel from './components/AddCardPanel';
import HistoryPanel from './components/HistoryPanel';
import SelectedCardPanel from './components/SelectedCardPanel';

import AttackerConfirmOverlay from './components/AttackerConfirmOverlay';
import ZoneIndicators from './components/ZoneIndicators';
import PhaseTracker from './components/PhaseTracker';
import BattlefieldCard from './components/BattlefieldCard';
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
  'Ouroboroid Season': ['Ouroboroid', 'Doubling Season', 'Orthion, Hero of Lavabrink', 'Finale of Devastation']
};

// --- Helper Functions ---

const getTypeFromTypeLine = (typeLine) => {
  if (!typeLine) return 'Other';
  const primary = typeLine.split(' — ')[0];
  const candidates = primary.split(' ');
  const knownTypes = ['Creature', 'Enchantment', 'Artifact', 'Planeswalker', 'Instant', 'Sorcery', 'Land'];
  return candidates.find(t => knownTypes.includes(t)) || candidates[0];
};

const createBattlefieldCard = (cardDef, extra = {}) => {
  const type = getTypeFromTypeLine(cardDef.type_line);

  // Check for local overrides in cardData
  const localDef = cardData.find(c => c.name === cardDef.name);
  const mergedDef = localDef ? { ...cardDef, ...localDef } : cardDef;

  // Use the parser to get abilities and replacement effects dynamically
  // If the card was previously parsed (_parsed flag), force a re-parse to ensure we use the latest parser logic
  // This fixes stale ability data from cached Recent Cards
  const parseDef = mergedDef._parsed ? { ...mergedDef, abilities: null } : mergedDef;
  const { abilities, replacementEffects } = getCardAbilities(parseDef);

  return {
    id: Date.now() + Math.random(),
    name: mergedDef.name,
    type,
    type_line: mergedDef.type_line,
    power: mergedDef.power !== '' ? parseInt(mergedDef.power) || undefined : undefined,
    toughness: mergedDef.toughness !== '' ? parseInt(mergedDef.toughness) || undefined : undefined,
    oracle_text: mergedDef.oracle_text || '',
    colors: mergedDef.colors || [],
    art_crop: mergedDef.art_crop || '',
    image_normal: mergedDef.image_normal || '',
    counters: 0,
    tapped: false,
    zone: 'battlefield', // Default zone
    attachedTo: null, // ID of card this is attached to
    abilities: abilities || [],
    replacementEffects: replacementEffects || [],
    ...extra,
  };
};



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
    logAction, saveHistoryState, undo,
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


  const battlefieldRef = useRef(null);

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
      const key = `${card.name}|${card.power}|${card.toughness}|${card.tapped}|${card.counters}|${card.faceDown || false}|${card.type_line}|${card.isToken}|[${attachmentKey}]`;

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
    const rect = battlefieldRef.current.getBoundingClientRect();
    const containerWidth = rect.width || window.innerWidth;
    const containerHeight = rect.height || window.innerHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const positions = {};

    // Group cards by category using STACKS
    // Use type_line for flexible matching (e.g. "Artifact Creature" goes to creatures, "Token Creature" goes to creatures)
    const isCreature = (c) => c.type_line && c.type_line.toLowerCase().includes('creature');
    const isLand = (c) => c.type_line && c.type_line.toLowerCase().includes('land') && !isCreature(c); // Dryad Arbor goes to creatures? Usually treating creatures as creatures is safer for combat UI.

    const lands = visibleStacks.filter(g => isLand(g.leader));
    const creatures = visibleStacks.filter(g => isCreature(g.leader));
    const others = visibleStacks.filter(g => !isLand(g.leader) && !isCreature(g.leader));

    // Helper to position a row of cards
    const layoutRow = (items, yPos) => {
      const count = items.length;
      if (count === 0) return;
      const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;
      const startX = centerX - totalWidth / 2;

      items.forEach((group, index) => {
        positions[group.leader.id] = {
          id: group.leader.id,
          x: startX + index * (CARD_WIDTH + CARD_GAP),
          y: yPos
        };
      });
    };

    // Define Rows (Y positions)
    // Visual Order (Top to Bottom): Creatures -> Others -> Lands

    // Creatures at Top
    layoutRow(creatures, centerY - 250);

    // Others (Artifacts/Enchantments) under creatures
    layoutRow(others, centerY - 20);

    // Lands at bottom
    layoutRow(lands, centerY + 200);

    // Fallback/Overflow handling would be needed for many cards, but simple rows for now.

    return positions;
  }, [visibleStacks, cards, activePanel, showSearchOverlay]);

  // --- Actions (using hooks with local wrappers) ---

  // Wrap phase change to add triggers to stack with position sorting
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
    }
  };

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

  const handleCardAction = (action, specificCard = null, deleteCount = 1) => {
    const targetCard = specificCard;
    if (!targetCard) return;

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
              // Detach attached cards
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
      if (['counter+', 'counter-', 'tap'].includes(action) && gameEngineRef.current) {
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

  const handleAddCard = (def) => {
    // 1. Close UI immediately to trigger layout reset
    setPreviewCard(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchOverlay(false); // Reset overlay state
    // 2. Defer card addition slightly to allow ResizeObserver to catch the new layout size
    setTimeout(() => {
      const newCard = createBattlefieldCard(def);

      // Save current state to history before making changes
      const newCards = [...cards, newCard];
      saveHistoryState(newCards);

      // Process ETB Triggers
      if (gameEngineRef.current) {
        const etbTriggers = gameEngineRef.current.processEntersBattlefield(newCard);
        etbTriggers.forEach(t => {
          const description = t.ability.description ||
            `When ${t.source.name} enters: ${t.ability.effect}`;
          addToStack(t.source, description, 'on_enter_battlefield', t);
        });
      }

      // Add to Recent Cards (if not already there by name)
      setRecentCards(prev => {
        if (prev.some(c => c.name === def.name)) return prev;
        return [def, ...prev].slice(0, 10); // Keep last 10
      });

      // Auto-Fetch Tokens and Add to Recents
      // We do this after the main card is added to not block UI
      if (def.all_parts || def.scryfall_id) {
        // If we have all_parts, use it directly. If not, we might need to fetch (but we updated formatScryfallCard)
        // def should have all_parts now if it came from our service.
        // If it was a manually constructed object or old preset, it might not.
        const tokenFetchPromise = def.all_parts
          ? fetchRelatedTokens(def)
          : getScryfallCard(def.name).then(fetchRelatedTokens);

        tokenFetchPromise.then(tokens => {
          if (tokens && tokens.length > 0) {
            // Update the main card on the battlefield with these tokens
            setCards(current => current.map(c =>
              c.id === newCard.id ? { ...c, relatedTokens: tokens } : c
            ));

            setRecentCards(prev => {
              // Filter out tokens already in list
              const newTokens = tokens.filter(t => !prev.some(p => p.name === t.name));
              if (newTokens.length === 0) return prev;
              // Add new tokens to the TOP of the list (or after the main card?)
              // User asked for them to be added. Top is fine.
              return [...newTokens, ...prev].slice(0, 20); // Increase limit to accommodate tokens
            });
            logAction(`Added ${tokens.length} related token(s) to recents`);
          }
        }).catch(err => console.warn('Failed to auto-fetch tokens', err));
      }

      logAction(`Added ${newCard.name}`);
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

    const cardNames = PRESETS[presetName];
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
    // 0. SPECIAL HANDLING: Manual Ability Definitions (from JSON)
    if (abilityDef.requiresTarget) {
      startTargetingMode({
        sourceId: card.id,
        action: 'activate-ability',
        mode: 'single',
        data: abilityDef
      });
      return;
    }

    // If it's a manual effect code (no spaces) but no target required, execute directly
    if (abilityDef.effect && !abilityDef.effect.includes(' ') && gameEngineRef.current) {
      try {
        const abilityObj = {
          trigger: 'activated',
          effect: abilityDef.effect,
          description: abilityDef.description || abilityDef.effect,
          target: abilityDef.targetType || 'self'
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

    // 1. Try to parse the effect text
    const effects = extractEffects(abilityDef.effect);

    if (!effects || effects.length === 0) {
      // Can't parse, just log (already done by onClick)
      return;
    }

    // 2. Use the first parsed effect
    const parsedEffect = effects[0];

    // 3. Construct an ability object compatible with GameEngine
    const abilityObj = {
      trigger: 'activated', // Special type for engine? Engine doesn't care about trigger type for execution usually
      effect: parsedEffect.effect,
      target: parsedEffect.target || 'self',
      amount: parsedEffect.amount,
      tokenName: parsedEffect.tokenName,
      tokenProps: parsedEffect.tokenProps,
      description: abilityDef.effect
    };

    // 4. Resolve and Add to Stack
    if (gameEngineRef.current) {
      try {
        const triggerObj = gameEngineRef.current.resolveEffect({
          source: card,
          ability: abilityObj
        });

        // Add to stack
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

  const handleBgClick = (e) => {
    if (e.target === battlefieldRef.current || e.target.classList.contains('battlefield-bg')) {
      if (activePanel !== 'add') {
        setActivePanel(null);
      }
    }
  };

  // --- Render ---

  return (
    <div
      className="w-full h-screen bg-slate-900 flex flex-col overflow-hidden select-none relative"
    >
      {/* Header */}
      <div className="bg-slate-900 p-4 border-b border-slate-700 flex-shrink-0 z-50">
        <div className="flex justify-end items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activePanel === 'history' ? 'bg-amber-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
            >
              <History size={16} /> History
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'add' ? null : 'add')}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activePanel === 'add' ? 'bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>


      {/* Targeting Mode Cancel Banner */}
      {
        targetingMode.active && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-200">
            <button
              onClick={cancelTargeting}
              className="bg-slate-800 border border-slate-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 hover:bg-slate-700 transition-colors"
            >
              <span className="text-blue-400 font-bold">
                {targetingMode.action === 'remove-to-zone' ? 'Select Zone' : 'Targeting Mode'}
              </span>
              <span className="text-gray-400 text-sm">Esc to Cancel</span>
            </button>
          </div>
        )
      }

      {/* Triggered Ability Stack - Right side overlay */}
      <TriggeredAbilityStack
        items={abilityStack}
        onResolve={resolveStackAbility}
        onRemove={removeFromStack}
        onResolveAll={resolveAllStack}
        onClear={clearStack}
        onReorder={setAbilityStack}
        isCollapsed={isStackCollapsed}
        onToggleCollapse={() => setIsStackCollapsed(prev => !prev)}
      />

      {/* Battlefield */}
      <div
        ref={battlefieldRef}
        className="flex-1 relative battlefield-bg overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px',
          backgroundColor: '#0f172a' // slate-900
        }}
        onClick={handleBgClick}
      >
        {/* Empty State Message */}
        {visibleStacks.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-gray-500 font-medium mb-2">Battlefield Empty</div>
            <div className="text-gray-600 text-sm">Add a card to begin</div>
          </div>
        )}

        {/* Zone Indicators - Left Side */}
        <ZoneIndicators
          graveyardCount={cards.filter(c => c.zone === 'graveyard').length}
          exileCount={cards.filter(c => c.zone === 'exile').length}
          isTargetingZone={targetingMode.active && targetingMode.action === 'remove-to-zone'}
          onZoneClick={handleZoneSelection}
        />


        {/* Unified Card Rendering with Stacking */}
        {visibleStacks.map(group => {
          const card = group.leader;
          const pos = cardPositions[card.id];

          // Use leader's position - fallback to center if missing
          const x = pos ? pos.x : 100;
          const y = pos ? pos.y : 100;

          // Targeting Logic
          // Unified Eligibility Check
          const isCardEligible = (c) => {
            if (!targetingMode.active) return false;

            // Check Source (can't target self usually)
            if (targetingMode.sourceId === c.id) return false;

            // Mode check
            if (targetingMode.action === 'declare-attackers') {
              const isCreature = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature'));
              // Allow clicking even if already selected to enable deselect/reselect-count
              return isCreature && !c.tapped;
            }
            if (targetingMode.action === 'equip') {
              return c.type === 'Creature';
            }
            if (targetingMode.action === 'activate-ability') {
              // Check specific target type from ability definition
              const targetType = targetingMode.data?.targetType || 'creature';
              if (targetType.toLowerCase() === 'creature') {
                // Robust creature check
                return c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')) || c.isToken;
              }
              // Add more types here as needed (e.g. 'permanent', 'artifact')
              return true; // Default to allow if unsure
            }
            if (targetingMode.action === 'remove-to-zone') {
              return true;
            }
            return false;
          };

          const isSource = targetingMode.active && targetingMode.sourceId === card.id;
          const isValidTarget = isCardEligible(card); // Now behaves same as isEligibleAttacker for visuals if we map it

          // Attachments need to search across ALL cards to find ones attached to THIS stack leader
          // But wait, if we have 5 Bears, and one has a Sword..
          // The "attached" card isn't in visibleRawCards, so it's not in the stack logic. It's safe.
          // But visually, we only render attachments for the 'leader'.
          // If the user equipped the Sword to Bear #3 (not leader), it might be weird.
          // But our stacking logic splits stacks if state differs.
          // "attachedTo" is part of the state? NO, I removed it from 'key' in step 1 patch above because "attachedTo" checks what THIS card attaches TO.
          // But verifying: Does a card know what is attached TO IT? No, we filter `cards.filter(c => c.attachedTo === card.id)`.
          // So if Bear A has Sword attached, and Bear B has nothing.
          // Bear A and Bear B look identical (same power/toughness/name).
          // But functionally they are different.
          // We should probably check if `cards` has any attachments pointing to them.
          // For now, let's assume tokens are vanilla. If you equip one, they are technically visually identical
          // but we might want to split them?
          // Actually, if we just render attachments for the leader, and they're stacked...
          // It just looks like the stack has the sword. Which is fine if they're all equipped?
          // But if only 1 is equipped...
          // Let's settle for basic stacking for now. User asked for high volume tokens (Helm copies), which are usually identical.
          // If you equip one, it's a specific action.

          const attachments = cards.filter(c => c.attachedTo === card.id);

          return (
            <BattlefieldCard
              key={card.id}
              card={card}
              x={x}
              y={y}
              count={group.count}
              stackCards={group.cards}
              isSelected={selectedCard?.id === card.id}
              isTargeting={targetingMode.active && targetingMode.mode === 'single'}
              isEligibleAttacker={isCardEligible(card)}
              isDeclaredAttacker={
                targetingMode.active &&
                targetingMode.selectedIds?.includes(card.id)
              }
              isSource={isSource}

              isValidTarget={false} // Disable old red ring, use isEligibleAttacker for Blue styling
              attachments={attachments}
              selectedCount={targetingMode.active ? targetingMode.selectedIds.filter(id => group.cards.some(c => c.id === id)).length : 0}
              onMouseDown={(e) => {
                if (targetingMode.active) {
                  e.stopPropagation();
                  // Check eligibility using our unified helper
                  const eligible = isCardEligible(card);
                  if (eligible) {
                    if (targetingMode.mode === 'multiple') {
                      handleMultiSelect(card);
                    } else {
                      handleTargetSelection(card);
                    }
                  }
                } else {
                  // Toggle card selection
                  if (selectedCard?.id === card.id) {
                    setSelectedCard(null);
                  } else {
                    setSelectedCard(card);
                  }
                }
              }}
              onAction={(action, cardVal, deleteCount) => {
                handleCardAction(action, cardVal, deleteCount);
              }}
              onStackSelectionChange={updateStackSelection}
            />
          );
        })}
      </div>

      {/* Info / Navigation Panel - Persistent Bottom Bar (Phases Only) */}
      <PhaseTracker
        isVisible={!activePanel}
        currentPhase={currentPhase}
        currentCombatStep={currentCombatStep}
        phaseInfo={PHASE_INFO}
        onPhaseChange={handlePhaseChange}
        onAdvancePhase={advancePhase}
        onAdvanceCombatStep={advanceCombatStep}
        onEndTurn={endTurn}
      />

      {/* --- Overlays & Panels --- */}

      {/* Selected Card Panel */}
      <SelectedCardPanel
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onActivateAbility={(card, ability) => {
          logAction(`Activated: ${ability.cost}`);
          handleActivateAbility(card, ability);
        }}
        stackCount={(() => {
          if (!selectedCard) return 1;
          const stack = visibleStacks.find(s => s.cards.some(c => c.id === selectedCard.id));
          return stack ? stack.count : 1;
        })()}
        stackCards={(() => {
          if (!selectedCard) return [];
          const stack = visibleStacks.find(s => s.cards.some(c => c.id === selectedCard.id));
          return stack ? stack.cards : [selectedCard];
        })()}
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

          // Update selectedCard to reflect the new counter value
          if (selectedCard) {
            const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id);
            if (updatedSelectedCard) {
              setSelectedCard(updatedSelectedCard);
            }
          }
        }}
      />

      {/* Confirm Attackers Overlay */}
      <AttackerConfirmOverlay
        isVisible={targetingMode.active && targetingMode.action === 'declare-attackers'}
        selectedCount={targetingMode.selectedIds?.length || 0}
        onConfirm={handleConfirmAttackers}
        onCancel={() => setTargetingMode({ active: false, sourceId: null, action: null, mode: 'single', selectedIds: [] })}
      />

      {/* Add Card Panel */}
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

      {/* History Panel */}
      <HistoryPanel
        isOpen={activePanel === 'history'}
        onClose={() => setActivePanel(null)}
        actionLog={actionLog}
        historyLength={history.length}
        onUndo={undo}
      />
    </div >
  );
};

export default App;