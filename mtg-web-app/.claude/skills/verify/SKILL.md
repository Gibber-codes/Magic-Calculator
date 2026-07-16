---
name: verify
description: Build, launch, and drive ComboCalc in a headless browser to verify UI changes end-to-end.
---

# Verifying ComboCalc changes

## Launch

```bash
npm run dev          # HTTPS via @vitejs/plugin-basic-ssl; picks the next free port if 5173 is taken — read the port from the output
```

Gotchas:
- Other vite instances often occupy 5173/5174 on this machine; **always parse the actual port** from the dev-server output.
- Use `https://127.0.0.1:<port>/` from automation, NOT `localhost` — another process may hold the same port on the IPv6 stack and Chromium's TLS handshake fails with `ERR_SSL_PROTOCOL_ERROR`.
- Playwright needs `ignoreHTTPSErrors: true` (self-signed cert).

## Drive (Playwright, install in scratchpad — never in the project)

```js
const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 844, height: 390 },   // landscape phone; 390×844 portrait; 667×375 compact landscape
    hasTouch: true
});
await ctx.addInitScript(() => {
    localStorage.setItem('hasSeenWelcome', 'true');   // skip the welcome overlay
    localStorage.setItem('lastSeenVersion', '1.0.0'); // match APP_VERSION in config/constants.js
});
```

## Flows worth driving

- **Add a card:** bottom "Add" → "Search" tab button (input only appears after this) →
  fill `Search by name...` → click the result name button (this only adds it to *recents*) →
  click the recents tile `img[alt="<Card Name>"]` to put it on the battlefield.
  Search results come from the live Scryfall API — use `waitFor` with generous timeouts, not fixed sleeps.
- **Trigger stack:** add "Elvish Visionary" (ETB draw trigger) — populates the LIFO stack immediately,
  which exercises the landscape StackStrip / pin / toast and portrait LIFOStack overlay.
- **Select a card:** click `[data-card-ids]` (battlefield card). Landscape → dock detail; portrait → SelectionMenu overlay.
- Layout switching is driven purely by `page.setViewportSize(...)` — no reload needed.

## Verify

Zone tabs/counts, dock content priority (targeting > stack > selection > combat), StackStrip presence,
pin toast text `Resolve stack triggers first.`, top-bar readout `Turn N · <phase>`, bottom-bar labels.
Capture screenshots at each state; watch `page.on('console')` / `pageerror` for engine errors.
