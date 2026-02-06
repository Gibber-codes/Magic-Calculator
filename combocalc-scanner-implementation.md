# ComboCalc Card Scanner - Antigravity Implementation Prompt

## Project Context

Add OCR-based card scanning feature to ComboCalc MTG battlefield simulator. Primary use case: Rapidly digitize opponent's battlefield during live gameplay to calculate combat damage. Target: scan 5-8 creatures in under 60 seconds with 70%+ accuracy.

---

## Technical Stack Additions

**New Dependencies:**
```json
{
  "tesseract.js": "^5.0.4",
  "fuse.js": "^7.0.0"
}
```

**Browser APIs Used:**
- `getUserMedia()` - camera access
- Canvas API - image preprocessing
- LocalStorage - cache recent scans

---

## File Structure

```
/src/
├── components/
│   ├── Scanner/
│   │   ├── ScannerModal.jsx           # Main scanner interface
│   │   ├── CameraCapture.jsx          # Camera UI + capture button
│   │   ├── ConfirmationPanel.jsx      # Review/edit detected cards
│   │   └── ScannerButton.jsx          # Trigger button in main UI
│   │
├── utils/
│   ├── scanner/
│   │   ├── imagePreprocessor.js       # Canvas-based image enhancement
│   │   ├── ocrEngine.js               # Tesseract configuration
│   │   ├── cardMatcher.js             # Fuzzy matching against Scryfall
│   │   └── scanCache.js               # Recent scans persistence
│   │
├── hooks/
│   └── useScanner.js                  # Scanner state management
│
├── assets/
│   └── scanner-guide-overlay.svg      # Camera viewfinder guide
```

---

## Implementation: Step-by-Step

### **1. ScannerButton.jsx**
Entry point - adds "Scan Cards" button to battlefield interface.

```jsx
import React from 'react';
import { Camera } from 'lucide-react';

export default function ScannerButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-50 bg-blue-600 hover:bg-blue-700 
                 text-white rounded-full p-4 shadow-lg active:scale-95 
                 transition-transform"
      aria-label="Scan battlefield cards"
    >
      <Camera className="w-6 h-6" />
      <span className="absolute -top-2 -right-2 bg-green-500 text-xs 
                       px-2 py-0.5 rounded-full font-bold">
        BETA
      </span>
    </button>
  );
}
```

---

### **2. ScannerModal.jsx**
Main scanner orchestration - manages camera → OCR → confirmation flow.

```jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import CameraCapture from './CameraCapture';
import ConfirmationPanel from './ConfirmationPanel';

export default function ScannerModal({ isOpen, onClose, onCardsConfirmed }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedCards, setDetectedCards] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = async (imageDataUrl) => {
    setCapturedImage(imageDataUrl);
    setIsProcessing(true);
    
    try {
      // Import dynamically to avoid loading OCR on initial page load
      const { processImage } = await import('../../utils/scanner/ocrEngine');
      const { matchCards } = await import('../../utils/scanner/cardMatcher');
      
      // OCR the image
      const extractedText = await processImage(imageDataUrl);
      
      // Match against Scryfall
      const matches = await matchCards(extractedText);
      
      setDetectedCards(matches);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. Please try again with better lighting.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = (confirmedCards) => {
    onCardsConfirmed(confirmedCards);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCapturedImage(null);
    setDetectedCards([]);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex justify-between items-center">
        <h2 className="text-white text-lg font-bold">Scan Battlefield</h2>
        <button onClick={onClose} className="text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!capturedImage ? (
          <CameraCapture onCapture={handleCapture} />
        ) : (
          <ConfirmationPanel
            image={capturedImage}
            detectedCards={detectedCards}
            isProcessing={isProcessing}
            onConfirm={handleConfirm}
            onRetake={handleReset}
          />
        )}
      </div>
    </div>
  );
}
```

---

### **3. CameraCapture.jsx**
Camera interface with capture button and guide overlay.

