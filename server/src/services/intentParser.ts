import '@anthropic-ai/sdk/shims/node';
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import { Event } from '../entities/Event';

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

export class IntentParser {
    private anthropic: Anthropic;

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({ apiKey });
    }

    /**
     * Parse the user's natural language command into a structured intent + data.
     * Existing events are provided as context for update/delete/query operations.
     */
    public async parseIntent(
        text: string,
        timezone: string,
        userEvents: Event[],
        familyMembers: FamilyMemberContext[] = []
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
{"intent":"create","event":{"title":"string","startTime":"ISO UTC","endTime":"ISO UTC","isAllDay":false,"location":"string or omit"${familyMemberCreateFormat}}}

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
8. If family members are listed above and a person's name appears in the command, include their name in familyMemberNames. Only include names that exactly or closely match names in the family members list.`;

        const userPrompt = `User command: ${text}`;

        const message = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
        if (!raw) throw new Error('No response from intent parser');

        const jsonStr = raw.replace(/^```json\n?|\n?```$/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        return this.normalizeResult(parsed);
    }

    /** Convert raw LLM JSON into a typed IntentResult with Date objects. */
    private normalizeResult(raw: any): IntentResult {
        switch (raw.intent) {
            case 'create': {
                const startTime = new Date(raw.event.startTime);
                const endTime = new Date(raw.event.endTime);
                const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60_000);
                return {
                    intent: 'create',
                    event: {
                        title: raw.event.title,
                        startTime,
                        endTime,
                        isAllDay: raw.event.isAllDay ?? false,
                        location: raw.event.location,
                        duration,
                        familyMemberNames: Array.isArray(raw.event.familyMemberNames)
                            ? raw.event.familyMemberNames
                            : undefined,
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
                    changes.familyMemberNames = raw.changes.familyMemberNames;
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
