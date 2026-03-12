import React, { useState, useRef, useMemo, useEffect } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { Event, EventInput, RecurringScope } from '../services/eventService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { CalendarView } from '../types/calendar';
import AgendaEventCard from './AgendaEventCard';
import WeekStrip from './WeekStrip';
import MiniCalendarPopover from './MiniCalendarPopover';
import ViewSwitcher from './ViewSwitcher';
import EventDetails from './EventDetails';

interface AgendaViewProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    onEventUpdate: (eventId: string, eventData: EventInput) => Promise<void>;
    onEventDelete: (eventId: string, options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => Promise<void>;
    onCreateEvent: (date: Date) => void;
    onViewChange: (view: CalendarView) => void;
    onViewWindowChange?: (start: Date, end: Date) => void;
}

function dayLabel(day: Date): string {
    if (moment(day).isSame(moment(), 'day')) return 'TODAY';
    if (moment(day).isSame(moment().add(1, 'day'), 'day')) return 'TOMORROW';
    return moment(day).format('ddd, MMM D').toUpperCase();
}

const AgendaView: React.FC<AgendaViewProps> = ({
    events,
    date,
    onNavigate,
    onEventUpdate,
    onEventDelete,
    onCreateEvent,
    onViewChange,
    onViewWindowChange,
}) => {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showMiniCal, setShowMiniCal] = useState(false);
    const miniCalAnchorRef = useRef<HTMLButtonElement>(null);
    const [nowTime, setNowTime] = useState(new Date());

    // All hooks called unconditionally before any conditional return
    const isMobile = useMediaQuery('(max-width: 767px)');
    const isCompact = useMediaQuery('(max-width: 1279px)');

    // Keep "now" marker current every minute
    useEffect(() => {
        const interval = setInterval(() => setNowTime(new Date()), 60_000);
        return () => clearInterval(interval);
    }, []);

    // Events grouped and sorted by date
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

    // The 7 days of the week containing `date`
    const weekDays = useMemo(() => {
        const start = moment(date).startOf('week');
        return Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days').toDate());
    }, [date]);

    // Notify parent when visible week changes so it can expand the fetch window
    useEffect(() => {
        if (!onViewWindowChange || weekDays.length === 0) return;
        onViewWindowChange(weekDays[0], moment(weekDays[6]).endOf('day').toDate());
    }, [weekDays, onViewWindowChange]);

    const handleEventClick = (event: Event) => setSelectedEvent(event);

    const handleEventUpdate = async (eventId: string, eventData: EventInput) => {
        await onEventUpdate(eventId, eventData);
        setSelectedEvent(null);
    };

    const handleEventDelete = async (options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => {
        if (!selectedEvent) return;
        await onEventDelete(selectedEvent.id, options);
        setSelectedEvent(null);
    };

    const handleNavWeek = (delta: number) => {
        onNavigate(moment(date).add(delta, 'weeks').toDate());
    };

    // Split a day's events into past/upcoming relative to the current time
    const splitByNow = (dayEvts: Event[], isToday: boolean) => {
        if (!isToday) return { past: [] as Event[], upcoming: dayEvts };
        const nowM = moment(nowTime);
        return {
            past: dayEvts.filter(e => moment(e.endTime).isBefore(nowM)),
            upcoming: dayEvts.filter(e => !moment(e.endTime).isBefore(nowM)),
        };
    };

    // ─── Mobile: WeekStrip + scrollable day sections ─────────────────────────
    if (isMobile) {
        return (
            <>
                <div className="flex flex-col pb-[120px]">
                    {/* Mobile header — month label + view switcher */}
                    <div
                        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                        style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
                    >
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
                            {moment(date).format('MMMM YYYY')}
                        </span>
                        <ViewSwitcher view="week" onChange={onViewChange} />
                    </div>
                    <WeekStrip
                        selectedDate={date}
                        events={events}
                        onSelectDate={onNavigate}
                        onNavigateWeek={handleNavWeek}
                    />
                    <div>
                        {weekDays.map(day => {
                            const dayKey = moment(day).format('YYYY-MM-DD');
                            const dayEvts = eventsByDate.get(dayKey) ?? [];
                            const isToday = moment(day).isSame(moment(), 'day');
                            const isSelected = moment(day).isSame(moment(date), 'day');
                            const { past, upcoming } = splitByNow(dayEvts, isToday);
                            const showNowMarker = isToday && past.length > 0 && upcoming.length > 0;

                            return (
                                <div key={dayKey}>
                                    {/* Sticky day header */}
                                    <div
                                        className="sticky top-[57px] z-10 flex items-center justify-between px-4 py-2"
                                        style={{
                                            backgroundColor: isSelected ? 'var(--accent-bg)' : 'var(--bg-app)',
                                            borderBottom: '1px solid var(--border)',
                                            borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-xs font-bold tracking-wider"
                                                style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}
                                            >
                                                {dayLabel(day)}
                                            </span>
                                            {!isToday && (
                                                <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                                                    {moment(day).format('MMM D')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onCreateEvent(day)}
                                            className="p-1 rounded-md transition-colors"
                                            style={{ color: 'var(--text-muted)' }}
                                            aria-label={`Add event on ${moment(day).format('MMM D')}`}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Events */}
                                    <div className="px-3 py-2 space-y-2">
                                        {past.map(evt => (
                                            <div key={evt.id} className="opacity-50">
                                                <AgendaEventCard event={evt} onClick={handleEventClick} />
                                            </div>
                                        ))}
                                        {showNowMarker && (
                                            <div className="flex items-center gap-2 py-0.5">
                                                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                                <div className="flex-1 border-t border-red-300" />
                                                <span className="text-xs font-medium text-red-400">
                                                    {moment(nowTime).format('h:mm A')}
                                                </span>
                                            </div>
                                        )}
                                        {upcoming.map(evt => (
                                            <AgendaEventCard key={evt.id} event={evt} onClick={handleEventClick} />
                                        ))}
                                        {dayEvts.length === 0 && (
                                            <p className="text-xs text-gray-400 py-2">
                                                {isToday ? 'Nothing scheduled — tap below to add' : 'Nothing scheduled'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
    }

    // ─── Tablet / Desktop: 7-column week layout ──────────────────────────────
    return (
        <>
            <div
                className="flex flex-col h-full rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 1px 6px rgba(30,26,20,0.06)' }}
            >
                {/* Header bar */}
                <div
                    className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <div className="flex-1 flex items-center gap-2">
                    <div className="relative">
                        <button
                            ref={miniCalAnchorRef}
                            onClick={() => setShowMiniCal(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            style={{ color: 'var(--text-base)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <CalendarDays className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            <span>{moment(date).format('MMMM YYYY')}</span>
                        </button>
                        <MiniCalendarPopover
                            isOpen={showMiniCal}
                            onClose={() => setShowMiniCal(false)}
                            selectedDate={date}
                            events={events}
                            onSelectDate={onNavigate}
                            anchorRef={miniCalAnchorRef}
                        />
                    </div>
                    <ViewSwitcher view="week" onChange={onViewChange} />
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onNavigate('TODAY')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                            style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => handleNavWeek(-1)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            aria-label="Previous week"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleNavWeek(1)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            aria-label="Next week"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 7 day columns */}
                <div className="flex-1 flex overflow-hidden min-h-0 relative">
                    {weekDays.map(day => {
                        const dayKey = moment(day).format('YYYY-MM-DD');
                        const dayEvts = eventsByDate.get(dayKey) ?? [];
                        const isToday = moment(day).isSame(moment(), 'day');
                        const isSelected = moment(day).isSame(moment(date), 'day');
                        const { past, upcoming } = splitByNow(dayEvts, isToday);
                        const showNowMarker = isToday && past.length > 0 && upcoming.length > 0;

                        return (
                            <div
                                key={dayKey}
                                className="flex-1 flex flex-col overflow-hidden min-w-0 last:border-r-0"
                                style={{
                                    backgroundColor: isToday ? '#fff9f0' : 'var(--bg-surface)',
                                    borderRight: '1px solid var(--border)',
                                }}
                            >
                                {/* Column header */}
                                <div
                                    className="flex items-center justify-between px-2 py-2.5 cursor-pointer flex-shrink-0 group/col-header"
                                    style={{
                                        borderBottom: isSelected
                                            ? '2px solid var(--accent)'
                                            : '1px solid var(--border)',
                                    }}
                                    onClick={() => onNavigate(day)}
                                >
                                    <div className="flex flex-col">
                                        <span
                                            className="text-[10px] font-bold tracking-widest uppercase"
                                            style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}
                                        >
                                            {moment(day).format('ddd')}
                                        </span>
                                        <span
                                            className="font-mono text-xl font-bold leading-tight"
                                            style={{
                                                color: isToday
                                                    ? 'var(--today)'
                                                    : isSelected
                                                        ? 'var(--accent)'
                                                        : 'var(--text-base)',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {moment(day).date()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCreateEvent(day); }}
                                        className="p-1 rounded-md opacity-0 group-hover/col-header:opacity-100 transition-all"
                                        style={{ color: 'var(--text-muted)' }}
                                        aria-label={`Add event on ${moment(day).format('MMM D')}`}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Event list */}
                                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                                    {past.map(evt => (
                                        <div key={evt.id} className="opacity-35">
                                            <AgendaEventCard event={evt} onClick={handleEventClick} compact={isCompact} />
                                        </div>
                                    ))}
                                    {showNowMarker && (
                                        <div className="flex items-center gap-1.5 py-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--today)' }} />
                                            <div className="flex-1 border-t" style={{ borderColor: 'var(--today)', opacity: 0.4 }} />
                                            <span className="font-mono text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--today)' }}>
                                                {moment(nowTime).format('h:mm')}
                                            </span>
                                        </div>
                                    )}
                                    {upcoming.map(evt => (
                                        <AgendaEventCard
                                            key={evt.id}
                                            event={evt}
                                            onClick={handleEventClick}
                                            compact={isCompact}
                                        />
                                    ))}
                                    {dayEvts.length === 0 && (
                                        <p className="text-xs text-center py-4" style={{ color: 'var(--border-mid)' }}>—</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Nothing on this week — type in the chat to add events →
                            </p>
                        </div>
                    )}
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

export default AgendaView;
