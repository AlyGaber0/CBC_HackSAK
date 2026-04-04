import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireProviderAuth } from '@/lib/auth';

const BUCKET = 'case-photos';
const SIGNED_URL_TTL = 3600; // 1 hour

export async function GET(req: NextRequest) {
  const denied = requireProviderAuth(req);
  if (denied) return denied;

  const key = req.nextUrl.searchParams.get('key') ?? '';

  if (!key || key.length > 400) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  // Enforce path prefix — prevents traversal to other storage objects
  if (!key.startsWith('photos/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
