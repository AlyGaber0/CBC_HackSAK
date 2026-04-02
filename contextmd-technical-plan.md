# ContextMD — Complete Technical Implementation Plan
> Paste this entire file into Claude Code as the first message. It contains every schema, endpoint, component, and build instruction needed to produce the full application.

---

## 0. Project Overview

**Product**: Asynchronous telemedicine triage platform. Patients submit structured symptom reports (with photos + questions); licensed physicians review and return a 4-state triage response. Physicians bill RAMQ/OHIP via auto-generated claims.

**Two apps, one API:**
- `apps/web` — Patient-facing Next.js app (public)
- `apps/dashboard` — Physician dashboard Next.js app (authenticated)
- `apps/api` — Spring Boot 3 REST API (shared backend)

---

## 1. Monorepo Structure

```
contextmd/
├── apps/
│   ├── web/                     # Patient app (Next.js 15)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (patient)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                 # Landing / home
│   │   │   │   ├── submit/
│   │   │   │   │   └── page.tsx             # Multi-step intake form
│   │   │   │   ├── cases/
│   │   │   │   │   ├── page.tsx             # Patient case list
│   │   │   │   │   └── [caseId]/
│   │   │   │   │       └── page.tsx         # Case detail + triage response
│   │   │   │   └── profile/page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── intake/
│   │   │   │   ├── StepIndicator.tsx
│   │   │   │   ├── StepBodyLocation.tsx
│   │   │   │   ├── StepSymptomDetails.tsx
│   │   │   │   ├── StepPhotos.tsx
│   │   │   │   ├── StepQuestions.tsx
│   │   │   │   └── StepReview.tsx
│   │   │   ├── cases/
│   │   │   │   ├── CaseCard.tsx
│   │   │   │   └── TriageResponseCard.tsx
│   │   │   └── ui/                          # shadcn components
│   │   ├── lib/
│   │   │   ├── api.ts                       # Typed fetch client
│   │   │   ├── auth.ts                      # Auth helpers
│   │   │   └── upload.ts                    # S3 presigned upload
│   │   └── package.json
│   │
│   ├── dashboard/               # Physician app (Next.js 15)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── (physician)/
│   │   │   │   ├── layout.tsx              # Sidebar layout
│   │   │   │   ├── page.tsx                # Redirect to /queue
│   │   │   │   ├── queue/
│   │   │   │   │   └── page.tsx            # Case queue (main view)
│   │   │   │   ├── cases/
│   │   │   │   │   └── [caseId]/
│   │   │   │   │       └── page.tsx        # Case detail + respond
│   │   │   │   ├── billing/
│   │   │   │   │   └── page.tsx            # Billing claims list
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── queue/
│   │   │   │   ├── CaseQueueTable.tsx
│   │   │   │   └── UrgencyBadge.tsx
│   │   │   ├── case/
│   │   │   │   ├── CaseBrief.tsx           # AI summary + intake display
│   │   │   │   ├── PhotoGallery.tsx
│   │   │   │   ├── PatientQuestions.tsx
│   │   │   │   └── TriageResponseForm.tsx  # 4-state selector + message
│   │   │   └── billing/
│   │   │       └── ClaimRow.tsx
│   │   └── package.json
│   │
│   └── api/                     # Spring Boot 3 API
│       ├── src/main/java/com/contextmd/api/
│       │   ├── ContextMdApplication.java
│       │   ├── config/
│       │   │   ├── SecurityConfig.java
│       │   │   ├── JwtConfig.java
│       │   │   └── S3Config.java
│       │   ├── controller/
│       │   │   ├── AuthController.java
│       │   │   ├── CaseController.java
│       │   │   ├── PhotoController.java
│       │   │   ├── TriageController.java
│       │   │   ├── BillingController.java
│       │   │   └── PhysicianController.java
│       │   ├── service/
│       │   │   ├── AuthService.java
│       │   │   ├── CaseService.java
│       │   │   ├── PhotoService.java
│       │   │   ├── TriageService.java
│       │   │   ├── AiSummaryService.java
│       │   │   ├── BillingService.java
│       │   │   ├── NotificationService.java
│       │   │   └── S3Service.java
│       │   ├── repository/
│       │   │   ├── UserRepository.java
│       │   │   ├── CaseRepository.java
│       │   │   ├── PhotoRepository.java
│       │   │   ├── TriageResponseRepository.java
│       │   │   └── BillingClaimRepository.java
│       │   ├── model/
│       │   │   ├── User.java
│       │   │   ├── Physician.java
│       │   │   ├── Patient.java
│       │   │   ├── Case.java
│       │   │   ├── CasePhoto.java
│       │   │   ├── CaseQuestion.java
│       │   │   ├── TriageResponse.java
│       │   │   └── BillingClaim.java
│       │   ├── dto/
│       │   │   ├── request/
│       │   │   └── response/
│       │   ├── security/
│       │   │   ├── JwtTokenProvider.java
│       │   │   ├── JwtAuthFilter.java
│       │   │   └── UserDetailsServiceImpl.java
│       │   └── exception/
│       │       ├── GlobalExceptionHandler.java
│       │       └── ApiException.java
│       ├── src/main/resources/
│       │   ├── application.yml
│       │   ├── application-dev.yml
│       │   └── db/migration/               # Flyway migrations
│       │       ├── V1__init_schema.sql
│       │       ├── V2__seed_specialties.sql
│       │       └── V3__add_billing_codes.sql
│       └── pom.xml
│
├── packages/
│   └── types/                   # Shared TypeScript interfaces
│       └── src/index.ts
│
├── docker-compose.yml           # Local: postgres + api + redis
├── .env.template
└── PLAN.md                      # This file
```

