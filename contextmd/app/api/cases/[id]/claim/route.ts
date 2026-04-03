// app/api/cases/[id]/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { providerId } = await req.json();

  // Check not already claimed
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
    .update({ claimed_by: providerId, status: 'in_review', claimed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
