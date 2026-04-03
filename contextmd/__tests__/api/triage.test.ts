import { POST } from '@/app/api/triage/route';
import { supabaseAdmin } from '@/lib/supabase';
import { runTriageAI } from '@/lib/claude';
import { gatherNihContext } from '@/lib/nih';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/lib/claude');
jest.mock('@/lib/nih');

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockRunTriageAI = runTriageAI as jest.Mock;
const mockGatherNih = gatherNihContext as jest.Mock;

function makeUpdateChain() {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
  };
}

const baseBody = {
  caseId: 'case-123',
  intake: {
    bodyLocation: 'Skin (general)', bodySubLocation: 'Skin — arm',
    symptomType: 'Rash / skin change', symptomDescription: 'mole change',
    timelineStart: '', timelineChanged: '', painSeverity: 2,
    associatedSymptoms: [], photoCount: 0, photoNames: [],
    freeText: 'mole changed', patientQuestions: ['dermatologist?', '', ''],
    medicalConditions: '', medications: 'metformin', allergies: '',
  },
};

beforeEach(() => {
  mockGatherNih.mockResolvedValue({ sources: [], contextText: '' });
  mockFrom.mockReturnValue(makeUpdateChain());
});

describe('POST /api/triage', () => {
  it('sets status to awaiting_review for tier 2', async () => {
    mockRunTriageAI.mockResolvedValueOnce({
      brief: { chiefComplaint: 'mole', timeline: '', severity: '', redFlags: [], medicationFlags: [], relevantHistory: '', patientQuestions: [], nihContext: '' },
      tier: 2, tierReasoning: 'Tier 2', selfCareResponse: null, nihSources: [],
    });
    const chain = makeUpdateChain();
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest('http://localhost/api/triage', {
      method: 'POST', body: JSON.stringify(baseBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('awaiting_review');
    expect(body.tier).toBe(2);
  });

  it('auto-creates response and sets status to response_ready for tier 0', async () => {
    mockRunTriageAI.mockResolvedValueOnce({
      brief: { chiefComplaint: 'mild sunburn', timeline: '', severity: '', redFlags: [], medicationFlags: [], relevantHistory: '', patientQuestions: [], nihContext: '' },
      tier: 0, tierReasoning: 'Tier 0 — benign', selfCareResponse: 'Apply cool water and aloe vera.', nihSources: [],
    });
    const chain = makeUpdateChain();
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest('http://localhost/api/triage', {
      method: 'POST', body: JSON.stringify(baseBody),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.status).toBe('response_ready');
    expect(chain.insert).toHaveBeenCalled();
  });

  it('falls back to awaiting_review and returns 500 if Claude throws', async () => {
    mockRunTriageAI.mockRejectedValueOnce(new Error('API rate limit'));
    const chain = makeUpdateChain();
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest('http://localhost/api/triage', {
      method: 'POST', body: JSON.stringify(baseBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(chain.update).toHaveBeenCalled();
  });
});
