/**
 * Get the user's timezone using Intl.DateTimeFormat
 * @returns The user's timezone string (e.g., 'America/New_York')
 */
export function getUserTimezone(): string {
    try {
        // Try to get the timezone from the browser
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        // Fallback to a default timezone if browser API fails
        console.warn('Failed to get user timezone, falling back to UTC');
        return 'UTC';
    }
}

/**
 * Convert a date to UTC while preserving the local time
 * @param date The date to convert
 * @param timezone The source timezone
 * @returns A new Date object in UTC
 */
export function convertToUTC(date: Date, timezone: string): Date {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const values: { [key: string]: string } = {};
    parts.forEach(part => {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    });

    // Create a new date string in ISO format
    const isoString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
    
    // Parse the ISO string to get a UTC date
    return new Date(isoString);
}

/**
 * Convert a UTC date to the specified timezone
 * @param date The UTC date to convert
 * @param timezone The target timezone
 * @returns A new Date object in the target timezone
 */
export function convertFromUTC(date: Date, timezone: string): Date {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    
    const values: { [key: string]: string } = {};
    parts.forEach(part => {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    });

    // Create a new date string in ISO format
    const isoString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
    
    // Parse the ISO string to get a date in the target timezone
    return new Date(isoString);
} 