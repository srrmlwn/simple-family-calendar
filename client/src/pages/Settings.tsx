import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Plus, Trash2, Check, X } from 'lucide-react';
import api from '../services/api';
import { getUserTimezone } from '../utils/timezone';

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

    const navigate = useNavigate();

    // Fetch recipients on component mount
    useEffect(() => {
        fetchRecipients();
    }, []);

    // Fetch recipients from API
    const fetchRecipients = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/recipients');
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

            const response = await api.post('/recipients', newRecipient);

            setRecipients([...recipients, response.data]);
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

            await api.delete(`/recipients/${id}`);

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

            const response = await api.put(`/recipients/${editingId}`, editForm);

            setRecipients(recipients.map(r =>
                r.id === editingId ? response.data : r
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

            const response = await api.put(`/recipients/${id}`, {
                isDefault: !recipient.isDefault
            });

            setRecipients(recipients.map(r =>
                r.id === id ? response.data : r
            ));
        } catch (err) {
            setError('Failed to update recipient');
            console.error('Error updating recipient:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header title="Settings" />

            <div className="max-w-4xl mx-auto p-6 w-full">
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
                        <p className="text-sm text-gray-500">
                            Your current timezone is used to display dates and times correctly.
                        </p>
                    </div>
                    <div className="px-6 py-4">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Timezone</label>
                                <input
                                    type="text"
                                    value={timezone}
                                    className="w-full p-2 border border-gray-300 rounded bg-gray-50"
                                    disabled
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium">Email Recipients</h2>
                        <p className="text-sm text-gray-500">
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
                            <div className="p-6 text-center text-gray-500">
                                Loading recipients...
                            </div>
                        ) : recipients.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
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
                                                <p className="text-sm text-gray-500">{recipient.email}</p>
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