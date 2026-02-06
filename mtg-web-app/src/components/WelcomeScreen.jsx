import React, { useState } from 'react';
import { X, ChevronRight, Zap, Calculator, Layers, ArrowRight } from 'lucide-react';

const WelcomeScreen = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const cards = [
        {
            title: "Welcome to ComboCalc",
            description: "The ultimate companion for competitive play.",
            icon: <Zap className="w-12 h-12 text-yellow-400" />,
            color: "bg-yellow-500/20"
        },
        {
            title: "Track & Calculate",
            description: "Keep track of phases, mana, and calculate combat damage instantly.",
            icon: <Calculator className="w-12 h-12 text-blue-400" />,
            color: "bg-blue-500/20"
        },
        {
            title: "Simulate Combos",
            description: "Test your deck's potential with our advanced stack simulator.",
            icon: <Layers className="w-12 h-12 text-purple-400" />,
            color: "bg-purple-500/20"
        }
    ];

    const handleNext = () => {
        if (step < cards.length - 1) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        localStorage.setItem('hasSeenWelcome', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

            {/* Content */}
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">

                {/* Progress Indicators */}
                <div className="flex gap-2 mb-8">
                    {cards.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700'}`}
                        />
                    ))}
                </div>

                {/* Card Content */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 mb-8 min-h-[200px]">
                    <div className={`p-6 rounded-full ${cards[step].color} mb-2`}>
                        {cards[step].icon}
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{cards[step].title}</h2>
                        <p className="text-slate-400 leading-relaxed">{cards[step].description}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="w-full space-y-4">
                    <button
                        onClick={handleNext}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {step === cards.length - 1 ? "Get Started" : "Next"}
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Condensed Disclaimer */}
                    <p className="text-[10px] text-slate-600 px-4">
                        Unofficial Fan Content. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default WelcomeScreen;
