import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUp, Mic, MicOff, X } from 'lucide-react';
import moment from 'moment';
import eventService, { Event, EventInput, NLPCommandResponse } from '../services/eventService';

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
    /** Called after any mutation (create/update/delete) so the calendar can refresh. */
    onEventsChanged: (event?: Event) => void;
    className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEventTime(event: Event): string {
    return moment(event.startTime).format('ddd MMM D [at] h:mm A');
}

// ── Component ────────────────────────────────────────────────────────────────

const NLPInput: React.FC<NLPInputProps> = ({ onEventsChanged, className }) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    // Response state
    const [response, setResponse] = useState<NLPCommandResponse | null>(null);
    const [responseError, setResponseError] = useState<string | null>(null);

    // ── Speech recognition setup ─────────────────────────────────────────────

    useEffect(() => {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (e: SpeechRecognitionEvent) => {
            setInputText(e.results[0][0].transcript);
            setIsListening(false);
        };
        rec.onerror = () => {
            setResponseError('Voice recognition failed. Please try again.');
            setIsListening(false);
        };
        rec.onend = () => setIsListening(false);
        setRecognition(rec);

        return () => { rec.abort(); };
    }, []);

    const toggleListening = useCallback(() => {
        if (!recognition) {
            setResponseError('Voice recognition is not supported in your browser.');
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            setResponseError(null);
            setResponse(null);
            recognition.start();
            setIsListening(true);
        }
    }, [recognition, isListening]);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(async () => {
        const text = inputText.trim();
        if (!text) return;

        setIsLoading(true);
        setResponse(null);
        setResponseError(null);

        try {
            const result = await eventService.nlpCommand(text);
            setResponse(result);
            setInputText('');

            // Notify parent to refresh on mutations
            if (!result.requiresDisambiguation) {
                if (result.intent === 'create' || result.intent === 'update') {
                    onEventsChanged(result.event);
                } else if (result.intent === 'delete') {
                    onEventsChanged();
                }
                // query: no calendar change needed
            }
        } catch (err) {
            setResponseError(err instanceof Error ? err.message : 'Failed to process command');
        } finally {
            setIsLoading(false);
        }
    }, [inputText, onEventsChanged]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // ── Disambiguation: user picks one candidate ─────────────────────────────

    const handleCandidateSelect = useCallback(async (candidateId: string) => {
        if (!response) return;
        setIsLoading(true);

        try {
            if (response.intent === 'update' && response.pendingChanges) {
                const updated = await eventService.update(candidateId, response.pendingChanges);
                setResponse({ intent: 'update', message: `Updated "${updated.title}"`, event: updated });
                onEventsChanged(updated);
            } else if (response.intent === 'delete') {
                const candidate = response.candidates?.find(c => c.id === candidateId);
                await eventService.delete(candidateId);
                setResponse({ intent: 'delete', message: `Deleted "${candidate?.title ?? 'event'}"` });
                onEventsChanged();
            }
        } catch (err) {
            setResponseError(err instanceof Error ? err.message : 'Action failed');
            setResponse(null);
        } finally {
            setIsLoading(false);
        }
    }, [response, onEventsChanged]);

    const dismissResponse = () => {
        setResponse(null);
        setResponseError(null);
    };

    // ── Render response area ─────────────────────────────────────────────────

    const renderResponse = () => {
        if (responseError) {
            return (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                    <span className="flex-1">{responseError}</span>
                    <button onClick={dismissResponse} aria-label="Dismiss" className="shrink-0 text-red-400 hover:text-red-600">
                        <X size={14} />
                    </button>
                </div>
            );
        }

        if (!response) return null;

        // Disambiguation: show candidate list
        if (response.requiresDisambiguation && response.candidates) {
            return (
                <div className="mt-2 text-sm">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-amber-700 font-medium">{response.message}</span>
                        <button onClick={dismissResponse} aria-label="Dismiss" className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        {response.candidates.map(c => (
                            <button
                                key={c.id}
                                onClick={() => handleCandidateSelect(c.id)}
                                disabled={isLoading}
                                className="text-left px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs disabled:opacity-50"
                            >
                                <span className="font-medium">{c.title}</span>
                                <span className="text-amber-600 ml-2">{formatEventTime(c)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        // Query result: show answer + optional event list
        if (response.intent === 'query') {
            return (
                <div className="mt-2 text-sm">
                    <div className="flex items-start gap-2">
                        <span className="flex-1 text-gray-700">{response.message}</span>
                        <button onClick={dismissResponse} aria-label="Dismiss" className="shrink-0 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    </div>
                    {response.events && response.events.length > 0 && (
                        <ul className="mt-1 ml-1 space-y-0.5">
                            {response.events.map(e => (
                                <li key={e.id} className="text-xs text-gray-500">
                                    • <span className="font-medium text-gray-700">{e.title}</span> — {formatEventTime(e)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            );
        }

        // Create / update / delete success
        const colorClass =
            response.intent === 'delete'
                ? 'text-red-600'
                : 'text-green-600';

        return (
            <div className="mt-2 flex items-center gap-2 text-sm">
                <span className={`flex-1 ${colorClass}`}>✓ {response.message}</span>
                <button onClick={dismissResponse} aria-label="Dismiss" className="shrink-0 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            </div>
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 ${className ?? ''}`}>
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center space-x-2">
                    <label htmlFor="nlp-event-input" className="sr-only">
                        Describe what you want to do
                    </label>
                    <input
                        id="nlp-event-input"
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add, update, delete, or ask about events…"
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={toggleListening}
                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                        title={isListening ? 'Stop listening' : 'Start voice input'}
                        className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isListening
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !inputText.trim()}
                        aria-label="Send"
                        title="Send"
                        className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowUp size={20} />
                    </button>
                </div>

                {renderResponse()}
            </div>
        </div>
    );
};

export default NLPInput;
