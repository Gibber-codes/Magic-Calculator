# Feature: Placeholder Land System with Conversion UI

## Overview

Add a generic "Land" placeholder card that displays as a grey banner showing "Land: X" (where X is the stack count). When selected, the info panel shows conversion options to transform the selected amount into specific basic lands (Forest, Island, Mountain, Plains, Swamp). All basic lands display as simple colored top banners with no art or type description.

---

## Visual Specifications

### 1. Placeholder Land Card (Grey)
- **Display**: Single grey banner (no art window, no bottom banner)
- **Text**: "Land: {count}" centered
- **Color**: Grey (`#6b7280` border, `#374151` fill)
- **Size**: Same width as normal cards (140px), reduced height (~50px)
- **Stackable**: Shows "Land: 5" for 5 lands, not "x5"

### 2. Basic Land Cards (Colored Banners)
- **Display**: Single colored top banner only (no art, no type line)
- **Text**: Land name centered (e.g., "Forest")
- **Colors**:
  - Forest: Green (`#15803d` border, `#22c55e` fill)
  - Island: Blue (`#2563eb` border, `#60a5fa` fill)
  - Mountain: Red (`#b91c1c` border, `#ef4444` fill)
  - Plains: White/Yellow (`#d4d4d8` border, `#fef9c3` fill)
  - Swamp: Black/Grey (`#1f2937` border, `#4b5563` fill, white text)
- **Size**: Same as placeholder (~50px height)

### 3. Info Panel Conversion UI
When a placeholder land is selected:
- Show 5 colored buttons (one per basic land type)
- Each button shows the land name and mana symbol color
- Clicking converts X selected lands to that type
- Stack selector (like counter modify) to choose how many to convert

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/BattlefieldCard.jsx` | Add placeholder/basic land render mode |
| `src/components/SelectedCardPanel.jsx` | Add land conversion UI section |
| `src/components/RedesignedCardFrame.jsx` | Add `LandBanner` component (optional) |
| `src/utils/cardUtils.js` | Add `isPlaceholderLand()` and `isBasicLand()` helpers |
| `src/App.jsx` | Add `handleLandConversion()` function |
| `src/data/signatureCards.js` | Add basic land definitions |

---

## Implementation Details

### Step 1: Add Land Type Helpers (`cardUtils.js`)

Add these helper functions:

```javascript
// Land type constants
export const BASIC_LAND_NAMES = ['Forest', 'Island', 'Mountain', 'Plains', 'Swamp'];

export const BASIC_LAND_COLORS = {
    'Forest': { colors: ['G'], borderColor: '#15803d', fillColor: '#22c55e', textColor: 'black' },
    'Island': { colors: ['U'], borderColor: '#2563eb', fillColor: '#60a5fa', textColor: 'black' },
    'Mountain': { colors: ['R'], borderColor: '#b91c1c', fillColor: '#ef4444', textColor: 'black' },
    'Plains': { colors: ['W'], borderColor: '#d4d4d8', fillColor: '#fef9c3', textColor: 'black' },
    'Swamp': { colors: ['B'], borderColor: '#1f2937', fillColor: '#4b5563', textColor: 'white' },
};

export const PLACEHOLDER_LAND = {
    name: 'Land',
    type: 'Land',
    type_line: 'Land',
    isPlaceholderLand: true,
    colors: [],
    // Grey colors
    borderColor: '#6b7280',
    fillColor: '#374151',
    textColor: 'white'
};

export const isPlaceholderLand = (card) => {
    return card?.isPlaceholderLand === true || card?.name === 'Land';
};

export const isBasicLand = (card) => {
    if (!card?.name) return false;
    return BASIC_LAND_NAMES.includes(card.name);
};

export const isMinimalDisplayLand = (card) => {
    return isPlaceholderLand(card) || isBasicLand(card);
};
```

---

### Step 2: Add Basic Land Definitions (`signatureCards.js`)

Add to `SIGNATURE_DATA`:

```javascript
// Basic Lands - minimal display, no abilities
'Forest': {
    name: 'Forest',
    type: 'Land',
    type_line: 'Basic Land — Forest',
    oracle_text: '{T}: Add {G}.',
    colors: ['G'],
    isBasicLand: true
},
'Island': {
    name: 'Island',
    type: 'Land',
    type_line: 'Basic Land — Island',
    oracle_text: '{T}: Add {U}.',
    colors: ['U'],
    isBasicLand: true
},
'Mountain': {
    name: 'Mountain',
    type: 'Land',
    type_line: 'Basic Land — Mountain',
    oracle_text: '{T}: Add {R}.',
    colors: ['R'],
    isBasicLand: true
},
'Plains': {
    name: 'Plains',
    type: 'Land',
    type_line: 'Basic Land — Plains',
    oracle_text: '{T}: Add {W}.',
    colors: ['W'],
    isBasicLand: true
},
'Swamp': {
    name: 'Swamp',
    type: 'Land',
    type_line: 'Basic Land — Swamp',
    oracle_text: '{T}: Add {B}.',
    colors: ['B'],
    isBasicLand: true
},
// Placeholder Land
'Land': {
    name: 'Land',
    type: 'Land',
    type_line: 'Land',
    oracle_text: '',
    colors: [],
    isPlaceholderLand: true
}
```

---

### Step 3: Modify BattlefieldCard Rendering (`BattlefieldCard.jsx`)

Add imports at top:

```javascript
import { isPlaceholderLand, isBasicLand, isMinimalDisplayLand, BASIC_LAND_COLORS, PLACEHOLDER_LAND } from '../utils/cardUtils';
```

Add a new render mode check early in the component:

```javascript
// Check for minimal land display mode
const useMinimalLandDisplay = isMinimalDisplayLand(card);

