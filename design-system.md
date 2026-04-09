# kinroo.ai Design System

A living reference for the visual language, component patterns, and interaction design of kinroo.ai — a warm, AI-native family calendar.

---

## 1. Design Philosophy

**Warm, not clinical.** The dominant metaphor is a paper planner on a warm wooden desk — earthy tones, soft textures, familiar structures.

**Time is sacred.** Monospace fonts for all times and dates. Tabular numerals keep columns aligned. Red dot marks today.

**AI-first, friction-minimal.** Natural language is the primary input. Confirmations are required before any AI action mutates data. Status is always visible.

**Mobile-first.** The app runs inside a Capacitor wrapper. Bottom sheets, large tap targets, and thumb-zone layout guide every decision.

---

## 2. Color Palette

### CSS Custom Properties (Semantic Tokens)

```css
--bg-app:      #f2ece0   /* warm beige — app-level background */
--bg-surface:  #fefcf8   /* warm cream — cards, sheets, panels */
--border:      #e2d9c8   /* light warm border */
--border-mid:  #cec3ae   /* medium warm border — hover state */
--text-base:   #1e1a14   /* dark warm — primary text */
--text-muted:  #7a6f65   /* warm gray — secondary text, metadata */
--accent:      #b35110   /* burnt amber — primary action color */
--accent-mid:  #d4650f   /* brighter amber — hover, links */
--accent-bg:   #fef3e6   /* tinted amber — selected, highlighted bg */
--accent-border: #f0c090 /* light amber border — focus rings */
--today:       #dc2626   /* red — today marker (classical planner red) */
```

### Custom Warm Scale (Tailwind)

| Token | Value | Use |
|---|---|---|
| `warm-50` | `#fefcf8` | Surface backgrounds |
| `warm-100` | `#f7f3ec` | Subtle section dividers |
| `warm-200` | `#ede5d8` | Borders, calendar grid lines |
| `warm-300` | `#ddd0bc` | Input borders, subtle separators |
| `warm-400` | `#c4ad92` | Muted interactive border |
| `warm-500` | `#a08868` | Secondary icons, decorative |
| `warm-600` | `#7d6650` | Secondary text |
| `warm-700` | `#5c4c3c` | Stronger body text |
| `warm-800` | `#3a3028` | High-contrast label text |
| `warm-900` | `#211d18` | Darkest warm tone |

### Semantic / Event-Category Colors

| Category | Dot Color | Card Background |
|---|---|---|
| Sports | `bg-amber-400` | `bg-amber-50` |
| Medical | `bg-teal-400` | `bg-teal-50` |
| Work | `bg-blue-400` | `bg-blue-50` |
| Social/Celebration | `bg-pink-400` | `bg-pink-50` |
| Food | `bg-orange-400` | `bg-orange-50` |
| Travel | `bg-teal-400` | `bg-teal-50` |
| School | `bg-green-400` | `bg-green-50` |

### Color Hierarchy

```
Level 1: Accent (burnt amber)     — primary actions, today dot, active states
Level 2: Today red                — current-day marker only
Level 3: Warm palette             — backgrounds and structural surfaces
Level 4: Family / category colors — per-member identity, event tags
```

---

## 3. Typography

### Font Families

```js
display: ['Fraunces', 'Georgia', 'serif']          // brand headings, logo
sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif']  // all body text
mono:    ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace']  // times, data
```

### Type Scale

| Role | Classes | Size | Weight |
|---|---|---|---|
| Logo / Brand | `font-display text-2xl font-bold` | 1.5rem | 700 |
| Page Title | `text-lg font-semibold` | 1.125rem | 600 |
| Card Title | `text-sm font-semibold` | 0.875rem | 600 |
| Body | `text-sm` | 0.875rem | 400 |
| Secondary / Meta | `text-xs text-muted` | 0.75rem | 400 |
| Time (mono) | `font-mono text-sm font-medium` | 0.875rem | 500 |
| AM/PM indicator | `font-mono text-[10px]` | 10px | 400 |
| Day number | `font-mono text-sm font-bold` | 0.875rem | 700 |
| Day initial | `text-[10px] font-medium` | 10px | 500 |
| Form label | `text-sm font-medium` | 0.875rem | 500 |
| Badge | `text-xs font-medium` | 0.75rem | 500 |

### Typography Rules

- All text uses `antialiased` rendering and `-0.01em` letter-spacing
- Times always use `tabular-nums` via `fontVariantNumeric` (no shifting on AM/PM toggle)
- Display font (".ai" suffix in logo) uses `accent-mid` color to split brand name visually

