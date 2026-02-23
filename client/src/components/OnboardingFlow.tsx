import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, Bell, Mail, Wand, Check } from 'lucide-react';
import api from '../services/api';
import eventService from '../services/eventService';

const STORAGE_KEY = 'onboarding_step';
const TOTAL_STEPS = 4;

interface OnboardingFlowProps {
    userName: string;
    onComplete: () => void;
}

// ── Step indicator ───────────────────────────────────────────────────────────

const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
    <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
            <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                    i === current
                        ? 'w-6 h-2 bg-indigo-600'
                        : i < current
                        ? 'w-2 h-2 bg-indigo-300'
                        : 'w-2 h-2 bg-gray-200'
                }`}
            />
        ))}
    </div>
);

// ── Shared button styles ─────────────────────────────────────────────────────

const PrimaryButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    children: React.ReactNode;
}> = ({ onClick, disabled, loading, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
    >
        {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
            children
        )}
    </button>
);

// ── Step 0: Welcome ──────────────────────────────────────────────────────────

const WelcomeStep: React.FC<{ userName: string; onNext: () => void; onSkip: () => void }> = ({
    userName,
    onNext,
    onSkip,
}) => (
    <div className="flex flex-col items-center text-center px-2">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
            <span className="text-3xl">🗓️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {userName}!
        </h2>
        <p className="text-gray-500 text-sm mb-7 max-w-xs">
            Let's take 60 seconds to set up famcal.ai so it's useful from day one.
        </p>
        <div className="w-full space-y-3 mb-8 text-left">
            {[
                { icon: '💬', text: 'Add events in plain English — just type or speak' },
                { icon: '📧', text: 'Get a daily email summary of tomorrow\'s schedule' },
                { icon: '👨‍👩‍👧', text: 'Keep the whole family in the loop with calendar invites' },
            ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{icon}</span>
                    <span className="text-sm text-gray-600">{text}</span>
                </div>
            ))}
        </div>
        <div className="flex flex-col gap-3 w-full">
            <PrimaryButton onClick={onNext}>
                Let's get started <ArrowRight className="w-4 h-4" />
            </PrimaryButton>
            <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
                Skip setup, go straight to calendar
            </button>
        </div>
    </div>
);

// ── Step 1: Notifications ────────────────────────────────────────────────────

interface NotifPrefs {
    digestTime: string;
    isDigestEnabled: boolean;
}

const NotificationsStep: React.FC<{
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
}> = ({ onNext, onBack, onSkip }) => {
    const [prefs, setPrefs] = useState<NotifPrefs>({ digestTime: '18:00', isDigestEnabled: true });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleContinue = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.put('/api/notifications/preferences', prefs);
            onNext();
        } catch {
            setError('Could not save preferences. You can update them later in Settings.');
            onNext(); // still advance — this is non-blocking in onboarding
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Stay on top of tomorrow</h2>
                    <p className="text-sm text-gray-500">Get a daily email digest of the next day's events.</p>
                </div>
            </div>

            {error && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    {error}
                </p>
            )}

            <div className="space-y-4 mb-6">
                {/* Enable/disable toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <p className="text-sm font-medium text-gray-800">Daily digest email</p>
                        <p className="text-xs text-gray-500 mt-0.5">A summary of tomorrow's events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={prefs.isDigestEnabled}
                            onChange={(e) => setPrefs({ ...prefs, isDigestEnabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {/* Time picker */}
                {prefs.isDigestEnabled && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <label htmlFor="onboarding-digest-time" className="block text-sm font-medium text-gray-800 mb-2">
                            Send it at
                        </label>
                        <input
                            id="onboarding-digest-time"
                            type="time"
                            value={prefs.digestTime}
                            onChange={(e) => setPrefs({ ...prefs, digestTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                        />
                    </div>
                )}
            </div>

            <StepFooter onBack={onBack} onContinue={handleContinue} onSkip={onSkip} saving={saving} />
        </div>
    );
};

// ── Step 2: Email Recipients ─────────────────────────────────────────────────

interface Recipient {
    id: string;
    name: string;
    email: string;
}

const RecipientsStep: React.FC<{
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
}> = ({ onNext, onBack, onSkip }) => {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!name.trim() || !email.trim()) {
            setError('Name and email are required');
            return;
        }
        setAdding(true);
        setError(null);
        try {
            const res = await api.post('/api/recipients', { name: name.trim(), email: email.trim(), isDefault: true });
            setRecipients((prev) => [...prev, res.data]);
            setName('');
            setEmail('');
        } catch {
            setError('Could not add recipient. Try again or skip for now.');
        } finally {
            setAdding(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Who gets calendar invites?</h2>
                    <p className="text-sm text-gray-500">Add family members or contacts to notify when you create events.</p>
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    {error}
                </p>
            )}

            {/* Add form */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                <input
                    type="text"
                    placeholder="Name (e.g. Sarah)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    disabled={adding}
                />
                <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    disabled={adding}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !name.trim() || !email.trim()}
                    className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                >
                    {adding ? 'Adding…' : '+ Add'}
                </button>
            </div>

            {/* Added recipients */}
            {recipients.length > 0 && (
                <div className="mb-4 space-y-2">
                    {recipients.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                                <p className="text-xs text-gray-500 truncate">{r.email}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <StepFooter
                onBack={onBack}
                onContinue={onNext}
                onSkip={onSkip}
                skipLabel={recipients.length === 0 ? 'Skip for now' : undefined}
            />
        </div>
    );
};

// ── Step 3: Try It ───────────────────────────────────────────────────────────

const TryItStep: React.FC<{
    onFinish: () => void;
    onBack: () => void;
}> = ({ onFinish, onBack }) => {
    const [input, setInput] = useState('Add dentist appointment on Thursday at 10am');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleTry = async () => {
        if (!input.trim()) return;
        setStatus('loading');
        setMessage('');
        try {
            const result = await eventService.nlpCommand(input.trim());
            if (result.intent === 'create' || result.intent === 'update') {
                setStatus('success');
                setMessage(result.message || 'Event added to your calendar!');
            } else {
                // query or other intent — still count as success for onboarding
                setStatus('success');
                setMessage(result.message || 'Done!');
            }
        } catch {
            setStatus('error');
            setMessage('Something went wrong. You can try again from the calendar.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleTry();
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Wand className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Try it out</h2>
                    <p className="text-sm text-gray-500">famcal.ai understands plain English. Give it a try.</p>
                </div>
            </div>

            {status === 'idle' || status === 'loading' ? (
                <div className="mb-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={status === 'loading'}
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            placeholder="Add dentist appointment on Thursday at 10am"
                        />
                        <button
                            type="button"
                            onClick={handleTry}
                            disabled={status === 'loading' || !input.trim()}
                            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                        >
                            {status === 'loading' ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 ml-1">
                        Edit the example or type your own.
                    </p>
                </div>
            ) : status === 'success' ? (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-green-800">Event created!</p>
                        <p className="text-sm text-green-700 mt-0.5">{message}</p>
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">{message}</p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Back
                </button>
                <PrimaryButton onClick={onFinish}>
                    {status === 'success' ? 'Go to my calendar' : 'Skip, go to calendar'}{' '}
                    <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
            </div>
        </div>
    );
};

// ── Shared footer (Back / Continue / Skip) ───────────────────────────────────

const StepFooter: React.FC<{
    onBack: () => void;
    onContinue: () => void;
    onSkip: () => void;
    saving?: boolean;
    skipLabel?: string;
}> = ({ onBack, onContinue, onSkip, saving, skipLabel }) => (
    <div className="flex items-center justify-between pt-2">
        <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
            Back
        </button>
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
                {skipLabel ?? 'Skip'}
            </button>
            <PrimaryButton onClick={onContinue} loading={saving}>
                Continue <ArrowRight className="w-4 h-4" />
            </PrimaryButton>
        </div>
    </div>
);

// ── Main orchestrator ────────────────────────────────────────────────────────

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userName, onComplete }) => {
    const [step, setStep] = useState<number>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? parseInt(saved, 10) : 0;
        return isNaN(parsed) || parsed < 0 || parsed >= TOTAL_STEPS ? 0 : parsed;
    });
    const [completing, setCompleting] = useState(false);

    // Persist step to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(step));
    }, [step]);

    const markComplete = useCallback(async () => {
        setCompleting(true);
        try {
            await api.post('/api/settings/complete-onboarding');
        } catch {
            // Best-effort — don't block the user
        } finally {
            localStorage.removeItem(STORAGE_KEY);
            setCompleting(false);
            onComplete();
        }
    }, [onComplete]);

    const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);
    const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

    const renderStep = () => {
        switch (step) {
            case 0:
                return <WelcomeStep userName={userName} onNext={goNext} onSkip={markComplete} />;
            case 1:
                return <NotificationsStep onNext={goNext} onBack={goBack} onSkip={goNext} />;
            case 2:
                return <RecipientsStep onNext={goNext} onBack={goBack} onSkip={goNext} />;
            case 3:
                return <TryItStep onFinish={markComplete} onBack={goBack} />;
            default:
                return null;
        }
    };

    return (
        // Full-screen backdrop — calendar is blurred behind
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
                {/* Skip button in top-right corner */}
                <button
                    type="button"
                    onClick={markComplete}
                    disabled={completing}
                    aria-label="Skip setup"
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Step indicator */}
                <div className="mb-6">
                    <StepDots current={step} total={TOTAL_STEPS} />
                </div>

                {/* Step content */}
                {renderStep()}
            </div>
        </div>
    );
};

export default OnboardingFlow;
