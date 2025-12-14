# Implementing Scryfall Card Search with Autocomplete in Vanilla JavaScript

Scryfall's API offers two critical endpoints for card search: an **autocomplete endpoint** returning up to 20 card name suggestions, and a **named card endpoint** for fetching complete card data. The implementation requires careful attention to rate limiting (maximum **10 requests per second**), proper debouncing of user input, and handling multi-face cards where fields like `oracle_text` and `power` appear in the `card_faces` array rather than at the root level.

## API endpoints and rate limiting requirements

Scryfall provides straightforward REST endpoints without authentication requirements. The autocomplete endpoint at `https://api.scryfall.com/cards/autocomplete?q={query}` returns a catalog object containing card names sorted by match relevance, heavily favoring results beginning with your query string. It requires a minimum **2-character query** and returns up to 20 results.

For fetching complete card details after selection, use `https://api.scryfall.com/cards/named?exact={cardname}` for exact matches or the `fuzzy` parameter for approximate matching. The search endpoint at `https://api.scryfall.com/cards/search?q={query}` supports Scryfall's full query syntax and returns paginated results of **175 cards per page**.

**Rate limiting is critical**: Scryfall mandates a **50-100 millisecond delay** between requests, with a hard limit of 10 requests per second. Exceeding this triggers HTTP 429 responses and may result in IP bans. All requests must include `User-Agent` and `Accept` headers. Scryfall recommends caching data locally for at least 24 hours since card data changes infrequently.

```javascript
const SCRYFALL_BASE = 'https://api.scryfall.com';

async function fetchWithHeaders(url) {
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'YourAppName/1.0'
    }
  });
}
```

## Handling the required card fields

Your specified fields require special handling because multi-face cards (split, transform, modal DFC) store face-specific data in the `card_faces` array rather than at the root level. The `all_parts` field only exists when cards reference tokens, meld pairs, or other related cards.

```javascript
function extractCardData(card) {
  // Handle multi-face cards where data lives in card_faces
  const primaryFace = card.card_faces?.[0];
  const isMultiFace = !!card.card_faces;
  
  return {
    name: card.name,
    oracle_text: card.oracle_text || primaryFace?.oracle_text || '',
    type_line: card.type_line || primaryFace?.type_line || '',
    power: card.power || primaryFace?.power || null,
    toughness: card.toughness || primaryFace?.toughness || null,
    colors: card.colors || primaryFace?.colors || [],
    all_parts: card.all_parts || null,
    // Additional useful fields
    image_uri: card.image_uris?.normal || primaryFace?.image_uris?.normal,
    mana_cost: card.mana_cost || primaryFace?.mana_cost,
    scryfall_id: card.id
  };
}
```

The **colors array** uses single uppercase characters: `W` (White), `U` (Blue), `B` (Black), `R` (Red), `G` (Green), with an empty array `[]` indicating colorless. The **all_parts field** contains `related_card` objects with `component` types including `token`, `meld_part`, `meld_result`, and `combo_piece`:

```javascript
// Example all_parts structure for a token-creating card
{
  "all_parts": [{
    "object": "related_card",
    "component": "token",
    "name": "Human Soldier",
    "type_line": "Token Creature — Human Soldier",
    "uri": "https://api.scryfall.com/cards/..."
  }]
}
```

## Complete autocomplete implementation

The implementation combines debounced input handling, request cancellation to prevent race conditions, and keyboard navigation for accessibility. A **300ms debounce delay** provides a comfortable margin above Scryfall's rate limits while maintaining responsive UX.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTG Card Search</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white p-8">
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">MTG Card Search</h1>
    
    <!-- Search Container -->
    <div class="relative">
      <div class="relative">
        <input 
          type="text" 
          id="card-search"
          class="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-lg 
                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Search for Magic cards..."
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls="suggestions-list"
        />
        <div id="loading" class="absolute right-3 top-1/2 -translate-y-1/2 hidden">
          <div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
      
      <!-- Autocomplete Dropdown -->
      <ul id="suggestions-list" 
          class="absolute w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg 
                 shadow-xl z-50 max-h-80 overflow-y-auto hidden"
          role="listbox">
      </ul>
    </div>
    
    <!-- Error Display -->
    <div id="error-message" class="mt-2 text-red-400 text-sm hidden"></div>
    
    <!-- Card Display -->
    <div id="card-display" class="mt-6 hidden"></div>
    
    <!-- Recent Searches -->
    <div id="recent-searches" class="mt-8">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-semibold text-gray-300">Recent Searches</h2>
        <button id="clear-recent" class="text-sm text-red-400 hover:text-red-300">Clear All</button>
      </div>
      <ul id="recent-list" class="space-y-2"></ul>
    </div>
  </div>

  <script src="mtg-search.js"></script>