---

## 4. Spacing

### Padding Reference

| Class | Value | Use |
|---|---|---|
| `p-1` | 0.25rem | Minimal icon padding |
| `p-1.5` | 0.375rem | Navigation buttons |
| `p-2` | 0.5rem | Compact card content |
| `p-3` | 0.75rem | Form fields, event cards |
| `p-4` | 1rem | Sheet headers, form sections |
| `px-2 py-1` | 0.5rem / 0.25rem | Inline form fields |
| `px-3 py-1.5` | 0.75rem / 0.375rem | Buttons, chip states |
| `px-3.5 py-2.5` | 0.875rem / 0.625rem | Chat messages |

### Gap Reference

| Class | Value | Use |
|---|---|---|
| `gap-0.5` | 0.125rem | Week strip dots |
| `gap-1.5` | 0.375rem | Icon + text pairs |
| `gap-2` | 0.5rem | Compact mobile cards |
| `gap-3` | 0.75rem | Standard event cards |
| `gap-4` | 1rem | Section spacing |

### Border Radius

| Class | Value | Use |
|---|---|---|
| `rounded-md` | 0.375rem | Inputs, small buttons |
| `rounded-lg` | 0.5rem | Cards, standard buttons |
| `rounded-xl` | 0.75rem | Input bar, event cards |
| `rounded-2xl` | 1rem | Bottom sheets, modals |
| `rounded-full` | 9999px | Pills, avatars, dots |

---

## 5. Elevation & Shadow

```css
/* Subtle surface separation */
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)

/* Card hover elevation */
0 2px 8px rgba(30,26,20,0.08)

/* Sheet / modal */
shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1)

/* Sticky header tray lift */
0 -4px 16px rgba(30,26,20,0.12)

/* Input field inset (active) */
inset 0 1px 3px rgba(30,26,20,0.05)

/* Input focus ring */
0 0 0 2px var(--accent-border)
```

### Z-Index Stack

| Layer | Z-index | Element |
|---|---|---|
| Base | 0 | Content, cards |
| Sticky | 10 | Week strip header |
| Overlay | 50 | Bottom sheets, modals, dropdowns |

---

## 6. Components

### Bottom Sheet

Slides up from bottom on mobile; centered dialog on desktop.

```
Mobile:                     Desktop:
┌─────────────────────┐    ┌──────────────────────────┐
│                     │    │                          │
│ ╭─────────────────╮ │    │  ╭────────────────────╮  │
│ │ Title      [×]  │ │    │  │ Title         [×]  │  │
│ ├─────────────────┤ │    │  ├────────────────────┤  │
│ │   Content       │ │    │  │   Content          │  │
│ │                 │ │    │  │                    │  │
│ ╰─────────────────╯ │    │  ╰────────────────────╯  │
└─────────────────────┘    └──────────────────────────┘
rounded-t-2xl (mobile)     rounded-2xl (desktop)
```

**Animation:** `slideUp` — `translateY(100%) → translateY(0)`, `opacity: 0 → 1`, 300ms ease-out  
**Backdrop:** `bg-black/50`, click-outside dismisses

---

### NLP Input Bar

```
┌──────────────────────────────────────────────────────┐
│ [placeholder text rotating...]           📎  🎤  ↑  │
│ inset shadow, border on focus/listening              │
└──────────────────────────────────────────────────────┘
            ▲ status message or error dot
```

- Container: `rounded-xl`, inset shadow, accent border on active
- Placeholder rotates through contextual hints
- Status row: animated pulse dot + message text

---

### Event Card (AgendaEventCard)

```
┌──────────────────────────────────────────────┐
│ 9:30  │ 🏃 Practice              [✏] [● ●] │
│ AM    │   Riverside Park                    │
└──────────────────────────────────────────────┘
```

- Time: `font-mono`, two-part (h:mm + AM/PM), `tabular-nums`
- Left border: `border-l-2 border-[--accent]`
- Family dots: up to 3, color-coded per member
- Edit icon: fades in on group hover

---

### Week Strip

```
  ←   Mo  Tu  We [Th] Fr  Sa  Su   →
         •        ●●       •
```

- 7 columns: `grid-cols-7`
- Selected day: `bg-[--accent] text-white rounded-full`
- Today (unselected): `bg-[--accent-bg] text-[--today] rounded-full`
- Event dots: Up to 3 per day, `w-1 h-1 rounded-full`

---

### View Switcher

```
[ Week | Month | Year ]
```

