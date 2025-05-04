import React, { useState } from 'react';
import { Event, EventInput } from '../services/eventService';
import BottomSheet from './BottomSheet';
import EventForm from './EventForm';

interface EventDetailsProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (eventData: EventInput) => Promise<void>;
    onDelete?: () => Promise<void>;
}

const EventDetails: React.FC<EventDetailsProps> = ({
    event,
    isOpen,
    onClose,
    onUpdate,
    onDelete
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSubmit = async (eventData: EventInput) => {
        try {
            setError(null);
            await onUpdate(eventData);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update event');
            console.error('Error updating event:', err);
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
            isOpen={isOpen}
            onClose={onClose}
            title={event.title}
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
            />
        </BottomSheet>
    );
};

export default EventDetails; 