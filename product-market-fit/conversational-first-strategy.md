# Conversational-First Strategy

_Written: 2026-02-28_

## Honest Assessment

Current state: **a CRUD app with an NLP translation layer.** Goal: **a family calendar agent.**

The gap is architectural. The LLM today acts as a fancy regex — it parses intent, then exits. The controller takes over with a hardcoded router. Every interaction is single-turn and stateless.

A real agent holds conversations, uses tools, remembers context across turns, and initiates proactively.

---

## The Three Concrete Gaps

**1. No conversation memory.**
Every incoming message is treated as if it's the first. We pass calendar events as context (smart) but discard the conversation thread (a miss). "Move it to Friday" after "What's Sasha's dentist?" doesn't work. Fix: `conversation_sessions` table; last N messages threaded into every LLM call.

**2. The LLM decides intent, code decides action.**
This breaks for anything requiring reasoning — "clear my Thursday afternoon" means finding all afternoon events and deleting each one. The LLM can reason about that; a hardcoded `if/else` router can't. Fix: LLM tool use — give the LLM `create_event`, `list_events`, `delete_event`, `update_event` tools and let it call them in a loop.

**3. We only respond, we never initiate.**
The most valuable thing a calendar assistant can do is say "tomorrow is packed" or "I noticed a conflict" before you have to ask. Fix: proactive outbound WhatsApp messages (evening preview, conflict alerts, morning briefing).

---

## What We Already Have ✓

- Create, update, delete, query events via text
- Recurring events via NLP
- Family member tagging
- WhatsApp as input channel
- Flyer/photo parsing
- Confirmation step before all writes (critical for trust)

---

## Priority Order for What's Missing

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1 | Multi-turn conversation context | High | Medium |
| 2 | Proactive outbound messages (evening preview, conflict alerts, morning briefing) | High | Medium |
| 3 | Forward-and-forget from WhatsApp group chats | Very High | Low |
| 4 | Family WhatsApp group bot | High | Low (Twilio config) |
| 5 | Tool-use architecture (replace intent router) | Very High | High |
| 6 | Persistent conversation state (replace in-memory Map) | Medium | Low |
| 7 | Conflict detection at creation time | Medium | Low |

---

## Architecture Mental Model

**kinroo.ai is a database with a conversational interface, not a chatbot with a database.**

The database — events, family members, settings, conversation history — is the source of truth. Conversational interfaces (WhatsApp, web input) are read/write terminals into that database, mediated by an LLM. The LLM translates and reasons; it doesn't store.

Corollary: resist storing agent state in memory or loose JSON blobs. Conversation history, pending actions, and learned patterns should be first-class DB tables. That's what makes the agent reliable and auditable.

---

## What Not to Build

- **Full chat history UI in the web app** — the WhatsApp thread is the chat history; a parallel web chat UI is redundant
- **Another input method** — voice, text, WhatsApp photo, forwarded message is enough; solve depth before breadth
- **Two-way Google Calendar sync** — one-way import is enough for adoption; two-way sync is a reliability nightmare that only matters at higher retention