---

## 2. Database Schema (PostgreSQL)

Run as Flyway migration `V1__init_schema.sql`:

```sql
-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('PATIENT', 'PHYSICIAN', 'ADMIN');
CREATE TYPE case_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO', 'COMPLETED', 'EXPIRED');
CREATE TYPE triage_outcome AS ENUM ('BENIGN', 'MONITOR', 'BOOK_APPOINTMENT', 'URGENT');
CREATE TYPE urgency_flag AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE billing_status AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID');
CREATE TYPE province AS ENUM ('QC', 'ON', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'NU', 'YT');

-- USERS (base identity for all roles)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENTS
CREATE TABLE patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  province          province NOT NULL DEFAULT 'QC',
  health_card_number VARCHAR(50),         -- encrypted at application layer
  health_card_province province,
  existing_conditions TEXT[],             -- e.g. ['diabetes', 'hypertension']
  current_medications TEXT[],
  allergies          TEXT[],
  consent_agreed_at  TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- PHYSICIANS
CREATE TABLE physicians (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_number      VARCHAR(50) NOT NULL,           -- RAMQ/OHIP number
  province            province NOT NULL DEFAULT 'QC',
  specialty           VARCHAR(100) NOT NULL DEFAULT 'General Practice',
  license_number      VARCHAR(50) NOT NULL,
  license_expiry      DATE NOT NULL,
  is_accepting_cases  BOOLEAN DEFAULT TRUE,
  max_cases_per_day   INTEGER DEFAULT 20,
  sla_hours           INTEGER DEFAULT 8,              -- response SLA
  bio                 TEXT,
  stripe_account_id   VARCHAR(100),                   -- Stripe Connect
  platform_fee_pct    DECIMAL(4,2) DEFAULT 20.00,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- CASES
CREATE TABLE cases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id),
  physician_id      UUID REFERENCES physicians(id),   -- NULL until assigned
  status            case_status NOT NULL DEFAULT 'DRAFT',
  urgency_flag      urgency_flag NOT NULL DEFAULT 'LOW',

  -- Intake fields
  body_location     VARCHAR(100) NOT NULL,            -- e.g. 'left forearm'
  body_system       VARCHAR(50),                      -- e.g. 'dermatology'
  symptom_type      VARCHAR(100) NOT NULL,            -- e.g. 'rash', 'lump'
  onset_date        DATE,
  duration_days     INTEGER,
  has_changed       BOOLEAN,
  change_description TEXT,
  pain_level        INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  associated_symptoms TEXT[],
  self_treatment    TEXT,
  raw_description   TEXT NOT NULL,                   -- patient's free-text

  -- AI-generated
  ai_summary        TEXT,                             -- clinical brief for physician
  ai_summary_generated_at TIMESTAMPTZ,

  -- Timestamps
  submitted_at      TIMESTAMPTZ,
  assigned_at       TIMESTAMPTZ,
  responded_at      TIMESTAMPTZ,
  sla_deadline      TIMESTAMPTZ,                      -- submitted_at + physician.sla_hours
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- CASE QUESTIONS (patient's 1–3 questions)
CREATE TABLE case_questions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id   UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  ordinal   INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 3),
  question  TEXT NOT NULL,
  UNIQUE(case_id, ordinal)
);

-- CASE PHOTOS
CREATE TABLE case_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  s3_key      VARCHAR(500) NOT NULL,                 -- never expose directly
  s3_bucket   VARCHAR(100) NOT NULL,
  file_size   INTEGER,
  mime_type   VARCHAR(50) DEFAULT 'image/jpeg',
  ordinal     INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIAGE RESPONSES
CREATE TABLE triage_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id         UUID NOT NULL REFERENCES cases(id),
  physician_id    UUID NOT NULL REFERENCES physicians(id),
  outcome         triage_outcome NOT NULL,
  message         TEXT NOT NULL,                     -- physician's written response
  followup_days   INTEGER,                           -- for MONITOR outcome
  specialist_type VARCHAR(100),                      -- for BOOK_APPOINTMENT outcome
  urgency_note    TEXT,                              -- for URGENT outcome
  review_duration_minutes INTEGER,                   -- billing: time spent
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id)                                    -- one response per case
);

-- CLARIFICATION REQUESTS
CREATE TABLE clarification_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id       UUID NOT NULL REFERENCES cases(id),
  physician_id  UUID NOT NULL REFERENCES physicians(id),
  message       TEXT NOT NULL,
  patient_reply TEXT,
  replied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- BILLING CLAIMS
CREATE TABLE billing_claims (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  physician_id        UUID NOT NULL REFERENCES physicians(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  province            province NOT NULL,
  billing_code        VARCHAR(20),                   -- e.g. RAMQ code
  service_date        DATE NOT NULL,
  service_start_time  TIME,
  service_end_time    TIME,
  amount_billed       DECIMAL(8,2),
  platform_fee        DECIMAL(8,2),
  status              billing_status DEFAULT 'PENDING',
  stripe_payment_intent_id VARCHAR(200),             -- for private pay
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS LOG
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  read_at     TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_cases_patient    ON cases(patient_id);
CREATE INDEX idx_cases_physician  ON cases(physician_id);
CREATE INDEX idx_cases_status     ON cases(status);
CREATE INDEX idx_cases_submitted  ON cases(submitted_at);
CREATE INDEX idx_claims_physician ON billing_claims(physician_id);
CREATE INDEX idx_notif_user       ON notifications(user_id, read_at);

-- FULL TEXT SEARCH on case summaries
CREATE INDEX idx_cases_fts ON cases USING gin(to_tsvector('english', coalesce(ai_summary,'') || ' ' || raw_description));
```