```jsx
import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    onCapture(imageDataUrl);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white p-8">
        <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
        <p className="text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Video Feed */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white border-dashed rounded-lg w-4/5 h-1/3 
                          flex items-center justify-center">
            <p className="text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded">
              Frame card names clearly
            </p>
          </div>
        </div>
      </div>

      {/* Capture Button */}
      <div className="bg-gray-900 p-6 flex justify-center">
        <button
          onClick={capturePhoto}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 
                     text-white rounded-full p-6 transition-transform shadow-lg"
        >
          <Camera className="w-8 h-8" />
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
```

---

### **4. ConfirmationPanel.jsx**
Review detected cards, edit mistakes, confirm additions.

```jsx
import React, { useState } from 'react';
import { Check, X, Edit2, RotateCcw } from 'lucide-react';

export default function ConfirmationPanel({ 
  image, 
  detectedCards, 
  isProcessing, 
  onConfirm, 
  onRetake 
}) {
  const [cards, setCards] = useState(detectedCards);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Update cards when detection completes
  React.useEffect(() => {
    setCards(detectedCards);
  }, [detectedCards]);

  const handleRemove = (index) => {
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setSearchQuery(cards[index].name);
  };

  const handleConfirmAll = () => {
    // Filter out any cards without valid data
    const validCards = cards.filter(card => card.name && card.scryfallId);
    onConfirm(validCards);
  };

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Captured Image Preview */}
      <div className="h-48 bg-black">
        <img 
          src={image} 
          alt="Captured battlefield" 
          className="w-full h-full object-contain"
        />
      </div>

      {/* Detection Status */}
      <div className="bg-gray-900 p-3 border-b border-gray-700">
        {isProcessing ? (
          <div className="flex items-center gap-2 text-yellow-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 
                            border-yellow-400 border-t-transparent" />
            <span>Scanning cards...</span>
          </div>
        ) : (
          <div className="text-white">
            Detected {cards.length} card{cards.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detected Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cards.length === 0 && !isProcessing && (
          <div className="text-center text-gray-400 py-8">
            <p>No cards detected.</p>
            <p className="text-sm mt-2">Try retaking with better lighting.</p>
          </div>
        )}

        {cards.map((card, index) => (
          <div 
            key={index}
            className="bg-gray-700 rounded-lg p-3 flex items-center gap-3"
          >
            {/* Card Thumbnail */}
            {card.imageUrl && (
              <img 
                src={card.imageUrl} 
                alt={card.name}
                className="w-12 h-12 rounded object-cover"
              />
            )}

            {/* Card Info */}
            <div className="flex-1">
              <div className="text-white font-semibold">{card.name}</div>
              <div className="text-sm text-gray-400">
                {card.confidence && (
                  <span>Confidence: {Math.round(card.confidence * 100)}%</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(index)}
                className="p-2 text-blue-400 hover:bg-gray-600 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRemove(index)}
                className="p-2 text-red-400 hover:bg-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-900 p-4 flex gap-3">
        <button
          onClick={onRetake}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white 
                     py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Retake
        </button>
        <button
          onClick={handleConfirmAll}
          disabled={cards.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                     disabled:cursor-not-allowed text-white py-3 rounded-lg 
                     flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Add {cards.length} Card{cards.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
```

---

### **5. imagePreprocessor.js**
Enhance image quality before OCR.

```javascript
/**
 * Preprocess captured image to improve OCR accuracy
 * @param {string} imageDataUrl - Base64 image data URL
 * @returns {Promise<string>} - Preprocessed image data URL
 */
export async function preprocessImage(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale + increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale conversion
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // Contrast enhancement (make text pop)
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const enhanced = factor * (gray - 128) + 128;
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
        // Alpha channel (i+3) unchanged
      }
      
      // Put processed image back
      ctx.putImageData(imageData, 0, 0);
      
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageDataUrl;
  });
}

/**
 * Crop image to region of interest (optional enhancement)
 * @param {string} imageDataUrl 
 * @param {Object} cropRegion - {x, y, width, height}
 */
export function cropImage(imageDataUrl, cropRegion) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = cropRegion.width;
      canvas.height = cropRegion.height;
      
      ctx.drawImage(
        img,
        cropRegion.x,
        cropRegion.y,
        cropRegion.width,
        cropRegion.height,
        0,
        0,
        cropRegion.width,
        cropRegion.height
      );
      
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageDataUrl;
  });
}
```

