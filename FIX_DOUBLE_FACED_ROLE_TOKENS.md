# Fix: Double-Faced Role Tokens (Ellivere / Virtuous Role)

## Problem Summary

When creating tokens from cards like **Ellivere of the Wild Court**, the battlefield displays the wrong token face. Ellivere creates a "Virtuous Role" token, but Scryfall returns a double-faced token card "Monster // Virtuous" where both roles share one physical card.

**Root Cause:** The `fetchRelatedTokens` function only splits DFC tokens when `face.image_uris` exists. Role tokens share a single image across both faces, so the split never happens and the token resolves to the first face (Monster) instead of the requested face (Virtuous).

---

## Files to Modify

1. `mtg-web-app/src/utils/scryfallService.js` — Fix DFC token splitting
2. `mtg-web-app/src/utils/gameEngine.js` — Add SIGNATURE_DATA fallback

---

## Fix 1: scryfallService.js

### Location
Function: `fetchRelatedTokens`

### Current Code (BROKEN)
```javascript
// Handle Double-Faced Tokens (like Roles or Modal Double-Faced Tokens) via splitting
// If it has card_faces that are distinct (have their own image_uris), treat them as separate tokens
if (tokenData.card_faces && tokenData.card_faces.length > 1 && tokenData.card_faces[0].image_uris) {
```

### Problem
The condition `tokenData.card_faces[0].image_uris` fails for Role tokens because they share one image across both faces. The entire `if` block is skipped, and the token is processed as single-faced.

### Fixed Code
Replace the entire DFC handling block inside the `for (const part of scryfallCard.all_parts)` loop:

```javascript
// Handle Double-Faced Tokens (like Roles)
// Split into separate token entries even if faces share images
if (tokenData.card_faces && tokenData.card_faces.length > 1) {
    tokenData.card_faces.forEach(face => {
        // Create a synthetic card object for each face
        const faceData = {
            ...tokenData,
            name: face.name,
            type_line: face.type_line || tokenData.type_line,
            oracle_text: face.oracle_text,
            colors: face.colors || tokenData.colors,
            mana_cost: face.mana_cost,
            power: face.power,
            toughness: face.toughness,
            // Use face-specific image_uris if available, otherwise fall back to parent
            image_uris: face.image_uris || tokenData.image_uris,
            // Clear card_faces to prevent recursion/confusion downstream
            card_faces: undefined
        };

        const formatted = formatScryfallCard(faceData);
        formatted.isToken = true;
        formatted.isRole = (face.type_line || '').includes('Role');
        
        // Store original DFC name for reference (e.g., "Monster // Virtuous")
        formatted.originalDfcName = tokenData.name;

        // Add to list if not duplicate by name
        if (!tokens.some(t => t.name === formatted.name)) {
            tokens.push(formatted);
        }
    });
} else {
    // Standard Single-Face Processing
    const formatted = formatScryfallCard(tokenData);
    formatted.isToken = true;

    if (!tokens.some(t => t.name === formatted.name)) {
        tokens.push(formatted);
    }
}
```

---

## Fix 2: gameEngine.js

### Location
Function: `executeAbility` — inside the `create_named_token` / `create_attached_token` handler

### Current Code
```javascript
// 1. Look for related token on the source card
let relatedToken = sourceCard?.relatedTokens?.find(t => isMatch(t.name, tokenName));

// 2. Fallback: Search knownCards for any matching token
if (!relatedToken && knownCards.length > 0) {
    relatedToken = knownCards.find(c =>
        (c.isToken || (c.type_line && c.type_line.includes('Token'))) &&
        isMatch(c.name, tokenName)
    );
}
```

### Problem
If `relatedTokens` hasn't been populated yet (async fetch timing) or the name matching fails, there's no fallback to the manually defined `SIGNATURE_DATA`.

### Fixed Code
Add a third fallback after the existing two:

