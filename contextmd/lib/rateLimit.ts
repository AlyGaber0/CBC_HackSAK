/** In-memory rate limiter — persists within a server instance, sufficient for demo/hackathon */
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed, false if it should be blocked.
 * @param key   Unique key — typically `${ip}:${endpoint}`
 * @param limit Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
