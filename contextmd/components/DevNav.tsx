'use client';
import { useEffect, useState, useCallback } from 'react';
import type { IntakeFormState } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface LogEntry {
  ts: string;
  ok: boolean;
  msg: string;
}

interface DevState {
  lastCaseId: string;
  lastIntake: IntakeFormState | null;
  log: LogEntry[];
}

// ── Preset intake data ──────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const TIER2_INTAKE: IntakeFormState = {
  patientEmail: 'demo@example.com',
  bodyLocation: 'Back',
  bodySubLocation: 'Lower back',
  symptomType: 'Pain',
  symptomDescription:
    'Severe lower back pain radiating down left leg, started 3 days ago after lifting, getting progressively worse',
  timelineStart: daysAgo(3),
  timelineChanged: 'worse',
  painSeverity: 8,
  associatedSymptoms: ['Fatigue', 'Nausea'],
  photoCount: 0,
  photoNames: [],
  freeText: 'Pain wakes me up at night. Hard to walk.',
  patientQuestions: [
    'Could this be a herniated disc?',
    'Should I go to the ER?',
    'What pain relief is safe?',
  ],
  medicalConditions: 'Hypertension',
  medications: 'Lisinopril, Ibuprofen',
  allergies: 'Penicillin',
};

const TIER0_INTAKE: IntakeFormState = {
  patientEmail: 'demo@example.com',
  bodyLocation: 'Skin / General',
  bodySubLocation: 'Shoulders',
  symptomType: 'Rash',
  symptomDescription:
    'Mild sunburn on shoulders from yesterday, slight redness, no blisters, already improving with aloe vera',
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
};

const PRESET_RESPONSE = {
  outcome: 'monitor' as const,
  message:
    'Based on your symptoms, this appears to be a musculoskeletal issue. Rest, ice, and over-the-counter anti-inflammatories should help. Monitor for worsening or new neurological symptoms.',
  followup_days: 7,
  watch_for:
    'Numbness or tingling in legs, loss of bladder/bowel control, fever above 38°C',
};

// ── LocalStorage helpers ───────────────────────────────────────────────────

