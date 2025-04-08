import { NLPParser } from '../../src/services/nlpParser';

import nlp from 'compromise';
import datePlugin from 'compromise-dates';

// Add the date plugin to compromise
nlp.extend(datePlugin);

// Type assertion to add dates method to nlp
interface NlpWithDates extends ReturnType<typeof nlp> {
    dates(): any;
}

describe('NLP Parser', () => {
    let parser: NLPParser;

    beforeEach(() => {
        parser = new NLPParser();
    });

    test('should parse a basic event with date and time', () => {
        const input = "Meeting with John on May 15th at 2pm";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("Meeting with John");
            expect(result.startTime.getMonth()).toBe(4); // May is month 4 (0-indexed)
            expect(result.startTime.getDate()).toBe(15);
            expect(result.startTime.getHours()).toBe(14); // 2pm = 14:00
            expect(result.duration).toBe(60); // default duration
            expect(result.isAllDay).toBe(false);
        }
    });

    test('should parse an all-day event', () => {
        const input = "Conference on June 10th";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("Conference");
            expect(result.startTime.getMonth()).toBe(5); // June is month 5 (0-indexed)
            expect(result.startTime.getDate()).toBe(10);
            expect(result.isAllDay).toBe(true);
        }
    });

    test('should parse event with explicit duration', () => {
        const input = "Doctor appointment on Friday at 10am for 45 minutes";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("Doctor appointment");
            // We can't test exact date for "Friday" as it's relative, but we can check duration
            expect(result.duration).toBe(45);
            expect(result.startTime.getHours()).toBe(10);
            expect(result.startTime.getMinutes()).toBe(0);
            expect(result.endTime.getHours()).toBe(10);
            expect(result.endTime.getMinutes()).toBe(45);
        }
    });

    test('should parse event with explicit time range', () => {
        const input = "Team lunch tomorrow from 12pm to 1:30pm";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("Team lunch");
            expect(result.startTime.getHours()).toBe(12);
            expect(result.startTime.getMinutes()).toBe(0);
            expect(result.endTime.getHours()).toBe(13);
            expect(result.endTime.getMinutes()).toBe(30);
            expect(result.duration).toBe(90); // 1 hour and 30 minutes = 90 minutes
        }
    });

    test('should parse event with location', () => {
        const input = "Coffee with Sarah at Starbucks on Tuesday at 3pm";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("Coffee with Sarah");
            expect(result.location).toContain("Starbucks");
            expect(result.startTime.getHours()).toBe(15); // 3pm = 15:00
        }
    });

    test('should parse event with description', () => {
        const input = "Project kickoff meeting on Monday at 9am: Discuss new website design";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("Project kickoff meeting");
            expect(result.description).toContain("Discuss new website design");
            expect(result.startTime.getHours()).toBe(9);
            expect(result.startTime.getMinutes()).toBe(0);
        }
    });

    test('should handle common prefixes and clean up title', () => {
        const input = "Create an appointment for dental checkup on July 3rd at 11am";
        const result = parser.parseEvent(input);

        expect(result).not.toBeNull();

        if (result) {
            expect(result.title).toContain("dental checkup");
            expect(result.title).not.toContain("Create an appointment for");
            expect(result.startTime.getMonth()).toBe(6); // July is month 6 (0-indexed)
            expect(result.startTime.getDate()).toBe(3);
        }
    });

    test('should return null for input without date information', () => {
        const input = "This is not an event";
        const result = parser.parseEvent(input);

        expect(result).toBeNull();
    });
});