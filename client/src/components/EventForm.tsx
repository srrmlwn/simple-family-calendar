import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Event, EventInput, RecurringScope } from '../services/eventService';
import { validateEvent, EventState } from '../utils/eventValidation';
import { CalendarPlus, Clock } from 'lucide-react';
import familyMemberService, { FamilyMember } from '../services/familyMemberService';
import { buildRRule, parseRRule, RecurrencePattern, RECURRENCE_LABELS } from '../utils/recurrenceUtils';
import RecurrenceScopeDialog from './RecurrenceScopeDialog';

interface EventFormProps {
    event?: Event;
    initialDate?: Date;
    onSubmit: (eventData: EventInput) => Promise<void>;
    onCancel: () => void;
    onDelete?: (options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => Promise<void>;
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
    // Pending event data waiting for recurrence scope selection
    const [pendingEventData, setPendingEventData] = useState<EventInput | null>(null);
    const [validation, setValidation] = useState(() => validateEvent({}));
    const [activeField, setActiveField] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    // Recurrence state
    const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('none');
    const [recurrenceEndsOn, setRecurrenceEndsOn] = useState(''); // YYYY-MM-DD or ''
    const [exceptionDates, setExceptionDates] = useState<string[]>([]); // YYYY-MM-DD strings
    const [newExceptionDate, setNewExceptionDate] = useState('');

    // Load family members
    useEffect(() => {
        familyMemberService.getAll().then(setFamilyMembers).catch(() => {});
    }, []);

    // Initialize selected members from existing event
    useEffect(() => {
        if (event?.familyMembers) {
            setSelectedMemberIds(event.familyMembers.map(m => m.id));
        }
    }, [event]);

    const toggleMember = (id: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Initialize recurrence from existing event
    useEffect(() => {
        if (event?.rrule) {
            const parsed = parseRRule(event.rrule);
            setRecurrencePattern(parsed.pattern);
            setRecurrenceEndsOn(parsed.endsOn ?? '');
        } else {
            setRecurrencePattern('none');
            setRecurrenceEndsOn('');
        }
        if (event?.exceptionDates) {
            setExceptionDates(event.exceptionDates);
        } else {
            setExceptionDates([]);
        }
    }, [event]);

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

            const builtRRule = recurrencePattern !== 'none'
                ? buildRRule(recurrencePattern, startDateTime, recurrenceEndsOn || undefined)
                : undefined;

            const eventData: EventInput = {
                title,
                startTime: startDateTime,
                endTime: endDateTime,
                isAllDay: false,
                location: location || undefined,
                familyMemberIds: selectedMemberIds,
                rrule: builtRRule,
                exceptionDates: builtRRule ? exceptionDates : undefined,
            };

            // If this is an existing event, check if anything has changed
            if (event) {
                const originalEvent = {
                    title: event.title,
                    startTime: moment(event.startTime).toDate(),
                    endTime: moment(event.endTime).toDate(),
                    isAllDay: false,
                    location: event.location || undefined,
                };

                const hasChanges =
                    originalEvent.title !== eventData.title ||
                    !moment(originalEvent.startTime).isSame(eventData.startTime) ||
                    !moment(originalEvent.endTime).isSame(eventData.endTime) ||
                    originalEvent.location !== eventData.location;

                if (!hasChanges) {
                    onCancel();
                    return;
                }

                // For recurring events, show the scope dialog before submitting.
                if (event.rrule) {
                    setPendingEventData(eventData);
                    setIsSubmitting(false);
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

    const renderTextField = (field: string, value: string, onChange: (value: string) => void) => {
        const isActive = activeField === field;
        const validationError = validationErrors[field];

        return (
            <div className="inline-block relative group">
                <div
                    onClick={() => setActiveField(field)}
                    className={`
                        inline-block px-2 py-1 rounded-md cursor-pointer
                        transition-all duration-200
                        ${isActive 
                            ? 'bg-blue-50 border border-blue-200 ring-2 ring-blue-100' 
                            : 'bg-gray-50/50 hover:bg-gray-100 border border-gray-100 group-hover:border-gray-200'
                        }
                        ${validationError ? 'border-red-200 bg-red-50' : ''}
                    `}
                >
                    {isActive ? (
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                            onBlur={() => {
                                if (!isActive) {
                                    setActiveField(null);
                                    setValidationErrors(prev => ({
                                        ...prev,
                                        [field]: null
                                    }));
                                }
                            }}
                            autoFocus
                        />
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className={`${validationError ? 'text-red-600' : 'text-gray-700'}`}>
                                {value || 'Click to edit'}
                            </span>
                            <svg 
                                className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
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
                    {validationError && (
                        <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap">
                            {validationError}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDateTimeField = (field: string, date: string, time: string, onChange: (date: string, time: string) => void, isStart: boolean = true) => {
        const isActive = activeField === field;
        const validationError = validationErrors[field];
        const dateTime = moment(`${date} ${time}`).toDate();

        return (
            <div className="inline-block relative group">
                <div
                    onClick={() => setActiveField(field)}
                    className={`
                        inline-block px-2 py-1 rounded-md cursor-pointer
                        transition-all duration-200
                        ${isActive 
                            ? 'bg-blue-50 border border-blue-200 ring-2 ring-blue-100' 
                            : 'bg-gray-50/50 hover:bg-gray-100 border border-gray-100 group-hover:border-gray-200'
                        }
                        ${validationError ? 'border-red-200 bg-red-50' : ''}
                    `}
                >
                    {isActive ? (
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => onChange(e.target.value, time)}
                                    className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-32 pr-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                    onBlur={() => {
                                        if (!isActive) {
                                            setActiveField(null);
                                            setValidationErrors(prev => ({
                                                ...prev,
                                                [field]: null
                                            }));
                                        }
                                    }}
                                    autoFocus
                                    id={`${field}-date`}
                                />
                                <button
                                    type="button"
                                    onClick={() => (document.getElementById(`${field}-date`) as HTMLInputElement)?.showPicker()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer p-0 border-0 bg-transparent"
                                >
                                    <CalendarPlus className="w-full h-full opacity-50" strokeWidth={1.5} />
                                </button>
                            </div>
                            <div className="relative min-w-[100px]">
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => onChange(date, e.target.value)}
                                    className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-28 pr-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                                    onBlur={() => {
                                        if (!isActive) {
                                            setActiveField(null);
                                            setValidationErrors(prev => ({
                                                ...prev,
                                                [field]: null
                                            }));
                                        }
                                    }}
                                    id={`${field}-time`}
                                />
                                <button
                                    type="button"
                                    onClick={() => (document.getElementById(`${field}-time`) as HTMLInputElement)?.showPicker()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer p-0 border-0 bg-transparent"
                                >
                                    <Clock className="w-full h-full opacity-50" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className={`${validationError ? 'text-red-600' : 'text-gray-700'} whitespace-nowrap`}>
                                {moment(dateTime).format('MMM D, h:mm A')}
                            </span>
                            <svg 
                                className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
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
                    {validationError && (
                        <div className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap">
                            {validationError}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleScopeConfirm = async (scope: RecurringScope) => {
        if (!pendingEventData || !event) return;
        const dataWithScope: EventInput = {
            ...pendingEventData,
            recurringScope: scope,
            // occurrenceDate: the original occurrence this virtual instance represents
            occurrenceDate: event.occurrenceDate ?? moment(event.startTime).toISOString(),
        };
        setPendingEventData(null);
        try {
            setIsSubmitting(true);
            await onSubmit(dataWithScope);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save event');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
        {pendingEventData && (
            <RecurrenceScopeDialog
                action="edit"
                onConfirm={handleScopeConfirm}
                onCancel={() => setPendingEventData(null)}
            />
        )}
        <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-4">
                {/* Error message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-md mb-3">
                        {error}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <CalendarPlus className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
                </div>

                {/* Event Card Layout */}
                <div className="space-y-3">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 w-20">
                            Title:
                        </label>
                        <div className="flex-1">
                            {renderTextField('title', title, setTitle)}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 w-20">
                            Location:
                        </label>
                        <div className="flex-1">
                            {renderTextField('location', location, setLocation)}
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="space-y-3">
                        {/* Start Date/Time */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">
                                Start:
                            </label>
                            <div className="flex-1">
                                {renderDateTimeField(
                                    'startTime',
                                    startDate,
                                    startTime,
                                    (newDate, newTime) => {
                                        setStartDate(newDate);
                                        setStartTime(newTime);
                                    },
                                    true
                                )}
                            </div>
                        </div>

                        {/* End Date/Time */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">
                                End:
                            </label>
                            <div className="flex-1">
                                {renderDateTimeField(
                                    'endTime',
                                    endDate,
                                    endTime,
                                    (newDate, newTime) => {
                                        setEndDate(newDate);
                                        setEndTime(newTime);
                                    },
                                    false
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Family Members */}
                    {familyMembers.length > 0 && (
                        <div className="flex items-start gap-2 pt-1">
                            <label className="text-sm font-medium text-gray-700 w-20 pt-1">
                                Who:
                            </label>
                            <div className="flex flex-wrap gap-1.5 flex-1">
                                {familyMembers.map(m => {
                                    const selected = selectedMemberIds.includes(m.id);
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleMember(m.id)}
                                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                                                selected
                                                    ? 'text-white border-transparent'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                            style={selected ? { backgroundColor: m.color, borderColor: m.color } : {}}
                                        >
                                            {m.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Recurrence ─────────────────────────────────────────── */}
                    <div className="flex items-center gap-2 pt-1">
                        <label className="text-sm font-medium text-gray-700 w-20">
                            Repeat:
                        </label>
                        <select
                            value={recurrencePattern}
                            onChange={e => setRecurrencePattern(e.target.value as RecurrencePattern)}
                            className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                        >
                            {(Object.entries(RECURRENCE_LABELS) as [RecurrencePattern, string][]).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ends On — only shown when a recurrence is selected */}
                    {recurrencePattern !== 'none' && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20">
                                Ends:
                            </label>
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={recurrenceEndsOn}
                                        onChange={e => setRecurrenceEndsOn(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-36 [&::-webkit-calendar-picker-indicator]:hidden"
                                        id="recurrence-ends-date"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => (document.getElementById('recurrence-ends-date') as HTMLInputElement)?.showPicker()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer p-0 border-0 bg-transparent"
                                    >
                                        <CalendarPlus className="w-full h-full opacity-50" strokeWidth={1.5} />
                                    </button>
                                </div>
                                {recurrenceEndsOn && (
                                    <button
                                        type="button"
                                        onClick={() => setRecurrenceEndsOn('')}
                                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        Never
                                    </button>
                                )}
                                {!recurrenceEndsOn && (
                                    <span className="text-xs text-gray-400">Never</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Exception dates — skip specific dates in the series */}
                    {recurrencePattern !== 'none' && (
                        <div className="flex items-start gap-2">
                            <label className="text-sm font-medium text-gray-700 w-20 pt-1">
                                Skip:
                            </label>
                            <div className="flex-1 space-y-1.5">
                                {exceptionDates.map(d => (
                                    <div key={d} className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-0.5">
                                            {moment(d).format('MMM D, YYYY')}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setExceptionDates(prev => prev.filter(x => x !== d))}
                                            className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                                            aria-label="Remove exception date"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={newExceptionDate}
                                            onChange={e => setNewExceptionDate(e.target.value)}
                                            className="text-sm border border-dashed border-gray-300 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-36 [&::-webkit-calendar-picker-indicator]:hidden"
                                            id="exception-date-picker"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => (document.getElementById('exception-date-picker') as HTMLInputElement)?.showPicker()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer p-0 border-0 bg-transparent"
                                        >
                                            <CalendarPlus className="w-full h-full opacity-50" strokeWidth={1.5} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newExceptionDate && !exceptionDates.includes(newExceptionDate)) {
                                                setExceptionDates(prev => [...prev, newExceptionDate].sort());
                                                setNewExceptionDate('');
                                            }
                                        }}
                                        disabled={!newExceptionDate}
                                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                                    >
                                        + Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center mt-6 p-3 border-t bg-white">
                {onDelete && (
                    <button
                        type="button"
                        onClick={() => onDelete?.()}
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
        </>
    );
};

export default EventForm;