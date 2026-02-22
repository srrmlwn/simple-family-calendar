// src/controllers/eventController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';
import { EventRecipient } from '../entities/EventRecipient';
import { EmailRecipient } from '../entities/EmailRecipient';
import { FamilyMember } from '../entities/FamilyMember';
import { EventFamilyMember } from '../entities/EventFamilyMember';
import { EventService } from '../services/eventService';
import { EmailService } from '../services/emailService';
import { hybridParser } from '../services/hybridParser';
import { intentParser, IntentParser } from '../services/intentParser';
import { validateOrReject } from 'class-validator';
import { User } from '../entities/User';
import moment from 'moment-timezone';

export class EventController {
    private eventService: EventService;
    private emailService: EmailService;
    private parser: ReturnType<typeof hybridParser>;
    private intentParser: IntentParser;

    constructor() {
        this.eventService = new EventService();
        this.emailService = new EmailService();
        this.parser = hybridParser(process.env.OPENAI_API_KEY || '');
        this.intentParser = new IntentParser(process.env.OPENAI_API_KEY || '');
    }

    /**
     * Parse event from natural language input without saving
     */
    public parseEventFromText = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { text, timezone } = req.body;

            if (!text) {
                return res.status(400).json({ error: 'Text input is required' });
            }

            if (typeof text !== 'string' || text.length > 500) {
                return res.status(400).json({ error: 'Text input must be a string under 500 characters' });
            }

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }
            // Parse the natural language text with timezone using hybrid parser
            const parsedEvent = await this.parser.parseEvent(text, timezone);

            if (!parsedEvent) {
                return res.status(400).json({ error: 'Could not parse event details from text' });
            }

            // Create event entity but don't save it
            const event = new Event();
            event.title = parsedEvent.title;
            event.description = parsedEvent.description;
            event.startTime = parsedEvent.startTime;
            event.endTime = parsedEvent.endTime;
            event.duration = parsedEvent.duration;
            event.isAllDay = parsedEvent.isAllDay;
            event.location = parsedEvent.location;

            // Validate event data
            await validateOrReject(event);

            // Return the parsed event without saving
            return res.json(event);
        } catch (error) {
            console.error('Error parsing event:', error);
            return res.status(400).json({ 
                error: error instanceof Error ? error.message : 'Failed to parse event'
            });
        }
    };

    /**
     * Create event from natural language input
     */
    public createEventFromText = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { text, timezone } = req.body;
            const userId = (req.user as any)?.id;

            if (!text) {
                return res.status(400).json({ error: 'Text input is required' });
            }

            if (typeof text !== 'string' || text.length > 500) {
                return res.status(400).json({ error: 'Text input must be a string under 500 characters' });
            }

            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            // Parse the event first
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

            return res.json(savedEvent);
        } catch (error) {
            console.error('Error creating event:', error);
            return res.status(400).json({ 
                error: error instanceof Error ? error.message : 'Failed to create event'
            });
        }
    };

    /**
     * Attach family members to an array of events (batch, avoids N+1).
     */
    private async attachFamilyMembers(events: Event[]): Promise<(Event & { familyMembers: FamilyMember[] })[]> {
        if (events.length === 0) return events.map(e => ({ ...e, familyMembers: [] }));
        const { In } = await import('typeorm');
        const efmRepo = AppDataSource.getRepository(EventFamilyMember);
        const tags = await efmRepo.find({
            where: { eventId: In(events.map(e => e.id)) },
            relations: ['familyMember'],
        });
        const byEventId = new Map<string, FamilyMember[]>();
        for (const tag of tags) {
            const list = byEventId.get(tag.eventId) ?? [];
            list.push(tag.familyMember);
            byEventId.set(tag.eventId, list);
        }
        return events.map(e => ({ ...e, familyMembers: byEventId.get(e.id) ?? [] }));
    }

    /**
     * Save family member tags for an event, validating ownership.
     */
    private async saveFamilyMemberTags(eventId: string, familyMemberIds: string[], userId: string): Promise<void> {
        const { In } = await import('typeorm');
        const efmRepo = AppDataSource.getRepository(EventFamilyMember);
        await efmRepo.delete({ eventId });
        if (familyMemberIds.length === 0) return;
        const fmRepo = AppDataSource.getRepository(FamilyMember);
        const members = await fmRepo.find({ where: { id: In(familyMemberIds), userId } });
        if (members.length === 0) return;
        const tags = members.map(m => {
            const tag = new EventFamilyMember();
            tag.eventId = eventId;
            tag.familyMemberId = m.id;
            return tag;
        });
        await efmRepo.save(tags);
    }

    /**
     * Get all events for the current user
     */
    public getAllEvents = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
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
            const enriched = await this.attachFamilyMembers(events);
            return res.json(enriched);
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
            const userId = (req.user as any)?.id;
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
            const { timezone, familyMemberIds, ...eventData } = req.body;
            const userId = (req.user as any)?.id;

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

            // Get default recipients for this user
            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const defaultRecipients = await recipientRepository.find({
                where: { userId, isDefault: true }
            });

            // Create event recipients from default recipients
            if (defaultRecipients.length > 0) {
                const eventRecipients = defaultRecipients.map(recipient => {
                    const eventRecipient = new EventRecipient();
                    eventRecipient.eventId = savedEvent.id;
                    eventRecipient.recipientId = recipient.id;
                    eventRecipient.name = recipient.name;
                    eventRecipient.email = recipient.email;
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

            // If specific recipients were provided, add them as well
            if (eventData.recipientIds && eventData.recipientIds.length > 0) {
                // Get recipient details for email
                // Scope lookup to current user's recipients to prevent accessing other users' contacts
                const { In } = await import('typeorm');
                const specificRecipients = await recipientRepository.find({
                    where: { id: In(eventData.recipientIds), userId }
                });

                const additionalEventRecipients = specificRecipients
                    .filter(recipient => !defaultRecipients.some(dr => dr.id === recipient.id))
                    .map(recipient => {
                        const eventRecipient = new EventRecipient();
                        eventRecipient.eventId = savedEvent.id;
                        eventRecipient.recipientId = recipient.id;
                        eventRecipient.name = recipient.name;
                        eventRecipient.email = recipient.email;
                        return eventRecipient;
                    });

                if (additionalEventRecipients.length > 0) {
                    await AppDataSource.getRepository(EventRecipient).save(additionalEventRecipients);

                    // Get user details for sender information if not already fetched
                    const userRepository = AppDataSource.getRepository(User);
                    const user = await userRepository.findOneOrFail({ where: { id: userId } });

                    // Send calendar invites to additional recipients
                    await this.emailService.sendCalendarInvites(savedEvent, specificRecipients, {
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`
                    });
                }
            }

            // Save family member tags
            if (Array.isArray(familyMemberIds) && familyMemberIds.length > 0) {
                await this.saveFamilyMemberTags(savedEvent.id, familyMemberIds, userId!);
            }

            const [enriched] = await this.attachFamilyMembers([savedEvent]);
            return res.status(201).json(enriched);
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
            const userId = (req.user as any)?.id;

            // Allowlist updatable fields — never allow userId or id to be overwritten
            const { title, description, startTime, endTime, duration, isAllDay, location, color, status, familyMemberIds } = req.body;
            const updates = { title, description, startTime, endTime, duration, isAllDay, location, color, status };

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
                where: { eventId: id }
            });

            if (eventRecipients.length > 0) {
                // Get user details for sender information
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneOrFail({ where: { id: userId } });

                // Send calendar updates
                await this.emailService.sendCalendarUpdates(updatedEvent, eventRecipients, {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
            }

            // Update family member tags if provided
            if (Array.isArray(familyMemberIds)) {
                await this.saveFamilyMemberTags(id, familyMemberIds, userId!);
            }

            const [enriched] = await this.attachFamilyMembers([updatedEvent]);
            return res.json(enriched);
        } catch (error) {
            console.error('Error updating event:', error);
            return res.status(500).json({
                error: 'Failed to update event',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Handle a natural language command (create / update / delete / query).
     * Requires authentication — events are scoped to the requesting user.
     */
    /** Resolve family member names (from NLP) to IDs using case-insensitive matching. */
    private resolveMemberIds(names: string[], members: FamilyMember[]): string[] {
        const resolved = new Set<string>();
        for (const name of names) {
            const lower = name.toLowerCase().trim();
            const match = members.find(m =>
                m.name.toLowerCase() === lower ||
                m.name.toLowerCase().startsWith(lower) ||
                lower.startsWith(m.name.toLowerCase())
            );
            if (match) resolved.add(match.id);
        }
        return Array.from(resolved);
    }

    public handleNLPCommand = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { text, timezone } = req.body;
            const userId = (req.user as any)?.id;

            if (!text || typeof text !== 'string' || text.length > 500) {
                return res.status(400).json({ error: 'Text must be a non-empty string under 500 characters' });
            }
            if (!timezone) {
                return res.status(400).json({ error: 'Timezone is required' });
            }

            // Fetch user events from 7 days ago through 90 days ahead as LLM context
            const contextStart = moment().subtract(7, 'days').toDate();
            const contextEnd = moment().add(90, 'days').toDate();
            const userEvents = await this.eventService.findByUserIdAndDateRange(
                userId!, contextStart, contextEnd, timezone
            );

            // Fetch family members to provide as NLP context
            const fmRepo = AppDataSource.getRepository(FamilyMember);
            const userFamilyMembers = await fmRepo.find({ where: { userId } });

            // Determine intent and extract structured data
            const result = await this.intentParser.parseIntent(text, timezone, userEvents, userFamilyMembers);

            // ── CREATE ──────────────────────────────────────────────────────────
            if (result.intent === 'create') {
                const event = new Event();
                event.title = result.event.title;
                event.startTime = result.event.startTime;
                event.endTime = result.event.endTime;
                event.duration = result.event.duration;
                event.isAllDay = result.event.isAllDay;
                event.location = result.event.location;
                event.userId = userId!;

                await validateOrReject(event);
                const saved = await this.eventService.create(event);

                // Tag family members extracted by NLP
                const memberIds = this.resolveMemberIds(
                    result.event.familyMemberNames ?? [], userFamilyMembers
                );
                if (memberIds.length > 0) {
                    await this.saveFamilyMemberTags(saved.id, memberIds, userId!);
                }

                const [enriched] = await this.attachFamilyMembers([saved]);
                return res.json({
                    intent: 'create',
                    message: `Created "${saved.title}"${memberIds.length > 0 ? ` for ${enriched.familyMembers.map(m => m.name).join(', ')}` : ''}`,
                    event: enriched,
                });
            }

            // ── UPDATE ──────────────────────────────────────────────────────────
            if (result.intent === 'update') {
                // Disambiguation: multiple events match
                if (!result.eventId && result.candidateIds && result.candidateIds.length > 1) {
                    const candidates = userEvents.filter(e => result.candidateIds!.includes(e.id));
                    return res.json({
                        intent: 'update',
                        requiresDisambiguation: true,
                        candidates,
                        pendingChanges: result.changes,
                        message: `Found ${candidates.length} matching events — which one did you mean?`,
                    });
                }

                const eventId = result.eventId ?? result.candidateIds?.[0];
                if (!eventId) {
                    return res.status(400).json({ error: 'Could not find a matching event to update' });
                }

                const existing = await this.eventService.findById(eventId);
                if (!existing || existing.userId !== userId) {
                    return res.status(404).json({ error: 'Event not found' });
                }

                const updates: Partial<Event> = {};
                if (result.changes.title) updates.title = result.changes.title;
                if (result.changes.location !== undefined) updates.location = result.changes.location;
                if (result.changes.startTime) updates.startTime = result.changes.startTime;
                if (result.changes.endTime) updates.endTime = result.changes.endTime;
                if (result.changes.duration) updates.duration = result.changes.duration;

                const updated = await this.eventService.update(eventId, updates);

                // Update family member tags if NLP extracted names
                if (result.changes.familyMemberNames !== undefined) {
                    const memberIds = this.resolveMemberIds(
                        result.changes.familyMemberNames, userFamilyMembers
                    );
                    await this.saveFamilyMemberTags(eventId, memberIds, userId!);
                }

                const [enriched] = await this.attachFamilyMembers([updated]);
                return res.json({
                    intent: 'update',
                    message: `Updated "${updated.title}"`,
                    event: enriched,
                });
            }

            // ── DELETE ──────────────────────────────────────────────────────────
            if (result.intent === 'delete') {
                if (!result.eventId && result.candidateIds && result.candidateIds.length > 1) {
                    const candidates = userEvents.filter(e => result.candidateIds!.includes(e.id));
                    return res.json({
                        intent: 'delete',
                        requiresDisambiguation: true,
                        candidates,
                        message: `Found ${candidates.length} matching events — which one did you mean?`,
                    });
                }

                const eventId = result.eventId ?? result.candidateIds?.[0];
                if (!eventId) {
                    return res.status(400).json({ error: 'Could not find a matching event to delete' });
                }

                const existing = await this.eventService.findById(eventId);
                if (!existing || existing.userId !== userId) {
                    return res.status(404).json({ error: 'Event not found' });
                }

                await this.eventService.delete(eventId);
                return res.json({
                    intent: 'delete',
                    message: `Deleted "${existing.title}"`,
                });
            }

            // ── QUERY ───────────────────────────────────────────────────────────
            if (result.intent === 'query') {
                const events = userEvents.filter(e => result.eventIds.includes(e.id));
                return res.json({
                    intent: 'query',
                    message: result.answer,
                    events,
                });
            }

            return res.status(400).json({ error: 'Unrecognised intent' });
        } catch (error) {
            console.error('Error handling NLP command:', error);
            return res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to process command',
            });
        }
    };

    /**
     * Delete an event
     */
    public deleteEvent = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = (req.user as any)?.id;

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
                where: { eventId: id }
            });

            // Delete the event
            await this.eventService.delete(id);

            if (eventRecipients.length > 0) {
                // Get user details for sender information
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOneOrFail({ where: { id: userId } });

                // Send calendar cancellations
                await this.emailService.sendCalendarCancellations(existingEvent, eventRecipients, {
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