import React, { useState } from 'react';
import {
    X, Calculator, Percent, TrendingUp, Zap,
    BookOpen, MessageSquare, Info, Shield, Lock, FileText, Bell, ChevronRight, Menu as MenuIcon
} from 'lucide-react';
import { APP_VERSION } from '../config/constants';

const CalculationMenu = ({
    isOpen, onClose,
    onToggleAutoMode, autoMode,
    hasUnreadUpdate, onClearBadge,
    onOpenTutorial
}) => {
    const [activeSection, setActiveSection] = useState('main'); // main, legal

    if (!isOpen) return null;

    const handleWhatsNewClick = () => {
        onClearBadge();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-start sm:justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Side Drawer on Mobile, Modal on Desktop */}
            <div className="relative h-full sm:h-auto w-[85%] max-w-sm bg-slate-900 border-r sm:border border-slate-700 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-left sm:zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MenuIcon className="text-blue-500" />
                        Menu
                    </h2>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* What's New Section */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">General</h3>
                        <button
                            onClick={handleWhatsNewClick}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-300 transition-all border border-transparent hover:border-slate-700"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell size={20} className="text-blue-400" />
                                    {hasUnreadUpdate && (
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-800" />
                                    )}
                                </div>
                                <span>What's New</span>
                            </div>
                            {hasUnreadUpdate && <span className="text-xs font-bold text-blue-400">v{APP_VERSION}</span>}
                        </button>
                    </div>

                    {/* Calculators & Tools */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Tools</h3>

                        {/* Auto Mode Toggle */}
                        <button
                            onClick={onToggleAutoMode}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                                ${autoMode
                                    ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-300'
                                    : 'bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white'
                                }
                            `}
                        >
                            <Zap size={20} className={autoMode ? 'text-indigo-400 fill-current' : 'text-slate-400'} />
                            <div className="flex-1 text-left">
                                <div className="font-bold">Auto Mode</div>
                                <div className="text-xs opacity-70">
                                    {autoMode ? 'Enabled' : 'Disabled'}
                                </div>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${autoMode ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoMode ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                        </button>

                        <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-300 transition-all">
                            <TrendingUp size={20} className="text-green-400" />
                            <span>Combat Math</span>
                        </button>

                        <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-300 transition-all">
                            <Percent size={20} className="text-purple-400" />
                            <span>Hypergeometric Calc</span>
                        </button>
                    </div>

                    {/* Support & Legal */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Support & Legal</h3>

                        <button
                            onClick={() => { onOpenTutorial(); onClose(); }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                        >
                            <BookOpen size={20} className="text-slate-400" />
                            <span>Tutorial</span>
                        </button>

                        <a
                            href="mailto:support@combocalc.com"
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                        >
                            <MessageSquare size={20} className="text-slate-400" />
                            <span>Send Feedback</span>
                        </a>

                        {/* Legal Links (Collapsed logic could go here, but simple list is fine for now) */}
                        <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
                            <div className="px-3 py-2 text-xs text-slate-500">
                                <Info size={12} className="inline mr-1" />
                                Legal & Privacy
                            </div>

                            <a href="/privacy" className="block w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                Privacy Policy
                            </a>
                            <a href="/terms" className="block w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                Terms of Service
                            </a>
                            <div className="px-3 py-2 text-[10px] text-slate-600 leading-relaxed">
                                Magic Calculator is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Version */}
                <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-600">
                    Version {APP_VERSION}
                </div>
            </div>
        </div>
    );
};

export default CalculationMenu;
