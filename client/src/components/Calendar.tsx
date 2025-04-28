import React, { useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-mobile.css';
import { Event } from '../services/eventService';
import CustomToolbar from './CustomToolbar';
import DayView from './DayView';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Setup the localizer for BigCalendar
const localizer = momentLocalizer(moment);

interface CalendarProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    newEvent?: Event;
}

const Calendar: React.FC<CalendarProps> = ({
    events,
    date,
    onNavigate,
    newEvent
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [selectedDate, setSelectedDate] = React.useState<Date>(date);

    // Group events by date and take only one event per date
    const uniqueDateEvents = React.useMemo(() => {
        const dateMap = new Map<string, Event>();
        
        events.forEach(event => {
            const dateKey = moment(event.startTime).format('YYYY-MM-DD');
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, event);
            }
        });

        return Array.from(dateMap.values());
    }, [events]);

    // Format the event for the calendar
    const formattedEvents = React.useMemo(() => 
        uniqueDateEvents.map(event => ({
            ...event,
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
        })), [uniqueDateEvents]);

    // Handle date selection
    const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
        setSelectedDate(slotInfo.start);
    }, []);

    // Handle navigation to a new month
    const handleNavigate = useCallback((newDate: Date) => {
        // Set selectedDate to the first day of the navigated month
        const firstOfMonth = moment(newDate).startOf('month').toDate();
        setSelectedDate(firstOfMonth);
        // Call the parent onNavigate if needed
        if (typeof onNavigate === 'function') {
            onNavigate(newDate);
        }
    }, [onNavigate]);

    // Restore default day cell styling
    const dayPropGetter = useCallback((date: Date) => {
        const today = moment().startOf('day');
        const cellDate = moment(date).startOf('day');
        const selectedDateMoment = moment(selectedDate).startOf('day');
        const hasEvent = uniqueDateEvents.some(event =>
            moment(event.startTime).format('YYYY-MM-DD') === cellDate.format('YYYY-MM-DD')
        );
        
        const isToday = cellDate.isSame(today, 'day');
        const isSelected = cellDate.isSame(selectedDateMoment, 'day');

        // Debug logs
        console.log('cellDate:', cellDate.format('YYYY-MM-DD'), 'selectedDate:', selectedDateMoment.format('YYYY-MM-DD'), 'isSelected:', isSelected);
        
        let className = 'rbc-day-cell';
        
        // If the date is selected, always show the background color
        if (isSelected) {
            className += ' bg-red-50';
        }
        // If the date has an event, add a blue background
        else if (hasEvent) {
            className += ' bg-blue-100';
        }
        
        // If it's today but not selected, show blue text
        if (isToday) {
            className += ' text-blue-500';
        }
        
        return { className };
    }, [selectedDate, uniqueDateEvents]);

    // Custom event component for month view to hide event names
    const EmptyEvent = () => null;

    return (
        <div className={`h-full ${isMobile ? 'flex flex-col' : 'flex'}`}>
            <div className={isMobile ? 'h-1/2' : 'w-2/3'}>
                <BigCalendar
                    localizer={localizer}
                    events={formattedEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    views={['month']}
                    defaultView="month"
                    date={date}
                    onNavigate={handleNavigate}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    components={{
                        toolbar: CustomToolbar,
                        event: EmptyEvent
                    }}
                    dayPropGetter={dayPropGetter}
                    popup={false}
                />
            </div>

            <div className={`${isMobile ? 'h-1/2 border-t border-gray-200' : 'w-1/3 border-l border-gray-200'}`}>
                <DayView
                    date={selectedDate}
                    events={events}
                    onNavigate={onNavigate}
                    newEvent={newEvent}
                />
            </div>
        </div>
    );
};

export default Calendar;