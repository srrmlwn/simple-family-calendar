import api from './api';
import { getUserTimezone, convertFromUTC } from '../utils/timezone';
import { FamilyMember } from './familyMemberService';

export interface Event {
    id: string;
    title: string;
    description?: string;
    startTime: Date | string;
    endTime: Date | string;
    duration: number;
    isAllDay: boolean;
    location?: string;
    color?: string;
    status: string;
    familyMembers?: FamilyMember[];
    createdAt: Date | string;
    updatedAt: Date | string;
    // Recurring events
    /** RFC 5545 RRULE string, set on master recurring events. */
    rrule?: string;
    /** ISO date strings of occurrences to skip (manual exception dates). */
    exceptionDates?: string[];
    /** Set on single-occurrence overrides; points to the master event id. */
    recurringEventId?: string;
    /** Original occurrence start time this override replaces (ISO string). */
    exceptionDate?: string;
    /** Present on virtual occurrences — equals the master event's DB id. */
    masterEventId?: string;
    /** Present on virtual occurrences — the original start time of this occurrence (ISO UTC). */
    occurrenceDate?: string;
}

export type RecurringScope = 'this' | 'future' | 'all';

export interface EventInput {
    title: string;
    description?: string;
    startTime: Date | string;
    endTime: Date | string;
    isAllDay?: boolean;
    location?: string;
    color?: string;
    recipientIds?: string[];
    familyMemberIds?: string[];
    // Recurring events
    rrule?: string;
    exceptionDates?: string[];
    /** Scope for editing/deleting recurring event occurrences. */
    recurringScope?: RecurringScope;
    /** ISO UTC string of the original occurrence being edited/deleted. */
    occurrenceDate?: string;
}

export interface NLPCommandResponse {
    intent: 'create' | 'update' | 'delete' | 'query' | 'sync';
    message: string;
    /** Created or updated event (for create/update) */
    event?: Event;
    /** Matching events for query results */
    events?: Event[];
    /** True when multiple events match and user must pick one */
    requiresDisambiguation?: boolean;
    /** Candidate events to choose from when disambiguating */
    candidates?: Event[];
    /** Changes to apply once the user selects a candidate (update only) */
    pendingChanges?: Partial<EventInput>;
}

const eventService = {
    // Parse event from natural language text without saving
    parseFromText: async (text: string): Promise<Event> => {
        try {
            const timezone = getUserTimezone();
            const response = await api.post<Event>('/api/events/parse', { text, timezone });
            console.log('Parsed event:', JSON.stringify(response.data, null, 2));
            const parsedEvent = parseEventDates(response.data);
            return parsedEvent;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to parse event');
        }
    },

    // Create event from natural language text
    createFromText: async (text: string): Promise<Event> => {
        try {
            // First parse the text to get event details
            const parsedEvent = await eventService.parseFromText(text);
            
            // Then create the event with the parsed details
            return await eventService.create(parsedEvent);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to create event');
        }
    },

    // Get all events
    getAll: async (startDate?: Date, endDate?: Date): Promise<Event[]> => {
        try {
            const timezone = getUserTimezone();
            const params: Record<string, string> = {
                timezone
            };

            if (startDate) {
                params.start = startDate.toISOString();
            }

            if (endDate) {
                params.end = endDate.toISOString();
            }

            const response = await api.get<Event[]>('/api/events', { params });
            return response.data.map(parseEventDates);
        } catch (error) {
            if (error instanceof Error) {
                console.error(error.message);
            }
            throw new Error('Failed to fetch events');
        }
    },

    // Get event by ID
    getById: async (id: string): Promise<Event> => {
        try {
            const timezone = getUserTimezone();
            const response = await api.get<Event>(`/api/events/${id}`, {
                params: { timezone }
            });
            return parseEventDates(response.data);
        } catch (error) {
            throw new Error('Failed to fetch event');
        }
    },

    // Create new event
    create: async (eventData: EventInput): Promise<Event> => {
        try {
            const timezone = getUserTimezone();
            const response = await api.post<Event>('/api/events', { ...eventData, timezone });
            console.log('Event created:', JSON.stringify(response.data, null, 2));
            return parseEventDates(response.data);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to create event');
        }
    },

    // Update event
    update: async (id: string, eventData: Partial<EventInput>): Promise<Event> => {
        try {
            const timezone = getUserTimezone();
            const response = await api.put<Event>(`/api/events/${id}`, { ...eventData, timezone });
            return parseEventDates(response.data);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update event');
        }
    },

    // Delete event. For recurring events pass recurringScope and occurrenceDate as query params.
    delete: async (
        id: string,
        options?: { recurringScope?: RecurringScope; occurrenceDate?: string }
    ): Promise<void> => {
        try {
            const params: Record<string, string> = {};
            if (options?.recurringScope) params.recurringScope = options.recurringScope;
            if (options?.occurrenceDate) params.occurrenceDate = options.occurrenceDate;
            await api.delete(`/api/events/${id}`, { params });
        } catch (error) {
            throw new Error('Failed to delete event');
        }
    },

    // Execute a natural language command (create / update / delete / query)
    nlpCommand: async (text: string): Promise<NLPCommandResponse> => {
        try {
            const timezone = getUserTimezone();
            const response = await api.post<NLPCommandResponse>('/api/events/nlp', { text, timezone });
            const data = response.data;
            if (data.event) data.event = parseEventDates(data.event);
            if (data.events) data.events = data.events.map(parseEventDates);
            if (data.candidates) data.candidates = data.candidates.map(parseEventDates);
            return data;
        } catch (error) {
            if (error instanceof Error) throw error;
            throw new Error('Failed to process command');
        }
    },
};

// Helper function to convert date strings to Date objects
function parseEventDates(event: Event): Event {
    const timezone = getUserTimezone();
    return {
        ...event,
        startTime: convertFromUTC(new Date(event.startTime), timezone),
        endTime: convertFromUTC(new Date(event.endTime), timezone),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
    };
}

export default eventService;