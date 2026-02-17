import React, { useState } from 'react';
import { X } from 'lucide-react';
import CameraCapture from './CameraCapture';
import ScannedHistoryBar from './ScannedHistoryBar';


export default function ScannerModal({ isOpen, onClose, onCardsConfirmed }) {
    const [capturedImage, setCapturedImage] = useState(null);
    const [detectedCards, setDetectedCards] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]); // Track scanned cards in this session


    // Auto-Scan Logic

    // Auto-Scan Logic
    const lastMatchRef = React.useRef(null);
    const matchCountRef = React.useRef(0);
    const isAutoScanBusy = React.useRef(false); // Validated concurrency lock
    const AUTO_CONFIRM_THRESHOLD = 2; // Require 2 consecutive matches

    // Cleanup worker on unmount
    React.useEffect(() => {
        return () => {
            import('../../utils/scanner/ocrEngine').then(({ terminateWorker }) => {
                terminateWorker();
            });
        };
    }, []);

    const handleAutoScan = async (imageDataUrl) => {
        if (isProcessing || isAutoScanBusy.current) return; // Skip if already busy

        isAutoScanBusy.current = true;

        try {
            // value-check: Import dynamically
            const { processImage } = await import('../../utils/scanner/ocrEngine');
            const { matchCards } = await import('../../utils/scanner/cardMatcher');

            const ocrResult = await processImage(imageDataUrl);
            const matches = await matchCards(ocrResult);

            if (matches.length > 0) {
                const bestMatch = matches[0];

                // Check if it matches previous scan
                if (lastMatchRef.current && lastMatchRef.current.name === bestMatch.name) {
                    matchCountRef.current += 1;
                    console.log(`Auto-Scan: Stability ${matchCountRef.current}/${AUTO_CONFIRM_THRESHOLD} for ${bestMatch.name}`);
                } else {
                    // New card detected
                    lastMatchRef.current = bestMatch;
                    matchCountRef.current = 1;
                    console.log(`Auto-Scan: New candidate ${bestMatch.name}`);
                }

                // If threshold reached, auto-confirm
                if (matchCountRef.current >= AUTO_CONFIRM_THRESHOLD) {
                    // Batch Scan Workflow:
                    // 1. Add to session history (for UI bar)
                    const newCard = { ...bestMatch, uniqueId: Date.now() + Math.random() };

                    // 2. Add to session history (for UI bar)
                    setSessionHistory(prev => [newCard, ...prev]);

                    // 3. Reset stability so we can scan the next card
                    matchCountRef.current = 0;
                    lastMatchRef.current = null;

                    // Optional: Visual flash or sound here
                }
            } else {
                // No match, reset stability
                matchCountRef.current = 0;
                lastMatchRef.current = null;
            }
        } catch (error) {
            console.warn('Auto-scan frame failed:', error);
        } finally {
            isAutoScanBusy.current = false;
        }
    };

    const handleCapture = async (imageDataUrl) => {
        setCapturedImage(imageDataUrl);
        setIsProcessing(true);
        setDebugInfo(null);
        setDetectedCards([]); // Clear previous


        try {
            // Import dynamically to avoid loading OCR on initial page load
            const { processImage } = await import('../../utils/scanner/ocrEngine');
            const { matchCards } = await import('../../utils/scanner/cardMatcher');

            // OCR the image
            const ocrResult = await processImage(imageDataUrl);

            // Store debug info
            setDebugInfo({
                image: ocrResult.debugImage,
                text: ocrResult.text,
                confidence: ocrResult.overallConfidence
            });

            // Match against Scryfall
            const matches = await matchCards(ocrResult);

            setDetectedCards(matches);

            // If no matches, we still want to show the panel so user can see why
            // implicit fall-through to finally block which stops loading
        } catch (error) {
            console.error('Scan process failed:', error);
            // Don't alert, just show error in debug info if possible
            setDebugInfo(prev => ({
                ...prev,
                error: error?.message || (typeof error === 'string' ? error : 'Unknown system error')
            }));
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
        setDebugInfo(null);
        setSessionHistory([]);

        matchCountRef.current = 0;
        lastMatchRef.current = null;
    };

    const handleBatchConfirm = () => {
        if (sessionHistory.length > 0) {
            onCardsConfirmed(sessionHistory);
        }
        handleReset();
        onClose();
    };

    const handleRemoveCard = (index) => {
        setSessionHistory(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <h2 className="text-white text-lg font-bold drop-shadow-md">Scan Battlefield</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleBatchConfirm} className="text-white bg-black/20 p-2 rounded-full backdrop-blur-sm hover:bg-black/40 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden">
                <CameraCapture
                    onCapture={handleCapture}
                    onAutoScan={handleAutoScan}
                />

                {/* Overlay History Bar */}
                <ScannedHistoryBar
                    cards={sessionHistory}
                    onRemove={handleRemoveCard}
                />
            </div>
        </div>
    );
}
