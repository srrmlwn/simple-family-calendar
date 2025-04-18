import React from 'react';
import { momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Event } from '../services/eventService';

interface AgendaViewProps {
    events: Event[];
    date: Date;
    length?: number;
    localizer: ReturnType<typeof momentLocalizer>;
}

interface AgendaViewComponent extends React.FC<AgendaViewProps> {
    range: (date: Date, options: { length?: number }) => { start: Date; end: Date };
    navigate: (date: Date, action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', options: { length?: number }) => Date;
    title: (date: Date, options: { length?: number; localizer: ReturnType<typeof momentLocalizer> }) => string;
}

const AgendaView: AgendaViewComponent = ({ events, date, length = 30, localizer }) => {
    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Group events by date
    const eventsByDate = sortedEvents.reduce((acc, event) => {
        const startDate = moment(event.startTime).startOf('day').format('YYYY-MM-DD');
        if (!acc[startDate]) {
            acc[startDate] = [];
        }
        acc[startDate].push(event);
        return acc;
    }, {} as Record<string, Event[]>);

    // Get date range for the view
    const startDate = moment(date).startOf('day');
    const endDate = moment(date).add(length, 'days').endOf('day');
    const dateRange = [];
    let currentDate = startDate.clone();
    
    while (currentDate.isSameOrBefore(endDate)) {
        dateRange.push(currentDate.format('YYYY-MM-DD'));
        currentDate.add(1, 'day');
    }

    const renderDateHeader = (dateStr: string) => (
        <tr key={`header-${dateStr}`} className="rbc-agenda-date-header">
            <td colSpan={3} className="bg-gray-50 px-6 py-3 text-base font-medium text-gray-900">
                {localizer.format(new Date(dateStr), 'dddd, MMMM D, YYYY')}
            </td>
        </tr>
    );

    const renderEventRow = (event: Event, dateStr: string) => (
        <tr key={`${dateStr}-${event.id}`} className="rbc-agenda-event-row">
            <td className="px-6 py-3 text-sm text-gray-500 w-32">
                {event.isAllDay ? (
                    'All Day'
                ) : (
                    localizer.format(new Date(event.startTime), 'h:mm A')
                )}
            </td>
            <td className="px-6 py-3 text-sm text-gray-500 w-32">
                {event.isAllDay ? (
                    ''
                ) : (
                    localizer.format(new Date(event.endTime), 'h:mm A')
                )}
            </td>
            <td className="px-6 py-3 text-sm text-gray-900">
                <div className="font-medium">{event.title}</div>
                {event.location && (
                    <div className="text-gray-500 mt-1">
                        {event.location}
                    </div>
                )}
            </td>
        </tr>
    );

    return (
        <div className="rbc-agenda-view">
            <table className="rbc-agenda-table w-full">
                <thead>
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            Start
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                            End
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Event
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {dateRange.map(dateStr => {
                        const dayEvents = eventsByDate[dateStr] || [];
                        if (dayEvents.length === 0) return null;

                        return (
                            <React.Fragment key={dateStr}>
                                {renderDateHeader(dateStr)}
                                {dayEvents.map(event => renderEventRow(event, dateStr))}
                            </React.Fragment>
                        );
                    })}
                    {Object.keys(eventsByDate).length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                                No events to display.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// Static methods required by react-big-calendar
AgendaView.range = (date: Date, { length = 30 }) => {
    const start = moment(date).startOf('day').toDate();
    const end = moment(date).add(length, 'days').endOf('day').toDate();
    return { start, end };
};

AgendaView.navigate = (date: Date, action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', { length = 30 }) => {
    switch (action) {
        case 'PREV':
            return moment(date).subtract(length, 'days').toDate();
        case 'NEXT':
            return moment(date).add(length, 'days').toDate();
        default:
            return date;
    }
};

AgendaView.title = (date: Date, { length = 30, localizer }) => {
    const start = moment(date);
    const end = moment(date).add(length, 'days');
    return localizer.format({ start, end }, 'agendaHeaderFormat');
};

export default AgendaView; 