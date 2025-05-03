import React, { useCallback, useEffect } from 'react';
import moment from 'moment';
import { Event } from '../services/eventService';
import DayView from './DayView';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface DatePickerProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    newEvent?: Event;
}

const DatePicker: React.FC<DatePickerProps> = ({
    events,
    date,
    onNavigate,
    newEvent
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [selectedDate, setSelectedDate] = React.useState<Date>(date);
    const [browsingDate, setBrowsingDate] = React.useState<Date>(date);

    // Sync selectedDate with date prop
    useEffect(() => {
        setSelectedDate(date);
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
        setSelectedDate(newDate);
        onNavigate(newDate);
    }, [onNavigate]);

    // Handle month navigation
    const changeMonth = useCallback((delta: number) => {
        const newDate = moment(browsingDate).add(delta, 'months').toDate();
        setBrowsingDate(newDate);
        onNavigate(newDate);
    }, [browsingDate, onNavigate]);

    // Get days for the current month
    const getDaysInMonth = useCallback(() => {
        const startOfMonth = moment(browsingDate).startOf('month');
        const endOfMonth = moment(browsingDate).endOf('month');
        const days: Date[] = [];
        
        // Add days from previous month to fill the first week
        const firstDayOfWeek = startOfMonth.day();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push(moment(startOfMonth).subtract(i + 1, 'days').toDate());
        }
        
        // Add days of current month
        for (let i = 1; i <= endOfMonth.date(); i++) {
            days.push(moment(startOfMonth).date(i).toDate());
        }
        
        // Add days from next month to complete the last week
        const lastDayOfWeek = endOfMonth.day();
        const daysNeeded = 6 - lastDayOfWeek; // Days needed to complete the week (0-6)
        for (let i = 1; i <= daysNeeded; i++) {
            days.push(moment(endOfMonth).add(i, 'days').toDate());
        }
        
        return days;
    }, [browsingDate]);

    const days = getDaysInMonth();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Calculate number of weeks needed
    const numberOfWeeks = Math.ceil(days.length / 7);

    return (
        <div className={`${isMobile ? 'flex flex-col gap-4 p-2' : 'flex gap-6 p-6'} w-full h-full justify-center`}>
            <div className={`${isMobile ? 'min-h-fit shrink-0' : 'w-2/3 max-w-2xl shrink-0'}`}>
                <div className="bg-white rounded-lg shadow p-2 sm:p-4 h-full flex flex-col">
                    {/* Month Navigation */}
                    <div className="mb-1 flex items-center justify-between text-lg sm:text-xl">
                        <span className="text-default w-1/2 text-sm sm:text-base">
                            <time dateTime={moment(browsingDate).format('YYYY-MM')}>
                                <strong className="text-emphasis font-semibold">
                                    {moment(browsingDate).format('MMMM')}
                                </strong>
                                <span className="text-subtle font-medium">
                                    {' '}{moment(browsingDate).format('YYYY')}
                                </span>
                            </time>
                        </span>
                        <div className="text-emphasis">
                            <div className="flex">
                                <button
                                    className="group p-1 opacity-70 transition hover:opacity-100"
                                    onClick={() => changeMonth(-1)}
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    className="group p-1 opacity-70 transition hover:opacity-100"
                                    onClick={() => changeMonth(1)}
                                    aria-label="Next month"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div className="border-subtle mb-2 grid grid-cols-7 gap-1 sm:gap-2 border-b border-t text-center">
                        {weekDays.map((day) => (
                            <div key={day} className="text-emphasis my-2 sm:my-3 text-xs font-medium uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className={`relative grid grid-cols-7 ${numberOfWeeks === 6 ? 'grid-rows-6' : 'grid-rows-5'} gap-1 text-center flex-grow`}>
                        {days.map((day, index) => {
                            const isCurrentMonth = moment(day).month() === moment(browsingDate).month();
                            const isToday = moment(day).isSame(moment(), 'day');
                            const isSelected = moment(day).isSame(moment(selectedDate), 'day');
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
                    date={selectedDate}
                    events={events}
                    onNavigate={onNavigate}
                    newEvent={newEvent}
                />
            </div>
        </div>
    );
};

export default DatePicker; 