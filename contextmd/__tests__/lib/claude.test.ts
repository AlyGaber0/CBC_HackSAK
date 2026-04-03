import { runTriageAI } from '@/lib/claude';
import Anthropic from '@anthropic-ai/sdk';
import type { IntakeFormState } from '@/lib/types';

// The factory runs at hoist time, so we can't close over external variables.
// We expose the mock fn through the class itself.
jest.mock('@anthropic-ai/sdk', () => {
  const createFn = jest.fn();
  class MockAnthropic {
    messages = { create: createFn };
    static __mockCreate = createFn;
  }
  return { __esModule: true, default: MockAnthropic };
});

// Access the shared mock fn via the static property
const mockCreate = (Anthropic as unknown as { __mockCreate: jest.Mock }).__mockCreate;

beforeEach(() => mockCreate.mockReset());

const baseIntake: IntakeFormState = {
  bodyLocation: 'Skin (general)', bodySubLocation: 'Skin — arm',
  symptomType: 'Rash / skin change', symptomDescription: 'Dark mole, border uneven',
  timelineStart: '2026-03-01', timelineChanged: 'worse',
  painSeverity: 3, associatedSymptoms: [],
  photoCount: 1, photoNames: ['mole.jpg'],
  freeText: 'Mole has changed', patientQuestions: ['Should I see a dermatologist?', '', ''],
  medicalConditions: '', medications: '', allergies: '',
};

const validTier2Response = JSON.stringify({
  brief: {
    chiefComplaint: 'Changing mole on left arm',
    timeline: 'Noticed 1 month ago, worsening',
    severity: 'Pain 3/10, no systemic symptoms',
    redFlags: ['Asymmetric border'],
    medicationFlags: [],
    relevantHistory: 'No significant history',
    patientQuestions: ['Should I see a dermatologist?'],
    nihContext: 'MedlinePlus recommends dermatology referral for ABCDE changes',
  },
  tier: 2,
  tierReasoning: 'Tier 2 — changing lesion with asymmetry, no acute red flags',
  selfCareResponse: null,
  nihSources: [],
});

describe('runTriageAI', () => {
  it('returns parsed TriageAIResult on valid Claude response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: validTier2Response }],
    });
    const result = await runTriageAI(baseIntake, 'NIH context here', []);
    expect(result.tier).toBe(2);
    expect(result.brief.chiefComplaint).toBe('Changing mole on left arm');
    expect(result.selfCareResponse).toBeNull();
  });

  it('attaches provided NIH sources to result', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: validTier2Response }],
    });
    const sources = [{ source: 'medlineplus' as const, title: 'Moles', url: 'https://example.com', excerpt: 'info' }];
    const result = await runTriageAI(baseIntake, '', sources);
    expect(result.nihSources).toEqual(sources);
  });

  it('throws if Claude returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not valid json' }],
    });
    await expect(runTriageAI(baseIntake, '', [])).rejects.toThrow();
  });

  it('includes patient questions in the user message sent to Claude', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: validTier2Response }],
    });
    await runTriageAI(baseIntake, '', []);
    const callArgs = mockCreate.mock.calls[0][0];
    const userMsg = callArgs.messages[0].content;
    expect(userMsg).toContain('Should I see a dermatologist?');
  });
});
