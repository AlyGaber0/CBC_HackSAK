# ContextMD — Hackathon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ContextMD — a patient-facing async triage web app where structured symptom intake flows through Claude (with NIH API grounding) into a provider worklist, returning a tiered response card to the patient.

**Architecture:** Single Next.js 15 App Router monorepo. Supabase handles PostgreSQL + RLS. Anthropic SDK runs in Next.js API route handlers. All 4 NIH public APIs called at triage time. Deployed to Vercel.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (PostgreSQL + Storage), Anthropic claude-sonnet-4-6, MedlinePlus Connect + PubMed + RxNorm + OpenFDA FAERS APIs

**Team Split:**
- **Person A** → Patient UX: emergency gate, multi-step intake form, patient dashboard, response view
- **Person B** → Provider UX: worklist table, case detail view, response submission form
- **Person C** → Backend: Supabase schema, API routes, Claude triage route, NIH API lib

**Demo Track:** Biology & Physical Health (PCare+ Sub-Challenge)

---

## File Structure

```
/
├── app/
│   ├── layout.tsx                          # Root layout (font, toaster)
│   ├── page.tsx                            # Redirect to /emergency
│   ├── (patient)/
│   │   ├── layout.tsx                      # Patient layout (progress-save to localStorage)
│   │   ├── emergency/page.tsx              # Binary gate: emergency checklist → 911 or intake
│   │   ├── intake/page.tsx                 # Multi-step intake form (8 steps, Zustand state)
│   │   ├── dashboard/page.tsx              # Patient case list with polling
│   │   └── case/[id]/page.tsx              # Case status + triage response card
│   ├── (provider)/
│   │   ├── layout.tsx                      # Provider layout (role cookie check)
│   │   ├── worklist/page.tsx               # Case queue table with claim button
│   │   └── case/[id]/page.tsx              # Case detail (brief + photos) + response form
│   └── api/
│       ├── cases/
│       │   ├── route.ts                    # GET (list), POST (create case)
│       │   └── [id]/
│       │       ├── route.ts                # GET (single), PATCH (update status/tier)
│       │       └── claim/route.ts          # POST (claim for provider)
│       ├── respond/[id]/route.ts           # POST (submit provider response)
│       └── triage/route.ts                 # POST (Claude + NIH APIs → tier + brief)
├── components/
│   ├── intake/
│   │   ├── IntakeShell.tsx                 # Step shell with progress bar
│   │   ├── EmergencyGate.tsx               # Binary gate component
│   │   ├── steps/
│   │   │   ├── BodyLocationStep.tsx        # Dropdown: body region + sub-location
│   │   │   ├── SymptomStep.tsx             # Symptom type + free description
│   │   │   ├── TimelineStep.tsx            # Start date + rate-of-change
│   │   │   ├── SeverityStep.tsx            # Pain slider + associated symptoms checkboxes
│   │   │   ├── PhotoStep.tsx               # Simulated: file input → local preview
│   │   │   ├── FreeTextStep.tsx            # "Describe in your own words" textarea
│   │   │   ├── QuestionsStep.tsx           # Up to 3 specific questions
│   │   │   └── HistoryStep.tsx             # Conditions, medications, allergies
│   ├── patient/
│   │   ├── CaseStatusCard.tsx              # Status badge + timeline
│   │   └── TriageResponseCard.tsx          # Tiered outcome display
│   ├── provider/
│   │   ├── WorklistRow.tsx                 # Table row with urgency badge + claim
│   │   ├── ClinicalBrief.tsx               # AI-generated brief display (left col)
│   │   ├── ResponseForm.tsx                # Outcome cards + message box (right col)
│   │   └── OutcomeCard.tsx                 # Single selectable outcome card
│   └── ui/                                 # shadcn/ui components (auto-generated)
├── lib/
│   ├── types.ts                            # All shared TypeScript types
│   ├── supabase.ts                         # Supabase client (browser + server)
│   ├── claude.ts                           # Anthropic SDK + system prompt
│   ├── nih.ts                              # MedlinePlus, PubMed, RxNorm, OpenFDA
│   ├── triage.ts                           # Tier 4 keyword check (runs at intake time)
│   └── store.ts                            # Zustand store for intake form state
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
└── .env.local
```

---

## Phase 0 — Setup (All 3 Together, ~45 min)

### Task 0: Scaffold & Configure

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/samyarrafatzand/Projects/CBC_HackSAK
npx create-next-app@latest contextmd --typescript --tailwind --app --src-dir=no --import-alias="@/*"
cd contextmd
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr zustand \
  lucide-react class-variance-authority clsx tailwind-merge \
  @radix-ui/react-slider @radix-ui/react-checkbox @radix-ui/react-select \
  @radix-ui/react-progress @radix-ui/react-tabs @radix-ui/react-dialog \
  @radix-ui/react-badge sonner date-fns
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
# Choose: Default style, Zinc base color, yes CSS variables
npx shadcn@latest add button card badge select slider checkbox textarea progress tabs dialog toast
```

- [ ] **Step 4: Create Supabase project**

Go to supabase.com → New project → name: `contextmd` → save the project URL and anon key.

- [ ] **Step 5: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 6: Link Vercel project**

```bash
npx vercel link
# Follow prompts, link to team/personal account
# Add env vars in Vercel dashboard matching .env.local
```

---

## Phase 1 — Foundation (Person C, ~1.5 hours)

### Task 1: Supabase Schema

- [ ] **Step 1: Run migration in Supabase SQL editor**

Copy and run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- supabase/migrations/001_initial.sql

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,              -- localStorage-generated UUID
  status TEXT NOT NULL DEFAULT 'processing',
  -- Values: processing | awaiting_review | in_review | response_ready | escalated
  tier INTEGER,                          -- 0-4, set after AI processing
  body_location TEXT,
  body_sub_location TEXT,
  symptom_type TEXT,
  symptom_description TEXT,
  timeline_start DATE,
  timeline_changed TEXT,                 -- 'better' | 'worse' | 'same'
  pain_severity INTEGER,                 -- 0-10
  associated_symptoms TEXT[],
  free_text TEXT,
  patient_questions TEXT[],              -- up to 3
  medical_conditions TEXT[],
  medications TEXT[],
  allergies TEXT[],
  photo_count INTEGER DEFAULT 0,         -- simulated
  photo_names TEXT[],                    -- original filenames for display
  ai_brief JSONB,                        -- structured brief from Claude
  ai_tier_reasoning TEXT,
  claimed_by TEXT,                       -- provider ID
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  -- Values: self_manageable | monitor | book_appointment | urgent
  message TEXT NOT NULL,
  followup_days INTEGER,
  watch_for TEXT,
  provider_type TEXT,
  timeframe TEXT,
  urgency_note TEXT,
  nih_sources JSONB DEFAULT '[]',        -- [{source, url, title, excerpt}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow all for hackathon (no real auth)
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cases" ON cases FOR ALL USING (true);
CREATE POLICY "allow_all_responses" ON responses FOR ALL USING (true);

-- Indexes for common queries
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_patient_id ON cases(patient_id);
CREATE INDEX idx_cases_tier ON cases(tier);
CREATE INDEX idx_responses_case_id ON responses(case_id);
```

### Task 2: TypeScript Types

- [ ] **Step 1: Create `lib/types.ts`**

