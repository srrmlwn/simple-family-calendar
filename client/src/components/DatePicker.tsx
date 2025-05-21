import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Event, EventInput } from '../services/eventService';
import DayView from './DayView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    onEventUpdate: (eventId: string, eventData: EventInput) => Promise<void>;
    onEventDelete: (eventId: string) => Promise<void>;
}

const DatePicker: React.FC<DatePickerProps> = ({
    events,
    date,
    onNavigate,
    onEventUpdate,
    onEventDelete
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [browsingDate, setBrowsingDate] = useState<Date>(date);

    // Sync browsingDate with date prop
    useEffect(() => {
        setBrowsingDate(date);
    }, [date]);

    // Group events by date
    const eventsByDate = React.useMemo(() => {
        const dateMap = new Map<string, Event[]>();
        events.forEach(event => {
            const dateKey = moment(event.startTime).format('YYYY-MM-DD');
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, []);
            }
            dateMap.get(dateKey)?.push(event);
        });
        return dateMap;
    }, [events]);

    // Handle date selection
    const handleDateSelect = useCallback((newDate: Date) => {
        onNavigate(newDate);
    }, [onNavigate]);

    // Handle month navigation
    const changeMonth = useCallback((delta: number) => {
        const newDate = moment(browsingDate).add(delta, 'months').toDate();
        setBrowsingDate(newDate);
        onNavigate(newDate);
    }, [browsingDate, onNavigate]);

    // Get days for the current month view
    const days = React.useMemo(() => {
        const firstDay = moment(browsingDate).startOf('month');
        const lastDay = moment(browsingDate).endOf('month');
        const startDate = moment(firstDay).startOf('week');
        const endDate = moment(lastDay).endOf('week');
        const days: Date[] = [];
        let currentDate = startDate.clone();

        while (currentDate.isSameOrBefore(endDate)) {
            days.push(currentDate.toDate());
            currentDate.add(1, 'day');
        }

        return days;
    }, [browsingDate]);

    // Calculate number of weeks to display
    const numberOfWeeks = Math.ceil(days.length / 7);

    return (
        <div className={`${isMobile ? 'flex flex-col gap-4 p-2' : 'flex gap-6 p-6'} w-full h-full justify-center`}>
            <div className={`${isMobile ? 'min-h-fit shrink-0' : 'w-2/3 max-w-2xl shrink-0'}`}>
                <div className="bg-white rounded-lg shadow p-2 sm:p-4 h-full flex flex-col">
                    {/* Month Navigation */}
                    <div className="mb-1 flex items-center justify-between text-lg sm:text-xl">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => changeMonth(-1)}
                                className="p-1 hover:bg-gray-100 rounded-md"
                                title="Previous month"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-default text-base sm:text-lg">
                                <time dateTime={moment(browsingDate).format('YYYY-MM')}>
                                    <strong className="text-emphasis font-bold">
                                        {moment(browsingDate).format('MMMM')}
                                    </strong>
                                    <span className="text-subtle font-semibold">
                                        {' '}{moment(browsingDate).format('YYYY')}
                                    </span>
                                </time>
                            </span>
                            <button
                                onClick={() => changeMonth(1)}
                                className="p-1 hover:bg-gray-100 rounded-md"
                                title="Next month"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => onNavigate('TODAY')}
                            className="px-3 py-1.5 text-sm font-medium text-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-md transition-colors"
                            title="Go to today"
                        >
                            Today
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm font-medium text-gray-500 mb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className={`relative grid grid-cols-7 ${numberOfWeeks === 6 ? 'grid-rows-6' : 'grid-rows-5'} gap-1 text-center flex-grow`}>
                        {days.map((day, index) => {
                            const isCurrentMonth = moment(day).month() === moment(browsingDate).month();
                            const isToday = moment(day).isSame(moment(), 'day');
                            const isSelected = moment(day).isSame(moment(date), 'day');
                            const hasEvents = eventsByDate.has(moment(day).format('YYYY-MM-DD'));

                            return (
                                <div key={index} className="relative w-full aspect-square">
                                    <button
                                        type="button"
                                        className={`
                                            absolute inset-0 mx-auto w-full rounded-md border-2 text-center text-xs sm:text-sm font-medium transition
                                            ${isSelected ? 'border-blue-500 text-blue-600' : 'border-transparent'}
                                            ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                                            ${hasEvents ? 'bg-blue-50' : ''}
                                            hover:border-blue-200
                                        `}
                                        onClick={() => handleDateSelect(day)}
                                        disabled={!isCurrentMonth}
                                    >
                                        {moment(day).date()}
                                        {isToday && (
                                            <span className="absolute left-1/2 top-1/2 flex h-[4px] w-[4px] sm:h-[5px] sm:w-[5px] -translate-x-1/2 translate-y-[6px] sm:translate-y-[8px] items-center justify-center rounded-full bg-blue-500 align-middle">
                                                <span className="sr-only">Today</span>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Day View */}
            <div className={`${isMobile ? 'min-h-fit shrink-0' : 'w-1/3 shrink-0'}`}>
                <DayView
                    date={date}
                    events={events}
                    onNavigate={onNavigate}
                    onUpdateEvent={onEventUpdate}
                    onDeleteEvent={onEventDelete}
                />
            </div>
        </div>
    );
};

export default DatePicker; 