Segmented control. Active: `bg-white text-[--accent] shadow border`. Inactive: `text-[--text-muted]`.

---

### Header

```
kinroo.ai                    [Import] [⚙] [avatar]
```

- Logo: `font-display font-bold` — "kinroo" in `text-base`, ".ai" in `text-[--accent-mid]`
- Avatar: initials in `bg-[--accent-bg]` circle, or Google photo with border
- Profile dropdown: `rounded-xl shadow-xl`, Settings + Sign out

---

### Button Variants

| Variant | Classes | Use |
|---|---|---|
| Primary | `bg-[--accent] text-white rounded-lg px-4 py-2` | Save, Confirm |
| Ghost | `text-[--text-muted] hover:text-[--text-base]` | Cancel |
| Danger | `bg-red-500 text-white rounded-lg px-4 py-2` | Delete |
| Icon | `p-1.5 rounded-md text-muted hover:bg-warm-100` | Toolbar icons |
| Pill | `px-2.5 py-0.5 rounded-full text-xs font-medium` | Tags, chips |

---

### Chat Bubbles

```
User:                                    Assistant:
╭──────────────────────────╮    ╭────────────────────────────────╮
│ "Add soccer Saturday 3pm"│    │ Got it! Here's what I found:   │
╰──────────────────────────╯    │ [Event Card]                   │
bg-[--accent] text-[--accent-bg] ╰────────────────────────────────╯
rounded-2xl, top-right squared   bg-warm-50, rounded-2xl, top-left squared
```

---

## 7. Motion & Animation

### Keyframes

```css
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

### Timing Reference

| Duration | Easing | Use |
|---|---|---|
| 150ms | ease | Instant feedback (button press) |
| 200ms | ease-in-out | Field activation, icon fade |
| 300ms | ease-out | Bottom sheet entry, overlay fade |

### Animated States

| Element | Animation |
|---|---|
| Bottom sheet entry | `slideUp` 300ms ease-out |
| Spinner | `animate-spin` — `border-2 border-t-transparent rounded-full` |
| Listening pulse | `animate-pulse` on status dot |
| Button press | `active:scale-[0.99]` |
| Disabled state | `opacity-30` or `opacity-40` |
| Edit icon hover | `opacity-0 group-hover:opacity-100 transition-opacity 200ms` |
| Card hover | Border darkens, `0 2px 8px shadow` appears |

### Interaction States Summary

```
Default  → Hover    : border darkens, shadow lifts
Hover    → Active   : scale(0.99), background fills
Default  → Focus    : 2px accent-border ring
Active   → Selected : accent background, white text
Any      → Disabled : opacity 30-40%, cursor-not-allowed
```

---

## 8. Background Texture

The app background uses a subtle SVG noise overlay at 40% opacity (fixed position, pointer-events: none). This gives the "paper planner" quality to the warm beige base.

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* grain texture */
  opacity: 0.4;
  pointer-events: none;
  z-index: 9999;
}
```

---

## 9. Layout Patterns

### Max-Width Constraint
Content columns: `max-w-3xl mx-auto` — keeps reading line comfortable on large screens.

### Responsive Breakpoints
- Mobile: `< 768px` — single column, bottom sheets fill screen, compact cards
- Tablet: `768px` — NLP input at tablet width tested
- Desktop: `> 900px` — centered sheets, full week view, expanded cards

### Common Structural Pattern
```
┌─────────────────────────────────┐
│ Header (sticky)                 │
├─────────────────────────────────┤
│ Week Strip (sticky, z-10)       │
├─────────────────────────────────┤
│ View (scroll area)              │
│   AgendaEventCard               │
│   AgendaEventCard               │
│   ...                           │
├─────────────────────────────────┤
│ NLP Input Bar (sticky bottom)   │
└─────────────────────────────────┘
```

---

## 10. Design Tokens Quick Reference

```css
/* Copy-paste tokens for new components */

/* Backgrounds */
bg-[--bg-app]          /* page background */
bg-[--bg-surface]      /* card / panel */
bg-[--accent-bg]       /* selected / highlighted */

/* Text */
text-[--text-base]     /* primary */
text-[--text-muted]    /* secondary */
text-[--accent]        /* link / action */
text-[--today]         /* today marker */

/* Borders */
border-[--border]      /* default */
border-[--border-mid]  /* hover */
border-[--accent-border] /* focus */

/* Actions */
bg-[--accent] text-white              /* primary button */
bg-[--accent-bg] text-[--accent]     /* secondary / outline */
```
