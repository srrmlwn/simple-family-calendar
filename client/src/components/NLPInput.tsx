import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import eventService, { Event } from '../services/eventService';

interface NLPInputProps {
    onEventAdded: (event: Event) => void;
    className?: string;
}

const NLPInput: React.FC<NLPInputProps> = ({ onEventAdded, className }) => {
    const [inputText, setInputText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!inputText.trim()) return;

        try {
            setIsLoading(true);
            setError(null);
            const event = await eventService.createFromText(inputText);
            onEventAdded(event);
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