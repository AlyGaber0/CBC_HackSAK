// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import type { IntakeFormState, TriageAIResult, NihSource } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the AI triage engine for Triaje, an asynchronous medical triage navigation platform serving patients in Quebec who lack access to a family physician.

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

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  // Strip markdown code fences Claude sometimes adds despite instructions
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const parsed = JSON.parse(text) as TriageAIResult;

  // Attach retrieved NIH sources to result
  parsed.nihSources = nihSources;

  return parsed;
}