```javascript
// 1. Look for related token on the source card
let relatedToken = sourceCard?.relatedTokens?.find(t => isMatch(t.name, tokenName));

// 2. Fallback: Search knownCards for any matching token
if (!relatedToken && knownCards.length > 0) {
    relatedToken = knownCards.find(c =>
        (c.isToken || (c.type_line && c.type_line.includes('Token'))) &&
        isMatch(c.name, tokenName)
    );
}

// 3. Fallback: Use SIGNATURE_DATA for known tokens (Virtuous Role, Monster Role, etc.)
if (!relatedToken) {
    const { SIGNATURE_DATA } = require('./signatureCards'); // or use existing import
    const signatureToken = SIGNATURE_DATA[tokenName] || SIGNATURE_DATA[tokenName.replace(' Role', '')];
    if (signatureToken) {
        relatedToken = {
            name: signatureToken.name,
            type_line: signatureToken.type_line || signatureToken.type,
            oracle_text: signatureToken.oracle_text,
            isToken: true,
            isRole: signatureToken.isRole,
            colors: [],
            power: 0,
            toughness: 0
        };
    }
}
```

### Import Check
Ensure `SIGNATURE_DATA` is imported at the top of `gameEngine.js`:
```javascript
import { SIGNATURE_DATA } from './signatureCards';
```

---

## Fix 3: Improve `isMatch` Helper (Optional Cleanup)

### Location
`gameEngine.js` — the `isMatch` function inside `executeAbility`

### Current Code
```javascript
const isMatch = (scryfallName, parsedName) => {
    if (!scryfallName || !parsedName) return false;
    const s = scryfallName.toLowerCase();
    const pValue = (typeof parsedName === 'function' ? parsedName() : parsedName).toLowerCase();

    // Clean up name for fuzzy matching (e.g. "Virtuous Role" -> "virtuous")
    const pWord = pValue.replace(' role', '').replace(' token', '').trim();

    // 1. Direct match
    if (s === pValue || s.includes(pValue) || pValue.includes(s)) return true;

    // 2. Fuzzy word match (matches "monster // virtuous" if searching for "virtuous")
    if (s.includes(pWord)) return true;

    return false;
};
```

### Suggested Improvement
Add explicit handling for the `//` separator in DFC names:

```javascript
const isMatch = (scryfallName, parsedName) => {
    if (!scryfallName || !parsedName) return false;
    const s = scryfallName.toLowerCase();
    const pValue = (typeof parsedName === 'function' ? parsedName() : parsedName).toLowerCase();

    // Clean up parsed name (e.g. "Virtuous Role" -> "virtuous")
    const pWord = pValue.replace(' role', '').replace(' token', '').trim();

    // 1. Direct/substring match
    if (s === pValue || s.includes(pValue) || pValue.includes(s)) return true;

    // 2. Fuzzy word match
    if (s.includes(pWord)) return true;

    // 3. DFC face matching: "Monster // Virtuous" should match "Virtuous"
    if (s.includes('//')) {
        const faces = s.split('//').map(f => f.trim());
        if (faces.some(face => face === pWord || face.includes(pWord))) return true;
    }

    return false;
};
```

---

## Testing Checklist

After applying fixes, verify:

- [ ] Add **Ellivere of the Wild Court** to battlefield
- [ ] Trigger ETB → select target creature
- [ ] Confirm token created is named **"Virtuous Role"** (not "Monster" or "Monster // Virtuous")
- [ ] Confirm oracle text shows: *"Enchanted creature gets +1/+1 for each enchantment you control."*
- [ ] Attack with Ellivere → second Virtuous Role created correctly
- [ ] Role replacement rule still works (old role removed when new one attaches to same creature)

---

## Related Files Reference

| File | Purpose |
|------|---------|
| `scryfallService.js` | Fetches and formats card/token data from Scryfall API |
| `gameEngine.js` | Executes abilities, creates tokens, handles game state |
| `signatureCards.js` | Manual definitions for complex cards (Ellivere, Virtuous Role, etc.) |
| `cardUtils.js` | Creates battlefield card objects from definitions |

---

## Notes

- The `SIGNATURE_DATA` already has correct definitions for `Virtuous Role` and `Virtuous` — this fix ensures they're used as fallback
- Role tokens are Aura enchantments with the Role subtype; the Role Rule (one role per player per creature) is already implemented in `performRoleCleanup`
- Scryfall returns DFC tokens with `layout: "double_faced_token"` — this can be used for more explicit detection if needed
