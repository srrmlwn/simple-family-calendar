import { HybridParser } from '../../src/services/hybridParser';
import { LLMParser } from '../../src/services/llmParser';
import { NLPParser } from '../../src/services/nlpParser';

// Mock the LLM and NLP parsers
jest.mock('../../src/services/llmParser');
jest.mock('../../src/services/nlpParser');

describe('HybridParser', () => {
    let parser: HybridParser;
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        parser = new HybridParser(mockApiKey);
    });

    it('should use LLM parser successfully', async () => {
        const input = 'Meeting tomorrow at 2pm';
        const timezone = 'America/New_York';
        const mockResult = {
            title: 'Meeting',
            startTime: new Date(),
            endTime: new Date(),
            duration: 60,
            isAllDay: false
        };

        // Mock successful LLM parsing
        (LLMParser.prototype.parseEvent as jest.Mock).mockResolvedValueOnce(mockResult);

        const result = await parser.parseEvent(input, timezone);

        expect(result).toEqual(mockResult);
        expect(LLMParser.prototype.parseEvent).toHaveBeenCalledWith(input, timezone);
        expect(NLPParser.prototype.parseEvent).not.toHaveBeenCalled();
    });

    it('should fall back to NLP parser when LLM fails', async () => {
        const input = 'Meeting tomorrow at 2pm';
        const timezone = 'America/New_York';
        const mockResult = {
            title: 'Meeting',
            startTime: new Date(),
            endTime: new Date(),
            duration: 60,
            isAllDay: false
        };

        // Mock LLM failure and NLP success
        (LLMParser.prototype.parseEvent as jest.Mock).mockRejectedValueOnce(new Error('LLM failed'));
        (NLPParser.prototype.parseEvent as jest.Mock).mockReturnValueOnce(mockResult);

        const result = await parser.parseEvent(input, timezone);

        expect(result).toEqual(mockResult);
        expect(LLMParser.prototype.parseEvent).toHaveBeenCalledWith(input, timezone);
        expect(NLPParser.prototype.parseEvent).toHaveBeenCalledWith(input, timezone);
    });

    it('should throw error when both parsers fail', async () => {
        const input = 'Meeting tomorrow at 2pm';
        const timezone = 'America/New_York';

        // Mock both parsers failing
        (LLMParser.prototype.parseEvent as jest.Mock).mockRejectedValueOnce(new Error('LLM failed'));
        (NLPParser.prototype.parseEvent as jest.Mock).mockImplementationOnce(() => {
            throw new Error('NLP failed');
        });

        await expect(parser.parseEvent(input, timezone))
            .rejects
            .toThrow('Failed to parse event with both LLM and NLP parsers');

        expect(LLMParser.prototype.parseEvent).toHaveBeenCalledWith(input, timezone);
        expect(NLPParser.prototype.parseEvent).toHaveBeenCalledWith(input, timezone);
    });
}); 