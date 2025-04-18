import 'openai/shims/node';  // This must be the first import
import OpenAI from 'openai';
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
    private openai: OpenAI;
    private defaultDuration: number = 60; // minutes

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    /**
     * Parses a natural language string into a structured event object using GPT-4
     * @param input Natural language description of an event
     * @param timezone The user's timezone (e.g., 'America/New_York')
     * @returns ParsedEvent object with extracted information
     */
    public async parseEvent(input: string, timezone: string = 'UTC'): Promise<ParsedEvent> {
        console.log('\n=== LLM Parser Start ===');
        console.log('Input:', input);
        console.log('Timezone:', timezone);
        
        const currentDate = new Date();
        const userCurrentTime = moment(currentDate).tz(timezone);
        console.log('Current time in user timezone:', userCurrentTime.format('YYYY-MM-DD HH:mm:ss z'));
        
        // Create the prompt for GPT-4
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
            console.log('Sending request to GPT-4...');
            console.log('--------------------------------');
            console.log(prompt);
            console.log('--------------------------------');
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a precise event parser that converts natural language event descriptions into structured data. Always return valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1, // Low temperature for more consistent outputs
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                console.error('No response from GPT-4');
                throw new Error('No response from GPT-4');
            }

            console.log('Raw GPT-4 Response:', response);

            const parsedResponse = JSON.parse(response);
            console.log('Parsed JSON Response:', JSON.stringify(parsedResponse, null, 2));
            
            // Convert ISO strings to Date objects
            const startTime = new Date(parsedResponse.startTime);
            const endTime = new Date(parsedResponse.endTime);
            
            // Log timezone conversions for debugging
            console.log('\nTimezone Conversions:');
            console.log('Start Time (UTC):', startTime.toISOString());
            console.log('Start Time (User TZ):', moment(startTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss z'));
            console.log('End Time (UTC):', endTime.toISOString());
            console.log('End Time (User TZ):', moment(endTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss z'));
            
            // Calculate duration in minutes
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            console.log('Calculated Duration:', duration, 'minutes');

            const result = {
                title: parsedResponse.title,
                description: parsedResponse.description,
                startTime,
                endTime,
                duration,
                isAllDay: parsedResponse.isAllDay,
                location: parsedResponse.location
            };

            console.log('\nFinal Parsed Event:', JSON.stringify(result, null, 2));
            console.log('=== LLM Parser End ===\n');

            return result;
        } catch (error) {
            console.error('Error in LLM Parser:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
            }
            console.log('=== LLM Parser End (with error) ===\n');
            throw new Error('Failed to parse event details');
        }
    }
}

// Export a singleton instance
export const llmParser = (apiKey: string) => new LLMParser(apiKey); 