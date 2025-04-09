import * as chrono from 'chrono-node';
import { WordTokenizer, PorterStemmer } from 'natural';

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
  private tokenizer: WordTokenizer;

  constructor() {
    this.tokenizer = new WordTokenizer();
  }

  public parseEvent(input: string): ParsedEvent | null {
    if (!input || input.trim().length === 0) {
      return null;
    }

    try {
      // Clean the input
      const cleanedInput = input.replace(/\s+/g, ' ').trim();

      // Extract date/time information first
      const dateInfo = this.extractDateTime(cleanedInput);

      // Extract title and other details
      const { title, description, location } = this.extractDetails(cleanedInput, dateInfo.textUsed);

      // Calculate duration
      const duration = dateInfo.endTime
          ? Math.round((dateInfo.endTime.getTime() - dateInfo.startTime.getTime()) / (1000 * 60))
          : 60; // Default to 1 hour if no end time specified

      const isAllDay = dateInfo.isAllDay || duration >= 1440; // 24 hours

      let event = {
        title: title || 'Untitled Event',
        description,
        startTime: dateInfo.startTime,
        endTime: dateInfo.endTime || new Date(dateInfo.startTime.getTime() + 60 * 60 * 1000),
        duration,
        isAllDay,
        location
      };
      console.log("Input - " + input + "; Output - " + JSON.stringify(event));
      return event;
    } catch (error) {
      console.error('Error parsing event:', error);
      return null;
    }
  }

  private extractDateTime(input: string): {
    startTime: Date;
    endTime: Date | null;
    isAllDay: boolean;
    textUsed: string;
  } {
    // Try to parse with chrono
    const results = chrono.parse(input);

    if (results.length === 0) {
      // Default to now if no time specified
      const now = new Date();
      return {
        startTime: now,
        endTime: null,
        isAllDay: false,
        textUsed: ''
      };
    }

    const firstResult = results[0];

    // Check for all-day events
    const lowerInput = input.toLowerCase();
    const isAllDay = lowerInput.includes('all day') ||
        lowerInput.includes('whole day') ||
        lowerInput.includes('entire day');

    return {
      startTime: firstResult.start.date(),
      endTime: firstResult.end ? firstResult.end.date() : null,
      isAllDay,
      textUsed: firstResult.text
    };
  }

  private extractDetails(input: string, dateTimeText: string): {
    title: string;
    description?: string;
    location?: string;
  } {
    // Remove the date/time text to focus on the rest
    let remainingText = input.replace(dateTimeText, '').trim();

    if (!remainingText) {
      return { title: '' };
    }

    // Tokenize and process the remaining text
    const tokens = this.tokenizer.tokenize(remainingText);
    const stemmedTokens = tokens.map(token => PorterStemmer.stem(token.toLowerCase()));

    // Look for location indicators
    let location: string | undefined;
    const locationIndicators = ['at', 'in', 'on', 'location', 'place', 'room', 'address'];
    const locationIndex = stemmedTokens.findIndex(token =>
        locationIndicators.includes(token));

    if (locationIndex !== -1 && locationIndex < tokens.length - 1) {
      location = tokens.slice(locationIndex + 1).join(' ');
      remainingText = remainingText.replace(new RegExp(`${tokens[locationIndex]} ${location}`), '').trim();
    }

    // Look for description indicators
    let description: string | undefined;
    const descriptionIndicators = ['about', 'regarding', 'for', 'desc', 'details', 're'];
    const descIndex = stemmedTokens.findIndex(token =>
        descriptionIndicators.includes(token));

    if (descIndex !== -1 && descIndex < tokens.length - 1) {
      description = tokens.slice(descIndex + 1).join(' ');
      remainingText = remainingText.replace(new RegExp(`${tokens[descIndex]} ${description}`), '').trim();
    }

    // The remaining text is treated as the title
    const title = remainingText.trim();

    return { title, description, location };
  }
}

export default new NLPParser();


//------------------------------
// Example usage
const parser = new NLPParser();

const examples = [
  "Team meeting tomorrow at 2pm for 1 hour about Q2 planning in conference room A",
  "Dentist appointment next Monday from 9am to 10am",
  "Lunch with Sarah on Friday at noon at Cafe Milano",
  "All day workshop on June 15 about TypeScript best practices",
  "Vacation from July 1 to July 7",
  "" // Empty string test
];

examples.forEach(example => {
  console.log(`Input: "${example}"`);
  const parsed = parser.parseEvent(example);
  if (parsed) {
    console.log('Parsed:', {
      ...parsed,
      startTime: parsed.startTime.toLocaleString(),
      endTime: parsed.endTime.toLocaleString()
    });
  } else {
    console.log('Parsed: null (invalid input)');
  }
  console.log('-------------------');
});