import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getFavorites, removeFavorite } from '../utils/favorites';

// Component for the Favorites Grid
const FavoritesTab = ({ onAddCard }) => {
    const [favorites, setFavorites] = useState([]);
    const [removingId, setRemovingId] = useState(null);

    // Load favorites on mount
    useEffect(() => {
        setFavorites(getFavorites());
    }, []);

    const handleRemove = (e, id) => {
        e.stopPropagation();
        setRemovingId(id); // Optimistic UI or animation trigger

        // Small delay if we want animation, otherwise immediate
        const result = removeFavorite(id);
        if (result.success) {
            setFavorites(prev => prev.filter(f => f.id !== id));
        }
        setRemovingId(null);
    };

    if (favorites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-white/50 animate-in fade-in duration-300">
                <div className="bg-white/5 p-4 rounded-full mb-4">
                    <span className="text-4xl">♥</span>
                </div>
                <p className="text-lg font-medium">No favorites yet</p>
                <p className="text-sm">Search for cards and tap the heart to save them</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-white/70 text-sm font-bold uppercase tracking-wider">
                    Your Favorites
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md ${favorites.length >= 30 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'
                    }`}>
                    {favorites.length}/30
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-20">
                {favorites.map((card) => (
                    <button
                        key={card.id}
                        onClick={() => onAddCard(card)} // Reuse generic add handler, it should handle formatted cards
                        className="
                            group relative w-full aspect-[2.5/3.5]
                            rounded-xl overflow-hidden shadow-lg 
                            border border-white/5
                            transition-all duration-200
                            hover:scale-[1.02] hover:shadow-xl hover:border-white/20
                            active:scale-95
                        "
                    >
                        <img
                            src={card.image_normal || card.art_crop}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />

                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />

                        {/* Card Name */}
                        <div className="absolute bottom-2 left-2 right-2 text-left">
                            <span className="text-white text-xs font-bold line-clamp-1 drop-shadow-md">
                                {card.name}
                            </span>
                        </div>

                        {/* Remove Button - Top Right */}
                        <div
                            onClick={(e) => handleRemove(e, card.id)}
                            className="
                                absolute top-1 right-1 
                                w-8 h-8 rounded-full 
                                bg-black/60 backdrop-blur-sm
                                flex items-center justify-center 
                                text-white/80 hover:text-white hover:bg-red-500/80
                                opacity-0 group-hover:opacity-100 
                                transition-all duration-200
                                z-10
                            "
                        >
                            <X size={16} strokeWidth={3} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FavoritesTab;
