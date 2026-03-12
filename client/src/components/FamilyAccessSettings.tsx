import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Mail } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PendingInvite {
    id: string;
    inviteeEmail: string;
    createdAt: string;
    expiresAt: string;
}

interface CoManager {
    id: string;
    coManagerUserId: string;
    name: string;
    email: string;
    createdAt: string;
}

const FamilyAccessSettings: React.FC = () => {
    const { user } = useAuth();
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [coManagers, setCoManagers] = useState<CoManager[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isCoManager = !!user?.managingFamilyId;

    useEffect(() => {
        if (!isCoManager) {
            fetchData();
        }
    }, [isCoManager]);

    const fetchData = async () => {
        try {
            const [invitesRes, managersRes] = await Promise.all([
                api.get('/api/family/invites'),
                api.get('/api/family/co-managers'),
            ]);
            setInvites(invitesRes.data);
            setCoManagers(managersRes.data);
        } catch {
            // Silently ignore — not critical to block the settings page
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim()) {
            setError('Email is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await api.post('/api/family/invite', { email: inviteEmail.trim() });
            setInviteEmail('');
            showSuccess('Invitation sent successfully');
            await fetchData();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(msg || 'Failed to send invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeInvite = async (id: string) => {
        if (!window.confirm('Revoke this invitation?')) return;
        setLoading(true);
        try {
            await api.delete(`/api/family/invites/${id}`);
            setInvites(prev => prev.filter(i => i.id !== id));
            showSuccess('Invitation revoked');
        } catch {
            setError('Failed to revoke invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCoManager = async (id: string, name: string) => {
        if (!window.confirm(`Remove ${name} as a co-manager?`)) return;
        setLoading(true);
        try {
            await api.delete(`/api/family/co-managers/${id}`);
            setCoManagers(prev => prev.filter(m => m.id !== id));
            showSuccess('Co-manager removed');
        } catch {
            setError('Failed to remove co-manager');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shadow rounded-lg overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-lg font-medium" style={{ color: 'var(--text-base)' }}>Co-Manager Access</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {isCoManager
                        ? `You are co-managing ${user?.managingFamilyName ? `${user.managingFamilyName}'s` : 'another'} family calendar. Contact them to make changes to access.`
                        : 'Invite a partner or co-parent to share full access to this calendar.'}
                </p>
            </div>

            {isCoManager ? (
                <div className="px-6 py-4">
                    <div className="flex items-center gap-2 rounded-md px-4 py-3" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' }}>
                        <span className="text-sm font-medium">
                            Co-managing {user?.managingFamilyName ? `${user.managingFamilyName}'s` : 'another'} family calendar
                        </span>
                    </div>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="px-6 py-3 bg-green-50 border-b border-green-100 text-green-700 text-sm">
                            {successMessage}
                        </div>
                    )}

                    {/* Invite form */}
                    <div className="px-6 py-4" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                    Invite by email
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                                    className="w-full p-2 rounded focus:outline-none"
                                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-base)' }}
                                    placeholder="partner@example.com"
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleSendInvite}
                                    className="flex items-center px-4 py-2 text-white rounded transition-colors"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-mid)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                                    disabled={loading}
                                >
                                    <Mail size={16} className="mr-1" />
                                    Send Invite
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pending invites */}
                    {invites.length > 0 && (
                        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Pending Invitations</h3>
                            <div className="space-y-2">
                                {invites.map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="text-sm font-medium">{invite.inviteeEmail}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeInvite(invite.id)}
                                            className="text-red-500 hover:text-red-700 disabled:text-red-300"
                                            disabled={loading}
                                            title="Revoke invitation"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active co-managers */}
                    {coManagers.length > 0 && (
                        <div className="px-6 py-4">
                            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Active Co-Managers</h3>
                            <div className="space-y-2">
                                {coManagers.map(manager => (
                                    <div key={manager.id} className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="text-sm font-medium">{manager.name || manager.email}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{manager.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveCoManager(manager.id, manager.name || manager.email)}
                                            className="text-red-500 hover:text-red-700 disabled:text-red-300"
                                            disabled={loading}
                                            title="Remove co-manager"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {invites.length === 0 && coManagers.length === 0 && (
                        <div className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                            No co-managers yet. Invite someone above.
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FamilyAccessSettings;
