import { LLMParser } from '../../src/services/llmParser';
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
        jest.setTimeout(30000); // 30 seconds

        beforeEach(() => {
            // Reset the time to 9 AM for each test
            const mockDate = new Date('2024-02-20T09:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(mockDate);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should parse a simple event with time', async () => {
            const input = 'Meeting with John tomorrow at 2pm';
            const timezone = 'America/New_York';
            
            const result = await parser.parseEvent(input, timezone);
            
            // Title assertions
            expect(result.title.toLowerCase()).toContain('meeting');
            expect(result.title.toLowerCase()).toContain('john');
            expect(result.isAllDay).toBe(false);
            
            // Time assertions
            const startTime = moment(result.startTime).tz(timezone);
            const endTime = moment(result.endTime).tz(timezone);
            
            expect(startTime.format('YYYY-MM-DD')).toBe(
                moment().tz(timezone).add(1, 'day').format('YYYY-MM-DD')
            );
            expect(startTime.hours()).toBe(14); // 2 PM
            expect(startTime.minutes()).toBe(0);
            expect(endTime.diff(startTime, 'minutes')).toBe(60); // Default duration
        });

        it('should parse an all-day event with specific date', async () => {
            const input = 'Company holiday party all day on December 25th';
            const timezone = 'America/Los_Angeles';
            
            const result = await parser.parseEvent(input, timezone);
            
            expect(result.title.toLowerCase()).toContain('holiday party');
            expect(result.isAllDay).toBe(true);
            
            const startDate = moment(result.startTime).tz(timezone);
            const endDate = moment(result.endTime).tz(timezone);
            
            // Date assertions
            expect(startDate.month()).toBe(11); // December (0-based)
            expect(startDate.date()).toBe(25);
            expect(startDate.hours()).toBe(0);
            expect(startDate.minutes()).toBe(0);
            
            // All-day event should end at 23:59:59
            expect(endDate.hours()).toBe(23);
            expect(endDate.minutes()).toBe(59);
            expect(endDate.seconds()).toBe(59);
            
            // Should be same day
            expect(startDate.format('YYYY-MM-DD')).toBe(endDate.format('YYYY-MM-DD'));
        });

        it('should parse event with location and specific time', async () => {
            const input = 'Team lunch at Pizzeria Delfina tomorrow at noon';
            const timezone = 'America/Los_Angeles';
            
            const result = await parser.parseEvent(input, timezone);
            
            expect(result.title.toLowerCase()).toContain('team lunch');
            expect(result.location?.toLowerCase()).toContain('pizzeria delfina');
            expect(result.isAllDay).toBe(false);
            
            const startTime = moment(result.startTime).tz(timezone);
            const endTime = moment(result.endTime).tz(timezone);
            
            // Time assertions
            expect(startTime.format('YYYY-MM-DD')).toBe(
                moment().tz(timezone).add(1, 'day').format('YYYY-MM-DD')
            );
            expect(startTime.hours()).toBe(12); // noon
            expect(startTime.minutes()).toBe(0);
            expect(endTime.diff(startTime, 'minutes')).toBe(60); // Default duration
        });

        it('should parse event with explicit duration and time', async () => {
            const input = 'Code review meeting for 45 minutes starting at 3pm';
            const timezone = 'UTC';
            
            const result = await parser.parseEvent(input, timezone);
            
            expect(result.title.toLowerCase()).toContain('code review');
            expect(result.isAllDay).toBe(false);
            expect(result.duration).toBe(45);
            
            const startTime = moment(result.startTime);
            const endTime = moment(result.endTime);
            
            // Time assertions
            expect(startTime.hours()).toBe(15); // 3 PM
            expect(startTime.minutes()).toBe(0);
            expect(endTime.diff(startTime, 'minutes')).toBe(45);
            expect(endTime.hours()).toBe(15);
            expect(endTime.minutes()).toBe(45);
        });

        it('should handle timezone conversion correctly', async () => {
            const input = 'Virtual meeting tomorrow at 9am';
            const timezone = 'Asia/Tokyo';
            
            const result = await parser.parseEvent(input, timezone);
            
            expect(result.title.toLowerCase()).toContain('virtual meeting');
            expect(result.isAllDay).toBe(false);
            
            const localTime = moment(result.startTime).tz(timezone);
            const utcTime = moment(result.startTime);
            
            // Time assertions in local timezone
            expect(localTime.format('YYYY-MM-DD')).toBe(
                moment().tz(timezone).add(1, 'day').format('YYYY-MM-DD')
            );
            expect(localTime.hours()).toBe(9);
            expect(localTime.minutes()).toBe(0);
            
            // Verify UTC conversion
            // Tokyo is UTC+9, so 9 AM Tokyo time is 0 AM UTC
            expect(utcTime.hours()).toBe(0);
            expect(utcTime.minutes()).toBe(0);
        });

        it('should parse event with date but no time as all-day event', async () => {
            const input = 'Team building day on March 15th';
            const timezone = 'Europe/London';
            
            const result = await parser.parseEvent(input, timezone);
            
            expect(result.title.toLowerCase()).toContain('team building');
            expect(result.isAllDay).toBe(true);
            
            const localDate = moment(result.startTime).tz(timezone);
            expect(localDate.month()).toBe(2); // March (0-based)
            expect(localDate.date()).toBe(15);
            expect(localDate.hours()).toBe(0);
            expect(localDate.minutes()).toBe(0);
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