import '@anthropic-ai/sdk/shims/node';
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import { Event } from '../entities/Event';
import { logLLMCall } from './llmLogger';

// Compact event shape passed to the LLM as context
interface EventContext {
    id: string;
    title: string;
    startTime: string; // ISO UTC
    endTime: string;   // ISO UTC
    location?: string;
}

// Family member context passed to the LLM
interface FamilyMemberContext {
    name: string;
}

// Shape of each intent result
export interface CreateIntentResult {
    intent: 'create';
    event: {
        title: string;
        startTime: Date;
        endTime: Date;
        isAllDay: boolean;
        location?: string;
        duration: number; // minutes
        familyMemberNames?: string[];
        /** RFC 5545 RRULE string without DTSTART, e.g. 'FREQ=WEEKLY;BYDAY=MO' */
        rrule?: string;
    };
}

export interface UpdateIntentResult {
    intent: 'update';
    eventId?: string;
    candidateIds?: string[];
    changes: {
        title?: string;
        startTime?: Date;
        endTime?: Date;
        location?: string;
        duration?: number;
        familyMemberNames?: string[];
    };
}

export interface DeleteIntentResult {
    intent: 'delete';
    eventId?: string;
    candidateIds?: string[];
}

export interface QueryIntentResult {
    intent: 'query';
    answer: string;
    eventIds: string[];
}

export type IntentResult =
    | CreateIntentResult
    | UpdateIntentResult
    | DeleteIntentResult
    | QueryIntentResult;

interface LLMRawResult {
    intent: string;
    event?: {
        title: string;
        startTime: string;
        endTime: string;
        isAllDay?: boolean;
        location?: string;
        familyMemberNames?: string[];
        rrule?: string;
    };
    changes?: {
        title?: string;
        location?: string;
        startTime?: string;
        endTime?: string;
        familyMemberNames?: string[];
    };
    eventId?: string;
    candidateIds?: string[];
    eventIds?: string[];
    answer?: string;
}