// Get land-specific colors
const getLandColors = () => {
    if (isPlaceholderLand(card)) {
        return {
            borderColor: '#6b7280',
            fillColor: '#374151',
            textColor: 'white'
        };
    }
    if (isBasicLand(card)) {
        return BASIC_LAND_COLORS[card.name] || {
            borderColor: '#6b7280',
            fillColor: '#374151',
            textColor: 'white'
        };
    }
    return null;
};

const landColors = useMinimalLandDisplay ? getLandColors() : null;
```

Replace the main render return with a conditional:

```jsx
// Early return for minimal land display
if (useMinimalLandDisplay) {
    const displayText = isPlaceholderLand(card) 
        ? `Land: ${count}` 
        : card.name;
    
    return (
        <div
            className={`absolute cursor-pointer flex flex-col items-center
                ${isHovered ? 'z-50' : ''}
                ${isSelected ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] scale-105 z-40 rounded-lg' : ''}
                ${card.tapped ? 'opacity-70' : ''}
                ${!isDragging ? 'transition-all duration-200 ease-out' : ''}`}
            style={{
                width: CARD_WIDTH,
                left: x,
                top: y,
                touchAction: 'none'
            }}
            onMouseDown={(e) => onMouseDown(e, card)}
            onMouseEnter={() => !isTargeting && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Tap Indicator */}
            {card.tapped && (
                <div className="absolute -top-2 -right-2 z-50">
                    <div className="bg-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg border border-amber-400">
                        TAPPED
                    </div>
                </div>
            )}

            {/* Single Banner for Land */}
            <div className="relative">
                <TopBanner
                    width={CARD_WIDTH}
                    height={44}
                    borderColor={landColors.borderColor}
                    fillColor={landColors.fillColor}
                >
                    <div 
                        className="w-full text-center text-sm font-bold truncate leading-tight"
                        style={{ color: landColors.textColor }}
                    >
                        {displayText}
                    </div>
                </TopBanner>
            </div>

            {/* Hover Actions (Tap/Delete) */}
            {isHovered && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-50">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction('tap', card); }}
                        className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow-lg border border-slate-500"
                        title="Tap/Untap"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction('delete', card, count); }}
                        className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg border border-red-400"
                        title="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ... rest of normal card rendering
```

---

### Step 4: Add Land Conversion UI (`SelectedCardPanel.jsx`)

Add imports:

```javascript
import { isPlaceholderLand, BASIC_LAND_NAMES, BASIC_LAND_COLORS } from '../utils/cardUtils';
```

Add new prop for conversion handler:

```javascript
const SelectedCardPanel = ({
    card,
    onClose,
    onActivateAbility,
    onCounterChange,
    onConvertLand,  // NEW: (landType, count) => void
    stackCount = 1,
    stackCards = [],
    allCards = []
}) => {
```

Add conversion count state:

```javascript
const [convertCount, setConvertCount] = useState(1);

// Reset convert count when card changes
useEffect(() => {
    setConvertCount(stackCount > 1 ? stackCount : 1);
}, [card?.id, stackCount]);
```

Add the conversion UI section (insert after the header, before card image):

```jsx
{/* Land Conversion UI - Only for Placeholder Lands */}
{isPlaceholderLand(card) && (
    <div className="space-y-4">
        {/* Conversion Amount Selector */}
        {stackCount > 1 && (
            <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">Convert Amount</span>
                    <span className="text-lg font-bold text-white">{convertCount} / {stackCount}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max={stackCount}
                    value={convertCount}
                    onChange={(e) => setConvertCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        )}

        {/* Land Type Buttons */}
        <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Convert to Basic Land</h4>
            <div className="grid grid-cols-1 gap-2">
                {BASIC_LAND_NAMES.map(landName => {
                    const landStyle = BASIC_LAND_COLORS[landName];
                    return (
                        <button
                            key={landName}
                            onClick={() => onConvertLand && onConvertLand(landName, convertCount)}
                            className="flex items-center justify-between p-3 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
                            style={{
                                backgroundColor: landStyle.fillColor,
                                borderColor: landStyle.borderColor,
                                color: landStyle.textColor
                            }}
                        >
                            <span className="font-bold text-lg">{landName}</span>
                            <span 
                                className="text-xs px-2 py-1 rounded-lg font-semibold"
                                style={{ 
                                    backgroundColor: landStyle.borderColor,
                                    color: landStyle.textColor === 'white' ? 'white' : 'black'
                                }}
                            >
                                +{convertCount}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
)}

{/* Hide card image for placeholder lands */}
{!isPlaceholderLand(card) && card.image_normal && (
    // ... existing card image code
)}
```

---

### Step 5: Add Conversion Handler (`App.jsx`)

Add the conversion function:

```javascript
/**
 * Convert placeholder lands to a specific basic land type
 * @param {string} landType - 'Forest', 'Island', 'Mountain', 'Plains', or 'Swamp'
 * @param {number} count - How many to convert
 */
const handleLandConversion = (landType, count) => {
    if (!selectedCard || !isPlaceholderLand(selectedCard)) return;

    // Find the stack containing the selected placeholder land
    const stack = visibleStacks.find(s => s.cards.some(c => c.id === selectedCard.id));
    if (!stack) return;

    // Get the placeholder land cards to convert
    const landsToConvert = stack.cards.slice(0, count);
    const landsToKeep = stack.cards.slice(count);

    // Create new basic land cards
    const newLands = landsToConvert.map((oldLand, i) => {
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

    // Update cards state
    setCards(current => {
        // Remove converted placeholder lands
        const withoutConverted = current.filter(c => !landsToConvert.some(l => l.id === c.id));
        // Add new basic lands
        return [...withoutConverted, ...newLands];
    });

    // Update selection to first new land if all were converted
    if (landsToKeep.length === 0) {
        setSelectedCard(newLands[0] || null);
    }

    logAction(`Converted ${count} Land → ${landType}`);
    saveHistoryState([...cards.filter(c => !landsToConvert.some(l => l.id === c.id)), ...newLands]);
};
```

Add import at top of App.jsx:

```javascript
import { isPlaceholderLand, BASIC_LAND_COLORS, createBattlefieldCard } from './utils/cardUtils';
import { SIGNATURE_DATA } from './data/signatureCards';
```

Pass handler to SelectedCardPanel:

```jsx
<SelectedCardPanel
    card={selectedCard}
    allCards={cards}
    onClose={() => setSelectedCard(null)}
    onActivateAbility={(card, ability) => {
        logAction(`Activated: ${ability.cost}`);
        handleActivateAbility(card, ability);
    }}
    onConvertLand={handleLandConversion}  // ADD THIS
    // ... rest of props
/>
```

---

### Step 6: Add Quick-Add Button for Placeholder Land

In `AddCardPanel.jsx` or wherever your quick-add presets are, add a Land button:

```jsx
// In the presets or quick-add section
<button
    onClick={() => onAddCard({
        name: 'Land',
        type: 'Land',
        type_line: 'Land',
        isPlaceholderLand: true,
        colors: []
    })}
    className="p-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold transition-all"
>
    + Land
</button>
```

---

## Testing Checklist

After implementation, verify:

- [ ] **Add Placeholder Land**: Click quick-add button, grey "Land: 1" appears
- [ ] **Stack Placeholder Lands**: Add multiple, displays "Land: 5" (not "x5")
- [ ] **Select Placeholder**: Click to select, info panel shows conversion UI
- [ ] **Conversion Slider**: With 5 lands, slider goes 1-5
- [ ] **Convert to Forest**: Click Forest button, creates green Forest banner(s)
- [ ] **Convert Partial Stack**: Convert 2 of 5 lands, 3 placeholders remain
- [ ] **Basic Land Display**: Forest shows as single green banner "Forest"
- [ ] **Tap Basic Land**: Tapping shows TAPPED indicator, opacity change
- [ ] **Delete Basic Land**: Hover and delete works
- [ ] **No Art/Type**: Basic lands have NO art window, NO type line banner

---

## Color Reference

| Land | Border | Fill | Text |
|------|--------|------|------|
| Placeholder | `#6b7280` | `#374151` | white |
| Forest | `#15803d` | `#22c55e` | black |
| Island | `#2563eb` | `#60a5fa` | black |
| Mountain | `#b91c1c` | `#ef4444` | black |
| Plains | `#d4d4d8` | `#fef9c3` | black |
| Swamp | `#1f2937` | `#4b5563` | white |

---

## Optional Enhancements

### Mana Symbol Icons
Add small mana icons to the conversion buttons using emoji:
- 🌲 Forest (or green circle)
- 💧 Island (or blue circle)  
- 🔥 Mountain (or red circle)
- ☀️ Plains (or white circle)
- 💀 Swamp (or black circle)

### Keyboard Shortcuts
- `1-5` keys to quickly convert to each land type when placeholder is selected

### Sound/Animation
- Brief color flash when converting lands
- Satisfying "click" sound on conversion

---

## File Structure Summary

```
src/
├── components/
│   ├── BattlefieldCard.jsx    ← Add minimal land render mode
│   └── SelectedCardPanel.jsx  ← Add conversion UI section
├── utils/
│   └── cardUtils.js           ← Add land helper functions
├── data/
│   └── signatureCards.js      ← Add basic land definitions
└── App.jsx                    ← Add handleLandConversion()
```
