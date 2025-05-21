import api from './api';
import { getUserTimezone, convertFromUTC } from '../utils/timezone';

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
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface EventInput {
    title: string;
    description?: string;
    startTime: Date | string;
    endTime: Date | string;
    isAllDay?: boolean;
    location?: string;
    color?: string;
    recipientIds?: string[];
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

    // Delete event
    delete: async (id: string): Promise<void> => {
        try {
            await api.delete(`/api/events/${id}`);
        } catch (error) {
            throw new Error('Failed to delete event');
        }
    }
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