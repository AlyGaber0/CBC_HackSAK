import { checkTier4, checkAnyTier4 } from '@/lib/triage';

describe('checkTier4 — must catch all emergency keywords', () => {
  const SHOULD_TRIGGER = [
    'I have chest pain',
    'chest tightness for an hour',
    'difficulty breathing since yesterday',
    "I can't breathe properly",
    'I cannot breathe well',
    'loss of consciousness earlier',
    'I passed out this morning',
    'I think I am having a stroke',
    'my face is drooping',
    'sudden arm weakness on left side',
    'severe allergic reaction to peanuts',
    'anaphylaxis symptoms',
    'uncontrolled bleeding from wound',
    'having a seizure',
    'possible overdose of medication',
    'suicidal thoughts',
    'I think I am having a heart attack',
  ];

  SHOULD_TRIGGER.forEach(text => {
    it(`triggers on: "${text}"`, () => {
      expect(checkTier4(text)).toBe(true);
    });
  });

  const SHOULD_NOT_TRIGGER = [
    'mild rash on my arm',
    'headache for two days',
    'sore throat and runny nose',
    'knee pain when walking',
    'stomach ache after eating',
    'mole that changed colour',
    'fatigue for a week',
  ];

  SHOULD_NOT_TRIGGER.forEach(text => {
    it(`does not trigger on: "${text}"`, () => {
      expect(checkTier4(text)).toBe(false);
    });
  });
});

describe('checkAnyTier4', () => {
  it('returns true if any field contains a red flag', () => {
    expect(checkAnyTier4(['mild headache', 'chest pain radiating to arm', ''])).toBe(true);
  });

  it('returns false if no field contains a red flag', () => {
    expect(checkAnyTier4(['mild headache', 'sore throat', 'fatigue'])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(checkAnyTier4([])).toBe(false);
  });

  it('returns false for array of empty strings', () => {
    expect(checkAnyTier4(['', '', ''])).toBe(false);
  });
});
