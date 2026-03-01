import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, Wand, Check, Users, MessageSquare } from 'lucide-react';
import api from '../services/api';
import eventService from '../services/eventService';
import familyMemberService from '../services/familyMemberService';
import phoneService from '../services/phoneService';

const STORAGE_KEY = 'onboarding_step';
const TOTAL_STEPS = 3;

// 10 fixed colors — must match the server's ALLOWED_COLORS set
const MEMBER_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

interface OnboardingFlowProps {
    userName: string;
    onComplete: () => void;
    twilioPhoneNumber?: string | null;
    twilioJoinCode?: string | null;
}

// ── Step indicator ───────────────────────────────────────────────────────────

const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
    <div className="flex items-center justify-center gap-2" data-testid="onboarding-step-dots">
        {Array.from({ length: total }).map((_, i) => (
            <div
                key={i}
                data-testid={`onboarding-dot-${i}`}
                data-active={i === current ? 'true' : 'false'}
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
    'data-testid'?: string;
    children: React.ReactNode;
}> = ({ onClick, disabled, loading, 'data-testid': testId, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        data-testid={testId}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
    >
        {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
            children
        )}
    </button>
);

// ── Shared footer (Back / Skip / Continue) ───────────────────────────────────

const StepFooter: React.FC<{
    onBack: () => void;
    onContinue: () => void;
    onSkip: () => void;
    saving?: boolean;
    skipLabel?: string;
    isFirst?: boolean;
}> = ({ onBack, onContinue, onSkip, saving, skipLabel, isFirst }) => (
    <div className="flex items-center justify-between pt-2">
        <button
            type="button"
            onClick={onBack}
            data-testid="onboarding-back"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            style={{ visibility: isFirst ? 'hidden' : undefined }}
        >
            Back
        </button>
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onSkip}
                data-testid="onboarding-skip-step"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
                {skipLabel ?? 'Skip'}
            </button>
            <PrimaryButton onClick={onContinue} loading={saving} data-testid="onboarding-continue">
                Continue <ArrowRight className="w-4 h-4" />
            </PrimaryButton>
        </div>
    </div>
);

// ── Step 0: Family Members ───────────────────────────────────────────────────

interface AddedMember {
    id: string;
    name: string;
    color: string;
}

const FamilyMembersStep: React.FC<{
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
}> = ({ onNext, onBack, onSkip }) => {
    const [members, setMembers] = useState<AddedMember[]>([]);
    const [name, setName] = useState('');
    const [color, setColor] = useState(MEMBER_COLORS[0]);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!name.trim()) {
            setError('Please enter a name');
            return;
        }
        setAdding(true);
        setError(null);
        try {
            const member = await familyMemberService.create({ name: name.trim(), color });
            setMembers((prev) => [...prev, member]);
            setName('');
            // Auto-advance to next color for convenience
            const idx = MEMBER_COLORS.indexOf(color);
            setColor(MEMBER_COLORS[(idx + 1) % MEMBER_COLORS.length]);
        } catch {
            setError('Could not add family member. Try again or skip for now.');
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
        <div className="flex flex-col" data-testid="onboarding-step-1">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Who's in your family?</h2>
                    <p className="text-sm text-gray-500">Add household members to tag events and filter your calendar.</p>
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3" data-testid="onboarding-member-error">
                    {error}
                </p>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
                <input
                    type="text"
                    placeholder="Name (e.g. Sarah)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={adding}
                    data-testid="onboarding-member-name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                {/* Color swatches */}
                <div className="flex gap-2 flex-wrap">
                    {MEMBER_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            aria-label={`Select color ${c}`}
                            data-testid={`onboarding-member-color-${c.replace('#', '')}`}
                            className={`w-7 h-7 rounded-full transition-all ${
                                color === c
                                    ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                                    : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !name.trim()}
                    data-testid="onboarding-member-add"
                    className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                >
                    {adding ? 'Adding…' : '+ Add'}
                </button>
            </div>

            {members.length > 0 && (
                <div className="mb-4 space-y-2" data-testid="onboarding-members-list">
                    {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                            <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: m.color }}
                            />
                            <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        </div>
                    ))}
                </div>
            )}

            <StepFooter
                onBack={onBack}
                onContinue={onNext}
                onSkip={onSkip}
                skipLabel={members.length === 0 ? 'Skip for now' : undefined}
            />
        </div>
    );
};

// ── Step 1: WhatsApp setup ────────────────────────────────────────────────────

const WhatsAppStep: React.FC<{
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    twilioPhoneNumber?: string | null;
    twilioJoinCode?: string | null;
}> = ({ onNext, onBack, onSkip, twilioPhoneNumber, twilioJoinCode }) => {
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [linked, setLinked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!phone.trim()) {
            setError('Please enter a phone number');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await phoneService.save(phone.trim());
            setLinked(true);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message :
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save phone number. Try again.';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    // Build the WhatsApp deep link if we have the Twilio number + join code
    const waNumber = twilioPhoneNumber?.replace(/\D/g, '');
    const waLink = waNumber && twilioJoinCode
        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(twilioJoinCode)}`
        : null;

    return (
        <div className="flex flex-col" data-testid="onboarding-step-whatsapp">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Get updates on WhatsApp</h2>
                    <p className="text-sm text-gray-500">Text your calendar — add events, check your schedule, get reminders.</p>
                </div>
            </div>

            {!linked ? (
                <>
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                            {error}
                        </p>
                    )}
                    <div className="mb-5">
                        <input
                            type="tel"
                            placeholder="+12125551234"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={saving}
                            data-testid="onboarding-phone-input"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300 mb-2"
                        />
                        <p className="text-xs text-gray-400 ml-1">Enter your number in international format (e.g. +1 for US/Canada)</p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={onBack}
                            data-testid="onboarding-back"
                            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Back
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onSkip}
                                data-testid="onboarding-skip-step"
                                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Skip for now
                            </button>
                            <PrimaryButton
                                onClick={handleSave}
                                loading={saving}
                                disabled={!phone.trim()}
                                data-testid="onboarding-phone-save"
                            >
                                Save
                            </PrimaryButton>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3" data-testid="onboarding-phone-linked">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-green-800">Phone linked!</p>
                            {twilioPhoneNumber && (
                                <p className="text-green-700">
                                    Save <span className="font-semibold">{twilioPhoneNumber}</span> as <span className="font-semibold">"FamCal"</span> in your contacts.
                                </p>
                            )}
                            {twilioJoinCode ? (
                                <p className="text-green-700">
                                    Then send <span className="font-semibold">{twilioJoinCode}</span> to that number on WhatsApp to activate.
                                    {waLink && (
                                        <>
                                            {' '}
                                            <a
                                                href={waLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline font-medium"
                                            >
                                                Open WhatsApp
                                            </a>
                                        </>
                                    )}
                                </p>
                            ) : (
                                <p className="text-green-700">Then send any message to that number on WhatsApp to start.</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onBack}
                            data-testid="onboarding-back"
                            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Back
                        </button>
                        <PrimaryButton onClick={onNext} data-testid="onboarding-continue">
                            Continue <ArrowRight className="w-4 h-4" />
                        </PrimaryButton>
                    </div>
                </>
            )}
        </div>
    );
};

// ── Step 2: Try It ───────────────────────────────────────────────────────────

const TryItStep: React.FC<{
    onFinish: () => void;
    onBack: () => void;
    isFirst?: boolean;
}> = ({ onFinish, onBack, isFirst }) => {
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
        <div className="flex flex-col" data-testid="onboarding-step-4">
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
                            data-testid="onboarding-nlp-input"
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            placeholder="Add dentist appointment on Thursday at 10am"
                        />
                        <button
                            type="button"
                            onClick={handleTry}
                            disabled={status === 'loading' || !input.trim()}
                            data-testid="onboarding-nlp-send"
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
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3" data-testid="onboarding-nlp-success">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-green-800">Event created!</p>
                        <p className="text-sm text-green-700 mt-0.5">{message}</p>
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl" data-testid="onboarding-nlp-error">
                    <p className="text-sm text-amber-800">{message}</p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    data-testid="onboarding-back"
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    style={{ visibility: isFirst ? 'hidden' : undefined }}
                >
                    Back
                </button>
                <PrimaryButton onClick={onFinish} data-testid="onboarding-finish">
                    {isFirst
                        ? (status === 'success' ? 'Continue' : 'Skip for now')
                        : (status === 'success' ? 'Go to my calendar' : 'Skip, go to calendar')
                    }{' '}
                    <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
            </div>
        </div>
    );
};

// ── Main orchestrator ────────────────────────────────────────────────────────

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userName, onComplete, twilioPhoneNumber, twilioJoinCode }) => {
    const [step, setStep] = useState<number>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? parseInt(saved, 10) : 0;
        return isNaN(parsed) || parsed < 0 || parsed >= TOTAL_STEPS ? 0 : parsed;
    });
    const [completing, setCompleting] = useState(false);

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
                return <TryItStep onFinish={goNext} onBack={goBack} isFirst />;
            case 1:
                return <FamilyMembersStep onNext={goNext} onBack={goBack} onSkip={goNext} />;
            case 2:
                return (
                    <WhatsAppStep
                        onNext={markComplete}
                        onBack={goBack}
                        onSkip={markComplete}
                        twilioPhoneNumber={twilioPhoneNumber}
                        twilioJoinCode={twilioJoinCode}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
            data-testid="onboarding-overlay"
        >
            <div
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8"
                data-testid="onboarding-card"
            >
                <button
                    type="button"
                    onClick={markComplete}
                    disabled={completing}
                    aria-label="Skip setup"
                    data-testid="onboarding-close"
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="mb-6">
                    <StepDots current={step} total={TOTAL_STEPS} />
                </div>

                {renderStep()}
            </div>
        </div>
    );
};

export default OnboardingFlow;
