import React from 'react';
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
    onNavigate: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({
    events,
    date,
    onNavigate
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [selectedDate, setSelectedDate] = React.useState<Date>(date);

    console.log('Calendar render:', {
        isMobile,
        selectedDate: selectedDate?.toISOString(),
        eventsCount: events.length
    });

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
    const formattedEvents = uniqueDateEvents.map(event => ({
        ...event,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
    }));

    // Custom event component that shows just a dot indicator
    const EventIndicator = () => (
        <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mt-1" />
    );

    // Handle date selection
    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        console.log('Date selected:', slotInfo.start.toISOString());
        setSelectedDate(slotInfo.start);
    };

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
                    onNavigate={onNavigate}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    components={{
                        event: EventIndicator,
                        toolbar: CustomToolbar
                    }}
                    popup={false}
                />
            </div>

            <div className={`${isMobile ? 'h-1/2 border-t border-gray-200' : 'w-1/3 border-l border-gray-200'}`}>
                <DayView
                    date={selectedDate}
                    events={events}
                />
            </div>
        </div>
    );
};

export default Calendar;