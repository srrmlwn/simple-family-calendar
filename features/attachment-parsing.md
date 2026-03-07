# Feature: Attachment Parsing (PDF, DOCX, Images)

**Status:** In development
**Branch:** `feat/attachment-parsing`

---

## What This Feature Does

Users can attach documents (PDF, Word, images) to extract calendar events from them. Two surfaces:

1. **In-app input bar** — paperclip button opens a file picker; parsed events appear in `FlyerImportSheet` for confirmation before being created.
2. **WhatsApp** — user sends a media attachment to the WhatsApp number; bot replies with a text summary and a YES/NO confirmation prompt (one media item at a time).

---

## Supported File Types

| Type | MIME | Parser |
|---|---|---|
| JPEG / PNG / GIF / WebP | `image/*` | Claude vision API (existing) |
| PDF | `application/pdf` | Claude document API (`type: "document"`) |
| Word (.docx) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` text extraction → Claude |
| Word (.doc) | `application/msword` | Not supported (error message) |

**Size limit:** 20 MB for all types.

**One attachment at a time** on WhatsApp. If the user sends multiple, only the first (`MediaUrl0`) is processed.

---

## Files Changed

### Server
- `server/src/controllers/flyerController.ts` — add `uploadDocument` multer config + `parseDocument` handler routing by MIME type
- `server/src/routes/flyer.ts` — add `POST /api/flyer/parse-document`
- `server/src/services/twilioService.ts` — add `downloadTwilioMedia(url)` helper
- `server/src/controllers/webhookController.ts` — detect `NumMedia > 0`, download + parse attachment, reply with event summary + YES/NO
- `server/src/services/agentService.ts` — add `executeCreateEvents(events, userId)` to batch-create parsed events on YES

### Client
- `client/src/components/NLPInput.tsx` — paperclip icon replaces camera; accept PDF + DOCX; route to correct service call by file type
- `client/src/services/eventService.ts` — add `parseFromDocument(file)` calling `/api/flyer/parse-document`

### New dependency
- `mammoth` (server) — .docx → plain text extraction

---

## New API Route

```
POST /api/flyer/parse-document
Content-Type: multipart/form-data

Fields:
  document  File     (image/*, application/pdf, .docx)
  timezone  string

Response: { events: ParsedFlyerEvent[] }
```

The existing `/api/flyer/parse-image` route is preserved for backward compatibility.

---

## WhatsApp Flow

```
User sends attachment
  → Twilio POST /api/webhooks/twilio with NumMedia=1, MediaUrl0=..., MediaContentType0=...
  → Server downloads media (HTTP Basic auth: AccountSid:AuthToken)
  → Route by content type to image/PDF/DOCX parser
  → Format reply:
      "Found 2 events:
       1. Soccer practice – Mon Mar 10, 4:00 PM
       2. PTA meeting – Tue Mar 18, 6:30 PM

       Reply YES to add all, or NO to cancel."
  → Store events array in pendingToolCall (existing mechanism)
  → User replies YES → executeCreateEvents → "Added 2 events!"
  → User replies NO  → "Cancelled."
```

---

## Acceptance Criteria

1. [ ] PDF uploaded in app → FlyerImportSheet shows parsed events → confirm → events on calendar
2. [ ] DOCX uploaded in app → same flow
3. [ ] Image uploaded in app → same flow (no regression)
4. [ ] Unsupported file type (e.g. .xls) → clear error "Unsupported file type. Please use PDF, Word (.docx), or an image."
5. [ ] File too large (>20MB) → "File is too large. Maximum size is 20 MB."
6. [ ] WhatsApp image attachment → parsed → YES/NO confirm → events created
7. [ ] WhatsApp PDF attachment → parsed → YES/NO confirm → events created
8. [ ] WhatsApp DOCX attachment → parsed → YES/NO confirm → events created
9. [ ] WhatsApp text message with no attachment → unchanged behavior (no regression)
10. [ ] Empty/unparseable document → "No events found in that document. Try a clearer image or a different file."

---

## Security Considerations

- Multer file filter enforces MIME type allowlist server-side (client `accept` is UX-only)
- Twilio media download uses Basic auth (AccountSid:AuthToken from config) — no user-supplied URLs
- All document parsing routes require `authenticateToken` middleware
- File buffers processed in-memory, never written to disk
