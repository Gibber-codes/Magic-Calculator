import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const LegalNotices = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-300 font-sans selection:bg-purple-900 selection:text-white flex flex-col">
            <div className="max-w-3xl mx-auto px-6 py-12 flex-1">
                <Link to="/" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Calculator
                </Link>

                <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-700 pb-4">Privacy Policy</h1>

                <div className="space-y-6 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">1. Introduction</h2>
                        <p>Welcome to Magic Calculator. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">2. Information We Collect</h2>
                        <p>We do not require user registration. However, we may collect:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Automatically Collected Data:</strong> When you access our service, we may automatically collect certain information about your device, including your IP address, browser type, operating system, and other usage details.</li>
                            <li><strong>Cookies and Local Storage:</strong> we use local storage to save your game state and preferences directly on your device.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">3. Third-Party Services & Advertising</h2>
                        <p>We may use third-party services that collect data to serve advertisements and analyze traffic.</p>

                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mt-4">
                            <h3 className="font-bold text-white mb-2">Google AdSense & Analytics Disclosure</h3>
                            <p className="mb-2">Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website and other websites.</p>
                            <p className="mb-2">Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.</p>
                            <p>Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google Ads Settings</a>. For more information about how Google uses data, visit <a href="https://www.google.com/policies/privacy/partners/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">How Google uses information from sites or apps that use our services</a>.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">4. Your Rights (GDPR & CCPA)</h2>
                        <p>Depending on your location, you may have rights regarding your personal data, including the right to access, correct, delete, or restrict the use of your data. To exercise these rights or if you have questions, please contact us.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">5. Children's Privacy</h2>
                        <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LegalNotices;
