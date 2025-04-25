import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import CalendarComponent from '../components/Calendar';
import NLPInput from '../components/NLPInput';
import eventService, { Event } from '../services/eventService';

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState<Date>(new Date());
    const [newEvent, setNewEvent] = useState<Event | undefined>(undefined);

    // Fetch events on component mount and when date changes
    useEffect(() => {
        fetchEvents();
    }, [date]);

    // Fetch events from API with date range filtering
    const fetchEvents = async () => {
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
    };

    // Handle date navigation
    const handleNavigate = (newDate: Date | 'TODAY') => {
        if (newDate === 'TODAY') {
            setDate(new Date());
        } else {
            setDate(newDate);
        }
        // Clear the new event highlight when navigating to a different date
        setNewEvent(undefined);
    };

    // Handle new event
    const handleNewEvent = (event: Event) => {
        setEvents(prevEvents => [...prevEvents, event]);
        setNewEvent(event);
        setDate(new Date(event.startTime));
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
                    <div className="h-full bg-white rounded-lg shadow p-4">
                        <CalendarComponent
                            events={events}
                            date={date}
                            onNavigate={handleNavigate}
                            newEvent={newEvent}
                        />
                    </div>
                )}
            </div>

            <NLPInput
                onEventAdded={handleNewEvent}
                className="z-10"
            />
        </div>
    );
};

export default CalendarPage;