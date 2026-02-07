import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function DebugConsole() {
    const [logs, setLogs] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const addLog = (type, args) => {
            const message = args.map(arg => {
                if (arg instanceof Error) {
                    return `${arg.message}\n${arg.stack}`;
                }
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        const json = JSON.stringify(arg, null, 2);
                        if (json === '{}' && Object.keys(arg).length > 0) {
                            return `Object {${Object.keys(arg).join(', ')}}`;
                        }
                        return json;
                    } catch (e) {
                        return `[Unserializable ${arg.constructor?.name || 'Object'}]`;
                    }
                }
                return String(arg);
            }).join(' ');

            setLogs(prev => [...prev.slice(-100), { // Keep last 100 logs
                id: Date.now() + Math.random(),
                type,
                message,
                time: new Date().toLocaleTimeString()
            }]);
        };

        console.log = (...args) => {
            addLog('log', args);
            originalLog.apply(console, args);
        };
        console.warn = (...args) => {
            addLog('warn', args);
            originalWarn.apply(console, args);
        };
        console.error = (...args) => {
            addLog('error', args);
            originalError.apply(console, args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-[60] bg-gray-900/80 p-3 rounded-full border border-gray-700 text-yellow-400 shadow-xl"
                title="Open Debug Console"
            >
                <Terminal className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-[60] bg-gray-900 border-t border-gray-700 flex flex-col transition-all duration-300 ${isMinimized ? 'h-12' : 'h-1/2'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Debug Console</span>
                    <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">{logs.length}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setLogs([])} className="text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-gray-400 hover:text-white">
                        {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Logs Area */}
            {!isMinimized && (
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1 bg-black"
                >
                    {logs.length === 0 && (
                        <p className="text-gray-600 italic">No logs captured yet...</p>
                    )}
                    {logs.map(log => (
                        <div key={log.id} className="border-b border-gray-800/50 pb-1">
                            <span className="text-gray-550 mr-2 opacity-50">[{log.time}]</span>
                            <span className={`
                                ${log.type === 'error' ? 'text-red-400' : ''}
                                ${log.type === 'warn' ? 'text-yellow-400' : ''}
                                ${log.type === 'log' ? 'text-green-400' : ''}
                            `}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
