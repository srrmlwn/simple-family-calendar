export interface ParsedEvent {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    duration: number; // In minutes
    isAllDay: boolean;
    location?: string;
}

export class NLPParser {
    private readonly currentDate: Date;
    private defaultDuration: number = 60; // minutes

    constructor() {
        this.currentDate = new Date();
    }

    /**
     * Parses a natural language string into a structured event object
     * @param input Natural language description of an event
     * @returns ParsedEvent object with extracted information
     */
    public parseEvent(input: string): ParsedEvent {
        // Sanitize input
        const sanitizedInput = input.trim();

        // Extract information from the input
        const title = this.extractTitle(sanitizedInput);
        const description = this.extractDescription(sanitizedInput);
        const location = this.extractLocation(sanitizedInput);
        const isAllDay = this.isAllDayEvent(sanitizedInput);

        // Extract dates and times
        const { startTime, endTime, duration } = this.extractTimeInformation(sanitizedInput, isAllDay);

        return {
            title,
            description,
            startTime,
            endTime,
            duration,
            isAllDay,
            location
        };
    }

    /**
     * Extracts the title from the input string
     */
    private extractTitle(input: string): string {
        // Common patterns that might indicate description or other parts rather than title
        const patternsList = [
            /\bon\s+(\d{1,2}(?:st|nd|rd|th)?)(?:\s+of\s+\w+)?/i, // "on 25th of March"
            /\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,           // "at 3pm", "at 3:30"
            /\bfrom\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,         // "from 3pm"
            /\buntil\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,        // "until 4pm"
            /\bstarting\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,     // "starting 4pm"
            /\bin\s+([^,.]+)/i,                                  // "in Conference Room"
            /\ball\s+day/i,                                      // "all day"
            /\bfor\s+\d+\s+(?:minutes|hours)/i,                  // "for 30 minutes"
            /\blocation\s*(?::|is|at)\s+([^,.]+)/i               // "location: Office"
        ];

        let modifiedInput = input;

        // Find the first occurrence of any pattern and use it as a cut-off point
        let firstPatternIndex = input.length;

        for (const pattern of patternsList) {
            const match = input.match(pattern);
            if (match && match.index !== undefined && match.index < firstPatternIndex) {
                firstPatternIndex = match.index;
            }
        }

        // Extract title considering the first pattern as a boundary
        if (firstPatternIndex < input.length) {
            modifiedInput = input.substring(0, firstPatternIndex).trim();
        }

        // If we have a very short title or nothing, extract the first sentence or first few words
        if (modifiedInput.length < 3) {
            const firstSentenceMatch = input.match(/^([^.!?]+)/);
            if (firstSentenceMatch) {
                modifiedInput = firstSentenceMatch[0].trim();

                // Further clean up the title by removing time and location patterns
                for (const pattern of patternsList) {
                    modifiedInput = modifiedInput.replace(pattern, '').trim();
                }
            }
        }

        // If still no good title, just take the first few words
        if (modifiedInput.length < 3) {
            const words = input.split(' ');
            modifiedInput = words.slice(0, Math.min(5, words.length)).join(' ');
        }

        return modifiedInput;
    }

    /**
     * Extracts the description from the input string
     */
    private extractDescription(input: string): string | undefined {
        // Look for description patterns
        const descPatterns = [
            /description:?\s+([^.]+\.?)/i,
            /about:?\s+([^.]+\.?)/i,
            /regarding:?\s+([^.]+\.?)/i,
            /details:?\s+([^.]+\.?)/i
        ];

        for (const pattern of descPatterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        // If no explicit description, check if there's text after the title
        // and not related to time, location, or other event properties
        const title = this.extractTitle(input);
        if (title) {
            const remainingText = input.replace(title, '').trim();

            // Remove time, location, and duration patterns from remaining text
            let potentialDesc = remainingText
                .replace(/\bon\s+(\d{1,2}(?:st|nd|rd|th)?)(?:\s+of\s+\w+)?/ig, '')
                .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/ig, '')
                .replace(/\bfrom\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/ig, '')
                .replace(/\buntil\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/ig, '')
                .replace(/\bin\s+([^,.]+)/ig, '')
                .replace(/\ball\s+day/ig, '')
                .replace(/\bfor\s+\d+\s+(?:minutes|hours)/ig, '')
                .replace(/\blocation\s*(?::|is|at)\s+([^,.]+)/ig, '')
                .trim();

            if (potentialDesc.length > 10) {
                return potentialDesc;
            }
        }

        return undefined;
    }

