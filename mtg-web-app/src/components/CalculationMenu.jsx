import React from 'react';
import { X, Calculator, Percent, TrendingUp, BarChart3, PenTool, Zap } from 'lucide-react';

const CalculationMenu = ({ isOpen, onClose, onToggleAutoMode, autoMode }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calculator className="text-blue-500" />
                        Calculators
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center gap-4 transition-all group border border-gray-700 hover:border-gray-600">
                        <div className="p-3 bg-green-900/50 rounded-lg text-green-400 group-hover:text-green-300">
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-200">Combat Math</h3>
                            <p className="text-xs text-gray-500">Calculate total damage & blocks</p>
                        </div>
                    </button>

                    <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center gap-4 transition-all group border border-gray-700 hover:border-gray-600">
                        <div className="p-3 bg-purple-900/50 rounded-lg text-purple-400 group-hover:text-purple-300">
                            <Percent size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-200">Hypergeometric Calc</h3>
                            <p className="text-xs text-gray-500">Draw probability & finding outs</p>
                        </div>
                    </button>

                    <button
                        onClick={onToggleAutoMode}
                        className={`p-4 rounded-xl flex items-center gap-4 transition-all group border border-gray-700 hover:border-gray-600
                            ${autoMode ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-gray-800 hover:bg-gray-700'}
                        `}
                    >
                        <div className={`p-3 rounded-lg ${autoMode ? 'bg-indigo-500 text-white' : 'bg-blue-900/50 text-blue-400 group-hover:text-blue-300'}`}>
                            {autoMode ? <Zap size={24} fill="currentColor" /> : <Zap size={24} />}
                        </div>
                        <div className="text-left flex-1">
                            <h3 className={`font-bold ${autoMode ? 'text-indigo-300' : 'text-gray-200'}`}>
                                {autoMode ? 'Automatic Mode Active' : 'Automatic Calculations'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {autoMode ? 'Calculates phases & triggers automatically' : 'Switch to automatic turn management'}
                            </p>
                        </div>
                        {autoMode && <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CalculationMenu;
