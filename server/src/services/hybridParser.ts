import { ParsedEvent, LLMParser } from './llmParser';
import { NLPParser } from './nlpParser';

export class HybridParser {
    private llmParser: LLMParser;
    private nlpParser: NLPParser;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.llmParser = new LLMParser(apiKey);
        this.nlpParser = new NLPParser();
    }

    /**
     * Attempts to parse an event using LLM first, falls back to NLP if LLM fails
     * @param input Natural language description of an event
     * @param timezone The user's timezone (e.g., 'America/New_York')
     * @returns ParsedEvent object with extracted information
     */
    public async parseEvent(input: string, timezone: string = 'UTC'): Promise<ParsedEvent> {
        try {
            // First attempt: Use LLM Parser
            console.log('Attempting to parse event with LLM...');
            const llmResult = await this.llmParser.parseEvent(input, timezone);
            console.log('LLM parsing successful');
            return llmResult;
        } catch (error) {
            // If LLM fails, fall back to NLP Parser
            console.log('LLM parsing failed, falling back to NLP parser...');
            console.error('LLM Error:', error);
            
            try {
                const nlpResult = this.nlpParser.parseEvent(input, timezone);
                console.log('NLP parsing successful');
                return nlpResult;
            } catch (nlpError) {
                console.error('NLP Error:', nlpError);
                throw new Error('Failed to parse event with both LLM and NLP parsers');
            }
        }
    }
}

// Export a singleton instance
export const hybridParser = (apiKey: string) => new HybridParser(apiKey); 