'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIntakeStore } from '@/lib/store';
import { checkAnyTier4 } from '@/lib/triage';

const STEP_NAMES = [
  'Contact Info',
  'Body Location',
  'Symptoms',
  'Timeline',
  'Severity',
  'Photos',
  'Description',
  'Your Questions',
  'Medical History',
];

const ASSOCIATED_SYMPTOMS = [
  'Fever', 'Nausea', 'Fatigue', 'Headache',
  'Shortness of breath', 'Dizziness', 'Vomiting', 'Loss of appetite',
];

const DISCLAIMER =
  'Triaje does not provide medical diagnosis or treatment. Responses are for informational purposes only and do not replace professional medical advice.';

const s = {
  field: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 7,
    fontFamily: 'inherit',
    fontSize: 13,
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600 as const,
    color: '#374151',
    marginBottom: 7,
  },
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '22px 22px',
    boxShadow: '0 2px 8px rgba(15,39,68,0.06)',
  },
  btnPrimary: {
    flex: 1,
    background: '#0f2744',
    color: 'white',
    border: 'none',
    borderRadius: 7,
    padding: '11px 16px',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600 as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  btnSecondary: {
    background: 'none',
    border: '1.5px solid #cbd5e1',
    color: '#475569',
    borderRadius: 7,
    padding: '11px 16px',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600 as const,
    cursor: 'pointer',
  },
};

