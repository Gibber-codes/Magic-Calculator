import React, { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export default function ScannedHistoryBar({ cards, onRemove }) {
    const scrollRef = useRef(null);

    // Auto-scroll to newest item (Start/Left)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
        }
    }, [cards.length]);

    if (cards.length === 0) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 z-50 pb-8 pt-4 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none">
            {/* Scroll Container: Constrained to screen width, enables overflow */}
            <div
                ref={scrollRef}
                className="w-full overflow-x-auto no-scrollbar pointer-events-auto"
            >
                {/* Content Container: Grows as wide as its children */}
                <div className="flex flex-row items-center gap-4 px-6 min-w-min h-48">
                    {cards.map((card, index) => {
                        const isPreset = card.isPreset;

                        if (isPreset) {
                            return (
                                <button key={`${card.id}-${index}`} className="
                                    relative shrink-0 w-32 h-44
                                    rounded-2xl overflow-hidden 
                                    hover:ring-2 hover:ring-purple-500/50 
                                    transition-all group shadow-lg
                                ">
                                    <img
                                        alt={card.name}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                        src={card.image_normal || card.image_uris?.normal || card.art_crop}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-3 left-3 right-3 text-left">
                                        <div className="text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-0.5">Preset</div>
                                        <div className="text-white font-bold text-base leading-tight mb-1">{card.name}</div>
                                        <div className="inline-flex items-center px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-md">
                                            <span className="text-[10px] font-mono text-white/90">Card</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        }

                        // Standard Card Style
                        return (
                            <div key={`${card.uniqueId || card.id}-${index}`} className="relative shrink-0 w-32 h-44 group">
                                <div className="
                                    absolute inset-0 rounded-2xl overflow-hidden shadow-lg 
                                    transition-all duration-300
                                    hover:scale-105 active:scale-95
                                ">
                                    <img
                                        alt={card.name}
                                        className="w-full h-full object-cover"
                                        src={card.image_normal || card.image_uris?.normal || card.art_crop}
                                    />
                                </div>
                                <div className="absolute top-2 right-2 z-[100]">
                                    <button
                                        onClick={() => onRemove(index)}
                                        className="
                                            group flex items-center justify-center 
                                            transition-all duration-300 
                                            active:scale-90 hover:scale-110
                                            focus:outline-none 
                                            bg-gray-900/80 text-white shadow-xl border-white/10
                                            rounded-full border
                                            w-8 h-8 shadow-2xl
                                            hover:bg-red-500/90 hover:border-red-500/50
                                        " aria-label="Remove">
                                        <Trash2 className="w-4 h-4 transition-all duration-300" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    <div className="w-2 shrink-0" /> {/* Spacer */}
                </div>
            </div>
        </div>
    );
}
