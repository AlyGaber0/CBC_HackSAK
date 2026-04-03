# Triaje — Handoff Context

## What This Project Is

**Triaje** is an async medical triage app for patients without a family doctor. Patients submit structured symptom reports; Claude + NIH APIs score complexity and generate or route a triage response. Built for a hackathon.

The Next.js app lives at `/Users/aly/CBC_HackSAK/contextmd/`. All commands run from inside that directory.

## Current State (as of 2026-04-03)

### What's Done

**Phase 0 — Scaffold**
- Next.js 16 app in `contextmd/` with Supabase, Zustand, shadcn/ui, Jest, Anthropic SDK
- `.env.local` at `/Users/aly/CBC_HackSAK/.env.local` with Supabase + Anthropic keys

**Phase 1 — Backend (all complete)**
- `lib/types.ts` — all shared types (Case, Response, ClinicalBrief, TriageAIResult, IntakeFormState)
- `lib/supabase.ts` — anon client + admin client (service role, API routes only)
- `lib/nih.ts` — 4 NIH APIs (MedlinePlus, PubMed, RxNorm, OpenFDA) via `gatherNihContext()`
- `lib/triage.ts` — `checkTier4()` / `checkAnyTier4()` client-side red flag detection
- `lib/store.ts` — Zustand IntakeStore with `persist` middleware, key `triaje-intake`
- `lib/claude.ts` — `runTriageAI()` using `claude-sonnet-4-6`, returns `TriageAIResult`
- `supabase/migrations/001_initial.sql` — `cases` + `responses` tables, RLS allow-all policies

**API Routes (all complete)**
- `POST /api/cases` — create case, `GET /api/cases` — list by patient_id or provider
- `GET /api/cases/[id]`, `PATCH /api/cases/[id]`
- `POST /api/cases/[id]/claim` — atomic claim with 409 on conflict
- `POST /api/triage` — gatherNihContext → runTriageAI → update case; auto-response for tier 0
- `POST /api/respond/[id]` — provider submits response, case → `response_ready`

**Provider UI (Person B — complete)**
- `app/(provider)/layout.tsx` — navy nav, "triaje" wordmark, sets localStorage role
- `app/(provider)/worklist/page.tsx` — dense table, left-accent urgency borders, tier badges, live indicator
- `app/(provider)/case/[id]/page.tsx` — two-column layout: AI brief + patient context left, 2×2 outcome selector + submit right

**Patient UI (Person A — IN PROGRESS)**
- `app/page.tsx` — redirects to `/emergency` ✓
- `app/(patient)/layout.tsx` — navy nav, sets `contextmd_patient_id` UUID in localStorage ✓
- `app/(patient)/emergency/page.tsx` — emergency gate: red flags list, "Yes → call 911" / "No → /intake" ✓
- `app/(patient)/intake/page.tsx` — **NOT YET CREATED** ← this is where we stopped
- `app/(patient)/status/[id]/page.tsx` — **NOT YET CREATED**

### What Needs to Be Built Next

#### 1. `app/(patient)/intake/page.tsx` — 8-step intake form

This is the main thing left. Uses the Zustand `useIntakeStore` from `lib/store.ts`.

**8 steps (in order):**
1. **Body location** — `bodyLocation` (select: Head/Neck, Chest, Abdomen, Back, Arms/Hands, Legs/Feet, Skin/General) + `bodySubLocation` (text input, optional)
2. **Symptom type + description** — `symptomType` (select: Pain, Swelling, Rash, Discharge, Fatigue, Other) + `symptomDescription` (textarea). Run `checkAnyTier4([symptomDescription])` here — if true, block and show "Call 911" message.
3. **Timeline** — `timelineStart` (date input) + `timelineChanged` (select: better/worse/same)
4. **Severity** — `painSeverity` (slider 0–10) + `associatedSymptoms` (checkboxes: Fever, Nausea, Fatigue, Headache, Shortness of breath, Dizziness, Vomiting, Loss of appetite)
5. **Photos** — simulated upload. Show file input, store `photoCount` and `photoNames` (no actual file upload)
6. **Free text** — `freeText` textarea, "describe in your own words"
7. **Patient questions** — 3 labelled text inputs (`patientQuestions[0..2]`)
8. **Medical history** — `medicalConditions`, `medications`, `allergies` (3 textareas)

