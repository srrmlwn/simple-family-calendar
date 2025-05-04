import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { Event, EventInput } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import EventDetails from './EventDetails';

interface DayViewProps {
    date: Date;
    events: Event[];
    onNavigate: (date: Date | 'TODAY') => void;
    newEvent?: Event;
    onUpdateEvent?: (eventId: string, eventData: EventInput) => Promise<void>;
    onDeleteEvent?: (eventId: string) => Promise<void>;
}

const DayView: React.FC<DayViewProps> = ({
    date,
    events,
    onNavigate,
    newEvent,
    onUpdateEvent,
    onDeleteEvent
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [selectedDate, setSelectedDate] = useState<Date>(date);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync selectedDate with date prop
    useEffect(() => {
        setSelectedDate(date);
    }, [date]);

    // Filter events for the selected date
    const dayEvents = React.useMemo(() => {
        return events.filter(event => {
            const eventDate = moment(event.startTime).startOf('day');
            const selectedDateMoment = moment(selectedDate).startOf('day');
            return eventDate.isSame(selectedDateMoment, 'day');
        });
    }, [events, selectedDate]);

    // Format time for display
    const formatTime = (date: string | Date) => {
        return moment(date).format('h:mm A');
    };

    // Handle date selection
    const handleDateSelect = (newDate: Date) => {
        setSelectedDate(newDate);
        onNavigate(newDate);
    };

    // Handle event click
    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setError(null);
    };

    // Handle event update
    const handleEventUpdate = async (eventData: EventInput) => {
        if (!selectedEvent || !onUpdateEvent) {
            setError('Update functionality is not available');
            return;
        }

        try {
            setIsUpdating(true);
            setError(null);
            await onUpdateEvent(selectedEvent.id, eventData);
            setSelectedEvent(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update event');
            console.error('Error updating event:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle event delete
    const handleEventDelete = async () => {
        if (!selectedEvent || !onDeleteEvent) {
            setError('Delete functionality is not available');
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            await onDeleteEvent(selectedEvent.id);
            setSelectedEvent(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            console.error('Error deleting event:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow p-2 sm:p-4">
            <div className="mb-4 border-b border-gray-200 pb-4">            
                <strong className="text-emphasis font-semibold">
                    {moment(selectedDate).format('ddd')}
                </strong>
                <span className="text-subtle font-medium">
                    {',  '}{moment(selectedDate).format('MMM Do')}
                </span>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {dayEvents.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        No events scheduled for this day
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dayEvents.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                                    newEvent && newEvent.id === event.id
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                        </p>
                                        {event.location && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                📍 {event.location}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedEvent && (
                <EventDetails
                    event={selectedEvent}
                    isOpen={!!selectedEvent}
                    onClose={() => {
                        setSelectedEvent(null);
                        setError(null);
                    }}
                    onUpdate={handleEventUpdate}
                    onDelete={handleEventDelete}
                />
            )}
        </div>
    );
};

export default DayView; 