export default function IntakePage() {
  const router = useRouter();
  const store = useIntakeStore();
  const step = store.currentStep;
  const [showTier4Modal, setShowTier4Modal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  function goNext() {
    if (step === 2 && checkAnyTier4([store.symptomDescription])) {
      setShowTier4Modal(true);
      return;
    }
    store.setStep(step + 1);
  }

  function goBack() {
    store.setStep(step - 1);
  }

  function toggleSymptom(sym: string) {
    const current = store.associatedSymptoms;
    store.update({
      associatedSymptoms: current.includes(sym)
        ? current.filter(s => s !== sym)
        : [...current, sym],
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const patientId = localStorage.getItem('contextmd_patient_id')!;
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          patientEmail: store.patientEmail || null,
          bodyLocation: store.bodyLocation,
          bodySubLocation: store.bodySubLocation,
          symptomType: store.symptomType,
          symptomDescription: store.symptomDescription,
          timelineStart: store.timelineStart,
          timelineChanged: store.timelineChanged,
          painSeverity: store.painSeverity,
          associatedSymptoms: store.associatedSymptoms,
          photoCount: store.photoCount,
          photoNames: store.photoNames,
          freeText: store.freeText,
          patientQuestions: store.patientQuestions,
          medicalConditions: store.medicalConditions,
          medications: store.medications,
          allergies: store.allergies,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string }).error ?? `Server error ${res.status}`;
        throw new Error(msg);
      }

      const caseData = await res.json();

      // fire-and-forget triage — pass caseId + full intake so the route can process symptoms
      fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          intake: {
            bodyLocation: store.bodyLocation,
            bodySubLocation: store.bodySubLocation,
            symptomType: store.symptomType,
            symptomDescription: store.symptomDescription,
            timelineStart: store.timelineStart,
            timelineChanged: store.timelineChanged,
            painSeverity: store.painSeverity,
            associatedSymptoms: store.associatedSymptoms,
            photoCount: store.photoCount,
            photoNames: store.photoNames,
            freeText: store.freeText,
            patientQuestions: store.patientQuestions,
            medicalConditions: store.medicalConditions,
            medications: store.medications,
            allergies: store.allergies,
          },
        }),
      });

      store.reset();
      router.push(`/status/${caseData.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(msg);
      setSubmitting(false);
    }
  }

  const navRow = (canContinue: boolean, isSubmit = false) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
      {step > 0 && (
        <button style={s.btnSecondary} onClick={goBack}>← Back</button>
      )}
      {isSubmit ? (
        <button
          style={{ ...s.btnPrimary, opacity: submitting ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting || !canContinue}
        >
          <span>{submitting ? 'Submitting…' : 'Submit case'}</span>
          <span>→</span>
        </button>
      ) : (
        <button
          style={{ ...s.btnPrimary, opacity: canContinue ? 1 : 0.5 }}
          onClick={goNext}
          disabled={!canContinue}
        >
          <span>Continue</span>
          <span>→</span>
        </button>
      )}
    </div>
  );

  // ── Step renderers ─────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // Step 0 — Contact Info
      case 0:
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="patientEmail">Email address <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional - for response notifications)</span></label>
            <input
              id="patientEmail"
              type="email"
              style={s.field}
              value={store.patientEmail}
              onChange={e => store.update({ patientEmail: e.target.value })}
              placeholder="your.email@example.com"
            />
            <p style={{ fontSize: 11, color: '#64748b', margin: '8px 0 0', lineHeight: 1.5 }}>
              We&apos;ll send you an email when your response is ready. You can also check your case status page anytime.
            </p>
            {navRow(true)}
          </div>
        );

      // Step 1 — Body Location
      case 1:
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="bodyLocation">Body region</label>
            <select
              id="bodyLocation"
              style={{ ...s.field, marginBottom: 16 }}
              value={store.bodyLocation}
              onChange={e => store.update({ bodyLocation: e.target.value })}
            >
              <option value="">Select a region</option>
              {['Head / Neck', 'Chest', 'Abdomen', 'Back', 'Arms / Hands', 'Legs / Feet', 'Skin / General'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <label style={s.label} htmlFor="bodySubLocation">
              More specific location{' '}
              <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <input
              id="bodySubLocation"
              type="text"
              style={s.field}
              value={store.bodySubLocation}
              onChange={e => store.update({ bodySubLocation: e.target.value })}
              placeholder="e.g. lower back, left knee, right temple"
            />
            {navRow(!!store.bodyLocation)}
          </div>
        );

      // Step 2 — Symptoms
      case 2:
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="symptomType">Type of symptom</label>
            <select
              id="symptomType"
              style={{ ...s.field, marginBottom: 16 }}
              value={store.symptomType}
              onChange={e => store.update({ symptomType: e.target.value })}
            >
              <option value="">Select a type</option>
              {['Pain', 'Swelling', 'Rash', 'Discharge', 'Fatigue', 'Other'].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <label style={s.label} htmlFor="symptomDescription">Describe your symptom</label>
            <textarea
              id="symptomDescription"
              style={{ ...s.field, height: 100, resize: 'none' }}
              value={store.symptomDescription}
              onChange={e => store.update({ symptomDescription: e.target.value })}
              placeholder="Tell us more about what you're experiencing..."
            />
            {navRow(!!store.symptomType && !!store.symptomDescription)}
          </div>
        );

      // Step 3 — Timeline
      case 3:
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="timelineStart">When did this start?</label>
            <input
              id="timelineStart"
              type="date"
              style={{ ...s.field, marginBottom: 16 }}
              value={store.timelineStart}
              onChange={e => store.update({ timelineStart: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
            <label style={s.label} htmlFor="timelineChanged">How has it changed since?</label>
            <select
              id="timelineChanged"
              style={s.field}
              value={store.timelineChanged}
              onChange={e => store.update({ timelineChanged: e.target.value as 'better' | 'worse' | 'same' })}
            >
              <option value="">Select one</option>
              <option value="worse">Getting worse</option>
              <option value="same">About the same</option>
              <option value="better">Getting better</option>
            </select>
            {navRow(!!store.timelineStart && !!store.timelineChanged)}
          </div>
        );

      // Step 4 — Severity + Associated Symptoms
      case 4: {
        const severity = store.painSeverity;
        const severityLabel = severity <= 2 ? 'None to minimal' : severity <= 4 ? 'Mild' : severity <= 6 ? 'Moderate' : severity <= 8 ? 'Severe' : 'Worst imaginable';
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="painSeverity">
              Pain severity — <span style={{ color: '#0f2744', fontWeight: 700 }}>{severity}</span>
              <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>({severityLabel})</span>
            </label>
            <input
              id="painSeverity"
              type="range"
              min={0} max={10}
              value={severity}
              onChange={e => store.update({ painSeverity: Number(e.target.value) })}
              style={{ width: '100%', accentColor: '#0f2744', margin: '4px 0 6px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              {([['0', 'None'], ['5', 'Moderate'], ['10', 'Worst']] as [string, string][]).map(([num, lbl]) => (
                <span key={num} style={{ textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f2744' }}>{num}</strong>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{lbl}</span>
                </span>
              ))}
            </div>

            <div style={{ height: 1, background: '#f1f5f9', marginBottom: 16 }} />

            <label style={s.label}>Associated symptoms <span style={{ fontWeight: 400, color: '#94a3b8' }}>(select all that apply)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[...ASSOCIATED_SYMPTOMS, ...store.associatedSymptoms.filter(s => !ASSOCIATED_SYMPTOMS.includes(s))].map(sym => {
                const selected = store.associatedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      border: selected ? 'none' : '1.5px solid #e2e8f0',
                      background: selected ? '#0f2744' : '#f8fafc',
                      color: selected ? 'white' : '#475569',
                      transition: 'all 0.12s',
                    }}
                  >
                    {sym}
                  </button>
                );
              })}
              {showCustomInput ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const trimmed = customSymptomInput.trim();
                    if (trimmed && !store.associatedSymptoms.includes(trimmed)) {
                      store.update({ associatedSymptoms: [...store.associatedSymptoms, trimmed] });
                    }
                    setCustomSymptomInput('');
                    setShowCustomInput(false);
                  }}
                  style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  <input
                    autoFocus
                    type="text"
                    value={customSymptomInput}
                    onChange={e => setCustomSymptomInput(e.target.value)}
                    placeholder="e.g. Chest tightness"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      border: '1.5px solid #0f2744',
                      outline: 'none',
                      fontFamily: 'inherit',
                      color: '#1e293b',
                      width: 150,
                    }}
                    onKeyDown={e => { if (e.key === 'Escape') { setShowCustomInput(false); setCustomSymptomInput(''); } }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      border: 'none',
                      background: '#0f2744',
                      color: 'white',
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCustomInput(false); setCustomSymptomInput(''); }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#475569',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: '1.5px dashed #94a3b8',
                    background: 'transparent',
                    color: '#64748b',
                  }}
                >
                  + Add your own
                </button>
              )}
            </div>
            {navRow(true)}
          </div>
        );
      }

      // Step 5 — Photos (simulated)
      case 5:
        return (
          <div style={s.card}>
            <label style={s.label}>Photos <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional — up to 3)</span></label>
            <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
              If relevant, upload photos of the affected area. This can help the provider better understand your concern.
            </p>
            <label
              htmlFor="photoInput"
              style={{
                display: 'block',
                border: '2px dashed #cbd5e1',
                borderRadius: 8,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                color: '#64748b',
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {store.photoCount > 0
                ? `${store.photoCount} photo${store.photoCount > 1 ? 's' : ''} selected`
                : 'Click to select photos'}
              <input
                id="photoInput"
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files ?? []).slice(0, 3);
                  store.update({
                    photoCount: files.length,
                    photoNames: files.map(f => f.name),
                  });
                }}
              />
            </label>
            {store.photoNames.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
                {store.photoNames.map(name => (
                  <div key={name} style={{ fontSize: 12, color: '#475569', background: '#f1f5f9', padding: '6px 10px', borderRadius: 5 }}>
                    {name}
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              Photos are stored securely and only visible to the reviewing provider.
            </p>
            {navRow(true)}
          </div>
        );

      // Step 6 — Free-text
      case 6:
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="freeText">
              Describe in your own words{' '}
              <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
              Anything else you&apos;d like the provider to know — context, what makes it better or worse, how it affects your daily life.
            </p>
            <textarea
              id="freeText"
              style={{ ...s.field, height: 130, resize: 'none' }}
              value={store.freeText}
              onChange={e => store.update({ freeText: e.target.value })}
              placeholder="e.g. The pain is worse in the morning and better after stretching. It started after I moved furniture last weekend..."
            />
            {navRow(true)}
          </div>
        );

      // Step 7 — Patient Questions
      case 7:
        return (
          <div style={s.card}>
            <label style={s.label}>Specific questions for the provider <span style={{ fontWeight: 400, color: '#94a3b8' }}>(up to 3, optional)</span></label>
            <p style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
              These are prominently shown to whoever reviews your case. Be specific — the more precise your question, the more useful the answer.
            </p>
            {([0, 1, 2] as const).map(i => (
              <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                <label style={{ ...s.label, marginBottom: 5 }} htmlFor={`q${i}`}>
                  Question {i + 1}
                </label>
                <input
                  id={`q${i}`}
                  type="text"
                  style={s.field}
                  value={store.patientQuestions[i]}
                  onChange={e => {
                    const updated = [...store.patientQuestions] as [string, string, string];
                    updated[i] = e.target.value;
                    store.update({ patientQuestions: updated });
                  }}
                  placeholder={
                    i === 0 ? 'e.g. Should I see a specialist for this?' :
                    i === 1 ? 'e.g. Is this something I can manage at home?' :
                    'e.g. What warning signs should I watch for?'
                  }
                />
              </div>
            ))}
            {navRow(true)}
          </div>
        );

      // Step 8 — Medical History + Submit
      case 8:
        return (
          <div style={s.card}>
            <label style={s.label} htmlFor="medicalConditions">
              Medical conditions{' '}
              <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <input
              id="medicalConditions"
              type="text"
              style={{ ...s.field, marginBottom: 14 }}
              value={store.medicalConditions}
              onChange={e => store.update({ medicalConditions: e.target.value })}
              placeholder="e.g. Diabetes, Hypertension, Asthma"
            />
            <label style={s.label} htmlFor="medications">
              Current medications{' '}
              <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <input
              id="medications"
              type="text"
              style={{ ...s.field, marginBottom: 14 }}
              value={store.medications}
              onChange={e => store.update({ medications: e.target.value })}
              placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
            />
            <label style={s.label} htmlFor="allergies">
              Allergies{' '}
              <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
            </label>
            <input
              id="allergies"
              type="text"
              style={s.field}
              value={store.allergies}
              onChange={e => store.update({ allergies: e.target.value })}
              placeholder="e.g. Penicillin, Sulfa drugs, Shellfish"
            />
            {submitError && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#ef4444' }}>{submitError}</p>
            )}
            {navRow(true, true)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px 60px' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Progress bar — Q1: B */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Step {step + 1} of 8</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0f2744' }}>{STEP_NAMES[step]}</span>
          </div>
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: '#0f2744',
                borderRadius: 2,
                width: `${((step + 1) / 8) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {renderStep()}

        <p style={{ margin: '20px 0 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>
          {DISCLAIMER}
        </p>
      </div>

      {/* Tier 4 Modal — Q3: C */}
      {showTier4Modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,39,68,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '0 20px',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '28px 24px',
              maxWidth: 400,
              width: '100%',
              borderTop: '4px solid #ef4444',
              boxShadow: '0 20px 60px rgba(15,39,68,0.3)',
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Possible Emergency Detected
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
              Your description mentions symptoms that may require immediate emergency care. Please do not wait — call 911 now.
            </p>
            <a
              href="tel:911"
              style={{
                display: 'block',
                background: '#ef4444',
                color: 'white',
                textAlign: 'center',
                padding: '13px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              Call 911 Now →
            </a>
            <button
              onClick={() => setShowTier4Modal(false)}
              style={{
                display: 'block',
                width: '100%',
                background: 'none',
                border: '1.5px solid #cbd5e1',
                color: '#475569',
                borderRadius: 8,
                padding: '11px',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Edit my description
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
