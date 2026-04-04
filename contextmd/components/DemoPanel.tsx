'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IntakeFormState } from '@/lib/types';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const TEST_CASES: Record<string, { label: string; description: string; intake: IntakeFormState }> = {
  tier0_sunburn: {
    label: 'Tier 0:Mild Sunburn (Auto-Response)',
    description: 'Clearly benign, NIH-documented self-care. AI responds instantly:no queue.',
    intake: {
      patientEmail: 'demo@example.com',
      bodyLocation: 'Skin / General',
      bodySubLocation: 'Shoulders',
      symptomType: 'Rash',
      symptomDescription: 'Mild sunburn on shoulders from yesterday, slight redness, no blisters, already improving with aloe vera',
      timelineStart: daysAgo(1),
      timelineChanged: 'better',
      painSeverity: 2,
      associatedSymptoms: [],
      photoCount: 0,
      photoNames: [],
      freeText: 'Applied aloe vera gel. Feeling slightly better.',
      patientQuestions: ['Is ibuprofen safe for sunburn discomfort?', '', ''],
      medicalConditions: '',
      medications: '',
      allergies: '',
    } as IntakeFormState,
  },
  tier1_cold: {
    label: 'Tier 1:Common Cold (Book Appointment)',
    description: 'Low severity, stable, seeking reassurance. Goes to provider queue.',
    intake: {
      patientEmail: 'patient@example.com',
      bodyLocation: 'Head / Neck',
      bodySubLocation: 'Sinuses',
      symptomType: 'Discharge',
      symptomDescription: 'Runny nose, mild congestion, slight sore throat for 2 days',
      timelineStart: daysAgo(2),
      timelineChanged: 'same',
      painSeverity: 2,
      associatedSymptoms: ['Fatigue', 'Headache'],
      photoCount: 0,
      photoNames: [],
      freeText: 'Feels like a regular cold but wanted to check.',
      patientQuestions: ['Should I be worried?', 'Can I take cold medicine?', ''],
      medicalConditions: '',
      medications: '',
      allergies: '',
    } as IntakeFormState,
  },
  tier2_backpain: {
    label: 'Tier 2:Sciatica (Walk-in Soon)',
    description: 'Moderate severity, concerning features. Shows medication flags.',
    intake: {
      patientEmail: 'demo@example.com',
      bodyLocation: 'Back',
      bodySubLocation: 'Lower back',
      symptomType: 'Pain',
      symptomDescription: 'Severe lower back pain radiating down left leg, started 3 days ago after lifting, getting progressively worse',
      timelineStart: daysAgo(3),
      timelineChanged: 'worse',
      painSeverity: 8,
      associatedSymptoms: ['Fatigue', 'Nausea'],
      photoCount: 0,
      photoNames: [],
      freeText: 'Pain wakes me up at night. Hard to walk.',
      patientQuestions: ['Could this be a herniated disc?', 'Should I go to the ER?', 'What pain relief is safe?'],
      medicalConditions: 'Hypertension',
      medications: 'Lisinopril, Ibuprofen',
      allergies: 'Penicillin',
    } as IntakeFormState,
  },
  tier2_cough_medflags: {
    label: 'Tier 2:Persistent Cough (Medication Flag Demo)',
    description: 'Shows ACE inhibitor side effect flag in provider UI.',
    intake: {
      patientEmail: 'test@example.com',
      bodyLocation: 'Chest',
      bodySubLocation: 'Throat',
      symptomType: 'Other',
      symptomDescription: 'Persistent dry cough for 2 weeks, worse at night, no phlegm',
      timelineStart: daysAgo(14),
      timelineChanged: 'same',
      painSeverity: 3,
      associatedSymptoms: [],
      photoCount: 0,
      photoNames: [],
      freeText: 'Started about 2 weeks ago. Not getting better or worse.',
      patientQuestions: ['Is this from my blood pressure medicine?', '', ''],
      medicalConditions: 'Hypertension, Type 2 Diabetes',
      medications: 'Lisinopril 10mg, Metformin 500mg',
      allergies: '',
    } as IntakeFormState,
  },
  tier3_urgent: {
    label: 'Tier 3:Severe Infection (ER Now)',
    description: 'High pain, rapidly worsening, systemic symptoms. Nav: er_now.',
    intake: {
      patientEmail: 'urgent@example.com',
      bodyLocation: 'Legs / Feet',
      bodySubLocation: 'Right foot',
      symptomType: 'Swelling',
      symptomDescription: 'Rapidly spreading redness and swelling on right foot, extremely painful, started yesterday and getting much worse',
      timelineStart: daysAgo(1),
      timelineChanged: 'worse',
      painSeverity: 9,
      associatedSymptoms: ['Fever', 'Nausea', 'Fatigue'],
      photoCount: 0,
      photoNames: [],
      freeText: 'Foot is twice its normal size. Red streaks going up my leg. Feels hot to touch.',
      patientQuestions: ['Do I need antibiotics?', 'Should I go to ER?', ''],
      medicalConditions: 'Diabetes Type 2',
      medications: 'Metformin',
      allergies: '',
    } as IntakeFormState,
  },
  tier2_pharmacist: {
    label: 'Tier 2:UTI Symptoms (See Pharmacist)',
    description: 'Quebec pharmacist prescribing scope demo.',
    intake: {
      patientEmail: 'patient@example.com',
      bodyLocation: 'Abdomen',
      bodySubLocation: 'Lower abdomen',
      symptomType: 'Pain',
      symptomDescription: 'Burning sensation when urinating, frequent urge to pee, lower abdominal discomfort',
      timelineStart: daysAgo(2),
      timelineChanged: 'worse',
      painSeverity: 5,
      associatedSymptoms: [],
      photoCount: 0,
      photoNames: [],
      freeText: 'Classic UTI symptoms. Had these before.',
      patientQuestions: ['Can a pharmacist prescribe antibiotics for this in Quebec?', '', ''],
      medicalConditions: '',
      medications: '',
      allergies: '',
    } as IntakeFormState,
  },
};

