import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, getIp } from '@/lib/rateLimit';

export const maxDuration = 30;

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif', 'image/heic', 'image/heif',
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'case-photos';

export async function POST(req: NextRequest) {
  if (!rateLimit(`${getIp(req)}:upload`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only image files are allowed (JPEG, PNG, WebP, GIF, HEIC)' }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB per photo)' }, { status: 413 });
  }

  // Sanitise filename — strip to alphanumeric + dot + hyphen
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200);
  const ext = safeName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const key = `photos/${crypto.randomUUID()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({ key, name: safeName }, { status: 201 });
}
