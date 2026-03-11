import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FamilyMemberManager from '../components/FamilyMemberManager';
import FamilyAccessSettings from '../components/FamilyAccessSettings';
import { MessageSquare } from 'lucide-react';
import api from '../services/api';
import phoneService from '../services/phoneService';

const Settings: React.FC = () => {
    const [error, setError] = useState<string | null>(null);

    // WhatsApp / phone
    const [phoneNumber, setPhoneNumber] = useState('');
    const [savedPhone, setSavedPhone] = useState<string | null>(null);
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<string | null>(null);
    const [twilioJoinCode, setTwilioJoinCode] = useState<string | null>(null);
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneLinked, setPhoneLinked] = useState(false);

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
            setPhoneLinked(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save phone number';
            setError(msg);
        } finally {
            setPhoneSaving(false);
        }
    };

    const handleRemovePhone = async () => {
        if (!window.confirm('Remove your WhatsApp number?')) return;
        try {
            await phoneService.remove();
            setSavedPhone(null);
            setPhoneLinked(false);
        } catch {
            setError('Could not remove phone number');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />

            <div className="max-w-2xl mx-auto p-6 w-full">
                <button
                    onClick={() => navigate('/calendar')}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
                >
                    ← Back to Calendar
                </button>
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                        {error}
                    </div>
                )}

                {/* Family section */}
                <div className="mb-2">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">Family</h2>
                    <div className="space-y-4">
                        <FamilyMemberManager />
                        <FamilyAccessSettings />
                    </div>
                </div>

                {/* Connect section */}
                <div className="mb-2 mt-8">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">Connect</h2>

                    {/* WhatsApp */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">WhatsApp</h3>
                                <p className="text-xs text-gray-500">Text your calendar — add events, check your schedule, get reminders.</p>
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            {savedPhone && !phoneLinked ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{savedPhone}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Linked to your account</p>
                                    </div>
                                    <button
                                        onClick={handleRemovePhone}
                                        className="text-sm text-red-500 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : phoneLinked ? (
                                <div className="space-y-2 text-sm">
                                    <p className="font-medium text-green-700">Phone linked!</p>
                                    {twilioPhoneNumber && (
                                        <p className="text-gray-700">Save <span className="font-semibold">{twilioPhoneNumber}</span> as <span className="font-semibold">"kinroo.ai"</span> in your contacts.</p>
                                    )}
                                    {twilioJoinCode ? (
                                        <p className="text-gray-700">Send <span className="font-semibold">{twilioJoinCode}</span> to that number on WhatsApp to activate.</p>
                                    ) : (
                                        <p className="text-gray-700">Then send any message to that number on WhatsApp to start.</p>
                                    )}
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
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                        />
                                        <button
                                            onClick={handleSavePhone}
                                            disabled={phoneSaving || !phoneNumber.trim()}
                                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-green-300"
                                        >
                                            {phoneSaving ? 'Saving…' : 'Save'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400">International format required (e.g. +1 for US/Canada)</p>
                                </div>
                            )}
                        </div>

                        {/* Email forwarding info */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <p className="text-xs text-gray-500">
                                <span className="font-medium text-gray-700">Forward emails to kinroo.ai</span> — send any schedule email to{' '}
                                <span className="font-medium text-indigo-600">add@kinroo.ai</span> and we'll add the events to your calendar automatically.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account section */}
                <div className="mb-2 mt-8">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">Account</h2>

                    <div className="bg-white shadow rounded-lg overflow-hidden border border-red-100">
                        <div className="px-6 py-4 border-b border-red-100">
                            <h3 className="text-sm font-semibold text-red-700">Delete account</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Permanently deletes your account and all your data. This cannot be undone.</p>
                        </div>
                        <div className="px-6 py-4">
                            <button
                                onClick={async () => {
                                    if (!window.confirm('Are you sure you want to delete your account? All your events, family members, and settings will be permanently deleted.')) return;
                                    try {
                                        await api.delete('/api/auth/account');
                                        localStorage.removeItem('user');
                                        navigate('/');
                                    } catch {
                                        setError('Failed to delete account. Please try again.');
                                    }
                                }}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete my account
                            </button>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-gray-400">
                    Questions?{' '}
                    <a href="mailto:hello@kinroo.ai" className="text-indigo-500 hover:text-indigo-700">
                        hello@kinroo.ai
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Settings;
