# OPTIMIZATION_BRIEF.md

**For:** any capable Claude model tasked with improving ComboCalc's codebase for maintainability, performance, and future development velocity.

**Required reading before proposing changes:** `CLAUDE.md` (architecture, conventions, gotchas) and `TESTING.md` (regression checklist).

> **Status (2026-07-11):** Tier 1 (A–D) is **complete**. The landscape redesign (`LANDSCAPE_LAYOUT_BRIEF.md`) has since shipped and took priority over Tier 2/3; see per-item notes below for what it changed.

---

## Your job

Propose and (with human approval) implement changes that make future work on ComboCalc easier, faster, and less bug-prone. Your goal is not to rewrite the app — it's to **reduce friction** for the next 6 months of feature work (scanner completion, engine improvements, launch prep).

Optimize for the human collaborator's velocity, not for your own sense of code aesthetics. A "cleaner" refactor that requires re-verifying every trigger interaction is a net negative.

---

## Non-negotiable constraints

1. **Do not add paywalls, subscriptions, or gated features.** The app must stay free per WotC Fan Content Policy.
2. **Do not alter legal text** in `Footer.jsx`, `TermsOfService.jsx`, or `LegalNotices.jsx` without an explicit request.
3. **Do not change Scryfall image handling** in ways that crop, distort, or obscure artist/copyright text.
4. **Do not modify the ETB signature-card fallback** in `gameEngine.js` `processEntersBattlefield` without tracing every card-creation call site — it exists for reasons.
5. **Do not remove BigInt** from combat/token/counter math. Do not use `Number()` on BigInt values in game logic.
6. **Do not remove the debug console.logs** in engine code (`[ETB]`, etc.) without proposing a proper debug-flag replacement first.
7. **Do not migrate to TypeScript, Zustand, Redux, or any large architectural change** without a full proposal and explicit human approval. Small internal refactors are fine.
8. **Do not break** any TESTING.md checkbox. If a change would require updating the checklist, flag it in your proposal.

---

## Prioritized optimization targets

Tackle in this order unless the human directs otherwise. Each item includes rough scope and risk level.

### Tier 1 — high value, low risk (do these first)

**A. Lazy-load the scanner.**
Scope: convert `ScannerModal` and its dependencies (`tesseract.js`, `fuse.js`, `react-webcam`) to a dynamic `React.lazy` import. Add a Suspense boundary with a loading state.
Why: `tesseract.js` is ~4MB. Users who never scan pay a full page-load tax today.
Risk: low. Scanner is a distinct feature entered from a button.
Verify: TESTING.md §1, §6.

