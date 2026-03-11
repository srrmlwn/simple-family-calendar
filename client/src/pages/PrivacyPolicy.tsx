import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="mb-6">
                    <Link to="/login" className="text-sm text-blue-600 hover:text-blue-500">← Back to kinroo.ai</Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: March 7, 2026</p>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8 prose prose-gray max-w-none">

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. What we collect</h2>
                        <p className="text-gray-700">When you use kinroo.ai, we collect:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                            <li><strong>Account information:</strong> your name, email address, and (optionally) a Google profile photo via OAuth.</li>
                            <li><strong>Calendar data:</strong> event titles, dates, times, locations, and descriptions that you create.</li>
                            <li><strong>Family member names:</strong> names you add to tag events (no other data about them is collected).</li>
                            <li><strong>Email recipients:</strong> names and email addresses of people you send calendar invites to.</li>
                            <li><strong>Device timezone:</strong> used to display times correctly.</li>
                            <li><strong>WhatsApp phone number</strong> (optional): if you connect it for WhatsApp reminders.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How we use your data</h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li>To display and manage your calendar events.</li>
                            <li>To send calendar invite emails to recipients you specify.</li>
                            <li>To send you a daily digest email of upcoming events (if enabled).</li>
                            <li>To power natural-language event creation via AI (see section 3).</li>
                        </ul>
                        <p className="text-gray-700 mt-3">We do not sell your data, use it for advertising, or share it with third parties except as described in this policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. AI data processing (Anthropic)</h2>
                        <p className="text-gray-700">
                            When you type a natural-language request (e.g., "add soccer practice Friday at 4pm"), the text you type is sent to
                            the <strong>Anthropic API</strong> to be parsed into calendar event fields. This means Anthropic processes the
                            text of your calendar requests. We do not send your full event history or personal account details to Anthropic —
                            only the specific message you type.
                        </p>
                        <p className="text-gray-700 mt-2">
                            Anthropic's data handling is governed by their <a href="https://www.anthropic.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data storage and security</h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li>Your data is stored in a PostgreSQL database hosted on Heroku (US region).</li>
                            <li>Authentication uses httpOnly cookies and JWT tokens — no passwords are stored in plaintext.</li>
                            <li>Google OAuth tokens are used only to import events and are stored encrypted.</li>
                            <li>We use HTTPS for all data in transit.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your rights</h2>
                        <ul className="list-disc pl-6 space-y-1 text-gray-700">
                            <li><strong>Access:</strong> you can view all your data in the app.</li>
                            <li><strong>Deletion:</strong> you can delete your account and all associated data from Settings → Danger Zone → "Delete my account". Deletion is immediate and permanent.</li>
                            <li><strong>Portability:</strong> your events can be exported via Google Calendar sync if connected.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Children's data</h2>
                        <p className="text-gray-700">
                            kinroo.ai is not directed at children under 13. You may add family members (including children's names)
                            as calendar tags, but we only store their names — not any other personal information about them.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact</h2>
                        <p className="text-gray-700">
                            Questions about this policy? Email us at{' '}
                            <a href="mailto:hello@kinroo.ai" className="text-blue-600 hover:underline">hello@kinroo.ai</a>.
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

export default PrivacyPolicy;
