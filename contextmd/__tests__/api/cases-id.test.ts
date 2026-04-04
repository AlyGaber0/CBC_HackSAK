import { GET, PATCH } from '@/app/api/cases/[id]/route';
import { POST as CLAIM } from '@/app/api/cases/[id]/claim/route';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const mockFrom = supabaseAdmin.from as jest.Mock;

function mockChain(resolvedValue: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

const params = Promise.resolve({ id: 'case-abc' });

// ── GET /api/cases/[id] ────────────────────────────────────────────

describe('GET /api/cases/[id]', () => {
  it('returns 200 with case data when found', async () => {
    const fakeCase = { id: 'case-abc', status: 'awaiting_review', responses: [] };
    mockFrom.mockReturnValue(mockChain({ data: fakeCase, error: null }));

    const req = new NextRequest('http://localhost/api/cases/case-abc');
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('case-abc');
  });

  it('returns 404 when case not found', async () => {
    mockFrom.mockReturnValue(mockChain({ data: null, error: { message: 'Row not found' } }));

    const req = new NextRequest('http://localhost/api/cases/case-abc');
    const res = await GET(req, { params });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Row not found');
  });
});

// ── PATCH /api/cases/[id] ──────────────────────────────────────────

describe('PATCH /api/cases/[id]', () => {
  it('returns updated case on success', async () => {
    const updated = { id: 'case-abc', status: 'in_review' };
    mockFrom.mockReturnValue(mockChain({ data: updated, error: null }));

    const req = new NextRequest('http://localhost/api/cases/case-abc', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_review' }),
    });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_review');
  });

  it('returns 500 on Supabase error', async () => {
    mockFrom.mockReturnValue(mockChain({ data: null, error: { message: 'Update failed' } }));

    const req = new NextRequest('http://localhost/api/cases/case-abc', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_review' }),
    });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(500);
  });
});

// ── POST /api/cases/[id]/claim ─────────────────────────────────────

describe('POST /api/cases/[id]/claim', () => {
  it('claims an unclaimed case and returns 200', async () => {
    const claimedCase = { id: 'case-abc', status: 'in_review', claimed_by: 'provider-1' };
    // First call: check existing (not claimed)
    // Second call: update
    mockFrom
      .mockReturnValueOnce(mockChain({ data: { claimed_by: null }, error: null }))
      .mockReturnValueOnce(mockChain({ data: claimedCase, error: null }));

    const req = new NextRequest('http://localhost/api/cases/case-abc/claim', {
      method: 'POST',
      body: JSON.stringify({ providerId: 'provider-1' }),
    });
    const res = await CLAIM(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.claimed_by).toBe('provider-1');
  });

  it('returns 409 when case is already claimed', async () => {
    mockFrom.mockReturnValue(mockChain({ data: { claimed_by: 'other-provider' }, error: null }));

    const req = new NextRequest('http://localhost/api/cases/case-abc/claim', {
      method: 'POST',
      body: JSON.stringify({ providerId: 'provider-1' }),
    });
    const res = await CLAIM(req, { params });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Case already claimed');
  });

  it('returns 500 when update fails', async () => {
    mockFrom
      .mockReturnValueOnce(mockChain({ data: { claimed_by: null }, error: null }))
      .mockReturnValueOnce(mockChain({ data: null, error: { message: 'DB error' } }));

    const req = new NextRequest('http://localhost/api/cases/case-abc/claim', {
      method: 'POST',
      body: JSON.stringify({ providerId: 'provider-1' }),
    });
    const res = await CLAIM(req, { params });

    expect(res.status).toBe(500);
  });
});
