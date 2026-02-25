import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, Camera, Mic, MicOff, X, ChevronRight } from 'lucide-react';
import moment from 'moment';
import eventService, { Event, NLPCommandResponse, ParsedFlyerEvent } from '../services/eventService';
import { FamilyMember } from '../services/familyMemberService';
import FlyerImportSheet from './FlyerImportSheet';
import { getEventIcon } from '../utils/eventIcons';
import { getUserTimezone } from '../utils/timezone';

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

// ── Props ────────────────────────────────────────────────────────────────────

interface NLPInputProps {
    /** Called after create/update/delete so the calendar can refresh. */
    onEventsChanged: (event?: Event) => void;
    /** Called when user taps an event card — calendar navigates + EventForm opens. */
    onEventSelect: (event: Event) => void;
    /** Family members used to resolve names extracted from flyer images. */
    familyMembers?: FamilyMember[];
    className?: string;
}

// ── EventCard used inside the results tray ───────────────────────────────────

const TrayEventCard: React.FC<{ event: Event; onClick: () => void }> = ({ event, onClick }) => {
    const EventIcon = getEventIcon(event.title);
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0 group transition-colors"
        >
            {/* Time */}
            <div className="flex flex-col items-center w-10 shrink-0">
                <span className="text-sm font-bold text-blue-600 leading-tight">
                    {moment(event.startTime).format('h:mm')}
                </span>
                <span className="text-xs text-gray-400">
                    {moment(event.startTime).format('A')}
                </span>
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <EventIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900 text-sm truncate">{event.title}</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5 truncate">
                    {moment(event.startTime).format('MMM D')}
                    {event.location ? ` · ${event.location}` : ''}
                </div>
            </div>
            {/* Arrow affordance */}
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
        </div>
    );
};

// ── Component ────────────────────────────────────────────────────────────────

