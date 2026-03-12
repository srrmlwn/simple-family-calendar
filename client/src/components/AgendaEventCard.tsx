import React from 'react';
import moment from 'moment';
import { Pencil } from 'lucide-react';
import { Event } from '../services/eventService';
import { getEventIcon } from '../utils/eventIcons';

interface AgendaEventCardProps {
    event: Event;
    onClick: (event: Event) => void;
    compact?: boolean;
}

const AgendaEventCard: React.FC<AgendaEventCardProps> = ({ event, onClick, compact = false }) => {
    const EventIcon = getEventIcon(event.title);
    const primaryColor = event.familyMembers?.[0]?.color ?? '#b35110';

    return (
        <div
            onClick={() => onClick(event)}
            className={`
                rounded-xl cursor-pointer group transition-all overflow-hidden flex
                ${compact ? 'p-2 gap-2' : 'p-3 gap-3'}
            `}
            style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${primaryColor}`,
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-mid)';
                (e.currentTarget as HTMLDivElement).style.borderLeftColor = primaryColor;
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(30,26,20,0.08)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.borderLeftColor = primaryColor;
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
        >
            {/* Time — Fira Code for that structured, precise feel */}
            <div className={`flex flex-col items-start justify-start flex-shrink-0 ${compact ? 'min-w-[34px]' : 'min-w-[40px]'}`}>
                <span
                    className={`font-mono font-medium leading-tight ${compact ? 'text-xs' : 'text-sm'}`}
                    style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}
                >
                    {moment(event.startTime).format('h:mm')}
                </span>
                <span className="font-mono text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                    {moment(event.startTime).format('A')}
                </span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <EventIcon className={`flex-shrink-0 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ color: 'var(--text-muted)' }} />
                    <span
                        className={`font-semibold truncate leading-snug ${compact ? 'text-xs' : 'text-sm'}`}
                        style={{ color: 'var(--text-base)' }}
                    >
                        {event.title}
                    </span>
                </div>
                {!compact && (
                    <div className="mt-0.5 text-xs flex items-center gap-1 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                        {event.location && (
                            <>
                                <span className="truncate">{event.location}</span>
                                <span style={{ color: 'var(--border-mid)' }}>·</span>
                            </>
                        )}
                        <span className="font-mono" style={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>
                            {moment(event.startTime).format('h:mm A')} – {moment(event.endTime).format('h:mm A')}
                        </span>
                    </div>
                )}
                {compact && event.location && (
                    <div className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{event.location}</div>
                )}
            </div>

            {/* Member dots + pencil */}
            <div className="flex flex-col items-end justify-between flex-shrink-0 gap-1">
                <Pencil
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
                    style={{ color: 'var(--text-muted)' }}
                />
                {event.familyMembers && event.familyMembers.length > 0 && (
                    <div className="flex gap-0.5">
                        {event.familyMembers.slice(0, 3).map(m => (
                            <span
                                key={m.id}
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: m.color }}
                                title={m.name}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgendaEventCard;