```typescript
// lib/types.ts

export type CaseStatus =
  | 'processing'
  | 'awaiting_review'
  | 'in_review'
  | 'response_ready'
  | 'escalated';

export type TriageOutcome =
  | 'self_manageable'
  | 'monitor'
  | 'book_appointment'
  | 'urgent';

export type TimelineChange = 'better' | 'worse' | 'same';

export interface Case {
  id: string;
  patient_id: string;
  status: CaseStatus;
  tier: number | null;
  body_location: string | null;
  body_sub_location: string | null;
  symptom_type: string | null;
  symptom_description: string | null;
  timeline_start: string | null;
  timeline_changed: TimelineChange | null;
  pain_severity: number | null;
  associated_symptoms: string[];
  free_text: string | null;
  patient_questions: string[];
  medical_conditions: string[];
  medications: string[];
  allergies: string[];
  photo_count: number;
  photo_names: string[];
  ai_brief: ClinicalBrief | null;
  ai_tier_reasoning: string | null;
  claimed_by: string | null;
  submitted_at: string;
  claimed_at: string | null;
  responded_at: string | null;
  created_at: string;
  responses?: Response[];
}

export interface ClinicalBrief {
  chiefComplaint: string;
  timeline: string;
  severity: string;
  redFlags: string[];
  medicationFlags: string[];
  relevantHistory: string;
  patientQuestions: string[];
  nihContext: string;
}

export interface Response {
  id: string;
  case_id: string;
  outcome: TriageOutcome;
  message: string;
  followup_days: number | null;
  watch_for: string | null;
  provider_type: string | null;
  timeframe: string | null;
  urgency_note: string | null;
  nih_sources: NihSource[];
  created_at: string;
}

export interface NihSource {
  source: 'medlineplus' | 'pubmed' | 'rxnorm' | 'openfda';
  title: string;
  url: string;
  excerpt: string;
}

// Intake form state shape (Zustand)
export interface IntakeFormState {
  // Step 1 - Body location
  bodyLocation: string;
  bodySubLocation: string;
  // Step 2 - Symptoms
  symptomType: string;
  symptomDescription: string;
  // Step 3 - Timeline
  timelineStart: string; // ISO date string
  timelineChanged: TimelineChange | '';
  // Step 4 - Severity
  painSeverity: number;
  associatedSymptoms: string[];
  // Step 5 - Photos (simulated)
  photoCount: number;
  photoNames: string[];
  // Step 6 - Free text
  freeText: string;
  // Step 7 - Questions
  patientQuestions: [string, string, string];
  // Step 8 - Medical history
  medicalConditions: string;
  medications: string;
  allergies: string;
}

export interface TriageAIResult {
  brief: ClinicalBrief;
  tier: number;
  tierReasoning: string;
  selfCareResponse: string | null; // only for tier 0
  nihSources: NihSource[];
}
```

### Task 3: Supabase Client

- [ ] **Step 1: Create `lib/supabase.ts`**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client (patient pages)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client (API routes) — bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

### Task 4: NIH API Library

- [ ] **Step 1: Create `lib/nih.ts`**

```typescript
// lib/nih.ts
import type { NihSource } from './types';

// MedlinePlus Connect — patient-readable condition summaries
export async function fetchMedlinePlus(
  conditionTerm: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(conditionTerm);
    const url = `https://connect.nlm.nih.gov/connect/service?mainSearchCriteria.v.dn=${encoded}&knowledgeResponseType=application/json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.feed?.entry?.[0];
    if (!entry) return null;
    return {
      source: 'medlineplus',
      title: entry.title?.['_value'] ?? conditionTerm,
      url: entry.link?.[0]?.href ?? 'https://medlineplus.gov',
      excerpt: entry.summary?.['_value']?.replace(/<[^>]*>/g, '').slice(0, 300) ?? '',
    };
  } catch {
    return null;
  }
}

// PubMed E-utilities — evidence grounding for clinical red flags
export async function fetchPubMed(
  query: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(`${query}[Title/Abstract] AND (clinical[Title] OR guideline[Title])`);
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&retmax=1&retmode=json`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const pmid = searchData?.esearchresult?.idlist?.[0];
    if (!pmid) return null;

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
    if (!summaryRes.ok) return null;
    const summaryData = await summaryRes.json();
    const article = summaryData?.result?.[pmid];
    if (!article) return null;

    return {
      source: 'pubmed',
      title: article.title ?? 'PubMed Article',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      excerpt: `${article.source ?? ''} ${article.pubdate ?? ''}`.trim(),
    };
  } catch {
    return null;
  }
}

// RxNorm — validate and normalize medication names
export async function lookupRxNorm(
  medicationName: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(medicationName);
    const rxcuiUrl = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encoded}`;
    const rxcuiRes = await fetch(rxcuiUrl, { signal: AbortSignal.timeout(5000) });
    if (!rxcuiRes.ok) return null;
    const rxcuiData = await rxcuiRes.json();
    const rxcui = rxcuiData?.idGroup?.rxnormId?.[0];
    if (!rxcui) return null;

    return {
      source: 'rxnorm',
      title: `${medicationName} (RxNorm verified)`,
      url: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`,
      excerpt: `RxNorm CUI: ${rxcui}. Standardized medication reference from the National Library of Medicine.`,
    };
  } catch {
    return null;
  }
}

// OpenFDA FAERS — adverse event data for medication symptoms
export async function fetchOpenFDA(
  medicationName: string
): Promise<NihSource | null> {
  try {
    const encoded = encodeURIComponent(medicationName);
    const url = `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encoded}"&limit=1&count=patient.reaction.reactionmeddrapt.exact`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const topReactions = data?.results?.slice(0, 3).map((r: { term: string }) => r.term).join(', ');
    if (!topReactions) return null;

    return {
      source: 'openfda',
      title: `${medicationName} — FDA Adverse Event Data`,
      url: `https://www.fda.gov/safety/faers-public-dashboard`,
      excerpt: `Most reported adverse reactions: ${topReactions}. Source: FDA FAERS database.`,
    };
  } catch {
    return null;
  }
}

