import React, { useMemo, useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '../services/eventService';

interface MiniCalendarPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    events: Event[];
    onSelectDate: (date: Date) => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

const MiniCalendarPopover: React.FC<MiniCalendarPopoverProps> = ({
    isOpen, onClose, selectedDate, events, onSelectDate, anchorRef,
}) => {
    const [browsingDate, setBrowsingDate] = useState(selectedDate);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setBrowsingDate(selectedDate); }, [selectedDate]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(e.target as Node)
            ) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose, anchorRef]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, boolean>();
        events.forEach(evt => map.set(moment(evt.startTime).format('YYYY-MM-DD'), true));
        return map;
    }, [events]);

    const days = useMemo(() => {
        const start = moment(browsingDate).startOf('month').startOf('week');
        const end = moment(browsingDate).endOf('month').endOf('week');
        const result: Date[] = [];
        let cur = start.clone();
        while (cur.isSameOrBefore(end)) {
            result.push(cur.toDate());
            cur.add(1, 'day');
        }
        return result;
    }, [browsingDate]);

    if (!isOpen) return null;

    return (
        <div
            ref={popoverRef}
            className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-3"
            style={{ width: '248px' }}
        >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={() => setBrowsingDate(d => moment(d).subtract(1, 'month').toDate())}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <span className="text-xs font-semibold text-gray-700">
                    {moment(browsingDate).format('MMMM YYYY')}
                </span>
                <button
                    onClick={() => setBrowsingDate(d => moment(d).add(1, 'month').toDate())}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-0.5">{d}</div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day, i) => {
                    const inMonth = moment(day).month() === moment(browsingDate).month();
                    const isToday = moment(day).isSame(moment(), 'day');
                    const isSelected = moment(day).isSame(moment(selectedDate), 'day');
                    const hasEvents = eventsByDate.has(moment(day).format('YYYY-MM-DD'));

                    return (
                        <button
                            key={i}
                            onClick={() => { if (inMonth) { onSelectDate(day); onClose(); } }}
                            disabled={!inMonth}
                            className={`
                                relative flex flex-col items-center justify-center py-1 rounded-md
                                text-[11px] font-medium transition-colors
                                ${!inMonth ? 'text-gray-300 cursor-default' : ''}
                                ${isSelected && inMonth ? 'bg-indigo-600 text-white' : ''}
                                ${isToday && !isSelected ? 'text-blue-600 font-bold' : ''}
                                ${!isSelected && inMonth ? 'hover:bg-gray-100' : ''}
                                ${!isSelected && !isToday && inMonth ? 'text-gray-700' : ''}
                            `}
                        >
                            {moment(day).date()}
                            {hasEvents && inMonth && (
                                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                                    isSelected ? 'bg-white/70' : 'bg-indigo-400'
                                }`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Today shortcut */}
            <button
                onClick={() => { onSelectDate(new Date()); onClose(); }}
                className="mt-2 w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 hover:bg-indigo-50 rounded-md transition-colors"
            >
                Today
            </button>
        </div>
    );
};

export default MiniCalendarPopover;
