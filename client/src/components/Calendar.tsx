import React from 'react';
import { Event } from '../services/eventService';
import DatePicker from './DatePicker';

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
    return (
        <DatePicker
            events={events}
            date={date}
            onNavigate={onNavigate}
            newEvent={newEvent}
        />
    );
};

export default Calendar;