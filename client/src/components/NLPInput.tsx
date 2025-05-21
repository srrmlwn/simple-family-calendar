import React, { useState, useEffect } from 'react';
import { ArrowUp, Mic, MicOff } from 'lucide-react';
import eventService, { Event, EventInput } from '../services/eventService';

// Add type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
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

interface NLPInputProps {
    onEventAdded: (eventData: EventInput) => Promise<void>;
    className?: string;
}

const NLPInput: React.FC<NLPInputProps> = ({ onEventAdded, className }) => {
    const [inputText, setInputText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    useEffect(() => {
        // Initialize speech recognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                setError('Voice recognition failed. Please try again.');
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognition);
        }

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, []);

    useEffect(() => {
        if (recognition) {
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                setIsListening(false);
            };
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                setError('Voice recognition failed. Please try again.');
                setIsListening(false);
            };
        }
        return () => {
            if (recognition) {
                (recognition.onresult as any) = null;
                (recognition.onerror as any) = null;
            }
        };
    }, [recognition]);

    const handleSubmit = async () => {
        if (!inputText.trim()) return;

        try {
            setIsLoading(true);
            setError(null);
            // Only parse the event, don't create it
            const parsedEvent = await eventService.parseFromText(inputText);
            // Let the parent component handle creation
            await onEventAdded(parsedEvent);
            setInputText('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const toggleListening = () => {
        if (!recognition) {
            setError('Voice recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            setError(null);
            recognition.start();
            setIsListening(true);
        }
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 ${className}`}>
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Add an event... (e.g., 'Soccer practice tomorrow at 3pm')"
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={toggleListening}
                        className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isListening 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                        title={isListening ? 'Stop listening' : 'Start voice input'}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !inputText.trim()}
                        className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowUp size={20} />
                    </button>
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
            </div>
        </div>
    );
};

export default NLPInput;