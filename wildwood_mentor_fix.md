# Wildwood Mentor Attack Trigger Fix

## Problem
When Wildwood Mentor attacks and its ability goes on the stack, clicking to resolve it fails because Wildwood Mentor itself is shown as a valid target, but the ability says "**another** target attacking creature" - meaning it can't target itself.

## Root Cause
In `App.jsx`, the `isCardEligible()` function checks if a card is a valid target for abilities. For Wildwood Mentor's attack trigger:
- ✅ It correctly checks that targets must be attacking (`c.attacking`)
- ❌ It FAILS to exclude the source card when the ability text includes "another"

## The Fix

**File**: `src/App.jsx`

**Location**: Inside the `isCardEligible` function, in the battlefield card rendering section

**Find this code block** (around line 550-565):

```javascript
if (targetingMode.action === 'activate-ability' || targetingMode.action === 'resolve-trigger') {
  // Check specific target type from ability definition
  const targetType = targetingMode.data?.targetType || 'creature';
  if (targetType.toLowerCase() === 'creature') {
    // Robust creature check
    const isCreature = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')) || c.isToken;

    // For 'resolve-trigger', only require attacking if the ability target text says so
    if (targetingMode.action === 'resolve-trigger') {
      const abilityTarget = targetingMode.data?.stackAbility?.triggerObj?.ability?.target || '';
      if (abilityTarget.includes('attacking')) {
        return isCreature && c.attacking;  // ❌ PROBLEM: Missing "another" check
      }
    }
    return isCreature;
  }
  // Add more types here as needed (e.g. 'permanent', 'planeswalker')
  return false;
}
```

**Replace with**:

```javascript
if (targetingMode.action === 'activate-ability' || targetingMode.action === 'resolve-trigger') {
  // Check specific target type from ability definition
  const targetType = targetingMode.data?.targetType || 'creature';
  if (targetType.toLowerCase() === 'creature') {
    // Robust creature check
    const isCreature = c.type === 'Creature' || (c.type_line && c.type_line.includes('Creature')) || c.isToken;

    // For 'resolve-trigger', only require attacking if the ability target text says so
    if (targetingMode.action === 'resolve-trigger') {
      const abilityTarget = targetingMode.data?.stackAbility?.triggerObj?.ability?.target || '';
      if (abilityTarget.includes('attacking')) {
        // ✅ FIX: Check for "another" keyword - if present, exclude the source card
        const excludeSource = abilityTarget.includes('another');
        const sourceId = targetingMode.data?.stackAbility?.sourceId;
        if (excludeSource && sourceId && c.id === sourceId) {
          return false; // Can't target the source itself
        }
        return isCreature && c.attacking;
      }
    }
    return isCreature;
  }
  // Add more types here as needed (e.g. 'permanent', 'planeswalker')
  return false;
}
```

## What This Fixes

1. **Extracts the ability's target string**: `'another_attacking_creature'`
2. **Checks for the word "another"**: If present, the source card must be excluded
3. **Gets the source card ID**: From the stack ability data
4. **Excludes the source**: Returns `false` if the current card is the source card
5. **Otherwise allows targeting**: Other attacking creatures can be selected

## Testing

After applying this fix:

1. Add Wildwood Mentor to battlefield
2. Add 2+ other creatures to battlefield  
3. Declare Wildwood Mentor + another creature as attackers
4. Wildwood Mentor's trigger goes on stack
5. Click the trigger to resolve it
6. **Expected**: You should see a green targeting glow on OTHER attacking creatures, NOT Wildwood Mentor
7. Click an other attacking creature
8. **Expected**: That creature gets +X/+X buff where X = Wildwood Mentor's power

## Why This Works

The keyword "another" in MTG rules means "a different permanent" - the source can never target itself. This fix implements that rule by:
- Detecting the "another" keyword in the ability target text
- Excluding the source card from valid targets
- Allowing all OTHER attacking creatures to be selected

This pattern will also fix similar abilities like:
- "Target another creature you control"
- "Another target permanent"
- "Target another attacking creature"