    /**
     * Extracts location information from the input string
     */
    private extractLocation(input: string): string | undefined {
        // Common location patterns
        const locationPatterns = [
            /\bin\s+([^,.]+?)(?:\s+on|\s+at|\s+from|\.|$)/i,
            /\bat\s+([^,.]+?)(?:\s+on|\s+from|\.|$)/i,
            /location:?\s+([^,.]+)/i,
            /place:?\s+([^,.]+)/i,
            /venue:?\s+([^,.]+)/i
        ];

        for (const pattern of locationPatterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                const potentialLocation = match[1].trim();

                // Filter out cases where we've matched a time expression
                if (!potentialLocation.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i) &&
                    !potentialLocation.match(/\d{1,2}(?:st|nd|rd|th)/i)) {
                    return potentialLocation;
                }
            }
        }

        return undefined;
    }

    /**
     * Determines if the event is marked as an all-day event
     */
    private isAllDayEvent(input: string): boolean {
        const allDayPatterns = [
            /\ball\s*day\b/i,
            /\bwhole\s*day\b/i,
            /\bfull\s*day\b/i,
            /\bdaily\b/i,
            /\bno\s*specific\s*time\b/i
        ];

        for (const pattern of allDayPatterns) {
            if (pattern.test(input)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extracts time-related information from the input string
     */
    private extractTimeInformation(input: string, isAllDay: boolean): { startTime: Date, endTime: Date, duration: number } {
        // Default is current date at 9 AM
        let startTime = new Date(this.currentDate);
        startTime.setHours(9, 0, 0, 0);

        let duration = this.defaultDuration;

        if (isAllDay) {
            // For all-day events, set start time to midnight and duration to 24 hours
            startTime.setHours(0, 0, 0, 0);
            duration = 24 * 60; // 24 hours in minutes
        } else {
            // Extract date information
            const dateInfo = this.extractDateInfo(input);
            if (dateInfo) {
                startTime = dateInfo;
            }

            // Extract time information
            const timeInfo = this.extractTimeInfo(input);
            if (timeInfo) {
                // Keep the date from startTime but use hours and minutes from timeInfo
                startTime.setHours(timeInfo.getHours(), timeInfo.getMinutes(), 0, 0);
            }

            // Extract duration if specified
            const extractedDuration = this.extractDuration(input);
            if (extractedDuration) {
                duration = extractedDuration;
            }
        }

        // Calculate end time based on start time and duration
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        return { startTime, endTime, duration };
    }

    /**
     * Extracts date information from the input string
     */
    private extractDateInfo(input: string): Date | null {
        const today = new Date(this.currentDate);
        const result = new Date(today);

        // Check for specific date patterns

        // Pattern: "on January 15th", "on 15th of January"
        const fullDatePattern = /\bon\s+(?:the\s+)?(?:(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)|(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?)/i;
        const fullDateMatch = input.match(fullDatePattern);

        if (fullDateMatch) {
            let day, month = -1;

            if (fullDateMatch[1] && fullDateMatch[2]) {
                day = parseInt(fullDateMatch[1], 10);
                month = this.getMonthNumber(fullDateMatch[2]);
            } else if (fullDateMatch[3] && fullDateMatch[4]) {
                month = this.getMonthNumber(fullDateMatch[3]);
                day = parseInt(fullDateMatch[4], 10);
            }

            if (day && month !== -1) {
                result.setDate(day);
                result.setMonth(month);
                return result;
            }
        }

        // Pattern: "on the 15th", "on the 15th of next month"
        const dayOnlyPattern = /\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)/i;
        const dayOnlyMatch = input.match(dayOnlyPattern);

        if (dayOnlyMatch) {
            const day = parseInt(dayOnlyMatch[1], 10);
            result.setDate(day);

            // Check if month is specified
            if (input.match(/next\s+month/i)) {
                result.setMonth(result.getMonth() + 1);
            } else if (input.match(/last\s+month/i)) {
                result.setMonth(result.getMonth() - 1);
            }

            return result;
        }

        // Pattern: "tomorrow", "next Monday", "this Friday"
        const relativeDayPatterns = [
            { pattern: /\btoday\b/i, days: 0 },
            { pattern: /\btomorrow\b/i, days: 1 },
            { pattern: /\bnext\s+day\b/i, days: 1 },
            { pattern: /\bday\s+after\s+tomorrow\b/i, days: 2 },
            { pattern: /\byesterday\b/i, days: -1 }
        ];

        for (const { pattern, days } of relativeDayPatterns) {
            if (pattern.test(input)) {
                result.setDate(result.getDate() + days);
                return result;
            }
        }

        // Pattern: "next Monday", "this Friday"
        const weekdayPattern = /\b(this|next|coming|on)\s+(\w+day)\b/i;
        const weekdayMatch = input.match(weekdayPattern);

        if (weekdayMatch) {
            const prefix = weekdayMatch[1].toLowerCase();
            const weekday = this.getDayNumber(weekdayMatch[2]);

            if (weekday !== -1) {
                const currentDay = today.getDay();
                let daysToAdd;

                if (prefix === 'next' || prefix === 'coming') {
                    // "Next Monday" means the Monday after this one
                    daysToAdd = (weekday - currentDay + 7) % 7;
                    if (daysToAdd === 0) daysToAdd = 7; // If it's already that day, go to next week
                } else {
                    // "This Monday" or "on Monday" means the closest Monday (including today)
                    daysToAdd = (weekday - currentDay + 7) % 7;
                }

                result.setDate(today.getDate() + daysToAdd);
                return result;
            }
        }

        // Pattern: MM/DD/YYYY or DD/MM/YYYY
        const numericDatePattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
        const numericDateMatch = input.match(numericDatePattern);

        if (numericDateMatch) {
            // Assume MM/DD format for US, but this could be configurable
            const month = parseInt(numericDateMatch[1], 10) - 1; // 0-based months
            const day = parseInt(numericDateMatch[2], 10);

            // If year is provided
            if (numericDateMatch[3]) {
                let year = parseInt(numericDateMatch[3], 10);
                if (year < 100) {
                    year += year < 50 ? 2000 : 1900;
                }
                result.setFullYear(year);
            }

            result.setMonth(month);
            result.setDate(day);
            return result;
        }

        return null;
    }

    /**
     * Extracts time information from the input string
     */
    private extractTimeInfo(input: string): Date | null {
        const result = new Date(this.currentDate);
        result.setSeconds(0, 0);

        // Pattern: "at 3pm", "at 15:30", "at 3:45pm"
        const timePattern = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
        const timeMatch = input.match(timePattern);

        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

            // Convert to 24-hour format if needed
            if (meridiem === 'pm' && hours < 12) {
                hours += 12;
            } else if (meridiem === 'am' && hours === 12) {
                hours = 0;
            }

            // If no am/pm specified and the hour is < 7, assume it's pm (e.g., "at 3" → 3pm, not 3am)
            // This is a heuristic and could be made configurable
            if (!meridiem && hours > 0 && hours < 7) {
                hours += 12;
            }

            result.setHours(hours, minutes);
            return result;
        }

        // Pattern: "from 2pm to 4pm", "from 14:00 until 16:30"
        const rangePattern = /\bfrom\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
        const rangeMatch = input.match(rangePattern);

        if (rangeMatch) {
            let hours = parseInt(rangeMatch[1], 10);
            const minutes = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
            const meridiem = rangeMatch[3] ? rangeMatch[3].toLowerCase() : null;

            if (meridiem === 'pm' && hours < 12) {
                hours += 12;
            } else if (meridiem === 'am' && hours === 12) {
                hours = 0;
            }

            // Same heuristic as above
            if (!meridiem && hours > 0 && hours < 7) {
                hours += 12;
            }

            result.setHours(hours, minutes);
            return result;
        }

        // Pattern: "in the morning", "in the afternoon", "in the evening"
        if (/\bin\s+the\s+morning\b/i.test(input)) {
            result.setHours(9, 0);
            return result;
        } else if (/\bin\s+the\s+afternoon\b/i.test(input)) {
            result.setHours(14, 0); // 2pm
            return result;
        } else if (/\bin\s+the\s+evening\b/i.test(input)) {
            result.setHours(18, 0); // 6pm
            return result;
        }

        return null;
    }

    /**
     * Extracts duration information from the input string
     */
    private extractDuration(input: string): number | null {
        // Pattern: "for 30 minutes", "for 2 hours", "for 1 hour and 30 minutes"
        const durationPattern = /\bfor\s+(\d+)\s+(minute|minutes|hour|hours)(?:\s+and\s+(\d+)\s+(minute|minutes))?\b/i;
        const durationMatch = input.match(durationPattern);

        if (durationMatch) {
            let totalMinutes = 0;

            // First duration part
            const value1 = parseInt(durationMatch[1], 10);
            const unit1 = durationMatch[2].toLowerCase();

            if (unit1.startsWith('hour')) {
                totalMinutes += value1 * 60;
            } else {
                totalMinutes += value1;
            }

            // Optional second part (e.g., "and 30 minutes")
            if (durationMatch[3] && durationMatch[4]) {
                const value2 = parseInt(durationMatch[3], 10);
                const unit2 = durationMatch[4].toLowerCase();

                if (unit2.startsWith('minute')) {
                    totalMinutes += value2;
                }
            }

            return totalMinutes;
        }

        // Pattern: "from 2pm to 4pm", "from 14:00 until 16:30"
        const rangePattern = /\bfrom\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(?:to|until|till)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
        const rangeMatch = input.match(rangePattern);

        if (rangeMatch) {
            // Parse start time
            let startHour = parseInt(rangeMatch[1], 10);
            const startMinute = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
            const startMeridiem = rangeMatch[3] ? rangeMatch[3].toLowerCase() : null;

            // Convert to 24-hour
            if (startMeridiem === 'pm' && startHour < 12) {
                startHour += 12;
            } else if (startMeridiem === 'am' && startHour === 12) {
                startHour = 0;
            }

            // Parse end time
            let endHour = parseInt(rangeMatch[4], 10);
            const endMinute = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : 0;
            const endMeridiem = rangeMatch[6] ? rangeMatch[6].toLowerCase() : null;

            // Convert to 24-hour
            if (endMeridiem === 'pm' && endHour < 12) {
                endHour += 12;
            } else if (endMeridiem === 'am' && endHour === 12) {
                endHour = 0;
            }

            // If no meridiem specified for end time but one was for start time, match it
            if (!endMeridiem && startMeridiem) {
                // If end hour is less than start hour, assume it crosses into the next meridiem
                if (endHour < startHour) {
                    if (startMeridiem === 'am') {
                        endHour += 12; // Crosses into PM
                    }
                } else {
                    // Otherwise assume same meridiem
                    if (startMeridiem === 'pm' && endHour < 12) {
                        endHour += 12;
                    }
                }
            }

            // Calculate duration in minutes
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            // Handle case where end time is before start time (next day)
            if (endMinutes <= startMinutes) {
                return (24 * 60 - startMinutes) + endMinutes;
            } else {
                return endMinutes - startMinutes;
            }
        }

        // Pattern: "until 4pm", "till 16:30"
        const untilPattern = /\b(?:until|till)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
        const untilMatch = input.match(untilPattern);

        if (untilMatch) {
            // Since we have only the end time, we would need the start time to calculate duration
            // This should be handled in the calling function that has access to the startTime
            // For now, just return null to use default duration
            return null;
        }

        return null;
    }

    /**
     * Helper method to convert month name to month number (0-based)
     */
    private getMonthNumber(monthName: string): number {
        const months = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december',
            'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];

        const index = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());

        if (index >= 0) {
            return index % 12; // Normalize to 0-11 range
        }

        return -1; // Not found
    }

    /**
     * Helper method to convert day name to day number (0 = Sunday, 6 = Saturday)
     */
    private getDayNumber(dayName: string): number {
        const days = [
            'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
            'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'
        ];

        const index = days.findIndex(d => d.toLowerCase() === dayName.toLowerCase());

        if (index >= 0) {
            return index % 7; // Normalize to 0-6 range
        }

        return -1; // Not found
    }
}

export default new NLPParser();