const NLPInput: React.FC<NLPInputProps> = ({ onEventsChanged, onEventSelect, familyMembers = [], className }) => {
    const [inputText, setInputText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    // ── Flyer import state ───────────────────────────────────────────────────
    const [isParsingImage, setIsParsingImage] = useState(false);
    const [flyerParsedEvents, setFlyerParsedEvents] = useState<ParsedFlyerEvent[]>([]);
    const [flyerPreviewUrl, setFlyerPreviewUrl] = useState<string | undefined>(undefined);
    const [isFlyerSheetOpen, setIsFlyerSheetOpen] = useState(false);
    const [isCreatingFlyerEvents, setIsCreatingFlyerEvents] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Revoke the image object URL when it changes or the component unmounts
    useEffect(() => {
        return () => {
            if (flyerPreviewUrl) URL.revokeObjectURL(flyerPreviewUrl);
        };
    }, [flyerPreviewUrl]);

    // Tray: shown for query results and disambiguation
    const [tray, setTray] = useState<NLPCommandResponse | null>(null);

    // Toast: 2.5s auto-dismiss for mutation confirmations
    const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Toast ────────────────────────────────────────────────────────────────

    const fireToast = useCallback((message: string, isError = false) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, isError });
        toastTimer.current = setTimeout(() => setToast(null), 2500);
    }, []);

    // ── Flyer handlers ───────────────────────────────────────────────────────

    const handleFlyerSheetClose = useCallback(() => {
        setIsFlyerSheetOpen(false);
        setFlyerPreviewUrl(undefined); // triggers useEffect cleanup to revoke the object URL
        setFlyerParsedEvents([]);
    }, []);

    const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset so selecting the same file again re-triggers onChange
        e.target.value = '';

        const previewUrl = URL.createObjectURL(file);
        setFlyerPreviewUrl(previewUrl);
        setIsParsingImage(true);
        setTray(null);
        setToast(null);

        try {
            const { events } = await eventService.parseFromImage(file);
            setFlyerParsedEvents(events);
            setIsFlyerSheetOpen(true);
        } catch (err) {
            URL.revokeObjectURL(previewUrl);
            setFlyerPreviewUrl(undefined);
            fireToast(err instanceof Error ? err.message : 'Failed to parse image', true);
        } finally {
            setIsParsingImage(false);
        }
    }, [fireToast]);

    const handleFlyerConfirm = useCallback(async (selectedEvents: ParsedFlyerEvent[]) => {
        setIsCreatingFlyerEvents(true);
        try {
            await Promise.all(selectedEvents.map(evt => {
                // Resolve family member names to IDs using the prop list
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
            setFlyerPreviewUrl(undefined); // triggers useEffect cleanup to revoke the object URL
            fireToast(`Added ${count} event${count === 1 ? '' : 's'}`);
            onEventsChanged();
        } catch (err) {
            // Some events may have been created before the failure — refresh calendar so
            // they appear, then surface the error.
            onEventsChanged();
            fireToast(err instanceof Error ? err.message : 'Some events could not be added', true);
        } finally {
            setIsCreatingFlyerEvents(false);
        }
    }, [familyMembers, flyerPreviewUrl, fireToast, onEventsChanged]);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(async (overrideText?: string) => {
        const text = (overrideText ?? inputText).trim();
        if (!text) return;

        setIsLoading(true);
        setTray(null);
        setToast(null);
        setInterimText('');

        try {
            const result = await eventService.nlpCommand(text);
            setInputText('');

            if (result.intent === 'query') {
                setTray(result);
            } else if (result.requiresDisambiguation) {
                setTray(result);
            } else {
                // Mutation: toast + refresh calendar
                fireToast(result.message);
                if (result.intent === 'create' || result.intent === 'update') {
                    onEventsChanged(result.event);
                } else {
                    onEventsChanged();
                }
            }
        } catch (err) {
            fireToast(err instanceof Error ? err.message : 'Failed to process command', true);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, onEventsChanged, fireToast]);

    // Stable ref so voice callbacks always call the latest version without re-registering handlers
    const handleSubmitRef = useRef(handleSubmit);
    handleSubmitRef.current = handleSubmit;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // ── Web Speech API fallback setup (created once) ─────────────────────────

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
            fireToast('Voice recognition failed. Please try again.', true);
            setIsListening(false);
            setInterimText('');
        };
        rec.onend = () => {
            setIsListening(false);
            setInterimText('');
        };
        setRecognition(rec);
        return () => { rec.abort(); };
    // handleSubmitRef is a stable ref — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fireToast]);

    // ── Primary: Whisper via MediaRecorder ───────────────────────────────────

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
                    fireToast('No speech detected. Please try again.', true);
                }
            } catch {
                fireToast('Transcription failed. Please try again.', true);
            } finally {
                setIsUploading(false);
            }
        };

        recorder.start();
        setIsListening(true);
    }, [fireToast]);

    // ── toggleListening: Whisper primary, Web Speech fallback ────────────────

    const toggleListening = useCallback(async () => {
        if (isListening) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            } else if (recognition) {
                recognition.stop();
            }
            return;
        }

        setTray(null);
        setToast(null);
        setInterimText('');

        // Primary: MediaRecorder + Whisper
        if (navigator.mediaDevices) {
            try {
                await startWhisperRecording();
                return;
            } catch {
                // Permission denied or not available — fall through to Web Speech
            }
        }

        // Fallback: Web Speech API (with interim text support)
        if (!recognition) {
            fireToast('Voice input is not supported in your browser.', true);
            return;
        }
        recognition.start();
        setIsListening(true);
    }, [isListening, recognition, startWhisperRecording, fireToast]);

    // ── Alt+V keyboard shortcut ──────────────────────────────────────────────

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

    // ── Disambiguation: user picks a candidate ───────────────────────────────

    const handleCandidateSelect = useCallback(async (candidateId: string) => {
        if (!tray) return;
        setIsLoading(true);
        try {
            if (tray.intent === 'update' && tray.pendingChanges) {
                const updated = await eventService.update(candidateId, tray.pendingChanges);
                setTray(null);
                fireToast(`Updated "${updated.title}"`);
                onEventsChanged(updated);
            } else if (tray.intent === 'delete') {
                const candidate = tray.candidates?.find(c => c.id === candidateId);
                await eventService.delete(candidateId);
                setTray(null);
                fireToast(`Deleted "${candidate?.title ?? 'event'}"`);
                onEventsChanged();
            }
        } catch (err) {
            fireToast(err instanceof Error ? err.message : 'Action failed', true);
            setTray(null);
        } finally {
            setIsLoading(false);
        }
    }, [tray, onEventsChanged, fireToast]);

    // ── Query tray: clicking an event navigates + opens EventForm ────────────

    const handleEventCardClick = useCallback((event: Event) => {
        setTray(null);
        onEventSelect(event);
    }, [onEventSelect]);

    // ── Tray render ──────────────────────────────────────────────────────────

    const renderTray = () => {
        if (!tray) return null;

        // Disambiguation
        if (tray.requiresDisambiguation && tray.candidates) {
            return (
                <div className="border-t border-gray-200 bg-white max-h-[50vh] overflow-y-auto shadow-lg">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-100 bg-amber-50">
                        <span className="text-sm font-medium text-amber-800">
                            Which event did you mean?
                        </span>
                        <button
                            onClick={() => setTray(null)}
                            aria-label="Dismiss"
                            className="ml-3 shrink-0 text-amber-400 hover:text-amber-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    {tray.candidates.map(c => (
                        <TrayEventCard
                            key={c.id}
                            event={c}
                            onClick={() => handleCandidateSelect(c.id)}
                        />
                    ))}
                </div>
            );
        }

        // Query results
        if (tray.intent === 'query') {
            const events = tray.events ?? [];
            return (
                <div className="border-t border-gray-200 bg-white max-h-[50vh] overflow-y-auto shadow-lg">
                    <div className="flex items-start justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm text-gray-600 flex-1 pr-4 leading-snug">{tray.message}</p>
                        <button
                            onClick={() => setTray(null)}
                            aria-label="Dismiss results"
                            className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    {events.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-center text-gray-400">
                            No events found
                        </div>
                    ) : (
                        events.map(e => (
                            <TrayEventCard
                                key={e.id}
                                event={e}
                                onClick={() => handleEventCardClick(e)}
                            />
                        ))
                    )}
                </div>
            );
        }

        return null;
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={`relative ${className ?? ''}`}>
            {/* Results tray — absolutely positioned above the input bar, overlays calendar */}
            {tray && (
                <div className="absolute bottom-full left-0 right-0 z-50">
                    {renderTray()}
                </div>
            )}

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageSelect}
                aria-hidden="true"
            />

            {/* Flyer import confirmation sheet */}
            <FlyerImportSheet
                isOpen={isFlyerSheetOpen}
                onClose={handleFlyerSheetClose}
                parsedEvents={flyerParsedEvents}
                familyMembers={familyMembers}
                onConfirm={handleFlyerConfirm}
                isCreating={isCreatingFlyerEvents}
                imagePreviewUrl={flyerPreviewUrl}
            />

            {/* Input bar */}
            <div className="bg-indigo-50 border-t border-indigo-200 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.07)]">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-2">
                        <label htmlFor="nlp-event-input" className="sr-only">
                            Describe what you want to do
                        </label>
                        <div className="relative flex-1">
                            <input
                                id="nlp-event-input"
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    interimText
                                        ? interimText
                                        : 'Add, update, delete, or ask about events…'
                                }
                                className={`w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                                    interimText ? 'placeholder-gray-400 italic' : ''
                                }`}
                                disabled={isLoading}
                            />
                        </div>
                        {/* Camera button — opens image picker / camera */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isParsingImage || isLoading}
                            aria-label="Scan a flyer or schedule"
                            title="Scan a flyer or photo to import events"
                            className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isParsingImage
                                    ? 'bg-indigo-400 text-white animate-pulse'
                                    : 'bg-white hover:bg-indigo-100 text-gray-600 border border-indigo-200'
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
                                    ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-400 ring-offset-1 animate-pulse'
                                    : isUploading
                                        ? 'bg-amber-400 text-white'
                                        : 'bg-white hover:bg-indigo-100 text-gray-600 border border-indigo-200'
                            }`}
                        >
                            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            disabled={isLoading || !inputText.trim()}
                            aria-label="Send"
                            title="Send"
                            className="p-2 text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowUp size={18} />
                        </button>
                    </div>

                    {/* Listening / uploading / parsing status labels */}
                    {isParsingImage && (
                        <p className="mt-1.5 text-xs text-indigo-500 animate-pulse">
                            Scanning image…
                        </p>
                    )}
                    {isListening && (
                        <p className="mt-1.5 text-xs text-red-500 animate-pulse">
                            Listening…
                        </p>
                    )}
                    {isUploading && (
                        <p className="mt-1.5 text-xs text-amber-600 animate-pulse">
                            Transcribing…
                        </p>
                    )}

                    {/* Auto-dismiss toast */}
                    {toast && (
                        <p className={`mt-1.5 text-xs ${toast.isError ? 'text-red-600' : 'text-green-600'}`}>
                            {toast.isError ? toast.message : `✓ ${toast.message}`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NLPInput;
