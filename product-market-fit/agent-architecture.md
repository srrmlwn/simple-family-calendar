# Agent Architecture: Hybrid Model + Telemetry

_Written: 2026-02-28_

## The Right Architecture: Hybrid Routing

Don't replace the IntentParser wholesale — route around it. The existing single-turn parser is fast and good for simple commands. Reserve the multi-turn agent for interactions that actually need it.

```
Incoming message
       │
       ▼
  ┌─────────────────┐
  │  Context Router │  ← Active conversation session?
  └────────┬────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
  FAST          AGENT
  PATH          PATH
    │             │
  Existing     Multi-turn loop
  IntentParser  with LLM tool use
  (1 LLM call)  (2-5 LLM calls)
```

**Fast path:** Simple, self-contained commands. No active conversation context. "Add dentist Tuesday 3pm", "What's on Friday?", "Delete soccer practice."

**Agent path:** Active conversation context exists, or message references prior context ("move it", "that dentist"), or multi-step request ("clear my Thursday afternoon").

**Routing decision is free:** Check for an active `conversation_sessions` record. If found → agent path. If not → fast path. No extra LLM call needed.

**Cost split in practice:** ~70-80% fast path (1 call), ~20-30% agent path (~3 calls avg). Net cost increase ~50-90% per user vs. today. Manageable with $4-6/month subscription.

---

## Build Sequence

1. **Telemetry** — instrument every LLM call before changing anything
2. **Conversation session store** — `conversation_sessions` DB table (no routing yet)
3. **Context router** — trivial once session store exists; fast path unchanged
4. **Agent path** — multi-turn + tool use, only for the ~20-30% of complex interactions
5. **Proactive messages** — morning briefing, conflict alerts, evening preview

Steps 1-3 are infrastructure with no visible product change. Step 4 is the first user-facing agent behavior. Step 5 is where the product starts to feel genuinely different.

---

## Telemetry First

You need answers before making architectural decisions:
- What does LLM cost per user per month?
- What is the intent parser error rate? (User says NO to a confirmation)
- What % of interactions are simple vs. complex?
- Where is latency hurting UX?
- What are the most common intents?

### The `llm_calls` Table

```sql
CREATE TABLE llm_calls (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID REFERENCES users(id),
    channel           VARCHAR(20) NOT NULL,   -- 'web', 'whatsapp', 'digest', 'flyer'
    model             VARCHAR(50) NOT NULL,
    intent            VARCHAR(20),            -- 'create', 'update', 'delete', 'query', 'error'
    prompt_tokens     INTEGER,
    completion_tokens INTEGER,
    latency_ms        INTEGER,
    cost_usd          NUMERIC(10, 6),
    confirmed         BOOLEAN,                -- null = no confirmation step
    user_corrected    BOOLEAN DEFAULT FALSE,
    error             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### LLM Call Logger

```typescript
// server/src/services/llmLogger.ts
const COST_PER_1M: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
    'claude-opus-4-6':           { input: 15.00, output: 75.00 },
    'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00 },
};

export async function logLLMCall(log: LLMCallLog): Promise<void> {
    const pricing = COST_PER_1M[log.model];
    const costUsd = pricing
        ? ((log.promptTokens ?? 0) * pricing.input + (log.completionTokens ?? 0) * pricing.output) / 1_000_000
        : null;
    // fire-and-forget — telemetry must never slow down the user-facing response
    AppDataSource.getRepository(LLMCall).save({ ...log, costUsd }).catch(err =>
        console.error('[llm-logger] Failed to log LLM call:', err)
    );
}
```

Log in: `IntentParser` (after every `parseIntent()` call), `webhookController` (update `confirmed` on user reply), `DigestService`, `FlyerParser`.

---

## Cost Estimates

**Current (single-turn, fast path only):**
- ~500 input + ~200 output tokens per call → ~$0.0045/call (Sonnet 4.6)
- Moderately active user (3 NLP calls/day): ~$0.41/month

**With hybrid (70% fast, 30% agent at 3 calls avg):**
- Effective cost per interaction: ~$0.0072
- Same user: ~$0.65/month

**$4-6/month subscription covers LLM costs at ~6-9x margin.** Risk is power users at 20+ messages/day — telemetry will surface this before it's a problem.
