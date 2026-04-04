import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks provider auth on write/provider-only API routes.
 * If PROVIDER_SECRET is not set, auth is skipped (dev mode).
 * Returns a 401 NextResponse if unauthorized, null if OK.
 */
export function requireProviderAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.PROVIDER_SECRET;
  if (!secret) return null; // dev mode — no secret configured

  const token = req.headers.get('x-provider-token');
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
