// src/controllers/eventController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';
import { EventRecipient } from '../entities/EventRecipient';
import { EmailRecipient } from '../entities/EmailRecipient';
import { EventService } from '../services/eventService';
import { EmailService } from '../services/emailService';
import { hybridParser } from '../services/hybridParser';
import { validateOrReject } from 'class-validator';
import { User } from '../entities/User';

export class EventController {
    private eventService: EventService;
    private emailService: EmailService;
    private parser: ReturnType<typeof hybridParser>;

    constructor() {
        this.eventService = new EventService();
        this.emailService = new EmailService();
        this.parser = hybridParser(process.env.OPENAI_API_KEY || '');
    }

    /**
     * Create event from natural language input
     */
    public createEventFromText = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { text, timezone } = req.body;
            const userId = req.user?.id;

            if (!text) {
                return res.status(400).json({ error: 'Text input is required' });
            }

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            console.log("Creating event from text - " + JSON.stringify(text));
            // Parse the natural language text with timezone using hybrid parser
            const parsedEvent = await this.parser.parseEvent(text, timezone);

            if (!parsedEvent) {
                return res.status(400).json({ error: 'Could not parse event details from text' });
            }

            // Create event entity
            const event = new Event();
            event.title = parsedEvent.title;
            event.description = parsedEvent.description;
            event.startTime = parsedEvent.startTime;
            event.endTime = parsedEvent.endTime;
            event.duration = parsedEvent.duration;
            event.isAllDay = parsedEvent.isAllDay;
            event.location = parsedEvent.location;
            event.userId = userId!;

            // Validate event data
            await validateOrReject(event);

            // Save the event
            const savedEvent = await this.eventService.create(event);

            // Get default recipients for this user
            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const defaultRecipients = await recipientRepository.find({
                where: { userId, isDefault: true }
            });
            console.log('Default recipients:', JSON.stringify(defaultRecipients, null, 2));
            // Create event recipients
            if (defaultRecipients.length > 0) {
                const eventRecipients = defaultRecipients.map(recipient => {
                    const eventRecipient = new EventRecipient();
                    eventRecipient.eventId = savedEvent.id;
                    eventRecipient.recipientId = recipient.id;
                    return eventRecipient;
                });

                await AppDataSource.getRepository(EventRecipient).save(eventRecipients);

                // Get user details for sender information
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneOrFail({ where: { id: userId } });

                // Send calendar invites
                await this.emailService.sendCalendarInvites(savedEvent, defaultRecipients, {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
            }

            // Convert the saved event to the client's timezone before sending response
            const timezoneEvent = await this.eventService.findById(savedEvent.id, timezone);
            console.log('Timezone event:', JSON.stringify(timezoneEvent, null, 2));
            return res.status(201).json(timezoneEvent);
        } catch (error) {
            console.error('Error creating event:', error);
            return res.status(500).json({
                error: 'Failed to create event',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get all events for the current user
     */
    public getAllEvents = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = req.user?.id;
            const { start, end, timezone } = req.query;

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            // Parse date range if provided
            const startDate = start ? new Date(start as string) : undefined;
            const endDate = end ? new Date(end as string) : undefined;

            const events = await this.eventService.findByUserIdAndDateRange(
                userId!, 
                startDate, 
                endDate, 
                timezone as string
            );
            return res.json(events);
        } catch (error) {
            console.error('Error fetching events:', error);
            return res.status(500).json({ error: 'Failed to fetch events' });
        }
    };

    /**
     * Get a single event by ID
     */
    public getEventById = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const { timezone } = req.query;

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            const event = await this.eventService.findById(id, timezone as string);

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Make sure the event belongs to the current user
            if (event.userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            return res.json(event);
        } catch (error) {
            console.error('Error fetching event:', error);
            return res.status(500).json({ error: 'Failed to fetch event' });
        }
    };

    /**
     * Create a new event
     */
    public createEvent = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { timezone, ...eventData } = req.body;
            const userId = req.user?.id;

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            // Create event entity
            const event = new Event();
            event.title = eventData.title;
            event.description = eventData.description;
            event.startTime = eventData.startTime;
            event.endTime = eventData.endTime;
            event.duration = eventData.duration;
            event.isAllDay = eventData.isAllDay;
            event.location = eventData.location;
            event.userId = userId!;

            // Validate event data
            await validateOrReject(event);

            // Save the event
            const savedEvent = await this.eventService.create(event);

            // Handle recipients if provided
            if (eventData.recipientIds && eventData.recipientIds.length > 0) {
                const eventRecipients = eventData.recipientIds.map((recipientId: string) => {
                    const eventRecipient = new EventRecipient();
                    eventRecipient.eventId = savedEvent.id;
                    eventRecipient.recipientId = recipientId;
                    return eventRecipient;
                });

                await AppDataSource.getRepository(EventRecipient).save(eventRecipients);

                // Get recipient details for email
                const recipientRepository = AppDataSource.getRepository(EmailRecipient);
                const recipients = await recipientRepository.findByIds(eventData.recipientIds);

                // Get user details for sender information
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneOrFail({ where: { id: userId } });

                // Send calendar invites
                await this.emailService.sendCalendarInvites(savedEvent, recipients, {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
            }

            return res.status(201).json(savedEvent);
        } catch (error) {
            console.error('Error creating event:', error);
            return res.status(500).json({
                error: 'Failed to create event',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Update an existing event
     */
    public updateEvent = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const updates = req.body;

            // Get the existing event
            const existingEvent = await this.eventService.findById(id);
            if (!existingEvent) {
                return res.status(404).json({ error: 'Event not found' });
            }

            if (existingEvent.userId !== userId) {
                return res.status(403).json({ error: 'Not authorized to update this event' });
            }

            // Update the event
            const updatedEvent = await this.eventService.update(id, updates);

            // Get recipient details for email
            const eventRecipientRepository = AppDataSource.getRepository(EventRecipient);
            const eventRecipients = await eventRecipientRepository.find({
                where: { eventId: id },
                relations: ['recipient']
            });

            if (eventRecipients.length > 0) {
                const recipients = eventRecipients.map(er => er.recipient);

                // Get user details for sender information
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneOrFail({ where: { id: userId } });

                // Send calendar updates
                await this.emailService.sendCalendarUpdates(updatedEvent, recipients, {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
            }

            return res.json(updatedEvent);
        } catch (error) {
            console.error('Error updating event:', error);
            return res.status(500).json({
                error: 'Failed to update event',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Delete an event
     */
    public deleteEvent = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Get the existing event and recipients before deletion
            const existingEvent = await this.eventService.findById(id);
            if (!existingEvent) {
                return res.status(404).json({ error: 'Event not found' });
            }

            if (existingEvent.userId !== userId) {
                return res.status(403).json({ error: 'Not authorized to delete this event' });
            }

            // Get recipient details for email
            const eventRecipientRepository = AppDataSource.getRepository(EventRecipient);
            const eventRecipients = await eventRecipientRepository.find({
                where: { eventId: id },
                relations: ['recipient']
            });

            // Delete the event
            await this.eventService.delete(id);

            if (eventRecipients.length > 0) {
                const recipients = eventRecipients.map(er => er.recipient);

                // Get user details for sender information
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneOrFail({ where: { id: userId } });

                // Send calendar cancellations
                await this.emailService.sendCalendarCancellations(existingEvent, recipients, {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
            }

            return res.status(204).send();
        } catch (error) {
            console.error('Error deleting event:', error);
            return res.status(500).json({
                error: 'Failed to delete event',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}

export default new EventController();