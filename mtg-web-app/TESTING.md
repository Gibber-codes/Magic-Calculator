# TESTING.md

Manual regression checklist for ComboCalc. Run relevant sections before merging engine changes, and run the full sheet before shipping to production. Every checkbox should reference a real card/interaction the tester can perform — no vague "check that combat works."

> **How to use with Claude Code:** ask Claude to walk through the sections its change touches and report pass/fail. For engine changes, always include §2, §3, §4 minimum.

---

## 1. Smoke test (~2 min)

- [ ] `npm run dev` starts without errors, HTTPS cert warning accepted
- [ ] App loads at `https://localhost:5173` — welcome screen visible
- [ ] Footer shows WotC disclaimer with correct wording
- [ ] Search "Lightning Bolt" from AddCardPanel — card appears, image loads with visible artist/copyright text
- [ ] Add a creature (e.g., "Serra Angel") to battlefield — renders correctly
- [ ] Click through Beginning → Main → Combat → Main 2 → End → next turn — no console errors
- [ ] `npm run lint` passes

---

## 2. Phase & combat flow

Test with 2 vanilla creatures (e.g., "Grizzly Bears", "Serra Angel") on battlefield.

- [ ] **Untap step** untaps all tapped creatures
- [ ] **Beginning of Combat** — creatures still untapped, no auto-attack
- [ ] **Declare Attackers** — tap a creature; it shows as attacking
- [ ] **Declare Blockers** — targeting mode active; selecting an attacker marks it as blocked
- [ ] **Combat Damage** — action log shows unblocked damage total in `formatBigNumber` format
- [ ] **End of Combat** — attacking/blocked flags cleared on turn transition
- [ ] **Skip phase** buttons work (chevron controls)
- [ ] **Auto-calculate** runs Beginning → Main → Combat → Main 2 and stops (does not roll into End step)
- [ ] Undo reverts phase state, not just card state
- [ ] Cleanup step: temporary P/T buffs expire

---

## 3. Triggered abilities & the stack

- [ ] **ETB trigger**: Play a card with an ETB (e.g., "Elvish Visionary" style). Trigger appears on LIFO stack.
- [ ] **Attack trigger / Battle cry**: Attack with a creature that has Battle cry. Other attacking creatures show +1/+0 in stat display.
- [ ] **Landfall**: Play a land. Any landfall triggers (e.g., "Scute Swarm", any card in `SIGNATURE_DATA` with `on_land_enter_battlefield`) appear on stack.
- [ ] **Token-entry trigger** (Wildwood Mentor–style): Create a token. Reactive triggers from other permanents fire.
- [ ] **Stack ordering**: Multiple simultaneous triggers appear sorted by battlefield position (right-to-left priority, resolves LIFO).
- [ ] **Stack resolution**: Resolve all — each trigger executes; `stackCount` and card stats update between resolutions.
- [ ] **Delayed triggers** ("at the beginning of the next end step"): Register during main phase, fire at end step, then removed (one-shot).
- [ ] **Signature card path**: A card in `SIGNATURE_DATA` uses its manual ability definition, NOT the parser output.

---

## 4. Replacement effects & BigInt math

This is the critical combo-math section — the whole reason the app exists.

- [ ] **Doubling Season + counters**: Add Doubling Season. Add a card that would put +1/+1 counters (e.g., an ETB counter card). Counters are doubled.
- [ ] **Doubling Season + tokens**: Add Doubling Season. Create tokens via an ability. Token count is doubled.
- [ ] **Mondrak, Glory Dominus** (passive voice token doubler): Verify token doubling triggers.
- [ ] **Vorinclex** (passive voice counter doubler): Verify counter doubling triggers.
- [ ] **Two doublers**: Doubling Season + Mondrak both on battlefield → tokens ×4 (2×2).
- [ ] **Three doublers**: Tokens ×8. Verify no UI freeze.
- [ ] **BigInt threshold crossing**: With ≥10 token doublers or repeated activations, verify `formatBigNumber` renders exponential notation (`1.2e15`-style) instead of freezing.
- [ ] **Physical token cap**: After 20+ tokens, virtual-stack representation kicks in (no 100 individual card objects in DOM).
- [ ] **Unblocked damage with virtual stack**: 1000 attacking 2/2s deal 2000 damage total (BigInt-accurate).

