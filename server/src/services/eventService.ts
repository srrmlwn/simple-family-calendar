// src/services/eventService.ts
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';

export class EventService {
    /**
     * Create a new event
     * @param event The event to create
     * @returns The created event
     */
    public async create(event: Event): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);
        
        // Ensure dates are stored in UTC
        if (event.startTime) {
            event.startTime = this.convertToUTC(event.startTime);
        }
        
        if (event.endTime) {
            event.endTime = this.convertToUTC(event.endTime);
        }
        
        return await eventRepository.save(event);
    }

    /**
     * Find all events for a user with optional date range
     * @param userId The user ID
     * @param startDate Optional start date for filtering
     * @param endDate Optional end date for filtering
     * @param timezone The user's timezone
     * @returns Array of events
     */
    public async findByUserIdAndDateRange(
        userId: string,
        startDate?: Date,
        endDate?: Date,
        timezone: string = 'UTC'
    ): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);

        let query = eventRepository
            .createQueryBuilder('event')
            .where('event.userId = :userId', { userId })
            .orderBy('event.startTime', 'ASC');

        if (startDate) {
            query = query.andWhere('event.startTime >= :startDate', { startDate });
        }

        if (endDate) {
            query = query.andWhere('event.startTime <= :endDate', { endDate });
        }

        const events = await query.getMany();
        return this.convertEventsToTimezone(events, timezone);
    }

    /**
     * Find an event by ID
     * @param id The event ID
     * @param timezone The user's timezone
     * @returns The event or null if not found
     */
    public async findById(id: string, timezone: string = 'UTC'): Promise<Event | null> {
        const eventRepository = AppDataSource.getRepository(Event);
        const event = await eventRepository.findOne({
            where: { id }
        });

        if (!event) {
            return null;
        }

        return this.convertEventToTimezone(event, timezone);
    }

    /**
     * Update an event
     * @param id The event ID
     * @param eventData The event data to update
     * @returns The updated event
     */
    public async update(id: string, eventData: Partial<Event>): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);
        
        // Get the existing event
        const existingEvent = await this.findById(id);
        
        if (!existingEvent) {
            throw new Error('Event not found');
        }
        
        // Ensure dates are stored in UTC
        if (eventData.startTime) {
            eventData.startTime = this.convertToUTC(eventData.startTime);
        }
        
        if (eventData.endTime) {
            eventData.endTime = this.convertToUTC(eventData.endTime);
        }
        
        // Update the event
        Object.assign(existingEvent, eventData);
        
        return await eventRepository.save(existingEvent);
    }

    /**
     * Delete an event
     * @param id The event ID
     */
    public async delete(id: string): Promise<void> {
        const eventRepository = AppDataSource.getRepository(Event);
        await eventRepository.delete(id);
    }

    /**
     * Find events within a date range
     * @param startDate The start date
     * @param endDate The end date
     * @param timezone The user's timezone
     * @returns Array of events
     */
    public async findByDateRange(
        startDate: Date, 
        endDate: Date, 
        timezone: string = 'UTC'
    ): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);
        
        const events = await eventRepository
            .createQueryBuilder('event')
            .where('event.startTime >= :startDate', { startDate })
            .andWhere('event.startTime <= :endDate', { endDate })
            .orderBy('event.startTime', 'ASC')
            .getMany();

        return this.convertEventsToTimezone(events, timezone);
    }

    /**
     * Find upcoming events for a user
     * @param userId The user ID
     * @param limit The maximum number of events to return
     * @param timezone The user's timezone
     * @returns Array of events
     */
    public async findUpcomingEvents(
        userId: string, 
        limit: number = 5,
        timezone: string = 'UTC'
    ): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);
        const now = new Date();
        
        const events = await eventRepository
            .createQueryBuilder('event')
            .where('event.userId = :userId', { userId })
            .andWhere('event.startTime >= :now', { now })
            .orderBy('event.startTime', 'ASC')
            .take(limit)
            .getMany();

        return this.convertEventsToTimezone(events, timezone);
    }
    
    /**
     * Convert a date to UTC
     * @param date The date to convert
     * @returns The date in UTC
     */
    private convertToUTC(date: Date): Date {
        // If the date is already a Date object, ensure it's treated as UTC
        if (date instanceof Date) {
            // Create a new date with the same UTC time
            return new Date(Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds(),
                date.getUTCMilliseconds()
            ));
        }
        
        // If it's a string, parse it as UTC
        return new Date(date);
    }

    /**
     * Convert a UTC date to the specified timezone
     * @param date The UTC date to convert
     * @param timezone The target timezone
     * @returns The date in the specified timezone
     */
    private convertFromUTC(date: Date, timezone: string): Date {
        try {
            // Create a formatter for the specified timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Get the date parts in the specified timezone
            const parts = formatter.formatToParts(date);
            const values: { [key: string]: string } = {};
            
            parts.forEach(part => {
                if (part.type !== 'literal') {
                    values[part.type] = part.value;
                }
            });

            // Create a new date string in ISO format
            const isoString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
            
            // Return the date in the specified timezone
            return new Date(isoString);
        } catch (error) {
            console.warn(`Failed to convert date from UTC to timezone ${timezone}, using UTC instead`, error);
            return date;
        }
    }

    /**
     * Convert an event's dates from UTC to the specified timezone
     * @param event The event to convert
     * @param timezone The target timezone
     * @returns The event with converted dates
     */
    private convertEventToTimezone(event: Event, timezone: string): Event {
        const convertedEvent = { ...event };
        
        if (convertedEvent.startTime) {
            convertedEvent.startTime = this.convertFromUTC(convertedEvent.startTime, timezone);
        }
        
        if (convertedEvent.endTime) {
            convertedEvent.endTime = this.convertFromUTC(convertedEvent.endTime, timezone);
        }
        
        return convertedEvent;
    }

    /**
     * Convert multiple events' dates from UTC to the specified timezone
     * @param events The events to convert
     * @param timezone The target timezone
     * @returns The events with converted dates
     */
    private convertEventsToTimezone(events: Event[], timezone: string): Event[] {
        return events.map(event => this.convertEventToTimezone(event, timezone));
    }
}

export default new EventService();