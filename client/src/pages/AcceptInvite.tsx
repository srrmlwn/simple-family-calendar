import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface InviteDetails {
    inviteeEmail: string;
    ownerName: string;
    expiresAt: string;
}

const AcceptInvite: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loginWithGoogle } = useAuth();
    const token = searchParams.get('token') || '';

    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'accepting' | 'done'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    // Validate the token on mount
    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('No invite token provided.');
            return;
        }

        api.get(`/api/family/invite/validate?token=${encodeURIComponent(token)}`)
            .then(res => {
                setInvite(res.data);
                setStatus('valid');
            })
            .catch(err => {
                const msg = err?.response?.data?.error || 'This invitation is invalid or has expired.';
                setErrorMsg(msg);
                setStatus('error');
            });
    }, [token]);

    // If the user is already logged in and we have a pending token, accept automatically
    useEffect(() => {
        if (user && status === 'valid' && token) {
            handleAccept();
        }
    }, [user, status]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAccept = async () => {
        setStatus('accepting');
        try {
            await api.post('/api/family/invite/accept', { token });
            setStatus('done');
            // Force a fresh login to get a new JWT with managingFamilyId
            setTimeout(() => {
                navigate('/calendar');
                window.location.reload();
            }, 2500);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to accept invitation.';
            setErrorMsg(msg);
            setStatus('error');
        }
    };

    const handleSignInAndAccept = () => {
        // Store token so AuthContext can pick it up after OAuth callback
        sessionStorage.setItem('pendingInviteToken', token);
        loginWithGoogle();
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Validating invitation...</div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
                    <h1 className="text-xl font-semibold text-red-600 mb-3">Invitation Invalid</h1>
                    <p className="text-gray-600 mb-6">{errorMsg}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 text-white rounded"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'done') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
                    <div className="text-4xl mb-4">🎉</div>
                    <h1 className="text-xl font-semibold text-gray-900 mb-3">You're in!</h1>
                    <p className="text-gray-600">
                        You now have access to {invite?.ownerName ? `${invite.ownerName}'s` : 'the'} family calendar.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Redirecting you to the calendar...</p>
                </div>
            </div>
        );
    }

    if (status === 'accepting') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Accepting invitation...</div>
            </div>
        );
    }

    // status === 'valid' and user is NOT logged in yet
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">You've been invited!</h1>
                {invite && (
                    <p className="text-gray-600 mb-6">
                        <strong>{invite.ownerName}</strong> has invited you to co-manage the family calendar on kinroo.ai.
                    </p>
                )}
                <p className="text-sm text-gray-500 mb-6">
                    Sign in with Google to accept the invitation and get started.
                </p>
                <button
                    onClick={handleSignInAndAccept}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-white rounded-lg font-medium"
                    style={{ backgroundColor: 'var(--accent)' }}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Accept & Sign in with Google
                </button>
                <p className="text-xs text-gray-400 mt-4">
                    Invitation expires {invite ? new Date(invite.expiresAt).toLocaleDateString() : ''}.
                </p>
            </div>
        </div>
    );
};

export default AcceptInvite;
