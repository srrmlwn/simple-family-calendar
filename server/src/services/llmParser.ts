import '@anthropic-ai/sdk/shims/node';  // This must be the first import
import Anthropic from '@anthropic-ai/sdk';
import moment from 'moment-timezone';

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
    private defaultDuration: number = 60; // minutes

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({
            apiKey: apiKey
        });
    }

    /**
     * Parses a natural language string into a structured event object using Claude
     * @param input Natural language description of an event
     * @param timezone The user's timezone (e.g., 'America/New_York')
     * @returns ParsedEvent object with extracted information
     */
    public async parseEvent(input: string, timezone: string = 'UTC'): Promise<ParsedEvent> {
        console.log('Input:', input);
        console.log('Timezone:', timezone);
        
        const currentDate = new Date();
        const userCurrentTime = moment(currentDate).tz(timezone);
        
        // Create the prompt for Claude
        const prompt = `Parse the following event description into a structured format. Consider the user's timezone: ${timezone}
Current time in user's timezone: ${userCurrentTime.format('YYYY-MM-DD HH:mm:ss')}

Event description: "${input}"

Return a JSON object with the following structure:
{
    "title": "Event title",
    "description": "Event description (if any)",
    "startTime": "ISO timestamp in UTC",
    "endTime": "ISO timestamp in UTC",
    "isAllDay": boolean,
    "location": "Location (if any)"
}

Rules:
1. If no specific date is mentioned, assume it's for today or the next occurrence of the day if mentioned
2. If no time is specified and it's not an all-day event, don't set any time
3. Convert all times to UTC considering the user's timezone
4. For all-day events, set the start time to 00:00:00 UTC and end time to 23:59:59 UTC
5. If no duration is specified, use 1 hour as default
6. Extract location if mentioned
7. Separate title from other details like time, location, etc.

Response must be valid JSON.`;

        try {
            const message = await this.anthropic.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: 1000,
                temperature: 0.1,
                system: "You are a precise event parser that converts natural language event descriptions into structured data. Always return valid JSON.",
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
            console.error('Error in LLM Parser:', error);
            throw new Error('Failed to parse event details');
        }
    }
}

// Export a singleton instance
export const llmParser = (apiKey: string) => new LLMParser(apiKey); 