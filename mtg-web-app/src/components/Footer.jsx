import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="w-full bg-slate-950/80 backdrop-blur-sm border-t border-slate-800 p-6 text-slate-500 text-xs text-center z-10 pointer-events-auto">
            <div className="max-w-4xl mx-auto space-y-4">
                <p>
                    Magic Calculator is unofficial Fan Content permitted under the{' '}
                    <a
                        href="https://company.wizards.com/en/legal/fancontentpolicy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-300 underline"
                    >
                        Wizards of the Coast Fan Content Policy
                    </a>
                    . Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
                </p>
                <p>
                    Magic: The Gathering is a trademark of Wizards of the Coast, Inc. and Hasbro, Inc. Magic Calculator is unaffiliated.
                </p>
                <nav className="flex justify-center gap-4 text-slate-400">
                    <Link to="/privacy" className="hover:text-slate-200">Privacy Policy</Link>
                    <span>|</span>
                    <Link to="/terms" className="hover:text-slate-200">Terms of Service</Link>
                </nav>
                <p>© 2026 Gabriel</p>
            </div>
        </footer>
    );
};

export default Footer;