export class IntentParser {
    private anthropic: Anthropic;

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({ apiKey, timeout: 15000 });
    }

    /**
     * Parse the user's natural language command into a structured intent + data.
     * Existing events are provided as context for update/delete/query operations.
     */
    public async parseIntent(
        text: string,
        timezone: string,
        userEvents: Event[],
        familyMembers: FamilyMemberContext[] = [],
        logCtx?: { userId?: string; channel?: 'web' | 'whatsapp' },
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    ): Promise<IntentResult> {
        const now = moment().tz(timezone);

        // Build compact event context for the LLM (avoid large payloads)
        const eventContext: EventContext[] = userEvents.map(e => ({
            id: e.id,
            title: e.title,
            startTime: moment(e.startTime).utc().toISOString(),
            endTime: moment(e.endTime).utc().toISOString(),
            location: e.location,
        }));

        const familyMemberSection = familyMembers.length > 0
            ? `\nThe user's family members: ${familyMembers.map(m => m.name).join(', ')}\n`
            : '';

        const familyMemberCreateFormat = familyMembers.length > 0
            ? `,"familyMemberNames":["name1"] (only names from the family members list above; omit if none mentioned)`
            : '';

        const systemPrompt = `You are a calendar assistant. Today is ${now.format('dddd, MMMM D, YYYY [at] h:mm A')} (${timezone}).

The user's upcoming events (all times in UTC):
${JSON.stringify(eventContext, null, 2)}
${familyMemberSection}
Based on the user's message, determine what they want to do and return ONLY a JSON response — no markdown, no explanation.

--- RESPONSE FORMATS ---

CREATE a new event:
{"intent":"create","event":{"title":"string","startTime":"ISO UTC","endTime":"ISO UTC","isAllDay":false,"location":"string or omit"${familyMemberCreateFormat},"rrule":"RFC5545 RRULE string or omit if not recurring"}}

UPDATE an existing event (single match):
{"intent":"update","eventId":"uuid","changes":{"title":"string (only if changing)","startTime":"ISO UTC (only if changing)","endTime":"ISO UTC (only if changing)","location":"string (only if changing)"${familyMemberCreateFormat}}}

UPDATE — multiple events match:
{"intent":"update","candidateIds":["id1","id2"],"changes":{"startTime":"ISO UTC","endTime":"ISO UTC"}}

DELETE an existing event (single match):
{"intent":"delete","eventId":"uuid"}

DELETE — multiple events match:
{"intent":"delete","candidateIds":["id1","id2"]}

QUERY — user is asking about events:
{"intent":"query","answer":"concise plain-English answer","eventIds":["ids of relevant events (may be empty)"]}

--- RULES ---
1. Interpret relative dates ("tomorrow", "next Tuesday", "this weekend") relative to today's date above.
2. All startTime/endTime values in responses must be UTC ISO strings.
3. When changing only the date/time, preserve the original event's duration unless a new duration is explicitly stated.
4. Match events by title keywords and approximate date context; prefer the nearest upcoming match.
5. If the intent is ambiguous (could be create or update/delete), prefer CREATE.
6. For queries about what is on the calendar, answer concisely and list event titles + times.
7. Return ONLY valid JSON.
8. If family members are listed above and a person's name appears in the command, include their name in familyMemberNames. Only include names that exactly or closely match names in the family members list.
9. For CREATE: if the user's command implies recurrence ("every Monday", "every week", "daily", "bi-weekly", "monthly", "every other Thursday"), include an "rrule" field with an RFC 5545 RRULE string (WITHOUT DTSTART). Examples:
   - "every Monday" → "FREQ=WEEKLY;BYDAY=MO"
   - "every day" → "FREQ=DAILY"
   - "every Tuesday and Thursday" → "FREQ=WEEKLY;BYDAY=TU,TH"
   - "every other week on Wednesday" → "FREQ=WEEKLY;INTERVAL=2;BYDAY=WE"
   - "monthly" → "FREQ=MONTHLY"
   - "every first Monday of the month" → "FREQ=MONTHLY;BYDAY=1MO"
   - If the user specifies an end date (e.g. "until June 15"), append ";UNTIL=20260615T000000Z" to the rrule.
   - Omit "rrule" entirely if the event is not recurring.`;

        const userPrompt = `User command: ${text}`;

        const t0 = Date.now();
        let message: Anthropic.Message;
        try {
            message = await this.anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 1024,
                temperature: 0.1,
                system: systemPrompt,
                messages: [
                    ...conversationHistory,
                    { role: 'user', content: userPrompt },
                ],
            });
        } catch (err) {
            logLLMCall({
                userId: logCtx?.userId,
                channel: logCtx?.channel ?? 'web',
                model: 'claude-sonnet-4-6',
                latencyMs: Date.now() - t0,
                error: String(err),
            });
            throw err;
        }

        const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
        if (!raw) throw new Error('No response from intent parser');

        const jsonStr = raw.replace(/^```json\n?|\n?```$/g, '').trim();
        const parsed = JSON.parse(jsonStr) as LLMRawResult;

        const result = this.normalizeResult(parsed);
        logLLMCall({
            userId: logCtx?.userId,
            channel: logCtx?.channel ?? 'web',
            model: 'claude-sonnet-4-6',
            intent: result.intent,
            promptTokens: message.usage.input_tokens,
            completionTokens: message.usage.output_tokens,
            latencyMs: Date.now() - t0,
        });

        return result;
    }

    /** Convert raw LLM JSON into a typed IntentResult with Date objects. */
    private normalizeResult(raw: LLMRawResult): IntentResult {
        switch (raw.intent) {
            case 'create': {
                const evt = raw.event ?? { title: '', startTime: '', endTime: '' };
                const startTime = new Date(evt.startTime);
                const endTime = new Date(evt.endTime);
                const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60_000);
                return {
                    intent: 'create',
                    event: {
                        title: evt.title,
                        startTime,
                        endTime,
                        isAllDay: evt.isAllDay ?? false,
                        location: evt.location,
                        duration,
                        familyMemberNames: Array.isArray(evt.familyMemberNames)
                            ? evt.familyMemberNames
                            : undefined,
                        rrule: typeof evt.rrule === 'string' ? evt.rrule : undefined,
                    },
                };
            }

            case 'update': {
                const changes: UpdateIntentResult['changes'] = {};
                if (raw.changes?.title) changes.title = raw.changes.title;
                if (raw.changes?.location !== undefined) changes.location = raw.changes.location;
                if (raw.changes?.startTime) {
                    changes.startTime = new Date(raw.changes.startTime);
                }
                if (raw.changes?.endTime) {
                    changes.endTime = new Date(raw.changes.endTime);
                }
                if (changes.startTime && changes.endTime) {
                    changes.duration = Math.round(
                        (changes.endTime.getTime() - changes.startTime.getTime()) / 60_000
                    );
                }
                if (Array.isArray(raw.changes?.familyMemberNames)) {
                    changes.familyMemberNames = raw.changes?.familyMemberNames;
                }
                return {
                    intent: 'update',
                    eventId: raw.eventId,
                    candidateIds: raw.candidateIds,
                    changes,
                };
            }

            case 'delete':
                return {
                    intent: 'delete',
                    eventId: raw.eventId,
                    candidateIds: raw.candidateIds,
                };

            case 'query':
                return {
                    intent: 'query',
                    answer: raw.answer ?? '',
                    eventIds: Array.isArray(raw.eventIds) ? raw.eventIds : [],
                };

            default:
                throw new Error(`Unknown intent: ${raw.intent}`);
        }
    }
}

export const intentParser = (apiKey: string) => new IntentParser(apiKey);
