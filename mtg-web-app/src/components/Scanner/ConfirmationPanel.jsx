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
    // eslint-disable-next-line no-unused-vars
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