**On final submit (step 8):**
```typescript
// 1. Get patient_id from localStorage
const patientId = localStorage.getItem('contextmd_patient_id')!;

// 2. POST /api/cases with all form data
const res = await fetch('/api/cases', { method: 'POST', body: JSON.stringify({ patient_id: patientId, ...formData }) });
const { data } = await res.json();

// 3. Fire-and-forget triage (don't await)
fetch('/api/triage', { method: 'POST', body: JSON.stringify({ case_id: data.id }) });

// 4. Navigate to status page
router.push(`/status/${data.id}`);
```

**Design notes:**
- Progress bar at top (step X of 8)
- Card-based, centered, max-width 560px
- Navy "Continue →" / "Back" buttons
- Spacious, guided feel — one concept per screen

#### 2. `app/(patient)/status/[id]/page.tsx` — case status + response view

Polls `GET /api/cases/[id]` every 5 seconds. Shows different UI based on `case.status`:

- `processing` — "We're reviewing your symptoms..." spinner
- `awaiting_review` / `in_review` — "Your case is with a provider" waiting state
- `response_ready` — render the full response card (from `case.responses[0]`)

**Response card content (when `response_ready`):**
- Outcome badge (color-coded: green=self_manageable, blue=monitor, amber=book_appointment, red=urgent)
- Provider message
- Conditional fields: followup_days, watch_for, provider_type + timeframe (for book_appointment), urgency_note (for urgent)
- NIH sources as collapsible citations
- **Always show disclaimer:** "This response is for informational purposes only and does not replace professional medical advice."

## Design System

**Colors:**
- Navy: `#0f2744` — nav, primary buttons, headings
- Surface: `#f8fafc` — page background
- Card bg: `white`, border: `#e2e8f0`, shadow: `0 2px 8px rgba(15,39,68,0.06)`
- Urgency (ONLY saturated colors):
  - Tier 3 / urgent: `#ef4444` (red)
  - Tier 2 / book_appointment: `#f59e0b` (amber)
  - Tier 1 / monitor: `#3b82f6` (blue)
  - Tier 0 / self_manageable: `#22c55e` (green)
- Text: `#1e293b` primary, `#475569` secondary, `#94a3b8` muted

**Typography:** Inter, all inline styles (no Tailwind)

**Component style:** Inline styles only (no className). Cards with border + box-shadow. Buttons: navy fill for primary, ghost/border for secondary.

## Architecture Notes

- `(patient)` route group = patient-facing URLs: `/emergency`, `/intake`, `/status/[id]`
- `(provider)` route group = provider URLs: `/worklist`, `/case/[id]`
- Route groups don't appear in URLs — the parens are just for layout grouping
- `supabaseAdmin` (service role) ONLY in `app/api/` — never in client components
- `NEXT_PUBLIC_` prefix only on `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Patient ID: UUID in `localStorage('contextmd_patient_id')`, set by `(patient)/layout.tsx`
- Provider role: set by `(provider)/layout.tsx` via `localStorage('triaje_role', 'provider')`
- Next.js 16 async params: `await params` in server route handlers, `use(params)` in client components

## How to Run

```bash
cd /Users/aly/CBC_HackSAK/contextmd
npm run dev        # http://localhost:3000
npm run build      # verify types pass
npm test           # 52 tests, all passing
```

## What You Should Do Next

**Continue building the patient UI.** Pick up exactly where we left off:

1. Create `app/(patient)/intake/page.tsx` — the 8-step intake form (spec above)
2. Create `app/(patient)/status/[id]/page.tsx` — polling status + response card
3. Run `npm run build` to verify no type errors
4. Commit: `git commit -m "feat: patient UX — emergency gate, intake form, status + response view"`

The person giving you this file is Aly. They are the lead developer on this project and have been hands-on throughout. They want clean, professional, production-quality UI — not a generic demo. Follow the design system strictly (inline styles, navy + white + urgency-only color). Do not add features beyond what's listed. Just build the two remaining pages cleanly.
