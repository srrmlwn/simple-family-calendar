import React, { useState, useCallback, useEffect } from 'react';
import { Camera, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { ParsedFlyerEvent } from '../services/eventService';
import { FamilyMember } from '../services/familyMemberService';
import moment from 'moment';

interface FlyerImportSheetProps {
    isOpen: boolean;
    onClose: () => void;
    parsedEvents: ParsedFlyerEvent[];
    familyMembers: FamilyMember[];
    onConfirm: (selectedEvents: ParsedFlyerEvent[]) => Promise<void>;
    isCreating: boolean;
    imagePreviewUrl?: string;
}

const FlyerImportSheet: React.FC<FlyerImportSheetProps> = ({
    isOpen,
    onClose,
    parsedEvents,
    familyMembers,
    onConfirm,
    isCreating,
    imagePreviewUrl,
}) => {
    // All events checked by default
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
        () => new Set(parsedEvents.map((_, i) => i))
    );

    // Reset selection whenever a new set of events arrives
    useEffect(() => {
        setSelectedIndices(new Set(parsedEvents.map((_, i) => i)));
    }, [parsedEvents]);

    const toggleEvent = useCallback((idx: number) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    }, []);

    const selectedCount = selectedIndices.size;
    const selectedEvents = parsedEvents.filter((_, i) => selectedIndices.has(i));

    const getMemberColor = (name: string): string => {
        const member = familyMembers.find(
            fm => fm.name.toLowerCase() === name.toLowerCase()
        );
        return member?.color ?? '#6366f1';
    };

    const formatEventTime = (event: ParsedFlyerEvent): string => {
        const start = new Date(event.startTime);
        if (event.isAllDay) {
            return moment(start).format('MMM D');
        }
        return `${moment(start).format('MMM D')} · ${moment(start).format('h:mm A')}`;
    };

    const title = parsedEvents.length === 0
        ? 'No events found'
        : `${parsedEvents.length} event${parsedEvents.length === 1 ? '' : 's'} found`;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
                {/* Image thumbnail */}
                {imagePreviewUrl && (
                    <div className="px-4 pt-3 pb-3 border-b border-gray-100">
                        <img
                            src={imagePreviewUrl}
                            alt="Uploaded flyer"
                            className="h-16 w-auto rounded-lg object-cover border border-gray-200"
                        />
                    </div>
                )}

                {parsedEvents.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <Camera className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-500">No calendar events found</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Try a clearer photo of a schedule, flyer, or calendar.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-6 px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Event checklist */}
                        <div className="overflow-y-auto flex-1">
                            {parsedEvents.map((event, idx) => {
                                const isSelected = selectedIndices.has(idx);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => toggleEvent(idx)}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors select-none ${
                                            isSelected
                                                ? 'bg-white hover:bg-gray-50 active:bg-gray-100'
                                                : 'bg-gray-50 opacity-50'
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <div
                                            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                                                isSelected
                                                    ? 'bg-indigo-500 border-indigo-500'
                                                    : 'border-gray-300 bg-white'
                                            }`}
                                        >
                                            {isSelected && (
                                                <Check size={12} color="white" strokeWidth={3} />
                                            )}
                                        </div>

                                        {/* Event details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 leading-tight">
                                                {event.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {formatEventTime(event)}
                                            </p>
                                            {event.location && (
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                    📍 {event.location}
                                                </p>
                                            )}
                                            {(event.familyMemberNames ?? []).length > 0 && (
                                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                                    {event.familyMemberNames!.map(name => (
                                                        <span
                                                            key={name}
                                                            style={{ backgroundColor: getMemberColor(name) }}
                                                            className="text-white text-xs px-2 py-0.5 rounded-full"
                                                        >
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-4 py-4 border-t border-gray-200 bg-white shrink-0">
                            <button
                                onClick={onClose}
                                disabled={isCreating}
                                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void onConfirm(selectedEvents)}
                                disabled={isCreating || selectedCount === 0}
                                className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                            >
                                {isCreating
                                    ? 'Adding…'
                                    : `Add ${selectedCount} event${selectedCount === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </BottomSheet>
    );
};

export default FlyerImportSheet;
