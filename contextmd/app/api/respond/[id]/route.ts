// app/api/respond/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const { data: response, error: responseError } = await supabaseAdmin
    .from('responses')
    .insert({
      case_id: id,
      outcome: body.outcome,
      message: '', // Deprecated — replaced by SBAR fields but kept for schema compatibility
      sbar_situation: body.sbar_situation ?? null,
      sbar_background: body.sbar_background ?? null,
      sbar_assessment: body.sbar_assessment ?? null,
      sbar_recommendation: body.sbar_recommendation ?? null,
      followup_days: body.followup_days ?? null,
      watch_for: body.watch_for ?? null,
      provider_type: body.provider_type ?? null,
      timeframe: body.timeframe ?? null,
      urgency_note: body.urgency_note ?? null,
      pharmacy_actions: body.pharmacy_actions ?? [],
      pharmacy_medications: body.pharmacy_medications ?? null,
      pharmacy_note: body.pharmacy_note ?? null,
      doctor_question: body.doctor_question ?? null,
      nih_sources: [],
    })
    .select()
    .single();

  if (responseError) return NextResponse.json({ error: responseError.message }, { status: 500 });

  await supabaseAdmin
    .from('cases')
    .update({ status: 'response_ready', responded_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json(response, { status: 201 });
}