---

## 3. Spring Boot API — Complete Endpoint Reference

### Base URL
```
Local:      http://localhost:8080/api/v1
Production: https://api.contextmd.ca/api/v1
```

### Auth Endpoints

```
POST /auth/register
Body: { email, password, firstName, lastName, role: "PATIENT"|"PHYSICIAN" }
Response: { token, refreshToken, user: UserDTO }

POST /auth/login
Body: { email, password }
Response: { token, refreshToken, user: UserDTO }

POST /auth/refresh
Body: { refreshToken }
Response: { token, refreshToken }

POST /auth/logout
Header: Authorization: Bearer <token>
Response: 204

GET  /auth/me
Header: Authorization: Bearer <token>
Response: UserDTO
```

### Patient Endpoints

```
GET  /patients/me
Response: PatientDTO (includes conditions, medications)

PUT  /patients/me
Body: { dateOfBirth, province, existingConditions[], currentMedications[], allergies[] }

POST /patients/me/consent
Body: { agreed: true }
Response: { consentAgreedAt }
```

### Case Endpoints

```
-- PATIENT ACTIONS --

POST /cases
Body: {
  bodyLocation, bodySystem, symptomType,
  onsetDate, durationDays, hasChanged, changeDescription,
  painLevel, associatedSymptoms[], selfTreatment,
  rawDescription
}
Response: CaseDTO (status: DRAFT)

PATCH /cases/:caseId
Body: (any intake fields, while still DRAFT)

POST /cases/:caseId/questions
Body: { questions: [{ ordinal: 1, question }, { ordinal: 2, question }] }

POST /cases/:caseId/submit
Body: {}
Action: Sets status=SUBMITTED, triggers AI summary generation, assigns to physician queue, sets sla_deadline
Response: CaseDTO (status: SUBMITTED)

GET  /cases
Query: ?status=&page=&limit=20
Response: Page<CaseSummaryDTO>

GET  /cases/:caseId
Response: CaseDetailDTO (includes questions, photos presigned URLs, triage response if exists)

POST /cases/:caseId/clarification-reply
Body: { message }

-- PHYSICIAN ACTIONS --

GET  /physician/cases
Query: ?status=SUBMITTED|UNDER_REVIEW&urgency=&page=&limit=20
Response: Page<CaseSummaryDTO>

GET  /physician/cases/:caseId
Response: CaseDetailDTO (full detail, AI summary, patient history summary)

PATCH /physician/cases/:caseId/claim
Action: Assigns case to this physician, sets status=UNDER_REVIEW

POST /physician/cases/:caseId/clarification
Body: { message }

POST /physician/cases/:caseId/triage
Body: {
  outcome: "BENIGN"|"MONITOR"|"BOOK_APPOINTMENT"|"URGENT",
  message,
  followupDays?,
  specialistType?,
  urgencyNote?,
  reviewDurationMinutes
}
Action: Creates TriageResponse, sets case status=COMPLETED, triggers notification, creates billing claim
Response: TriageResponseDTO
```

