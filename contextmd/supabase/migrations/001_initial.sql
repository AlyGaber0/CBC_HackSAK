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
