import { AppDataSource } from '../data-source';
import { ConversationSession, SessionMessage } from '../entities/ConversationSession';

const SESSION_TTL_MINUTES = 10;
// Maximum prior messages passed as context to the LLM (5 turns = 10 messages)
const MAX_HISTORY_MESSAGES = 10;

function expiresAt(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() + SESSION_TTL_MINUTES);
    return d;
}

/**
 * Returns an active (non-expired) session for the user+channel, or null.
 */
export async function getActiveSession(
    userId: string,
    channel: string
): Promise<ConversationSession | null> {
    const repo = AppDataSource.getRepository(ConversationSession);
    const session = await repo
        .createQueryBuilder('s')
        .where('s.user_id = :userId', { userId })
        .andWhere('s.channel = :channel', { channel })
        .andWhere('s.expires_at > NOW()')
        .orderBy('s.updated_at', 'DESC')
        .getOne();
    return session ?? null;
}

/**
 * Creates a new session for the user+channel, expiring in SESSION_TTL_MINUTES.
 */
export async function createSession(
    userId: string,
    channel: string
): Promise<ConversationSession> {
    const repo = AppDataSource.getRepository(ConversationSession);
    const session = repo.create({
        userId,
        channel,
        messages: [],
        expiresAt: expiresAt(),
    });
    return repo.save(session);
}

/**
 * Atomically appends one or more messages to the session and resets the expiry window.
 * Uses a single UPDATE to avoid race conditions from concurrent appends.
 */
export async function appendMessages(
    sessionId: string,
    newMessages: SessionMessage[]
): Promise<void> {
    await AppDataSource.query(
        `UPDATE conversation_sessions
         SET messages   = messages || $1::jsonb,
             updated_at = NOW(),
             expires_at = $2
         WHERE id = $3`,
        [JSON.stringify(newMessages), expiresAt(), sessionId]
    );
}

/**
 * Loads the last MAX_HISTORY_MESSAGES messages from a session as role/content pairs
 * suitable for passing directly to the Anthropic messages array.
 */
export function extractHistory(
    session: ConversationSession | null
): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!session) return [];
    return session.messages
        .slice(-MAX_HISTORY_MESSAGES)
        .map(m => ({ role: m.role, content: m.content }));
}

/**
 * Creates a session if none exists, then atomically appends the user + assistant
 * messages for this turn. Fire-and-forget safe — callers should `.catch(() => {})`.
 */
export async function upsertTurn(
    userId: string,
    channel: string,
    userMessage: string,
    assistantMessage: string,
    existingSessionId?: string
): Promise<void> {
    let sid = existingSessionId;
    if (!sid) {
        const newSession = await createSession(userId, channel);
        sid = newSession.id;
    }
    const now = new Date().toISOString();
    await appendMessages(sid, [
        { role: 'user',      content: userMessage,      timestamp: now },
        { role: 'assistant', content: assistantMessage, timestamp: now },
    ]);
}

/**
 * Immediately expires a session (e.g. after a completed action sequence).
 */
export async function expireSession(sessionId: string): Promise<void> {
    const repo = AppDataSource.getRepository(ConversationSession);
    await repo.update(sessionId, { expiresAt: new Date() });
}

export interface PendingToolCallData {
    toolName: string;
    toolInput: Record<string, unknown>;
    confirmationPrompt: string;
    // Batch ops for email ingest (multiple events confirmed in one YES/NO)
    batchOps?: Array<{ toolName: string; toolInput: Record<string, unknown> }>;
}

/**
 * Stores a pending tool call (awaiting YES/NO) on the session.
 * Replaces the in-memory pendingConfirmations Map.
 */
export async function storePendingToolCall(
    sessionId: string,
    pending: PendingToolCallData
): Promise<void> {
    await AppDataSource.query(
        `UPDATE conversation_sessions
         SET pending_tool_call = $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(pending), sessionId]
    );
}

/**
 * Clears the pending tool call on the session (after YES/NO).
 */
export async function clearPendingToolCall(sessionId: string): Promise<void> {
    await AppDataSource.query(
        `UPDATE conversation_sessions
         SET pending_tool_call = NULL, updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
    );
}
