import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Drawer } from 'vaul';
import { ArrowUp, Camera, Mic, MicOff, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import moment from 'moment';
import eventService, { Event, EventInput, NLPCommandResponse, ParsedFlyerEvent } from '../services/eventService';
import { FamilyMember } from '../services/familyMemberService';
import FlyerImportSheet from './FlyerImportSheet';
import { getEventIcon } from '../utils/eventIcons';
import { NLP_SUGGESTIONS, SUGGESTION_INTERVAL_MS } from '../utils/nlpSuggestions';
import { useMediaQuery } from '../hooks/useMediaQuery';

// ── Web Speech API type shims ────────────────────────────────────────────────

interface SpeechRecognitionEvent extends globalThis.Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends globalThis.Event {
    error: string;
    message: string;
}
interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}
interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
    length: number;
}
interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
}
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    events?: Event[];
    candidates?: Event[];
    pendingChanges?: Partial<EventInput>;
    requiresDisambiguation?: boolean;
    intent?: string;
    isError?: boolean;
}

interface ChatPanelProps {
    onEventsChanged: (event?: Event) => void;
    onEventSelect: (event: Event) => void;
    familyMembers?: FamilyMember[];
}

// ── Event card helpers ────────────────────────────────────────────────────────

interface EventColors { strip: string; bg: string; icon: string; }

function getEventColors(title: string): EventColors {
    const t = title.toLowerCase();
    if (['soccer','football','basketball','tennis','swimming','sport','game','match',
         'tournament','practice','training','volleyball','workout','gym','fitness',
         'yoga','cycling','hiking','run','swim'].some(k => t.includes(k)))
        return { strip: 'bg-amber-400', bg: 'bg-amber-50', icon: 'text-amber-500' };
    if (['doctor','medical','dentist','hospital','clinic','appointment','checkup',
         'health','medicine','pharmacy'].some(k => t.includes(k)))
        return { strip: 'bg-red-400', bg: 'bg-red-50', icon: 'text-red-500' };
    if (['work','office','meeting','interview','conference','business','client',
         'project','deadline','call','zoom','webinar'].some(k => t.includes(k)))
        return { strip: 'bg-blue-400', bg: 'bg-blue-50', icon: 'text-blue-500' };
    if (['birthday','party','celebration','concert','anniversary','wedding',
         'graduation','festival'].some(k => t.includes(k)))
        return { strip: 'bg-purple-400', bg: 'bg-purple-50', icon: 'text-purple-500' };
    if (['dinner','lunch','breakfast','restaurant','coffee','drinks','brunch',
         'food','cafe','bar'].some(k => t.includes(k)))
        return { strip: 'bg-orange-400', bg: 'bg-orange-50', icon: 'text-orange-500' };
    if (['travel','trip','flight','airport','vacation','journey'].some(k => t.includes(k)))
        return { strip: 'bg-teal-400', bg: 'bg-teal-50', icon: 'text-teal-500' };
    if (['school','class','study','exam','library','course','lecture','seminar',
         'workshop'].some(k => t.includes(k)))
        return { strip: 'bg-green-400', bg: 'bg-green-50', icon: 'text-green-500' };
    return { strip: 'bg-indigo-400', bg: 'bg-indigo-50', icon: 'text-indigo-500' };
}

