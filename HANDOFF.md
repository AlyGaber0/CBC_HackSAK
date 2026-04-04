# triaje — Project Handoff

Async medical triage navigation for patients without a family doctor.
Built for CBC HackSAK 2026.

---

## What the product does

Patients submit a structured symptom report through a guided chatbot. Claude (Anthropic) + four NIH APIs analyze the case and score its clinical complexity. The result is either an instant self-care plan (simple cases) or a case card routed to a licensed provider who reviews and writes a structured SBAR response. The patient's status page updates in real time.

No family doctor required on the patient side. Providers work entirely from a browser — no installation, no EMR login.

---

## User flows

### Patient

1. **Emergency gate** (`/emergency`) — symptom red-flag check. Tier 4 keywords block progression and direct to 911.
2. **Intake chatbot** (`/chat`) — 10-step guided conversation collects body location, symptom type, timeline, severity (0–10 slider), associated symptoms, photos (simulated), free text, up to 3 questions, and medical history.
3. **Triage** — on submit, NIH APIs (MedlinePlus, PubMed, RxNorm, OpenFDA) run in parallel. Claude receives the full intake + NIH context and returns a clinical brief, tier (0–3), navigation action, and medication flags.
   - Tier 0: Claude writes a self-care response immediately, no provider needed.
   - Tier 1–3: case goes to the provider worklist.
4. **Status page** (`/status/[id]`) — polls every 5 s. Shows processing → awaiting review → provider response with full SBAR, outcome card, pharmacy steps (if applicable), and follow-up details.

### Provider

1. **Worklist** (`/worklist`) — live-updating table of pending cases sorted by tier then age. Left border = tier severity color, age dot = wait time since submission (green < 6 h → red > 24 h).
2. **Case detail** (`/case/[id]`) — full AI clinical brief, medication flags, NIH context, patient questions, patient description, medical history, photos list. Provider selects an outcome, fills SBAR fields, optionally fills conditional panels (monitor / appointment / urgent / pharmacy), and optionally asks a follow-up question to the patient.
3. **Submit** — response saved, patient status page updates instantly.

---

## Tech stack

| Layer         | Technology                                                     |
| ------------- | -------------------------------------------------------------- |
| Framework     | Next.js 16 App Router (Turbopack)                              |
| Language      | TypeScript 5                                                   |
| Database      | Supabase (PostgreSQL + JSONB)                                  |
| AI            | Claude Sonnet 4.6 (triage), Claude Haiku 4.5 (translation)     |
| Clinical APIs | NIH MedlinePlus, PubMed, RxNorm, OpenFDA                       |
| Styling       | Inline styles + Radix UI primitives + Tailwind utility classes |
| State         | Zustand (intake form), React useState (everything else)        |
| Email         | Resend (case confirmation + response notification)             |
| Validation    | Zod v4                                                         |
| i18n          | Custom context + localStorage (no external library)            |

---

## Architecture

```
app/
├── (patient)/          Patient-facing route group
│   ├── emergency/      Red-flag gate — entry point for all patients
│   ├── chat/           10-step intake chatbot
│   ├── intake/         Alternative form-based intake
│   └── status/[id]/    Real-time case status + response card
│
├── (provider)/         Provider-facing route group
│   ├── worklist/       Live case queue
│   └── case/[id]/      Case detail + SBAR response form
│
└── api/
    ├── cases/          GET (list) · POST (create) · DELETE (dev wipe)
    ├── cases/[id]/     GET (fetch single)
    ├── cases/[id]/claim/  POST (atomic claim with 409 on double-claim)
    ├── respond/[id]/   POST (save provider SBAR response)
    ├── triage/         POST (Claude + NIH pipeline, fires background FR translation)
    └── translate/      POST (on-demand French translation for older cases)

lib/
├── claude.ts           runTriageAI() — structured JSON contract with Claude Sonnet
├── nih.ts              gatherNihContext() — 4 NIH APIs in parallel, 5 s timeout each
├── triage.ts           checkTier4() — client-side red-flag keyword detection
├── translateBrief.ts   translateBriefToFrench() — Haiku translation, stores in ai_brief.fr
├── supabase.ts         anon client (browser) + admin client (API routes only)
├── types.ts            All shared TypeScript types
├── rateLimit.ts        In-memory rate limiter (per-IP, per-endpoint)
├── auth.ts             requireProviderAuth() — x-provider-token header check
├── providerFetch.ts    Client-side fetch wrapper that injects auth header
├── validation.ts       Zod schemas for all API routes
└── i18n/
    ├── translations.ts Full EN/FR translation object (patient + provider)
    ├── LanguageContext.tsx  React context with localStorage persistence
    ├── useT.ts         useT() hook — returns current language's translations
    └── translateCaseOption()  Maps DB-stored option values across languages

components/
├── ErrorBoundary.tsx   React class error boundary wrapping both layouts
├── LanguageToggle.tsx  EN/FR toggle button
├── WorklistDevBar.tsx  Demo controls bar (provider)
└── DemoPanel.tsx       Demo controls panel (patient)

proxy.ts                Next.js 16 proxy (replaces middleware.ts) — CORS headers
db/indexes.sql          SQL to run in Supabase: 6 indexes on cases + responses tables
```

