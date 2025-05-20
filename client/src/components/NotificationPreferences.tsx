import React, { useState, useEffect } from 'react';
import { Clock, Bell, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface NotificationPreferences {
    digestTime: string;
    isDigestEnabled: boolean;
}

interface DigestLog {
    id: string;
    sentAt: string;
    status: 'sent' | 'failed';
    errorMessage?: string;
}

interface DigestStats {
    total: number;
    successful: number;
    failed: number;
}

const NotificationPreferences: React.FC = () => {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        digestTime: '18:00',
        isDigestEnabled: true
    });
    const [logs, setLogs] = useState<DigestLog[]>([]);
    const [stats, setStats] = useState<DigestStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch preferences and logs on component mount
    useEffect(() => {
        fetchPreferences();
        fetchLogs();
        fetchStats();
    }, []);

    // Fetch notification preferences
    const fetchPreferences = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/api/notifications/preferences');
            setPreferences(response.data);
        } catch (err) {
            setError('Failed to load notification preferences');
            console.error('Error fetching preferences:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch digest logs
    const fetchLogs = async () => {
        try {
            const response = await api.get('/api/notifications/digest-logs');
            setLogs(response.data);
        } catch (err) {
            console.error('Error fetching digest logs:', err);
        }
    };

    // Fetch digest statistics
    const fetchStats = async () => {
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const response = await api.get(`/api/notifications/digest-stats?startDate=${startDate}&endDate=${endDate}`);
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching digest stats:', err);
        }
    };

    // Update preferences
    const handleUpdatePreferences = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.put('/api/notifications/preferences', preferences);
            setPreferences(response.data);
            setSuccessMessage('Preferences updated successfully');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to update preferences');
            }
            console.error('Error updating preferences:', err);
        } finally {
            setLoading(false);
        }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium">Daily Digest Settings</h2>
                <p className="text-sm text-gray-500">
                    Configure when you want to receive your daily calendar digest.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {error}
                    </div>
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3">
                    {successMessage}
                </div>
            )}

            <div className="px-6 py-4 space-y-4">
                {/* Digest Time Setting */}
                <div className="flex items-center space-x-4">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Digest Time
                        </label>
                        <input
                            type="time"
                            value={preferences.digestTime}
                            onChange={(e) => setPreferences({ ...preferences, digestTime: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Enable/Disable Setting */}
                <div className="flex items-center space-x-4">
                    <Bell className="h-5 w-5 text-gray-400" />
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="enable-digest"
                            checked={preferences.isDigestEnabled}
                            onChange={(e) => setPreferences({ ...preferences, isDigestEnabled: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            disabled={loading}
                        />
                        <label htmlFor="enable-digest" className="ml-2 text-sm text-gray-700">
                            Enable daily digest
                        </label>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleUpdatePreferences}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>

            {/* Digest Statistics */}
            {stats && (
                <div className="px-6 py-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Digest Statistics (Last 30 Days)</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-500">Total</div>
                            <div className="text-lg font-semibold">{stats.total}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                            <div className="text-sm text-green-500">Successful</div>
                            <div className="text-lg font-semibold text-green-600">{stats.successful}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                            <div className="text-sm text-red-500">Failed</div>
                            <div className="text-lg font-semibold text-red-600">{stats.failed}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Digest Logs */}
            {logs.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Digest Logs</h3>
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className={`p-3 rounded ${
                                    log.status === 'sent' ? 'bg-green-50' : 'bg-red-50'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`text-sm font-medium ${
                                            log.status === 'sent' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {log.status === 'sent' ? 'Sent' : 'Failed'}
                                        </span>
                                        <div className="text-sm text-gray-500">
                                            {formatDate(log.sentAt)}
                                        </div>
                                    </div>
                                    {log.errorMessage && (
                                        <div className="text-sm text-red-600">
                                            {log.errorMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPreferences; 