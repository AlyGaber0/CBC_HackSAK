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
      message: body.message,
      followup_days: body.followup_days ?? null,
      watch_for: body.watch_for ?? null,
      provider_type: body.provider_type ?? null,
      timeframe: body.timeframe ?? null,
      urgency_note: body.urgency_note ?? null,
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
