import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Event, EventInput } from '../services/eventService';

interface EventFormProps {
    event?: Event;
    initialDate?: Date;
    onSubmit: (eventData: EventInput) => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
}

const EventForm: React.FC<EventFormProps> = ({
                                                 event,
                                                 initialDate,
                                                 onSubmit,
                                                 onCancel,
                                                 onDelete,
                                             }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [location, setLocation] = useState('');
    const [color, setColor] = useState('#3B82F6'); // Default blue
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form with existing event data or defaults
    useEffect(() => {
        if (event) {
            // Editing existing event
            setTitle(event.title || '');
            setDescription(event.description || '');
            setIsAllDay(event.isAllDay);
            setLocation(event.location || '');
            setColor(event.color || '#3B82F6');

            const start = moment(event.startTime);
            const end = moment(event.endTime);

            setStartDate(start.format('YYYY-MM-DD'));
            setEndDate(end.format('YYYY-MM-DD'));

            if (!event.isAllDay) {
                setStartTime(start.format('HH:mm'));
                setEndTime(end.format('HH:mm'));
            }
        } else if (initialDate) {
            // Creating new event
            const start = moment(initialDate);
            const end = moment(initialDate).add(1, 'hour');

            setStartDate(start.format('YYYY-MM-DD'));
            setEndDate(end.format('YYYY-MM-DD'));
            setStartTime(start.format('HH:mm'));
            setEndTime(end.format('HH:mm'));
        }
    }, [event, initialDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);
            setError(null);

            // Validate form
            if (!title.trim()) {
                setError('Event title is required');
                return;
            }

            if (!startDate) {
                setError('Start date is required');
                return;
            }

            if (!isAllDay && !startTime) {
                setError('Start time is required for non-all-day events');
                return;
            }

            // Create start and end datetime objects
            let startDateTime, endDateTime;

            if (isAllDay) {
                // For all-day events, set time to start/end of day
                startDateTime = moment(startDate).startOf('day').toDate();
                endDateTime = moment(endDate || startDate).endOf('day').toDate();
            } else {
                // For time-specific events, combine date and time
                startDateTime = moment(`${startDate} ${startTime}`).toDate();
                endDateTime = moment(`${endDate || startDate} ${endTime || startTime}`).toDate();

                // Ensure end time is after start time
                if (endDateTime <= startDateTime) {
                    endDateTime = moment(startDateTime).add(1, 'hour').toDate();
                }
            }

            // Prepare event data
            const eventData: EventInput = {
                title,
                description: description || undefined,
                startTime: startDateTime,
                endTime: endDateTime,
                isAllDay,
                location: location || undefined,
                color,
            };

            // Submit the form
            await onSubmit(eventData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save event');
            console.error('Error saving event:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (onDelete && window.confirm('Are you sure you want to delete this event?')) {
            try {
                setIsSubmitting(true);
                await onDelete();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete event');
                console.error('Error deleting event:', err);
                setIsSubmitting(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title *
                </label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event title"
                    required
                />
            </div>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="isAllDay"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isAllDay" className="ml-2 block text-sm text-gray-700">
                    All-day event
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Start Date *
                    </label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                {!isAllDay && (
                    <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                            Start Time *
                        </label>
                        <input
                            type="time"
                            id="startTime"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        End Date
                    </label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {!isAllDay && (
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                            End Time
                        </label>
                        <input
                            type="time"
                            id="endTime"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                )}
            </div>

            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                </label>
                <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event location"
                />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event description"
                />
            </div>

            <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                    Color
                </label>
                <input
                    type="color"
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="mt-1 block w-full h-8 border border-gray-300 rounded-md shadow-sm p-0 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div className="flex justify-between pt-2">
                <div>
                    {onDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md disabled:bg-red-300"
                        >
                            Delete
                        </button>
                    )}
                </div>

                <div className="space-x-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md disabled:bg-gray-100"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:bg-blue-300"
                    >
                        {isSubmitting ? 'Saving...' : event ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default EventForm;