// Gather all relevant NIH context for a case
export async function gatherNihContext(params: {
  symptomDescription: string;
  symptomType: string;
  medications: string[];
}): Promise<{ sources: NihSource[]; contextText: string }> {
  const results = await Promise.allSettled([
    fetchMedlinePlus(params.symptomType || params.symptomDescription),
    fetchPubMed(`${params.symptomType} red flags warning signs`),
    params.medications[0] ? lookupRxNorm(params.medications[0]) : Promise.resolve(null),
    params.medications[0] ? fetchOpenFDA(params.medications[0]) : Promise.resolve(null),
  ]);

  const sources: NihSource[] = results
    .filter((r): r is PromiseFulfilledResult<NihSource | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((s): s is NihSource => s !== null);

  const contextText = sources
    .map(s => `[${s.source.toUpperCase()}] ${s.title}: ${s.excerpt}`)
    .join('\n\n');

  return { sources, contextText };
}
```

### Task 5: Tier 4 Keyword Gate (runs client-side at intake submit)

- [ ] **Step 1: Create `lib/triage.ts`**

```typescript
// lib/triage.ts

// Red flag keywords triggering immediate Tier 4 escalation.
// Checked client-side at intake submission — no AI call made.
const TIER4_PATTERNS = [
  /chest.{0,10}pain/i,
  /difficulty.{0,10}breath/i,
  /can't.{0,10}breath/i,
  /cannot.{0,10}breath/i,
  /loss.{0,10}consciousness/i,
  /passed.{0,10}out/i,
  /stroke/i,
  /face.{0,10}drooping/i,
  /arm.{0,10}weakness/i,
  /severe.{0,10}allergic/i,
  /anaphylax/i,
  /uncontrolled.{0,10}bleeding/i,
  /seizure/i,
  /overdose/i,
  /suicid/i,
  /heart.{0,10}attack/i,
];

export function checkTier4(text: string): boolean {
  return TIER4_PATTERNS.some(pattern => pattern.test(text));
}

export function checkAnyTier4(fields: string[]): boolean {
  return fields.some(f => checkTier4(f));
}
```

### Task 6: Zustand Intake Store

- [ ] **Step 1: Create `lib/store.ts`**

```typescript
// lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntakeFormState } from './types';

interface IntakeStore extends IntakeFormState {
  currentStep: number;
  setStep: (step: number) => void;
  update: (patch: Partial<IntakeFormState>) => void;
  reset: () => void;
}

const initialState: IntakeFormState = {
  bodyLocation: '',
  bodySubLocation: '',
  symptomType: '',
  symptomDescription: '',
  timelineStart: '',
  timelineChanged: '',
  painSeverity: 0,
  associatedSymptoms: [],
  photoCount: 0,
  photoNames: [],
  freeText: '',
  patientQuestions: ['', '', ''],
  medicalConditions: '',
  medications: '',
  allergies: '',
};

export const useIntakeStore = create<IntakeStore>()(
  persist(
    (set) => ({
      ...initialState,
      currentStep: 0,
      setStep: (step) => set({ currentStep: step }),
      update: (patch) => set((state) => ({ ...state, ...patch })),
      reset: () => set({ ...initialState, currentStep: 0 }),
    }),
    { name: 'contextmd-intake' }
  )
);
```

### Task 7: Claude Client + System Prompt

- [ ] **Step 1: Create `lib/claude.ts`**

```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import type { IntakeFormState, TriageAIResult, NihSource } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the AI triage engine for ContextMD, an asynchronous medical triage navigation platform serving patients in Quebec who lack access to a family physician.

## Your Role
You organize and score patient intake data. You do NOT diagnose, prescribe, or replace physician judgment. You produce structured clinical briefs for provider review and assign a complexity tier. Your output is used internally — patients see only the tier 0 self-care response (if applicable).

## Triage Tier Definitions
Score the case 0–4 using these explicit criteria:

**Tier 4 — Auto-Escalation (NEVER reaches you — blocked at intake):** Chest pain with shortness of breath, loss of consciousness, active stroke symptoms, severe allergic reaction/anaphylaxis, uncontrolled bleeding, seizure, overdose.

**Tier 3 — Urgent (act within 24–48 hrs):** Pain severity 8–10/10, rapidly worsening symptoms, symptoms present for <24hrs but progressing, fever >39°C with systemic symptoms, multiple red flag features without meeting Tier 4 threshold.

**Tier 2 — Book Appointment:** Changing or concerning features (e.g., ABCDE mole changes, new lumps, persistent cough >3 weeks), moderate severity (4–7/10), symptoms present >1 week without improvement.

**Tier 1 — Monitor:** Single stable symptom, low severity (1–3/10), no change over time, no red flags, clear benign presentation but patient is seeking reassurance.

**Tier 0 — Self-Manageable:** Clearly benign condition well-documented in NIH/MedlinePlus self-care resources. No concerning features. Pain <3/10. No changes. Examples: mild sunburn, common cold without complications, minor scrape. You generate the full patient response for these.

## NIH Grounding
You will receive NIH context from MedlinePlus, PubMed, RxNorm, and OpenFDA. Cite specific sources in your brief and self-care response. Never fabricate citations.

## Output Format
Respond ONLY with valid JSON matching this exact schema:

{
  "brief": {
    "chiefComplaint": "One sentence: what the patient is concerned about",
    "timeline": "When it started and how it has evolved",
    "severity": "Pain score context and associated symptom burden",
    "redFlags": ["List any concerning features present, or empty array"],
    "medicationFlags": ["List any medication interactions or adverse event flags, or empty array"],
    "relevantHistory": "Relevant conditions, medications, allergies",
    "patientQuestions": ["Patient question 1", "Patient question 2", "Patient question 3"],
    "nihContext": "1-2 sentences summarizing what NIH sources indicate about this presentation"
  },
  "tier": 0,
  "tierReasoning": "Explicit explanation referencing the tier criteria: which criteria met, which ruled out",
  "selfCareResponse": null,
  "nihSources": []
}

For Tier 0 ONLY, populate selfCareResponse with a complete plain-language patient-facing message (2–4 paragraphs) grounded in MedlinePlus content. Include: what this likely is, what to do at home, specific symptoms that would warrant escalating to a provider. End with: "This is triage navigation guidance, not a medical diagnosis. If your symptoms worsen or you have concerns, contact a healthcare provider."

For Tier 1–3, selfCareResponse must be null. The provider will author the patient response.

Do not include markdown, code fences, or any text outside the JSON object.`;

export async function runTriageAI(
  intake: IntakeFormState,
  nihContextText: string,
  nihSources: NihSource[]
): Promise<TriageAIResult> {
  const userMessage = `
## Patient Intake Data

**Body Location:** ${intake.bodyLocation} → ${intake.bodySubLocation}
**Symptom Type:** ${intake.symptomType}
**Symptom Description:** ${intake.symptomDescription}

**Timeline:** Started ${intake.timelineStart || 'unspecified'}. Trend: ${intake.timelineChanged || 'unspecified'}.
**Pain Severity:** ${intake.painSeverity}/10
**Associated Symptoms:** ${intake.associatedSymptoms.join(', ') || 'None reported'}

**In Patient's Own Words:** ${intake.freeText}

**Patient's Questions:**
${intake.patientQuestions.filter(Boolean).map((q, i) => `${i + 1}. ${q}`).join('\n')}

**Medical History:**
- Conditions: ${intake.medicalConditions || 'None reported'}
- Medications: ${intake.medications || 'None reported'}
- Allergies: ${intake.allergies || 'None reported'}

**Photos submitted:** ${intake.photoCount} image(s) (${intake.photoNames.join(', ') || 'none'})

---

## NIH Evidence Context (retrieved live from public APIs)

${nihContextText || 'No NIH data retrieved for this case.'}
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text) as TriageAIResult;

  // Attach retrieved NIH sources to result
  parsed.nihSources = nihSources;

  return parsed;
}
```

---

## Phase 2 — Parallel UI + API Tracks (~3–4 hours)

### Track C: API Routes (Person C)

#### Task 8: Cases API Route

- [ ] **Step 1: Create `app/api/cases/route.ts`**

```typescript
// app/api/cases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { IntakeFormState } from '@/lib/types';