### Photo Endpoints

```
POST /cases/:caseId/photos/presign
Body: { fileName, mimeType, fileSize }
Response: { uploadUrl, s3Key, photoId }
-- Client uploads directly to S3 using uploadUrl (presigned PUT) --

POST /cases/:caseId/photos/:photoId/confirm
Body: {}
Action: Confirms upload completed, saves record in DB
Response: CasePhotoDTO

GET  /cases/:caseId/photos/:photoId/url
Response: { url } -- presigned GET URL, expires in 15 min
-- NEVER expose S3 keys or permanent URLs --

DELETE /cases/:caseId/photos/:photoId
(Only while case is DRAFT)
```

### Billing Endpoints

```
GET  /physician/billing
Query: ?status=&from=&to=&page=
Response: Page<BillingClaimDTO>

GET  /physician/billing/:claimId
Response: BillingClaimDTO (full detail, pre-filled billing info)

PATCH /physician/billing/:claimId
Body: { billingCode, serviceStartTime, serviceEndTime, amountBilled }
Action: Updates claim fields before submission

POST /physician/billing/:claimId/submit
Action: Marks billing_status=SUBMITTED (physician submits through their own billing software)

-- Stripe webhooks --
POST /webhooks/stripe
(Internal — handles payment_intent.succeeded for private pay cases)
```

### AI Endpoint (Internal — not public)

```
POST /internal/cases/:caseId/generate-summary
(Called by the service after case submission, not exposed to clients)
Action: Sends intake data to OpenAI, stores result in cases.ai_summary
```

---

## 4. Spring Boot Implementation Details

### `application.yml`
```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DB_USER}
    password: ${DB_PASS}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate        # Flyway manages DDL
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080

jwt:
  secret: ${JWT_SECRET}
  expiration-ms: 3600000        # 1 hour
  refresh-expiration-ms: 604800000  # 7 days

aws:
  region: ca-central-1
  s3:
    bucket: ${S3_BUCKET}
    presign-expiry-minutes: 15

openai:
  api-key: ${OPENAI_API_KEY}
  model: gpt-4o-mini
  max-tokens: 500

sendgrid:
  api-key: ${SENDGRID_API_KEY}
  from-email: noreply@contextmd.ca

stripe:
  secret-key: ${STRIPE_SECRET_KEY}
  webhook-secret: ${STRIPE_WEBHOOK_SECRET}
  platform-fee-percent: 20
```

### Security Configuration (SecurityConfig.java)
```java
// Permit: POST /auth/**, POST /webhooks/**
// All other routes require valid JWT
// Role-based: /physician/** requires PHYSICIAN role
// Role-based: /internal/** requires ADMIN or internal service
```

### AI Summary Prompt (AiSummaryService.java)
```
System: You are a clinical documentation assistant. Your task is to convert 
        patient-submitted intake data into a concise structured clinical brief 
        for a licensed physician. You must ONLY summarize and organize the 
        information provided. Never add diagnostic conclusions, differential 
        diagnoses, or medical interpretations. Output plain text only.

User: Generate a clinical brief from the following patient intake:

SYMPTOM: {symptomType} on {bodyLocation}
ONSET: {durationDays} days ago, started {onsetDate}
CHANGED: {hasChanged} — {changeDescription}
PAIN LEVEL: {painLevel}/10
ASSOCIATED SYMPTOMS: {associatedSymptoms}
SELF-TREATMENT: {selfTreatment}
PATIENT DESCRIPTION: {rawDescription}
PATIENT MEDICATIONS: {currentMedications}
PATIENT CONDITIONS: {existingConditions}

PATIENT QUESTIONS:
1. {question1}
2. {question2}
3. {question3}

Format your output as:
CHIEF COMPLAINT: (1 sentence)
HISTORY: (2-4 sentences covering timeline, character, progression)
CONTEXT: (existing conditions, medications relevant to this complaint)
PATIENT QUESTIONS: (numbered list, verbatim)
```

### Urgency Auto-Flagging (CaseService.java)
```java
// Apply urgency_flag = CRITICAL if rawDescription or symptoms contain any of:
// ["chest pain", "difficulty breathing", "can't breathe", "loss of consciousness",
//  "severe bleeding", "stroke", "heart attack", "paralysis", "sudden vision loss"]
// Apply urgency_flag = HIGH if pain_level >= 8
// Apply urgency_flag = MEDIUM if has_changed = true
// Default: LOW
```

