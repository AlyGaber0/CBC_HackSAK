// app/api/triage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runTriageAI } from '@/lib/claude';
import { gatherNihContext } from '@/lib/nih';
import type { IntakeFormState, TriageAIResult } from '@/lib/types';

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// HARDCODED DEMO RESULTS - bypasses Claude entirely when demoKey is present
// ---------------------------------------------------------------------------
const DEMO_RESULTS: Record<string, TriageAIResult> = {
  tier0_sunburn: {
    tier: 0,
    navigationAction: 'stay_home',
    brief: {
      chiefComplaint: 'Mild sunburn on shoulders, already improving.',
      timeline: 'Occurred yesterday. Improving since.',
      severity: 'Pain 2/10. No systemic symptoms.',
      redFlags: [],
      medicationFlags: [],
      relevantHistory: 'No medications or allergies reported.',
      patientQuestions: [],
      nihContext: 'NIH/AAD guidelines support home management for minor sunburn.',
    },
    tierReasoning:
      'Pain severity 2/10, symptoms improving, no red flags. NIH/AAD guidelines support home management for minor sunburn.',
    selfCareResponse:
      'Your sunburn sounds mild and is already improving - great sign!\n\n**What to do at home:**\n- Continue applying aloe vera gel or a fragrance-free moisturiser every few hours\n- Stay well-hydrated; sunburn draws fluid to the skin surface\n- Ibuprofen (400 mg every 6-8 h with food) or acetaminophen (500-1000 mg every 6 h) is safe and effective for sunburn discomfort\n- Avoid further sun exposure until fully healed; wear SPF 30+ going forward\n- Cool (not ice-cold) compresses can reduce heat and pain\n\n**Watch for and seek care if:**\n- Blistering develops over a large area\n- Fever above 38.5 C, chills, or nausea\n- Severe pain not controlled by OTC medication\n\nThis is triage navigation guidance, not a medical diagnosis.',
    medicationFlags: [],
    nihSources: [],
  },
  tier1_cold: {
    tier: 1,
    navigationAction: 'call_811',
    brief: {
      chiefComplaint: 'Runny nose, mild congestion, sore throat, fatigue, and headache for 2 days.',
      timeline: '2 days. Stable.',
      severity: 'Pain 2/10. No fever, no dyspnea.',
      redFlags: [],
      medicationFlags: [],
      relevantHistory: 'No medications or allergies reported.',
      patientQuestions: [],
      nihContext: 'Consistent with viral upper respiratory infection.',
    },
    tierReasoning:
      'Low severity (2/10), symptoms stable at 2 days, no red-flag features. Warrants nurse triage via 811 for reassurance and OTC guidance rather than in-person visit.',
    selfCareResponse: null,
    medicationFlags: [],
    nihSources: [],
  },
  tier2_backpain: {
    tier: 2,
    navigationAction: 'walk_in_soon',
    brief: {
      chiefComplaint: 'Severe lower back pain radiating down the left leg after lifting, progressively worsening.',
      timeline: '3 days. Progressive worsening, waking from sleep.',
      severity: 'Pain 8/10. Radicular pattern, sleep disruption.',
      redFlags: ['Progressive worsening', 'Radicular pattern', 'Sleep disruption'],
      medicationFlags: [
        'Lisinopril + Ibuprofen: NSAIDs can reduce antihypertensive effect and increase AKI risk. Consider acetaminophen instead.',
      ],
      relevantHistory: 'On Lisinopril and Ibuprofen. Allergic to Penicillin.',
      patientQuestions: [],
      nihContext: 'Features consistent with disc herniation. Same-day or next-day assessment recommended.',
    },
    tierReasoning:
      'Pain 8/10, radicular pattern, progressive worsening, sleep disruption - features consistent with disc herniation requiring same-day or next-day assessment. Not Tier 3 as no bowel/bladder involvement reported.',
    selfCareResponse: null,
    medicationFlags: [
      {
        flag: 'Lisinopril + Ibuprofen interaction',
        severity: 'moderate',
        detail:
          'NSAIDs (ibuprofen) can antagonise ACE inhibitor antihypertensive effect and elevate AKI risk, especially with dehydration. Consider acetaminophen for pain instead.',
      },
    ],
    nihSources: [],
  },
  tier2_cough_medflags: {
    tier: 2,
    navigationAction: 'walk_in_soon',
    brief: {
      chiefComplaint: 'Persistent dry nocturnal cough for 2 weeks. No phlegm.',
      timeline: '2 weeks. Stable.',
      severity: 'Mild severity. No pain.',
      redFlags: [],
      medicationFlags: [
        'Lisinopril (ACE inhibitor): persistent dry cough affects 10-15% of patients. Likely drug-induced. Consider switching to an ARB.',
      ],
      relevantHistory: 'On Lisinopril 10 mg.',
      patientQuestions: [],
      nihContext: 'ACE inhibitor-induced cough is a well-documented class effect.',
    },
    tierReasoning:
      'Stable symptom, no red flags, but 2-week duration and likely medication side-effect warrants physician review for potential switch to ARB.',
    selfCareResponse: null,
    medicationFlags: [
      {
        flag: 'Lisinopril - ACE inhibitor cough',
        severity: 'moderate',
        detail:
          'Persistent dry cough is a well-documented side effect of ACE inhibitors affecting 10-15% of patients. Consider switching to an ARB (e.g. candesartan) if cough confirmed as drug-induced.',
      },
    ],
    nihSources: [],
  },
  tier3_urgent: {
    tier: 3,
    navigationAction: 'er_now',
    brief: {
      chiefComplaint: 'Rapidly spreading redness, swelling, and red streaks up the right leg from foot.',
      timeline: 'Onset yesterday. Rapidly worsening.',
      severity: 'Pain 9/10. Fever present.',
      redFlags: ['Red streaks (lymphangitis)', 'Fever', 'Rapid progression <24h', 'Diabetic patient'],
      medicationFlags: [],
      relevantHistory: 'Diabetic patient.',
      patientQuestions: [],
      nihContext: 'Red streaks + fever + diabetes = suspected necrotising fasciitis or severe cellulitis. EMERGENCY.',
    },
    tierReasoning:
      'Red streaks (lymphangitis), fever, rapid progression over <24 h in a diabetic patient are hallmarks of a limb-threatening or life-threatening soft-tissue infection. Immediate ED assessment required.',
    selfCareResponse: null,
    medicationFlags: [],
    nihSources: [],
  },
  tier2_pharmacist: {
    tier: 2,
    navigationAction: 'see_pharmacist',
    brief: {
      chiefComplaint: 'Classic UTI symptoms: dysuria, urinary frequency, lower abdominal discomfort for 2 days.',
      timeline: '2 days. Worsening.',
      severity: 'Moderate. No fever, no flank pain.',
      redFlags: [],
      medicationFlags: [],
      relevantHistory: 'No medications or allergies. Prior UTI episodes.',
      patientQuestions: [],
      nihContext: 'Uncomplicated UTI. Quebec pharmacists can prescribe under Bill 31.',
    },
    tierReasoning:
      'Uncomplicated UTI in Quebec: pharmacists can prescribe nitrofurantoin or trimethoprim under Bill 31 (since 2023). No systemic symptoms suggesting pyelonephritis. Tier 2 - pharmacist is the appropriate first contact.',
    selfCareResponse: null,
    medicationFlags: [],
    nihSources: [],
  },
};

