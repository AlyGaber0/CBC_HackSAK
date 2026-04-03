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
