// app/api/triage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runTriageAI } from '@/lib/claude';
import { gatherNihContext } from '@/lib/nih';
import type { IntakeFormState } from '@/lib/types';

function buildFallbackSelfCare(intake: IntakeFormState): string {
  return `Based on the information you've provided, your symptoms appear to be mild and self-manageable at home.

For your ${intake.symptomType.toLowerCase()} affecting your ${intake.bodyLocation.toLowerCase()}, we recommend rest, staying hydrated, and monitoring your symptoms over the next 24–48 hours. Over-the-counter remedies appropriate for your condition may help with discomfort.

Watch for any of the following and seek care if they occur: symptoms that worsen significantly, a fever above 38.5°C, new or spreading symptoms, or anything that feels unusual or alarming to you.

This is triage navigation guidance, not a medical diagnosis. If your symptoms worsen or you have concerns, contact a healthcare provider.`;
}

export async function POST(req: NextRequest) {
  const { caseId, intake }: { caseId: string; intake: IntakeFormState } = await req.json();

  try {
    // 1. Gather NIH context
    const medications = intake.medications.split(',').map(s => s.trim()).filter(Boolean);
    const { sources: nihSources, contextText: nihContextText } = await gatherNihContext({
      symptomDescription: intake.symptomDescription,
      symptomType: intake.symptomType,
      medications,
    });

    // 2. Run Claude triage
    const result = await runTriageAI(intake, nihContextText, nihSources);

    // 3. Tier 0: use Claude's selfCareResponse or fall back to a generated one
    //    Haiku sometimes returns null for selfCareResponse even on tier 0 — never
    //    send a tier 0 case to the provider queue.
    const selfCareText =
      result.tier === 0
        ? (result.selfCareResponse ?? buildFallbackSelfCare(intake))
        : null;

    const isAutoResolved = result.tier === 0;
    const nextStatus = isAutoResolved ? 'response_ready' : 'awaiting_review';

    // 4. Update case with AI results
    await supabaseAdmin
      .from('cases')
      .update({
        tier: result.tier,
        ai_brief: result.brief,
        ai_tier_reasoning: result.tierReasoning,
        navigation_action: result.navigationAction,
        status: nextStatus,
      })
      .eq('id', caseId);

    // 5. For Tier 0: auto-create response
    if (isAutoResolved && selfCareText) {
      await supabaseAdmin.from('responses').insert({
        case_id: caseId,
        outcome: 'self_manageable',
        message: selfCareText,
        nih_sources: nihSources,
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
