import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '';

export function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api')) return NextResponse.next();

  const origin = req.headers.get('origin') ?? '';
  const allowed =
    !ALLOWED_ORIGIN ||           // not configured → allow all (dev)
    origin === ALLOWED_ORIGIN || // exact match
    origin === '';               // same-origin (no origin header)

  // Reject cross-origin requests from disallowed origins
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-provider-token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN || (origin || '*'));
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-provider-token');
  return res;
}

export const config = { matcher: '/api/:path*' };
