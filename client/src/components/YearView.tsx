import React, { useMemo, useState } from 'react';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event, EventInput, RecurringScope } from '../services/eventService';
import { CalendarView } from '../types/calendar';
import ViewSwitcher from './ViewSwitcher';
import EventDetails from './EventDetails';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS      = 28;   // ~4 weeks per row → ~14 rows for the year
const MAX_LANES = 3;
const DAY_H     = 24;   // px — day number row
const LANE_H    = 16;   // px — each event bar lane
const ROW_H     = DAY_H + MAX_LANES * LANE_H + 4;  // 76px total

// One distinct colour per month for the inline month tags
const MONTH_COLORS = [
    '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e',
    '#f97316', '#ca8a04', '#16a34a', '#0d9488',
    '#0284c7', '#2563eb', '#7c3aed', '#c026d3',
];

interface YearViewProps {
    events: Event[];
    date: Date;
    onNavigate: (date: Date | 'TODAY') => void;
    onViewChange: (view: CalendarView) => void;
    onEventUpdate: (eventId: string, eventData: EventInput) => Promise<void>;
    onEventDelete: (eventId: string, options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => Promise<void>;
}

// ─── Grid cell builder ────────────────────────────────────────────────────────

interface GridCell {
    date: Date;
    idx:  number;
}

function buildGrid(year: number): GridCell[] {
    const jan1  = moment({ year, month: 0,  date: 1 });
    const dec31 = moment({ year, month: 11, date: 31 });
    const cells: GridCell[] = [];
    let cur = jan1.clone(), idx = 0;
    while (cur.isSameOrBefore(dec31)) {
        cells.push({ date: cur.toDate(), idx: idx++ });
        cur.add(1, 'day');
    }
    return cells;
}

// ─── Event row-segment builder ────────────────────────────────────────────────

interface RowSeg {
    event: Event;
    startCol: number;  // inclusive
    endCol:   number;  // exclusive
    lane: number;
    clippedAtStart: boolean;
    clippedAtEnd:   boolean;
}

function buildRowSegs(events: Event[], year: number, cells: GridCell[]): RowSeg[][] {
    const numRows = Math.ceil(cells.length / COLS);
    const rows: RowSeg[][] = Array.from({ length: numRows }, () => []);

    const yearStart = moment({ year, month: 0,  date: 1 });
    const yearEnd   = moment({ year, month: 11, date: 31 }).endOf('day');

    const dateToIdx = new Map<string, number>();
    cells.forEach((c, i) => dateToIdx.set(moment(c.date).format('YYYY-MM-DD'), i));

    const relevant = events.filter(evt => {
        const s = moment(evt.startTime);
        const e = moment(evt.endTime ?? evt.startTime);
        return s.isSameOrBefore(yearEnd) && e.isSameOrAfter(yearStart);
    });

    relevant.sort((a, b) => {
        const d = moment(a.startTime).diff(moment(b.startTime));
        if (d !== 0) return d;
        const aDur = moment(a.endTime ?? a.startTime).diff(moment(a.startTime), 'days');
        const bDur = moment(b.endTime ?? b.startTime).diff(moment(b.startTime), 'days');
        return bDur - aDur;
    });

    const laneEnds: number[] = [];

    relevant.forEach(evt => {
        const s = moment(evt.startTime);
        const e = moment(evt.endTime ?? evt.startTime);

        const cs = moment.max(s.clone().startOf('day'), yearStart.clone());
        const ce = moment.min(e.clone().startOf('day'), yearEnd.clone().startOf('day'));

        const si = dateToIdx.get(cs.format('YYYY-MM-DD'));
        const ei = dateToIdx.get(ce.format('YYYY-MM-DD'));
        if (si === undefined || ei === undefined) return;

        let lane = laneEnds.findIndex(end => end <= si);
        if (lane < 0) lane = laneEnds.length;
        if (lane >= MAX_LANES) return;
        laneEnds[lane] = ei + 1;

        const startRow = Math.floor(si / COLS);
        const endRow   = Math.floor(ei / COLS);

        for (let r = startRow; r <= endRow; r++) {
            const segSi = r === startRow ? si : r * COLS;
            const segEi = r === endRow   ? ei : (r + 1) * COLS - 1;
            rows[r].push({
                event:          evt,
                startCol:       segSi % COLS,
                endCol:         segEi % COLS + 1,
                lane,
                clippedAtStart: r > startRow,
                clippedAtEnd:   r < endRow,
            });
        }
    });

    return rows;
}

// ─── YearView ────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n / COLS) * 100}%`;

const YearView: React.FC<YearViewProps> = ({ events, date, onNavigate, onViewChange, onEventUpdate, onEventDelete }) => {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const year = date.getFullYear();

    const cells   = useMemo(() => buildGrid(year), [year]);
    const rowSegs = useMemo(() => buildRowSegs(events, year, cells), [events, year, cells]);

    const numRows  = Math.ceil(cells.length / COLS);
    const todayKey = moment().format('YYYY-MM-DD');
    const selKey   = moment(date).format('YYYY-MM-DD');

    const handleNavYear  = (d: number) => onNavigate(moment(date).add(d, 'years').toDate());
    const handleDayClick = (day: Date) => { onNavigate(day); onViewChange('week'); };

    return (
        <>
        <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-gray-800">{year}</span>
                    <ViewSwitcher view="year" onChange={onViewChange} />
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onNavigate('TODAY')}
                        className="px-3 py-1.5 text-sm font-medium text-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button onClick={() => handleNavYear(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Previous year">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleNavYear(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Next year">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Continuous 28-column grid */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
                <div style={{ minWidth: 480 }}>
                    {Array.from({ length: numRows }, (_, r) => {
                        const rowCells = cells.slice(r * COLS, (r + 1) * COLS);
                        const segs     = rowSegs[r] ?? [];

                        return (
                            <div
                                key={r}
                                className="relative border-b border-gray-50 last:border-b-0"
                                style={{ height: ROW_H }}
                            >
                                {/* Day cells */}
                                <div className="absolute inset-x-0 top-0 flex" style={{ height: DAY_H }}>
                                    {rowCells.map((cell, ci) => {
                                        const d        = cell.date;
                                        const dayNum   = d.getDate();
                                        const monthIdx = d.getMonth();
                                        const isFirst  = dayNum === 1;
                                        const dateKey  = moment(d).format('YYYY-MM-DD');
                                        const isToday    = dateKey === todayKey;
                                        const isSelected = dateKey === selKey;

                                        return (
                                            <div
                                                key={ci}
                                                className={`
                                                    relative flex-1 flex flex-col items-center justify-center
                                                    cursor-pointer group/day
                                                    ${isFirst ? 'border-l-2 border-l-warm-200' : ''}
                                                `}
                                                onClick={() => handleDayClick(d)}
                                            >
                                                {isFirst && (
                                                    <span
                                                        className="absolute top-0.5 left-1 text-[9px] font-bold uppercase tracking-wide leading-none pointer-events-none select-none"
                                                        style={{ color: MONTH_COLORS[monthIdx] }}
                                                    >
                                                        {moment(d).format('MMM')}
                                                    </span>
                                                )}

                                                <span className={`
                                                    text-[10px] font-medium w-4 h-4 flex items-center justify-center
                                                    rounded-full leading-none select-none
                                                    ${isToday    ? 'bg-blue-500 text-white' : ''}
                                                    ${isSelected && !isToday ? 'bg-warm-200' : ''}
                                                    ${!isToday && !isSelected
                                                        ? 'text-gray-400 group-hover/day:bg-gray-100 group-hover/day:text-gray-700'
                                                        : ''}
                                                `}>
                                                    {dayNum}
                                                </span>

                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Event bars */}
                                {segs.map((seg, si) => {
                                    const color = seg.event.familyMembers?.[0]?.color ?? 'var(--accent)';
                                    const br =
                                        seg.clippedAtStart && seg.clippedAtEnd ? 0
                                        : seg.clippedAtStart ? '0 3px 3px 0'
                                        : seg.clippedAtEnd   ? '3px 0 0 3px'
                                        : 3;

                                    return (
                                        <div
                                            key={si}
                                            title={seg.event.title}
                                            className="absolute flex items-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                            style={{
                                                left:            pct(seg.startCol),
                                                width:           pct(seg.endCol - seg.startCol),
                                                top:             DAY_H + seg.lane * LANE_H + 1,
                                                height:          LANE_H - 2,
                                                backgroundColor: color,
                                                borderRadius:    br,
                                                paddingLeft:     seg.clippedAtStart ? 0 : 3,
                                            }}
                                            onClick={() => setSelectedEvent(seg.event)}
                                        >
                                            {!seg.clippedAtStart && (
                                                <span className="text-white text-[10px] font-medium truncate leading-none select-none">
                                                    {seg.event.title}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {selectedEvent && (
            <EventDetails
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onUpdate={async (data) => {
                    await onEventUpdate(selectedEvent.id, data);
                    setSelectedEvent(null);
                }}
                onDelete={async (options) => {
                    await onEventDelete(selectedEvent.id, options);
                    setSelectedEvent(null);
                }}
            />
        )}
    </>
    );
};

export default YearView;
