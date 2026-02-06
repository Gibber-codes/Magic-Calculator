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