---

## Triage tier system

| Tier | Meaning                                  | Outcome                                       |
| ---- | ---------------------------------------- | --------------------------------------------- |
| 4    | Red flags (chest pain, stroke, etc.)     | Blocked client-side, redirect to 911          |
| 3    | High severity / rapidly worsening        | Provider queue — urgent response              |
| 2    | Moderate / changing features             | Provider queue — appointment/walk-in response |
| 1    | Stable, low severity                     | Provider queue — monitor response             |
| 0    | Clearly benign, NIH-documented self-care | Auto-resolved, no provider needed             |

---

## Security & robustness

| Feature                 | Implementation                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Input validation**    | Zod schemas on every API route — UUID checks, max lengths, enum enforcement             |
| **Auth**                | Provider-only routes check `x-provider-token` header against `PROVIDER_SECRET` env var  |
| **CORS**                | `proxy.ts` rejects cross-origin requests not matching `ALLOWED_ORIGIN` env var          |
| **Rate limiting**       | In-memory per-IP limits: 5 req/min (triage), 10 (create/respond), 20 (claim/translate)  |
| **Error boundaries**    | React `ErrorBoundary` wraps both patient and provider layouts                           |
| **Sanitized errors**    | API routes return generic messages, never raw DB errors                                 |
| **Admin key isolation** | `supabaseAdmin` (service role) only imported in `app/api/` — never in client components |

---

## Bilingual support (EN / FR)

- Patients and providers each have an independent language toggle stored in `localStorage`.
- All UI strings (labels, placeholders, options, buttons) switch instantly.
- Patient-submitted `body_location` and `symptom_type` are always stored as English values using `optionValues` — so a French patient's case shows correctly in the doctor's chosen language.
- At triage time, Claude Haiku translates the full AI clinical brief into French in the background (fire-and-forget) and stores it in `ai_brief.fr`. Providers in French mode read the pre-stored translation instantly — zero wait.
- Older cases fall back to an on-demand translation call.

---

## Environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Resend (email notifications — optional)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Security
PROVIDER_SECRET=your-provider-secret
NEXT_PUBLIC_PROVIDER_SECRET=your-provider-secret   # same value, exposed to client
ALLOWED_ORIGIN=https://your-app.vercel.app          # leave blank in dev (allows all)
```

---

## Database setup

Run `db/indexes.sql` in the Supabase SQL editor after deploying:

```sql
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_patient_id ON cases (patient_id);
CREATE INDEX IF NOT EXISTS idx_cases_tier ON cases (tier);
CREATE INDEX IF NOT EXISTS idx_cases_submitted_at ON cases (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status_submitted ON cases (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_case_id ON responses (case_id);
```

---

## Running locally

```bash
cd contextmd
npm install
# create .env.local with the vars above
npm run dev        # http://localhost:3000
npm run build      # production build
npm test           # jest test suite
```

Patient entry: `http://localhost:3000/emergency`
Provider entry: `http://localhost:3000/worklist`

---

## Demo mode

The `WorklistDevBar` (provider) and `DemoPanel` (patient) let you inject pre-built cases without going through the full intake flow:

| Demo key               | Scenario                                      |
| ---------------------- | --------------------------------------------- |
| `tier0_sunburn`        | Mild sunburn — auto-resolved with self-care   |
| `tier1_cold`           | Viral URI — stable, low severity              |
| `tier2_backpain`       | Severe radicular back pain + medication flags |
| `tier2_cough_medflags` | ACE-inhibitor cough — drug-induced            |
| `tier2_pharmacist`     | Uncomplicated UTI — Quebec pharmacist route   |
| `tier3_urgent`         | Necrotising fasciitis — ER now                |

---

## Intentionally out of scope (hackathon)

- Real authentication (OAuth / sessions) — replaced by shared provider token
- Actual photo storage — photo count and names stored, no file upload
- HIPAA / PHIPA compliance — demo data only, not for clinical use
- Push notifications — patient polls every 5 s instead
- Multi-language AI output — triage brief generated in English, translated by Haiku post-hoc
