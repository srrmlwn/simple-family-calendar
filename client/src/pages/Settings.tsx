import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FamilyMemberManager from '../components/FamilyMemberManager';
import FamilyAccessSettings from '../components/FamilyAccessSettings';
import { MessageSquare } from 'lucide-react';
import api from '../services/api';
import phoneService from '../services/phoneService';
import { useAuth } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

const Settings: React.FC = () => {
    const { logout } = useAuth();
    const [error, setError] = useState<string | null>(null);

    // WhatsApp / phone
    const [phoneNumber, setPhoneNumber] = useState('');
    const [savedPhone, setSavedPhone] = useState<string | null>(null);
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<string | null>(null);
    const [twilioJoinCode, setTwilioJoinCode] = useState<string | null>(null);
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneJustLinked, setPhoneJustLinked] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        api.get('/api/settings').then(res => {
            setSavedPhone(res.data.phoneNumber ?? null);
            setTwilioPhoneNumber(res.data.twilioPhoneNumber ?? null);
            setTwilioJoinCode(res.data.twilioJoinCode ?? null);
        }).catch(() => {});
    }, []);

    const handleSavePhone = async () => {
        if (!phoneNumber.trim()) return;
        setPhoneSaving(true);
        setError(null);
        try {
            await phoneService.save(phoneNumber.trim());
            setSavedPhone(phoneNumber.trim());
            setPhoneNumber('');
            setPhoneJustLinked(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save phone number';
            setError(msg);
        } finally {
            setPhoneSaving(false);
        }
    };

    const handleRemovePhone = async () => {
        if (!window.confirm('Remove your phone number?')) return;
        try {
            await phoneService.remove();
            setSavedPhone(null);
            setPhoneJustLinked(false);
        } catch {
            setError('Could not remove phone number');
        }
    };

    const handleRestartOnboarding = async () => {
        try {
            await api.post('/api/settings/reset-onboarding');
            navigate('/calendar');
        } catch {
            setError('Could not reset setup. Please try again.');
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Are you sure you want to delete your account? All your events, family members, and settings will be permanently deleted.')) return;
        try {
            await api.delete('/api/auth/account');
            logout();
        } catch {
            setError('Failed to delete account. Please try again.');
        }
    };

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
            <Header />

            <div className="max-w-2xl mx-auto p-6 w-full">
                <button
                    onClick={() => navigate('/calendar')}
                    className="flex items-center gap-1 text-sm mb-4 transition-colors"
                    style={{ color: 'var(--accent)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-mid)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--accent)')}
                >
                    ← Back to Calendar
                </button>
                <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-base)' }}>Settings</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                        {error}
                    </div>
                )}

                {/* Family section */}
                <div className="mb-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-3" style={{ color: 'var(--text-muted)' }}>Family</h2>
                    <div className="space-y-4">
                        <FamilyMemberManager />
                        <FamilyAccessSettings />
                    </div>
                </div>

                {/* Connect section */}
                <div className="mb-2 mt-8">
                    <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-3" style={{ color: 'var(--text-muted)' }}>Connect</h2>

                    {/* SMS */}
                    <div className="shadow rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>Text (SMS)</h3>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Text your calendar — add events, check your schedule, get reminders.</p>
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            {savedPhone && !phoneJustLinked ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>{savedPhone}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Linked to your account</p>
                                    </div>
                                    <button
                                        onClick={handleRemovePhone}
                                        className="text-sm text-red-500 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : phoneJustLinked ? (
                                <div className="space-y-2 text-sm">
                                    <p className="font-medium text-blue-700">Phone linked!</p>
                                    {twilioPhoneNumber && (
                                        <p style={{ color: 'var(--text-base)' }}>Save <span className="font-semibold">{twilioPhoneNumber}</span> as <span className="font-semibold">"kinroo.ai"</span> in your contacts.</p>
                                    )}
                                    <p style={{ color: 'var(--text-base)' }}>Text any message to that number to get started.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            placeholder="+12125551234"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSavePhone()}
                                            disabled={phoneSaving}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        />
                                        <button
                                            onClick={handleSavePhone}
                                            disabled={phoneSaving || !phoneNumber.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-blue-300"
                                        >
                                            {phoneSaving ? 'Saving…' : 'Save'}
                                        </button>
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>International format required (e.g. +1 for US/Canada)</p>
                                </div>
                            )}
                        </div>

                        {/* Email forwarding info */}
                        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-app)' }}>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                <span className="font-medium" style={{ color: 'var(--text-base)' }}>Forward emails to kinroo.ai</span> — send any schedule email to{' '}
                                <span className="font-medium" style={{ color: 'var(--accent)' }}>add@kinroo.ai</span> and we'll add the events to your calendar automatically.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account section */}
                <div className="mb-2 mt-8">
                    <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-3" style={{ color: 'var(--text-muted)' }}>Account</h2>

                    <div className="shadow rounded-lg overflow-hidden mb-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div className="px-6 py-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>Redo setup tour</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Walk through the getting-started flow again.</p>
                            </div>
                            <button
                                onClick={handleRestartOnboarding}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-base)' }}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restart
                            </button>
                        </div>
                    </div>

                    <div className="shadow rounded-lg overflow-hidden border border-red-100" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div className="px-6 py-4 border-b border-red-100">
                            <h3 className="text-sm font-semibold text-red-700">Delete account</h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Permanently deletes your account and all your data. This cannot be undone.</p>
                        </div>
                        <div className="px-6 py-4">
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete my account
                            </button>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Questions?{' '}
                    <a href="mailto:hello@kinroo.ai" style={{ color: 'var(--accent)' }}>
                        hello@kinroo.ai
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Settings;