const LS = {
  get: (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, val: string) => {
    try { localStorage.setItem(key, val); } catch { /* noop */ }
  },
  remove: (key: string) => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

function loadState(): DevState {
  return {
    lastCaseId: LS.get('triaje_dev_last_case_id') ?? '',
    lastIntake: (() => {
      try { return JSON.parse(LS.get('triaje_dev_last_intake') ?? 'null'); }
      catch { return null; }
    })(),
    log: (() => {
      try { return JSON.parse(LS.get('triaje_dev_log') ?? '[]'); }
      catch { return []; }
    })(),
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DevNav() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DevState>({ lastCaseId: '', lastIntake: null, log: [] });
  const [patientId, setPatientId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setState(loadState());
    setPatientId(LS.get('contextmd_patient_id') ?? '');
    setProviderId(LS.get('triaje_provider_id') ?? 'provider-demo-001');
  }, [open]);

  const log = useCallback((ok: boolean, msg: string) => {
    const entry: LogEntry = {
      ts: new Date().toLocaleTimeString('en-CA', { hour12: false }),
      ok,
      msg,
    };
    setState(prev => {
      const next = { ...prev, log: [entry, ...prev.log].slice(0, 20) };
      LS.set('triaje_dev_log', JSON.stringify(next.log));
      return next;
    });
  }, []);

  const saveCase = useCallback((id: string, intake: IntakeFormState) => {
    LS.set('triaje_dev_last_case_id', id);
    LS.set('triaje_dev_last_intake', JSON.stringify(intake));
    setState(prev => ({ ...prev, lastCaseId: id, lastIntake: intake }));
  }, []);

  // ── Seed action ───────────────────────────────────────────────────────────

  async function seedCase(label: string, intake: IntakeFormState) {
    setBusy(`seed-${label}`);
    try {
      const pid = LS.get('contextmd_patient_id') ?? crypto.randomUUID();
      LS.set('contextmd_patient_id', pid);
      setPatientId(pid);

      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: pid, ...intake }),
      });
      const body: { id?: string; error?: string } = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error ?? `HTTP ${res.status}`);

      saveCase(body.id, intake);
      log(true, `Case created: ${body.id.slice(0, 8)}… (${label})`);

      // fire-and-forget triage
      fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: body.id, intake }),
      }).then(r => log(r.ok, r.ok ? 'Triage fired' : `Triage HTTP ${r.status}`))
        .catch(e => log(false, `Triage error: ${String(e)}`));

      log(true, 'Triage request sent (background)');
    } catch (e) {
      log(false, `Seed failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function triggerTriage() {
    const { lastCaseId, lastIntake } = loadState();
    if (!lastCaseId || !lastIntake) return;
    setBusy('triage');
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: lastCaseId, intake: lastIntake }),
      });
      const body: { tier?: number; status?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      log(true, `Triage complete — Tier ${body.tier}, status: ${body.status}`);
    } catch (e) {
      log(false, `Triage failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function claimCase() {
    const { lastCaseId } = loadState();
    if (!lastCaseId) return;
    setBusy('claim');
    const pid = LS.get('triaje_provider_id') ?? 'provider-demo-001';
    try {
      const res = await fetch(`/api/cases/${lastCaseId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: pid }),
      });
      const body: { id?: string; status?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      log(true, `Claimed by ${pid} — status: ${body.status}`);
    } catch (e) {
      log(false, `Claim failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function submitResponse() {
    const { lastCaseId } = loadState();
    if (!lastCaseId) return;
    setBusy('respond');
    try {
      const res = await fetch(`/api/respond/${lastCaseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(PRESET_RESPONSE),
      });
      const body: { id?: string; outcome?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      log(true, `Response submitted — outcome: ${body.outcome}`);
    } catch (e) {
      log(false, `Respond failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  function newPatient() {
    const id = crypto.randomUUID();
    LS.set('contextmd_patient_id', id);
    setPatientId(id);
    log(true, `New patient ID: ${id.slice(0, 8)}…`);
  }

  async function clearAllCases() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    setBusy('clear');
    try {
      const res = await fetch('/api/cases', { method: 'DELETE' });
      const body: { cleared?: boolean; error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      LS.remove('triaje_dev_last_case_id');
      LS.remove('triaje_dev_last_intake');
      setState(prev => ({ ...prev, lastCaseId: '', lastIntake: null }));
      log(true, 'All cases cleared');
    } catch (e) {
      log(false, `Clear failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  function clearLastCase() {
    LS.remove('triaje_dev_last_case_id');
    LS.remove('triaje_dev_last_intake');
    setState(prev => ({ ...prev, lastCaseId: '', lastIntake: null }));
    log(true, 'Last case cleared');
  }

  function saveProviderId(val: string) {
    LS.set('triaje_provider_id', val);
    setProviderId(val);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const hasCase = !!state.lastCaseId;

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 10000, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
      {open && (
        <div style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 10,
          width: 310,
          marginBottom: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: '#1e293b', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
            <span style={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 10 }}>Dev Panel</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Section: Pages */}
            <div>
              <div style={{ color: '#475569', marginBottom: 6, fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Pages</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[
                  { label: 'Emergency', href: '/emergency' },
                  { label: 'Intake', href: '/intake' },
                  { label: 'Worklist', href: '/worklist' },
                ].map(({ label, href }) => (
                  <a key={href} href={href} style={navLinkStyle}>{label}</a>
                ))}
                <a
                  href={hasCase ? `/status/${state.lastCaseId}` : '#'}
                  style={{ ...navLinkStyle, opacity: hasCase ? 1 : 0.35, pointerEvents: hasCase ? 'auto' : 'none' }}
                >
                  Status ↗
                </a>
                <a
                  href={hasCase ? `/case/${state.lastCaseId}` : '#'}
                  style={{ ...navLinkStyle, opacity: hasCase ? 1 : 0.35, pointerEvents: hasCase ? 'auto' : 'none' }}
                >
                  Case ↗
                </a>
              </div>
            </div>

            <Divider />

            {/* Section: Seed */}
            <div>
              <div style={{ color: '#475569', marginBottom: 6, fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Seed Data</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <ActionBtn
                    label="Seed Tier 2 case"
                    busy={busy === 'seed-Tier 2'}
                    color="#f59e0b"
                    onClick={() => seedCase('Tier 2', TIER2_INTAKE)}
                  />
                  <ActionBtn
                    label="Seed Tier 0 case"
                    busy={busy === 'seed-Tier 0'}
                    color="#22c55e"
                    onClick={() => seedCase('Tier 0', TIER0_INTAKE)}
                  />
                </div>
                <ActionBtn
                  label="Trigger triage on last case"
                  busy={busy === 'triage'}
                  disabled={!hasCase}
                  onClick={triggerTriage}
                />
                <ActionBtn
                  label="Claim last case as provider"
                  busy={busy === 'claim'}
                  disabled={!hasCase}
                  onClick={claimCase}
                />
                <ActionBtn
                  label="Submit response to last case"
                  busy={busy === 'respond'}
                  disabled={!hasCase}
                  color="#3b82f6"
                  onClick={submitResponse}
                />
                <button
                  onClick={clearAllCases}
                  disabled={busy === 'clear'}
                  style={{
                    background: confirmClear ? '#ef4444' : 'none',
                    border: `1px solid #ef4444`,
                    borderRadius: 5,
                    color: confirmClear ? 'white' : '#ef4444',
                    cursor: busy === 'clear' ? 'default' : 'pointer',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 11,
                    padding: '5px 8px',
                    width: '100%',
                    opacity: busy === 'clear' ? 0.5 : 1,
                  }}
                >
                  {busy === 'clear' ? '…' : confirmClear ? 'Confirm? (3s)' : 'Clear all cases'}
                </button>
              </div>
            </div>

            <Divider />

            {/* Section: IDs */}
            <div>
              <div style={{ color: '#475569', marginBottom: 6, fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Active IDs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <IdRow label="Patient">
                  <span style={{ color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {patientId ? patientId.slice(0, 18) + '…' : '—'}
                  </span>
                  <SmallBtn onClick={newPatient}>New</SmallBtn>
                </IdRow>
                <IdRow label="Provider">
                  <input
                    value={providerId}
                    onChange={e => saveProviderId(e.target.value)}
                    style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', padding: '2px 5px', fontFamily: 'inherit', fontSize: 11, outline: 'none', minWidth: 0 }}
                  />
                </IdRow>
                <IdRow label="Last case">
                  <span style={{ color: state.lastCaseId ? '#7dd3fc' : '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {state.lastCaseId ? state.lastCaseId.slice(0, 18) + '…' : 'none'}
                  </span>
                  {state.lastCaseId && <SmallBtn onClick={clearLastCase}>Clear</SmallBtn>}
                </IdRow>
              </div>
            </div>

            <Divider />

            {/* Section: Log */}
            <div>
              <div style={{ color: '#475569', marginBottom: 6, fontSize: 10, letterSpacing: '0.8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>Log</span>
                {state.log.length > 0 && (
                  <button
                    onClick={() => {
                      LS.remove('triaje_dev_log');
                      setState(prev => ({ ...prev, log: [] }));
                    }}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, padding: 0 }}
                  >
                    clear
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {state.log.length === 0 ? (
                  <span style={{ color: '#334155' }}>No activity yet</span>
                ) : state.log.map((entry, i) => (
                  <div key={i} style={{ color: entry.ok ? '#86efac' : '#fca5a5', lineHeight: 1.5 }}>
                    <span style={{ color: '#475569', marginRight: 5 }}>{entry.ts}</span>
                    <span>{entry.ok ? '✓' : '✗'} {entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? '#1e293b' : '#0f172a',
          border: '1px solid #334155',
          borderRadius: 6,
          color: '#94a3b8',
          cursor: 'pointer',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1px',
          padding: '5px 10px',
          display: 'block',
          marginLeft: 'auto',
        }}
      >
        {open ? '✕ DEV' : '⚙ DEV'}
      </button>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: '#1e293b', margin: '0 -12px' }} />;
}

const navLinkStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 5,
  color: '#7dd3fc',
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'ui-monospace, monospace',
  padding: '4px 8px',
  textDecoration: 'none',
  display: 'inline-block',
};

function ActionBtn({
  label, busy, disabled, color = '#64748b', onClick,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        flex: 1,
        background: '#1e293b',
        border: `1px solid ${disabled ? '#1e293b' : color}`,
        borderRadius: 5,
        color: disabled ? '#334155' : color,
        cursor: disabled || busy ? 'default' : 'pointer',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        padding: '5px 8px',
        textAlign: 'left',
        opacity: disabled ? 0.4 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {busy ? '…' : label}
    </button>
  );
}

function IdRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#475569', width: 52, flexShrink: 0 }}>{label}:</span>
      {children}
    </div>
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: '1px solid #334155',
        borderRadius: 4,
        color: '#64748b',
        cursor: 'pointer',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        padding: '2px 6px',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
