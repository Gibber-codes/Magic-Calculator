import React, { useState } from 'react';
import { X } from 'lucide-react';
import CameraCapture from './CameraCapture';
import ConfirmationPanel from './ConfirmationPanel';
import DebugConsole from './DebugConsole';

export default function ScannerModal({ isOpen, onClose, onCardsConfirmed }) {
    const [capturedImage, setCapturedImage] = useState(null);
    const [detectedCards, setDetectedCards] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null); // New state for debug info

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
                        debugInfo={debugInfo}
                    />
                )}
            </div>

            <DebugConsole />
        </div>
    );
}
