import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Event, EventInput, RecurringScope } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { CalendarView } from '../types/calendar';
import ViewSwitcher from './ViewSwitcher';
import EventDetails from './EventDetails';

interface MonthViewProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    onEventUpdate: (eventId: string, eventData: EventInput) => Promise<void>;
    onEventDelete: (eventId: string, options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => Promise<void>;
    onCreateEvent: (date: Date) => void;
    onViewChange: (view: CalendarView) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
    events,
    date,
    onNavigate,
    onEventUpdate,
    onEventDelete,
    onCreateEvent,
    onViewChange,
}) => {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const MAX_VISIBLE = isMobile ? 2 : 3;

    // Build the week rows for the current month
    const weeks = useMemo(() => {
        const start = moment(date).startOf('month').startOf('week');
        const end = moment(date).endOf('month').endOf('week');
        const result: Date[][] = [];
        let cur = start.clone();
        while (cur.isSameOrBefore(end)) {
            const week: Date[] = [];
            for (let i = 0; i < 7; i++) {
                week.push(cur.toDate());
                cur.add(1, 'day');
            }
            result.push(week);
        }
        return result;
    }, [date]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, Event[]>();
        events.forEach(evt => {
            const key = moment(evt.startTime).format('YYYY-MM-DD');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(evt);
        });
        map.forEach(evts => evts.sort((a, b) => moment(a.startTime).diff(moment(b.startTime))));
        return map;
    }, [events]);

    const handleEventUpdate = async (eventId: string, eventData: EventInput) => {
        await onEventUpdate(eventId, eventData);
        setSelectedEvent(null);
    };

    const handleEventDelete = async (options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => {
        if (!selectedEvent) return;
        await onEventDelete(selectedEvent.id, options);
        setSelectedEvent(null);
    };

    // Clicking a day number drills into the week view
    const handleDayClick = (day: Date) => {
        onNavigate(day);
        onViewChange('week');
    };

    return (
        <>
            <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3 flex-1">
                        <span className="text-base font-semibold text-gray-800">
                            {moment(date).format('MMMM YYYY')}
                        </span>
                        <ViewSwitcher view="month" onChange={onViewChange} />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onNavigate('TODAY')}
                            className="px-3 py-1.5 text-sm font-medium text-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => onNavigate(moment(date).subtract(1, 'month').toDate())}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onNavigate(moment(date).add(1, 'month').toDate())}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                            {isMobile ? d[0] : d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid — rows share available height equally */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {weeks.map((week, wi) => (
                        <div
                            key={wi}
                            className="flex flex-1 border-b border-gray-100 last:border-b-0 min-h-0"
                        >
                            {week.map((day, di) => {
                                const inMonth = moment(day).month() === moment(date).month();
                                const isToday = moment(day).isSame(moment(), 'day');
                                const dayKey = moment(day).format('YYYY-MM-DD');
                                const dayEvts = eventsByDate.get(dayKey) ?? [];
                                const visibleEvts = dayEvts.slice(0, MAX_VISIBLE);
                                const overflow = dayEvts.length - MAX_VISIBLE;

                                return (
                                    <div
                                        key={di}
                                        className={`
                                            flex-1 border-r border-gray-100 last:border-r-0
                                            p-1 min-w-0 overflow-hidden group relative
                                            ${!inMonth ? 'bg-gray-50/50' : ''}
                                            ${isToday ? 'bg-blue-50/20' : ''}
                                        `}
                                    >
                                        {/* Day number row */}
                                        <div className="flex items-center justify-between mb-0.5">
                                            <button
                                                onClick={() => inMonth && handleDayClick(day)}
                                                disabled={!inMonth}
                                                className={`
                                                    w-6 h-6 rounded-full flex items-center justify-center
                                                    text-xs font-medium transition-colors flex-shrink-0
                                                    ${isToday ? 'bg-blue-500 text-white' : ''}
                                                    ${!inMonth ? 'text-gray-300 cursor-default' : ''}
                                                    ${inMonth && !isToday ? 'text-gray-700 hover:bg-gray-100 cursor-pointer' : ''}
                                                `}
                                            >
                                                {moment(day).date()}
                                            </button>
                                            {inMonth && (
                                                <button
                                                    onClick={() => onCreateEvent(day)}
                                                    className="p-0.5 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                                    aria-label={`Add event on ${moment(day).format('MMM D')}`}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Events */}
                                        {!isMobile ? (
                                            <div className="space-y-0.5">
                                                {visibleEvts.map(evt => (
                                                    <button
                                                        key={evt.id}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                                                        className="w-full text-left text-[11px] truncate rounded px-1 py-0.5 font-medium text-white hover:opacity-80 transition-opacity leading-tight"
                                                        style={{ backgroundColor: evt.familyMembers?.[0]?.color ?? 'var(--accent)' }}
                                                        title={`${moment(evt.startTime).format('h:mm A')} ${evt.title}`}
                                                    >
                                                        {!evt.isAllDay && (
                                                            <span className="opacity-75 mr-0.5">
                                                                {moment(evt.startTime).format('h:mm')}
                                                            </span>
                                                        )}
                                                        {evt.title}
                                                    </button>
                                                ))}
                                                {overflow > 0 && (
                                                    <button
                                                        onClick={() => handleDayClick(day)}
                                                        className="w-full text-left text-[11px] px-1 font-medium transition-colors"
                                                        style={{ color: 'var(--accent)' }}
                                                    >
                                                        +{overflow} more
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            // Mobile: colored dots only — tap day to see events in week view
                                            <div className="flex gap-0.5 flex-wrap mt-0.5">
                                                {dayEvts.slice(0, 3).map((evt, i) => (
                                                    <span
                                                        key={i}
                                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: evt.familyMembers?.[0]?.color ?? 'var(--accent)' }}
                                                    />
                                                ))}
                                                {dayEvts.length > 3 && (
                                                    <span className="text-[9px] text-gray-400 font-medium leading-none self-center">
                                                        +{dayEvts.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {selectedEvent && (
                <EventDetails
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onUpdate={(data) => handleEventUpdate(selectedEvent.id, data)}
                    onDelete={handleEventDelete}
                />
            )}
        </>
    );
};

export default MonthView;
