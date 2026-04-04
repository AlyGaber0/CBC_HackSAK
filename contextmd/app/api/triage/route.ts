// app/api/triage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runTriageAI } from '@/lib/claude';
import { gatherNihContext } from '@/lib/nih';
import type { IntakeFormState } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { caseId, intake }: { caseId: string; intake: IntakeFormState } = await req.json();

  try {
    // 1. Gather NIH context in parallel
    const medications = intake.medications.split(',').map(s => s.trim()).filter(Boolean);
    const { sources: nihSources, contextText: nihContextText } = await gatherNihContext({
      symptomDescription: intake.symptomDescription,
      symptomType: intake.symptomType,
      medications,
    });

    // 2. Run Claude triage
    const result = await runTriageAI(intake, nihContextText, nihSources);

    // 3. Determine next status
    const isAutoResolved = result.tier === 0 && result.selfCareResponse;
    const nextStatus = isAutoResolved ? 'response_ready' : 'awaiting_review';

    // 4. Update case with AI results
    await supabaseAdmin
      .from('cases')
      .update({
        tier: result.tier,
        ai_brief: result.brief,
        ai_tier_reasoning: result.tierReasoning,
        status: nextStatus,
      })
      .eq('id', caseId);

    // 5. For Tier 0: auto-create response from Claude's self-care text
    if (isAutoResolved && result.selfCareResponse) {
      await supabaseAdmin.from('responses').insert({
        case_id: caseId,
        outcome: 'self_manageable',
        message: result.selfCareResponse,
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
