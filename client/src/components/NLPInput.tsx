import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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

        // Clear error when user starts typing again
        if (error) {
            setError(null);
        }
    };

    const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputText.trim()) {
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

            // Reset input and notify parent
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
        <div className={`${className}`}>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <div className="pl-3 pr-2">
                    <Plus size={20} className="text-blue-500" />
                </div>
                <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Add an event... (e.g., 'Soccer practice tomorrow at 3pm')"
                    className="w-full py-3 px-2 focus:outline-none"
                    disabled={isLoading}
                />
                {inputText.trim() && (
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-blue-500 text-white px-4 py-2 hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {isLoading ? 'Adding...' : 'Add'}
                    </button>
                )}
            </div>

            {error && (
                <div className="text-red-500 text-sm mt-1 px-2">
                    {error}
                </div>
            )}
        </div>
    );
};

export default NLPInput;