-- supabase/migrations/002_features.sql
-- Care navigation, SBAR responses, patient email, photo storage

-- Care navigation action (set by AI at triage time, shown to patient while waiting)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS navigation_action TEXT;
-- Values: stay_home | call_811 | see_pharmacist | walk_in_soon | book_appointment | er_now

-- Patient email for response notifications (collected at intake)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- SBAR structured provider responses
ALTER TABLE responses ADD COLUMN IF NOT EXISTS sbar_situation TEXT;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS sbar_background TEXT;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS sbar_assessment TEXT;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS sbar_recommendation TEXT;

-- Photo storage keys (Supabase Storage object paths)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS photo_storage_keys TEXT[] DEFAULT '{}';
