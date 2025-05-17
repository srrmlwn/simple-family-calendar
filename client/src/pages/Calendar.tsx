import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import DatePicker from '../components/DatePicker';
import NLPInput from '../components/NLPInput';
import eventService, { Event, EventInput } from '../services/eventService';
import { EventState, EventStatus } from '../utils/eventValidation';

// Update DatePicker props to include eventStates
interface DatePickerProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    newEvent?: Event;
    onEventUpdate: (eventId: string, eventData: EventInput) => Promise<void>;
    onEventDelete: (eventId: string) => Promise<void>;
    eventStates: Record<string, EventState>;
    onEventSave: (eventData: EventInput) => Promise<Event>;
    selectedEventId?: string;
}

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState<Date>(new Date());
    const [newEvent, setNewEvent] = useState<Event | undefined>(undefined);
    const [eventStates, setEventStates] = useState<Record<string, EventState>>({});
    const [selectedEventId, setSelectedEventId] = useState<string | undefined>();

    // Fetch events from API with date range filtering
    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // For month view, fetch events for the entire month
            const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

            // Call API with date range parameters
            const eventsData = await eventService.getAll(startDate, endDate);
            setEvents(eventsData);
        } catch (err) {
            setError('Failed to load events. Please try again later.');
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Handle date navigation
    const handleNavigate = useCallback((newDate: Date | 'TODAY') => {
        if (newDate === 'TODAY') {
            setDate(new Date());
        } else {
            setDate(newDate);
        }
        // Clear the new event highlight when navigating to a different date
        setNewEvent(undefined);
    }, []);

    // Handle new event creation
    const handleNewEvent = useCallback(async (eventData: EventInput) => {
        try {
            // Save the event
            const savedEvent = await eventService.create(eventData);
            
            // Refetch events to ensure we have the latest data
            await fetchEvents();
            
            // Set the new event for highlighting
            setNewEvent(savedEvent);
            setDate(new Date(eventData.startTime));

            // Update event state to saved
            setEventStates(prev => ({
                ...prev,
                [savedEvent.id]: {
                    status: 'saved',
                    validation: { isValid: true, title: { status: 'valid' }, startTime: { status: 'valid' }, endTime: { status: 'valid' }, pendingFields: [] }
                }
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event');
            throw err;
        }
    }, [fetchEvents]);

    // Handle event update
    const handleEventUpdate = useCallback(async (eventId: string, eventData: EventInput) => {
        // Update event state to saving
        setEventStates(prev => ({
            ...prev,
            [eventId]: {
                status: 'saving',
                validation: { isValid: true, title: { status: 'valid' }, startTime: { status: 'valid' }, endTime: { status: 'valid' }, pendingFields: [] }
            }
        }));

        try {
            const updatedEvent = await eventService.update(eventId, eventData);
            setEvents(prevEvents => 
                prevEvents.map(event => 
                    event.id === eventId ? updatedEvent : event
                )
            );

            // Update event state to saved
            setEventStates(prev => ({
                ...prev,
                [eventId]: {
                    status: 'saved',
                    validation: { isValid: true, title: { status: 'valid' }, startTime: { status: 'valid' }, endTime: { status: 'valid' }, pendingFields: [] }
                }
            }));
        } catch (err) {
            // Update event state to error
            setEventStates(prev => ({
                ...prev,
                [eventId]: {
                    status: 'error',
                    validation: { isValid: true, title: { status: 'valid' }, startTime: { status: 'valid' }, endTime: { status: 'valid' }, pendingFields: [] },
                    error: err instanceof Error ? err.message : 'Failed to update event'
                }
            }));
            throw err;
        }
    }, []);

    // Handle event delete
    const handleEventDelete = useCallback(async (eventId: string) => {
        try {
            await eventService.delete(eventId);
            setEvents(prevEvents => 
                prevEvents.filter(event => event.id !== eventId)
            );
            // Remove event state
            setEventStates(prev => {
                const newStates = { ...prev };
                delete newStates[eventId];
                return newStates;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            throw err;
        }
    }, []);

    // Handle parsed event from NLP input
    const handleEventParsed = useCallback((parsedEvent: Event) => {
        // Set the parsed event for editing
        setNewEvent(parsedEvent);
        setDate(new Date(parsedEvent.startTime));
        
        // Set initial event state
        setEventStates(prev => ({
            ...prev,
            [parsedEvent.id || 'new']: {
                status: 'editing',
                validation: { isValid: true, title: { status: 'valid' }, startTime: { status: 'valid' }, endTime: { status: 'valid' }, pendingFields: [] }
            }
        }));
    }, []);

    // Handle event save from form
    const handleEventSave = useCallback(async (eventData: EventInput) => {
        try {
            const savedEvent = await eventService.create(eventData);
            // Update the selected event ID to show the saved event
            setSelectedEventId(savedEvent.id);
            // Refetch events to ensure we have the latest data
            await fetchEvents();
            // Update event state
            setEventStates(prev => ({
                ...prev,
                [savedEvent.id]: {
                    status: 'saved',
                    error: undefined,
                    validation: {
                        isValid: true,
                        title: { status: 'valid' },
                        startTime: { status: 'valid' },
                        endTime: { status: 'valid' },
                        pendingFields: []
                    }
                }
            }));
            return savedEvent;
        } catch (error) {
            console.error('Error saving event:', error);
            throw error;
        }
    }, [fetchEvents]);

    // Handle new event from NLP input
    const handleEventAdded = async (event: Event) => {
        // Update the date to show the day of the new event
        setDate(new Date(event.startTime));
        // Set the event for editing
        setNewEvent(event);
        // Set the event ID to show in bottom sheet
        setSelectedEventId(event.id);
        // Initialize event state
        setEventStates(prev => ({
            ...prev,
            [event.id]: {
                status: 'saved',
                error: undefined,
                validation: {
                    isValid: true,
                    title: { status: 'valid' },
                    startTime: { status: 'valid' },
                    endTime: { status: 'valid' },
                    pendingFields: []
                }
            }
        }));
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Header />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3">
                    {error}
                </div>
            )}

            <div className="flex-grow p-6 overflow-auto pb-24">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="min-h-full bg-white rounded-lg shadow flex">
                        <DatePicker
                            events={events}
                            date={date}
                            onNavigate={handleNavigate}
                            newEvent={newEvent}
                            onEventUpdate={handleEventUpdate}
                            onEventDelete={handleEventDelete}
                            eventStates={eventStates}
                            onEventSave={handleEventSave}
                            selectedEventId={selectedEventId}
                        />
                    </div>
                )}
            </div>

            <NLPInput
                onEventAdded={handleEventAdded}
                className="z-10"
            />
        </div>
    );
};

export default CalendarPage;