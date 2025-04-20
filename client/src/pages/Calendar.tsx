import React, { useState, useEffect } from 'react';
import { View } from 'react-big-calendar';
import Header from '../components/Header';
import CalendarComponent from '../components/Calendar';
import NLPInput from '../components/NLPInput';
import EventForm from '../components/EventForm';
import eventService, { Event, EventInput } from '../services/eventService';
import { X } from 'lucide-react';

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEventForm, setShowEventForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());

    // Fetch events on component mount and when view/date changes
    useEffect(() => {
        fetchEvents();
    }, [view, date]);

    // Fetch events from API with date range filtering
    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(null);

            // Calculate date range based on current view
            let startDate, endDate;

            if (view === 'day') {
                // For day view, fetch only events for that day
                startDate = new Date(date);
                startDate.setHours(0, 0, 0, 0);

                endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);
            }
            else if (view === 'week') {
                // For week view, fetch events for the entire week
                startDate = new Date(date);
                startDate.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                startDate.setHours(0, 0, 0, 0);

                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
                endDate.setHours(23, 59, 59, 999);
            }
            else if (view === 'month') {
                // For month view, fetch events for the entire month
                startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            else {
                // For agenda view, fetch events for the next 3 months
                startDate = new Date();
                endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 3);
            }

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

    const handleCreateEvent = async (eventData: EventInput) => {
        try {
            await eventService.create(eventData);
            await fetchEvents();
            closeEventForm();
        } catch (err) {
            console.error('Error creating event:', err);
            throw err;
        }
    };

    const handleUpdateEvent = async (eventData: EventInput) => {
        try {
            if (selectedEvent) {
                await eventService.update(selectedEvent.id, eventData);
                await fetchEvents();
                closeEventForm();
            }
        } catch (err) {
            console.error('Error updating event:', err);
            throw err;
        }
    };

    const handleDeleteEvent = async () => {
        try {
            if (selectedEvent) {
                await eventService.delete(selectedEvent.id);
                await fetchEvents();
                closeEventForm();
            }
        } catch (err) {
            console.error('Error deleting event:', err);
            throw err;
        }
    };

    const handleSelectEvent = (event: Event) => {
        setSelectedEvent(event);
        setSelectedDate(null);
        setShowEventForm(true);
    };

    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        setSelectedEvent(null);
        setSelectedDate(slotInfo.start);
        setShowEventForm(true);
    };

    const closeEventForm = () => {
        setShowEventForm(false);
        setSelectedEvent(null);
        setSelectedDate(null);
    };

    // Handle view change (month, week, day, agenda)
    const handleViewChange = (newView: string) => {
        setView(newView as View);
    };

    // Handle date navigation
    const handleNavigate = (newDate: Date) => {
        setDate(newDate);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Header />

            <NLPInput
                onEventAdded={fetchEvents}
                className="px-6 py-4 bg-white shadow-sm"
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3">
                    {error}
                </div>
            )}

            <div className="flex-grow p-6 overflow-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-lg shadow p-4">
                        <CalendarComponent
                            events={events}
                            onSelectEvent={handleSelectEvent}
                            onSelectSlot={handleSelectSlot}
                            view={view}
                            date={date}
                            onViewChange={handleViewChange}
                            onNavigate={handleNavigate}
                        />
                    </div>
                )}
            </div>

            {/* Event form modal */}
            {showEventForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-lg font-medium">
                                {selectedEvent ? 'Edit Event' : 'Create Event'}
                            </h2>
                            <button
                                onClick={closeEventForm}
                                className="p-1 rounded-full hover:bg-gray-100"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4">
                            <EventForm
                                event={selectedEvent || undefined}
                                initialDate={selectedDate || undefined}
                                onSubmit={selectedEvent ? handleUpdateEvent : handleCreateEvent}
                                onCancel={closeEventForm}
                                onDelete={selectedEvent ? handleDeleteEvent : undefined}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;