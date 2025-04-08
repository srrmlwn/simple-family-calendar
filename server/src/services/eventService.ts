// src/services/eventService.ts
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';

export class EventService {
    /**
     * Create a new event
     */
    public async create(event: Event): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);
        return await eventRepository.save(event);
    }

    /**
     * Find all events for a user with optional date range
     */
    public async findByUserIdAndDateRange(
        userId: string,
        startDate?: Date,
        endDate?: Date
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

        return await query.getMany();
    }

    /**
     * Find an event by ID
     */
    public async findById(id: string): Promise<Event | null> {
        const eventRepository = AppDataSource.getRepository(Event);
        const event = await eventRepository.findOne({
            where: { id }
        });

        return event || null;
    }

    /**
     * Update an existing event
     */
    public async update(id: string, eventData: Partial<Event>): Promise<Event> {
        const eventRepository = AppDataSource.getRepository(Event);

        await eventRepository.update(id, eventData);

        const updatedEvent = await this.findById(id);

        if (!updatedEvent) {
            throw new Error('Event not found after update');
        }

        return updatedEvent;
    }

    /**
     * Delete an event
     */
    public async delete(id: string): Promise<void> {
        const eventRepository = AppDataSource.getRepository(Event);
        await eventRepository.delete(id);
    }

    /**
     * Find events by date range for any user
     */
    public async findByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);

        return await eventRepository
            .createQueryBuilder('event')
            .where('event.startTime >= :startDate', { startDate })
            .andWhere('event.startTime <= :endDate', { endDate })
            .orderBy('event.startTime', 'ASC')
            .getMany();
    }

    /**
     * Find upcoming events for a user
     */
    public async findUpcomingEvents(userId: string, limit: number = 5): Promise<Event[]> {
        const eventRepository = AppDataSource.getRepository(Event);

        const now = new Date();

        return await eventRepository
            .createQueryBuilder('event')
            .where('event.userId = :userId', { userId })
            .andWhere('event.startTime >= :now', { now })
            .orderBy('event.startTime', 'ASC')
            .limit(limit)
            .getMany();
    }
}

export default new EventService();