import React from 'react';
import { RotateCcw, RotateCw, Calculator } from 'lucide-react';

const UndoRedoButtons = ({ onUndo, onRedo, onCalc, canUndo, canRedo }) => {
    return (
        <div className="flex items-center space-x-2 bg-gray-900/80 backdrop-blur-md p-2 rounded-lg border border-gray-700/50">
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded-full transition-colors ${canUndo
                        ? 'text-gray-200 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 cursor-not-allowed'
                    }`}
                title="Undo"
            >
                <RotateCcw size={20} />
            </button>

            <button
                onClick={onCalc}
                className="p-2 rounded-full text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors"
                title="Calculation Menu"
            >
                <Calculator size={20} />
            </button>

            <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded-full transition-colors ${canRedo
                        ? 'text-gray-200 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 cursor-not-allowed'
                    }`}
                title="Redo"
            >
                <RotateCw size={20} />
            </button>
        </div>
    );
};

export default UndoRedoButtons;
