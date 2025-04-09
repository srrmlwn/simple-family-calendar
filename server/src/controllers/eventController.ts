// src/controllers/eventController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';
import { EventRecipient } from '../entities/EventRecipient';
import { EmailRecipient } from '../entities/EmailRecipient';
import { EventService } from '../services/eventService';
import { EmailService } from '../services/emailService';
import nlpParser from '../services/nlpParser';
import { validateOrReject } from 'class-validator';

export class EventController {
    private eventService: EventService;
    private emailService: EmailService;

    constructor() {
        this.eventService = new EventService();
        this.emailService = new EmailService();
    }

    /**
     * Create event from natural language input
     */
    public createEventFromText = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { text } = req.body;
            const userId = req.user?.id;

            if (!text) {
                return res.status(400).json({ error: 'Text input is required' });
            }

            console.log("Creating event from text - " + JSON.stringify(text));
            // Parse the natural language text
            const parsedEvent = nlpParser.parseEvent(text);

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
     * Get all events for the current user
     */
    public getAllEvents = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = req.user?.id;
            const { start, end } = req.query;

            // Parse date range if provided
            const startDate = start ? new Date(start as string) : undefined;
            const endDate = end ? new Date(end as string) : undefined;

            const events = await this.eventService.findByUserIdAndDateRange(userId!, startDate, endDate);
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

            const event = await this.eventService.findById(id);

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
            console.log("Creating Event for Req - " + JSON.stringify(req));

            const userId = req.user?.id;
            const eventData = req.body;

            const event = new Event();
            event.title = eventData.title;
            event.description = eventData.description;
            event.startTime = new Date(eventData.startTime);
            event.endTime = new Date(eventData.endTime);

            // Calculate duration in minutes
            event.duration = Math.round((event.endTime.getTime() - event.startTime.getTime()) / 60000);

            event.isAllDay = eventData.isAllDay || false;
            event.location = eventData.location;
            event.color = eventData.color;
            event.userId = userId!;

            // Validate event data
            await validateOrReject(event);

            // Save the event
            const savedEvent = await this.eventService.create(event);

            // Handle recipients if provided
            if (eventData.recipientIds && eventData.recipientIds.length > 0) {
                const recipientRepository = AppDataSource.getRepository(EmailRecipient);
                const recipients = await recipientRepository.findByIds(eventData.recipientIds);

                const eventRecipients = recipients.map(recipient => {
                    const eventRecipient = new EventRecipient();
                    eventRecipient.eventId = savedEvent.id;
                    eventRecipient.recipientId = recipient.id;
                    return eventRecipient;
                });

                await AppDataSource.getRepository(EventRecipient).save(eventRecipients);

                // Send calendar invites
                await this.emailService.sendCalendarInvites(savedEvent, recipients);
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
            const eventData = req.body;

            // Get the existing event
            const existingEvent = await this.eventService.findById(id);

            if (!existingEvent) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Make sure the event belongs to the current user
            if (existingEvent.userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Update the event
            if (eventData.title) existingEvent.title = eventData.title;
            if (eventData.description !== undefined) existingEvent.description = eventData.description;

            if (eventData.startTime) {
                existingEvent.startTime = new Date(eventData.startTime);

                // If only start time changed, adjust the end time to maintain duration
                if (!eventData.endTime) {
                    existingEvent.endTime = new Date(existingEvent.startTime.getTime() + existingEvent.duration * 60000);
                }
            }

            if (eventData.endTime) {
                existingEvent.endTime = new Date(eventData.endTime);

                // Calculate new duration
                existingEvent.duration = Math.round(
                    (existingEvent.endTime.getTime() - existingEvent.startTime.getTime()) / 60000
                );
            }

            if (eventData.isAllDay !== undefined) existingEvent.isAllDay = eventData.isAllDay;
            if (eventData.location !== undefined) existingEvent.location = eventData.location;
            if (eventData.color !== undefined) existingEvent.color = eventData.color;

            // Validate updated data
            await validateOrReject(existingEvent);

            // Save the updated event
            const updatedEvent = await this.eventService.update(id, existingEvent);

            // Get all recipients for this event
            const recipientRepository = AppDataSource.getRepository(EventRecipient);
            const eventRecipients = await recipientRepository.find({
                where: { eventId: id },
                relations: ['recipient']
            });

            const recipients = eventRecipients.map(er => er.recipient);

            // Send calendar updates
            if (recipients.length > 0) {
                await this.emailService.sendCalendarUpdates(updatedEvent, recipients);
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