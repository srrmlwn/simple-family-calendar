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
        <div
            className="sticky top-0 z-10 flex items-center gap-1 px-2 py-2 flex-shrink-0"
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                boxShadow: '0 1px 4px rgba(30,26,20,0.06)',
            }}
        >
            <button
                onClick={() => onNavigateWeek(-1)}
                className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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

                    let pillBg = 'transparent';
                    let dayNumColor = 'var(--text-base)';
                    let dayLetterColor = 'var(--text-muted)';

                    if (isSelected) {
                        pillBg = 'var(--accent)';
                        dayNumColor = '#fefcf8';
                        dayLetterColor = 'rgba(254,252,248,0.7)';
                    } else if (isToday) {
                        pillBg = 'var(--accent-bg)';
                        dayNumColor = 'var(--today)';
                        dayLetterColor = 'var(--today)';
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => onSelectDate(day)}
                            className="flex flex-col items-center py-1.5 rounded-xl transition-all"
                            style={{ backgroundColor: pillBg }}
                            onMouseEnter={e => {
                                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-app)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = pillBg;
                            }}
                        >
                            <span className="text-[10px] font-medium leading-tight" style={{ color: dayLetterColor }}>
                                {moment(day).format('dd')[0]}
                            </span>
                            <span className="text-sm font-bold leading-tight font-mono" style={{ color: dayNumColor, fontVariantNumeric: 'tabular-nums' }}>
                                {moment(day).date()}
                            </span>
                            <div className="flex gap-0.5 mt-0.5 h-1.5 items-center justify-center">
                                {dotColors.length > 0 ? dotColors.map((color, di) => (
                                    <span
                                        key={di}
                                        className="w-1 h-1 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: isSelected ? 'rgba(254,252,248,0.6)' : color }}
                                    />
                                )) : <span className="w-1 h-1" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => onNavigateWeek(1)}
                className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                aria-label="Next week"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};

export default WeekStrip;
