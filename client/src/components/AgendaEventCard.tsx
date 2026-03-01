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
    const primaryColor = event.familyMembers?.[0]?.color ?? '#6366f1';

    return (
        <div
            onClick={() => onClick(event)}
            className={`
                bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md
                cursor-pointer group transition-all overflow-hidden flex
                ${compact ? 'p-2 gap-2' : 'p-3 gap-3'}
            `}
            style={{ borderLeft: `3px solid ${primaryColor}` }}
        >
            {/* Time */}
            <div className={`flex flex-col items-start justify-start flex-shrink-0 ${compact ? 'min-w-[34px]' : 'min-w-[42px]'}`}>
                <span className={`font-bold text-blue-600 leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>
                    {moment(event.startTime).format('h:mm')}
                </span>
                <span className="text-xs text-gray-400 leading-tight">
                    {moment(event.startTime).format('A')}
                </span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <EventIcon className={`flex-shrink-0 text-gray-400 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                    <span className={`font-semibold text-gray-900 truncate leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
                        {event.title}
                    </span>
                </div>
                {!compact && (
                    <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                        {event.location && (
                            <>
                                <span className="truncate">{event.location}</span>
                                <span className="text-gray-300">·</span>
                            </>
                        )}
                        <span>
                            {moment(event.startTime).format('h:mm A')} – {moment(event.endTime).format('h:mm A')}
                        </span>
                    </div>
                )}
                {compact && event.location && (
                    <div className="mt-0.5 text-xs text-gray-400 truncate">{event.location}</div>
                )}
            </div>

            {/* Member dots + pencil */}
            <div className="flex flex-col items-end justify-between flex-shrink-0 gap-1">
                <Pencil className={`text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
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
