import { useCallback } from 'react';
import { parseOracleText, extractEffects } from '../utils/keywordParser';
import { createBattlefieldCard, isPlaceholderLand, BASIC_LAND_COLORS } from '../utils/cardUtils';
import { getScryfallCard, formatScryfallCard, fetchRelatedTokens } from '../utils/scryfallService';
import { trackCardUsage, checkAutoSaveCandidate } from '../utils/favorites';
import { toast } from 'react-hot-toast';
import { SIGNATURE_DATA } from '../data/signatureCards';
import cardData from '../data/scryfall_cards.json';

/**
 * Hook for card-related action handlers
 * Extracts card manipulation logic from App.jsx
 */
const useCardActions = ({
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

    // Targeting
    setTargetingMode,
    startTargetingMode
}) => {

    // Land Conversion Handler
    const handleLandConversion = useCallback((landType, count) => {
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
            setSelectedCard(landsToKeep[0]);
        }

        logAction(`Converted ${count} Land → ${landType}`);
        saveHistoryState([...cards.filter(c => !landsToConvert.some(l => l.id === c.id)), ...newLands]);
    }, [selectedCard, visibleStacks, cards, gameEngineRef, setCards, setSelectedCard, logAction, saveHistoryState]);

    // Main Card Action Handler
    const handleCardAction = useCallback((action, specificCard = null, deleteCount = 1) => {
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

                    const currentIdx = c.activeFaceIndex !== undefined ? c.activeFaceIndex : 0;
                    const nextIdx = (currentIdx + 1) % faces.length;
                    const newFace = faces[nextIdx];

                    return {
                        ...c,
                        activeFaceIndex: nextIdx,
                        name: newFace.name,
                        type_line: newFace.type_line,
                        oracle_text: newFace.oracle_text,
                        power: newFace.power,
                        toughness: newFace.toughness,
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
                abilityToTrigger = targetCard.abilities[0];
                description = abilityToTrigger.description || abilityToTrigger.type || 'Triggered ability';
            } else if (targetCard.oracle_text) {
                const parsed = parseOracleText(targetCard);
                if (parsed.triggers.length > 0) {
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

            addToStack(targetCard, description);
            return;
        }

        let newCards = [...cards];

        if (action === 'graveyard') {
            logAction(`${targetCard.name} sent to graveyard`);
            newCards = newCards.map(c => {
                if (c.id === targetCard.id) {
                    return { ...c, zone: 'graveyard', attachedTo: null };
                }
                if (c.attachedTo === targetCard.id) {
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
                    return { ...c, attachedTo: null, zone: 'battlefield' };
                }
                return c;
            });
        } else if (action === 'delete') {
            if (currentPhase) {
                setTargetingMode({
                    active: true,
                    sourceId: targetCard.id,
                    action: 'remove-to-zone',
                    mode: 'single',
                    selectedIds: []
                });
                setSelectedCard(null);
                return;
            } else {
                if (deleteCount > 1) {
                    console.log('Deleting stack:', targetCard.name, 'isToken:', targetCard.isToken, 'Count:', deleteCount);

                    const stackCards = newCards.filter(c =>
                        c.name === targetCard.name &&
                        c.zone === targetCard.zone &&
                        !c.attachedTo &&
                        c.tapped === targetCard.tapped &&
                        c.counters === targetCard.counters &&
                        !!c.isToken === !!targetCard.isToken
                    );

                    console.log('Matches found:', stackCards.length);

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
                                return null;
                            }
                            return c;
                        }).filter(Boolean);

                        newCards = newCards.map(c => {
                            if (c.attachedTo && cardsToRemoveIds.includes(c.attachedTo)) {
                                return { ...c, attachedTo: null, zone: 'battlefield' };
                            }
                            return c;
                        });
                    } else {
                        console.warn('Strict match failed, falling back to single delete');
                        logAction(`Removed ${targetCard.name}`);
                        newCards = newCards.map(c => {
                            if (c.id === targetCard.id) return null;
                            if (c.attachedTo === targetCard.id) return { ...c, attachedTo: null, zone: 'battlefield' };
                            return c;
                        }).filter(Boolean);
                    }
                } else {
                    logAction(`Removed ${targetCard.name}`);
                    newCards = newCards.map(c => {
                        if (c.id === targetCard.id) return null;
                        if (c.attachedTo === targetCard.id) {
                            const isAura = c.type_line && c.type_line.toLowerCase().includes('aura');
                            if (isAura) {
                                return null;
                            }
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
            const triggerObj = gameEngineRef.current?.resolveEffect({
                source: targetCard,
                ability: {
                    trigger: 'activated',
                    effect: 'equip',
                    target: 'creature',
                    description: `Equip ${targetCard.name}`,
                    requiresTarget: true
                }
            });

            if (triggerObj) {
                addToStack(targetCard, triggerObj.description, 'activated', triggerObj);
            }
            return;
        } else {
            // Delegate to GameEngine for counter/tap actions
            if (['counter+', 'counter-', 'counter-update', 'tap'].includes(action) && gameEngineRef.current) {
                if (deleteCount > 1) {
                    const stackCards = cards.filter(c =>
                        c.name === targetCard.name &&
                        c.zone === targetCard.zone &&
                        !c.attachedTo &&
                        c.tapped === targetCard.tapped &&
                        c.counters === targetCard.counters
                    );

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
        }
    }, [cards, setCards, setSelectedCard, logAction, saveHistoryState, addToStack, gameEngineRef, currentPhase, setTargetingMode, recentCards]);

    // Add Card Handler
    const handleAddCard = useCallback((def, count = 1) => {
        if (!def) return;
        setTimeout(() => {
            let currentCards = [...cards];
            const addedCards = [];

            for (let i = 0; i < count; i++) {
                const isAura = def.type_line && def.type_line.toLowerCase().includes('aura');
                if (isAura) {
                    const parsed = parseOracleText(def);
                    startTargetingMode({
                        action: 'enchant',
                        sourceId: null,
                        data: { ...def, auraTarget: parsed.auraTarget },
                        mode: 'single'
                    });
                    logAction(`Cast ${def.name}, select a target...`);
                    return;
                }

                const newCard = createBattlefieldCard(def, {}, { cards: currentCards, gameEngineRef });
                currentCards = [...currentCards, newCard];
                addedCards.push(newCard);

                // Auto-Save Logic (Favorites)
                try {
                    const stableId = def.id || def.oracle_id || def.name;
                    trackCardUsage(stableId);
                    const wasAutoSaved = checkAutoSaveCandidate({ ...def, id: stableId });

                    if (wasAutoSaved) {
                        toast.success(`${def.name} added to Favorites`, { icon: '♥', duration: 4000 });
                    }
                } catch (e) {
                    console.warn("Auto-save check failed", e);
                }

                if (gameEngineRef.current) {
                    gameEngineRef.current.updateBattlefield(currentCards);
                    const etbTriggers = gameEngineRef.current.processEntersBattlefield(newCard);
                    etbTriggers.forEach(t => {
                        if (t.ability.trigger === 'on_token_enter_battlefield') {
                            const abilityDef = t.ability;
                            const requiresManualTargeting = abilityDef.target &&
                                typeof abilityDef.target === 'string' &&
                                (abilityDef.target.includes('target') || abilityDef.target.includes('another')) &&
                                !abilityDef.targetIds;

                            if (!requiresManualTargeting) {
                                try {
                                    const result = t.execute(currentCards, recentCards);
                                    currentCards = result.newCards;

                                    const desc = t.ability.description || `${t.source.name}: Token entered`;
                                    logAction(`Auto-resolved: ${desc}`);

                                    if (result.triggers && result.triggers.length > 0) {
                                        result.triggers.forEach(idxT => {
                                            addToStack(idxT.source, idxT.ability.description || 'Triggered', 'trigger', idxT);
                                        });
                                    }
                                    return;
                                } catch (e) {
                                    console.warn("Failed to auto-resolve token trigger, falling back to stack:", e);
                                }
                            }
                        }

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

            saveHistoryState(currentCards);

            setRecentCards(prev => {
                if (prev.some(c => c.name === def.name)) return prev;
                return [def, ...prev].slice(0, 10);
            });

            const referenceCard = addedCards[0];
            if (def.all_parts || def.scryfall_id) {
                const tokenFetchPromise = def.all_parts
                    ? fetchRelatedTokens(def)
                    : getScryfallCard(def.name).then(fetchRelatedTokens);

                tokenFetchPromise.then(tokens => {
                    if (tokens && tokens.length > 0) {
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
        }, 50);
    }, [cards, setCards, gameEngineRef, logAction, saveHistoryState, addToStack, setRecentCards, startTargetingMode, recentCards]);

    // Add to Recents Handler
    const handleAddToRecents = useCallback((def) => {
        setRecentCards(prev => {
            if (prev.some(c => c.name === def.name)) return prev;
            return [def, ...prev].slice(0, 10);
        });

        setPreviewCard(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchOverlay(false);
    }, [setRecentCards, setPreviewCard, setSearchQuery, setSearchResults, setShowSearchOverlay]);

    // Delete Recent Handler
    const handleDeleteRecent = useCallback((index) => {
        setRecentCards(prev => prev.filter((_, i) => i !== index));
    }, [setRecentCards]);

    // Load Preset Handler - DISABLED
    const handleLoadPreset = useCallback(async (presetName) => {
        /* 
        if (loadingPreset) return;
        setLoadingPreset(presetName);

        const preset = PRESETS[presetName];
        const cardNames = preset.cards || [];

        for (const name of cardNames) {
            try {
                const localCard = cardData.find(c => c.name.toLowerCase() === name.toLowerCase());

                if (localCard) {
                    const def = localCard;
                    setRecentCards(prev => {
                        if (prev.some(c => c.name === def.name)) return prev;
                        return [def, ...prev].slice(0, 20);
                    });
                    continue;
                }

                let scryfallData = await getScryfallCard(name);
                if (scryfallData) {
                    const formatted = formatScryfallCard(scryfallData);
                    setRecentCards(prev => {
                        if (prev.some(c => c.name === formatted.name)) return prev;
                        return [formatted, ...prev].slice(0, 20);
                    });
                }
            } catch (e) {
                console.error(`Failed to load preset card ${name}:`, e);
            }
        }

        setLoadingPreset(null);
        */
        console.log('handleLoadPreset is currently disabled');
    }, []); // Removed dependencies since logic is commented out

    // Activate Ability Handler
    const handleActivateAbility = useCallback((card, abilityDef) => {
        if (abilityDef.isEquip || abilityDef.effect === 'equip' || abilityDef.effect === 'attach') {
            const triggerObj = gameEngineRef.current?.resolveEffect({
                source: card,
                ability: {
                    ...abilityDef,
                    trigger: 'activated',
                    requiresTarget: true,
                    effect: abilityDef.effect || 'equip',
                    description: abilityDef.description || `Equip ${card.name}`
                }
            });

            if (triggerObj) {
                addToStack(card, triggerObj.description, 'activated', triggerObj);
            }
            return;
        }

        if (abilityDef.requiresTarget) {

            const triggerObj = gameEngineRef.current?.resolveEffect({
                source: card,
                ability: {
                    trigger: 'activated',
                    effect: abilityDef.effect,
                    target: abilityDef.target,
                    description: abilityDef.description || abilityDef.effect
                }
            });

            if (triggerObj) {
                addToStack(card, `Activated: ${abilityDef.description || abilityDef.effect}`, 'activated', triggerObj);
            }
            return;
        }

        const needsTarget = abilityDef.target && abilityDef.target.includes('target');

        if (needsTarget) {
            let type = 'permanent';
            if (abilityDef.target.includes('creature')) type = 'creature';

            const triggerObj = gameEngineRef.current?.resolveEffect({
                source: card,
                ability: {
                    trigger: 'activated',
                    effect: abilityDef.effect,
                    target: abilityDef.target,
                    description: abilityDef.description || abilityDef.effect
                }
            });

            if (triggerObj) {
                addToStack(card, `Activated: ${abilityDef.description || abilityDef.effect}`, 'activated', triggerObj);
            }
            return;
        }

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

        const effects = extractEffects(abilityDef.effect);

        if (!effects || effects.length === 0) {
            console.warn("No effects parsed");
            return;
        }

        const parsedEffect = effects[0];

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

        const abilityObj = {
            trigger: 'activated',
            effect: parsedEffect.effect,
            target: parsedEffect.target || 'self',
            amount: parsedEffect.amount,
            tokenName: parsedEffect.tokenName,
            tokenProps: parsedEffect.tokenProps,
            description: abilityDef.original || abilityDef.effect
        };

        if (gameEngineRef.current) {
            try {
                const triggerObj = gameEngineRef.current.resolveEffect({
                    source: card,
                    ability: abilityObj
                });

                addToStack(card, `Activated: ${abilityObj.description}`, 'activated', triggerObj);
            } catch (e) {
                console.error("Failed to resolve activated ability:", e);
            }
        }
    }, [gameEngineRef, addToStack, startTargetingMode]);

    return {
        handleLandConversion,
        handleCardAction,
        handleAddCard,
        handleAddToRecents,
        handleDeleteRecent,
        handleLoadPreset,
        handleActivateAbility
    };
};

export default useCardActions;
