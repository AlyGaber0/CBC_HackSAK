import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ClaimCaseSchema, UuidParam } from '@/lib/validation';
import { requireProviderAuth } from '@/lib/auth';
import { rateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireProviderAuth(req);
  if (denied) return denied;

  if (!rateLimit(`${getIp(req)}:claim`, 20, 60_000)) {
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

  const parsed = ClaimCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 422 });
  }

  const { data: existing } = await supabaseAdmin
    .from('cases')
    .select('claimed_by')
    .eq('id', id)
    .single();

  if (existing?.claimed_by) {
    return NextResponse.json({ error: 'Case already claimed' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('cases')
    .update({ claimed_by: parsed.data.providerId, status: 'in_review', claimed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to claim case' }, { status: 500 });
  return NextResponse.json(data);
}
