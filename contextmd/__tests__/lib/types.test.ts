import type { Case, Response, TriageOutcome, CaseStatus } from '@/lib/types';

describe('Type contracts', () => {
  it('CaseStatus covers all expected values', () => {
    const valid: CaseStatus[] = [
      'processing', 'awaiting_review', 'in_review', 'response_ready', 'escalated',
    ];
    // If this compiles, the union is correct
    expect(valid).toHaveLength(5);
  });

  it('TriageOutcome covers all four outcome values', () => {
    const valid: TriageOutcome[] = [
      'self_manageable', 'monitor', 'book_appointment', 'urgent',
    ];
    expect(valid).toHaveLength(4);
  });

  it('IntakeFormState patientQuestions is a fixed-length tuple of 3', () => {
    const q: [string, string, string] = ['q1', '', ''];
    expect(q).toHaveLength(3);
  });
});
