# RéponSanté

Asynchronous medical triage navigation for the 2 million Quebecers without a family doctor.

Built for the **Claude Builders Hackathon at McGill — April 4, 2026** · Biology & Physical Health track

---

## The Problem

When something non-emergency comes up, people without a family doctor have no good option:

- **Info-Santé (811)** — phone-only, synchronous, poorly rated, actively shutting down locations
- **Emergency Room** — 50%+ of ER visits in Quebec are non-urgent; patients flood ERs because there's no structured alternative
- **Google** — unstructured, anxiety-amplifying, no actionable next step

RéponSanté gives them a structured, asynchronous way to get a competent, evidence-grounded answer to: **"Should I worry about this, and what do I do next?"**

---

## What It Does

1. **Patient submits a structured symptom report** — body location, symptom description, timeline, severity, up to 3 photos, specific questions, medical history. Takes ~5 minutes.
2. **Claude processes the intake** — organises it into a clinical brief for provider review and assigns a complexity tier (0–4) using explicit, documented criteria grounded in NIH public data.
3. **Simple cases resolve automatically** — Tier 0 cases get a Claude-generated self-care response, grounded in MedlinePlus content, with no provider time required.
4. **Complex cases go to a provider worklist** — the provider reviews the AI brief and authors a tiered response (Monitor / Book Appointment / Urgent).
5. **Patient receives a structured response card** — plain language, concrete next steps, NIH sources linked, mandatory triage disclaimer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 (App Router), TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Radix primitives |
| State | Zustand (intake form), localStorage (patient ID) |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| AI | Anthropic claude-sonnet-4-6 (Anthropic SDK) |
| NIH APIs | MedlinePlus Connect, PubMed E-utilities, RxNorm, OpenFDA FAERS |
| Deployment | Vercel |
| Testing | Jest, ts-jest, React Testing Library |

---

## Project Structure

```
contextmd/
├── app/
│   ├── (patient)/
│   │   ├── emergency/        # Binary gate: emergency → 911 or intake
│   │   ├── intake/           # 8-step structured symptom form
│   │   ├── dashboard/        # Patient case list
│   │   └── case/[id]/        # Case status + triage response
│   ├── (provider)/
│   │   ├── worklist/         # Provider case queue
│   │   └── case/[id]/        # Case detail + response form
│   └── api/
│       ├── cases/            # Case CRUD endpoints
│       ├── triage/           # Claude + NIH AI processing
│       └── respond/[id]/     # Provider response submission
├── components/
│   ├── intake/steps/         # 8 intake form step components
│   ├── patient/              # Response card, status badge
│   └── provider/             # Worklist row, clinical brief, response form
├── lib/
│   ├── types.ts              # Shared TypeScript types
│   ├── claude.ts             # Anthropic SDK + system prompt
│   ├── nih.ts                # MedlinePlus, PubMed, RxNorm, OpenFDA
│   ├── triage.ts             # Tier 4 keyword detection (client-side)
│   └── store.ts              # Zustand intake form state
└── supabase/migrations/      # PostgreSQL schema
```

---

## Triage Tier System

| Tier | Label | Handled By |
|---|---|---|
| 4 | Emergency — go to ER / call 911 | Blocked at intake form (keyword detection) |
| 3 | Urgent (act within 24–48h) | Provider |
| 2 | Book an appointment | Provider |
| 1 | Monitor at home | Provider |
| 0 | Self-manageable | Claude (auto-response, NIH-grounded) |

---

## Ethical Design

- **Hard emergency gate** — no path into intake if emergency symptoms are checked
- **No diagnosis language** — Claude's system prompt explicitly forbids diagnostic framing
- **Provider-authored clinical responses** — Tier 1–3 responses are written by humans, not AI
- **Evidence-grounded AI output** — Tier 0 responses cite specific MedlinePlus content retrieved at runtime
- **Transparent scoring** — tier criteria are explicit in the system prompt; providers see the reasoning
- **Mandatory disclaimer** — every response shows: "This is triage navigation guidance, not a medical diagnosis."

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier)
- An [Anthropic API key](https://console.anthropic.com)
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for deployment)

### Local Setup

```bash
# 1. Clone
git clone https://github.com/AlyGaber0/CBC_HackSAK.git
cd CBC_HackSAK/contextmd

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

# 4. Run Supabase migration
# Copy contents of supabase/migrations/001_initial.sql into your
# Supabase project's SQL editor and run it.

# 5. Start dev server
npm run dev
```

Open `http://localhost:3000`.

### Running Tests

```bash
npm test                      # Run all tests once
npm run test:coverage         # Run with coverage report (≥70% gate on lib/ and api/)
```

---

## Demo Flow (5 min)

1. **Emergency gate** — check a box, see the 911 screen. Uncheck, continue to intake.
2. **Patient intake** — fill 3–4 steps with a skin mole concern. Submit.
3. **Processing** — watch status update as Claude processes (Tier 2 — Moderate).
4. **Provider worklist** — switch to `/provider/worklist`, claim the case.
5. **Case detail** — review the AI clinical brief, patient questions (highlighted), tier reasoning.
6. **Respond** — select "Book Appointment → Dermatologist → 2–4 weeks", write a message, submit.
7. **Patient response** — switch back to patient view, see the structured response card with NIH sources.

---

## Documentation

- [`PLAN.md`](./PLAN.md) — Full implementation plan with tasks, code, tests, and git workflow
- [`PRD.md`](./PRD.md) — Product requirements document

---

## Team

Built at the Claude Builders Hackathon at McGill, April 4 2026.

Co-authored with Claude Sonnet 4.6.
