# Agent Architecture: Hybrid Model + Telemetry

_Written: 2026-02-28_

---

## The Core Insight: Don't Replace the Intent Parser — Route Around It

The existing `IntentParser` is already good. It handles "add dentist Tuesday 3pm" or "what's on my calendar this week?" reliably in a single LLM call. Replacing it wholesale with a multi-turn agent would make every interaction slower and more expensive for no benefit.

The right architecture is a **routing layer** that sends messages down one of two paths:

```
Incoming message
       │
       ▼
  ┌─────────────────┐
  │  Context Router │  ← Is there active conversation context?
  └────────┬────────┘    Does this message reference prior turns?
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
  FAST          AGENT
  PATH          PATH
    │             │
  Existing     Multi-turn
  IntentParser  agent loop
  (1 LLM call) (N LLM calls,
                tool use,
                memory)
```

**Fast path** (existing behavior, no change):
- Simple, self-contained command: "Add dentist Tuesday 3pm", "What's on Friday?", "Delete soccer practice"
- No active conversation context (first message, or session expired)
- Cost: ~1 LLM call

**Agent path** (new):
- Active conversation context exists (follow-up to a prior message)
- Message contains references to prior context: "move it", "reschedule that", "what about Thursday instead?"
- Multi-step request: "Clear my Thursday afternoon and find time for a dentist"
- Complex ambiguity: multiple matching events, needs clarification
- Cost: 2-5 LLM calls

**The routing decision is almost free:** Check if an active conversation session exists for this user. If yes → agent path. If no → fast path. No extra LLM call needed for routing.

---

## Why This Hybrid Is the Right Architecture

**Cost distribution in practice:**
Most calendar interactions are self-contained commands. "Add X on Y at Z" is the dominant pattern. These stay on the fast path — single LLM call, same cost as today.

Multi-turn context is only needed when:
1. The user is mid-conversation ("move it to Thursday" after a prior message)
2. The agent asked a clarifying question and the user is responding
3. The user explicitly extends a prior thought

Rough estimate: 70-80% of interactions → fast path. 20-30% → agent path. The agent path costs 3x more on average. Net cost increase: ~50-90% per user. Manageable with appropriate pricing.

**Architectural compatibility:**
The fast path and agent path call the **same underlying service functions** — `createEvent`, `updateEvent`, `deleteEvent`, `listEvents`. The difference is who orchestrates the calls: the hardcoded router (fast path) or the LLM tool loop (agent path). The DB layer doesn't change at all.

---

## What We Need to Build

### Step 1: Telemetry (build first)
Before changing anything else, instrument every LLM call. You can't make an informed routing decision without data.

### Step 2: Conversation session store
A `conversation_sessions` table: `user_id`, `channel` (whatsapp/web), `messages` (JSONB), `updated_at`, `expires_at`. Session expires after 10 minutes of inactivity — at that point, the next message starts a new session on the fast path.

### Step 3: Context router
On every incoming message, check for an active session. If found → agent path. If not → fast path.

### Step 4: Agent path
Implement the multi-turn agent loop with LLM tool use for the agent path only. Fast path is untouched.

---

## Step 1: Telemetry — What to Measure

### Why telemetry first

You need answers to these questions before making any architectural decisions:

1. **What does the current LLM cost per user per month?** You don't know yet.
2. **What is the error/confusion rate?** How often does the intent parser get it wrong? (User says NO to a confirmation, or immediately sends a correction)
3. **What percentage of interactions are simple vs. complex?** This determines whether the hybrid routing assumption holds.
4. **Where is latency hurting UX?** Is the 2-3 second LLM wait noticeable? On which channels?
5. **What are the most common intents?** Create? Query? Which queries? This informs where agent capability adds the most value.

Without this data, every architectural decision is a guess.

---

### The `llm_calls` Table

```sql
CREATE TABLE llm_calls (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    channel         VARCHAR(20) NOT NULL,   -- 'web', 'whatsapp', 'digest', 'flyer'
    model           VARCHAR(50) NOT NULL,   -- 'claude-sonnet-4-6', etc.
    intent          VARCHAR(20),            -- 'create', 'update', 'delete', 'query', 'error', null
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,
    latency_ms      INTEGER,
    cost_usd        NUMERIC(10, 6),         -- calculated from token counts
    confirmed       BOOLEAN,                -- did user confirm? (null = no confirmation step)
    user_corrected  BOOLEAN DEFAULT FALSE,  -- did user immediately send a correction?
    error           TEXT,                   -- error message if call failed
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON llm_calls (user_id, created_at);
CREATE INDEX ON llm_calls (channel, created_at);
CREATE INDEX ON llm_calls (intent, created_at);
```

### What to Calculate

**Cost per model (approximate):**
- Claude Sonnet 4.6: $3 / 1M input tokens, $15 / 1M output tokens
- Track both so you can calculate actual cost per call and per user/month

