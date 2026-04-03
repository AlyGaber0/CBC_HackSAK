# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ContextMD — async medical triage navigation for patients without a family doctor. Patients submit structured symptom reports; Claude + NIH APIs score complexity and generate or route a triage response. See `PRD.md` for full requirements and `PLAN.md` for the step-by-step implementation plan with test code.

The Next.js app lives in `contextmd/` (created during Phase 0 of PLAN.md). All commands below run from inside that directory.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests once (no watch)
npm run test:coverage  # Run with coverage — must stay ≥70% on lib/ and app/api/

# Run a single test file
npm test -- __tests__/lib/triage.test.ts

# Run tests matching a name pattern
npm test -- --testNamePattern="checkTier4"
```

## Architecture

### Route Groups

Two Next.js App Router route groups share the same deployment:

- `app/(patient)/` — public-facing: emergency gate → intake form → case status → response card
- `app/(provider)/` — internal demo: worklist → case detail + AI brief → response submission

No real auth exists. Patient identity is a UUID stored in `localStorage` (`contextmd_patient_id`). Provider role is set by visiting any `/provider/*` route, which writes a role flag to `localStorage`.

### Data Flow for a Case

```
Patient submits intake
  → POST /api/cases          (creates row, status = 'processing')
  → POST /api/triage         (fired immediately, no await in client)
       ├─ gatherNihContext()  (4 NIH APIs in parallel via Promise.allSettled)
       ├─ runTriageAI()       (Claude receives intake + NIH context, returns JSON)
       ├─ Tier 0 → auto-creates response row, status = 'response_ready'
       └─ Tier 1–3 → status = 'awaiting_review', goes to provider worklist
  → Provider claims case      → POST /api/cases/[id]/claim (atomic, 409 if already claimed)
  → Provider submits response → POST /api/respond/[id]     (status → 'response_ready')
  → Patient polls /api/cases/[id] every 5s, updates UI on status change
```

### `lib/` — the core logic layer

| File | Responsibility |
|---|---|
| `types.ts` | All shared TypeScript types. Source of truth for `Case`, `Response`, `ClinicalBrief`, `TriageAIResult`, `IntakeFormState`. |
| `triage.ts` | `checkTier4(text)` / `checkAnyTier4(fields[])` — client-side red flag keyword detection. Runs before any API call. Safety-critical: 100% branch coverage required. |
| `nih.ts` | Four NIH API functions: `fetchMedlinePlus`, `fetchPubMed`, `lookupRxNorm`, `fetchOpenFDA`. All wrapped in `try/catch` with `AbortSignal.timeout(5000)`. `gatherNihContext()` calls all four in parallel. |
| `claude.ts` | `runTriageAI()` — sends structured intake + NIH context to `claude-sonnet-4-6`. Returns `TriageAIResult` (JSON-parsed). Throws on invalid JSON. |
| `store.ts` | Zustand store with `persist` middleware for the 8-step intake form. `update()` merges partial state. `reset()` clears everything and returns to step 0. |
| `supabase.ts` | Two clients: `supabase` (anon key, browser) and `supabaseAdmin` (service role key, API routes only). |

### Triage Tier System

Tier is assigned by Claude using explicit criteria in the system prompt in `lib/claude.ts` — not a black box:

- **Tier 4**: red flag keywords — blocked at intake client-side, never reaches Claude
- **Tier 3**: pain ≥8/10, rapidly worsening, systemic symptoms
- **Tier 2**: changing/concerning features, moderate severity, >1 week
- **Tier 1**: stable, low-severity, single symptom
- **Tier 0**: clearly benign, NIH-documented self-care — Claude auto-generates patient response

### AI Output Contract

Claude must return valid JSON matching `TriageAIResult` (defined in `lib/types.ts`). The system prompt in `lib/claude.ts` is the authoritative definition of this contract. If Claude returns non-JSON, `runTriageAI()` throws and the triage route catches it, falling the case back to `awaiting_review`.

### NIH API Behaviour

All four NIH APIs are free and require no authentication. They are called at triage time, results are passed to Claude in the user message, and stored in `responses.nih_sources`. If an NIH call fails or times out, it returns `null` and is excluded from context — triage still proceeds.

## Git Workflow

Conventional commits: `feat|fix|test|chore: description`. Push after every task. Never force-push `main`.

## Key Constraints

- `supabaseAdmin` (service role key) must only be used in `app/api/` route handlers — never imported into client components.
- `NEXT_PUBLIC_` env vars are exposed to the browser — only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` should carry that prefix.
- Photo upload is **simulated** for the hackathon — `photoCount` and `photoNames` are stored in the DB, but no actual file is persisted.
- The emergency gate (`/emergency`) must always be the entry point. `/` redirects there. No intake step is reachable without passing through it.
- Every patient-facing response must display the triage disclaimer. It is not optional copy.
