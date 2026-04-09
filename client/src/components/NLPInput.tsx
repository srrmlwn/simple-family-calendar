import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, Paperclip, Mic, MicOff, X, ChevronRight } from 'lucide-react';
import moment from 'moment';
import eventService, { Event, NLPCommandResponse, ParsedFlyerEvent } from '../services/eventService';
import { FamilyMember } from '../services/familyMemberService';
import FlyerImportSheet from './FlyerImportSheet';
import { getEventIcon } from '../utils/eventIcons';
import { getUserTimezone } from '../utils/timezone';
import { NLP_SUGGESTIONS, SUGGESTION_INTERVAL_MS } from '../utils/nlpSuggestions';

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
            className="flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors"
            style={{ borderBottom: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            <div className="flex flex-col items-center w-10 shrink-0">
                <span className="font-mono text-sm font-medium leading-tight" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                    {moment(event.startTime).format('h:mm')}
                </span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {moment(event.startTime).format('A')}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <EventIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-base)' }}>{event.title}</span>
                </div>
                <div className="text-xs mt-0.5 truncate font-mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {moment(event.startTime).format('MMM D')}
                    {event.location ? ` · ${event.location}` : ''}
                </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 transition-colors" style={{ color: 'var(--border-mid)' }} />
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

    const [placeholderIdx, setPlaceholderIdx] = useState(0);
    const dismissHintRef = useRef<() => void>(() => {});

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

    // Tray: shown for query results with event cards and disambiguation
    const [tray, setTray] = useState<NLPCommandResponse | null>(null);

    // Persistent message: last assistant response — cleared on next submit, not on a timer
    const [persistentMsg, setPersistentMsg] = useState<string | null>(null);

    // Error message: auto-dismisses after 6s
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Context pill: last user message, shown when a session is active
    const [lastUserMsg, setLastUserMsg] = useState<string | null>(null);

    // ── Error display (auto-dismiss) ─────────────────────────────────────────

    const showError = useCallback((message: string) => {
        if (errorTimer.current) clearTimeout(errorTimer.current);
        setErrorMsg(message);
        errorTimer.current = setTimeout(() => setErrorMsg(null), 6000);
    }, []);

    // ── Flyer handlers ───────────────────────────────────────────────────────

    const handleFlyerSheetClose = useCallback(() => {
        setIsFlyerSheetOpen(false);
        setFlyerPreviewUrl(undefined); // triggers useEffect cleanup to revoke the object URL
        setFlyerParsedEvents([]);
    }, []);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset so selecting the same file again re-triggers onChange
        e.target.value = '';

        // Only set a preview URL for images (PDFs/DOCX can't be shown as img src)
        const isImage = file.type.startsWith('image/');
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
        setFlyerPreviewUrl(previewUrl);
        setIsParsingImage(true);
        setTray(null);

        try {
            const { events } = await eventService.parseFromDocument(file);
            setFlyerParsedEvents(events);
            setIsFlyerSheetOpen(true);
        } catch (err) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setFlyerPreviewUrl(undefined);
            }
            showError(err instanceof Error ? err.message : 'Failed to parse file');
        } finally {
            setIsParsingImage(false);
        }
    }, [showError]);

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
            setPersistentMsg(`Added ${count} event${count === 1 ? '' : 's'}`);
            onEventsChanged();
        } catch (err) {
            // Some events may have been created before the failure — refresh calendar so
            // they appear, then surface the error.
            onEventsChanged();
            showError(err instanceof Error ? err.message : 'Some events could not be added');
        } finally {
            setIsCreatingFlyerEvents(false);
        }
    }, [familyMembers, flyerPreviewUrl, showError, onEventsChanged]);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(async (overrideText?: string) => {
        const text = (overrideText ?? inputText).trim();
        if (!text) return;

        setIsLoading(true);
        setTray(null);
        setPersistentMsg(null);
        setErrorMsg(null);
        setInterimText('');

        try {
            const result = await eventService.nlpCommand(text);
            setInputText('');
            dismissHintRef.current();
            setLastUserMsg(text);

            if (result.requiresDisambiguation) {
                // Disambiguation: show event cards in the tray
                setTray(result);
            } else if (result.intent === 'query' && (result.events ?? []).length > 0) {
                // Query with event cards: show in tray
                setTray(result);
            } else {
                // Text-only response (clarification, "nothing found", mutation confirm):
                // show persistently so the user can read and follow up
                setPersistentMsg(result.message);
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
    }, [inputText, onEventsChanged, showError]);

    // Stable ref so voice callbacks always call the latest version without re-registering handlers
    const handleSubmitRef = useRef(handleSubmit);
    handleSubmitRef.current = handleSubmit;

    const dismissHint = useCallback(() => {}, []);
    dismissHintRef.current = dismissHint;

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
    // handleSubmitRef is a stable ref — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showError]);

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
        setPersistentMsg(null);
        setInterimText('');

        // Primary: MediaRecorder + Whisper
        if (navigator.mediaDevices) {
            try {
                await startWhisperRecording();
                return;
            } catch (err) {
                // If mic permission was explicitly denied, tell the user clearly
                if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError')) {
                    showError('Microphone access denied. Allow microphone access in your browser, or type instead.');
                    return;
                }
                // Other errors (device not found, etc.) — fall through to Web Speech API
            }
        }

        // Fallback: Web Speech API (with interim text support)
        if (!recognition) {
            showError('Voice input is not supported in your browser.');
            return;
        }
        recognition.start();
        setIsListening(true);
    }, [isListening, recognition, startWhisperRecording, showError]);

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

    // ── Placeholder rotation ─────────────────────────────────────────────────

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIdx(prev => (prev + 1) % NLP_SUGGESTIONS.length);
        }, SUGGESTION_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    // ── Disambiguation: user picks a candidate ───────────────────────────────

    const handleCandidateSelect = useCallback(async (candidateId: string) => {
        if (!tray) return;
        setIsLoading(true);
        try {
            if (tray.intent === 'update' && tray.pendingChanges) {
                const updated = await eventService.update(candidateId, tray.pendingChanges);
                setTray(null);
                setPersistentMsg(`Updated "${updated.title}"`);
                onEventsChanged(updated);
            } else if (tray.intent === 'delete') {
                const candidate = tray.candidates?.find(c => c.id === candidateId);
                await eventService.delete(candidateId);
                setTray(null);
                setPersistentMsg(`Deleted "${candidate?.title ?? 'event'}"`);
                onEventsChanged();
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Action failed');
            setTray(null);
        } finally {
            setIsLoading(false);
        }
    }, [tray, onEventsChanged, showError]);

    // ── Query tray: clicking an event navigates + opens EventForm ────────────

    const handleEventCardClick = useCallback((event: Event) => {
        setTray(null);
        onEventSelect(event);
    }, [onEventSelect]);

    // ── Clear conversation session ────────────────────────────────────────────

    const handleClearSession = useCallback(async () => {
        setLastUserMsg(null);
        setPersistentMsg(null);
        setTray(null);
        eventService.clearConversationSession().catch(() => {});
    }, []);

    // ── Tray render ──────────────────────────────────────────────────────────

    const renderTray = () => {
        if (!tray) return null;

        const trayStyle: React.CSSProperties = {
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
            maxHeight: '50vh',
            overflowY: 'auto',
            boxShadow: '0 -4px 16px rgba(30,26,20,0.12)',
        };
        const headerStyle: React.CSSProperties = {
            borderBottom: '1px solid var(--border)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        };

        if (tray.requiresDisambiguation && tray.candidates) {
            return (
                <div style={trayStyle}>
                    <div style={{ ...headerStyle, backgroundColor: 'var(--accent-bg)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                            Which event did you mean?
                        </span>
                        <button onClick={() => setTray(null)} aria-label="Dismiss" style={{ color: 'var(--accent)', opacity: 0.6 }}>
                            <X size={14} />
                        </button>
                    </div>
                    {tray.candidates.map(c => (
                        <TrayEventCard key={c.id} event={c} onClick={() => handleCandidateSelect(c.id)} />
                    ))}
                </div>
            );
        }

        if (tray.intent === 'query') {
            const events = tray.events ?? [];
            return (
                <div style={trayStyle}>
                    <div style={{ ...headerStyle, backgroundColor: 'var(--bg-app)' }}>
                        <p className="text-sm flex-1 pr-4 leading-snug" style={{ color: 'var(--text-muted)' }}>{tray.message}</p>
                        <button onClick={() => setTray(null)} aria-label="Dismiss results" style={{ color: 'var(--text-muted)' }}>
                            <X size={14} />
                        </button>
                    </div>
                    {events.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                            No events found
                        </div>
                    ) : (
                        events.map(e => (
                            <TrayEventCard key={e.id} event={e} onClick={() => handleEventCardClick(e)} />
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

            {/* Hidden file input — images, PDF, DOCX */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileSelect}
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
            <div
                className="px-3 py-3"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderTop: '1px solid var(--border)',
                    boxShadow: '0 -2px 12px rgba(30,26,20,0.06)',
                }}
            >
                <div className="max-w-3xl mx-auto">

                    {/* Context pill */}
                    {lastUserMsg && (
                        <div
                            className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs"
                            style={{
                                backgroundColor: 'var(--accent-bg)',
                                border: '1px solid var(--accent-border)',
                                color: 'var(--accent)',
                            }}
                        >
                            <span className="font-semibold shrink-0">Continuing:</span>
                            <span className="flex-1 truncate italic opacity-80">{lastUserMsg}</span>
                            <button
                                onClick={handleClearSession}
                                aria-label="Clear conversation context"
                                title="Start a new conversation"
                                className="shrink-0 ml-1 transition-opacity hover:opacity-60"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Input row */}
                    <div
                        className="flex items-center rounded-xl transition-shadow"
                        style={{
                            backgroundColor: 'var(--bg-app)',
                            border: isListening
                                ? '1.5px solid var(--today)'
                                : '1.5px solid var(--border-mid)',
                            boxShadow: 'inset 0 1px 3px rgba(30,26,20,0.05)',
                        }}
                    >
                        <label htmlFor="nlp-event-input" className="sr-only">
                            Describe what you want to do
                        </label>
                        <input
                            id="nlp-event-input"
                            type="text"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={interimText || NLP_SUGGESTIONS[placeholderIdx]}
                            className={`flex-1 min-w-0 px-4 py-3 bg-transparent border-none outline-none text-sm sm:text-base truncate ${interimText ? 'italic' : ''}`}
                            style={{ color: 'var(--text-base)' }}
                            disabled={isLoading}
                        />
                        <div className="flex items-center gap-0.5 pr-2 shrink-0">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isParsingImage || isLoading}
                                aria-label="Attach a file to import events"
                                title="Attach an image, PDF, or Word doc to import events"
                                className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: isParsingImage ? 'var(--accent)' : 'var(--text-muted)' }}
                            >
                                <Paperclip size={17} />
                            </button>
                            <button
                                onClick={() => void toggleListening()}
                                disabled={isUploading}
                                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                title={isListening ? 'Stop listening' : 'Start voice input (Alt+V)'}
                                className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: isListening ? 'var(--today)' : 'var(--text-muted)' }}
                            >
                                {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                            </button>
                            <button
                                onClick={() => handleSubmit()}
                                disabled={isLoading || !inputText.trim()}
                                aria-label="Send"
                                title="Send"
                                className="p-1.5 ml-0.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ backgroundColor: 'var(--accent)', color: '#fefcf8' }}
                            >
                                {isLoading
                                    ? <span className="block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                                    : <ArrowUp size={17} />
                                }
                            </button>
                        </div>
                    </div>

                    {/* Status + feedback */}
                    {isParsingImage && (
                        <p className="mt-1.5 text-xs animate-pulse" style={{ color: 'var(--accent)' }}>Reading file…</p>
                    )}
                    {isListening && (
                        <p className="mt-1.5 text-xs animate-pulse" style={{ color: 'var(--today)' }}>Listening…</p>
                    )}
                    {isUploading && (
                        <p className="mt-1.5 text-xs animate-pulse" style={{ color: 'var(--accent-mid)' }}>Transcribing…</p>
                    )}
                    {persistentMsg && (
                        <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                            ✓ {persistentMsg}
                        </p>
                    )}
                    {errorMsg && (
                        <p className="mt-1.5 text-xs" style={{ color: 'var(--today)' }}>{errorMsg}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NLPInput;
