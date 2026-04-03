import { GET, POST } from '@/app/api/cases/route';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const mockFrom = supabaseAdmin.from as jest.Mock;

function mockChain(resolvedValue: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
  };
  // make the chain itself awaitable for non-.single() calls
  Object.assign(chain, { then: (resolve: (v: unknown) => void) => resolve(resolvedValue) });
  return chain;
}

describe('GET /api/cases', () => {
  it('filters by patient_id when provided', async () => {
    const chain = mockChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    const req = new NextRequest('http://localhost/api/cases?patient_id=patient-123');
    await GET(req);
    expect(chain.eq).toHaveBeenCalledWith('patient_id', 'patient-123');
  });

  it('filters to awaiting_review|in_review when provider=true', async () => {
    const chain = mockChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    const req = new NextRequest('http://localhost/api/cases?provider=true');
    await GET(req);
    expect(chain.in).toHaveBeenCalledWith('status', ['awaiting_review', 'in_review']);
  });
});

describe('POST /api/cases', () => {
  it('returns 201 with created case on success', async () => {
    const fakeCase = { id: 'case-uuid', status: 'processing' };
    const chain = mockChain({ data: fakeCase, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest('http://localhost/api/cases', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-abc',
        bodyLocation: 'Chest', bodySubLocation: 'Chest (front)',
        symptomType: 'Pain', symptomDescription: 'mild',
        timelineStart: '2026-04-01', timelineChanged: 'same',
        painSeverity: 2, associatedSymptoms: [],
        freeText: 'just checking', patientQuestions: ['Is this ok?', '', ''],
        medicalConditions: '', medications: '', allergies: '',
        photoCount: 0, photoNames: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('case-uuid');
  });

  it('returns 500 when Supabase insert fails', async () => {
    const chain = mockChain({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest('http://localhost/api/cases', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'p', bodyLocation: '', bodySubLocation: '', symptomType: '',
        symptomDescription: '', timelineStart: '', timelineChanged: '', painSeverity: 0,
        associatedSymptoms: [], freeText: '', patientQuestions: ['', '', ''],
        medicalConditions: '', medications: '', allergies: '', photoCount: 0, photoNames: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