### Case Assignment Logic
```java
// On POST /cases/:id/submit:
// 1. Generate AI summary (async, OpenAI call)
// 2. Find available physician:
//    - Same province as patient
//    - is_accepting_cases = true
//    - Cases assigned today < max_cases_per_day
//    - Specialty matches body_system (if specialty physicians available)
//    - Order by: fewest active cases ASC, then random
// 3. Assign physician_id, set sla_deadline = NOW() + physician.sla_hours
// 4. Send notification to physician (email + in-app)
```

---

## 5. Frontend — Patient App (apps/web)

### Tech Stack
```
Next.js 15 (App Router)
TypeScript
Tailwind CSS v4
shadcn/ui components
React Query (TanStack Query v5) for server state
Zustand for intake form state
React Hook Form + Zod validation
next-themes for dark/light mode
```

### Key Pages

#### `/submit` — Multi-Step Intake Form
Use Zustand to persist form state across 6 steps. Step data is assembled and POSTed on final submit.

```typescript
// Step 1: Body Location
// Fields: bodySystem (dropdown: Skin, Musculoskeletal, Respiratory, Digestive, Other)
//         bodyLocation (text: "left forearm", "lower back")
//         symptomType (dropdown: Rash, Lump, Lesion, Swelling, Pain, Other)

// Step 2: Symptom Details
// Fields: onsetDate (date picker), durationDays (auto-calc), 
//         hasChanged (yes/no toggle), changeDescription (textarea if yes)
//         painLevel (0-10 slider), associatedSymptoms (multi-select chips)
//         selfTreatment (textarea), rawDescription (required textarea, 50-1000 chars)

// Step 3: Photos
// Dropzone with preview grid. Max 5 photos, 10MB each, JPEG/PNG/HEIC
// On drop: call POST /cases/:id/photos/presign, upload to S3, call /confirm
// Show upload progress per photo

// Step 4: Questions
// 1-3 text inputs. First is required.
// Placeholder examples: "Should I be worried about this?", "Is this an emergency?"

// Step 5: Medical History (pre-filled from patient profile)
// Show existing conditions, medications. Allow quick edit.

// Step 6: Review + Submit
// Summary of all entered data, photo thumbnails, questions listed
// Confirm consent checkbox (required)
// "Submit for Review" button → POST /cases/:id/submit
```

#### `/cases/[caseId]` — Case Detail
```typescript
// Show:
// - Status badge (Submitted / Under Review / Completed / Needs Info)
// - SLA countdown timer (if status !== COMPLETED)
// - AI summary (shown to patient as "Your case summary")
// - Photos uploaded (via presigned GET URLs)
// - Questions submitted
// - Triage response card (if status === COMPLETED):
//   - Outcome badge (color-coded: green/yellow/orange/red)
//   - Physician's message
//   - Next steps based on outcome
//   - Physician's name + specialty
// - Clarification thread (if NEEDS_INFO)
```

### Shared UI Components to Build
```
Badge.tsx          — status/outcome color badges
PhotoUpload.tsx    — dropzone with S3 presign flow
StepIndicator.tsx  — progress dots for multi-step form
SlaTimer.tsx       — countdown to response deadline
EmptyState.tsx     — no cases yet
TriageOutcomeCard  — big colored card showing triage result
```

---

## 6. Frontend — Physician Dashboard (apps/dashboard)

### Tech Stack
Same as patient app (Next.js 15, TypeScript, Tailwind, shadcn, React Query).

### Layout
```typescript
// Sidebar (fixed, 240px):
// - Logo
// - Queue (with unread count badge)
// - Billing
// - Settings
// - Sign out
// Main content: full-height scroll region
```

### `/queue` — Case Queue
```typescript
// Table columns:
// - Patient (age + gender, NO name until physician accepts case)
// - Concern (symptomType + bodyLocation)
// - Submitted (relative time: "2h ago")
// - SLA (time remaining, red if < 1hr)
// - Urgency (colored badge: LOW/MEDIUM/HIGH/CRITICAL)
// - Status (SUBMITTED / UNDER_REVIEW)
// - Action button ("Review" → navigates to case detail)
//
// Filters: All / Submitted / Under Review / Needs Info
// Sort: SLA deadline ASC (default), Submitted time, Urgency
// Refresh every 60 seconds (React Query refetchInterval)
```

