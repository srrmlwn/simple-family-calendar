import React, { useState } from 'react';
import { Event, EventInput, RecurringScope } from '../services/eventService';
import { EventState } from '../utils/eventValidation';
import BottomSheet from './BottomSheet';
import EventForm from './EventForm';
import RecurrenceScopeDialog from './RecurrenceScopeDialog';

interface EventDetailsProps {
    event?: Event;
    onClose: () => void;
    onUpdate?: (eventData: EventInput) => Promise<void>;
    onDelete?: (options?: { recurringScope?: RecurringScope; occurrenceDate?: string }) => Promise<void>;
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
    const [showDeleteScopeDialog, setShowDeleteScopeDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = async (eventData: EventInput) => {
        try {
            if (event?.id && onUpdate) {
                await onUpdate(eventData);
                onClose();
            } else if (onSave) {
                await onSave(eventData);
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

        // Recurring events: show scope dialog instead of window.confirm.
        // Check both rrule (virtual/master occurrences) and recurringEventId (stored overrides).
        if (event?.rrule || event?.recurringEventId) {
            setShowDeleteScopeDialog(true);
            return;
        }

        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!onDelete) return;
        try {
            setIsDeleting(true);
            setError(null);
            setShowDeleteConfirm(false);
            await onDelete();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            console.error('Error deleting event:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteScopeConfirm = async (scope: RecurringScope) => {
        setShowDeleteScopeDialog(false);
        if (!onDelete || !event) return;
        try {
            setIsDeleting(true);
            setError(null);
            await onDelete({
                recurringScope: scope,
                occurrenceDate: event.occurrenceDate ?? new Date(event.startTime as string).toISOString(),
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
            console.error('Error deleting event:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            {showDeleteScopeDialog && (
                <RecurrenceScopeDialog
                    action="delete"
                    onConfirm={handleDeleteScopeConfirm}
                    onCancel={() => setShowDeleteScopeDialog(false)}
                />
            )}
            <BottomSheet
                isOpen={!!event}
                onClose={onClose}
                title={event?.title || 'New Event'}
                className="max-h-[85vh] sm:max-h-[600px]"
            >
                <div className="flex flex-col">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                            {error}
                        </div>
                    )}
                    {showDeleteConfirm && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center justify-between gap-3">
                            <span className="text-sm text-red-700 font-medium">Delete this event?</span>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                    {isDeleting ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
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
                </div>
            </BottomSheet>
        </>
    );
};

export default EventDetails;
