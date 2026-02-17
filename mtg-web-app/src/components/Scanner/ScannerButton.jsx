import React from 'react';
import { Camera } from 'lucide-react';

export default function ScannerButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="relative shrink-0 w-32 h-44 rounded-2xl bg-blue-600/20 border-2 border-dashed border-blue-500/40 hover:bg-blue-600/30 hover:border-blue-500/60 transition-all group flex flex-col items-center justify-center gap-3 shadow-lg overflow-hidden"
            aria-label="Scan cards"
        >
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-blue-400" />
            </div>

            <div className="text-center">
                <div className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-0.5">Instant Scan</div>
                <div className="text-white font-bold text-sm leading-tight">Scan cards</div>
            </div>

            <span className="absolute top-2 right-2 bg-blue-500 text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm">
                BETA
            </span>

            {/* Subtle pulse effect in background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
        </button>
    );
}
