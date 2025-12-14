import React from 'react';
import { X, RotateCcw } from 'lucide-react';

const HistoryPanel = ({
    isOpen,
    onClose,
    actionLog,
    historyLength,
    onUndo
}) => {
    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">History</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
                <button
                    onClick={onUndo}
                    disabled={historyLength === 0}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all"
                >
                    <RotateCcw size={16} /> Undo Last Action
                </button>

                <div className="space-y-2 mt-4">
                    {actionLog.map(log => (
                        <div key={log.id} className="text-sm p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-gray-300 flex justify-between gap-4">
                            <span>{log.desc}</span>
                            <span className="text-gray-600 text-xs whitespace-nowrap">{log.time}</span>
                        </div>
                    ))}
                    {actionLog.length === 0 && (
                        <div className="text-center text-gray-500 py-8">No actions yet</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryPanel;