---

## 5. Card interactions

- [ ] **Add card** via search, favorites, recents — all three tabs work
- [ ] **Favorite toggle** on preview card persists across page reload
- [ ] **Remove card** from battlefield
- [ ] **Tap / untap** manually
- [ ] **+1/+1 counter** applied to a stack of N creatures affects the correct count via slider
- [ ] **-1/-1 counter** does not go below zero
- [ ] **Permanent P/T buff** persists through phases
- [ ] **Temporary P/T buff** ("until end of turn") expires at cleanup
- [ ] **Equipment attach** to a creature — bonus reflected in `calculateCardStats`
- [ ] **Aura attach** to a creature — bonus reflected
- [ ] **Land conversion** (basic land type change) works
- [ ] **X-cost modal**: Cast a card with X in mana cost; modal appears, X value applies

---

## 6. Scanner (BETA — expected failures documented)

Test on mobile device with real MTG cards, good lighting.

- [ ] Scanner button visible, opens modal
- [ ] Camera permission prompt appears on first use
- [ ] **Back camera** activates on mobile (not selfie)
- [ ] Video feed fills viewfinder
- [ ] Capture button responsive
- [ ] OCR completes within 5–10 seconds
- [ ] **Auto-scan stability**: card must be steady for 2 consecutive matches before auto-confirm (per `AUTO_CONFIRM_THRESHOLD`)
- [ ] Confirmation panel allows edit/remove per card
- [ ] Confirmed cards land on battlefield with correct name, power/toughness
- [ ] Session history bar shows recent scans
- [ ] Modal close terminates OCR worker (verify with DevTools memory tab — no leak after 10 scans)

**Known failures (should degrade gracefully, not crash):**
- [ ] Foil card → low accuracy, no crash
- [ ] Old card frame → low accuracy, no crash
- [ ] Foreign-language card → no match found, user can manually edit
- [ ] Poor lighting → no match, retry works

---

## 7. UI & mobile

- [ ] Touch interactions work on mobile Safari + Android Chrome
- [ ] LIFO stack collapses/expands
- [ ] Undo/redo buttons update history correctly (no orphan states)
- [ ] Action log scrolls, most recent at bottom
- [ ] Phase tracker highlights current phase
- [ ] BottomControlPanel does not overlap with battlefield cards
- [ ] PWA install prompt appears on eligible devices
- [ ] Rotating device does not lose game state

---

## 8. Legal & compliance (pre-launch only)

- [ ] Footer disclaimer text matches `App_legal_compliance_guide.md` verbatim
- [ ] Terms of Service page accessible and renders
- [ ] Legal Notices (Privacy) page accessible and renders
- [ ] Card images display artist name and copyright (Scryfall requirement)
- [ ] Card images not cropped, distorted, or watermarked
- [ ] No paywall/subscription anywhere in UI
- [ ] Cookie consent banner appears before any analytics/ad script loads
- [ ] "Reject All" cookie button visually equal to "Accept All"
- [ ] AdSense placeholder does not violate 150px buffer from interactive controls
- [ ] `ADSENSE_CLIENT_ID` and `ADSENSE_SLOT_ID` in `constants.js` are real (not `XXXXXXXXXX`)
- [ ] `AdBanner.jsx` `isProduction` respects an environment variable, not hardcoded

---

## 9. Performance sanity

- [ ] Empty battlefield: page interactive within 2s
- [ ] 20 creatures on battlefield: still responsive, no jank on phase advance
- [ ] Extreme combo (Doubling Season × 3 + repeated token creation): no browser hang, exponential notation displays
- [ ] Scanner modal open/close 10 times: no memory leak (check DevTools)
- [ ] Scryfall API calls respect 50–100ms delay (check Network tab timings)

---

## 10. Cross-browser

