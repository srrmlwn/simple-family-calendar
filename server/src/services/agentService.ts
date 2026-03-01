import '@anthropic-ai/sdk/shims/node';
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';
import { FamilyMember } from '../entities/FamilyMember';
import { EventFamilyMember } from '../entities/EventFamilyMember';
import { EventService } from './eventService';
import { logLLMCall } from './llmLogger';
import { PendingToolCallData } from './conversationService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentInput {
    message: string;
    userId: string;
    timezone: string;
    channel: 'web' | 'whatsapp';
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    preloadedEvents: Event[];
    familyMembers: FamilyMember[];
}

export interface AgentResult {
    reply: string;
    intent?: 'create' | 'update' | 'delete' | 'query' | 'multi';
    pendingAction?: PendingToolCallData;  // WhatsApp: mutating op awaiting YES/NO
    createdEvent?: Event;
    updatedEvent?: Event;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
    {
        name: 'get_events',
        description: 'Retrieve calendar events in a date range. Use when you need events outside the pre-loaded context, or to find specific events by date.',
        input_schema: {
            type: 'object' as const,
            properties: {
                start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format (user\'s timezone)' },
                end_date:   { type: 'string', description: 'End date in YYYY-MM-DD format (user\'s timezone)' },
            },
            required: ['start_date', 'end_date'],
        },
    },
    {
        name: 'create_event',
        description: 'Create a new calendar event.',
        input_schema: {
            type: 'object' as const,
            properties: {
                title:               { type: 'string', description: 'Event title' },
                start_time:          { type: 'string', description: 'Start time as ISO UTC string' },
                end_time:            { type: 'string', description: 'End time as ISO UTC string' },
                is_all_day:          { type: 'boolean', description: 'True if this is an all-day event' },
                location:            { type: 'string', description: 'Event location (optional)' },
                family_member_names: { type: 'array', items: { type: 'string' }, description: 'Names of family members to tag (must match family member names exactly)' },
                rrule:               { type: 'string', description: 'RFC 5545 RRULE string for recurring events (e.g. FREQ=WEEKLY;BYDAY=MO), omit if not recurring' },
            },
            required: ['title', 'start_time', 'end_time', 'is_all_day'],
        },
    },
    {
        name: 'update_event',
        description: 'Update an existing calendar event. Only include fields that are changing.',
        input_schema: {
            type: 'object' as const,
            properties: {
                event_id:            { type: 'string', description: 'UUID of the event to update' },
                title:               { type: 'string', description: 'New title (omit if not changing)' },
                start_time:          { type: 'string', description: 'New start time as ISO UTC string (omit if not changing)' },
                end_time:            { type: 'string', description: 'New end time as ISO UTC string (omit if not changing)' },
                location:            { type: 'string', description: 'New location (omit if not changing)' },
                family_member_names: { type: 'array', items: { type: 'string' }, description: 'Updated list of tagged family member names (omit if not changing)' },
            },
            required: ['event_id'],
        },
    },
    {
        name: 'delete_event',
        description: 'Delete a calendar event.',
        input_schema: {
            type: 'object' as const,
            properties: {
                event_id: { type: 'string', description: 'UUID of the event to delete' },
            },
            required: ['event_id'],
        },
    },
];

const MUTATING_TOOLS = new Set(['create_event', 'update_event', 'delete_event']);
const MAX_TOOL_ITERATIONS = 6;

// ─── AgentService ─────────────────────────────────────────────────────────────