function getOrCreatePatientId(): string {
  if (typeof window === 'undefined') return 'demo-patient';
  let id = localStorage.getItem('contextmd_patient_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('contextmd_patient_id', id);
  }
  return id;
}

export default function DemoPanel() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  function resetPanel() {
    setSubmitting(null);
    setStatusMsg('');
    setError(null);
  }

  async function submitTestCase(key: string, intake: IntakeFormState) {
    setSubmitting(key);
    setStatusMsg('Creating case\u2026');
    setError(null);
    try {
      const patientId = getOrCreatePatientId();

      const caseRes = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, ...intake }),
      });
      if (!caseRes.ok) throw new Error(`Case creation failed: ${caseRes.status}`);
      const caseData = await caseRes.json();
      const caseId: string = caseData.id;

      // demoKey tells the triage route to use hardcoded results:no Claude call
      setStatusMsg('Running triage\u2026');

      const triageRes = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, intake, demoKey: key }),
      });
      const triageData = triageRes.ok ? await triageRes.json() : { status: 'awaiting_review' };
      const finalStatus: string = triageData.status ?? 'awaiting_review';

      resetPanel();
      router.push(`/status/${caseId}?status=${finalStatus}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSubmitting(null);
      setStatusMsg('');
    }
  }

  // Collapsed pill button
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          background: '#3b82f6', color: 'white',
          border: 'none', borderRadius: 8, padding: '10px 16px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          zIndex: 10001, display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Demo Panel
      </button>
    );
  }

  // Minimized bar
  if (minimized) {
    return (
      <div style={{
        position: 'fixed', bottom: 20, right: 20,
        background: 'white', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(15,39,68,0.15)',
        zIndex: 10001, fontFamily: 'Inter, sans-serif',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f2744' }}>Demo Panel</span>
        {submitting && (
          <div style={{
            width: 14, height: 14, border: '2px solid #bae6fd',
            borderTopColor: '#0369a1', borderRadius: '50%',
            animation: 'demospin 0.8s linear infinite',
          }} />
        )}
        <button
          onClick={() => setMinimized(false)}
          title="Expand"
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}
        >
          &#9650;
        </button>
        <button
          onClick={() => { setOpen(false); resetPanel(); }}
          title="Close"
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}
        >
          &times;
        </button>
        <style>{`@keyframes demospin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Full panel
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      background: 'white', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '20px 22px',
      boxShadow: '0 8px 24px rgba(15,39,68,0.2)',
      maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
      zIndex: 10001, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f2744' }}>Quick Demo Cases</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setMinimized(true)}
            title="Minimize"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}
          >
            &#8212;
          </button>
          <button
            onClick={() => { setOpen(false); resetPanel(); }}
            title="Close"
            style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      </div>

      {submitting && (
        <div style={{
          background: '#f0f9ff', border: '1px solid #bae6fd',
          borderRadius: 8, padding: '12px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 16, height: 16, border: '2.5px solid #bae6fd',
            borderTopColor: '#0369a1', borderRadius: '50%',
            animation: 'demospin 0.8s linear infinite', flexShrink: 0,
          }} />
          <span style={{ fontSize: 12.5, color: '#0369a1', fontWeight: 600 }}>{statusMsg}</span>
          <style>{`@keyframes demospin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fff1f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: '12px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 12.5, color: '#991b1b', flex: 1, lineHeight: 1.5 }}>
            <strong>Error:</strong> {error}
          </span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      )}

      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>
        Submit pre-filled test cases to demo all features. Tier 0 resolves instantly; Tier 1\u20133 goes to the provider queue.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(TEST_CASES).map(([key, testCase]) => (
          <div key={key} style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '14px 16px',
            opacity: submitting && submitting !== key ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#0f2744' }}>
                  {testCase.label}
                </p>
                <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.5 }}>
                  {testCase.description}
                </p>
              </div>
              <button
                onClick={() => submitTestCase(key, testCase.intake)}
                disabled={!!submitting}
                style={{
                  background: submitting === key ? '#3b82f6' : !!submitting ? '#cbd5e1' : '#0f2744',
                  color: 'white', border: 'none', borderRadius: 6,
                  padding: '7px 12px', fontSize: 11.5, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap', fontFamily: 'inherit',
                  transition: 'background 0.2s',
                }}
              >
                {submitting === key ? 'Running\u2026' : 'Submit'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          <strong>Tip:</strong> Open <code>/worklist</code> in another tab to see the provider view.
        </p>
      </div>
    </div>
  );
}
