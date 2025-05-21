import React, { useState } from 'react';
import moment from 'moment';
import { Event, EventInput } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import EventForm from './EventForm';
import BottomSheet from './BottomSheet';
import { CalendarDays } from 'lucide-react';

interface DayViewProps {
    date: Date;
    events: Event[];
    onNavigate: (date: Date | 'TODAY') => void;
    onUpdateEvent: (eventId: string, eventData: EventInput) => Promise<void>;
    onDeleteEvent: (eventId: string) => Promise<void>;
}

const DayView: React.FC<DayViewProps> = ({
    date,
    events,
    onNavigate,
    onUpdateEvent,
    onDeleteEvent
}) => {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Filter events for the selected date
    const dayEvents = React.useMemo(() => {
        return events.filter(event => {
            const eventDate = moment(event.startTime).startOf('day');
            const selectedDateMoment = moment(date).startOf('day');
            return eventDate.isSame(selectedDateMoment, 'day');
        });
    }, [events, date]);

    // Format time for display
    const formatTime = (date: string | Date) => {
        return moment(date).format('h:mm A');
    };

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
    };

    const handleEventUpdate = async (eventId: string, eventData: EventInput) => {
        try {
            await onUpdateEvent(eventId, eventData);
            setSelectedEvent(null);
        } catch (error) {
            console.error('Error updating event:', error);
        }
    };

    const handleEventDelete = async (eventId: string) => {
        try {
            await onDeleteEvent(eventId);
            setSelectedEvent(null);
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    return (
        <>
            <div className="h-full flex flex-col bg-white rounded-lg shadow p-2 sm:p-4" data-testid="day-view">
                <div className="mb-4 border-b border-gray-200 pb-4">            
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-gray-400" />
                        <div>
                            <strong className="text-emphasis font-medium">
                                {moment(date).format('ddd')}
                            </strong>
                            <span className="text-subtle">
                                {',  '}{moment(date).format('MMM Do')}
                            </span>
                        </div>
                    </div>
                </div>

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
                                    className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 bg-white cursor-pointer transition-colors"
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
            </div>

            {/* Event Form Bottom Sheet */}
            {selectedEvent && (
                <BottomSheet
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    className="max-h-[90vh] overflow-y-auto"
                    showHeader={false}
                >
                    <EventForm
                        event={selectedEvent}
                        onSubmit={(eventData) => handleEventUpdate(selectedEvent.id, eventData)}
                        onDelete={() => handleEventDelete(selectedEvent.id)}
                        onCancel={() => setSelectedEvent(null)}
                    />
                </BottomSheet>
            )}
        </>
    );
};

export default DayView; 