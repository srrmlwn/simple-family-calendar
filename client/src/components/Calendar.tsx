import React from 'react';
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Event } from '../services/eventService';
import EventItem from './EventItem';

// Setup the localizer for BigCalendar
const localizer = momentLocalizer(moment);

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
    // Format the event for the calendar
    const formattedEvents = events.map(event => ({
        ...event,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
    }));

    // Custom styling for events
    const eventStyleGetter = (event: any) => {
        const backgroundColor = event.color || '#3B82F6'; // Default to blue if no color specified

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                color: 'white',
                border: 'none',
                display: 'block',
            },
        };
    };

    return (
        <div className="h-full">
            <BigCalendar
                localizer={localizer}
                events={formattedEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={['month', 'week', 'day', 'agenda']}
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
                }}
            />
        </div>
    );
};

export default Calendar;