import React, { useState } from 'react';
import moment from 'moment';
import { Event, EventInput } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import EventForm from './EventForm';
import BottomSheet from './BottomSheet';
import { CalendarDays, Pencil } from 'lucide-react';
import { getEventIcon } from '../utils/eventIcons';

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
                            {dayEvents.map((event) => {
                                const EventIcon = getEventIcon(event.title);
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => handleEventClick(event)}
                                        className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex gap-4 items-center">
                                            {/* Left Section - Time */}
                                            <div className="flex flex-col items-center justify-center min-w-[60px]">
                                                <span className="text-lg font-bold text-blue-600">
                                                    {moment(event.startTime).format('h:mm')}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {moment(event.startTime).format('A')}
                                                </span>
                                            </div>

                                            {/* Center Section - Event Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <EventIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <h3 className="font-semibold text-gray-900 text-base">
                                                        {event.title}
                                                    </h3>
                                                </div>
                                                <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                                                    {event.location && (
                                                        <>
                                                            <span>{event.location}</span>
                                                            <span className="text-gray-300">•</span>
                                                        </>
                                                    )}
                                                    <span>
                                                        {moment(event.startTime).format('h:mm A')} – {moment(event.endTime).format('h:mm A')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right Section - Edit Icon */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Pencil className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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