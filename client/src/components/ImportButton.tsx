import React, { useEffect, useRef, useState } from 'react';
import { CalendarPlus, ChevronDown } from 'lucide-react';
import api from '../services/api';

interface ImportButtonProps {
    onImportComplete: () => void;
    /** Render as icon-only button (no label/chevron) for use in toolbars */
    compact?: boolean;
}

type Status = 'idle' | 'checking' | 'importing' | 'done' | 'error';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function formatLastSynced(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const ImportButton: React.FC<ImportButtonProps> = ({ onImportComplete, compact = false }) => {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState<string>('');
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // On mount: handle post-OAuth redirect and fetch last synced timestamp
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('google_calendar_connected');
        const error = params.get('google_calendar_error');

        if (connected === 'true') {
            // Clean up URL
            params.delete('google_calendar_connected');
            const newSearch = params.toString();
            window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
            runImport();
        } else if (error) {
            params.delete('google_calendar_error');
            const newSearch = params.toString();
            window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
            setStatus('error');
            setMessage(`Google sign-in failed: ${decodeURIComponent(error)}`);
            scheduleDismiss();
        } else {
            // Fetch last synced timestamp silently
            api.get<{ connected: boolean; lastSyncedAt: string | null }>('/api/google-calendar/status')
                .then(res => {
                    if (res.data.lastSyncedAt) {
                        setLastSyncedAt(new Date(res.data.lastSyncedAt));
                    }
                })
                .catch(() => { /* non-critical, ignore */ });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function scheduleDismiss() {
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
            setStatus('idle');
            setMessage('');
        }, 4000);
    }

    async function runImport() {
        setOpen(false);
        setStatus('importing');
        setMessage('Importing…');
        try {
            const res = await api.post<{ imported: number; skipped: number }>('/api/google-calendar/import');
            const { imported, skipped } = res.data;
            const syncedAt = new Date();
            setLastSyncedAt(syncedAt);
            setStatus('done');
            setMessage(
                imported === 0
                    ? `Already up to date (${skipped} event${skipped !== 1 ? 's' : ''} exist)`
                    : `Imported ${imported} event${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} already existed` : ''}`
            );
            onImportComplete();
            scheduleDismiss();
        } catch (err: any) {
            const errMsg = err?.response?.data?.error || 'Import failed';
            setStatus('error');
            setMessage(errMsg);
            scheduleDismiss();
        }
    }

    async function handleGoogleCalendar() {
        setOpen(false);
        setStatus('checking');
        setMessage('');
        try {
            const res = await api.get<{ connected: boolean }>('/api/google-calendar/status');
            if (res.data.connected) {
                await runImport();
            } else {
                // Redirect to Google OAuth — server will redirect back after consent
                window.location.href = `${API_URL}/api/google-calendar/connect`;
            }
        } catch {
            setStatus('error');
            setMessage('Could not reach server');
            scheduleDismiss();
        }
    }

    const isWorking = status === 'checking' || status === 'importing';

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setOpen((v) => !v)}
                    disabled={isWorking}
                    className={compact
                        ? "p-2 text-gray-600 hover:text-gray-700 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        : "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    }
                    aria-label="Import events"
                    aria-haspopup="true"
                    aria-expanded={open}
                    title="Import events"
                >
                    {isWorking ? (
                        <span className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <CalendarPlus size={compact ? 20 : 14} />
                    )}
                    {!compact && <span>Import</span>}
                    {!compact && <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
                </button>
                {!compact && lastSyncedAt && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        Synced {formatLastSynced(lastSyncedAt)}
                    </span>
                )}
            </div>

            {/* Inline status message */}
            {status !== 'idle' && !isWorking && message && (
                <span
                    className={`absolute right-0 top-9 z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-xs shadow-sm ${
                        status === 'error'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                    }`}
                >
                    {message}
                </span>
            )}

            {isWorking && message && (
                <span className="absolute right-0 top-9 z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                    {message}
                </span>
            )}

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 py-1">
                    <button
                        onClick={handleGoogleCalendar}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        {/* Google "G" icon */}
                        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google Calendar
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImportButton;
