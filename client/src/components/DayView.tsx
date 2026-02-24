import React, { useState } from 'react';
import moment from 'moment';
import { Event, EventInput, RecurringScope } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import EventDetails from './EventDetails';
import { CalendarDays, Pencil } from 'lucide-react';
import { getEventIcon } from '../utils/eventIcons';

interface DayViewProps {
    date: Date;
    events: Event[];
    onNavigate: (date: Date | 'TODAY') => void;
    onUpdateEvent: (eventId: string, eventData: EventInput) => Promise<void>;
    onDeleteEvent: (eventId: string, options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => Promise<void>;
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

    const handleEventDelete = async (options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => {
        if (!selectedEvent) return;
        try {
            await onDeleteEvent(selectedEvent.id, options);
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
                        <div className="text-center text-gray-400 mt-8 px-4">
                            <p className="text-sm">Nothing here yet.</p>
                            <p className="text-sm mt-1">
                                Try:{' '}
                                <span className="font-medium text-gray-600">
                                    Add dentist appointment on Thursday at 10am
                                </span>
                            </p>
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
                                            <div className="flex flex-col items-center justify-center min-w-[50px]">
                                                <span className="text-base font-bold text-blue-600">
                                                    {moment(event.startTime).format('h:mm')}
                                                </span>
                                                <span className="text-xs text-gray-600">
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
                                                {isMobile ? (
                                                    <>
                                                        {event.location && (
                                                            <div className="mt-1 text-sm text-gray-600">
                                                                {event.location}
                                                            </div>
                                                        )}
                                                        <div className="mt-1 text-sm text-gray-600">
                                                            {moment(event.startTime).format('h:mm A')} – {moment(event.endTime).format('h:mm A')}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="mt-1 text-sm text-gray-600 flex items-center gap-1">
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
                                                )}
                                            </div>

                                            {/* Right Section - Member dots + Edit Icon */}
                                            <div className="flex items-center gap-2">
                                                {event.familyMembers && event.familyMembers.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {event.familyMembers.map(m => (
                                                            <span
                                                                key={m.id}
                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: m.color }}
                                                                title={m.name}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Event Details Bottom Sheet — handles recurring scope dialogs */}
            {selectedEvent && (
                <EventDetails
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onUpdate={(eventData) => handleEventUpdate(selectedEvent.id, eventData)}
                    onDelete={handleEventDelete}
                />
            )}
        </>
    );
};

export default DayView; 