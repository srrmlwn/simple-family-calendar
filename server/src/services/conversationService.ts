import { AppDataSource } from '../data-source';
import { ConversationSession, SessionMessage } from '../entities/ConversationSession';

const SESSION_TTL_MINUTES = 10;

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
 * Appends a message to the session and resets the expiry window.
 */
export async function appendMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<void> {
    const repo = AppDataSource.getRepository(ConversationSession);
    const session = await repo.findOneByOrFail({ id: sessionId });
    const message: SessionMessage = {
        role,
        content,
        timestamp: new Date().toISOString(),
    };
    session.messages = [...session.messages, message];
    session.expiresAt = expiresAt();
    await repo.save(session);
}

/**
 * Immediately expires a session (e.g. after a completed action).
 */
export async function expireSession(sessionId: string): Promise<void> {
    const repo = AppDataSource.getRepository(ConversationSession);
    await repo.update(sessionId, { expiresAt: new Date() });
}
