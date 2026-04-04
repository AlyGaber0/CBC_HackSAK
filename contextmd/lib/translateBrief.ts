import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase';

const client = new Anthropic();

interface BriefFields {
  tierReasoning: string;
  chiefComplaint: string;
  timeline: string;
  severity: string;
  redFlags: string[];
  medicationFlags: string[];
  relevantHistory: string;
  nihContext: string;
  freeText: string;
  patientQuestions: string[];
}

/**
 * Translates all text fields of a case brief into French and patches ai_brief.fr
 * in the DB. Designed to be called fire-and-forget from the triage route.
 */
export async function translateBriefToFrench(caseId: string, fields: BriefFields): Promise<void> {
  const flat: Record<string, string> = {
    tierReasoning:    fields.tierReasoning,
    chiefComplaint:   fields.chiefComplaint,
    timeline:         fields.timeline,
    severity:         fields.severity,
    redFlags:         fields.redFlags.join(' | '),
    medicationFlags:  fields.medicationFlags.join(' | '),
    relevantHistory:  fields.relevantHistory,
    nihContext:       fields.nihContext,
    freeText:         fields.freeText,
    patientQuestions: fields.patientQuestions.join(' || '),
  };

  const entries = Object.entries(flat).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return;

  const numbered = entries.map(([k, v], i) => `[${i + 1}] KEY:${k}\n${v}`).join('\n\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Translate each numbered block below into French (Canadian). Keep medical terminology accurate. Return ONLY the translations in the exact same numbered format: [N] KEY:keyname followed by the translated text. No explanations.\n\n${numbered}`,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text;
  const result: Record<string, string> = {};

  for (const block of raw.split(/\n(?=\[\d+\])/)) {
    const m = block.match(/^\[(\d+)\]\s*KEY:(\S+)\n([\s\S]+)$/);
    if (m) {
      const idx = parseInt(m[1]) - 1;
      const key = m[2];
      if (idx >= 0 && idx < entries.length && entries[idx][0] === key) {
        result[key] = m[3].trim();
      }
    }
  }

  const fr = {
    tierReasoning:    result.tierReasoning    ?? fields.tierReasoning,
    chiefComplaint:   result.chiefComplaint   ?? fields.chiefComplaint,
    timeline:         result.timeline         ?? fields.timeline,
    severity:         result.severity         ?? fields.severity,
    redFlags:         result.redFlags         ? result.redFlags.split('|').map(s => s.trim()).filter(Boolean) : fields.redFlags,
    medicationFlags:  result.medicationFlags  ? result.medicationFlags.split('|').map(s => s.trim()).filter(Boolean) : fields.medicationFlags,
    relevantHistory:  result.relevantHistory  ?? fields.relevantHistory,
    nihContext:       result.nihContext        ?? fields.nihContext,
    freeText:         result.freeText         ?? fields.freeText,
    patientQuestions: result.patientQuestions ? result.patientQuestions.split('||').map(s => s.trim()).filter(Boolean) : fields.patientQuestions,
  };

  const { data } = await supabaseAdmin.from('cases').select('ai_brief').eq('id', caseId).single();
  if (data?.ai_brief) {
    await supabaseAdmin.from('cases').update({ ai_brief: { ...data.ai_brief, fr } }).eq('id', caseId);
  }
}
