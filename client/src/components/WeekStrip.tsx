import React, { useMemo } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../services/eventService';

interface WeekStripProps {
    selectedDate: Date;
    events: Event[];
    onSelectDate: (date: Date) => void;
    onNavigateWeek: (delta: number) => void;
}

const WeekStrip: React.FC<WeekStripProps> = ({ selectedDate, events, onSelectDate, onNavigateWeek }) => {
    const weekDays = useMemo(() => {
        const start = moment(selectedDate).startOf('week');
        return Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days').toDate());
    }, [selectedDate]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, Event[]>();
        events.forEach(evt => {
            const key = moment(evt.startTime).format('YYYY-MM-DD');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(evt);
        });
        return map;
    }, [events]);

    return (
        <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-2 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
            <button
                onClick={() => onNavigateWeek(-1)}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 flex-shrink-0"
                aria-label="Previous week"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 grid grid-cols-7 gap-0.5">
                {weekDays.map((day, i) => {
                    const isSelected = moment(day).isSame(moment(selectedDate), 'day');
                    const isToday = moment(day).isSame(moment(), 'day');
                    const dayEvts = eventsByDate.get(moment(day).format('YYYY-MM-DD')) ?? [];
                    const dotColors = Array.from(new Set(
                        dayEvts.flatMap(e => e.familyMembers ?? []).map(m => m.color)
                    )).slice(0, 3);

                    return (
                        <button
                            key={i}
                            onClick={() => onSelectDate(day)}
                            className={`
                                flex flex-col items-center py-1.5 rounded-xl transition-colors
                                ${isSelected ? 'bg-indigo-600' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}
                            `}
                        >
                            <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                                {moment(day).format('dd')[0]}
                            </span>
                            <span className={`text-sm font-bold leading-tight ${
                                isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-800'
                            }`}>
                                {moment(day).date()}
                            </span>
                            <div className="flex gap-0.5 mt-0.5 h-1.5 items-center justify-center">
                                {dotColors.length > 0 ? dotColors.map((color, di) => (
                                    <span
                                        key={di}
                                        className="w-1 h-1 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : color }}
                                    />
                                )) : <span className="w-1 h-1" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => onNavigateWeek(1)}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 flex-shrink-0"
                aria-label="Next week"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};

export default WeekStrip;