### `/cases/[caseId]` — Case Detail + Respond
```typescript
// Layout: Two-column on desktop
// LEFT (60%):
//   - AI Summary card (highlighted box at top)
//   - Collapsible: Full Intake Answers
//   - Photo Gallery (lightbox on click, served via presigned URL)
//   - Patient Questions (highlighted, numbered, prominent)
//   - Patient Medical History (conditions, medications)
//
// RIGHT (40%, sticky):
//   - Triage Response Form:
//     1. Outcome selector (4 large radio cards, color-coded)
//        - BENIGN: green card, icon ✓
//        - MONITOR: yellow card, icon 👁 → show "follow up in X days" field
//        - BOOK_APPOINTMENT: orange card → show "specialist type" field  
//        - URGENT: red card, icon ⚠ → show "urgency note" field
//     2. Response message (textarea, required, min 50 chars)
//        Placeholder: "Based on the photos and your description, this appears to be..."
//     3. Time spent (number input, minutes) — for billing
//     4. Submit button → POST /physician/cases/:id/triage
//
//   - Request Clarification (collapsible) → POST /physician/cases/:id/clarification
//   - Pre-filled Billing Preview:
//     - Province, billing code, service date
//     - Estimated amount
//     - "View in Billing" link
```

### `/billing` — Billing Claims
```typescript
// Table: Date | Patient (age/gender) | Code | Amount | Status | Actions
// Status: PENDING (yellow) / SUBMITTED (blue) / ACCEPTED (green) / REJECTED (red)
// Action: "Edit & Submit" → opens slide-over with pre-filled claim form
// Summary header: Total this month / Pending / Accepted
```

---

## 7. Shared Types Package (`packages/types/src/index.ts`)

```typescript
export type UserRole = 'PATIENT' | 'PHYSICIAN' | 'ADMIN';
export type CaseStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_INFO' | 'COMPLETED' | 'EXPIRED';
export type TriageOutcome = 'BENIGN' | 'MONITOR' | 'BOOK_APPOINTMENT' | 'URGENT';
export type UrgencyFlag = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BillingStatus = 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PAID';
export type Province = 'QC' | 'ON' | 'BC' | 'AB' | 'MB' | 'SK' | 'NS' | 'NB' | 'NL' | 'PE';

export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface PatientDTO {
  id: string;
  userId: string;
  province: Province;
  dateOfBirth?: string;
  existingConditions: string[];
  currentMedications: string[];
  allergies: string[];
  consentAgreedAt?: string;
}

export interface PhysicianDTO {
  id: string;
  userId: string;
  specialty: string;
  province: Province;
  slaHours: number;
  isAcceptingCases: boolean;
}

export interface CaseSummaryDTO {
  id: string;
  status: CaseStatus;
  urgencyFlag: UrgencyFlag;
  bodyLocation: string;
  symptomType: string;
  submittedAt?: string;
  slaDeadline?: string;
  respondedAt?: string;
  triageOutcome?: TriageOutcome;
  photoCount: number;
}

export interface CaseDetailDTO extends CaseSummaryDTO {
  patientAge?: number;           // derived, not DOB
  patientGender?: string;
  bodySystem: string;
  onsetDate?: string;
  durationDays?: number;
  hasChanged?: boolean;
  changeDescription?: string;
  painLevel?: number;
  associatedSymptoms: string[];
  selfTreatment?: string;
  rawDescription: string;
  aiSummary?: string;
  questions: CaseQuestionDTO[];
  photos: CasePhotoDTO[];
  triageResponse?: TriageResponseDTO;
  clarifications: ClarificationDTO[];
  patientConditions: string[];
  patientMedications: string[];
}

export interface CaseQuestionDTO {
  id: string;
  ordinal: number;
  question: string;
}

export interface CasePhotoDTO {
  id: string;
  ordinal: number;
  url?: string;       // presigned, ephemeral
}

export interface TriageResponseDTO {
  id: string;
  outcome: TriageOutcome;
  message: string;
  followupDays?: number;
  specialistType?: string;
  urgencyNote?: string;
  physicianName: string;
  physicianSpecialty: string;
  createdAt: string;
}

export interface BillingClaimDTO {
  id: string;
  caseId: string;
  province: Province;
  billingCode?: string;
  serviceDate: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  amountBilled?: number;
  platformFee?: number;
  status: BillingStatus;
  createdAt: string;
}

export interface ClarificationDTO {
  id: string;
  message: string;
  patientReply?: string;
  repliedAt?: string;
  createdAt: string;
}

// API wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
```

---

## 8. Environment Variables (`.env.template`)

