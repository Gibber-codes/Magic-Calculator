import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-300 font-sans selection:bg-purple-900 selection:text-white flex flex-col">
            <div className="max-w-3xl mx-auto px-6 py-12 flex-1">
                <Link to="/" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Calculator
                </Link>

                <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-700 pb-4">Terms of Service</h1>

                <div className="space-y-6 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h2>
                        <p>By accessing and using Magic Calculator, you accept and agree to be bound by the terms and provision of this agreement.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">2. Intellectual Property & Fan Content</h2>
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <p className="font-medium text-white mb-2">Wizards of the Coast Disclaimer</p>
                            <p>Magic: The Gathering content and materials are trademarks and copyrights of Wizards of the Coast, LLC, a subsidiary of Hasbro, Inc. Magic Calculator is not affiliated with, endorsed, sponsored, or specifically approved by Wizards of the Coast LLC.</p>
                            <p className="mt-2 text-xs text-slate-400">Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">3. Disclaimer of Warranties</h2>
                        <p className="uppercase">THE SITE IS PROVIDED ON AN "AS-IS" AND "AS AVAILABLE" BASIS. MAGIC CALCULATOR EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING ALL WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE MAKE NO GUARANTEE THAT THE SITE WILL MEET YOUR REQUIREMENTS, WILL BE AVAILABLE ON AN UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE BASIS, OR WILL BE ACCURATE, RELIABLE, COMPLETE, LEGAL, OR SAFE.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">4. Limitation of Liability</h2>
                        <p className="uppercase">TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL MAGIC CALCULATOR BE LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF, OR INABILITY TO USE, THE SITE. OUR AGGREGATE LIABILITY SHALL NOT EXCEED FIFTY U.S. DOLLARS ($50).</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">5. User Conduct</h2>
                        <p>You agree not to use the site for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the site in any way that could damage the site, usage of the site, or such otherwise.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">6. Age Requirement</h2>
                        <p>You must be at least 13 years of age to access or use this Site.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TermsOfService;
