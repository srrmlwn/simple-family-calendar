import React from 'react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-mobile.css';
import { Event } from '../services/eventService';
import EventItem from './EventItem';
import AgendaView from './AgendaView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import CustomToolbar from './CustomToolbar';

// Setup the localizer for BigCalendar
const localizer = momentLocalizer(moment);

// Constants
const MOBILE_BREAKPOINT = '(max-width: 768px)';
const AVAILABLE_VIEWS = {
    MOBILE: [Views.MONTH, Views.DAY, Views.AGENDA],
    DESKTOP: [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]
};

interface CalendarProps {
    events: Event[];
    onSelectEvent: (event: Event) => void;
    onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
    view: View;
    date: Date;
    onViewChange: (view: string) => void;
    onNavigate: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({
    events,
    onSelectEvent,
    onSelectSlot,
    view,
    date,
    onViewChange,
    onNavigate
}) => {
    const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

    // Format the event for the calendar
    const formattedEvents = events.map(event => ({
        ...event,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
    }));

    // Custom styling for events
    const eventStyleGetter = (event: any) => {
        return {
            style: {
                backgroundColor: event.color || '#e0e7ff',
                color: event.color ? 'white' : '#4f46e5',
            },
        };
    };

    // Determine which views to show based on screen size
    const availableViews = isMobile ? AVAILABLE_VIEWS.MOBILE : AVAILABLE_VIEWS.DESKTOP;

    // Default to agenda view on mobile if current view is week
    React.useEffect(() => {
        if (isMobile && view === Views.WEEK) {
            onViewChange(Views.AGENDA);
        }
    }, [isMobile, view, onViewChange]);

    return (
        <div className="h-full">
            <BigCalendar
                localizer={localizer}
                events={formattedEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={availableViews}
                step={60}
                showMultiDayTimes
                view={view}
                date={date}
                onView={onViewChange}
                onNavigate={onNavigate}
                selectable
                onSelectEvent={onSelectEvent}
                onSelectSlot={onSelectSlot}
                eventPropGetter={eventStyleGetter}
                components={{
                    event: ({ event }) => <EventItem event={event} />,
                    agenda: AgendaView,
                    toolbar: CustomToolbar
                }}
                popup={isMobile}
            />
        </div>
    );
};

export default Calendar;