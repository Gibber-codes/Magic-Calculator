# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this before making changes.

---

## What this project is

**ComboCalc** (referred to as "Magic Calculator" in legal text) is a fan-content Magic: The Gathering **battlefield simulator and combat/combo damage calculator**. Users add cards to a virtual battlefield, step through MTG turn phases, track triggered abilities on a LIFO stack, and calculate damage — including astronomical combo damage requiring BigInt arithmetic.

The app is a **free web tool** monetized with display ads. It **must remain free** to stay compliant with the WotC Fan Content Policy — never add paywalls, subscriptions, or gated features.

**Primary target: landscape mobile.** Players prop their phone in landscape during games. Landscape (width > height, ≥640px) gets the two-column battlefield + dock layout; portrait keeps the legacy single-column layout with overlay menus. When adding UI, decide explicitly which layout(s) it belongs to.

**Tech stack:** React 19 · Vite 7 · Tailwind CSS 3.4 · ESLint 9 · deployed to Netlify. Card data from Scryfall (local JSON + live API). Framer Motion for animations. Tesseract.js + Fuse.js for the OCR card scanner.

---

## Commands

```bash
npm install       # first time
npm run dev       # Vite dev server (HTTPS via @vitejs/plugin-basic-ssl — needed for camera on mobile)
npm run build     # production build to /dist
npm run preview   # preview the production build
npm run lint      # ESLint check — run before commits
npm test          # Vitest, single run — run before commits
npm run test:watch  # Vitest in watch mode
npm run test:ui   # Vitest browser UI
```

Tests use **Vitest** and live next to their module as `src/**/*.test.js` (e.g. `utils/combatUtils.test.js`), importing `describe`/`it`/`expect` explicitly from `vitest` (no globals). Seed coverage exists for `combatUtils.calculateUnblockedDamage` (BigInt cases), `keywordParser.extractTriggers`, and `gameEngine.applyModifiers` (doubler/BigInt-threshold paths). When touching those modules, extend the tests — TESTING.md remains the manual regression checklist for everything the unit tests don't cover.

---

## Architecture

The app is a single-page React app with routing between the main game view and legal pages.

### State ownership

- **`hooks/useGameState.js`** owns the core state: `cards`, `history`, `future`, `actionLog`, `currentPhase`, `currentCombatStep`, `turnNumber`, `abilityStack`, a `gameEngineRef`, plus the battlefield view state: `activeZone` (`'creatures' | 'others'`) and derived `zoneCounts` (**BigInt** — virtual token stacks count as N; display only via `formatBigNumber`). It also owns the phase sequence (`FULL_TURN_SEQUENCE`, `PHASE_ORDER`, `COMBAT_STEPS`). Treat these constants as canonical.
- **`hooks/useZoneView.js`** owns the stack → zone auto-force rule: while triggers are on the stack, the view is forced to the top item's source-card zone and the tabs are pinned (blocked switches shake + toast); the rule suspends during targeting mode so targets stay reachable; when the stack clears it unpins **without** snapping back. `getCardZone(card)` in `cardUtils.js` is the shared zone predicate.
- **`hooks/usePhaseHandlers.js`** wraps phase advancement, combat step progression, and the "auto-calculate full turn" logic. This file has a known simplified path in `handleAutoCalculate` — see "Known tech debt" below.
- **`hooks/useTargetingMode.js`**, **`useTargetingConfirm.js`** — targeting UI state (single, multiple, declare-blockers modes).
- **`hooks/useCardActions.js`**, **`useBattlefieldCardInteractions.js`**, **`useTouchInteractions.js`** — user input on cards.
- **`hooks/useScanner.js`** — OCR scanner state (in progress).
- **`hooks/useSearch.js`** — Scryfall search UX.

### The game engine

**`utils/gameEngine.js`** is the source of truth for rules resolution. It is instantiated once per session via `gameEngineRef` and mutated via `updateBattlefield(cards)` on each render. Do NOT split its responsibilities without discussion — the tight coupling of phases, triggers, and replacement effects is intentional.

Key methods:
- `processPhaseChange(phase, playerTurn)` — returns an array of resolved trigger objects for a phase transition. Handles standard triggers, delayed triggers, and token-entry cascades.
- `processEntersBattlefield(enteringCard)` — runs ETB triggers on the card itself, plus reactive triggers from other permanents (Wildwood Mentor-style, landfall, etc.).
- `findReplacementEffects(effectType, cards)` — currently handles `double_counters` (Doubling Season / Vorinclex) and `double_tokens` (Doubling Season / Mondrak) via regex patterns in `keywordParser.js`.
- `applyModifiers(baseValue, modifiers, effectType)` — switches to **BigInt exponential math** for token doublers once the doubler count exceeds `BIGINT_DOUBLER_THRESHOLD = 10`.

### Card abilities: parser vs signature

Two parallel systems supply card behavior:

1. **`utils/keywordParser.js` + `utils/keywordHandlers.js`** — regex/pattern-based extraction of triggered abilities, activated abilities, replacement effects, and keyword abilities from Scryfall `oracle_text`. Good for the common case (~80% of cards).
2. **`data/signatureCards.js`** (`SIGNATURE_DATA`) — hand-authored ability definitions for complex/edge-case cards where the parser is insufficient. **Always check `SIGNATURE_DATA` first** (see `getCardAbilities()` in `keywordParser.js`).

When adding a new problematic card, prefer adding it to `signatureCards.js` over patching the parser with a one-off pattern.

### Component structure

- **`pages/Game.jsx`** — the main game view composition. Orchestrates hooks, dispatches actions to the engine, renders the battlefield. Computes `isLandscape` / `isCompactLandscape` from window size and branches the chrome accordingly.
- **`components/BattlefieldList.jsx` + `BattlefieldCard.jsx` + `BattlefieldCardVisuals.jsx` + `RedesignedCardFrame.jsx`** — battlefield rendering. `BattlefieldList` renders **only the active zone** (tabs via `ZoneTabs.jsx`); the inactive zone is unmounted on purpose — don't "fix" that.
- **Landscape dock family:** `RightDock.jsx` (container; `overlay` variant is the <740px slide-over fallback), `DockCardDetail.jsx` (selection detail — includes the required artist/© credit), `DockTargetingPanel.jsx` (SELECT/CANCEL confirmation), `DockStackList.jsx` (expanded trigger stack), `StackStrip.jsx` (thin inline stack bar, unmounted when empty), `BottomBar.jsx` (thin persistent bar: Undo · Add · Next phase · Auto · More). **No modal overlays over the battlefield in landscape** — anything needing confirmation goes in the dock.
- **`components/LIFOStack.jsx`** — the triggered-ability stack overlay. **Portrait only**; landscape uses `StackStrip` + `DockStackList`.
- **`components/SelectionMenu.jsx`** — the full-screen card-detail overlay. **Portrait only**; landscape uses `DockCardDetail`.
- **`components/PhaseTracker.jsx`** — the phase/combat-step progress display.
- **`components/AddCardPanel.jsx`** — search + favorites + recents tabs for adding cards.
- **`components/CalculationMenu.jsx`, `CombatSummaryPanel.jsx`, `BottomControlPanel.jsx`, `MoreOptionsPanel.jsx`** — action panels.
- **`components/Scanner/`** — `ScannerModal`, `ScannerButton`, `CameraCapture`, `ConfirmationPanel`, `ScannedHistoryBar` (OCR feature, in progress). `ScannerModal` is lazy-loaded via `React.lazy` in `Game.jsx` and only mounted while open — keep scanner-only dependencies out of static imports reachable from `Game.jsx`, or they'll re-enter the main bundle. Closing the modal unmounts it, which terminates the OCR worker; it re-initializes on reopen.
- **`components/TermsOfService.jsx`, `LegalNotices.jsx`, `Footer.jsx`** — legal pages. Their text is **not decorative** — see legal section below.

### Data flow for card actions

User taps card → hook dispatches to `useCardActions` → engine method returns `{ newCards, triggers }` → `setCards(newCards)` → triggers get sorted by battlefield position (right-to-left priority) → reversed and pushed to the LIFO stack in resolution order.

---

## Non-obvious gotchas (READ THESE)

### 1. BigInt everywhere for damage and tokens

MTG combos routinely produce numbers that overflow `Number.MAX_SAFE_INTEGER`. The app uses **BigInt** for damage totals, token counts on virtual stacks, and modifier math. Look at `combatUtils.calculateUnblockedDamage` and `gameEngine.applyModifiers` for the pattern.

- Never do `Number(bigIntValue) + Number(anotherBigIntValue)` — precision loss.
- Use `formatBigNumber()` from `utils/formatters.js` for display.
- Threshold: `BIGINT_DOUBLER_THRESHOLD = 10` in `gameEngine.js` decides when to switch to exponential BigInt math.
- Threshold: `MAX_PHYSICAL_TOKENS = 20` — beyond this, tokens are represented as a "virtual stack" with a count, not individual card objects.

### 2. Scryfall API constraints (LEGAL)

`utils/scryfallService.js` calls the Scryfall API. Their rules:
- Maintain **50–100ms delay** between requests, max 10/sec.
- **Never** cover, crop, or remove the copyright notice or artist name from card images.
- **Never** distort, skew, stretch, or watermark card images.
- If using `art_crop` images, the artist name and copyright must appear elsewhere in the UI.

### 3. WotC Fan Content Policy (LEGAL)

- The app **must remain free**. No paywalls, subscriptions, mandatory registration, or premium tiers.
- The exact disclaimer text in `Footer.jsx` is legally required — do not modify wording without checking `App_legal_compliance_guide.md`.
- Cannot use WotC logos as app branding.
- No proxy/counterfeit card printing features.

### 4. AdSense placement (LEGAL / policy)

