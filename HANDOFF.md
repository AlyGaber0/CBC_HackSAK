# Triaje — Handoff Context

## What This Project Is

**Triaje** is an async medical triage app for patients without a family doctor. Patients submit structured symptom reports; Claude + NIH APIs score complexity and generate or route a triage response. Built for a hackathon.

The Next.js app lives in `contextmd/`. All commands run from inside that directory.

---

## Current State (as of 2026-04-03)

### What's Done

**Phase 0 — Scaffold**
- Next.js 16 app in `contextmd/` with Supabase, Zustand, shadcn/ui, Jest, Anthropic SDK

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

**Provider UI (complete)**
- `app/(provider)/layout.tsx` — navy nav, "triaje" wordmark, sets localStorage role
- `app/(provider)/worklist/page.tsx` — dense table, left-accent urgency borders, tier badges, live indicator
- `app/(provider)/case/[id]/page.tsx` — two-column layout: AI brief + patient context left, 2×2 outcome selector + submit right

**Patient UI (complete as of this handoff)**
- `app/page.tsx` — redirects to `/emergency` ✓
- `app/(patient)/layout.tsx` — navy nav, sets `contextmd_patient_id` UUID in localStorage ✓
- `app/(patient)/emergency/page.tsx` — emergency gate: red flags list, "Yes → call 911" / "No → /intake" ✓
- `app/(patient)/intake/page.tsx` — 8-step intake form ✓ ← **built this session**
- `app/(patient)/status/[id]/page.tsx` — polling status + response card ✓ ← **built this session**

---

## What Was Built This Session (Person A — Karim)

### `app/(patient)/intake/page.tsx`
Full 8-step intake form using `useIntakeStore` from `lib/store.ts`.

Design choices implemented:
- **Progress bar** (Q1:B): `Step X of 8` left, current step name right, thin navy fill bar with CSS transition
- **Pain slider** (Q2:B): labeled tick marks — `0 None`, `5 Moderate`, `10 Worst` — displayed below the slider
- **Tier 4 gate** (Q3:C): fixed overlay modal with dimmed backdrop on the symptom step — shows "Call 911 Now →" (red button) and "Edit my description" (ghost button) when red-flag keywords are detected
- Submit calls `POST /api/cases` with camelCase fields (`patientId`, not `patient_id`), fire-and-forget `POST /api/triage`, then `router.push('/status/[id]')`
- Error handling surfaces the actual API error message from the response body

### `app/(patient)/status/[id]/page.tsx`
Polling status page using `use(params)` (required for Next.js 16 client components).

Design choices implemented:
- `processing` — centered spinner with "Analysing your symptoms" heading
- `awaiting_review` / `in_review` (Q4:B) — green pulse badge, descriptive copy, footer showing "Most responses arrive within a few hours · Updates automatically"
- `response_ready` (Q5:A) — single scrollable card: outcome badge → provider message → conditional detail pills (followup_days, watch_for, provider_type+timeframe, urgency_note) → collapsible NIH sources → always-visible disclaimer

### Bug fix: Provider worklist URL
`app/(provider)/worklist/page.tsx` had a pre-existing bug routing to `/provider/case/${id}` — a non-existent URL (route groups don't appear in URLs). Fixed both instances to `/case/${id}`.

---

## What Still Needs to Be Done

### 1. Run the database migration — REQUIRED BEFORE TESTING
The Supabase tables have **not been created yet** in the connected project. The app will return a `500 "Could not find the table 'public.cases'"` error until this is done.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → open the project
2. Click **SQL Editor** in the left sidebar
3. Copy the full contents of `supabase/migrations/001_initial.sql`
4. Paste into SQL Editor and click **Run**

This creates the `cases` and `responses` tables with RLS allow-all policies. It only needs to be run once.

### 2. Test the full end-to-end flow
Once the migration is run, test this sequence:
1. Visit `http://localhost:3000` → should redirect to `/emergency`
2. Pass emergency gate → complete 8-step intake form → submit
3. Check `/status/[id]` — should show processing spinner, then transition to awaiting state
4. Visit `/worklist` (provider view) — submitted case should appear
5. Claim the case → complete the response form → submit
6. Check the patient `/status/[id]` — should show the response card

### 3. Deploy to Vercel (when ready)
- Push the repo to GitHub
- Import into [vercel.com](https://vercel.com)
- Set the **Root Directory** to `contextmd`
- Add all env vars in Vercel Dashboard → Project → Settings → Environment Variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  ANTHROPIC_API_KEY
  ```

---

## Environment Setup

Each developer needs a `contextmd/.env.local` file (not committed to git). Structure:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

**Important:** The file must be inside `contextmd/`, not the repo root. Next.js only reads `.env.local` from its own directory.

---

## Design System

**Colors:**
- Navy: `#0f2744` — nav, primary buttons, headings
- Surface: `#f8fafc` — page background
- Card bg: `white`, border: `#e2e8f0`, shadow: `0 2px 8px rgba(15,39,68,0.06)`
- Urgency (ONLY saturated colors):
  - Tier 3 / urgent: `#ea580c` (red-orange)
  - Tier 2 / book_appointment: `#ca8a04` (amber)
  - Tier 1 / monitor: `#3b82f6` (blue)
  - Tier 0 / self_manageable: `#16a34a` (green)
- Text: `#1e293b` primary, `#475569` secondary, `#94a3b8` muted

**Typography:** Inter, all inline styles (no Tailwind classes)

**Component style:** Inline styles only (no className). Cards with border + box-shadow. Buttons: navy fill for primary, ghost/border for secondary.

---

## Architecture Notes

- `(patient)` route group = patient-facing URLs: `/emergency`, `/intake`, `/status/[id]`
- `(provider)` route group = provider URLs: `/worklist`, `/case/[id]`
- Route groups **do not appear in URLs** — the parens are layout grouping only
- `supabaseAdmin` (service role) ONLY in `app/api/` — never in client components
- `NEXT_PUBLIC_` prefix only on `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Patient ID: UUID in `localStorage('contextmd_patient_id')`, set by `(patient)/layout.tsx`
- Provider role: set by `(provider)/layout.tsx` via `localStorage('triaje_role', 'provider')`
- Next.js 16 async params: `await params` in server route handlers, `use(params)` in client components

## How to Run

```bash
cd contextmd
npm install        # first time only
npm run dev        # http://localhost:3000
npm run build      # verify types pass
npm test           # run all tests
```

---

## People

- **Person C (Samyar)** — built all backend: Supabase schema, API routes, Claude triage, NIH lib
- **Person B (Aly)** — built provider UI: worklist, case detail, response form
- **Person A (Karim)** — built patient UI: emergency gate, intake form, status page
