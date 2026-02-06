import React from 'react';
import { Heart } from 'lucide-react';

const HeartIcon = ({ filled, onClick, className = "" }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate(10);
                onClick(e);
            }}
            className={`
                group flex items-center justify-center 
                transition-all duration-300 
                active:scale-90 hover:scale-105
                focus:outline-none 
                ${filled
                    ? 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)] border-red-400'
                    : 'bg-white text-slate-900 shadow-xl border-slate-200'
                }
                rounded-full border-2
                ${className}
            `}
            aria-label={filled ? "Remove from favorites" : "Add to favorites"}
        >
            <Heart
                size={22}
                className={`
                    transition-all duration-300
                    ${filled ? 'fill-current scale-110' : 'fill-none'}
                `}
                strokeWidth={2.5}
            />
        </button>
    );
};

export default HeartIcon;