- Minimum **150px distance** between ads and interactive game elements — enforce this in layout changes.
- No pop-ups, no pop-unders, no ads on first page load in the game view.
- Currently `AdBanner.jsx` renders a placeholder; production requires real `ADSENSE_CLIENT_ID` and `ADSENSE_SLOT_ID` in `constants.js`.

### 5. Privacy / GDPR

- Analytics and ad scripts must NOT load before user consent.
- A cookie consent banner is required but not yet integrated (see launch-readiness backlog).

### 6. Phase names: canonical lowercase in the engine, title-case in the UI

`utils/phaseUtils.js` owns phase identity: canonical phases are lowercase (`'beginning' | 'main1' | 'combat' | 'main2' | 'end'`), `normalizePhase(input)` converts any spelling at the engine boundary, and the single shared `PHASE_TRIGGER_MAP` replaces the old per-method trigger maps. UI state still uses title-case (`'Main 2'` etc. in `PHASE_ORDER`) as a display concern. Two intentional behaviors are pinned by tests: **main-phase triggers fire only at precombat main, not Main 2**, and **`endTurn` resolves delayed end-step triggers only** (via `engine.processEndOfTurn()`), never standard end-step triggers — both prevent double-firing. New phase-accepting engine code should call `normalizePhase` at its boundary.

### 7. Signature card fallback in ETB

`processEntersBattlefield` has a **fallback** that loads abilities from `SIGNATURE_DATA` if the incoming card doesn't have them attached. This is intentional — some code paths add cards without pre-populating abilities. Do not remove without tracing all card-creation call sites.

### 8. HTTPS in dev

Vite is configured with `@vitejs/plugin-basic-ssl` so the dev server runs on HTTPS. This is required for `getUserMedia()` (the scanner's camera access) on mobile. Expect a browser cert warning locally — this is normal.

---

## Coding conventions

- **Functional components + hooks.** No class components.
- **Tailwind for styling.** No CSS modules. Global styles only in `index.css`, `App.css`, `mobile.css`.
- **Icons: `lucide-react`.** Don't add another icon library.
- **File layout:** `components/`, `hooks/`, `utils/`, `utils/scanner/`, `data/`, `config/`.
- **State:** prefer custom hooks over prop drilling for anything used in more than 2 components.
- **useCallback + useMemo** where dependencies matter for the engine ref or trigger sorting — the engine expects a stable card array reference within a render.
- **console.log:** existing debug logs (e.g. `[ETB]` prefix) are useful during scanner and engine work. Keep them behind a debug flag or remove before shipping — don't leave new ones in shipped code.

---

## Known tech debt (proceed carefully)

1. **`usePhaseHandlers.handleAutoCalculate`** — marked `// SIMPLIFIED APPROACH` in comments. Runs phases sequentially but doesn't cleanly thread the card-state mutations between phases. A proper fix is a new `engine.simulateFullTurn(cards)` method.
2. ~~Phase casing inconsistency~~ — resolved via `phaseUtils.js` (see gotcha #6). UI components still compare title-case strings directly; migrating them to `PHASES` constants is optional polish. Note: `BottomControlPanel.jsx` compares `currentPhase === 'Main 1'`, which is never a real phase value (`'Main'` is) — dormant UI bug, untouched.
3. **`AdBanner.jsx` has `isProduction = false` hardcoded** — replace with an actual env check before shipping.
4. **`ADSENSE_CLIENT_ID` and `ADSENSE_SLOT_ID` in `constants.js` are placeholders.**
5. ~~No test suite~~ — Vitest seed suite exists (see Commands); coverage is still thin outside `combatUtils`/`keywordParser`/`gameEngine.applyModifiers`/`phaseUtils`.
6. **Scanner is in progress** — `combocalc-scanner-implementation.md` is the design doc. Auto-scan concurrency lock (`isAutoScanBusy` ref) is a fresh addition, monitor for edge cases.

---

## Workflow for Claude Code

- **Plan first, edit second** for anything touching `gameEngine.js`, `useGameState.js`, or the phase sequence. Print the plan, wait for approval.
- **One feature per session.** Don't mix scanner work with engine changes.
- **Feature branches** for anything non-trivial. Commit at logical stopping points.
- **Run `npm run lint`** before declaring a task done.
- **Run the relevant `TESTING.md` sections** before declaring a task done — it's a manual regression checklist (no automated test suite exists yet). See its "Regression protocol by change type" table for which sections apply to your change.
- **Verify legal text** if you touch `Footer.jsx`, `TermsOfService.jsx`, `LegalNotices.jsx`, or any Scryfall image handling.
- **Ask before**: removing debug logs in engine code, changing the phase sequence, altering `SIGNATURE_DATA` entries, modifying legal disclaimer text, changing ad placement.

---

## Deployment

Netlify, configured via `netlify.toml`. Preview builds run on PR; production builds run on `main`. Icons are managed via `resize-icons.js` and `setup_icons.js`; banner assets via `compress-banners.js` (uses `sharp`).
