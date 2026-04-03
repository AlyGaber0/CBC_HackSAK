// lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntakeFormState } from './types';

interface IntakeStore extends IntakeFormState {
  currentStep: number;
  setStep: (step: number) => void;
  update: (patch: Partial<IntakeFormState>) => void;
  reset: () => void;
}

const initialState: IntakeFormState = {
  bodyLocation: '',
  bodySubLocation: '',
  symptomType: '',
  symptomDescription: '',
  timelineStart: '',
  timelineChanged: '',
  painSeverity: 0,
  associatedSymptoms: [],
  photoCount: 0,
  photoNames: [],
  freeText: '',
  patientQuestions: ['', '', ''],
  medicalConditions: '',
  medications: '',
  allergies: '',
};

export const useIntakeStore = create<IntakeStore>()(
  persist(
    (set) => ({
      ...initialState,
      currentStep: 0,
      setStep: (step) => set({ currentStep: step }),
      update: (patch) => set((state) => ({ ...state, ...patch })),
      reset: () => set({ ...initialState, currentStep: 0 }),
    }),
    { name: 'triaje-intake' }
  )
);
