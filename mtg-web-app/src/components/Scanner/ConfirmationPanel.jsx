import React, { useState } from 'react';
import { Check, X, Edit2, RotateCcw } from 'lucide-react';

export default function ConfirmationPanel({
    image,
    detectedCards,
    isProcessing,
    onConfirm,
    onRetake,
    debugInfo // New prop
}) {
    const [cards, setCards] = useState(detectedCards);
    const [editingIndex, setEditingIndex] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [searchQuery, setSearchQuery] = useState('');
    const [showDebug, setShowDebug] = useState(false); // Toggle debug view

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
                    <div className="text-center text-gray-400 py-4">
                        <p className="text-lg text-white mb-2">No matches found</p>

                        {debugInfo && (
                            <div className="bg-gray-800 p-3 rounded-lg text-left text-xs font-mono space-y-2 border border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-yellow-400 font-bold">DEBUG VIEW</span>
                                    {debugInfo.error && <span className="text-red-500 font-bold animate-pulse">ERROR!</span>}
                                    <span className="text-gray-500">Confidence: {Math.round(debugInfo.confidence)}%</span>
                                </div>

                                {debugInfo.error && (
                                    <div className="bg-red-900/30 border border-red-500/50 p-2 rounded text-red-200 text-[10px]">
                                        {debugInfo.error}
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <p className="text-gray-400">What the scanner saw:</p>
                                    <img
                                        src={debugInfo.image}
                                        alt="Processed view"
                                        className="w-full h-auto border border-gray-600 rounded"
                                    />
                                </div>

                                <div>
                                    <p className="text-gray-400">Raw Text Read:</p>
                                    <pre className="bg-black p-2 rounded overflow-x-auto whitespace-pre-wrap text-green-400">
                                        {debugInfo.text || "No text detected"}
                                    </pre>
                                </div>
                            </div>
                        )}
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
                                    <span className={`text-xs ${card.confidence > 0.8 ? 'text-green-400' :
                                        card.confidence > 0.5 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {Math.round(card.confidence * 100)}% Match
                                    </span>
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