---

### **6. ocrEngine.js**
Tesseract configuration and text extraction.

```javascript
import { createWorker } from 'tesseract.js';
import { preprocessImage } from './imagePreprocessor';

let worker = null;

/**
 * Initialize Tesseract worker (reusable)
 */
async function getWorker() {
  if (!worker) {
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // Configure for MTG card names
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,'-. ",
      tessedit_pageseg_mode: '11', // Sparse text
    });
  }
  return worker;
}

/**
 * Process image and extract text
 * @param {string} imageDataUrl - Base64 image
 * @returns {Promise<string>} - Extracted text
 */
export async function processImage(imageDataUrl) {
  try {
    // Preprocess for better OCR
    const preprocessed = await preprocessImage(imageDataUrl);
    
    // Get worker
    const ocrWorker = await getWorker();
    
    // Perform OCR
    const { data } = await ocrWorker.recognize(preprocessed);
    
    console.log('Raw OCR text:', data.text);
    
    // Clean up extracted text
    const cleaned = cleanOCRText(data.text);
    
    return cleaned;
  } catch (error) {
    console.error('OCR failed:', error);
    throw error;
  }
}

/**
 * Clean up OCR output
 */
function cleanOCRText(rawText) {
  return rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2) // Remove single char noise
    .join('\n');
}

/**
 * Cleanup when done
 */
export async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
```

---

### **7. cardMatcher.js**
Fuzzy match OCR text against Scryfall database.