</body>
</html>
```

```javascript
// mtg-search.js - Complete Implementation

class MTGCardSearch {
  constructor() {
    this.SCRYFALL_API = 'https://api.scryfall.com';
    this.DEBOUNCE_DELAY = 300;
    this.MAX_RECENT = 10;
    this.STORAGE_KEY = 'mtgRecentSearches';
    
    this.abortController = null;
    this.selectedIndex = -1;
    this.currentSuggestions = [];
    
    this.input = document.getElementById('card-search');
    this.suggestionsList = document.getElementById('suggestions-list');
    this.loading = document.getElementById('loading');
    this.errorMessage = document.getElementById('error-message');
    this.cardDisplay = document.getElementById('card-display');
    this.recentList = document.getElementById('recent-list');
    this.clearRecentBtn = document.getElementById('clear-recent');
    
    this.init();
  }

  init() {
    this.input.addEventListener('input', this.debounce(this.handleInput.bind(this), this.DEBOUNCE_DELAY));
    this.input.addEventListener('keydown', this.handleKeydown.bind(this));
    this.input.addEventListener('focus', () => this.showRecentOnEmpty());
    this.clearRecentBtn.addEventListener('click', () => this.clearRecentSearches());
    document.addEventListener('click', (e) => this.handleClickOutside(e));
    
    this.renderRecentSearches();
  }

