// lib/triage.ts

// Red flag keywords triggering immediate Tier 4 escalation.
// Checked client-side at intake submission:no AI call made.
const TIER4_PATTERNS = [
  /chest.{0,10}(pain|tight|pressure|heaviness)/i,
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
