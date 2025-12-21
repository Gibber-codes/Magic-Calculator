
# KeywordParser.js Refactoring Tasks for Antigravity IDE

## Task 1: Use declarative keyword handlers
- Create an object `keywordHandlers` that maps keyword strings to handler functions
- Refactor `parseKeywordAbilities` to use the `keywordHandlers` object instead of a switch statement
- Example:
```javascript
const keywordHandlers = {
  addendum: (card, params) => { /* ... */ },
  ascend: (card) => { /* ... */ },
  // ...
};

function parseKeywordAbilities(keywordString) {
  const [keyword, ...params] = keywordString.split(' ');
  const handler = keywordHandlers[keyword.toLowerCase()];
  return handler ? handler(card, params) : null;
}
```

## Task 2: Use object destructuring for function parameters
- Update keyword handler functions to use object destructuring for the `card` parameter
- Example:
```javascript
function handleAddendum({ oracle_text }, params) {
  // ...
}
```

## Task 3: Embrace functional programming principles
- Identify places where objects are being mutated in place
- Refactor to create new objects instead of mutating existing ones
- Example:
```javascript
function applyKeywordAbilities(card) {
  return {
    ...card,
    abilities: parseKeywordAbilities(card.oracle_text),
  };
}
```

## Task 4: Add JSDoc comments
- Add JSDoc comments to all functions in KeywordParser.js
- Include `@param`, `@returns`, and any relevant `@typedef` tags
- Example:
```javascript
/**
 * Parses an activated ability string into a cost and effect.
 * @param {string} abilityText - The activated ability text, e.g. "{2}, {T}: Draw a card."
 * @returns {{ cost: string, effect: string }} The parsed cost and effect.
 */
function parseActivatedAbility(abilityText) {
  // ...
}
```

## Task 5: Adopt a modular file structure
- Create separate directories for `abilities`, `cards`, `utils`, etc.
- Move related files into their appropriate directories
- Update import statements to reflect the new file locations

## Task 6: Set up a test suite
- Install a testing framework like Jest
- Write unit tests for KeywordParser.js functions
- Ensure tests are run automatically as part of your build process

## Task 7: Integrate a linter
- Install and configure ESLint in your project
- Define your preferred linting rules in an `.eslintrc` file
- Run the linter regularly and fix any reported issues

## Task 8: Profile and optimize performance
- Use browser DevTools or a profiling library to identify performance bottlenecks
- Focus on optimizing the most frequently called functions and expensive operations
- Consider caching expensive computations or using more efficient data structures

Remember to prioritize these tasks based on your current needs and iterate progressively. Refactoring is an ongoing process, so don't feel like you need to do everything at once. The goal is steady, incremental improvement.
