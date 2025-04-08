import api from './api';

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
    // Create event from natural language text
    createFromText: async (text: string): Promise<Event> => {
        try {
            const response = await api.post<Event>('/events/text', { text });
            return parseEventDates(response.data);
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
            const params: Record<string, string> = {};

            if (startDate) {
                params.start = startDate.toISOString();
            }

            if (endDate) {
                params.end = endDate.toISOString();
            }

            const response = await api.get<Event[]>('/events', { params });
            return response.data.map(parseEventDates);
        } catch (error) {
            if (error instanceof  Error) {
                console.error(error.message);
            }
            throw new Error('Failed to fetch events');
        }
    },

    // Get event by ID
    getById: async (id: string): Promise<Event> => {
        try {
            const response = await api.get<Event>(`/events/${id}`);
            return parseEventDates(response.data);
        } catch (error) {
            throw new Error('Failed to fetch event');
        }
    },

    // Create new event
    create: async (eventData: EventInput): Promise<Event> => {
        try {
            const response = await api.post<Event>('/events', eventData);
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
            const response = await api.put<Event>(`/events/${id}`, eventData);
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
            await api.delete(`/events/${id}`);
        } catch (error) {
            throw new Error('Failed to delete event');
        }
    },
};

// Helper function to convert date strings to Date objects
function parseEventDates(event: Event): Event {
    return {
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
    };
}

export default eventService;