function buildFallbackSelfCare(intake: IntakeFormState): string {
  return `Based on the information you've provided, your symptoms appear to be mild and self-manageable at home.

For your ${intake.symptomType.toLowerCase()} affecting your ${intake.bodyLocation.toLowerCase()}, we recommend rest, staying hydrated, and monitoring your symptoms over the next 24-48 hours. Over-the-counter remedies appropriate for your condition may help with discomfort.

Watch for any of the following and seek care if they occur: symptoms that worsen significantly, a fever above 38.5 degrees C, new or spreading symptoms, or anything that feels unusual or alarming to you.

This is triage navigation guidance, not a medical diagnosis. If your symptoms worsen or you have concerns, contact a healthcare provider.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { caseId, intake, demoKey }: { caseId: string; intake: IntakeFormState; demoKey?: string } = body;

  try {
    // ---------------------------------------------------------------------------
    // DEMO SHORTCUT - skip Claude entirely
    // ---------------------------------------------------------------------------
    if (demoKey && DEMO_RESULTS[demoKey]) {
      const result = DEMO_RESULTS[demoKey];
      const isAutoResolved = result.tier === 0;
      const nextStatus = isAutoResolved ? 'response_ready' : 'awaiting_review';
      const selfCareText = isAutoResolved
        ? (result.selfCareResponse ?? buildFallbackSelfCare(intake))
        : null;

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

      if (isAutoResolved && selfCareText) {
        await supabaseAdmin.from('responses').insert({
          case_id: caseId,
          outcome: 'self_manageable',
          message: selfCareText,
          nih_sources: [],
        });
        await supabaseAdmin
          .from('cases')
          .update({ responded_at: new Date().toISOString() })
          .eq('id', caseId);
      }

      return NextResponse.json({ success: true, tier: result.tier, status: nextStatus });
    }

    // ---------------------------------------------------------------------------
    // REAL PATH - Claude + NIH
    // ---------------------------------------------------------------------------
    const medications = Array.isArray(intake.medications)
      ? (intake.medications as string[])
      : (intake.medications as string).split(',').map((s: string) => s.trim()).filter(Boolean);

    const nihPromise = gatherNihContext({
      symptomDescription: intake.symptomDescription,
      symptomType: intake.symptomType,
      medications,
    });
    const nihTimeout = new Promise<{ sources: []; contextText: string }>((resolve) =>
      setTimeout(() => resolve({ sources: [], contextText: '' }), 8000)
    );
    const { sources: nihSources, contextText: nihContextText } = await Promise.race([nihPromise, nihTimeout]);

    const result = await runTriageAI(intake, nihContextText, nihSources);

    const selfCareText =
      result.tier === 0
        ? (result.selfCareResponse ?? buildFallbackSelfCare(intake))
        : null;

    const isAutoResolved = result.tier === 0;
    const nextStatus = isAutoResolved ? 'response_ready' : 'awaiting_review';

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
    console.error('[triage] error:', err);
    const msg = err instanceof Error ? err.message : 'AI processing failed';
    await supabaseAdmin
      .from('cases')
      .update({ status: 'awaiting_review' })
      .eq('id', caseId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
