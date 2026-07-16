# LANDSCAPE_LAYOUT_BRIEF.md

**For:** any capable Claude model tasked with redesigning ComboCalc for landscape-first mobile use.

**Required reading:** `CLAUDE.md` (architecture and gotchas), `TESTING.md` (regression checklist), `OPTIMIZATION_BRIEF.md` (broader optimization context — this brief takes priority over Tier 2/3 items in that doc).

> **Working style:** you have latitude. This brief captures the specific decisions the human has locked in based on iteration together. Everything else is yours to propose, tune, and improve. When you see a better path than what's written here, take it and explain why — don't blindly follow the letter of the brief if it disagrees with the spirit. Bad design shipped verbatim is worse than good design that pushed back.

---

## The problem

ComboCalc is used on phones during Magic games. In landscape mode today, selecting a card triggers a center-stacked modal overlay (large card detail preview + SELECT/CANCEL confirmation panel) that covers most of the battlefield. Players can't see what's happening while they're mid-interaction. See the reference screenshot the user shared for context.

The goal is a landscape-first layout that keeps the battlefield visible at all times and uses the wide viewport properly instead of stacking overlays down the center.

---

## Locked design decisions

These emerged from iteration with the user. Don't relitigate unless you've identified a real problem.

### 1. Two-column split: battlefield + right dock

- **Left column: battlefield.** Primary space (~65–70% of width, tune as needed). Always visible.
- **Right column: contextual dock** (~30–35% of width). Contains the selected card detail, quick actions, and SELECT/CANCEL confirmation buttons. When no card is selected, shows an empty state ("Tap a card to see details").
- **No modal overlays over the battlefield.** Ever. If something needs confirmation, it goes in the dock.

### 2. Battlefield has two zone views: "Creatures" and "Others"

- **Two tabs above the card row**, each with a live count.
- **Counts include virtual token stacks.** `Scute Swarm ×10` counts as 10 creatures, not 1. Rationale: matches what a player says out loud.
- **Only one view visible at a time.** Cards for the inactive view are not rendered in the DOM (perf win).
- **Both tap-to-switch and swipe-to-switch work.** Tabs are the primary/discoverable affordance; swipe stays for power users. Horizontal swipe fits the tab metaphor better than the current vertical swipe — propose the change but keep vertical if you can make a case for it.

### 3. Auto-force view rule for the LIFO trigger stack

When a triggered ability is on the stack:

- **Force the view to the source card's zone.** If the trigger comes from Orthion (creature) → force Creatures view. If it comes from Doubling Season (enchantment) → force Others view.
- **Show a pin icon** on the active tab and a small "held by stack" hint text on the tab row.
- **Attempted tab switch while pinned** should not silently fail — shake the target tab and show a toast: *"Resolve stack triggers first."*
- **When the stack clears, unpin but don't snap back.** The player stays on the current view. Less jarring than teleporting back to where they were three triggers ago.

### 4. LIFO stack shows as an inline strip

- Thin bar below the battlefield card row.
- Shows trigger count and 1–2 trigger names.
- "Resolve →" affordance on the right.
- When there's no stack, the strip is absent (not just empty) — reclaims vertical space.

### 5. Top bar is compact and gameplay-first

- Left: hamburger menu + turn/phase text ("Turn 3 · Main 1").
- Center: app title, small.
- Right: phase navigation chevrons.
- The current giant centered "Magic Calculator" title loses prominence — that's fine, gameplay real estate matters more than brand real estate in landscape.

### 6. Bottom bar is persistent, thin, always visible

- Undo · Add · **Next phase** (accented) · Auto-calculate · More.
- No hiding behind gestures. Persistent controls beat clever gestures for a game state tool.

---

## Where you have freedom (please exercise it)

Improve, propose, or push back on any of the following:

- **Exact dock width and column split.** 30/70 is a starting point. If you can make 25/75 work with readable oracle text, do it.
- **Tab styling.** Pill vs underline vs segmented control — pick what fits the app's existing visual language.
- **Colors, animations, transitions.** Not specified here on purpose. Match the app's existing dark theme. Consider tasteful spring animations on view switches — but nothing that delays the player.
- **Empty states in the dock.** The mockup showed a generic hand icon — improve if you have a better idea.
- **How the "held by stack" hint is presented.** Toast, inline hint, both — your call.
- **The "auto-force" behavior for edge cases.** Triggers with no clear zone target (e.g., "at end of turn, gain 1 life"). Default suggestion: use the source card's zone. If you find a better rule, use it and document it.
- **Small-viewport fallback.** If a device is too narrow for the two-column layout to feel right (rare but iPhone SE landscape is only ~667×375), decide whether to fall back to a slide-over dock or a bottom sheet. Propose your call, don't quietly ship it.
- **Landscape as the primary target vs. only target.** Currently the app also renders in portrait. Decide with the human whether portrait becomes deprioritized, gets a "rotate to landscape" nudge, or gets its own responsive layout. **Do not delete portrait support without approval.**

---

## Non-negotiable constraints (from CLAUDE.md)

