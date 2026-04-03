import { act, renderHook } from '@testing-library/react';
import { useIntakeStore } from '@/lib/store';

// Stub localStorage for jsdom
beforeEach(() => {
  localStorage.clear();
  // Reset store between tests
  useIntakeStore.getState().reset();
});

describe('useIntakeStore', () => {
  it('initialises with empty string values', () => {
    const { result } = renderHook(() => useIntakeStore());
    expect(result.current.bodyLocation).toBe('');
    expect(result.current.painSeverity).toBe(0);
    expect(result.current.patientQuestions).toEqual(['', '', '']);
    expect(result.current.currentStep).toBe(0);
  });

  it('update() merges partial state', () => {
    const { result } = renderHook(() => useIntakeStore());
    act(() => result.current.update({ bodyLocation: 'Chest', painSeverity: 6 }));
    expect(result.current.bodyLocation).toBe('Chest');
    expect(result.current.painSeverity).toBe(6);
    expect(result.current.bodySubLocation).toBe(''); // unchanged
  });

  it('setStep() advances and retreats correctly', () => {
    const { result } = renderHook(() => useIntakeStore());
    act(() => result.current.setStep(3));
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.setStep(1));
    expect(result.current.currentStep).toBe(1);
  });

  it('reset() clears all fields and returns to step 0', () => {
    const { result } = renderHook(() => useIntakeStore());
    act(() => {
      result.current.update({ bodyLocation: 'Head', freeText: 'headache' });
      result.current.setStep(5);
    });
    act(() => result.current.reset());
    expect(result.current.bodyLocation).toBe('');
    expect(result.current.freeText).toBe('');
    expect(result.current.currentStep).toBe(0);
  });
});