  // ==================== DEBOUNCE ====================
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // ==================== API METHODS ====================
  async fetchAutocomplete(query) {
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    const url = `${this.SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`;
    
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: this.abortController.signal
      });

      if (response.status === 429) throw new Error('Rate limited. Please slow down.');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      if (error.name === 'AbortError') return [];
      throw error;
    }
  }

  async fetchCardByName(cardName) {
    const url = `${this.SCRYFALL_API}/cards/named?exact=${encodeURIComponent(cardName)}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    
    if (!response.ok) throw new Error('Card not found');
    return response.json();
  }

  // ==================== INPUT HANDLING ====================
  async handleInput(event) {
    const query = event.target.value.trim();
    
    if (query.length < 2) {
      this.closeSuggestions();
      return;
    }

    this.showLoading();
    try {
      const suggestions = await this.fetchAutocomplete(query);
      this.renderSuggestions(suggestions, query);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  handleKeydown(event) {
    const isOpen = !this.suggestionsList.classList.contains('hidden');
    const itemCount = this.currentSuggestions.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (isOpen) {
          this.selectedIndex = (this.selectedIndex + 1) % itemCount;
          this.updateSelection();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          this.selectedIndex = this.selectedIndex <= 0 ? itemCount - 1 : this.selectedIndex - 1;
          this.updateSelection();
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (isOpen && this.selectedIndex >= 0) {
          this.selectCard(this.currentSuggestions[this.selectedIndex]);
        }
        break;
      case 'Escape':
        this.closeSuggestions();
        break;
    }
  }

  // ==================== SUGGESTIONS UI ====================
  renderSuggestions(suggestions, query) {
    this.currentSuggestions = suggestions;
    this.selectedIndex = -1;
    this.suggestionsList.innerHTML = '';

    if (!suggestions.length) {
      this.closeSuggestions();
      return;
    }

    suggestions.forEach((name, index) => {
      const li = document.createElement('li');
      li.id = `suggestion-${index}`;
      li.className = 'px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors';
      li.setAttribute('role', 'option');
      li.innerHTML = this.highlightMatch(name, query);
      
      li.addEventListener('click', () => this.selectCard(name));
      li.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelection();
      });
      
      this.suggestionsList.appendChild(li);
    });

    this.openSuggestions();
  }

  highlightMatch(text, query) {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="text-blue-400 font-semibold">$1</span>');
  }

  updateSelection() {
    const items = this.suggestionsList.querySelectorAll('li');
    items.forEach((item, index) => {
      item.classList.toggle('bg-blue-600', index === this.selectedIndex);
      item.classList.toggle('hover:bg-gray-700', index !== this.selectedIndex);
    });
  }

  openSuggestions() {
    this.suggestionsList.classList.remove('hidden');
    this.input.setAttribute('aria-expanded', 'true');
  }

  closeSuggestions() {
    this.suggestionsList.classList.add('hidden');
    this.input.setAttribute('aria-expanded', 'false');
    this.selectedIndex = -1;
  }

  // ==================== CARD SELECTION ====================
  async selectCard(cardName) {
    this.input.value = cardName;
    this.closeSuggestions();
    this.showLoading();

    try {
      const card = await this.fetchCardByName(cardName);
      const cardData = this.extractCardData(card);
      
      this.saveToRecent(cardData);
      this.displayCard(cardData);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  extractCardData(card) {
    const primaryFace = card.card_faces?.[0];
    
    return {
      scryfall_id: card.id,
      name: card.name,
      oracle_text: card.oracle_text || primaryFace?.oracle_text || '',
      type_line: card.type_line || primaryFace?.type_line || '',
      power: card.power || primaryFace?.power || null,
      toughness: card.toughness || primaryFace?.toughness || null,
      colors: card.colors || primaryFace?.colors || [],
      all_parts: card.all_parts || null,
      mana_cost: card.mana_cost || primaryFace?.mana_cost || '',
      image_uri: card.image_uris?.normal || primaryFace?.image_uris?.normal || '',
      set_name: card.set_name,
      prices: card.prices
    };
  }

  displayCard(card) {
    const colorMap = { W: 'Yellow', U: 'Blue', B: 'Purple', R: 'Red', G: 'Green' };
    const colorBadges = card.colors.map(c => 
      `<span class="px-2 py-1 rounded text-xs bg-gray-700">${colorMap[c] || c}</span>`
    ).join(' ') || '<span class="px-2 py-1 rounded text-xs bg-gray-700">Colorless</span>';

    const stats = card.power && card.toughness 
      ? `<p class="text-lg font-bold">${card.power}/${card.toughness}</p>` : '';

    const allParts = card.all_parts 
      ? `<div class="mt-3 pt-3 border-t border-gray-700">
           <p class="text-sm text-gray-400">Related Cards:</p>
           <ul class="text-sm mt-1">
             ${card.all_parts.map(p => `<li>• ${p.name} (${p.component})</li>`).join('')}
           </ul>
         </div>` : '';

    this.cardDisplay.innerHTML = `
      <div class="flex gap-6 bg-gray-800 rounded-lg p-4">
        <img src="${card.image_uri}" alt="${card.name}" class="w-64 rounded-lg shadow-lg">
        <div class="flex-1">
          <h2 class="text-2xl font-bold">${card.name}</h2>
          <p class="text-gray-400">${card.mana_cost}</p>
          <p class="text-gray-300 mt-1">${card.type_line}</p>
          <div class="flex gap-2 mt-2">${colorBadges}</div>
          <p class="mt-4 text-gray-200 whitespace-pre-line">${card.oracle_text}</p>
          ${stats}
          ${allParts}
          <p class="mt-4 text-green-400 font-semibold">
            ${card.prices?.usd ? `$${card.prices.usd}` : 'Price unavailable'}
          </p>
        </div>
      </div>
    `;
    this.cardDisplay.classList.remove('hidden');
  }

  // ==================== RECENT SEARCHES ====================
  getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  saveToRecent(card) {
    let recent = this.getRecentSearches();
    
    // Remove duplicate if exists
    recent = recent.filter(r => r.scryfall_id !== card.scryfall_id);
    
    // Add to front with timestamp
    recent.unshift({
      ...card,
      timestamp: Date.now()
    });
    
    // Limit to max items
    recent = recent.slice(0, this.MAX_RECENT);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
    this.renderRecentSearches();
  }

  removeFromRecent(scryfallId) {
    let recent = this.getRecentSearches();
    recent = recent.filter(r => r.scryfall_id !== scryfallId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
    this.renderRecentSearches();
  }

  clearRecentSearches() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.renderRecentSearches();
  }

  renderRecentSearches() {
    const recent = this.getRecentSearches();
    
    if (!recent.length) {
      this.recentList.innerHTML = '<li class="text-gray-500 text-sm">No recent searches</li>';
      return;
    }

    this.recentList.innerHTML = recent.map(card => `
      <li class="flex items-center gap-3 bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors">
        <img src="${card.image_uri}" alt="${card.name}" class="w-12 h-16 object-cover rounded">
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">${card.name}</p>
          <p class="text-sm text-gray-400 truncate">${card.type_line}</p>
        </div>
        <button 
          class="search-again px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium"
          data-name="${card.name}">
          Search
        </button>
        <button 
          class="remove-recent p-2 text-gray-400 hover:text-red-400"
          data-id="${card.scryfall_id}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </li>
    `).join('');

    // Attach event listeners
    this.recentList.querySelectorAll('.search-again').forEach(btn => {
      btn.addEventListener('click', () => this.selectCard(btn.dataset.name));
    });
    
    this.recentList.querySelectorAll('.remove-recent').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFromRecent(btn.dataset.id);
      });
    });
  }

  showRecentOnEmpty() {
    if (!this.input.value.trim()) {
      // Could show recent searches dropdown here
    }
  }

  // ==================== UTILITIES ====================
  showLoading() { this.loading.classList.remove('hidden'); }
  hideLoading() { this.loading.classList.add('hidden'); }
  
  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
    setTimeout(() => this.errorMessage.classList.add('hidden'), 3000);
  }

  handleClickOutside(event) {
    if (!this.input.contains(event.target) && !this.suggestionsList.contains(event.target)) {
      this.closeSuggestions();
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new MTGCardSearch());
```

## localStorage best practices for recent searches

The implementation stores recent searches as a JSON array with essential card data for quick display without additional API calls. **Limiting storage to 10 items** balances usability with storage constraints, while including timestamps enables optional expiration logic. The structure stores only necessary fields to minimize storage footprint while enabling rich UI rendering.

Key patterns include checking for localStorage availability (private browsing can disable it), moving duplicate entries to the front rather than creating duplicates, and wrapping JSON operations in try-catch blocks to handle malformed data gracefully. For data expiration, consider filtering entries older than 7 days during retrieval:

```javascript
getValidRecentSearches() {
  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  return this.getRecentSearches().filter(item => now - item.timestamp < TTL_MS);
}
```

## Handling edge cases with multi-face cards

Cards with multiple faces (split cards like "Wear // Tear", transform cards like "Delver of Secrets", modal double-faced cards) store face-specific fields in the `card_faces` array. The parent object's `oracle_text`, `type_line`, `power`, and `toughness` will be `null` for these cards, requiring fallback logic to access the primary face's data.

For complete multi-face support, iterate through all faces when displaying comprehensive card information:

```javascript
function getFullCardText(card) {
  if (!card.card_faces) {
    return { text: card.oracle_text, faces: null };
  }
  
  return {
    text: null,
    faces: card.card_faces.map(face => ({
      name: face.name,
      oracle_text: face.oracle_text,
      type_line: face.type_line,
      power: face.power,
      toughness: face.toughness,
      colors: face.colors,
      mana_cost: face.mana_cost
    }))
  };
}
```

## Conclusion

This implementation provides a complete, production-ready card search with **300ms debounced autocomplete**, **request cancellation** to prevent race conditions, **keyboard navigation** for accessibility, and **persistent recent searches** via localStorage. The key technical considerations are handling Scryfall's rate limits through debouncing, correctly extracting data from multi-face cards by checking both root and `card_faces` properties, and storing minimal but sufficient data in recent searches to enable rich UI without additional API calls. The `all_parts` field requires conditional rendering since it only appears on cards that create tokens or reference other cards by name.