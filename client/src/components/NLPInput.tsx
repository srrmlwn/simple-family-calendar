import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import eventService from '../services/eventService';

interface NLPInputProps {
    onEventAdded: () => void;
    className?: string;
}

const NLPInput: React.FC<NLPInputProps> = ({ onEventAdded, className = '' }) => {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        if (error) {
            setError(null);
        }
    };

    const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputText.trim() && !e.shiftKey) {
            e.preventDefault();
            await processInput();
        }
    };

    const handleSubmit = async () => {
        if (inputText.trim()) {
            await processInput();
        }
    };

    const processInput = async () => {
        try {
            setIsLoading(true);
            setError(null);

            await eventService.createFromText(inputText);

            setInputText('');
            onEventAdded();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event');
            console.error('Error creating event:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 ${className}`}>
            <div className="max-w-3xl mx-auto p-4">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Add event (e.g., 'Soccer at 3pm tomorrow')"
                        className="w-full py-3 px-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base placeholder:text-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !inputText.trim()}
                        className="absolute right-2 p-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowUp size={20} />
                    </button>
                </div>
                {error && (
                    <div className="text-red-500 text-sm mt-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NLPInput;