```bash
# ── DATABASE ──
DATABASE_URL=jdbc:postgresql://localhost:5432/contextmd
DB_USER=contextmd
DB_PASS=changeme
DB_NAME=contextmd

# ── JWT ──
JWT_SECRET=generate_64_char_random_hex_here
JWT_EXPIRY_MS=3600000
JWT_REFRESH_EXPIRY_MS=604800000

# ── AWS S3 (ca-central-1 — MANDATORY for PHI compliance) ──
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ca-central-1
S3_BUCKET=contextmd-photos-prod

# ── OPENAI ──
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# ── SENDGRID ──
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@contextmd.ca

# ── STRIPE ──
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── FRONTEND (Next.js public vars) ──
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# ── CORS ──
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://contextmd.ca,https://dashboard.contextmd.ca
```

---

## 9. Docker Compose (Local Development)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: contextmd
      POSTGRES_USER: contextmd
      POSTGRES_PASSWORD: changeme
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./apps/api
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/contextmd
      DB_USER: contextmd
      DB_PASS: changeme
    depends_on:
      - postgres
    volumes:
      - ./apps/api:/app

volumes:
  pgdata:
```

---

## 10. `pom.xml` — Key Dependencies

```xml
<dependencies>
  <!-- Web -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <!-- Security -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
  </dependency>

  <!-- JPA + PostgreSQL -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
  </dependency>

  <!-- Flyway migrations -->
  <dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
  </dependency>

  <!-- Validation -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>

  <!-- AWS S3 -->
  <dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.25.60</version>
  </dependency>

  <!-- Stripe -->
  <dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>25.3.0</version>
  </dependency>

  <!-- OpenAI (unofficial but maintained) -->
  <dependency>
    <groupId>io.github.sashirestela</groupId>
    <artifactId>simple-openai</artifactId>
    <version>3.8.2</version>
  </dependency>

  <!-- SendGrid -->
  <dependency>
    <groupId>com.sendgrid</groupId>
    <artifactId>sendgrid-java</artifactId>
    <version>4.10.2</version>
  </dependency>

  <!-- Lombok -->
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

---

## 11. `package.json` — Patient App

```json
{
  "name": "contextmd-web",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.40.0",
    "zustand": "^4.5.4",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "react-dropzone": "^14.2.3",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-toast": "^1.2.1",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "date-fns": "^3.6.0",
    "axios": "^1.7.2",
    "@stripe/stripe-js": "^4.1.0",
    "@stripe/react-stripe-js": "^2.7.3"
  }
}
```

---

## 12. Build Order for Claude Code

Execute in this exact sequence. Do not skip steps. Each phase builds on the last.

### Phase 1 — Project Scaffold (Do this first)
```
1. Create monorepo root with package.json (workspaces)
2. Create apps/api Spring Boot project (use Spring Initializr structure)
3. Create apps/web Next.js project: npx create-next-app@latest web --typescript --tailwind --app
4. Create apps/dashboard Next.js project: npx create-next-app@latest dashboard --typescript --tailwind --app
5. Create packages/types with the TypeScript interfaces above
6. Add docker-compose.yml
7. Add .env.template
8. Run docker-compose up -d (starts postgres)
```

### Phase 2 — Database + API Foundation
```
1. Write V1__init_schema.sql Flyway migration (full schema above)
2. Write all JPA @Entity classes (User, Patient, Physician, Case, CasePhoto, CaseQuestion, TriageResponse, BillingClaim, Notification, ClarificationRequest)
3. Write all Spring Data JPA Repositories
4. Write SecurityConfig + JwtTokenProvider + JwtAuthFilter
5. Write AuthController + AuthService (register, login, refresh, me)
6. Test: POST /auth/register and POST /auth/login return JWT
7. Write GlobalExceptionHandler
```

### Phase 3 — Core Case Flow
```
1. Write CaseController + CaseService: POST /cases, PATCH /cases/:id, GET /cases, GET /cases/:id
2. Write CaseQuestion endpoints
3. Write S3Service + PhotoController (presign + confirm + get URL)
4. Write POST /cases/:id/submit (status transition, assign physician)
5. Write AiSummaryService (async, OpenAI call with prompt above)
6. Write physician case queue endpoints: GET /physician/cases
7. Write physician case detail: GET /physician/cases/:id
8. Write TriageController: POST /physician/cases/:id/triage
9. Test full flow: submit case → AI summary generated → physician sees it → responds
```

### Phase 4 — Patient Frontend (apps/web)
```
1. Set up Tailwind config + base styles (dark/light mode, CSS variables)
2. Build shared UI components (Badge, Button, Input, Card, Toast)
3. Build auth pages (login, register) with React Hook Form + Zod
4. Build AuthContext / useAuth hook (JWT storage in httpOnly cookie via API route)
5. Build /submit multi-step form with Zustand state
   - StepBodyLocation → StepSymptomDetails → StepPhotos (S3 upload) → StepQuestions → StepReview
6. Build /cases list page with CaseCard components
7. Build /cases/[caseId] detail page with TriageResponseCard
8. Build SLA countdown timer component
```

