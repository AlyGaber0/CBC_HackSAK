# Triaje — UI/UX Design Spec
**Date:** 2026-04-03  
**Status:** Approved

---

## Design Philosophy

Triaje is used by anxious patients at any hour and busy providers under time pressure. The UI must feel trustworthy and calm — not playful, not a government form. Reference points: Carbon Health, One Medical, Linear.

**The one rule:** Urgency tier colors (green / yellow / orange / red) are the **only** saturated colors on screen. Everything else is navy, white, and muted gray.

---

## Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `navy` | `#0f2744` | Nav bar, CTA buttons, selected chip fill |
| `navy-accent` | `#3b82f6` | Brand mark dot in nav only |
| `white` | `#ffffff` | Card backgrounds, active rows |
| `surface` | `#f8fafc` | Page background, table background |
| `border` | `#e2e8f0` | Card borders, input borders |
| `text-primary` | `#0f172a` | Headings, row titles |
| `text-secondary` | `#64748b` | Labels, metadata, hints |
| `text-muted` | `#94a3b8` | Column headers, back buttons |

### Urgency Colors — Only Saturated Colors in the UI

| Tier | Dot | Label text | Background | Use case |
|---|---|---|---|---|
| Tier 1 — Monitor | `#16a34a` | `#15803d` | `#f0fdf4` | Low severity |
| Tier 2 — Appointment | `#ca8a04` | `#a16207` | `#fefce8` | Moderate |
| Tier 3 — Urgent | `#ea580c` | `#c2410c` | `#fff7ed` | High severity |

### Typography

- **Font:** Inter (system fallback: -apple-system, BlinkMacSystemFont)
- **Patient headings:** 26px, weight 800, letter-spacing -0.6px
- **Provider headings:** 16px, weight 700, letter-spacing -0.3px
- **Section labels:** 10.5px, weight 700, ALL CAPS, letter-spacing 1.2px, color `text-muted`
- **Body / chips:** 13–13.5px, weight 500–600
- **Table metadata:** 11–12px, color `text-secondary`

### Spacing & Shape

- **Border radius:** 6px on inputs/chips, 8–10px on page cards, 5px on buttons
- **Card shadow:** `0 4px 24px rgba(15,39,68,0.10), 0 1px 4px rgba(15,39,68,0.06)`
- **Row left accent bar:** 3px solid urgency color — the primary urgency signal on provider rows
- **No gradients anywhere** (except the brand mark dot in nav — static, not a CTA)
- **No emoji, no illustrations**

---

## Patient Intake Flow

### Interaction Model: Select + Describe

Each of the 8 intake steps uses the same shell:

1. **Nav bar** — navy, "triaje" wordmark + brand dot, step count right-aligned in `#7dd3fc`
2. **Segmented progress** — 8 equal-width segments, 2px tall, navy filled / `rgba(255,255,255,0.12)` unfilled, flush under nav
3. **Section label** — ALL CAPS muted label naming the step
4. **Question heading** — 26px/800 weight, dark, 2-line max
5. **Hint text** — 13.5px muted, one sentence
6. **Chip selectors** — multi-select, 9px×15px padding, 6px radius, navy fill when selected (white text), `f8fafc` + `e2e8f0` border when unselected
7. **Free-text area** — `f8fafc` background, `e2e8f0` border, 7px radius, 13.5px Inter, 3 rows
8. **Footer** — "← Back" in muted left, "Continue →" navy button right

Steps that don't need a text area (e.g. binary yes/no, date picker, slider) omit the textarea and expand the chip area or use a dedicated input component.

### Emergency Gate (`/emergency`)

Same shell, no progress bar. Full-screen centered layout. Red alert icon (Lucide `AlertTriangle`). Symptom checklist. If any checked: show "Call 911 immediately" in red. If none: navy "Continue to intake" button.

---

## Provider Flow

### Worklist (`/provider/worklist`)

- **Nav:** Same navy bar, wordmark, "| Provider View", "Demo Mode" muted right
- **Page header:** "Open Cases" 16px/700 + live pulse dot + case count
- **Table:** White card with `box-shadow`. Column headers 10px/700 ALL CAPS muted.
- **Row anatomy:**
  - 3px left border in urgency color
  - Tier indicator: colored dot + "T1/T2/T3" label
  - Case title + sub-location in muted
  - Time since submission
  - Status badge (Awaiting / In Review / Response Ready)
  - Claim / Open button
- **Row sort:** Tier 3 first, then Tier 2, then Tier 1. Within tier: oldest first.
- **Polling:** Refreshes every 5 seconds silently.

### Case Detail (`/provider/case/[id]`)

Two-column layout (approx 55% / 45%):

**Left column — read-only brief:**
- AI Clinical Brief card: chief complaint, timeline, severity, red flags (if any, shown in `orange-700`), medication flags, history, NIH context
- Patient's Questions card — amber tint (`amber-50` bg, `amber-200` border)
- Patient's own description card
- Medical history card
- Photos card (simulated — shows filenames, no real preview)

**Right column — response form:**
- Outcome selector: 4 cards in 2×2 grid (Self-manageable / Monitor / Book Appointment / Urgent) — card border highlights in urgency color on select, icon from Lucide
- Conditional fields based on outcome:
  - Monitor → "Follow-up in (days)" input + "Watch for" textarea
  - Book Appointment → Specialist type select + Timeframe select
  - Urgent → "Urgency note" textarea with red border
- Patient response textarea — 8 rows, full width
- "Send Response to Patient" — full-width navy button, disabled until outcome + message filled
- Disclaimer in muted text below button

---

## Brand Mark

Small blue square (`#3b82f6`, 20×20px, 4px radius) with a white dot centered inside. Appears left of the "triaje" wordmark in the nav bar on both patient and provider sides.

---

## What This Spec Does Not Cover

- Patient dashboard (`/dashboard`) and response card (`/case/[id]`) — Person A's screens, should follow the same design system tokens
- Mobile breakpoints — responsive layout is a post-hackathon concern; target desktop/tablet first
- Dark mode — out of scope
