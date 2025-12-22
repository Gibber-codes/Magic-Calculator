# Bottom Control Buttons Implementation Guide

## Overview
Replace the lands row with 4 control button cards: START TURN, ADD CARD, SELECT ALL, LANDS

## Step 1: Update Layout Logic in App.jsx

### 1.1 Remove Lands from Battlefield Layout
In the `cardPositions` useMemo (around line 450-500), **remove the lands row** from the battlefield:

**FIND THIS SECTION:**
```javascript
const lands = visibleStacks.filter(g => isLand(g.leader));
const creatures = visibleStacks.filter(g => isCreature(g.leader));
const others = visibleStacks.filter(g => !isLand(g.leader) && !isCreature(g.leader));

// Creatures at Top
layoutRow(creatures, creatureRowY, creatureScrollX);

// Others (Artifacts/Enchantments) under creatures
layoutRow(others, othersRowY, othersScrollX);

// Lands at bottom
layoutRow(lands, landsRowY, landsScrollX);
```

**CHANGE TO:**
```javascript
// Remove lands from battlefield - they're now in bottom control panel
const creatures = visibleStacks.filter(g => isCreature(g.leader));
const others = visibleStacks.filter(g => !isLand(g.leader) && !isCreature(g.leader));

// Creatures at Top
layoutRow(creatures, creatureRowY, creatureScrollX);

// Others (Artifacts/Enchantments) under creatures  
layoutRow(others, othersRowY, othersScrollX);

// Lands are NO LONGER rendered on battlefield - they're hidden
// (Land count will be shown in bottom control panel)
```

### 1.2 Update Drag Detection Logic
In the `onMouseDown` and `onTouchStart` handlers, **remove lands from the row detection**:

**FIND THIS SECTION:**
```javascript
const distances = [
  { type: 'creatures', dist: Math.abs(relativeY - creatureCenterY), scroll: creatureScrollX },
  { type: 'others', dist: Math.abs(relativeY - othersCenterY), scroll: othersScrollX },
  { type: 'lands', dist: Math.abs(relativeY - landsCenterY), scroll: landsScrollX }
];
```

**CHANGE TO:**
```javascript
const distances = [
  { type: 'creatures', dist: Math.abs(relativeY - creatureCenterY), scroll: creatureScrollX },
  { type: 'others', dist: Math.abs(relativeY - othersCenterY), scroll: othersScrollX }
  // Removed 'lands' - no longer on battlefield
];
```

**ALSO FIND THIS:**
```javascript
if (rowType === 'creatures') rowCards = visibleStacks.filter(g => isCreature(g.leader));
else if (rowType === 'lands') rowCards = visibleStacks.filter(g => isLand(g.leader));
else rowCards = visibleStacks.filter(g => !isCreature(g.leader) && !isLand(g.leader));
```

**CHANGE TO:**
```javascript
if (rowType === 'creatures') rowCards = visibleStacks.filter(g => isCreature(g.leader));
else rowCards = visibleStacks.filter(g => !isCreature(g.leader) && !isLand(g.leader));
// Removed lands condition
```

### 1.3 Update Snap Logic
In the snap logic (onMouseUp/onTouchEnd), **remove lands scrolling**:

**FIND THIS:**
```javascript
if (dragRef.current.rowType === 'creatures') setCreatureScrollX(prev => snap(prev));
else if (dragRef.current.rowType === 'others') setOthersScrollX(prev => snap(prev));
else if (dragRef.current.rowType === 'lands') setLandsScrollX(prev => snap(prev));
```

**CHANGE TO:**
```javascript
if (dragRef.current.rowType === 'creatures') setCreatureScrollX(prev => snap(prev));
else if (dragRef.current.rowType === 'others') setOthersScrollX(prev => snap(prev));
// Removed lands snap
```

### 1.4 Update Vertical Snap Targets
**FIND THIS:**
```javascript
const snapTargets = [
  TARGET_CENTER_Y - creatureBaseY,
  TARGET_CENTER_Y - othersBaseY,
  TARGET_CENTER_Y - landsBaseY
];
```

**CHANGE TO:**
```javascript
const snapTargets = [
  TARGET_CENTER_Y - creatureBaseY,
  TARGET_CENTER_Y - othersBaseY
  // Removed landsBaseY
];
```

## Step 2: Add Bottom Control Panel Component

### 2.1 Create New Component File
Create `/src/components/BottomControlPanel.jsx`:

```jsx
import React from 'react';
import { Play, Plus, CheckCircle, Globe } from 'lucide-react';

const BottomControlPanel = ({ 
  onStartTurn, 
  onAddCard, 
  onSelectAll, 
  onOpenLands,
  landCount = 0 
}) => {
  return (
    <div className="px-3 py-3">
      <div className="flex gap-2 justify-center items-center max-w-2xl mx-auto">
        
        {/* START TURN Button */}
        <button 
          onClick={onStartTurn}
          className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-green-500/50 bg-slate-800/90 hover:border-green-400 active:scale-95 transition-all"
        >
          <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
            <Play className="w-8 h-8 text-green-400 fill-current" />
            <span className="text-green-400 text-xs font-bold uppercase tracking-wide">Start Turn</span>
          </div>
        </button>

        {/* ADD CARD Button */}
        <button 
          onClick={onAddCard}
          className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-blue-500/50 bg-slate-800/90 hover:border-blue-400 active:scale-95 transition-all"
        >
          <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
            <Plus className="w-7 h-7 text-blue-400" strokeWidth={2.5} />
            <span className="text-blue-400 text-xs font-bold uppercase tracking-wide">Add Card</span>
          </div>
        </button>

        {/* SELECT ALL Button */}
        <button 
          onClick={onSelectAll}
          className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-purple-500/50 bg-slate-800/90 hover:border-purple-400 active:scale-95 transition-all"
        >
          <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
            <CheckCircle className="w-7 h-7 text-purple-400" />
            <span className="text-purple-400 text-xs font-bold uppercase tracking-wide">Select All</span>
          </div>
        </button>

        {/* LANDS Button */}
        <button 
          onClick={onOpenLands}
          className="flex-1 max-w-[140px] h-20 rounded-lg overflow-hidden shadow-lg border-2 border-emerald-500/50 bg-slate-800/90 hover:border-emerald-400 active:scale-95 transition-all relative"
        >
          <div className="h-full flex flex-col items-center justify-center gap-1 px-3">
            <Globe className="w-7 h-7 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">Lands</span>
          </div>
          {/* Count Badge */}
          {landCount > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">{landCount}</span>
            </div>
          )}
        </button>

      </div>
    </div>
  );
};

export default BottomControlPanel;
```