- Do not modify legal disclaimer text in `Footer.jsx`, `TermsOfService.jsx`, or `LegalNotices.jsx`.
- Do not add paywalls, subscriptions, or gated features. WotC Fan Content Policy.
- Do not crop, distort, or obscure Scryfall card image artist/copyright text — including in the new dock detail view.
- Maintain **150px minimum distance** between ad placements and interactive game elements. If the new layout puts an ad near the dock or bottom bar, redesign the ad placement or reject the change.
- Do not break `TESTING.md` §5 (card interactions), §3 (triggered abilities), or §4 (BigInt math). The dock is a view change; game logic must be unaffected.
- Preserve keyboard/touch target minimums — 44px minimum touchable area for all interactive controls.

---

## Files likely to touch

Based on `CLAUDE.md` architecture. You may find others — investigate before touching.

**Primary:**
- `components/Game.jsx` — top-level composition, will need the two-column split
- `components/BattlefieldList.jsx` — needs zone filtering and view tabs
- `components/BattlefieldCard.jsx` — likely unchanged, but check
- `components/LIFOStack.jsx` — change from overlay to inline strip + expanded dock content
- `components/SelectedCardControls.jsx` or wherever SELECT/CANCEL renders — moves into the dock
- `hooks/useBattlefieldLayout.js` — probably needs a rework for the new geometry
- `hooks/useGameState.js` — add `activeZone` state (`'creatures' | 'others'`) and derived `zoneCounts`
- `hooks/useTargetingMode.js` — the auto-force rule likely hooks here or in `usePhaseHandlers`
- `mobile.css` and any orientation media queries

**Secondary (verify):**
- `components/BottomControlPanel.jsx` — becomes persistent
- `components/PhaseTracker.jsx` — needs compact top-bar version
- `components/CalculationMenu.jsx`, `MoreOptionsPanel.jsx` — may need repositioning

**Don't touch without approval:**
- `utils/gameEngine.js` (this is a layout change, not a logic change)
- `utils/combatUtils.js`
- `data/signatureCards.js`
- Legal components

---

## Additions to TESTING.md

Propose adding a new §11 — Landscape layout. Draft below; refine as you build.

- Rotating to landscape shows the two-column layout without content overflow
- Selecting a card populates the right dock; battlefield remains fully visible
- SELECT / CANCEL appear only in the dock, never as a floating overlay
- Tapping a tab switches views; horizontal swipe on the card row also switches views
- Zone counts include virtual token stacks (create a Scute Swarm ×10, verify count reads 10)
- Adding a trigger to the stack from a creature source forces Creatures view; pin icon appears
- Attempting to switch tabs while pinned shakes the tab and shows a toast
- Resolving the stack unpins but keeps the current view (no snap-back)
- Top bar shows turn/phase, hamburger, chevrons without overflow
- Bottom bar controls remain reachable with a one-handed thumb grip
- Portrait mode still renders acceptably (if kept) — no regression on existing portrait users
- Ad placement maintains 150px buffer from interactive game elements
- Card image artist/copyright remains visible in dock detail view

---

## How to work with the human

1. **Plan before code.** For this scope, share a written plan of your approach and the specific file changes before touching anything. Wait for approval.
2. **Commit at logical stopping points** so the human can preview intermediate states on a real device.
3. **Push back when the brief is wrong.** If a locked decision feels wrong in implementation, say so and propose an alternative. The user explicitly wants you to improve where you can.
4. **When you propose an alternative, show — don't just tell.** Sketch the alternative in code or describe it precisely enough that the human can visualize it without building it.
5. **Test on a real device** (or accurate simulator) before declaring done. The card row at small landscape widths is the highest-risk visual regression.

---

## Suggested order of operations

You may reorder if you see a better path.

1. **Zone-view state and tabs first.** Add `activeZone` to `useGameState`, derive filtered card arrays, render tabs above the card row. Ship without landscape changes — this is testable in portrait.
2. **Two-column layout.** Introduce the right dock, initially just showing selected card detail. Battlefield now has less width — verify card row still readable.
3. **Move SELECT / CANCEL into the dock.** Remove the center overlay pattern entirely.
4. **LIFO stack as inline strip + dock expansion.** Rewrite `LIFOStack.jsx` to be inline and expandable-into-dock.
5. **Auto-force rule + pin UI.** Add the stack → zone logic and the "held by stack" affordance.
6. **Polish, breakpoints, animations.** Tune for actual devices.
7. **Update `TESTING.md` §11** with real steps that match what shipped.

---

## Success looks like

- Landscape mode is genuinely playable — no obscured battlefield, no fighting overlays.
- Zone switching feels obvious in the first 30 seconds a new user opens the app.
- Auto-force pinning teaches the stack mechanic without needing a tutorial.
- Nothing in TESTING.md §1–§8 regresses.
- The user opens the app in landscape and reacts positively without needing an explanation from you.

---

## When you finish

Propose updates to:

- `CLAUDE.md` — add a "Primary target: landscape mobile" line to the top matter, and any new architectural notes (the `activeZone` state model, the pin rule, etc.)
- `TESTING.md` — finalize §11
- `OPTIMIZATION_BRIEF.md` — mark completed items, note any Tier 2 items now obviated or reshuffled by this work
