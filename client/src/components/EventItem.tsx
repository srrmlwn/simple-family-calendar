import React from 'react';
import { Event } from '../services/eventService';
import { formatTime } from '../utils/dateUtils';

interface EventItemProps {
    event: Event;
    isCompact?: boolean;
}

const EventItem: React.FC<EventItemProps> = ({ event, isCompact = false }) => {
    // For compact view (like in the calendar cells)
    if (isCompact) {
        return (
            <div
                className="text-xs truncate"
                style={{
                    color: 'inherit',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}
            >
                {event.title}
            </div>
        );
    }

    // For regular view (like in popovers or agenda view)
    return (
        <div className="max-w-full overflow-hidden">
            <div className="font-medium text-sm truncate">{event.title}</div>
            {!event.isAllDay && (
                <div className="text-xs">
                    {formatTime(new Date(event.startTime))}
                    {event.location && ` • ${event.location}`}
                </div>
            )}
        </div>
    );
};

export default EventItem;