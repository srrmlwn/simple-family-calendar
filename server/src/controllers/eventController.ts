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

            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({ error: 'OpenAI API key is not configured' });
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

            // Create event recipients
            if (defaultRecipients.length > 0) {
                const eventRecipients = defaultRecipients.map(recipient => {
                    const eventRecipient = new EventRecipient();
                    eventRecipient.eventId = savedEvent.id;
                    eventRecipient.recipientId = recipient.id;
                    return eventRecipient;
                });

                await AppDataSource.getRepository(EventRecipient).save(eventRecipients);

                // Send calendar invites
                await this.emailService.sendCalendarInvites(savedEvent, defaultRecipients);
            }

            // Convert the saved event to the client's timezone before sending response
            const timezoneEvent = await this.eventService.findById(savedEvent.id, timezone);

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

                // Send calendar invites
                await this.emailService.sendCalendarInvites(savedEvent, recipients);
            }

            // Convert the saved event to the client's timezone before sending response
            const timezoneEvent = await this.eventService.findById(savedEvent.id, timezone);

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
     * Update an existing event
     */
    public updateEvent = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const { timezone, ...eventData } = req.body;
            const userId = req.user?.id;

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            // Get existing event
            const eventRepository = AppDataSource.getRepository(Event);
            const event = await eventRepository.findOne({
                where: { id, userId }
            });

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Update event fields
            Object.assign(event, eventData);

            // Validate event data
            await validateOrReject(event);

            // Save updated event
            const updatedEvent = await this.eventService.update(id, eventData);

            // Handle recipients if provided
            if (eventData.recipientIds) {
                // Delete existing recipients
                await AppDataSource.getRepository(EventRecipient).delete({ eventId: id });

                // Create new recipients
                if (eventData.recipientIds.length > 0) {
                    const eventRecipients = eventData.recipientIds.map((recipientId: string) => {
                        const eventRecipient = new EventRecipient();
                        eventRecipient.eventId = id;
                        eventRecipient.recipientId = recipientId;
                        return eventRecipient;
                    });

                    await AppDataSource.getRepository(EventRecipient).save(eventRecipients);

                    // Get recipient details for email
                    const recipientRepository = AppDataSource.getRepository(EmailRecipient);
                    const recipients = await recipientRepository.findByIds(eventData.recipientIds);

                    // Send calendar invites
                    await this.emailService.sendCalendarInvites(updatedEvent, recipients);
                }
            }

            // Convert the updated event to the client's timezone before sending response
            const timezoneEvent = await this.eventService.findById(id, timezone);

            return res.json(timezoneEvent);
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

            // Get the existing event
            const existingEvent = await this.eventService.findById(id);

            if (!existingEvent) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Make sure the event belongs to the current user
            if (existingEvent.userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Get all recipients for this event before deleting
            const recipientRepository = AppDataSource.getRepository(EventRecipient);
            const eventRecipients = await recipientRepository.find({
                where: { eventId: id },
                relations: ['recipient']
            });

            const recipients = eventRecipients.map(er => er.recipient);

            // Delete the event
            await this.eventService.delete(id);

            // Send calendar cancellations
            if (recipients.length > 0) {
                await this.emailService.sendCalendarCancellations(existingEvent, recipients);
            }

            return res.status(204).send();
        } catch (error) {
            console.error('Error deleting event:', error);
            return res.status(500).json({ error: 'Failed to delete event' });
        }
    };
}

export default new EventController();