**Derived metrics to query:**
```sql
-- Cost per user per month
SELECT user_id, SUM(cost_usd) as monthly_cost, COUNT(*) as calls
FROM llm_calls
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id ORDER BY monthly_cost DESC;

-- Intent distribution
SELECT intent, COUNT(*), AVG(latency_ms), SUM(cost_usd)
FROM llm_calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY intent;

-- Confirmation rejection rate (proxy for accuracy)
SELECT intent,
    COUNT(*) FILTER (WHERE confirmed = FALSE) as rejected,
    COUNT(*) FILTER (WHERE confirmed = TRUE) as accepted,
    ROUND(100.0 * COUNT(*) FILTER (WHERE confirmed = FALSE) / COUNT(*), 1) as rejection_pct
FROM llm_calls
WHERE confirmed IS NOT NULL
GROUP BY intent;

-- Error rate by channel
SELECT channel, COUNT(*) FILTER (WHERE error IS NOT NULL) as errors, COUNT(*) as total
FROM llm_calls GROUP BY channel;
```

---

### What to Log for Each LLM Call

#### In IntentParser (existing, web + WhatsApp NLP)
Log after every `parseIntent()` call. Capture:
- `user_id` — from the caller
- `channel` — passed in by caller ('web' or 'whatsapp')
- `model` — already known from the Anthropic client config
- `intent` — from the parsed result
- `prompt_tokens` — from the Anthropic API response (`message.usage.input_tokens`)
- `completion_tokens` — from the API response (`message.usage.output_tokens`)
- `latency_ms` — `Date.now()` before/after the API call
- `cost_usd` — calculated from token counts

#### In webhookController (WhatsApp bot)
After the LLM call: log `confirmed` (true/false based on whether a pending confirmation was created and resolved). On user reply of "NO": update the record's `confirmed = false`.

#### In DigestService and FlyerParser
Log separately under channel = 'digest' and channel = 'flyer'. Gives visibility into which features drive the most cost.

---

### The LLM Call Logger

A simple service that other services call — no changes to the DB schema or existing logic beyond adding one logging call per LLM interaction:

```typescript
// server/src/services/llmLogger.ts
interface LLMCallLog {
    userId: string;
    channel: 'web' | 'whatsapp' | 'digest' | 'flyer';
    model: string;
    intent?: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs: number;
    confirmed?: boolean;
    error?: string;
}

// Cost per 1M tokens (update when pricing changes)
const COST_PER_1M: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-6':      { input: 3.00,  output: 15.00 },
    'claude-opus-4-6':        { input: 15.00, output: 75.00 },
    'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00 },
};

export async function logLLMCall(log: LLMCallLog): Promise<void> {
    const pricing = COST_PER_1M[log.model];
    const costUsd = pricing
        ? ((log.promptTokens ?? 0) * pricing.input + (log.completionTokens ?? 0) * pricing.output) / 1_000_000
        : null;
    // fire-and-forget DB insert — don't await, don't block the response
    AppDataSource.getRepository(LLMCall).save({ ...log, costUsd }).catch(err =>
        console.error('[llm-logger] Failed to log LLM call:', err)
    );
}
```

Fire-and-forget is intentional — telemetry must never slow down the user-facing response.

---

## Revisiting the Roadmap Order

Given the hybrid model insight and the case for telemetry first, the actual build sequence is:

```
1. Telemetry (this sprint)
      ↓ gives you data to validate assumptions
2. Conversation session store (DB table only, no routing yet)
      ↓ foundation for everything else
3. Context router (trivial once session store exists)
      ↓ fast path unchanged, agent path for context-bearing messages
4. Agent path: multi-turn + tool use (only for the ~20-30% of complex interactions)
      ↓
5. Proactive messages (morning briefing, conflict alerts, evening preview)
```

Steps 1-3 are infrastructure with no visible product change and minimal risk. Step 4 is the first user-facing agent behavior. Step 5 is where the product starts to feel genuinely different.

---

## On Cost: The Honest Numbers

With telemetry you'll get the actual numbers. Here are the estimates to calibrate against:

**Current (single-turn, fast path only):**
- ~500 input tokens + ~200 output tokens per NLP call
- Cost per call: ~$0.0045 (Sonnet 4.6 pricing)
- A moderately active user making 3 NLP calls/day: ~$0.41/month in LLM costs

**With hybrid (70% fast path, 30% agent path at 3 calls avg):**
- Effective cost per user interaction: ~$0.0045 × 1.6 = ~$0.0072
- Same moderately active user: ~$0.65/month

**This suggests a $4-6/month subscription covers LLM costs for active users at ~6-9x margin** — entirely reasonable. The risk is power users who send 20+ messages/day, which telemetry will surface before it becomes a problem.

---

## Open Questions Telemetry Will Answer

- What is the actual P50/P95 latency of the current LLM calls? (Informs UX decisions about loading states)
- What percentage of confirmations are rejected with NO? (High rejection rate → parser accuracy problem, not an agent problem)
- What is the most common intent? (If 60% are queries, the query path is worth optimizing separately with a cheaper model)
- Are WhatsApp users more or less active than web users? (Informs which channel to prioritize for agent features)
- What is cost-per-user today? (Baseline for pricing model)
