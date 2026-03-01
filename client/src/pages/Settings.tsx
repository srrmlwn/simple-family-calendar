import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import NotificationPreferences from '../components/NotificationPreferences';
import FamilyMemberManager from '../components/FamilyMemberManager';
import FamilyAccessSettings from '../components/FamilyAccessSettings';
import { Plus, Trash2, Check, X, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { getUserTimezone } from '../utils/timezone';
import phoneService from '../services/phoneService';

interface Recipient {
    id: string;
    name: string;
    email: string;
    isDefault: boolean;
}

const Settings: React.FC = () => {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [newRecipient, setNewRecipient] = useState({ name: '', email: '', isDefault: false });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', isDefault: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [timezone] = useState(getUserTimezone());
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    // WhatsApp / phone
    const [phoneNumber, setPhoneNumber] = useState('');
    const [savedPhone, setSavedPhone] = useState<string | null>(null);
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<string | null>(null);
    const [twilioJoinCode, setTwilioJoinCode] = useState<string | null>(null);
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneLinked, setPhoneLinked] = useState(false);

    const navigate = useNavigate();

    // Fetch recipients and settings on mount
    useEffect(() => {
        fetchRecipients();
        api.get('/api/settings').then(res => {
            setSavedPhone(res.data.phoneNumber ?? null);
            setTwilioPhoneNumber(res.data.twilioPhoneNumber ?? null);
            setTwilioJoinCode(res.data.twilioJoinCode ?? null);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            setInstallPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // Fetch recipients from API
    const fetchRecipients = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/api/recipients');
            setRecipients(response.data);
        } catch (err) {
            setError('Failed to load recipients. Please try again later.');
            console.error('Error fetching recipients:', err);
        } finally {
            setLoading(false);
        }
    };

    // Add new recipient
    const handleAddRecipient = async () => {
        if (!newRecipient.name || !newRecipient.email) {
            setError('Name and email are required');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const addResponse = await api.post('/api/recipients', newRecipient);

            setRecipients([...recipients, addResponse.data]);
            setNewRecipient({ name: '', email: '', isDefault: false });
            setSuccessMessage('Recipient added successfully');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to add recipient');
            }
            console.error('Error adding recipient:', err);
        } finally {
            setLoading(false);
        }
    };

    // Delete recipient
    const handleDeleteRecipient = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this recipient?')) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await api.delete(`/api/recipients/${id}`);

            setRecipients(recipients.filter(r => r.id !== id));
            setSuccessMessage('Recipient deleted successfully');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('Failed to delete recipient');
            console.error('Error deleting recipient:', err);
        } finally {
            setLoading(false);
        }
    };

    // Start editing recipient
    const handleEditStart = (recipient: Recipient) => {
        setEditingId(recipient.id);
        setEditForm({
            name: recipient.name,
            email: recipient.email,
            isDefault: recipient.isDefault
        });
    };

    // Save edited recipient
    const handleEditSave = async () => {
        if (!editForm.name || !editForm.email) {
            setError('Name and email are required');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const updateResponse = await api.put(`/api/recipients/${editingId}`, editForm);

            setRecipients(recipients.map(r =>
                r.id === editingId ? updateResponse.data : r
            ));
            setEditingId(null);
            setSuccessMessage('Recipient updated successfully');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to update recipient');
            }
            console.error('Error updating recipient:', err);
        } finally {
            setLoading(false);
        }
    };

    // Cancel editing
    const handleEditCancel = () => {
        setEditingId(null);
    };

    // Toggle default status
    const handleToggleDefault = async (id: string) => {
        const recipient = recipients.find(r => r.id === id);

        if (!recipient) return;

        try {
            setLoading(true);
            setError(null);

            const toggleResponse = await api.put(`/api/recipients/${id}`, {
                isDefault: !recipient.isDefault
            });

            setRecipients(recipients.map(r =>
                r.id === id ? toggleResponse.data : r
            ));
        } catch (err) {
            setError('Failed to update recipient');
            console.error('Error updating recipient:', err);
        } finally {
            setLoading(false);
        }
    };

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

    const handleInstallClick = async () => {
        if (!installPrompt) return;

        // Show the install prompt
        installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the saved prompt since it can't be used again
        setInstallPrompt(null);
        setShowInstallButton(false);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />

            <div className="max-w-4xl mx-auto p-6 w-full">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 transition-colors"
                >
                    ← Back to Calendar
                </button>
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
                        {successMessage}
                    </div>
                )}

                {/* Timezone Display */}
                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium">Timezone</h2>
                        <p className="text-sm text-gray-600">
                            Your current timezone is used to display dates and times correctly.
                        </p>
                    </div>
                    <div className="px-6 py-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Timezone</label>
                            <p className="text-sm text-gray-900">{timezone.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{timezone}</p>
                        </div>
                    </div>
                </div>

                {/* Co-Manager Access */}
                <FamilyAccessSettings />

                {/* Family Members */}
                <div className="mb-6">
                    <FamilyMemberManager />
                </div>

                {/* Notification Preferences */}
                <div className="mb-6">
                    <NotificationPreferences />
                </div>

                {/* WhatsApp */}
                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <div>
                            <h2 className="text-lg font-medium">WhatsApp</h2>
                            <p className="text-sm text-gray-600">Text your calendar — add events, check your schedule, get reminders.</p>
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
                                    <p className="text-gray-700">Save <span className="font-semibold">{twilioPhoneNumber}</span> as <span className="font-semibold">"FamCal"</span> in your contacts.</p>
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
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium">Email Recipients</h2>
                        <p className="text-sm text-gray-600">
                            Manage the people who will receive calendar invites by default when you create events.
                        </p>
                    </div>

                    {/* Add new recipient form */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newRecipient.name}
                                    onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    placeholder="Enter name"
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newRecipient.email}
                                    onChange={(e) => setNewRecipient({...newRecipient, email: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded"
                                    placeholder="Enter email address"
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex items-end">
                                <div className="flex items-center h-[42px]">
                                    <input
                                        type="checkbox"
                                        id="new-default"
                                        checked={newRecipient.isDefault}
                                        onChange={(e) => setNewRecipient({...newRecipient, isDefault: e.target.checked})}
                                        className="h-4 w-4 text-blue-600 rounded"
                                        disabled={loading}
                                    />
                                    <label htmlFor="new-default" className="ml-2 text-sm text-gray-700">
                                        Default Recipient
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleAddRecipient}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                                    disabled={loading}
                                >
                                    <Plus size={16} className="mr-1" />
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Recipients list */}
                    <div className="divide-y divide-gray-200">
                        {loading && recipients.length === 0 ? (
                            <div className="p-6 text-center text-gray-600">
                                Loading recipients...
                            </div>
                        ) : recipients.length === 0 ? (
                            <div className="p-6 text-center text-gray-600">
                                No recipients added yet. Add someone above.
                            </div>
                        ) : (
                            recipients.map((recipient) => (
                                <div key={recipient.id} className="px-6 py-4">
                                    {editingId === recipient.id ? (
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex-1 min-w-[200px]">
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-[200px]">
                                                <input
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                                    className="w-full p-2 border border-gray-300 rounded"
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.isDefault}
                                                    onChange={(e) => setEditForm({...editForm, isDefault: e.target.checked})}
                                                    className="h-4 w-4 text-blue-600 rounded"
                                                    disabled={loading}
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Default</span>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={handleEditSave}
                                                    className="p-2 text-green-600 hover:text-green-800 disabled:text-green-300"
                                                    disabled={loading}
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={handleEditCancel}
                                                    className="p-2 text-red-600 hover:text-red-800 disabled:text-red-300"
                                                    disabled={loading}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-medium">{recipient.name}</h3>
                                                <p className="text-sm text-gray-600">{recipient.email}</p>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`default-${recipient.id}`}
                                                        checked={recipient.isDefault}
                                                        onChange={() => handleToggleDefault(recipient.id)}
                                                        className="h-4 w-4 text-blue-600 rounded"
                                                        disabled={loading}
                                                    />
                                                    <label htmlFor={`default-${recipient.id}`} className="ml-2 text-sm text-gray-700">
                                                        Default
                                                    </label>
                                                </div>
                                                <button
                                                    onClick={() => handleEditStart(recipient)}
                                                    className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                                                    disabled={loading}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecipient(recipient.id)}
                                                    className="text-red-600 hover:text-red-800 disabled:text-red-300"
                                                    disabled={loading}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {showInstallButton && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Install App</h2>
                        <p className="mb-4">Install famcal.ai on your device for quick access and offline use.</p>
                        <button
                            onClick={handleInstallClick}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Install App
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Installation Help</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium text-lg">Chrome / Edge</h3>
                            <p className="text-gray-600">Click the install icon (+ symbol) in the address bar to install the app.</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-lg">Safari (iOS)</h3>
                            <p className="text-gray-600">Tap the share button and select "Add to Home Screen" to install the app.</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-lg">Firefox</h3>
                            <p className="text-gray-600">Click the install icon in the address bar to install the app.</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-lg">Android</h3>
                            <p className="text-gray-600">Open in Chrome and tap the menu (three dots) &gt; "Add to Home screen".</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded mr-2"
                    >
                        Back to Calendar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;