### 2.2 Import Component in App.jsx
At the top of App.jsx, add:

```javascript
import BottomControlPanel from './components/BottomControlPanel';
```

## Step 3: Add Button Handlers in App.jsx

Add these handler functions in App.jsx (around where other handlers are defined):

```javascript
// Bottom Control Button Handlers
const handleStartTurn = () => {
  // TODO: Implement turn start logic
  // For now, just log
  console.log('Start Turn clicked');
  logAction('Started new turn');
};

const handleSelectAll = () => {
  // Select all cards on battlefield
  handleToggleSelectAll();
};

const handleOpenLands = () => {
  // Open lands management panel
  setActivePanel(activePanel === 'lands' ? null : 'lands');
};

// Calculate land count for badge
const landCount = cards.filter(c => c.zone === 'battlefield' && isLand(c)).length;
```

## Step 4: Add BottomControlPanel to JSX

In the main return JSX of App.jsx, **add the BottomControlPanel component at the bottom**, just before the closing tags:

**FIND THE CLOSING SECTION (around line 1200-1300):**
```jsx
      </div>

      {/* Other panels... */}
    </div>
  );
}
```

**ADD BEFORE THE CLOSING `</div>`:**
```jsx
      </div>

      {/* Bottom Control Panel - Replaces Lands Row */}
      <BottomControlPanel
        onStartTurn={handleStartTurn}
        onAddCard={() => setActivePanel(activePanel === 'add' ? null : 'add')}
        onSelectAll={handleSelectAll}
        onOpenLands={handleOpenLands}
        landCount={landCount}
      />

      {/* Other panels... */}
    </div>
  );
}
```

## Step 5: Update CSS for Scroll Snap

Add to `/src/styles/mobile.css` or create inline styles:

```css
/* Hide scrollbars on card rows */
.battlefield-row {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  scroll-snap-type: x mandatory;
  scroll-padding-left: 0.5rem;
  -webkit-overflow-scrolling: touch;
}

.battlefield-row::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.battlefield-card-wrapper {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

## Step 6: Create Lands Management Panel (Optional)

If you want the "Lands" button to open a panel for managing lands, create a new component:

### `/src/components/LandsPanel.jsx`:
```jsx
import React from 'react';
import { X } from 'lucide-react';

const LandsPanel = ({ cards, onClose, onAddLand, onRemoveLand }) => {
  const lands = cards.filter(c => c.zone === 'battlefield' && c.type_line?.toLowerCase().includes('land'));
  
  const basicLandTypes = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end">
      <div className="bg-slate-900 rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Lands ({lands.length})</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Quick Add Basic Lands */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm text-gray-400 mb-3">Quick Add Basic Lands</h3>
          <div className="grid grid-cols-5 gap-2">
            {basicLandTypes.map(land => (
              <button
                key={land}
                onClick={() => onAddLand(land)}
                className="bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-white text-sm font-medium transition-all active:scale-95"
              >
                {land}
              </button>
            ))}
          </div>
        </div>

        {/* Current Lands */}
        <div className="p-4">
          <h3 className="text-sm text-gray-400 mb-3">On Battlefield</h3>
          {lands.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No lands on battlefield</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {lands.map(land => (
                <div key={land.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-white text-sm">{land.name}</span>
                  <button
                    onClick={() => onRemoveLand(land.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandsPanel;
```

Then add to App.jsx:
```jsx
import LandsPanel from './components/LandsPanel';

// In JSX, add conditionally:
{activePanel === 'lands' && (
  <LandsPanel
    cards={cards}
    onClose={() => setActivePanel(null)}
    onAddLand={(landName) => {
      // Use your existing addCard logic
      getScryfallCard(landName).then(def => {
        if (def) addCard(def, 1);
      });
    }}
    onRemoveLand={(landId) => {
      // Remove land from battlefield
      setCards(prev => prev.filter(c => c.id !== landId));
    }}
  />
)}
```

## Testing Checklist

- [ ] Lands no longer appear on battlefield
- [ ] Only Creatures and Others rows visible
- [ ] Bottom control panel appears at bottom
- [ ] START TURN button logs action (placeholder)
- [ ] ADD CARD opens add panel
- [ ] SELECT ALL selects all battlefield cards
- [ ] LANDS button shows correct count
- [ ] LANDS button opens lands panel
- [ ] Scroll snap works on creature/others rows
- [ ] No scrollbars visible on card rows
- [ ] Mobile responsive layout works

## Notes

- The lands are still in the `cards` array with `zone: 'battlefield'`, they're just not rendered in the battlefield layout
- The land count badge will update automatically
- You can extend the START TURN handler to implement your turn logic
- The scroll snap will make cards align nicely to the left edge when scrolling