function formatDuration(start: Date | string, end: Date | string): string {
    const mins = moment(end).diff(moment(start), 'minutes');
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function groupEventsByDate(events: Event[]): { label: string; events: Event[] }[] {
    const groups = new Map<string, Event[]>();
    for (const e of events) {
        const key = moment(e.startTime).format('YYYY-MM-DD');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(e);
    }
    const today = moment().startOf('day');
    return Array.from(groups.entries()).map(([key, evts]) => {
        const diff = moment(key).diff(today, 'days');
        const label = diff === 0 ? 'Today'
            : diff === 1 ? 'Tomorrow'
            : diff === -1 ? 'Yesterday'
            : moment(key).format('ddd, MMM D');
        return { label, events: evts };
    });
}

// ── ChatEventCard ─────────────────────────────────────────────────────────────

const ChatEventCard: React.FC<{ event: Event; onClick: () => void; dimmed?: boolean }> = ({
    event, onClick, dimmed = false,
}) => {
    const EventIcon = getEventIcon(event.title);
    const colors = getEventColors(event.title);
    const timeStr = event.isAllDay ? 'All day' : moment(event.startTime).format('h:mm A');
    const duration = event.isAllDay ? '' : formatDuration(event.startTime, event.endTime);

    return (
        <div
            onClick={onClick}
            className={`flex items-stretch rounded-xl overflow-hidden border cursor-pointer
                        group transition-all hover:shadow-sm active:scale-[0.99]
                        ${dimmed ? 'border-amber-200' : 'border-gray-200'}`}
        >
            <div className={`w-1 shrink-0 ${colors.strip}`} />
            <div className={`flex-1 min-w-0 px-3 py-2.5 ${colors.bg}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <EventIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${colors.icon}`} />
                        <span className="font-semibold text-gray-900 text-sm truncate leading-snug">
                            {event.title}
                        </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-5">
                    {timeStr}
                    {duration && <span className="text-gray-400"> · {duration}</span>}
                </p>
                {event.location && (
                    <p className="text-xs text-gray-400 mt-0.5 ml-5 truncate">📍 {event.location}</p>
                )}
                {event.familyMembers && event.familyMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
                        {event.familyMembers.map(m => (
                            <span key={m.id} className="text-xs bg-white/70 border border-gray-200 rounded-full px-2 py-0.5 text-gray-600 leading-none">
                                {m.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── MessageBubble ─────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{
    msg: ChatMessage;
    onCandidateSelect: (candidateId: string, msg: ChatMessage) => void;
    onEventCardClick: (event: Event) => void;
}> = ({ msg, onCandidateSelect, onEventCardClick }) => {
    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] bg-indigo-500 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-snug">
                    {msg.text}
                </div>
            </div>
        );
    }

    const hasCards = (msg.events && msg.events.length > 0) || (msg.candidates && msg.candidates.length > 0);

    return (
        <div className="flex justify-start">
            <div className="w-full min-w-0">
                {/* Text bubble */}
                <div className={`inline-flex items-start gap-2 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-snug max-w-[90%] ${
                    msg.isError ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-800'
                }`}>
                    {msg.isError
                        ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                        : !hasCards
                            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
                            : null
                    }
                    <span>{msg.text}</span>
                </div>

                {/* Disambiguation cards */}
                {msg.requiresDisambiguation && msg.candidates && msg.candidates.length > 0 && (
                    <div className="mt-2">
                        <p className="text-xs text-amber-600 font-medium mb-1.5 ml-1">Which event did you mean?</p>
                        <div className="space-y-1.5">
                            {msg.candidates.map(c => (
                                <ChatEventCard key={c.id} event={c} onClick={() => onCandidateSelect(c.id, msg)} dimmed />
                            ))}
                        </div>
                    </div>
                )}

                {/* Query result cards grouped by date */}
                {!msg.requiresDisambiguation && msg.events && msg.events.length > 0 && (
                    <div className="mt-2 space-y-3">
                        {groupEventsByDate(msg.events).map(group => (
                            <div key={group.label}>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 ml-1">
                                    {group.label}
                                </p>
                                <div className="space-y-1.5">
                                    {group.events.map(e => (
                                        <ChatEventCard key={e.id} event={e} onClick={() => onEventCardClick(e)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
            <span className="text-2xl">🗓️</span>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Your AI calendar</p>
        <p className="text-xs text-gray-400 leading-relaxed">
            Add events, search your schedule, or ask questions in plain English.
        </p>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const ChatPanel: React.FC<ChatPanelProps> = ({ onEventsChanged, onEventSelect, familyMembers = [] }) => {
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    // ── Message thread ───────────────────────────────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Input state ──────────────────────────────────────────────────────────
    const [inputText, setInputText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const [placeholderIdx, setPlaceholderIdx] = useState(0);

    // ── Flyer import state ───────────────────────────────────────────────────
    const [isParsingImage, setIsParsingImage] = useState(false);
    const [flyerParsedEvents, setFlyerParsedEvents] = useState<ParsedFlyerEvent[]>([]);
    const [flyerPreviewUrl, setFlyerPreviewUrl] = useState<string | undefined>(undefined);
    const [isFlyerSheetOpen, setIsFlyerSheetOpen] = useState(false);
    const [isCreatingFlyerEvents, setIsCreatingFlyerEvents] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Mobile drawer snap state ─────────────────────────────────────────────
    const [snap, setSnap] = useState<number | string>('120px');
    const handleSnapChange = useCallback((s: number | string | null) => {
        if (s !== null) setSnap(s);
    }, []);

    // Revoke object URL on change / unmount
    useEffect(() => {
        return () => {
            if (flyerPreviewUrl) URL.revokeObjectURL(flyerPreviewUrl);
        };
    }, [flyerPreviewUrl]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const addMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setMessages(prev => [...prev, { ...msg, id }]);
        return id;
    }, []);

    const showError = useCallback((text: string) => {
        addMessage({ role: 'assistant', text, isError: true });
    }, [addMessage]);

    // ── Flyer handlers ───────────────────────────────────────────────────────

    const handleFlyerSheetClose = useCallback(() => {
        setIsFlyerSheetOpen(false);
        setFlyerPreviewUrl(undefined);
        setFlyerParsedEvents([]);
    }, []);

    const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const previewUrl = URL.createObjectURL(file);
        setFlyerPreviewUrl(previewUrl);
        setIsParsingImage(true);

        try {
            const { events } = await eventService.parseFromImage(file);
            setFlyerParsedEvents(events);
            setIsFlyerSheetOpen(true);
        } catch (err) {
            URL.revokeObjectURL(previewUrl);
            setFlyerPreviewUrl(undefined);
            showError(err instanceof Error ? err.message : 'Failed to parse image');
        } finally {
            setIsParsingImage(false);
        }
    }, [showError]);

    const handleFlyerConfirm = useCallback(async (selectedEvents: ParsedFlyerEvent[]) => {
        setIsCreatingFlyerEvents(true);
        try {
            await Promise.all(selectedEvents.map(evt => {
                const familyMemberIds = (evt.familyMemberNames ?? [])
                    .map(name =>
                        familyMembers.find(fm => fm.name.toLowerCase() === name.toLowerCase())?.id
                    )
                    .filter((id): id is string => !!id);

                return eventService.create({
                    title: evt.title,
                    startTime: evt.startTime,
                    endTime: evt.endTime,
                    isAllDay: evt.isAllDay,
                    location: evt.location,
                    familyMemberIds: familyMemberIds.length > 0 ? familyMemberIds : undefined,
                });
            }));

            const count = selectedEvents.length;
            setIsFlyerSheetOpen(false);
            setFlyerParsedEvents([]);
            setFlyerPreviewUrl(undefined);
            addMessage({
                role: 'assistant',
                text: `Added ${count} event${count === 1 ? '' : 's'} from flyer`,
            });
            onEventsChanged();
        } catch (err) {
            onEventsChanged();
            showError(err instanceof Error ? err.message : 'Some events could not be added');
        } finally {
            setIsCreatingFlyerEvents(false);
        }
    }, [familyMembers, showError, addMessage, onEventsChanged]);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(async (overrideText?: string) => {
        const text = (overrideText ?? inputText).trim();
        if (!text) return;

        setInputText('');
        setInterimText('');
        setIsLoading(true);

        // Push user message immediately
        addMessage({ role: 'user', text });

        // Auto-expand mobile drawer
        if (!isDesktop) {
            setSnap(0.6);
        }

        try {
            const result: NLPCommandResponse = await eventService.nlpCommand(text);

            if (result.requiresDisambiguation) {
                addMessage({
                    role: 'assistant',
                    text: result.message,
                    candidates: result.candidates,
                    pendingChanges: result.pendingChanges,
                    requiresDisambiguation: true,
                    intent: result.intent,
                });
            } else if (result.intent === 'query' && (result.events ?? []).length > 0) {
                addMessage({
                    role: 'assistant',
                    text: result.message,
                    events: result.events,
                    intent: result.intent,
                });
            } else {
                addMessage({
                    role: 'assistant',
                    text: result.message,
                    intent: result.intent,
                });
                if (result.intent === 'create' || result.intent === 'update') {
                    onEventsChanged(result.event);
                } else if (result.intent === 'delete') {
                    onEventsChanged();
                }
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to process command');
        } finally {
            setIsLoading(false);
        }
    }, [inputText, isDesktop, addMessage, onEventsChanged, showError]);

    // Stable ref so voice callbacks always call the latest version
    const handleSubmitRef = useRef(handleSubmit);
    handleSubmitRef.current = handleSubmit;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // ── Disambiguation: user picks a candidate ────────────────────────────────

    const handleCandidateSelect = useCallback(async (candidateId: string, sourceMsg: ChatMessage) => {
        setIsLoading(true);
        try {
            if (sourceMsg.intent === 'update' && sourceMsg.pendingChanges) {
                const updated = await eventService.update(candidateId, sourceMsg.pendingChanges);
                addMessage({ role: 'assistant', text: `Updated "${updated.title}"` });
                onEventsChanged(updated);
            } else if (sourceMsg.intent === 'delete') {
                const candidate = sourceMsg.candidates?.find(c => c.id === candidateId);
                await eventService.delete(candidateId);
                addMessage({ role: 'assistant', text: `Deleted "${candidate?.title ?? 'event'}"` });
                onEventsChanged();
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setIsLoading(false);
        }
    }, [addMessage, onEventsChanged, showError]);

    // ── Query event card click ────────────────────────────────────────────────

    const handleEventCardClick = useCallback((event: Event) => {
        onEventSelect(event);
    }, [onEventSelect]);

    // ── Clear session ─────────────────────────────────────────────────────────

    const handleClearSession = useCallback(async () => {
        setMessages([]);
        setSnap('120px');
        eventService.clearConversationSession().catch(() => {});
    }, []);

    // ── Web Speech API fallback setup ─────────────────────────────────────────

    useEffect(() => {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (e: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalTranscript += e.results[i][0].transcript;
                } else {
                    interimTranscript += e.results[i][0].transcript;
                }
            }
            if (interimTranscript) setInterimText(interimTranscript);
            if (finalTranscript) {
                setInterimText('');
                setIsListening(false);
                handleSubmitRef.current(finalTranscript);
            }
        };
        rec.onerror = () => {
            showError('Voice recognition failed. Please try again.');
            setIsListening(false);
            setInterimText('');
        };
        rec.onend = () => {
            setIsListening(false);
            setInterimText('');
        };
        setRecognition(rec);
        return () => { rec.abort(); };
    // handleSubmitRef is a stable ref — intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showError]);

    // ── Whisper via MediaRecorder ─────────────────────────────────────────────

    const startWhisperRecording = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            mediaRecorderRef.current = null;
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            setIsListening(false);
            setIsUploading(true);
            try {
                const transcript = await eventService.transcribeAudio(blob);
                if (transcript.trim()) {
                    handleSubmitRef.current(transcript.trim());
                } else {
                    showError('No speech detected. Please try again.');
                }
            } catch {
                showError('Transcription failed. Please try again.');
            } finally {
                setIsUploading(false);
            }
        };

        recorder.start();
        setIsListening(true);
    }, [showError]);

    const toggleListening = useCallback(async () => {
        if (isListening) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            } else if (recognition) {
                recognition.stop();
            }
            return;
        }

        setInterimText('');

        if (navigator.mediaDevices) {
            try {
                await startWhisperRecording();
                return;
            } catch {
                // fall through to Web Speech
            }
        }

        if (!recognition) {
            showError('Voice input is not supported in your browser.');
            return;
        }
        recognition.start();
        setIsListening(true);
    }, [isListening, recognition, startWhisperRecording, showError]);

    // ── Alt+V keyboard shortcut ───────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.altKey && e.key === 'v') {
                e.preventDefault();
                void toggleListening();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleListening]);

    // ── Placeholder rotation ──────────────────────────────────────────────────

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIdx(prev => (prev + 1) % NLP_SUGGESTIONS.length);
        }, SUGGESTION_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    // ── Input bar (shared between desktop and mobile) ─────────────────────────

    const renderInputBar = () => (
        <div className="bg-indigo-50 border-t border-indigo-200 px-3 py-3 shrink-0">
            <div className={`flex items-center bg-white rounded-xl border shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-indigo-400 ${
                isListening ? 'border-red-300' : 'border-indigo-200'
            }`}>
                <label htmlFor="chat-panel-input" className="sr-only">
                    Describe what you want to do
                </label>
                <input
                    id="chat-panel-input"
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        interimText
                            ? interimText
                            : NLP_SUGGESTIONS[placeholderIdx]
                    }
                    className={`flex-1 min-w-0 px-4 py-3 bg-transparent border-none outline-none text-sm truncate ${
                        interimText ? 'placeholder-gray-400 italic' : 'placeholder-gray-400'
                    }`}
                    disabled={isLoading}
                />
                <div className="flex items-center gap-0.5 pr-2 shrink-0">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsingImage || isLoading}
                        aria-label="Scan a flyer or schedule"
                        title="Scan a flyer or photo to import events"
                        className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isParsingImage
                                ? 'text-indigo-500 animate-pulse'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Camera size={18} />
                    </button>
                    <button
                        onClick={() => void toggleListening()}
                        disabled={isUploading}
                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                        title={isListening ? 'Stop listening' : 'Start voice input (Alt+V)'}
                        className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isListening
                                ? 'text-red-500 animate-pulse'
                                : isUploading
                                    ? 'text-amber-500'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <button
                        onClick={() => handleSubmit()}
                        disabled={isLoading || !inputText.trim()}
                        aria-label="Send"
                        title="Send"
                        className="p-1.5 ml-0.5 text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading
                            ? <span className="block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <ArrowUp size={18} />
                        }
                    </button>
                </div>
            </div>

            {/* Status labels */}
            {isParsingImage && (
                <p className="mt-1.5 text-xs text-indigo-500 animate-pulse">Scanning image…</p>
            )}
            {isListening && (
                <p className="mt-1.5 text-xs text-red-500 animate-pulse">Listening…</p>
            )}
            {isUploading && (
                <p className="mt-1.5 text-xs text-amber-600 animate-pulse">Transcribing…</p>
            )}
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageSelect}
                aria-hidden="true"
            />

            {/* Flyer import sheet */}
            <FlyerImportSheet
                isOpen={isFlyerSheetOpen}
                onClose={handleFlyerSheetClose}
                parsedEvents={flyerParsedEvents}
                familyMembers={familyMembers}
                onConfirm={handleFlyerConfirm}
                isCreating={isCreatingFlyerEvents}
                imagePreviewUrl={flyerPreviewUrl}
            />

            {/* ── Desktop sidebar ── */}
            {isDesktop ? (
                <div className="w-[340px] border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                        <span className="text-sm font-semibold text-gray-700">Ask famcal.ai</span>
                        {messages.length > 0 && (
                            <button
                                onClick={handleClearSession}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                title="Start a new conversation"
                            >
                                New chat
                            </button>
                        )}
                    </div>

                    {/* Thread */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                        {messages.length === 0 ? (
                            <EmptyState />
                        ) : (
                            messages.map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    onCandidateSelect={handleCandidateSelect}
                                    onEventCardClick={handleEventCardClick}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    {renderInputBar()}
                </div>
            ) : (
                /* ── Mobile vaul drawer ── */
                <Drawer.Root
                    open={true}
                    modal={false}
                    snapPoints={['120px', 0.6]}
                    activeSnapPoint={snap}
                    setActiveSnapPoint={handleSnapChange}
                >
                    <Drawer.Portal>
                        <Drawer.Content
                            className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl flex flex-col shadow-2xl z-40 outline-none"
                            style={{ maxHeight: '80vh' }}
                        >
                            {/* Drag handle */}
                            <div className="mx-auto mt-2 mb-1 w-10 h-1 rounded-full bg-gray-300 shrink-0" />

                            {/* Thread — only visible when expanded */}
                            {snap === 0.6 && (
                                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                                    {messages.length === 0 ? (
                                        <EmptyState />
                                    ) : (
                                        messages.map(msg => (
                                            <MessageBubble
                                                key={msg.id}
                                                msg={msg}
                                                onCandidateSelect={handleCandidateSelect}
                                                onEventCardClick={handleEventCardClick}
                                            />
                                        ))
                                    )}
                                    {messages.length > 0 && (
                                        <div className="flex justify-center pt-1">
                                            <button
                                                onClick={handleClearSession}
                                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                New chat
                                            </button>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}

                            {/* Input — always visible */}
                            {renderInputBar()}
                        </Drawer.Content>
                    </Drawer.Portal>
                </Drawer.Root>
            )}
        </>
    );
};

export default ChatPanel;
