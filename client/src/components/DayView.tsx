import React, { useEffect } from 'react';
import moment from 'moment';
import { Event } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface DayViewProps {
    date: Date;
    events: Event[];
    onNavigate: (date: Date | 'TODAY') => void;
    newEvent?: Event;
}

const DayView: React.FC<DayViewProps> = ({
    date,
    events,
    onNavigate,
    newEvent
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [selectedDate, setSelectedDate] = React.useState<Date>(date);

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

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                    {moment(selectedDate).format('MMMM D, YYYY')}
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {dayEvents.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        No events scheduled for this day
                    </div>
                ) : (
                    <div className="space-y-4">
                        {dayEvents.map((event, index) => (
                            <div
                                key={event.id}
                                className={`p-4 rounded-lg border ${
                                    newEvent && newEvent.id === event.id
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DayView; 