import React from 'react';
import { Sword, CheckCircle, X } from 'lucide-react';

const AttackerConfirmOverlay = ({
    isVisible,
    selectedCount,
    onConfirm,
    onCancel
}) => {
    if (!isVisible) return null;

    return (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900/90 backdrop-blur-md border border-red-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-4">
                <div className="text-white font-bold text-lg flex items-center gap-2">
                    <Sword className="text-red-500" />
                    <span>Declare Attackers</span>
                </div>
                <div className="h-8 w-px bg-slate-700"></div>
                <div className="text-gray-300 text-sm">
                    {selectedCount} Selected
                </div>
                <button
                    onClick={onConfirm}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg flex items-center gap-2"
                >
                    <CheckCircle size={18} />
                    Confirm Attacks
                </button>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Cancel"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default AttackerConfirmOverlay;
