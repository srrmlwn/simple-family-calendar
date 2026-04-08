import { AppDataSource } from '../data-source';
import { LLMCall } from '../entities/LLMCall';

export interface LLMCallLog {
    userId?: string;
    channel: 'web' | 'whatsapp' | 'sms' | 'flyer' | 'voice' | 'email';
    model: string;
    intent?: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs: number;
    confirmed?: boolean;
    error?: string;
}

// Cost per 1M tokens (input / output) in USD
const COST_PER_1M: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
    'claude-opus-4-6':           { input: 15.00, output: 75.00 },
    'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
};

/**
 * Fire-and-forget LLM call logger. Never awaited, never blocks the user-facing response.
 */
export function logLLMCall(log: LLMCallLog): void {
    const pricing = COST_PER_1M[log.model];
    const costUsd = pricing
        ? ((log.promptTokens ?? 0) * pricing.input + (log.completionTokens ?? 0) * pricing.output) / 1_000_000
        : undefined;

    AppDataSource.getRepository(LLMCall)
        .save({ ...log, costUsd })
        .catch(err => console.error('[llm-logger] Failed to log LLM call:', err));
}
