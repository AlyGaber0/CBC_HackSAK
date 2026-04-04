import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendResponseNotification } from '@/lib/email';
import { RespondSchema, UuidParam } from '@/lib/validation';
import { requireProviderAuth } from '@/lib/auth';
import { rateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireProviderAuth(req);
  if (denied) return denied;

  if (!rateLimit(`${getIp(req)}:respond`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { id } = await params;
  if (!UuidParam.safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const d = parsed.data;
  const { data: response, error: responseError } = await supabaseAdmin
    .from('responses')
    .insert({
      case_id:              id,
      outcome:              d.outcome,
      message:              '',
      sbar_situation:       d.sbar_situation,
      sbar_background:      d.sbar_background,
      sbar_assessment:      d.sbar_assessment,
      sbar_recommendation:  d.sbar_recommendation,
      followup_days:        d.followup_days ?? null,
      watch_for:            d.watch_for ?? null,
      provider_type:        d.provider_type ?? null,
      timeframe:            d.timeframe ?? null,
      urgency_note:         d.urgency_note ?? null,
      pharmacy_actions:     d.pharmacy_actions ?? [],
      pharmacy_medications: d.pharmacy_medications ?? null,
      pharmacy_note:        d.pharmacy_note ?? null,
      doctor_question:      d.doctor_question ?? null,
      nih_sources:          [],
    })
    .select()
    .single();

  if (responseError) return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });

  const { data: caseData } = await supabaseAdmin
    .from('cases')
    .update({ status: 'response_ready', responded_at: new Date().toISOString() })
    .eq('id', id)
    .select('patient_email')
    .single();

  if (caseData?.patient_email) {
    sendResponseNotification(caseData.patient_email, id).catch(() => {});
  }

  return NextResponse.json(response, { status: 201 });
}
