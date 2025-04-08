// src/services/nlpParser.ts
import nlp from 'compromise';
import datePlugin from 'compromise-dates';

// Add the date plugin to compromise
nlp.extend(datePlugin);

// Default event duration in minutes
const DEFAULT_DURATION = 60;

interface ParsedEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // In minutes
  isAllDay: boolean;
  location?: string;
}

// Type assertion to add dates method to nlp
interface NlpWithDates extends ReturnType<typeof nlp> {
  dates(): any;
}

export class NLPParser {
  /**
   * Parse a natural language string into event data
   *
   * Examples:
   * - "Create an appointment for Rowan's birthday for Apr 6th at 4:30pm"
   * - "Soccer practice tomorrow from 3pm to 5pm"
   * - "Dinner with Mom on Friday at 7"
   * - "Doctor appointment next Tuesday at 10am for 45 minutes"
   */
  public parseEvent(input: string): ParsedEvent | null {
    try {
      const doc = nlp(input) as NlpWithDates;

      // Extract dates and times
      const dates = doc.dates().json();
      if (!dates || dates.length === 0) {
        console.log('No date information found');
        return null;
      }

      // Check the exact structure of the dates object from compromise
      console.log('Dates structure:', JSON.stringify(dates[0]));

      // Get the first date information
      // In compromise-dates, the structure might be dates[0].dates
      const dateInfo = dates[0].dates || dates[0];

      if (!dateInfo || !dateInfo.start) {
        console.log('No start date found in:', dateInfo);
        return null;
      }

      // Extract date, time, and duration
      const startTime = new Date(dateInfo.start);

      // Determine if this is an all-day event
      // If the time part of the date string isn't mentioned or there's no "at" keyword
      const isAllDay = !dateInfo.start.includes(':') && !input.toLowerCase().includes(' at ');

      // Calculate end time based on duration or default
      let duration = DEFAULT_DURATION; // Default to 1 hour
      let endTime: Date;

      // Check if there's an explicit end date
      if (dateInfo.end) {
        endTime = new Date(dateInfo.end);
        // Calculate the duration in minutes
        duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      } else {
        // Check if there's a duration mentioned
        const durationMatch = input.match(/for\s+(\d+)\s+(hour|minute|min)s?/i);
        if (durationMatch) {
          const amount = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();

          duration = unit.startsWith('hour') ? amount * 60 : amount;
        }

        // Set end time based on duration
        endTime = new Date(startTime.getTime() + duration * 60000);
      }

      // Extract title - remove date, time, and duration phrases
      let title = input;

      // Remove common command prefixes
      title = title.replace(/^(create|add|schedule|set up|new|make)\s+(an?\s+)?(appointment|event|meeting|reminder)(\s+for)?/i, '');

      // Remove date and time information
      // Instead of removing by direct manipulation, let's create a clean version
      const withoutDates = doc.not('#Date').not('#Time').text();
      title = withoutDates;

      // Remove duration phrases
      title = title.replace(/for\s+\d+\s+(hour|minute|min)s?/i, '');

      // Clean up the title
      title = title.replace(/\s+/g, ' ').trim();

      // If title is now empty, use a generic one
      if (!title) {
        title = 'Untitled Event';
      }

      // Extract location if any
      const locationMatches = input.match(/at\s+([^,.]+)(?=[,.]|$)/i);
      const location = locationMatches ? locationMatches[1].trim() : undefined;

      // Extract description if any (anything after ":" or "about" or "regarding")
      let description: string | undefined;
      const descMarkers = [': ', ' about ', ' regarding '];

      for (const marker of descMarkers) {
        const parts = input.split(new RegExp(marker, 'i'));
        if (parts.length > 1) {
          description = parts[1].trim();
          break;
        }
      }

      return {
        title,
        description,
        startTime,
        endTime,
        duration,
        isAllDay,
        location
      };
    } catch (error) {
      console.error('Error parsing event text:', error);
      return null;
    }
  }
}

export default new NLPParser();