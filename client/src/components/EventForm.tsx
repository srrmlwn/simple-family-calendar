import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Event, EventInput } from '../services/eventService';
import { validateEvent, EventState, EventStatus, getEventStatusMessage, getValidationMessage } from '../utils/eventValidation';
import { getEventIcon } from '../utils/eventIcons';

interface EventFormProps {
    event?: Event;
    initialDate?: Date;
    onSubmit: (eventData: EventInput) => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
    isDeleting?: boolean;
    eventState?: EventState;
}

const EventForm: React.FC<EventFormProps> = ({
    event,
    initialDate,
    onSubmit,
    onCancel,
    onDelete,
    isDeleting = false,
    eventState
}) => {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validation, setValidation] = useState(() => validateEvent({}));
    const [activeField, setActiveField] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

    // Initialize form with existing event data or defaults
    useEffect(() => {
        if (event) {
            setTitle(event.title || '');
            setLocation(event.location || '');

            const start = moment(event.startTime);
            const end = moment(event.endTime);

            setStartDate(start.format('YYYY-MM-DD'));
            setEndDate(end.format('YYYY-MM-DD'));
            setStartTime(start.format('HH:mm'));
            setEndTime(end.format('HH:mm'));
        } else if (initialDate) {
            const start = moment(initialDate);
            const end = moment(initialDate).add(1, 'hour');

            setStartDate(start.format('YYYY-MM-DD'));
            setEndDate(end.format('YYYY-MM-DD'));
            setStartTime(start.format('HH:mm'));
            setEndTime(end.format('HH:mm'));
        } else {
            const now = moment();
            const start = now.clone();
            const end = now.clone().add(1, 'hour');

            setStartDate(start.format('YYYY-MM-DD'));
            setEndDate(end.format('YYYY-MM-DD'));
            setStartTime(start.format('HH:mm'));
            setEndTime(end.format('HH:mm'));
        }
    }, [event, initialDate]);

    // Update validation whenever form data changes
    useEffect(() => {
        const eventData = {
            title,
            startTime: startDate && startTime ? moment(`${startDate} ${startTime}`).toDate() : undefined,
            endTime: endDate && endTime ? moment(`${endDate} ${endTime}`).toDate() : undefined,
            isAllDay: false // Always false now
        };
        setValidation(validateEvent(eventData));
    }, [title, startDate, startTime, endDate, endTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);
            setError(null);

            const startDateTime = moment(`${startDate} ${startTime}`).toDate();
            let endDateTime = moment(`${endDate || startDate} ${endTime || startTime}`).toDate();

            if (endDateTime <= startDateTime) {
                endDateTime = moment(startDateTime).add(1, 'hour').toDate();
            }

            const eventData: EventInput = {
                title,
                startTime: startDateTime,
                endTime: endDateTime,
                isAllDay: false, // Always false now
                location: location || undefined,
            };

            // If this is an existing event, check if anything has changed
            if (event) {
                const originalEvent = {
                    title: event.title,
                    startTime: moment(event.startTime).toDate(),
                    endTime: moment(event.endTime).toDate(),
                    isAllDay: false, // Always false now
                    location: event.location || undefined,
                };

                // Compare all fields
                const hasChanges = 
                    originalEvent.title !== eventData.title ||
                    !moment(originalEvent.startTime).isSame(eventData.startTime) ||
                    !moment(originalEvent.endTime).isSame(eventData.endTime) ||
                    originalEvent.location !== eventData.location;

                if (!hasChanges) {
                    onCancel();
                    return;
                }
            }

            await onSubmit(eventData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save event');
            console.error('Error saving event:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusMessage = () => {
        if (eventState) {
            return getEventStatusMessage(eventState);
        }
        return validation.isValid ? 'Great! Your event is ready to save' : getValidationMessage(validation);
    };

    const getStatusMessageClass = () => {
        if (eventState) {
            switch (eventState.status) {
                case 'saved':
                    return 'bg-green-50 border-green-200 text-green-700';
                case 'saving':
                    return 'bg-blue-50 border-blue-200 text-blue-700';
                case 'error':
                    return 'bg-red-50 border-red-200 text-red-700';
                case 'draft':
                    return 'bg-yellow-50 border-yellow-200 text-yellow-700';
                default:
                    return '';
            }
        }
        return validation.isValid 
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-yellow-50 border-yellow-200 text-yellow-700';
    };

    const formatDisplayTime = (date: string, time: string) => {
        if (!date) return '';
        const momentDate = moment(`${date} ${time || '00:00'}`);
        return momentDate.format('MMM D, h:mm A');
    };

    const validateDateTime = (value: string, isStart: boolean): { isValid: boolean; message?: string } => {
        // Try parsing with different formats
        const formats = [
            'MMM D',           // "Jan 15"
            'MMM D, h:mm A',   // "Jan 15, 3:30 PM"
            'h:mm A',          // "3:30 PM"
            'MMM D YYYY',      // "Jan 15 2024"
            'MMM D YYYY, h:mm A', // "Jan 15 2024, 3:30 PM"
            'YYYY-MM-DD',      // "2024-01-15"
            'YYYY-MM-DD HH:mm' // "2024-01-15 15:30"
        ];

        const parsed = moment(value, formats, true);
        
        if (!parsed.isValid()) {
            return {
                isValid: false,
                message: 'Please enter a valid date and time'
            };
        }

        // For end time, ensure it's after start time
        if (!isStart && parsed.isValid()) {
            const startMoment = moment(`${startDate} ${startTime}`);
            if (parsed.isSameOrBefore(startMoment)) {
                return {
                    isValid: false,
                    message: 'End time must be after start time'
                };
            }
        }

        return { isValid: true };
    };

    const handleFieldChange = (field: string, value: string, isDateTime: boolean, isStart: boolean, onChange: (value: string) => void) => {
        if (isDateTime) {
            const validation = validateDateTime(value, isStart);
            if (!validation.isValid) {
                setValidationErrors(prev => ({
                    ...prev,
                    [field]: validation.message || 'Invalid date/time'
                }));
                return;
            }
            setValidationErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
        onChange(value);
    };

    const renderEditableField = (field: string, value: string, placeholder: string, onChange: (value: string) => void, isDateTime: boolean = false, isStart: boolean = true) => {
        const isActive = activeField === field;
        const validationError = validationErrors[field];

        return (
            <div className="inline-block relative group">
                <span
                    onClick={() => setActiveField(field)}
                    className={`
                        inline-block px-2 py-1 rounded-md cursor-pointer
                        transition-all duration-200
                        ${isActive 
                            ? 'bg-blue-50 border border-blue-200 ring-2 ring-blue-100' 
                            : 'hover:bg-gray-50 border border-transparent group-hover:border-gray-200'
                        }
                        ${validationError ? 'border-red-200 bg-red-50' : ''}
                    `}
                >
                    {isActive ? (
                        <div className="relative">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => handleFieldChange(field, e.target.value, isDateTime, isStart, onChange)}
                                onBlur={() => {
                                    setActiveField(null);
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        [field]: null
                                    }));
                                }}
                                className={`
                                    bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full
                                    ${validationError ? 'text-red-600' : ''}
                                `}
                                placeholder={placeholder}
                                autoFocus
                            />
                            {validationError && (
                                <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap">
                                    {validationError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <span className={validationError ? 'text-red-600' : ''}>
                                {value || placeholder}
                            </span>
                            <svg 
                                className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                                />
                            </svg>
                        </div>
                    )}
                </span>
            </div>
        );
    };

    const EventIcon = getEventIcon(title);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-4">
                {/* Error message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-md mb-3">
                        {error}
                    </div>
                )}

                {/* Header */}
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Event Details</h2>

                {/* Event Card Layout */}
                <div className="space-y-3">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 w-20">
                            Title:
                        </label>
                        <div className="flex-1">
                            {renderEditableField('title', title, 'Event title', setTitle)}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 w-20">
                            Location:
                        </label>
                        <div className="flex-1">
                            {renderEditableField('location', location, 'Add location', setLocation)}
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="space-y-3">
                        {/* Start Time */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">
                                Start Time:
                            </label>
                            <div className="flex-1">
                                {renderEditableField(
                                    'startTime', 
                                    moment(`${startDate} ${startTime}`).format('h:mm A'), 
                                    'start time', 
                                    (value) => {
                                        const parsed = moment(value, ['h:mm A', 'HH:mm'], true);
                                        if (parsed.isValid()) {
                                            setStartTime(parsed.format('HH:mm'));
                                        }
                                    },
                                    true,
                                    true
                                )}
                            </div>
                        </div>

                        {/* End Time */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">
                                End Time:
                            </label>
                            <div className="flex-1">
                                {renderEditableField(
                                    'endTime', 
                                    moment(`${endDate} ${endTime}`).format('h:mm A'), 
                                    'end time', 
                                    (value) => {
                                        const parsed = moment(value, ['h:mm A', 'HH:mm'], true);
                                        if (parsed.isValid()) {
                                            setEndTime(parsed.format('HH:mm'));
                                        }
                                    },
                                    true,
                                    false
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center mt-6 p-3 border-t bg-white">
                {onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={isSubmitting || isDeleting}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        title="Delete"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="text-sm font-medium">Delete</span>
                    </button>
                )}
                <div className="flex gap-3 ml-auto">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting || isDeleting}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        title="Cancel"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">Cancel</span>
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || isDeleting || !validation.isValid}
                        className="flex items-center gap-2 px-3 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        title={!validation.isValid ? 'Please fill in all required fields' : 'Save'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">Save</span>
                    </button>
                </div>
            </div>
        </form>
    );
};

export default EventForm;