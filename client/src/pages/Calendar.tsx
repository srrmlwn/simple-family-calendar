import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import DatePicker from '../components/DatePicker';
import EventForm from '../components/EventForm';
import NLPInput from '../components/NLPInput';
import eventService, { Event, EventInput } from '../services/eventService';

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState<Date>(new Date());
    const [newEventDate, setNewEventDate] = useState<Date | null>(null);
    // Event selected from the NLP results tray — navigate + open EventForm
    const [nlpSelectedEvent, setNlpSelectedEvent] = useState<Event | null>(null);

    // Fetch events from API with date range filtering
    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // For month view, fetch events for the entire month
            const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

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
    }, []);

    // Handle event update
    const handleEventUpdate = useCallback(async (eventId: string, eventData: EventInput) => {
        try {
            const updatedEvent = await eventService.update(eventId, eventData);
            setEvents(prevEvents => 
                prevEvents.map(event => 
                    event.id === eventId ? updatedEvent : event
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update event');
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            throw err;
        }
    }, []);

    // Handle event save (used by EventForm modal)
    const handleEventSave = useCallback(async (eventData: EventInput) => {
        try {
            const savedEvent = await eventService.create(eventData);
            setEvents(prevEvents => [...prevEvents, savedEvent]);
            setDate(new Date(eventData.startTime));
        } catch (error) {
            console.error('Error saving event:', error);
            throw error;
        }
    }, []);

    // Called by NLPInput after any mutation so we can refresh + navigate
    const handleNLPEventsChanged = useCallback((event?: Event) => {
        fetchEvents();
        if (event) {
            setDate(new Date(event.startTime as Date));
        }
    }, [fetchEvents]);

    // Called when user clicks an event in the NLP results tray
    const handleNLPEventSelect = useCallback((event: Event) => {
        setDate(new Date(event.startTime as Date));
        setNlpSelectedEvent(event);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Header />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : (
                    <>
                        <div className="h-full bg-white rounded-lg shadow flex">
                            <DatePicker
                                events={events}
                                date={date}
                                onNavigate={handleNavigate}
                                onEventUpdate={handleEventUpdate}
                                onEventDelete={handleEventDelete}
                                onCreateEvent={setNewEventDate}
                            />
                        </div>

                        {/* New event modal (date cell click) */}
                        {newEventDate && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                                onClick={(e) => { if (e.target === e.currentTarget) setNewEventDate(null); }}
                            >
                                <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                                    <EventForm
                                        initialDate={newEventDate}
                                        onSubmit={async (eventData) => {
                                            await handleEventSave(eventData);
                                            setNewEventDate(null);
                                        }}
                                        onCancel={() => setNewEventDate(null)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Edit event modal (NLP tray event click) */}
                        {nlpSelectedEvent && (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                                onClick={(e) => { if (e.target === e.currentTarget) setNlpSelectedEvent(null); }}
                            >
                                <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                                    <EventForm
                                        event={nlpSelectedEvent}
                                        onSubmit={async (eventData) => {
                                            await handleEventUpdate(nlpSelectedEvent.id, eventData);
                                            setNlpSelectedEvent(null);
                                        }}
                                        onDelete={async () => {
                                            await handleEventDelete(nlpSelectedEvent.id);
                                            setNlpSelectedEvent(null);
                                        }}
                                        onCancel={() => setNlpSelectedEvent(null)}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <NLPInput
                onEventsChanged={handleNLPEventsChanged}
                onEventSelect={handleNLPEventSelect}
            />
        </div>
    );
};

export default CalendarPage;