### Phase 5 — Physician Frontend (apps/dashboard)
```
1. Copy base styles from apps/web
2. Build sidebar layout
3. Build /queue case table with filters + auto-refresh
4. Build /cases/[caseId] two-column layout:
   - Left: CaseBrief (AI summary) + PhotoGallery + PatientQuestions
   - Right: TriageResponseForm (4-state radio + message + time)
5. Build clarification request flow
6. Build /billing claims table with edit slide-over
7. Build billing claim pre-fill from triage response data
```

### Phase 6 — Notifications + Polish
```
1. Write NotificationService (SendGrid email templates for: case submitted, case assigned, triage received, clarification received)
2. Add in-app notification bell with unread count
3. Add urgency auto-flagging on case submission
4. Add SLA warning cron job (notify physician when SLA < 2 hrs remaining)
5. Add Stripe payment flow for private pay cases
6. Add rate limiting (Spring Rate Limiter or Bucket4j)
7. Add request logging (MDC with traceId)
8. Write integration tests for critical paths
```

---

## 13. Critical Constraints (Never Violate)

```
PRIVACY
- All S3 uploads in ca-central-1 (Montréal) — mandatory for PHI under Quebec Law 25
- Photo URLs are always presigned, expire in 15 minutes, served through API proxy
- Health card numbers encrypted at application layer (AES-256) before DB storage
- Minimum viable PII: never store more patient data than needed
- No PHI in application logs (mask patient IDs, never log health card numbers)

SECURITY
- JWT stored in httpOnly cookies (not localStorage) to prevent XSS
- CORS locked to allowed origins only
- Input validation on every endpoint (@Valid annotations)
- SQL injection impossible via JPA (parameterized queries only)
- File upload: validate MIME type server-side (not just extension), reject non-image MIMEs
- S3 objects: private ACL, no public bucket policy, only presigned access

CLINICAL INTEGRITY
- AI prompt must never produce diagnostic conclusions — only summaries
- Triage response is physician-authored and physician's professional responsibility
- Every submitted case must show: "This is a triage service, not a diagnosis"
- Urgent outcome must always include next-step instructions (validate in TriageController)
- Physician must accept a case before they can respond (prevents response without review)

BILLING
- Billing claims are created by the platform but submitted by the physician
- Platform does not bill RAMQ directly — it provides pre-filled claim data only
- Private pay flows through Stripe; RAMQ billing is outside the payment system
```

---

## 14. Email Templates (SendGrid)

Build four transactional email templates:

```
1. case-submitted.html
   Subject: "Your case has been submitted — expect a response within {slaHours} hours"
   Body: Case ID, symptom summary, SLA time, link to /cases/{id}

2. case-assigned.html (to physician)
   Subject: "New case in your queue — {urgencyFlag} urgency"
   Body: Case symptom type, body location, urgency, link to /physician/cases/{id}

3. triage-complete.html (to patient)
   Subject: "Your doctor has reviewed your case"
   Body: Outcome badge (text only), teaser of message, link to /cases/{id}

4. clarification-needed.html (to patient)
   Subject: "Your doctor has a question about your case"
   Body: Physician question, link to /cases/{id} to reply
```

---

## 15. Testing Checklist

Before considering any phase complete, verify:

```
AUTH
[ ] Register as PATIENT returns JWT
[ ] Register as PHYSICIAN returns JWT
[ ] Invalid credentials returns 401
[ ] Expired token returns 401
[ ] Physician cannot access patient-only routes and vice versa

CASE FLOW
[ ] Patient creates case (status: DRAFT)
[ ] Patient adds photos (S3 presign + confirm cycle)
[ ] Patient submits case (status: SUBMITTED, AI summary generated)
[ ] Physician sees case in queue
[ ] Physician opens case (status: UNDER_REVIEW)
[ ] Physician responds with BENIGN outcome
[ ] Case status becomes COMPLETED
[ ] Patient receives notification
[ ] Patient sees triage response in /cases/:id

PHOTOS
[ ] Presign endpoint returns valid S3 URL
[ ] Upload to presigned URL succeeds
[ ] Confirm endpoint creates DB record
[ ] Photo URL endpoint returns presigned GET URL (15 min expiry)
[ ] Cannot access another patient's photos

BILLING
[ ] Billing claim created on triage submission
[ ] Claim pre-filled with correct province + service date
[ ] Physician can update billing code and times
[ ] Mark as SUBMITTED updates status

SECURITY
[ ] Cannot submit someone else's case
[ ] Cannot view another patient's case
[ ] Cannot respond to a case without first claiming it
[ ] Photo URLs expire correctly
[ ] Health card number is encrypted in DB
```
