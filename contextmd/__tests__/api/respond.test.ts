import { POST } from '@/app/api/respond/[id]/route';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const mockFrom = supabaseAdmin.from as jest.Mock;

function makeInsertChain(resolvedValue: unknown) {
  return {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
  };
}

const params = Promise.resolve({ id: 'case-xyz' });

describe('POST /api/respond/[id]', () => {
  it('creates a response row and returns 201', async () => {
    const fakeResponse = { id: 'resp-1', case_id: 'case-xyz', outcome: 'monitor', message: 'Keep monitoring.' };
    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: fakeResponse, error: null })) // responses insert
      .mockReturnValueOnce(makeInsertChain({ error: null }));                    // cases update

    const req = new NextRequest('http://localhost/api/respond/case-xyz', {
      method: 'POST',
      body: JSON.stringify({
        outcome: 'monitor',
        message: 'Keep monitoring.',
        followup_days: 7,
        watch_for: 'Fever above 38°C',
        provider_type: null,
        timeframe: null,
        urgency_note: null,
      }),
    });

    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.outcome).toBe('monitor');
  });

  it('returns 201 with minimal required fields', async () => {
    const fakeResponse = { id: 'resp-2', case_id: 'case-xyz', outcome: 'self_manageable', message: 'Rest and hydrate.' };
    mockFrom
      .mockReturnValueOnce(makeInsertChain({ data: fakeResponse, error: null }))
      .mockReturnValueOnce(makeInsertChain({ error: null }));

    const req = new NextRequest('http://localhost/api/respond/case-xyz', {
      method: 'POST',
      body: JSON.stringify({ outcome: 'self_manageable', message: 'Rest and hydrate.' }),
    });

    const res = await POST(req, { params });
    expect(res.status).toBe(201);
  });

  it('returns 500 when responses insert fails', async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: null, error: { message: 'Insert failed' } }));

    const req = new NextRequest('http://localhost/api/respond/case-xyz', {
      method: 'POST',
      body: JSON.stringify({ outcome: 'urgent', message: 'Go to ER.' }),
    });

    const res = await POST(req, { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Insert failed');
  });
});
