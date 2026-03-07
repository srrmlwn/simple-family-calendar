import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="mb-6">
                    <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500">← Back to famcal.ai</Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: March 7, 2026</p>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance</h2>
                        <p className="text-gray-700">
                            By creating an account or using famcal.ai, you agree to these Terms of Service. If you do not agree, do not use the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Beta disclaimer</h2>
                        <p className="text-gray-700">
                            famcal.ai is currently in <strong>private beta</strong>. This means:
                        </p>
                        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                            <li>The service may be modified, reset, or discontinued at any time without notice.</li>
                            <li>Your data may be lost during the beta period. We will make reasonable efforts to preserve it, but provide no guarantees.</li>
                            <li>Features may change, be removed, or behave unexpectedly.</li>
                            <li>There is no SLA or uptime commitment during beta.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Acceptable use</h2>
                        <p className="text-gray-700">You agree not to:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                            <li>Use the service for any unlawful purpose.</li>
                            <li>Attempt to access other users' data.</li>
                            <li>Use the NLP input to inject malicious prompts or abuse the AI API at scale.</li>
                            <li>Share your beta access credentials with others.</li>
                            <li>Scrape, copy, or redistribute data from the service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Your content</h2>
                        <p className="text-gray-700">
                            You retain ownership of the calendar data you create. By using famcal.ai, you grant us a limited license
                            to store and process that data solely to provide the service to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Limitation of liability</h2>
                        <p className="text-gray-700">
                            famcal.ai is provided "as is" without warranty of any kind. We are not liable for any loss of data,
                            missed events, or other damages arising from your use of the service. Your use is at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Changes to these terms</h2>
                        <p className="text-gray-700">
                            We may update these terms. Continued use of famcal.ai after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact</h2>
                        <p className="text-gray-700">
                            Questions? Email{' '}
                            <a href="mailto:sriram@famcal.ai" className="text-blue-600 hover:underline">sriram@famcal.ai</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-8 text-center text-sm text-gray-400">
                    <Link to="/terms" className="hover:text-gray-600">Terms of Service</Link>
                    {' · '}
                    <Link to="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
