import '@anthropic-ai/sdk/shims/node';  // This must be the first import
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';
import { logLLMCall } from './llmLogger';

export interface ParsedEvent {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    duration: number; // In minutes
    isAllDay: boolean;
    location?: string;
}

export class LLMParser {
    private anthropic: Anthropic;
    private defaultDuration = 60; // minutes

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({
            apiKey: apiKey,
            timeout: 15000,
        });
    }

    /**
     * Parses a natural language string into a structured event object using Claude
     * @param input Natural language description of an event
     * @param timezone The user's timezone (e.g., 'America/New_York')
     * @returns ParsedEvent object with extracted information
     */
    public async parseEvent(input: string, timezone = 'UTC'): Promise<ParsedEvent> {
        console.log('Input:', input);
        console.log('Timezone:', timezone);
        
        const currentDate = new Date();
        const userCurrentTime = moment(currentDate).tz(timezone);
        
        // User input is passed separately from instructions to prevent prompt injection
        const systemPrompt = `You are a precise calendar event parser. Convert the user's event description into structured JSON.
Current time in user's timezone (${timezone}): ${userCurrentTime.format('YYYY-MM-DD HH:mm:ss')}

Return ONLY a valid JSON object with this structure:
{
    "title": "Event title",
    "description": "Event description (if any)",
    "startTime": "ISO timestamp in UTC",
    "endTime": "ISO timestamp in UTC",
    "isAllDay": boolean,
    "location": "Location (if any)"
}

Rules:
1. If no specific date is mentioned, assume today or the next occurrence of the named day
2. Convert all times to UTC using the user's timezone
3. For all-day events, set start to 00:00:00 UTC and end to 23:59:59 UTC
4. If no duration is specified, use 1 hour as default
5. Extract location if mentioned
6. Output JSON only — no explanation, no markdown.`;

        const prompt = `Parse this event description into the JSON format specified:\n\n${input}`;

        const t0 = Date.now();
        try {
            const message = await this.anthropic.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 1000,
                temperature: 0.1,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            const response = message.content[0].type === 'text' ? message.content[0].text : '';
            if (!response) {
                throw new Error('No response from Claude');
            }

            logLLMCall({
                channel: 'web',
                model: 'claude-sonnet-4-6',
                promptTokens: message.usage.input_tokens,
                completionTokens: message.usage.output_tokens,
                latencyMs: Date.now() - t0,
            });

            // Clean up markdown formatting from the response
            const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsedResponse = JSON.parse(jsonStr);
            console.log('Parsed JSON Response:', JSON.stringify(parsedResponse, null, 2));

            // Convert ISO strings to Date objects
            const startTime = new Date(parsedResponse.startTime);
            const endTime = new Date(parsedResponse.endTime);

            // Calculate duration in minutes
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

            const result = {
                title: parsedResponse.title,
                description: parsedResponse.description,
                startTime,
                endTime,
                duration,
                isAllDay: parsedResponse.isAllDay,
                location: parsedResponse.location
            };

            return result;
        } catch (error) {
            logLLMCall({
                channel: 'web',
                model: 'claude-sonnet-4-6',
                latencyMs: Date.now() - t0,
                error: String(error),
            });
            console.error('Error in LLM Parser:', error);
            throw new Error('Failed to parse event details');
        }
    }
}

// Export a singleton instance
export const llmParser = (apiKey: string) => new LLMParser(apiKey); 