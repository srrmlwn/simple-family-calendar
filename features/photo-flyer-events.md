# Feature: Photo / Flyer → Events (Bulk Import)

_Status: 🚧 In progress_

---

## What It Does

The user uploads a photo (or selects an image file) of a sports schedule, school calendar, or event flyer. The AI (Claude Sonnet 4.6 vision) extracts all calendar events from the image and shows a checklist confirmation screen. The user selects which events to keep and taps "Add N events" to bulk-create them on the calendar.

This is the "viral demo moment" feature — snap a soccer season schedule → 10 events added in 10 seconds.

---

## User-Facing Flow

1. User taps the 📷 camera icon in the NLPInput bar (next to the mic button)
2. Native file picker opens (`<input type="file" accept="image/jpeg,image/png,image/gif,image/webp">`) — on mobile this shows "Camera" as an option
3. A "Parsing…" spinner shows while the image is sent to the server
4. A BottomSheet slides up showing:
   - Small thumbnail of the uploaded image
   - Scrollable checklist of all extracted events (title, date/time, location, family member pills)
   - All events checked by default; user can uncheck events to skip
   - "Add N events" button that reflects the current checked count
5. User taps "Add N events" → events are created via parallel API calls
6. Toast: "Added 6 events" → calendar refreshes

---

## Files Touched

### New
- `server/src/controllers/flyerController.ts` — multer image upload + Claude vision → `ParsedFlyerEvent[]`
- `server/src/routes/flyer.ts` — `POST /api/flyer/parse-image`
- `client/src/components/FlyerImportSheet.tsx` — BottomSheet checklist confirmation UI

### Modified
- `server/src/app.ts` — mount `/api/flyer` route
- `client/src/services/eventService.ts` — add `ParsedFlyerEvent` type + `parseFromImage()`
- `client/src/components/NLPInput.tsx` — camera button, file input, flyer state, render FlyerImportSheet
- `client/src/pages/Calendar.tsx` — pass `familyMembers` prop to NLPInput

---

## Acceptance Criteria

1. Camera icon appears in the NLPInput bar between the mic and send buttons
2. Clicking the camera icon opens the native file picker
3. After selecting a valid image, a loading state shows ("Parsing image…")
4. BottomSheet opens with the extracted events listed as a checklist
5. All events are checked by default; user can uncheck individual events
6. "Add N events" button label updates as user checks/unchecks
7. Confirming creates all selected events and refreshes the calendar
8. Toast shows "Added N events" on success
9. If the image contains no events, the BottomSheet shows a "No events found" empty state
10. If an unsupported file type is selected, a toast error is shown
11. Family member names extracted from the flyer are shown as color-coded pills and resolved to IDs when creating events

---

## Security Considerations

- Image upload is JWT-protected (inherits from `/api/flyer` route mounted under `authenticateJWT`)
- File type validated server-side: only `image/jpeg`, `image/png`, `image/gif`, `image/webp` accepted (not HEIC, PDF, etc.)
- Max file size: 10 MB (enforced by multer)
- Image is held in memory only (multer `memoryStorage`) — never written to disk or stored
- Family member IDs are validated server-side when creating events (existing `createEvent` security)
- No user-controlled data is interpolated into HTML (no XSS surface)
