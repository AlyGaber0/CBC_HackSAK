-- Run this in the Supabase SQL editor:
-- Dashboard → SQL Editor → New query → paste → Run

-- Speed up provider worklist query (status filter + sort)
CREATE INDEX IF NOT EXISTS idx_cases_status
  ON cases (status);

-- Speed up patient status page polling
CREATE INDEX IF NOT EXISTS idx_cases_patient_id
  ON cases (patient_id);

-- Speed up tier-based sorting on the worklist
CREATE INDEX IF NOT EXISTS idx_cases_tier
  ON cases (tier);

-- Speed up age-based ordering
CREATE INDEX IF NOT EXISTS idx_cases_submitted_at
  ON cases (submitted_at DESC);

-- Compound index for the provider worklist query (status IN (...) ORDER BY submitted_at)
CREATE INDEX IF NOT EXISTS idx_cases_status_submitted
  ON cases (status, submitted_at DESC);

-- Speed up response lookups by case
CREATE INDEX IF NOT EXISTS idx_responses_case_id
  ON responses (case_id);
