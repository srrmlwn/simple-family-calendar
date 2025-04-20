import React, { useState } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-mobile.css';
import { Event } from '../services/eventService';
import EventItem from './EventItem';
import AgendaView from './AgendaView';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, LayoutGrid } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

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

const CustomToolbar = ({ onNavigate, onView, date, view, views }: any) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const monthYear = moment(date).format('MMMM YYYY');
    const [showViewDropdown, setShowViewDropdown] = useState(false);
    
    const viewNames = {
        month: 'Month',
        week: 'Week',
        day: 'Day',
        agenda: 'Agenda'
    };

    return (
        <div className="rbc-toolbar-custom">
            <button 
                onClick={() => onNavigate('TODAY')} 
                className="toolbar-btn today-btn"
                aria-label="Go to today"
            >
                <CalendarDays size={18} />
            </button>

            <div className="month-nav">
                <button 
                    onClick={() => onNavigate('PREV')}
                    className="toolbar-btn nav-btn"
                    aria-label="Previous"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="month-label">{monthYear}</span>
                <button 
                    onClick={() => onNavigate('NEXT')}
                    className="toolbar-btn nav-btn"
                    aria-label="Next"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="view-selector">
                <button 
                    className="toolbar-btn view-btn"
                    onClick={() => setShowViewDropdown(!showViewDropdown)}
                    aria-haspopup="true"
                    aria-expanded={showViewDropdown}
                    aria-label="Change view"
                >
                    <LayoutGrid size={18} />
                </button>
                
                {showViewDropdown && (
                    <div 
                        className="view-dropdown-menu"
                        role="menu"
                    >
                        {views.map((name: string) => (
                            <button
                                key={name}
                                onClick={() => {
                                    onView(name);
                                    setShowViewDropdown(false);
                                }}
                                className={`view-option ${view === name ? 'active' : ''}`}
                                role="menuitem"
                            >
                                {viewNames[name as keyof typeof viewNames]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Calendar: React.FC<CalendarProps> = ({
    events,
    onSelectEvent,
    onSelectSlot,
    view,
    date,
    onViewChange,
    onNavigate
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

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
    const availableViews = isMobile
        ? [Views.MONTH, Views.DAY, Views.AGENDA]
        : [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA];

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