```javascript
import Fuse from 'fuse.js';

let fuseInstance = null;
let cardDatabase = null;

/**
 * Initialize Fuse with Scryfall card names
 */
async function initializeFuse() {
  if (!cardDatabase) {
    // Fetch all card names from Scryfall
    const response = await fetch('https://api.scryfall.com/catalog/card-names');
    const data = await response.json();
    cardDatabase = data.data.map(name => ({ name }));
    
    fuseInstance = new Fuse(cardDatabase, {
      keys: ['name'],
      threshold: 0.4, // 60% similarity required
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 3
    });
  }
}

/**
 * Match extracted text lines against Scryfall
 * @param {string} ocrText - Multi-line OCR output
 * @returns {Promise<Array>} - Matched cards with metadata
 */
export async function matchCards(ocrText) {
  await initializeFuse();
  
  const lines = ocrText.split('\n').filter(line => line.length > 2);
  const matches = [];
  
  for (const line of lines) {
    // Clean line for matching
    const cleaned = cleanTextForMatching(line);
    
    if (cleaned.length < 3) continue;
    
    // Search Fuse
    const results = fuseInstance.search(cleaned, { limit: 1 });
    
    if (results.length > 0 && results[0].score < 0.4) {
      const cardName = results[0].item.name;
      
      // Fetch full card details from Scryfall
      try {
        const cardData = await fetchCardDetails(cardName);
        matches.push({
          name: cardName,
          scryfallId: cardData.id,
          imageUrl: cardData.image_uris?.small || cardData.image_uris?.normal,
          power: cardData.power,
          toughness: cardData.toughness,
          confidence: 1 - results[0].score, // Higher = better
          originalOCR: line
        });
      } catch (error) {
        console.warn(`Failed to fetch details for ${cardName}`);
      }
    }
  }
  
  return matches;
}

/**
 * Clean OCR text for better matching
 */
function cleanTextForMatching(text) {
  return text
    .replace(/[^a-zA-Z\s,'-]/g, '') // Remove non-letter chars except punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
}

/**
 * Fetch full card details from Scryfall
 */
async function fetchCardDetails(cardName) {
  const encodedName = encodeURIComponent(cardName);
  const response = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodedName}`
  );
  
  if (!response.ok) {
    throw new Error(`Scryfall API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Manual search for user corrections
 * @param {string} query - User-typed card name
 * @returns {Array} - Top 5 matches
 */
export async function searchCards(query) {
  await initializeFuse();
  
  const results = fuseInstance.search(query, { limit: 5 });
  return results.map(r => r.item.name);
}
```

---

### **8. scanCache.js**
Cache recently scanned cards for quick re-add.

```javascript
const CACHE_KEY = 'combocalc_recent_scans';
const MAX_CACHE_SIZE = 20;

/**
 * Add card to recent scans
 */
export function cacheScannedCard(card) {
  const cache = getRecentScans();
  
  // Remove if already exists (move to front)
  const filtered = cache.filter(c => c.scryfallId !== card.scryfallId);
  
  // Add to front
  filtered.unshift({
    name: card.name,
    scryfallId: card.scryfallId,
    imageUrl: card.imageUrl,
    timestamp: Date.now()
  });
  
  // Limit cache size
  const trimmed = filtered.slice(0, MAX_CACHE_SIZE);
  
  localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
}

/**
 * Get recent scans
 */
export function getRecentScans() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Clear cache
 */
export function clearScanCache() {
  localStorage.removeItem(CACHE_KEY);
}
```

---

### **9. useScanner.js**
React hook for scanner state management.

```javascript
import { useState, useCallback } from 'react';

export function useScanner(onCardsAdded) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const openScanner = useCallback(() => {
    setIsScannerOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const handleCardsConfirmed = useCallback((cards) => {
    // Add cards to battlefield
    onCardsAdded(cards);
    
    // Cache for quick access later
    const { cacheScannedCard } = require('../utils/scanner/scanCache');
    cards.forEach(card => cacheScannedCard(card));
    
    closeScanner();
  }, [onCardsAdded, closeScanner]);

  return {
    isScannerOpen,
    openScanner,
    closeScanner,
    handleCardsConfirmed
  };
}
```

---

### **10. Integration with Main App**

Modify your main battlefield component:

```jsx
import ScannerButton from './components/Scanner/ScannerButton';
import ScannerModal from './components/Scanner/ScannerModal';
import { useScanner } from './hooks/useScanner';

function BattlefieldApp() {
  const [battlefield, setBattlefield] = useState([]);

  const handleCardsAdded = useCallback((scannedCards) => {
    // Convert scanned cards to battlefield format
    const newCards = scannedCards.map(card => ({
      id: crypto.randomUUID(),
      scryfallId: card.scryfallId,
      name: card.name,
      imageUrl: card.imageUrl,
      power: card.power ? parseInt(card.power) : null,
      toughness: card.toughness ? parseInt(card.toughness) : null,
      tapped: false,
      counters: {}
    }));
    
    setBattlefield(prev => [...prev, ...newCards]);
  }, []);

  const {
    isScannerOpen,
    openScanner,
    closeScanner,
    handleCardsConfirmed
  } = useScanner(handleCardsAdded);

  return (
    <>
      {/* Existing battlefield UI */}
      <div className="battlefield">
        {/* ... */}
      </div>

      {/* Scanner Button */}
      <ScannerButton onClick={openScanner} />

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={closeScanner}
        onCardsConfirmed={handleCardsConfirmed}
      />
    </>
  );
}
```

---

## Testing Checklist

### **Desktop Testing (Chrome DevTools)**
1. ✅ Camera permission prompt appears
2. ✅ Video feed displays correctly
3. ✅ Capture button creates image
4. ✅ OCR processes without errors
5. ✅ Card matches appear in confirmation panel
6. ✅ Edit/remove buttons work
7. ✅ Confirmed cards add to battlefield

### **Mobile Device Testing (Critical)**
1. ✅ Back camera activates (not selfie camera)
2. ✅ Video feed fills screen properly
3. ✅ Capture button accessible with thumb
4. ✅ OCR completes within 5-10 seconds
5. ✅ Confirmation panel scrolls smoothly
6. ✅ Test with real MTG cards in various lighting
7. ✅ Test with foils (expect lower accuracy)

### **Accuracy Testing**
Test with these common cards:
- ✅ "Serra Angel" (simple name)
- ✅ "Mondrak, Glory Dominus" (complex name)
- ✅ "Helm of the Host" (all lowercase)
- ✅ "Lightning Bolt" (common card)
- ✅ Foreign language card (expect failure)

### **Performance Testing**
- ✅ OCR completes in <10 seconds
- ✅ No memory leaks after 10+ scans
- ✅ Camera properly releases after modal close
- ✅ App remains responsive during processing

---

## Known Limitations & Workarounds

### **Expected Failures:**
1. **Foil cards** - Glare obscures text
   - *Workaround: Angle card to reduce glare*
2. **Old card frames** - Decorative fonts hard to OCR
   - *Workaround: Manual entry fallback*
3. **Foreign cards** - OCR trained on English
   - *Workaround: Not supported in v1*
4. **Poor lighting** - Low contrast = bad OCR
   - *Workaround: UI guidance to use good lighting*

### **Edge Cases:**
- Multiple cards in one photo → Only scans text in center region
- Rotated cards → OCR accuracy drops significantly
- Damaged/worn cards → Text may be unreadable

---

## Performance Optimizations

### **Lazy Loading:**
```javascript
// Only load heavy OCR libraries when scanner opens
const ScannerModal = lazy(() => import('./components/Scanner/ScannerModal'));
```

### **Worker Thread (Future Enhancement):**
Move OCR processing to Web Worker to prevent UI blocking:
```javascript
// ocrWorker.js
self.addEventListener('message', async (e) => {
  const { imageDataUrl } = e.data;
  const result = await processImage(imageDataUrl);
  self.postMessage(result);
});
```

### **Image Compression:**
Reduce image size before OCR (faster processing):
```javascript
canvas.toDataURL('image/jpeg', 0.7) // 70% quality
```

---

## Future Enhancements (Post-MVP)

1. **Batch scanning** - Multiple cards in one photo
2. **Power/Toughness OCR** - Auto-detect creature stats
3. **Offline mode** - IndexedDB cache of common cards
4. **Tutorial overlay** - First-time user guidance
5. **Manual crop tool** - User draws box around card name
6. **Recent scans quick-add** - "Scan same battlefield again?"

---

## Deployment Notes

### **Package.json Updates:**
```json
{
  "dependencies": {
    "tesseract.js": "^5.0.4",
    "fuse.js": "^7.0.0"
  }
}
```

### **Netlify Configuration:**
No special config needed - all browser-based.

### **Service Worker (PWA):**
Add to `public/sw.js`:
```javascript
// Cache Tesseract language files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('tesseract-cache').then((cache) => {
      return cache.addAll([
        'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js'
      ]);
    })
  );
});
```

---

## Success Metrics

**MVP is successful if:**
- ✅ 70%+ first-scan accuracy on English cards
- ✅ Scan → confirm flow takes <60 seconds
- ✅ Users report time savings vs manual entry
- ✅ No crashes or major bugs in production

**Ready to ship when:**
- ✅ All testing checklist items pass
- ✅ Error handling gracefully handles failures
- ✅ UI provides clear feedback during processing
- ✅ Works on iPhone Safari + Android Chrome

---

## FINAL IMPLEMENTATION ORDER

1. Install dependencies (`npm install tesseract.js fuse.js`)
2. Create file structure (all components/utils)
3. Implement `imagePreprocessor.js`
4. Implement `ocrEngine.js` (test with sample image)
5. Implement `cardMatcher.js` (test fuzzy matching)
6. Build `CameraCapture.jsx`
7. Build `ConfirmationPanel.jsx`
8. Build `ScannerModal.jsx` (orchestration)
9. Build `ScannerButton.jsx`
10. Integrate with main app
11. Test on real device with physical cards
12. Deploy to Netlify

---

**Estimated Development Time:** 2-3 weeks for complete MVP  
**Priority Testing:** Real device with physical MTG cards in various lighting conditions