Run smoke test (§1) on:

- [ ] Chrome desktop
- [ ] Safari desktop
- [ ] Firefox desktop
- [ ] iOS Safari (mobile)
- [ ] Android Chrome (mobile)

---

## 11. Landscape layout

Landscape = width > height and ≥640px wide. Test on a real phone in landscape (or DevTools device emulation at 844×390).

### Two-column layout & dock

- [ ] Rotating to landscape shows battlefield + right dock with no content overflow
- [ ] With nothing selected, dock shows the "Tap a card to see details" empty state
- [ ] Selecting a card populates the dock detail (name, art, oracle text, actions); battlefield remains fully visible — **no floating overlay ever appears over the battlefield in landscape**
- [ ] Dock art crop shows the artist credit / ™ & © Wizards of the Coast line (Scryfall requirement)
- [ ] Targeting mode (e.g. activate Orthion's ability, or Declare Attackers): Confirm/SELECT and CANCEL appear **only in the dock**, floating Declare Attackers/Blockers banners do not appear
- [ ] Combat Damage step with no card selected: combat summary renders inside the dock

### Zone tabs

- [ ] Two tabs (Creatures / Others) with live counts above the card row
- [ ] Counts include virtual token stacks: create Scute Swarm ×10, Creatures count reads 10
- [ ] Only the active zone's cards are in the DOM (inspect: inactive zone unmounted)
- [ ] Tapping a tab switches views; vertical swipe on the card area also switches
- [ ] Lands still excluded from both tabs (managed via the More panel)

### Trigger stack (strip + pin)

- [ ] With an empty stack, no strip is shown (space reclaimed)
- [ ] Add a card with an ETB trigger (e.g. Elvish Visionary): thin strip appears below the card row with count + trigger name + Resolve →
- [ ] Trigger from a creature source forces Creatures view; pin icon + "held by stack" hint appear
- [ ] Trigger from an enchantment source (e.g. Doubling Season token trigger) forces Others view
- [ ] Tapping the other tab while pinned shakes the tab and shows the "Resolve stack triggers first." toast
- [ ] Tapping the strip expands the full stack in the dock; top item has Resolve/Reject, multi-item stacks get Resolve All / Clear
- [ ] Resolving the stack unpins but stays on the current view (no snap-back)

### Chrome

- [ ] Top bar: hamburger + "Turn N · Main 1" readout left, small title center, phase chevrons right — no overflow
- [ ] Right chevron advances phase (combat steps inside Combat); left chevron is disabled
- [ ] Bottom bar (Undo · Add · Next phase · Auto · More) is always visible, one-handed-thumb reachable; Next phase/Auto disable during targeting
- [ ] Turn counter increments after End turn

### Fallbacks

- [ ] Compact landscape (<740px wide, e.g. iPhone SE 667×375): no dock when empty; selecting a card opens a slide-over dock below the top bar
- [ ] Portrait mode unchanged: fanned card buttons, SelectionMenu overlay, LIFOStack overlay all still work (no regression for portrait users)
- [ ] Rotating mid-game preserves game state (cards, stack, phase)
- [ ] Ad placement: n/a while AdBanner is unmounted; if ads are enabled, verify 150px buffer from dock and bottom bar before shipping

---

## Regression protocol by change type

| Change area | Required sections |
|---|---|
| `gameEngine.js` | §1, §2, §3, §4, §9 |
| `keywordParser.js` / `SIGNATURE_DATA` | §1, §3, §4 |
| `combatUtils.js` | §1, §2, §4 |
| `useGameState.js` / `usePhaseHandlers.js` | §1, §2, §3 |
| Any hook in `hooks/` | §1, §5, §7 |
| Scanner code | §1, §6 |
| Legal / Footer / ad components | §1, §8 |
| Styling / layout | §1, §7, §10, §11 |
| Landscape/dock components (`RightDock`, `Dock*`, `ZoneTabs`, `StackStrip`, `BottomBar`, `useZoneView`) | §1, §5, §7, §11 |
| Dependency update | Full sheet |
