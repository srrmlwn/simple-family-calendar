import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import DatePicker from '../components/DatePicker';
import NLPInput from '../components/NLPInput';
import eventService, { Event, EventInput } from '../services/eventService';

interface DatePickerProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    onEventUpdate: (eventId: string, eventData: EventInput) => Promise<void>;
    onEventDelete: (eventId: string) => Promise<void>;
    onEventSave: (eventData: EventInput) => Promise<Event>;
}

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState<Date>(new Date());

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

    // Handle event save
    const handleEventSave = useCallback(async (eventData: EventInput) => {
        try {
            const savedEvent = await eventService.create(eventData);
            // Update events state directly with the new event
            setEvents(prevEvents => [...prevEvents, savedEvent]);
            // Update the date to show the day of the new event
            setDate(new Date(eventData.startTime));
        } catch (error) {
            console.error('Error saving event:', error);
            throw error;
        }
    }, []);

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
                            onEventUpdate={handleEventUpdate}
                            onEventDelete={handleEventDelete}
                        />
                    </div>
                )}
            </div>

            <NLPInput
                onEventAdded={handleEventSave}
                className="z-10"
            />
        </div>
    );
};

export default CalendarPage;