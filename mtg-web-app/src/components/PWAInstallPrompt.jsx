import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare } from 'lucide-react';

const PWAInstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [platform, setPlatform] = useState('other'); // 'ios' | 'android' | 'other'
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        // 1. Check if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        // 2. Platform Detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIos) {
            setPlatform('ios');
        } else if (isAndroid) {
            setPlatform('android');
        }

        // 3. Handle Chrome/Android "beforeinstallprompt" event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            checkAndShowPrompt();
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 4. Persistence Check
        const checkAndShowPrompt = () => {
            const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
            const now = Date.now();

            // If never dismissed, or dismissed more than 7 days ago, show it
            if (!lastDismissed || (now - parseInt(lastDismissed)) > (7 * 24 * 60 * 60 * 1000)) {
                // For iOS, we show it on mount after a small delay
                if (isIos) {
                    setTimeout(() => setShowPrompt(true), 3000);
                } else if (isAndroid && deferredPrompt) {
                    // For Android, we show it once the event has fired
                    setShowPrompt(true);
                }
            }
        };

        // Initial check for iOS (since it won't fire beforeinstallprompt)
        if (isIos) {
            checkAndShowPrompt();
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [deferredPrompt]);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[90] animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="max-w-md mx-auto bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <div className="p-5">
                    <div className="flex items-start gap-4 pr-6">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                            <Download className="text-indigo-400 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg mb-1">Install ComboCalc</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Add to your home screen for a fullscreen mode and faster access to your battlefield calculations.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        {platform === 'ios' ? (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">How to Install</p>
                                <ol className="text-sm text-gray-300 space-y-3">
                                    <li className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                                        <span className="flex items-center gap-1.5">
                                            Tap the <Share size={16} className="text-blue-400" /> Share button
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-3 relative">
                                        <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                                        <span className="flex items-center gap-1.5">
                                            Select <PlusSquare size={16} className="text-gray-400" /> "Add to Home Screen"
                                        </span>
                                        {/* Visual Arrow for Safari */}
                                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-50 hidden sm:block">
                                            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-indigo-500"></div>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        ) : (
                            <button
                                onClick={handleInstallClick}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                            >
                                <Download size={20} />
                                Install Application
                            </button>
                        )}

                        <button
                            onClick={handleDismiss}
                            className="w-full py-2.5 text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>

                {/* Device indicator line for iOS Safari */}
                {platform === 'ios' && (
                    <div className="h-1.5 w-full bg-indigo-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500 animate-pulse opacity-50"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
