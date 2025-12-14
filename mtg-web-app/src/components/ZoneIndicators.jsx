import React from 'react';
import { Skull, Ban } from 'lucide-react';

const ZoneIndicators = ({
    graveyardCount,
    exileCount,
    isTargetingZone,
    onZoneClick
}) => {
    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
            {/* Graveyard */}
            <div
                onClick={() => onZoneClick('graveyard')}
                className={`bg-slate-800/90 backdrop-blur-sm border rounded-xl p-3 shadow-lg transition-all duration-200 cursor-pointer group ${isTargetingZone
                    ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900 scale-110'
                    : 'border-purple-700/50 hover:scale-105'
                    }`}
            >
                <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                        <Skull size={32} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                        {graveyardCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-slate-800">
                                {graveyardCount}
                            </div>
                        )}
                    </div>
                    <div className="text-purple-300 text-xs font-semibold">Graveyard</div>
                </div>
            </div>

            {/* Exile */}
            <div
                onClick={() => onZoneClick('exile')}
                className={`bg-slate-800/90 backdrop-blur-sm border rounded-xl p-3 shadow-lg transition-all duration-200 cursor-pointer group ${isTargetingZone
                    ? 'border-pink-500 ring-2 ring-pink-500 ring-offset-2 ring-offset-slate-900 scale-110'
                    : 'border-pink-700/50 hover:scale-105'
                    }`}
            >
                <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                        <Ban size={32} className="text-pink-400 group-hover:text-pink-300 transition-colors" />
                        {exileCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-pink-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-slate-800">
                                {exileCount}
                            </div>
                        )}
                    </div>
                    <div className="text-pink-300 text-xs font-semibold">Exile</div>
                </div>
            </div>
        </div>
    );
};

export default ZoneIndicators;
