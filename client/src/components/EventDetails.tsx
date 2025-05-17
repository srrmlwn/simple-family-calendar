import React, { useState } from 'react';
import { Event, EventInput } from '../services/eventService';
import { EventState, EventStatus } from '../utils/eventValidation';
import BottomSheet from './BottomSheet';
import EventForm from './EventForm';

interface EventDetailsProps {
    event?: Event;
    onClose: () => void;
    onUpdate?: (eventData: EventInput) => Promise<void>;
    onDelete?: () => Promise<void>;
    onSave?: (eventData: EventInput) => Promise<Event>;
    eventState?: EventState;
}

const EventDetails: React.FC<EventDetailsProps> = ({
    event,
    onClose,
    onUpdate,
    onDelete,
    onSave,
    eventState
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSubmit = async (eventData: EventInput) => {
        try {
            if (event?.id && onUpdate) {
                await onUpdate(eventData);
                onClose();
            } else if (onSave) {
                const savedEvent = await onSave(eventData);
                // Close the bottom sheet after saving
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save event');
        }
    };

    const handleDelete = async () => {
        if (!onDelete) {
            setError('Delete functionality is not available');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            await onDelete();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            console.error('Error deleting event:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <BottomSheet
            isOpen={!!event}
            onClose={onClose}
            title={event?.title || 'New Event'}
        >
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                    {error}
                </div>
            )}
            <EventForm
                event={event}
                onSubmit={handleSubmit}
                onCancel={onClose}
                onDelete={handleDelete}
                isDeleting={isDeleting}
                eventState={eventState}
            />
        </BottomSheet>
    );
};

export default EventDetails; 