export class AgentService {
    private anthropic: Anthropic;
    private eventService: EventService;

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({ apiKey, timeout: 30000 });
        this.eventService = new EventService();
    }

    // ── Main entry point ────────────────────────────────────────────────────

    public async run(input: AgentInput): Promise<AgentResult> {
        const { message, userId, timezone, channel, history, preloadedEvents, familyMembers } = input;

        const messages: Anthropic.MessageParam[] = [
            ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user', content: message },
        ];

        const systemPrompt = this.buildSystemPrompt(timezone, preloadedEvents, familyMembers);
        let detectedIntent: AgentResult['intent'];
        let createdEvent: Event | undefined;
        let updatedEvent: Event | undefined;
        let operationCount = 0;

        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const t0 = Date.now();
            let response: Anthropic.Message;
            try {
                response = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 1024,
                    system: systemPrompt,
                    tools: TOOLS,
                    messages,
                });
            } catch (err) {
                logLLMCall({ userId, channel, model: 'claude-sonnet-4-6', latencyMs: Date.now() - t0, error: String(err) });
                throw err;
            }

            // Determine intent from this response's tool calls (for logging)
            const toolUseBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            );
            const mutatingBlock = toolUseBlocks.find(b => MUTATING_TOOLS.has(b.name));
            const callIntent = mutatingBlock
                ? (mutatingBlock.name === 'create_event' ? 'create'
                    : mutatingBlock.name === 'update_event' ? 'update' : 'delete')
                : toolUseBlocks.length > 0 ? 'query' : undefined;

            logLLMCall({
                userId, channel, model: 'claude-sonnet-4-6',
                intent: callIntent,
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                latencyMs: Date.now() - t0,
            });

            // ── Text response: we're done ─────────────────────────────────
            if (response.stop_reason === 'end_turn') {
                const reply = toolUseBlocks.length === 0
                    ? response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
                    : response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('');
                if (operationCount > 1) detectedIntent = 'multi';
                return { reply: reply || 'Done.', intent: detectedIntent, createdEvent, updatedEvent };
            }

            if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
                return { reply: 'Done.', intent: detectedIntent, createdEvent, updatedEvent };
            }

            // ── Tool use: process each block ──────────────────────────────
            messages.push({ role: 'assistant', content: response.content });

            // WhatsApp: intercept the first mutating tool — return pending confirmation
            if (channel === 'whatsapp' && mutatingBlock) {
                const toolInput = mutatingBlock.input as Record<string, unknown>;
                const conflicts = await this.detectConflicts(toolInput, mutatingBlock.name, userId, familyMembers);
                const confirmationPrompt = await this.buildConfirmationPrompt(
                    mutatingBlock.name, toolInput, familyMembers, conflicts, timezone
                );
                return {
                    reply: confirmationPrompt,
                    intent: callIntent as AgentResult['intent'],
                    pendingAction: {
                        toolName: mutatingBlock.name,
                        toolInput,
                        confirmationPrompt,
                    },
                };
            }

            // Web (or non-mutating tools on any channel): execute all tools
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of toolUseBlocks) {
                const toolInput = block.input as Record<string, unknown>;
                const { output, event } = await this.executeTool(
                    block.name, toolInput, userId, timezone, familyMembers, channel
                );
                if (block.name === 'create_event' && event) { createdEvent = event; operationCount++; }
                if (block.name === 'update_event' && event) { updatedEvent = event; operationCount++; }
                if (block.name === 'delete_event') operationCount++;
                if (callIntent && !detectedIntent) detectedIntent = callIntent as AgentResult['intent'];
                else if (detectedIntent && detectedIntent !== callIntent) detectedIntent = 'multi';
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: output });
            }

            messages.push({ role: 'user', content: toolResults });
        }

        if (operationCount > 1) detectedIntent = 'multi';
        return { reply: 'Done.', intent: detectedIntent, createdEvent, updatedEvent };
    }

    // ── Execute a confirmed pending action (WhatsApp YES path) ───────────────

    public async executePendingAction(
        pending: PendingToolCallData,
        userId: string,
        timezone: string,
        familyMembers: FamilyMember[]
    ): Promise<string> {
        const { toolName, toolInput } = pending;
        const { output } = await this.executeTool(toolName, toolInput, userId, timezone, familyMembers, 'whatsapp');
        // Strip any conflict warning from the execution output — user already confirmed
        const base = output.split('\n')[0];
        return `Done! ${base}`;
    }

    // ── Execute a single tool ────────────────────────────────────────────────

    private async executeTool(
        toolName: string,
        toolInput: Record<string, unknown>,
        userId: string,
        timezone: string,
        familyMembers: FamilyMember[],
        channel: 'web' | 'whatsapp'
    ): Promise<{ output: string; event?: Event }> {

        if (toolName === 'get_events') {
            const startDate = new Date(`${toolInput.start_date as string}T00:00:00`);
            const endDate   = new Date(`${toolInput.end_date as string}T23:59:59`);
            const events = await this.eventService.findByUserIdAndDateRange(userId, startDate, endDate, timezone);
            if (events.length === 0) return { output: 'No events in this range.' };
            const lines = events.map(e => {
                const start = moment(e.startTime).tz(timezone).format('ddd MMM D [at] h:mm A');
                return `• [${e.id}] ${e.title} — ${start}${e.location ? ` @ ${e.location}` : ''}`;
            });
            return { output: lines.join('\n') };
        }

        if (toolName === 'create_event') {
            const startTime = new Date(toolInput.start_time as string);
            const endTime   = new Date(toolInput.end_time as string);
            const duration  = Math.round((endTime.getTime() - startTime.getTime()) / 60_000);

            // Conflict check (web only — WhatsApp conflicts are shown in confirmation prompt)
            let conflictNote = '';
            if (channel === 'web') {
                const conflicts = await this.detectConflicts(toolInput, toolName, userId, familyMembers);
                if (conflicts.length > 0) {
                    conflictNote = `\n⚠️ Conflict: ${conflicts.map(c => `"${c.title}"`).join(', ')} at the same time.`;
                }
            }

            const event = new Event();
            event.title   = toolInput.title as string;
            event.startTime = startTime;
            event.endTime   = endTime;
            event.duration  = duration;
            event.isAllDay  = (toolInput.is_all_day as boolean) ?? false;
            event.location  = toolInput.location as string | undefined;
            event.userId    = userId;
            if (toolInput.rrule) event.rrule = toolInput.rrule as string;

            const saved = await this.eventService.create(event);

            const memberNames = (toolInput.family_member_names as string[] | undefined) ?? [];
            if (memberNames.length > 0) {
                const memberIds = this.resolveMemberIds(memberNames, familyMembers);
                await this.saveFamilyMemberTags(saved.id, memberIds, userId);
            }

            const forNote = memberNames.length > 0 ? ` for ${memberNames.join(', ')}` : '';
            return {
                output: `Created "${saved.title}"${forNote}${conflictNote}`,
                event: saved,
            };
        }

        if (toolName === 'update_event') {
            const eventId = toolInput.event_id as string;
            const existing = await this.eventService.findById(eventId);
            if (!existing || existing.userId !== userId) {
                return { output: 'Event not found or not authorized.' };
            }

            let conflictNote = '';
            if (channel === 'web' && (toolInput.start_time || toolInput.end_time)) {
                const conflicts = await this.detectConflicts(toolInput, toolName, userId, familyMembers, eventId);
                if (conflicts.length > 0) {
                    conflictNote = `\n⚠️ Conflict: ${conflicts.map(c => `"${c.title}"`).join(', ')} at the same time.`;
                }
            }

            const updates: Partial<Event> = {};
            if (toolInput.title)      updates.title     = toolInput.title as string;
            if (toolInput.location !== undefined) updates.location = toolInput.location as string;
            if (toolInput.start_time) updates.startTime = new Date(toolInput.start_time as string);
            if (toolInput.end_time)   updates.endTime   = new Date(toolInput.end_time as string);
            if (updates.startTime && updates.endTime) {
                updates.duration = Math.round(
                    (new Date(updates.endTime).getTime() - new Date(updates.startTime).getTime()) / 60_000
                );
            }

            const updated = await this.eventService.update(eventId, updates);

            if (Array.isArray(toolInput.family_member_names)) {
                const memberIds = this.resolveMemberIds(toolInput.family_member_names as string[], familyMembers);
                await this.saveFamilyMemberTags(eventId, memberIds, userId);
            }

            return { output: `Updated "${updated.title}"${conflictNote}`, event: updated };
        }

        if (toolName === 'delete_event') {
            const eventId = toolInput.event_id as string;
            const existing = await this.eventService.findById(eventId);
            if (!existing || existing.userId !== userId) {
                return { output: 'Event not found or not authorized.' };
            }
            const title = existing.title;
            await this.eventService.delete(eventId);
            return { output: `Deleted "${title}"` };
        }

        return { output: `Unknown tool: ${toolName}` };
    }

    // ── Conflict detection ───────────────────────────────────────────────────

    private async detectConflicts(
        toolInput: Record<string, unknown>,
        toolName: string,
        userId: string,
        familyMembers: FamilyMember[],
        excludeEventId?: string
    ): Promise<Event[]> {
        const memberNames = (toolInput.family_member_names as string[] | undefined) ?? [];
        if (memberNames.length === 0) return [];

        const startTime = toolInput.start_time
            ? new Date(toolInput.start_time as string)
            : toolName === 'update_event' ? undefined : undefined;
        const endTime = toolInput.end_time
            ? new Date(toolInput.end_time as string)
            : undefined;
        if (!startTime || !endTime) return [];

        const memberIds = this.resolveMemberIds(memberNames, familyMembers);
        if (memberIds.length === 0) return [];

        const rows = await AppDataSource.query<Event[]>(
            `SELECT DISTINCT e.*
             FROM events e
             JOIN event_family_members efm ON efm.event_id = e.id
             WHERE e.user_id = $1
               AND ($2::uuid IS NULL OR e.id != $2)
               AND efm.family_member_id = ANY($3::uuid[])
               AND NOT (e.end_time <= $4 OR e.start_time >= $5)`,
            [userId, excludeEventId ?? null, memberIds, startTime, endTime]
        );
        return rows;
    }

    // ── Confirmation prompt builder ──────────────────────────────────────────

    private async buildConfirmationPrompt(
        toolName: string,
        toolInput: Record<string, unknown>,
        familyMembers: FamilyMember[],
        conflicts: Event[],
        timezone: string
    ): Promise<string> {
        const conflictLine = conflicts.length > 0
            ? `\n⚠️ ${conflicts.map(c => `"${c.title}"`).join(', ')} already at this time.`
            : '';

        if (toolName === 'create_event') {
            const start   = moment(toolInput.start_time as string).tz(timezone).format('ddd MMM D [at] h:mm A');
            const end     = moment(toolInput.end_time as string).tz(timezone).format('h:mm A');
            const names   = (toolInput.family_member_names as string[] | undefined) ?? [];
            const forPart = names.length > 0 ? ` for ${names.join(', ')}` : '';
            const locPart = toolInput.location ? ` @ ${toolInput.location}` : '';
            return `Add "${toolInput.title}" on ${start}–${end}${locPart}${forPart}?${conflictLine}\n\nReply YES to confirm or NO to cancel.`;
        }

        if (toolName === 'update_event') {
            const eventId  = toolInput.event_id as string;
            const existing = await this.eventService.findById(eventId);
            const title    = existing?.title ?? 'that event';
            const parts: string[] = [];
            if (toolInput.title)      parts.push(`rename to "${toolInput.title}"`);
            if (toolInput.start_time) parts.push(`move to ${moment(toolInput.start_time as string).tz(timezone).format('ddd MMM D [at] h:mm A')}`);
            if (toolInput.location !== undefined) parts.push(`location: ${toolInput.location || '(none)'}`);
            const changeSummary = parts.length > 0 ? ` — ${parts.join(', ')}` : '';
            return `Update "${title}"${changeSummary}?${conflictLine}\n\nReply YES to confirm or NO to cancel.`;
        }

        if (toolName === 'delete_event') {
            const eventId  = toolInput.event_id as string;
            const existing = await this.eventService.findById(eventId);
            const title    = existing?.title ?? 'that event';
            const timeStr  = existing
                ? ` (${moment(existing.startTime).tz(timezone).format('ddd MMM D [at] h:mm A')})`
                : '';
            return `Delete "${title}"${timeStr}?\n\nReply YES to confirm or NO to cancel.`;
        }

        return 'Confirm this action?\n\nReply YES to confirm or NO to cancel.';
    }

    // ── System prompt ────────────────────────────────────────────────────────

    private buildSystemPrompt(
        timezone: string,
        preloadedEvents: Event[],
        familyMembers: FamilyMember[]
    ): string {
        const now = moment().tz(timezone);

        const eventContext = preloadedEvents.map(e => ({
            id:        e.id,
            title:     e.title,
            startTime: moment(e.startTime).utc().toISOString(),
            endTime:   moment(e.endTime).utc().toISOString(),
            location:  e.location,
        }));

        const familySection = familyMembers.length > 0
            ? `\nFamily members: ${familyMembers.map(m => m.name).join(', ')}\n`
            : '';

        return `You are a family calendar assistant. Today is ${now.format('dddd, MMMM D, YYYY [at] h:mm A')} (${timezone}).

The user's upcoming events (all times UTC):
${JSON.stringify(eventContext, null, 2)}
${familySection}
Use your tools to help the user manage their calendar.

Guidelines:
1. For create/update/delete, call the appropriate tool. Do not ask for confirmation yourself — the system handles that.
2. For queries, answer from the event context above. Call get_events only for date ranges outside the context.
3. If a request references a specific event but multiple candidates match, call get_events to list them and ask the user to clarify.
4. Use conversation history to resolve references like "move it", "reschedule that", "the dentist next week".
5. All times you receive are UTC. When displaying times back, convert to the user's timezone (${timezone}).
6. Be brief and conversational. No markdown formatting in responses.
7. If the user asks to see their calendar visually, view it in an app, or open the calendar, send them to famcal.ai — include a deep link with the relevant date when helpful, e.g. https://famcal.ai/?date=${now.format('YYYY-MM-DD')} for today or https://famcal.ai/?date=YYYY-MM-DD for a specific date. They will need to log in if not already.`;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

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

    private async saveFamilyMemberTags(
        eventId: string,
        memberIds: string[],
        userId: string
    ): Promise<void> {
        const { In } = await import('typeorm');
        const efmRepo = AppDataSource.getRepository(EventFamilyMember);
        await efmRepo.delete({ eventId });
        if (memberIds.length === 0) return;
        const fmRepo = AppDataSource.getRepository(FamilyMember);
        const members = await fmRepo.find({ where: { id: In(memberIds), userId } });
        const tags = members.map(m => {
            const tag = new EventFamilyMember();
            tag.eventId = eventId;
            tag.familyMemberId = m.id;
            return tag;
        });
        await efmRepo.save(tags);
    }
}

export const agentService = (apiKey: string) => new AgentService(apiKey);
