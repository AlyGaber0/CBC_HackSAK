import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { UuidParam } from '@/lib/validation';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UuidParam.safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('cases')
    .select('*, responses(*)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH is internal-only (used by triage route server-side via supabaseAdmin directly)
// Keeping it locked down — no public PATCH endpoint
