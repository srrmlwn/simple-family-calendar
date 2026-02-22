# Family Members as First-Class Entities

_Created: 2026-02-21_

---

## Overview

Right now the app has "email recipients" — flat email contacts used only for notification delivery. Family members are a richer concept: persistent, named, colorful entities that live across all events, drive calendar filtering, and are the foundation for the family-wide weekly view.

This feature promotes family members from contacts to first-class calendar entities.

---

## User-Facing Behavior

### 1. Family Member Profiles (Settings)
- User can create named family members: name + color + optional emoji/avatar initial
- Suggested relationship labels (Mom, Dad, child name, etc.) but free-form text works too
- Full CRUD: add, edit, delete
- Managed in Settings, alongside existing email recipients
- A family member does NOT require an email address (young kids, etc.)

### 2. Tagging Events to Family Members
- When creating or editing an event (via `EventForm`), user can tag one or more family members
- Tags appear as colored pills/chips — e.g., 🔵 Maya, 🟢 Dad
- Tagging is optional; untagged events belong to the whole family

### 3. Calendar Filtering
- Filter pills appear above the calendar (header area): one pill per family member + an "All" pill
- Tapping a member pill filters the calendar to show only events tagged to that member
- Multiple members can be selected simultaneously (union filter)
- "All" clears the filter

### 4. Visual Identity on Events
- Events tagged to family members show colored dot(s) or member initials badge on event cards in `DayView` and `AgendaView`
- Color is the member's chosen color (from a fixed palette of 8–10 options)

---

## What This Is NOT (in this phase)

- No per-member login/accounts — the calendar is still owned by one parent
- No per-member iCal feeds yet (Tier 2 — depends on this feature)
- No conflict detection yet (Tier 2)
- No NLP integration for member tagging yet (follow-on)
- Does not replace `email_recipients` / notification system — those remain separate

---

## Data Model

### New table: `family_members`

```sql
CREATE TABLE family_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR NOT NULL,
    color       VARCHAR(7) NOT NULL,   -- hex color, e.g. "#3B82F6"
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

### New table: `event_family_members` (junction)

```sql
CREATE TABLE event_family_members (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    UNIQUE(event_id, family_member_id)
);
```

### No changes to existing tables
`email_recipients` and `event_recipients` are untouched. Family members and email contacts are separate concerns for now.

---

## Files to Touch

### Server (new)
| File | Action |
|---|---|
| `server/src/entities/FamilyMember.ts` | New TypeORM entity |
| `server/src/entities/EventFamilyMember.ts` | New junction entity |
| `server/src/controllers/familyMemberController.ts` | CRUD route handlers |
| `server/src/routes/familyMember.ts` | Express router |
| `server/src/migrations/<timestamp>-CreateFamilyMembers.ts` | DB migration |

### Server (modified)
| File | Change |
|---|---|
| `server/src/entities/Event.ts` | Add `OneToMany` → `EventFamilyMember` |
| `server/src/app.ts` (or main router) | Register `/api/family-members` route |
| `server/src/controllers/eventController.ts` | Include `familyMemberIds` on create/update, return members with event |

### Client (new)
| File | Action |
|---|---|
| `client/src/services/familyMemberService.ts` | API client (CRUD + get by event) |
| `client/src/components/FamilyMemberManager.tsx` | Settings UI for managing members |
| `client/src/components/FamilyMemberFilter.tsx` | Filter pills above calendar |

### Client (modified)
| File | Change |
|---|---|
| `client/src/types/index.ts` (or wherever types live) | Add `FamilyMember` type |
| `client/src/pages/Settings.tsx` | Add `FamilyMemberManager` section |
| `client/src/components/EventForm.tsx` | Add member tagging UI (multi-select chips) |
| `client/src/components/DayView.tsx` | Show member color dots on event cards |
| `client/src/components/AgendaView.tsx` | Show member color dots on event rows |
| `client/src/pages/Calendar.tsx` (or equivalent) | Add `FamilyMemberFilter` + filter state |

---

## API Design

```
GET    /api/family-members          — list all for current user
POST   /api/family-members          — create member { name, color }
PUT    /api/family-members/:id      — update member
DELETE /api/family-members/:id      — delete member (cascades junction rows)

POST   /api/events                  — body now accepts familyMemberIds?: string[]
PUT    /api/events/:id              — body now accepts familyMemberIds?: string[]
GET    /api/events                  — response now includes familyMembers: FamilyMember[]
```

All `/api/family-members` routes require `authenticateToken` middleware.

---

## Color Palette

Fixed set of 10 colors users can pick from (prevents clashes, keeps UI consistent):

```
#3B82F6  blue
#10B981  emerald
#F59E0B  amber
#EF4444  red
#8B5CF6  violet
#EC4899  pink
#14B8A6  teal
#F97316  orange
#6366F1  indigo
#84CC16  lime
```

---

## UI Sketches

### Family Member Filter (above calendar)

```
[ All ] [ 🔵 Maya ] [ 🟢 Dad ] [ 🟣 Mom ] [ + Add member ]
```

### Event card with member tags (DayView)

```
┌─────────────────────────────────────────┐
│  4:00  Soccer Practice                  │
│  PM    Lincoln Park Field    🔵 🟢      │
└─────────────────────────────────────────┘
```

### Member tagging in EventForm

```
Family members
[ 🔵 Maya ✓ ] [ 🟢 Dad ] [ 🟣 Mom ] [ + ]
```

---

## Acceptance Criteria (→ Puppeteer test cases)

1. **Create member** — go to Settings, add "Maya" with blue color → member appears in list
2. **Edit member** — rename "Maya" to "Maya K" → name updates everywhere
3. **Delete member** — delete a member → removed from list; events previously tagged to them show no tag for that member
4. **Tag event** — create event, tag Maya and Dad → event card shows blue + green dots in DayView
5. **Filter: single member** — click Maya pill → only Maya's events visible; untagged events hidden
6. **Filter: multiple members** — click Maya + Dad → union of both members' events shown
7. **Filter: All** — click All pill → all events visible again
8. **Persist across sessions** — family members survive page refresh (stored in DB, not local state)
9. **Empty state** — new user with no members sees "Add your first family member" prompt in filter area

---

## Security Considerations

- All `/api/family-members` routes must be behind `authenticateToken`
- `family_members.user_id` must be checked on every read/write — users must not be able to access or modify other users' family members
- `familyMemberIds` on event create/update must validate that each ID belongs to the authenticated user (prevents cross-user tagging)
- No new public routes

---

## Out of Scope / Follow-On

- NLP: "add Maya to soccer practice" → auto-tag member (natural follow-on once members exist)
- Family-wide weekly view (next Tier 1 item — depends on this)
- Per-member iCal feeds (Tier 2)
- Weekly briefing grouped by member (Tier 2)
