import { z } from 'zod';

const uuid = z.string().uuid('Invalid ID format');
const shortText = (max = 200) => z.string().max(max).trim();
const longText = (max = 5000) => z.string().max(max).trim();

export const UuidParam = uuid;

export const CreateCaseSchema = z.object({
  patientId:          uuid,
  patientEmail:       z.string().email().max(254).nullable().optional(),
  bodyLocation:       shortText(100),
  bodySubLocation:    shortText(200).optional().default(''),
  symptomType:        shortText(100),
  symptomDescription: longText(2000),
  timelineStart:      shortText(50).optional().default(''),
  timelineChanged:    z.enum(['better', 'worse', 'same', '']).optional().default(''),
  painSeverity:       z.number().int().min(0).max(10),
  associatedSymptoms: z.array(shortText(100)).max(20).default([]),
  freeText:           longText(3000).optional().default(''),
  patientQuestions:   z.array(longText(500)).max(5).default([]),
  medicalConditions:  longText(1000).optional().default(''),
  medications:        longText(1000).optional().default(''),
  allergies:          longText(500).optional().default(''),
  photoCount:         z.number().int().min(0).max(10).default(0),
  photoNames:         z.array(shortText(200)).max(10).default([]),
  photoStorageKeys:   z.array(shortText(400)).max(10).default([]),
});

export const ClaimCaseSchema = z.object({
  providerId: shortText(100).min(1),
});

export const RespondSchema = z.object({
  outcome:              z.enum(['self_manageable', 'monitor', 'book_appointment', 'urgent', 'pharmacy_guidance']),
  sbar_situation:       longText(5000).min(1, 'Situation is required'),
  sbar_background:      longText(5000).min(1, 'Background is required'),
  sbar_assessment:      longText(5000).min(1, 'Assessment is required'),
  sbar_recommendation:  longText(5000).min(1, 'Recommendation is required'),
  followup_days:        z.number().int().min(1).max(365).nullable().optional(),
  watch_for:            longText(2000).nullable().optional(),
  provider_type:        shortText(200).nullable().optional(),
  timeframe:            shortText(200).nullable().optional(),
  urgency_note:         longText(2000).nullable().optional(),
  pharmacy_actions:     z.array(shortText(100)).max(10).optional().default([]),
  pharmacy_medications: longText(2000).nullable().optional(),
  pharmacy_note:        longText(2000).nullable().optional(),
  doctor_question:      longText(1000).nullable().optional(),
});

const IntakeSchema = z.object({
  patientEmail:       z.string().optional().default(''),
  bodyLocation:       shortText(100),
  bodySubLocation:    shortText(200).optional().default(''),
  symptomType:        shortText(100),
  symptomDescription: longText(2000),
  timelineStart:      shortText(50).optional().default(''),
  timelineChanged:    z.enum(['better', 'worse', 'same', '']).optional().default(''),
  painSeverity:       z.number().int().min(0).max(10),
  associatedSymptoms: z.array(shortText(100)).max(20).default([]),
  freeText:           longText(3000).optional().default(''),
  patientQuestions:   z.tuple([longText(500), longText(500), longText(500)]).default(['', '', '']),
  medicalConditions:  longText(1000).optional().default(''),
  medications:        longText(1000).optional().default(''),
  allergies:          longText(500).optional().default(''),
  photoCount:         z.number().int().min(0).max(10).default(0),
  photoNames:         z.array(shortText(200)).max(10).default([]),
  photoStorageKeys:   z.array(shortText(400)).max(10).default([]),
});

export const TriageSchema = z.object({
  caseId:  uuid,
  demoKey: shortText(100).optional(),
  intake:  IntakeSchema,
});

export const TranslateSchema = z.object({
  fields:     z.record(z.string(), z.string().max(10000)),
  targetLang: z.enum(['en', 'fr']),
});