**B. Fix `AdBanner.jsx` `isProduction` hardcoding.**
Scope: replace the hardcoded `false` with `import.meta.env.PROD` (Vite's built-in). Verify placeholder ad IDs still don't render outside production.
Why: currently ad placement logic is untestable in prod builds.
Risk: minimal.

**C. Bootstrap Vitest with seed tests.**
Scope: add `vitest` + `@vitest/ui` to dev deps. Add a `test` script. Write 5–8 seed tests covering: `combatUtils.calculateUnblockedDamage` (including BigInt cases), `keywordParser.extractTriggers` on 3 known-good cards, `gameEngine.applyModifiers` with 0/1/2/12 doublers.
Why: no test coverage today. Even a minimal harness makes every future refactor safer.
Risk: minimal — pure additions.

**D. Normalize phase casing.**
Scope: pick a canonical form (recommend lowercase, e.g. `'main1'`, `'combat'`, `'main2'`, `'end'`). Add a `normalizePhase(input)` helper. Convert engine internals to use the canonical form. Keep the display layer's title-case as a separate concern (`formatPhaseName`).
Why: `CLAUDE.md` gotcha #6 — this inconsistency will bite every new phase-related feature.
Risk: medium. Touches multiple hooks. Run TESTING.md §2 completely.

### Tier 2 — high value, moderate risk

**E. Deduplicate the trigger-object construction in `keywordParser.js`.**
Scope: the pattern where an ability object is built with 12+ identical fields appears 3+ times in the `mobilize`/attack-triggered code path. Extract a `buildTriggerAbility(base, effect, description)` helper.
Why: current shape makes it dangerous to add a new trigger field — you must remember to update every construction site.
Risk: low-to-medium. Verify TESTING.md §3.

**F. Split `useGameState` into focused hooks.** *(Landscape note: `useGameState` grew `turnNumber`, `activeZone`, and `zoneCounts`; the zone pin rule already lives in its own `useZoneView` hook. Factor that into any proposed split.)*
Scope: propose (don't implement yet) a split into `useCardsAndHistory`, `usePhaseState`, `useStackState`, `useActionLog`. Keep a thin `useGameState` composer for backward compatibility with `Game.jsx`.
Why: `useGameState` currently owns cards, history, future, actionLog, phase, combat step, stack, and the engine ref. Six separate concerns.
Risk: medium-high. Do NOT implement until human approves the shape. Verify TESTING.md §2, §3, §5.

**G. Introduce a strategy pattern for card abilities.**
Scope: today, `getCardAbilities()` checks `SIGNATURE_DATA` first, then falls back to the parser. Extract this into a chain-of-responsibility pattern (`SignatureStrategy → ParserStrategy → EmptyStrategy`) so adding a third source (e.g. user-defined abilities, OCR-hinted abilities) doesn't require modifying `getCardAbilities`.
Why: the scanner may eventually need to inject partial ability data from OCR. Current shape makes this awkward.
Risk: medium. Propose the shape first.

### Tier 3 — needs discussion before starting

**H. `handleAutoCalculate` proper fix.**
Scope: replace the `// SIMPLIFIED APPROACH` path in `usePhaseHandlers.js` with a new `engine.simulateFullTurn(cards)` method that cleanly threads state between phases.
Why: the current path has known correctness edges when triggers modify creatures mid-turn.
Risk: high. Propose the engine method signature first.

**I. Component decomposition of `Game.jsx`.**
Scope: if `Game.jsx` is a large orchestrator, propose a split (e.g. `<BattlefieldView>`, `<TurnControls>`, `<StackOverlay>`) — do NOT touch until the human confirms the split makes sense in their mental model.
Risk: high. Cosmetic churn if done wrong.
*(Landscape note: partially advanced — the dock family (`RightDock`, `DockCardDetail`, `DockTargetingPanel`, `DockStackList`, `StackStrip`, `BottomBar`) extracted much of the landscape chrome. `Game.jsx` still orchestrates both layouts and grew some branching; a future split should separate portrait/landscape chrome rather than re-extract the dock.)*

**J. TypeScript migration.**
Do not start. Bring it up as a formal proposal with cost/benefit if you think it's warranted, and let the human decide. Current codebase uses JSDoc which is sufficient for many purposes.

---

## What NOT to "optimize"

These look like code smells but are intentional. Don't touch without asking:

- **The tight coupling in `gameEngine.js`** between phases, triggers, and replacement effects. Splitting responsibilities here has been considered and rejected — the interaction complexity is essential, not accidental.
- **`SIGNATURE_DATA` hand-authored ability entries.** These exist because the parser is insufficient for those specific cards. Don't try to "parse them properly instead."
- **The direct DOM measurements in `useBattlefieldLayout.js`** (if present). Layout hooks often need imperative reads.
- **The `MAX_PHYSICAL_TOKENS = 20` cap and virtual-stack representation.** This is a performance guardrail, not tech debt.
- **The 50–100ms delay in Scryfall requests.** This is a legal/policy requirement.
- **Duplicate `console.log` debug statements** in `gameEngine.js` ETB code. They're actively useful; replace with a proper debug flag if removing.

---

## How to work with the human

1. **Read `CLAUDE.md` and `TESTING.md` first, in full.** Reference specific sections in your proposals.
2. **Propose before implementing.** For any Tier 2 or Tier 3 item, write the plan first, wait for approval, then code.
3. **One item per session.** Don't bundle Tier 1 items into a single PR.
4. **Reference TESTING.md sections in every proposal.** Format: *"Verifies against TESTING.md §2, §4."*
5. **Measure before and after** where it makes sense: bundle size (Tier 1A), test count (1C), lint warnings, file line counts.
6. **When you finish an item, propose a `CLAUDE.md` update** if the change affects architecture, conventions, or gotchas documented there.

---

## Success looks like

After this pass, the codebase should have:

- Scanner code lazy-loaded → initial bundle drops by an estimated 40–50%
- Vitest running with ≥8 passing tests on core logic
- Consistent phase casing across all hooks and engine code
- `AdBanner.jsx` production-safe via env var
- Deduplicated trigger construction in `keywordParser.js`
- A proposed (not necessarily implemented) shape for splitting `useGameState`
- `CLAUDE.md` updated to reflect any conventions that changed

**Nothing in TESTING.md should regress.** If it does, roll back and re-propose.

---

## First session suggestion

Start with **Tier 1A (lazy-load scanner)**. It has the highest measurable impact, lowest risk, and gives the human an early wins-and-metrics moment that builds trust for the higher-risk items later.
