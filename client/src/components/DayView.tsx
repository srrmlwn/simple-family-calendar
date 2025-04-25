import React from 'react';
import { Event } from '../services/eventService';
import { format, isToday, isSameDay } from 'date-fns';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface DayViewProps {
    date: Date;
    events: Event[];
}

const DayView: React.FC<DayViewProps> = ({ date, events }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    console.log('DayView render:', {
        date: date.toISOString(),
        eventsCount: events.length,
        isMobile
    });

    // Filter events for the selected date
    const dayEvents = React.useMemo(() => {
        const filteredEvents = events.filter(event => 
            isSameDay(new Date(event.startTime), date)
        );
        console.log('Filtered events for date:', {
            date: date.toISOString(),
            filteredCount: filteredEvents.length
        });
        return filteredEvents;
    }, [events, date]);

    // Format the date header
    const dateHeader = isToday(date) 
        ? 'Today' 
        : format(date, 'EEEE, MMMM d, yyyy');

    return (
        <div className="bg-white h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">{dateHeader}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {dayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <p className="text-lg font-medium mb-2">No events scheduled</p>
                            <p className="text-sm">Select another date or add a new event</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {dayEvents.map(event => (
                            <div 
                                key={event.id}
                                className="p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors"
                            >
                                <div className="font-medium text-gray-900">
                                    {event.title}
                                </div>
                                {!event.isAllDay && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {format(new Date(event.startTime), 'h:mm a')} - 
                                        {format(new Date(event.endTime), 'h:mm a')}
                                    </div>
                                )}
                                {event.location && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {event.location}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DayView; 