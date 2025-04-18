import 'openai/shims/node';  // This must be the first import
import { LLMParser, ParsedEvent } from '../../src/services/llmParser';
import moment from 'moment-timezone';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

describe('LLMParser Integration Tests', () => {
    let parser: LLMParser;
    
    beforeAll(() => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set in .env.test file');
        }
        parser = new LLMParser(apiKey);
    });

    describe('parseEvent', () => {
        // Add timeout for API calls
        jest.setTimeout(60000); // 60 seconds

        it('should parse a simple event with time', async () => {
            const input = 'Meeting with John tomorrow at 2pm';
            const timezone = 'America/New_York';
            
            const result = await parser.parseEvent(input, timezone);
            
            const tomorrow = moment().tz(timezone).add(1, 'day');
            const expectedEvent: ParsedEvent = {
                title: 'Meeting with John',
                startTime: moment.tz(tomorrow.format('YYYY-MM-DD') + ' 14:00:00', timezone).toDate(),
                endTime: moment.tz(tomorrow.format('YYYY-MM-DD') + ' 15:00:00', timezone).toDate(),
                duration: 60,
                isAllDay: false
            };

            expect(result.title).toBe(expectedEvent.title);
            expect(result.isAllDay).toBe(expectedEvent.isAllDay);
            expect(result.duration).toBe(expectedEvent.duration);
            expect(result.startTime.getTime()).toBe(expectedEvent.startTime.getTime());
            expect(result.endTime.getTime()).toBe(expectedEvent.endTime.getTime());
        });

        it('should parse an all-day event with specific date', async () => {
            const input = 'Company holiday party all day on December 25th';
            const timezone = 'America/Los_Angeles';
            
            const result = await parser.parseEvent(input, timezone);
            
            const expectedEvent: ParsedEvent = {
                title: 'Company holiday party',
                startTime: moment.tz('2024-12-25 00:00:00', timezone).toDate(),
                endTime: moment.tz('2024-12-25 23:59:59', timezone).toDate(),
                duration: 1439, // 23 hours and 59 minutes
                isAllDay: true
            };

            expect(result.title).toBe(expectedEvent.title);
            expect(result.isAllDay).toBe(expectedEvent.isAllDay);
            expect(result.duration).toBe(expectedEvent.duration);
            expect(result.startTime.getTime()).toBe(expectedEvent.startTime.getTime());
            expect(result.endTime.getTime()).toBe(expectedEvent.endTime.getTime());
        });

        it('should parse event with location and specific time', async () => {
            const input = 'Team lunch at Pizzeria Delfina tomorrow at noon';
            const timezone = 'America/Los_Angeles';
            
            const result = await parser.parseEvent(input, timezone);
            
            const tomorrow = moment().tz(timezone).add(1, 'day');
            const expectedEvent: ParsedEvent = {
                title: 'Team lunch',
                description: undefined,
                location: 'Pizzeria Delfina',
                startTime: moment.tz(tomorrow.format('YYYY-MM-DD') + ' 12:00:00', timezone).toDate(),
                endTime: moment.tz(tomorrow.format('YYYY-MM-DD') + ' 13:00:00', timezone).toDate(),
                duration: 60,
                isAllDay: false
            };

            expect(result.title).toBe(expectedEvent.title);
            expect(result.location).toBe(expectedEvent.location);
            expect(result.isAllDay).toBe(expectedEvent.isAllDay);
            expect(result.duration).toBe(expectedEvent.duration);
            expect(result.startTime.getTime()).toBe(expectedEvent.startTime.getTime());
            expect(result.endTime.getTime()).toBe(expectedEvent.endTime.getTime());
        });

        it('should parse event with explicit duration and time', async () => {
            const input = 'Code review meeting for 45 minutes starting at 3pm';
            const timezone = 'UTC';
            
            const result = await parser.parseEvent(input, timezone);
            
            const today = moment().tz(timezone);
            const expectedEvent: ParsedEvent = {
                title: 'Code review meeting',
                startTime: moment.tz(today.format('YYYY-MM-DD') + ' 15:00:00', timezone).toDate(),
                endTime: moment.tz(today.format('YYYY-MM-DD') + ' 15:45:00', timezone).toDate(),
                duration: 45,
                isAllDay: false
            };

            expect(result.title).toBe(expectedEvent.title);
            expect(result.isAllDay).toBe(expectedEvent.isAllDay);
            expect(result.duration).toBe(expectedEvent.duration);
            expect(result.startTime.getTime()).toBe(expectedEvent.startTime.getTime());
            expect(result.endTime.getTime()).toBe(expectedEvent.endTime.getTime());
        });

        it('should handle timezone conversion correctly', async () => {
            const input = 'Virtual meeting tomorrow at 9am';
            const timezone = 'Asia/Tokyo';
            
            const result = await parser.parseEvent(input, timezone);
            
            const tomorrow = moment().tz(timezone).add(1, 'day');
            const expectedEvent: ParsedEvent = {
                title: 'Virtual meeting',
                startTime: moment.tz(tomorrow.format('YYYY-MM-DD') + ' 09:00:00', timezone).toDate(),
                endTime: moment.tz(tomorrow.format('YYYY-MM-DD') + ' 10:00:00', timezone).toDate(),
                duration: 60,
                isAllDay: false
            };

            expect(result.title).toBe(expectedEvent.title);
            expect(result.isAllDay).toBe(expectedEvent.isAllDay);
            expect(result.duration).toBe(expectedEvent.duration);
            expect(result.startTime.getTime()).toBe(expectedEvent.startTime.getTime());
            expect(result.endTime.getTime()).toBe(expectedEvent.endTime.getTime());
        });

        it('should parse event with date but no time as all-day event', async () => {
            const input = 'Team building day on March 15th';
            const timezone = 'Europe/London';
            
            const result = await parser.parseEvent(input, timezone);
            
            const expectedEvent: ParsedEvent = {
                title: 'Team building day',
                startTime: moment.tz('2024-03-15 00:00:00', timezone).toDate(),
                endTime: moment.tz('2024-03-15 23:59:59', timezone).toDate(),
                duration: 1439, // 23 hours and 59 minutes
                isAllDay: true
            };

            expect(result.title).toBe(expectedEvent.title);
            expect(result.isAllDay).toBe(expectedEvent.isAllDay);
            expect(result.duration).toBe(expectedEvent.duration);
            expect(result.startTime.getTime()).toBe(expectedEvent.startTime.getTime());
            expect(result.endTime.getTime()).toBe(expectedEvent.endTime.getTime());
        });

        it('should handle invalid input gracefully', async () => {
            const input = '';
            const timezone = 'UTC';
            
            await expect(parser.parseEvent(input, timezone))
                .rejects
                .toThrow('Failed to parse event details');
        });
    });
}); 