// GET /api/cases — list cases for a patient or all (provider)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patient_id');
  const forProvider = searchParams.get('provider') === 'true';

  let query = supabaseAdmin
    .from('cases')
    .select('*, responses(*)')
    .order('submitted_at', { ascending: false });

  if (patientId && !forProvider) {
    query = query.eq('patient_id', patientId);
  }

  if (forProvider) {
    // Exclude escalated (tier 4 auto-handled) and self-manageable (tier 0 auto-resolved)
    query = query.in('status', ['awaiting_review', 'in_review']).not('tier', 'eq', 0);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/cases — create new case from intake
export async function POST(req: NextRequest) {
  const body: IntakeFormState & { patientId: string } = await req.json();

  const { data, error } = await supabaseAdmin
    .from('cases')
    .insert({
      patient_id: body.patientId,
      status: 'processing',
      body_location: body.bodyLocation,
      body_sub_location: body.bodySubLocation,
      symptom_type: body.symptomType,
      symptom_description: body.symptomDescription,
      timeline_start: body.timelineStart || null,
      timeline_changed: body.timelineChanged || null,
      pain_severity: body.painSeverity,
      associated_symptoms: body.associatedSymptoms,
      free_text: body.freeText,
      patient_questions: body.patientQuestions.filter(Boolean),
      medical_conditions: body.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
      medications: body.medications.split(',').map(s => s.trim()).filter(Boolean),
      allergies: body.allergies.split(',').map(s => s.trim()).filter(Boolean),
      photo_count: body.photoCount,
      photo_names: body.photoNames,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/cases/[id]/route.ts`**

```typescript
// app/api/cases/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('cases')
    .select('*, responses(*)')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('cases')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create `app/api/cases/[id]/claim/route.ts`**

```typescript
// app/api/cases/[id]/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { providerId } = await req.json();

  // Check not already claimed
  const { data: existing } = await supabaseAdmin
    .from('cases')
    .select('claimed_by')
    .eq('id', params.id)
    .single();

  if (existing?.claimed_by) {
    return NextResponse.json({ error: 'Case already claimed' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('cases')
    .update({ claimed_by: providerId, status: 'in_review', claimed_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

#### Task 9: Triage AI Route

- [ ] **Step 1: Create `app/api/triage/route.ts`**

```typescript
// app/api/triage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runTriageAI } from '@/lib/claude';
import { gatherNihContext } from '@/lib/nih';
import type { IntakeFormState } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { caseId, intake }: { caseId: string; intake: IntakeFormState } = await req.json();

  try {
    // 1. Gather NIH context in parallel
    const medications = intake.medications.split(',').map(s => s.trim()).filter(Boolean);
    const { sources: nihSources, contextText: nihContextText } = await gatherNihContext({
      symptomDescription: intake.symptomDescription,
      symptomType: intake.symptomType,
      medications,
    });

    // 2. Run Claude triage
    const result = await runTriageAI(intake, nihContextText, nihSources);

    // 3. Determine next status
    const isAutoResolved = result.tier === 0 && result.selfCareResponse;
    const nextStatus = isAutoResolved ? 'response_ready' : 'awaiting_review';

    // 4. Update case with AI results
    await supabaseAdmin
      .from('cases')
      .update({
        tier: result.tier,
        ai_brief: result.brief,
        ai_tier_reasoning: result.tierReasoning,
        status: nextStatus,
      })
      .eq('id', caseId);

    // 5. For Tier 0: auto-create response from Claude's self-care text
    if (isAutoResolved && result.selfCareResponse) {
      await supabaseAdmin.from('responses').insert({
        case_id: caseId,
        outcome: 'self_manageable',
        message: result.selfCareResponse,
        nih_sources: nihSources,
        responded_at: new Date().toISOString(),
      });
      await supabaseAdmin
        .from('cases')
        .update({ responded_at: new Date().toISOString() })
        .eq('id', caseId);
    }

    return NextResponse.json({ success: true, tier: result.tier, status: nextStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI processing failed';
    await supabaseAdmin
      .from('cases')
      .update({ status: 'awaiting_review' })
      .eq('id', caseId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

#### Task 10: Respond Route

- [ ] **Step 1: Create `app/api/respond/[id]/route.ts`**

```typescript
// app/api/respond/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const { data: response, error: responseError } = await supabaseAdmin
    .from('responses')
    .insert({
      case_id: params.id,
      outcome: body.outcome,
      message: body.message,
      followup_days: body.followup_days ?? null,
      watch_for: body.watch_for ?? null,
      provider_type: body.provider_type ?? null,
      timeframe: body.timeframe ?? null,
      urgency_note: body.urgency_note ?? null,
      nih_sources: [],
    })
    .select()
    .single();

  if (responseError) return NextResponse.json({ error: responseError.message }, { status: 500 });

  await supabaseAdmin
    .from('cases')
    .update({ status: 'response_ready', responded_at: new Date().toISOString() })
    .eq('id', params.id);

  return NextResponse.json(response, { status: 201 });
}
```

---

### Track A: Patient UX (Person A)

#### Task 11: Emergency Gate

- [ ] **Step 1: Create `app/page.tsx`** (root redirect)

```typescript
// app/page.tsx
import { redirect } from 'next/navigation';
export default function Home() { redirect('/emergency'); }
```

- [ ] **Step 2: Create `app/(patient)/emergency/page.tsx`**

```tsx
// app/(patient)/emergency/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, PhoneCall } from 'lucide-react';

const EMERGENCY_SYMPTOMS = [
  'Chest pain or tightness',
  'Difficulty breathing or shortness of breath',
  'Loss of consciousness or fainting',
  'Stroke symptoms (face drooping, arm weakness, speech difficulty)',
  'Severe allergic reaction (throat swelling, hives over body)',
  'Uncontrolled or heavy bleeding',
  'Seizure',
  'Suspected overdose',
];

export default function EmergencyGate() {
  const router = useRouter();
  const [checked, setChecked] = useState<string[]>([]);

  const hasEmergency = checked.length > 0;

  function toggle(symptom: string) {
    setChecked(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Before We Begin</h1>
          <p className="text-gray-600">
            Are you experiencing any of the following <strong>right now</strong>?
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          {EMERGENCY_SYMPTOMS.map(symptom => (
            <div key={symptom} className="flex items-start gap-3">
              <Checkbox
                id={symptom}
                checked={checked.includes(symptom)}
                onCheckedChange={() => toggle(symptom)}
                className="mt-0.5"
              />
              <label htmlFor={symptom} className="text-sm text-gray-700 cursor-pointer">
                {symptom}
              </label>
            </div>
          ))}
        </div>

        {hasEmergency ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center space-y-4">
            <PhoneCall className="mx-auto h-10 w-10 text-red-600" />
            <h2 className="text-xl font-bold text-red-700">Call 911 Now</h2>
            <p className="text-red-600 text-sm">
              Your symptoms may indicate a medical emergency. Do not wait.
              Call 911 or have someone drive you to the nearest emergency room immediately.
            </p>
            <Button
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white text-lg"
              onClick={() => window.location.href = 'tel:911'}
            >
              Call 911
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push('/intake')}
            >
              None of the above — Continue to Intake
            </Button>
            <p className="text-center text-xs text-gray-500">
              ContextMD is a triage navigation service, not a diagnostic tool.
              Always call 911 for life-threatening emergencies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Task 12: Intake Form Shell + Steps

- [ ] **Step 1: Create `app/(patient)/intake/page.tsx`**

```tsx
// app/(patient)/intake/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useIntakeStore } from '@/lib/store';
import { checkAnyTier4 } from '@/lib/triage';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import BodyLocationStep from '@/components/intake/steps/BodyLocationStep';
import SymptomStep from '@/components/intake/steps/SymptomStep';
import TimelineStep from '@/components/intake/steps/TimelineStep';
import SeverityStep from '@/components/intake/steps/SeverityStep';
import PhotoStep from '@/components/intake/steps/PhotoStep';
import FreeTextStep from '@/components/intake/steps/FreeTextStep';
import QuestionsStep from '@/components/intake/steps/QuestionsStep';
import HistoryStep from '@/components/intake/steps/HistoryStep';
import { useState } from 'react';

const STEPS = [
  { label: 'Location', component: BodyLocationStep },
  { label: 'Symptoms', component: SymptomStep },
  { label: 'Timeline', component: TimelineStep },
  { label: 'Severity', component: SeverityStep },
  { label: 'Photos', component: PhotoStep },
  { label: 'Description', component: FreeTextStep },
  { label: 'Questions', component: QuestionsStep },
  { label: 'History', component: HistoryStep },
];

function getPatientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('contextmd_patient_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('contextmd_patient_id', id); }
  return id;
}

export default function IntakePage() {
  const router = useRouter();
  const store = useIntakeStore();
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = store.currentStep;
  const StepComponent = STEPS[stepIndex].component;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  async function handleSubmit() {
    setSubmitting(true);
    const tier4Check = checkAnyTier4([
      store.symptomDescription, store.freeText,
      ...store.associatedSymptoms,
      ...store.patientQuestions,
    ]);

    if (tier4Check) {
      router.push('/emergency');
      return;
    }

    const patientId = getPatientId();
    const caseRes = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...store, patientId }),
    });
    const newCase = await caseRes.json();

    // Fire and forget triage (async)
    fetch('/api/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: newCase.id, intake: store }),
    });

    store.reset();
    router.push(`/case/${newCase.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Step {stepIndex + 1} of {STEPS.length} — {STEPS[stepIndex].label}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-2xl w-full bg-white rounded-xl border shadow-sm p-8">
          <StepComponent />
        </div>
      </div>

      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {stepIndex > 0 && (
            <Button variant="outline" onClick={() => store.setStep(stepIndex - 1)}>
              Back
            </Button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <Button className="ml-auto" onClick={() => store.setStep(stepIndex + 1)}>
              Continue
            </Button>
          ) : (
            <Button
              className="ml-auto bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Case'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create each intake step component** (all in `components/intake/steps/`)

**BodyLocationStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BODY_LOCATIONS: Record<string, string[]> = {
  'Head & Neck': ['Head', 'Face', 'Neck', 'Throat', 'Ear', 'Eye', 'Nose', 'Mouth'],
  'Chest': ['Chest (front)', 'Chest (back)', 'Breast', 'Shoulder'],
  'Abdomen': ['Upper abdomen', 'Lower abdomen', 'Side (flank)', 'Groin'],
  'Back': ['Upper back', 'Lower back', 'Spine'],
  'Arms & Hands': ['Upper arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Finger'],
  'Legs & Feet': ['Thigh', 'Knee', 'Lower leg', 'Ankle', 'Foot', 'Toe'],
  'Skin (general)': ['Skin — arm', 'Skin — leg', 'Skin — torso', 'Skin — face', 'Skin — scalp'],
  'Genital / Urinary': ['Genital area', 'Urinary'],
  'Other': ['Whole body', 'Multiple areas', 'Unsure'],
};

export default function BodyLocationStep() {
  const { bodyLocation, bodySubLocation, update } = useIntakeStore();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Where is the problem?</h2>
        <p className="text-sm text-gray-500 mt-1">Select the general area first, then the specific location.</p>
      </div>
      <div className="space-y-4">
        <Select value={bodyLocation} onValueChange={(v) => update({ bodyLocation: v, bodySubLocation: '' })}>
          <SelectTrigger><SelectValue placeholder="Select body area..." /></SelectTrigger>
          <SelectContent>
            {Object.keys(BODY_LOCATIONS).map(area => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bodyLocation && (
          <Select value={bodySubLocation} onValueChange={(v) => update({ bodySubLocation: v })}>
            <SelectTrigger><SelectValue placeholder="Select specific location..." /></SelectTrigger>
            <SelectContent>
              {BODY_LOCATIONS[bodyLocation].map(sub => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
```

**SymptomStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const SYMPTOM_TYPES = [
  'Pain', 'Rash / skin change', 'Swelling / lump', 'Bleeding',
  'Fever', 'Fatigue / weakness', 'Nausea / vomiting', 'Headache',
  'Dizziness', 'Cough', 'Shortness of breath (mild)', 'Numbness / tingling',
  'Vision change', 'Hearing change', 'Urinary symptoms', 'Digestive issues', 'Other',
];

export default function SymptomStep() {
  const { symptomType, symptomDescription, update } = useIntakeStore();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">What kind of symptom is it?</h2>
        <p className="text-sm text-gray-500 mt-1">Choose the best match, then describe it briefly.</p>
      </div>
      <Select value={symptomType} onValueChange={(v) => update({ symptomType: v })}>
        <SelectTrigger><SelectValue placeholder="Select symptom type..." /></SelectTrigger>
        <SelectContent>
          {SYMPTOM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <Textarea
        placeholder="e.g. A dark mole on my left forearm that seems to have changed shape over the past month"
        value={symptomDescription}
        onChange={(e) => update({ symptomDescription: e.target.value })}
        rows={4}
        className="resize-none"
      />
    </div>
  );
}
```

**TimelineStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TimelineStep() {
  const { timelineStart, timelineChanged, update } = useIntakeStore();
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">When did this start?</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Approximate start date</Label>
          <Input type="date" value={timelineStart} onChange={e => update({ timelineStart: e.target.value })} max={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="space-y-2">
          <Label>Since it started, has it...</Label>
          <Select value={timelineChanged} onValueChange={(v: 'better' | 'worse' | 'same') => update({ timelineChanged: v })}>
            <SelectTrigger><SelectValue placeholder="Select trend..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="worse">Gotten worse</SelectItem>
              <SelectItem value="same">Stayed the same</SelectItem>
              <SelectItem value="better">Improved on its own</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
```

**SeverityStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

const ASSOCIATED_SYMPTOMS = [
  'Fever', 'Nausea', 'Fatigue', 'Loss of appetite', 'Night sweats',
  'Unintended weight loss', 'Swollen lymph nodes', 'Vomiting', 'Diarrhea',
  'Difficulty sleeping', 'Itching', 'Discharge', 'Bruising easily',
];

export default function SeverityStep() {
  const { painSeverity, associatedSymptoms, update } = useIntakeStore();

  function toggleSymptom(s: string) {
    const next = associatedSymptoms.includes(s)
      ? associatedSymptoms.filter(x => x !== s)
      : [...associatedSymptoms, s];
    update({ associatedSymptoms: next });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">How severe is it?</h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>No pain (0)</span>
            <span className="font-semibold text-gray-900">Current: {painSeverity}/10</span>
            <span>Worst (10)</span>
          </div>
          <Slider
            min={0} max={10} step={1}
            value={[painSeverity]}
            onValueChange={([v]) => update({ painSeverity: v })}
            className="w-full"
          />
        </div>
        <div className="space-y-3 pt-4 border-t">
          <p className="font-medium text-gray-700">Any other symptoms? (check all that apply)</p>
          <div className="grid grid-cols-2 gap-2">
            {ASSOCIATED_SYMPTOMS.map(s => (
              <div key={s} className="flex items-center gap-2">
                <Checkbox id={s} checked={associatedSymptoms.includes(s)} onCheckedChange={() => toggleSymptom(s)} />
                <label htmlFor={s} className="text-sm text-gray-600 cursor-pointer">{s}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**PhotoStep.tsx:** (simulated — no actual upload)
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PhotoStep() {
  const { photoCount, photoNames, update } = useIntakeStore();
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    const names = files.map(f => f.name);
    const urls = files.map(f => URL.createObjectURL(f));
    update({ photoCount: files.length, photoNames: names });
    setPreviews(urls);
  }

  function removePhoto(i: number) {
    const newPreviews = previews.filter((_, idx) => idx !== i);
    const newNames = photoNames.filter((_, idx) => idx !== i);
    setPreviews(newPreviews);
    update({ photoCount: newPreviews.length, photoNames: newNames });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Add photos (optional)</h2>
        <p className="text-sm text-gray-500 mt-1">Up to 3 photos. Visible only to the reviewing provider.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {previews.length < 3 && (
        <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => inputRef.current?.click()}>
          <Camera className="mr-2 h-5 w-5" /> Add Photo(s)
        </Button>
      )}
      {previews.length > 0 && (
        <div className="flex gap-3">
          {previews.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={photoNames[i]} className="w-24 h-24 object-cover rounded-lg border" />
              <button onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 bg-white rounded-full border shadow-sm p-0.5">
                <X className="h-3 w-3 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">Photos are shown to the provider for visual context only. They are not stored externally.</p>
    </div>
  );
}
```

**FreeTextStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Textarea } from '@/components/ui/textarea';

export default function FreeTextStep() {
  const { freeText, update } = useIntakeStore();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">In your own words</h2>
        <p className="text-sm text-gray-500 mt-1">Tell us anything else about what you're experiencing. No detail is too small.</p>
      </div>
      <Textarea
        placeholder="e.g. I noticed a mole on my arm last month. It looked normal at first but now one edge seems uneven and the color has changed slightly. My mother had skin cancer so I'm a bit worried..."
        value={freeText}
        onChange={e => update({ freeText: e.target.value })}
        rows={8}
        className="resize-none"
      />
      <p className="text-xs text-gray-400">{freeText.length} characters</p>
    </div>
  );
}
```

**QuestionsStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function QuestionsStep() {
  const { patientQuestions, update } = useIntakeStore();
  const setQ = (i: number, v: string) => {
    const next = [...patientQuestions] as [string, string, string];
    next[i] = v;
    update({ patientQuestions: next });
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Your specific questions</h2>
        <p className="text-sm text-gray-500 mt-1">What do you most want the provider to answer? Up to 3 questions.</p>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-1">
          <Label>Question {i + 1} {i === 0 ? '(required)' : '(optional)'}</Label>
          <Input
            placeholder={i === 0 ? 'e.g. Should I see a dermatologist about this mole?' : 'Optional question...'}
            value={patientQuestions[i]}
            onChange={e => setQ(i, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
```

**HistoryStep.tsx:**
```tsx
'use client';
import { useIntakeStore } from '@/lib/store';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function HistoryStep() {
  const { medicalConditions, medications, allergies, update } = useIntakeStore();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Medical history</h2>
        <p className="text-sm text-gray-500 mt-1">This helps the provider assess context. Separate multiple items with commas.</p>
      </div>
      <div className="space-y-2">
        <Label>Medical conditions</Label>
        <Textarea placeholder="e.g. Type 2 diabetes, hypertension" value={medicalConditions} onChange={e => update({ medicalConditions: e.target.value })} rows={2} className="resize-none" />
      </div>
      <div className="space-y-2">
        <Label>Current medications</Label>
        <Textarea placeholder="e.g. Metformin 500mg, Lisinopril 10mg" value={medications} onChange={e => update({ medications: e.target.value })} rows={2} className="resize-none" />
      </div>
      <div className="space-y-2">
        <Label>Known allergies</Label>
        <Textarea placeholder="e.g. Penicillin, shellfish" value={allergies} onChange={e => update({ allergies: e.target.value })} rows={2} className="resize-none" />
      </div>
    </div>
  );
}
```

#### Task 13: Patient Case Dashboard + Response View

- [ ] **Step 1: Create `app/(patient)/dashboard/page.tsx`**

```tsx
// app/(patient)/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Case } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Plus } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  processing: { label: 'Processing', color: 'bg-gray-100 text-gray-700' },
  awaiting_review: { label: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-700' },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  response_ready: { label: 'Response Ready', color: 'bg-green-100 text-green-700' },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-700' },
};

function getPatientId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('contextmd_patient_id') ?? '';
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    const id = getPatientId();
    if (!id) return;
    const load = () =>
      fetch(`/api/cases?patient_id=${id}`)
        .then(r => r.json())
        .then(setCases);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Your Cases</h1>
          <Link href="/emergency">
            <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> New Case</Button>
          </Link>
        </div>
        {cases.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No cases yet.</div>
        ) : (
          <div className="space-y-3">
            {cases.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              return (
                <Link key={c.id} href={`/case/${c.id}`}>
                  <div className="bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{c.body_location} — {c.symptom_type}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(patient)/case/[id]/page.tsx`**

```tsx
// app/(patient)/case/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { Case } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, Calendar, Eye } from 'lucide-react';

const OUTCOME_CONFIG = {
  self_manageable: { label: 'Self-Manageable', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  monitor: { label: 'Monitor at Home', icon: Eye, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  book_appointment: { label: 'Book an Appointment', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  urgent: { label: 'Act Urgently', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export default function CasePage({ params }: { params: { id: string } }) {
  const [caseData, setCaseData] = useState<Case | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(`/api/cases/${params.id}`)
        .then(r => r.json())
        .then(setCaseData);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (!caseData) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;

  const response = caseData.responses?.[0];
  const outcomeConfig = response ? OUTCOME_CONFIG[response.outcome] : null;
  const Icon = outcomeConfig?.icon;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{caseData.body_location} — {caseData.symptom_type}</h1>
          <p className="text-sm text-gray-500">Submitted {formatDistanceToNow(new Date(caseData.submitted_at), { addSuffix: true })}</p>
        </div>

        {!response && (
          <div className="bg-white rounded-lg border p-6 flex items-center gap-4">
            <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
            <div>
              <p className="font-medium text-gray-900">
                {caseData.status === 'processing' ? 'Processing your intake...' :
                 caseData.status === 'awaiting_review' ? 'Awaiting provider review' :
                 'A provider is reviewing your case'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">You'll see the response here when it's ready. No need to refresh.</p>
            </div>
          </div>
        )}

        {response && outcomeConfig && Icon && (
          <div className={`rounded-lg border p-6 space-y-4 ${outcomeConfig.bg}`}>
            <div className={`flex items-center gap-3 ${outcomeConfig.color}`}>
              <Icon className="h-7 w-7" />
              <h2 className="text-lg font-bold">{outcomeConfig.label}</h2>
            </div>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{response.message}</p>

            {response.outcome === 'monitor' && response.followup_days && (
              <div className="bg-white rounded border p-3 text-sm">
                <strong>Check back in:</strong> {response.followup_days} days
                {response.watch_for && <><br /><strong>Watch for:</strong> {response.watch_for}</>}
              </div>
            )}
            {response.outcome === 'book_appointment' && (
              <div className="bg-white rounded border p-3 text-sm">
                <strong>Specialist:</strong> {response.provider_type}<br />
                <strong>Timeframe:</strong> {response.timeframe}
              </div>
            )}
            {response.outcome === 'urgent' && response.urgency_note && (
              <div className="bg-white rounded border border-red-200 p-3 text-sm text-red-700">
                <strong>Urgent note:</strong> {response.urgency_note}
              </div>
            )}

            {response.nih_sources?.length > 0 && (
              <div className="pt-2 border-t border-opacity-50">
                <p className="text-xs font-medium text-gray-500 mb-2">Sources</p>
                <div className="space-y-1">
                  {response.nih_sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline">
                      [{s.source.toUpperCase()}] {s.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 border-t pt-3">
              This is triage navigation guidance, not a medical diagnosis. ContextMD does not provide medical advice. If your symptoms worsen or you have concerns, contact a healthcare provider or call 911 for emergencies.
            </p>
          </div>
        )}

        {caseData.patient_questions?.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-gray-700 mb-2">Your Questions</h3>
            <ul className="space-y-1">
              {caseData.patient_questions.map((q, i) => (
                <li key={i} className="text-sm text-gray-600">• {q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Track B: Provider UX (Person B)

#### Task 14: Provider Worklist

- [ ] **Step 1: Create `app/(provider)/layout.tsx`** (role gate)

```tsx
// app/(provider)/layout.tsx
'use client';
import { useEffect, useState } from 'react';

function setProviderRole() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('contextmd_role', 'provider');
    localStorage.setItem('contextmd_provider_id', localStorage.getItem('contextmd_provider_id') ?? 'provider-demo-001');
  }
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setProviderRole(); setReady(true); }, []);
  if (!ready) return null;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-gray-700">ContextMD — Provider View</span>
        <span className="ml-auto text-xs text-gray-400">Demo Mode</span>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(provider)/worklist/page.tsx`**

```tsx
// app/(provider)/worklist/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Case } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

const TIER_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Low', color: 'bg-green-100 text-green-700' },
  2: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'High', color: 'bg-red-100 text-red-700' },
};

function getProviderId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('contextmd_provider_id') ?? 'provider-demo-001')
    : 'provider-demo-001';
}

export default function WorklistPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/cases?provider=true')
        .then(r => r.json())
        .then(setCases);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function claimCase(id: string) {
    setClaiming(id);
    await fetch(`/api/cases/${id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: getProviderId() }),
    });
    router.push(`/provider/case/${id}`);
  }

  const sorted = [...cases].sort((a, b) => {
    if ((b.tier ?? 0) !== (a.tier ?? 0)) return (b.tier ?? 0) - (a.tier ?? 0);
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Case Worklist</h1>
        <span className="text-sm text-gray-500">{cases.length} open case{cases.length !== 1 ? 's' : ''}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">No pending cases.</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Urgency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Concern</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Photos</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(c => {
                const tier = c.tier ?? 1;
                const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
                const isClaimed = c.status === 'in_review';
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
                        Tier {tier} — {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.symptom_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.body_location}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}</td>
                    <td className="px-4 py-3">
                      {c.photo_count > 0 && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Camera className="h-3.5 w-3.5" /> {c.photo_count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${isClaimed ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {isClaimed ? 'In Review' : 'Awaiting Review'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isClaimed ? (
                        <Button size="sm" onClick={() => claimCase(c.id)} disabled={claiming === c.id}>
                          {claiming === c.id ? 'Claiming...' : 'Claim'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => router.push(`/provider/case/${c.id}`)}>
                          Continue
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

#### Task 15: Provider Case Detail + Response Form

- [ ] **Step 1: Create `app/(provider)/case/[id]/page.tsx`**

```tsx
// app/(provider)/case/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Case, TriageOutcome } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Eye, Calendar, AlertCircle } from 'lucide-react';

const OUTCOMES: { value: TriageOutcome; label: string; icon: React.ElementType; color: string; borderColor: string }[] = [
  { value: 'self_manageable', label: 'Benign / Self-Manageable', icon: CheckCircle2, color: 'text-green-600', borderColor: 'border-green-400' },
  { value: 'monitor', label: 'Monitor', icon: Eye, color: 'text-yellow-600', borderColor: 'border-yellow-400' },
  { value: 'book_appointment', label: 'Book Appointment', icon: Calendar, color: 'text-orange-600', borderColor: 'border-orange-400' },
  { value: 'urgent', label: 'Urgent', icon: AlertCircle, color: 'text-red-600', borderColor: 'border-red-400' },
];

const PROVIDER_TYPES = ['Family physician', 'Dermatologist', 'Cardiologist', 'Orthopedist', 'Gastroenterologist', 'Neurologist', 'Gynecologist', 'Urologist', 'Walk-in clinic'];
const TIMEFRAMES = ['Within 24–48 hours', 'Within 1 week', 'Within 2–4 weeks', 'Within 1–3 months', 'Next available appointment'];

export default function ProviderCasePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [outcome, setOutcome] = useState<TriageOutcome | ''>('');
  const [message, setMessage] = useState('');
  const [followupDays, setFollowupDays] = useState('');
  const [watchFor, setWatchFor] = useState('');
  const [providerType, setProviderType] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [urgencyNote, setUrgencyNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/cases/${params.id}`)
      .then(r => r.json())
      .then(setCaseData);
  }, [params.id]);

  async function submitResponse() {
    if (!outcome || !message.trim()) return;
    setSubmitting(true);
    await fetch(`/api/respond/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        message,
        followup_days: followupDays ? parseInt(followupDays) : null,
        watch_for: watchFor || null,
        provider_type: providerType || null,
        timeframe: timeframe || null,
        urgency_note: urgencyNote || null,
      }),
    });
    router.push('/provider/worklist');
  }

  if (!caseData) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;

  const brief = caseData.ai_brief;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{caseData.body_location} — {caseData.symptom_type}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm text-gray-500">Tier {caseData.tier}</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500 font-medium">{caseData.ai_tier_reasoning}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Intake + Clinical Brief */}
        <div className="space-y-5">
          {brief && (
            <div className="bg-white rounded-lg border p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 border-b pb-2">AI Clinical Brief</h2>
              <div className="space-y-3 text-sm">
                <div><span className="font-medium text-gray-700">Chief Complaint:</span> <span className="text-gray-800">{brief.chiefComplaint}</span></div>
                <div><span className="font-medium text-gray-700">Timeline:</span> <span className="text-gray-800">{brief.timeline}</span></div>
                <div><span className="font-medium text-gray-700">Severity:</span> <span className="text-gray-800">{brief.severity}</span></div>
                {brief.redFlags.length > 0 && (
                  <div>
                    <span className="font-medium text-red-700">Red Flags:</span>
                    <ul className="mt-1 ml-4 list-disc text-red-600">{brief.redFlags.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                {brief.medicationFlags.length > 0 && (
                  <div>
                    <span className="font-medium text-orange-700">Medication Flags:</span>
                    <ul className="mt-1 ml-4 list-disc text-orange-600">{brief.medicationFlags.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
                <div><span className="font-medium text-gray-700">History:</span> <span className="text-gray-800">{brief.relevantHistory}</span></div>
                <div className="border-t pt-3"><span className="font-medium text-blue-700">NIH Context:</span> <span className="text-gray-800">{brief.nihContext}</span></div>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-3">
            <h2 className="font-semibold text-amber-900">Patient's Questions</h2>
            {caseData.patient_questions?.map((q, i) => (
              <div key={i} className="flex gap-2 text-sm text-amber-800">
                <span className="font-bold">{i + 1}.</span> {q}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Patient's Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{caseData.free_text}</p>
          </div>

          <div className="bg-white rounded-lg border p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Medical History</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Conditions:</strong> {caseData.medical_conditions?.join(', ') || 'None reported'}</p>
              <p><strong>Medications:</strong> {caseData.medications?.join(', ') || 'None reported'}</p>
              <p><strong>Allergies:</strong> {caseData.allergies?.join(', ') || 'None reported'}</p>
            </div>
          </div>

          {caseData.photo_count > 0 && (
            <div className="bg-white rounded-lg border p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Photos ({caseData.photo_count})</h2>
              <div className="flex gap-2">
                {caseData.photo_names?.map((name, i) => (
                  <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-xs text-gray-500 text-center p-1">
                    {name}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Photos submitted by patient (preview unavailable in demo)</p>
            </div>
          )}
        </div>

        {/* RIGHT: Response Form */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg border p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Select Outcome</h2>
            <div className="grid grid-cols-2 gap-3">
              {OUTCOMES.map(o => {
                const Icon = o.icon;
                const isSelected = outcome === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      isSelected ? `${o.borderColor} bg-gray-50` : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${o.color}`} />
                    <span className="text-sm font-medium text-center text-gray-800">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {outcome === 'monitor' && (
            <div className="bg-white rounded-lg border p-5 space-y-3">
              <div className="space-y-1">
                <Label>Follow up in (days)</Label>
                <Input type="number" placeholder="e.g. 7" value={followupDays} onChange={e => setFollowupDays(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Watch for these symptoms</Label>
                <Textarea placeholder="e.g. Increased redness, fever above 38°C, spreading..." value={watchFor} onChange={e => setWatchFor(e.target.value)} rows={3} className="resize-none" />
              </div>
            </div>
          )}

          {outcome === 'book_appointment' && (
            <div className="bg-white rounded-lg border p-5 space-y-3">
              <div className="space-y-1">
                <Label>Specialist type</Label>
                <Select value={providerType} onValueChange={setProviderType}>
                  <SelectTrigger><SelectValue placeholder="Select specialist..." /></SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Recommended timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger><SelectValue placeholder="Select timeframe..." /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {outcome === 'urgent' && (
            <div className="bg-white rounded-lg border border-red-200 p-5 space-y-2">
              <Label className="text-red-700">Urgency note (required)</Label>
              <Textarea placeholder="e.g. Go to an urgent care clinic today. Do not wait more than 24 hours..." value={urgencyNote} onChange={e => setUrgencyNote(e.target.value)} rows={3} className="resize-none border-red-200" />
            </div>
          )}

          <div className="bg-white rounded-lg border p-5 space-y-3">
            <Label className="text-base font-semibold">Response to patient</Label>
            <p className="text-xs text-gray-500">Write in plain language the patient can understand. Address their specific questions.</p>
            <Textarea
              placeholder="e.g. Based on your description and the photos you submitted, this lesion has some features worth evaluating..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          <Button
            onClick={submitResponse}
            disabled={!outcome || !message.trim() || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {submitting ? 'Sending...' : 'Send Response to Patient'}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            By submitting, you confirm this response is triage navigation guidance, not a diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3 — Integration & Polish (~1.5 hours, all 3)

### Task 16: Root Layout + Navigation

- [ ] **Step 1: Update `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ContextMD — Async Medical Triage',
  description: 'Structured symptom intake and triage navigation for patients without a family doctor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add route group layouts**

`app/(patient)/layout.tsx` — just renders children (no extra wrapper needed)
`app/(provider)/layout.tsx` — already created in Task 14

### Task 17: End-to-End Integration Test

- [ ] **Step 1: Run local dev server**

```bash
npm run dev
```

- [ ] **Step 2: Full patient flow walkthrough**

1. Visit `http://localhost:3000` → should redirect to `/emergency`
2. Check a non-emergency box → 911 screen appears. Uncheck → "Continue to Intake" visible.
3. Click Continue → `/intake` with progress bar
4. Fill all 8 steps:
   - Location: Skin (general) → Skin — arm
   - Symptom: Rash / skin change → "Dark mole that has changed shape"
   - Timeline: 4 weeks ago → Worse
   - Severity: 4/10 → check Night sweats
   - Photos: select any 2 image files (previews show)
   - Free text: "I noticed my mole has grown and the border is uneven. My mother had melanoma."
   - Questions: "Should I see a dermatologist?", "Is this urgent?"
   - History: conditions none, medications none, allergies penicillin
5. Submit → redirected to `/case/[id]` showing "Processing" spinner
6. Wait ~10-15 seconds → status updates to "Awaiting Review" (Tier 2)

- [ ] **Step 3: Full provider flow walkthrough**

1. Visit `http://localhost:3000/provider/worklist`
2. See case in table with Tier 2 — Moderate badge
3. Click Claim → redirected to `/provider/case/[id]`
4. Verify AI clinical brief appears on left column
5. Verify patient questions highlighted in amber box
6. Select "Book Appointment" outcome → specialist + timeframe fields appear
7. Choose Dermatologist, Within 2–4 weeks
8. Write response message
9. Click Submit → redirected to worklist, case gone from queue
10. Switch back to patient case view → "Response Ready" with formatted response card

---

## Phase 4 — Deploy & Demo Prep (30 min)

### Task 18: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git add -A
git commit -m "feat: ContextMD initial implementation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 2: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 3: Verify Vercel env vars match `.env.local`**

In Vercel dashboard → Project Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

- [ ] **Step 4: Smoke test production URL**

Visit the deployed URL. Run the full patient → provider flow end-to-end.

---

## Verification Checklist (Run Before Demo)

- [ ] Emergency gate: checking any box shows 911 screen, no "Continue" button
- [ ] Tier 4 keyword test: enter "chest pain" in free text → submitting redirects to `/emergency`
- [ ] Intake auto-saves to localStorage → refresh mid-form → state preserved
- [ ] Case creates in Supabase → status starts as "processing"
- [ ] Triage API fires after case creation → tier and brief set within 15 seconds
- [ ] Tier 0 scenario: enter "mild sunburn, pain 1/10, 1 day ago, no associated symptoms" → status goes to "response_ready" without provider action
- [ ] Patient case page polls every 5 seconds → status badge updates live
- [ ] Provider worklist filters to only tier 1–3 awaiting_review/in_review
- [ ] Claim prevents double-claiming (409 if already claimed)
- [ ] Provider response creates record + flips case status to "response_ready"
- [ ] Patient response card shows NIH sources with working links
- [ ] Disclaimer text visible on both patient response card and provider response form

---

## Judging Criteria Map

| Criterion (weight) | How ContextMD scores |
|---|---|
| Real-World Impact (25%) | 2M Quebecers without family doctors, 50%+ non-urgent ER visits, 811 shutting down — real, documented problem with clear beneficiaries |
| Technical Execution (30%) | Next.js 15 App Router, Supabase, Anthropic SDK with explicit system prompt, 4 live NIH APIs, transparent tier scoring logic in system prompt |
| Ethical Alignment (25%) | Hard 911 gate, no diagnosis language, explicit disclaimer on every response, AI only writes self-care (Tier 0) with NIH grounding, provider authors all clinical responses |
| Presentation Quality (20%) | 5-min demo hits every flow, live deployment, two-role demo from same device |
