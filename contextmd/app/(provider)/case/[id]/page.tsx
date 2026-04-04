'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Case, TriageOutcome, NavigationAction } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Eye, Calendar, AlertCircle, Camera, Pill } from 'lucide-react';

const OUTCOMES: {
  value: TriageOutcome;
  label: string;
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
}[] = [
  { value: 'self_manageable',  label: 'Self-manageable',   icon: CheckCircle2, accentColor: '#15803d', accentBg: '#f0fdf4' },
  { value: 'monitor',          label: 'Monitor',            icon: Eye,          accentColor: '#a16207', accentBg: '#fefce8' },
  { value: 'book_appointment', label: 'Book appointment',   icon: Calendar,     accentColor: '#1d4ed8', accentBg: '#eff6ff' },
  { value: 'urgent',           label: 'Urgent',             icon: AlertCircle,  accentColor: '#c2410c', accentBg: '#fff7ed' },
  { value: 'pharmacy_guidance',label: 'Pharmacy / Meds',   icon: Pill,         accentColor: '#7c3aed', accentBg: '#f5f3ff' },
];

const PHARMACY_ACTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'call_pharmacy',       label: 'Call your local pharmacy',            icon: '📞' },
  { key: 'take_medications',    label: 'Take these specific medications',     icon: '💊' },
  { key: 'avoid_medications',   label: 'Avoid these medications',             icon: '🚫' },
  { key: 'see_pharmacist',      label: 'Visit a pharmacist (no appt needed)', icon: '🏪' },
  { key: 'monitor_side_effects',label: 'Monitor for side effects',            icon: '👁' },
  { key: 'check_interactions',  label: 'Check drug interactions with pharmacist', icon: '⚠️' },
];

const NAV_ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; detail: string }> = {
  stay_home:        { label: 'AI told patient: Stay home & rest',          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', detail: 'Patient was advised to manage symptoms at home.' },
  call_811:         { label: 'AI told patient: Call 811 (Info-Santé)',      color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', detail: 'Patient was directed to speak with a registered nurse.' },
  see_pharmacist:   { label: 'AI told patient: See a pharmacist',          color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', detail: 'Patient was directed to a Quebec pharmacist prescriber.' },
  walk_in_soon:     { label: 'AI told patient: Visit a walk-in clinic',    color: '#92400e', bg: '#fffbeb', border: '#fde68a', detail: 'Patient was told to visit a walk-in or CLSC within 2–5 days.' },
  book_appointment: { label: 'AI told patient: Book an appointment',       color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', detail: 'Patient was advised to schedule a follow-up with a provider.' },
  er_now:           { label: 'AI told patient: Go to Emergency now',       color: '#991b1b', bg: '#fff1f2', border: '#fecaca', detail: 'Patient was directed to the emergency department immediately.' },
};

const PROVIDER_TYPES = [
  'Family physician', 'Dermatologist', 'Cardiologist', 'Orthopedist',
  'Gastroenterologist', 'Neurologist', 'Gynecologist', 'Urologist', 'Walk-in clinic',
];
const TIMEFRAMES = [
  'Within 24–48 hours', 'Within 1 week', 'Within 2–4 weeks',
  'Within 1–3 months', 'Next available appointment',
];

const TIER_CONFIG: Record<number, { dot: string; text: string; label: string }> = {
  1: { dot: '#16a34a', text: '#15803d', label: 'T1 — Monitor' },
  2: { dot: '#ca8a04', text: '#a16207', label: 'T2 — Appointment' },
  3: { dot: '#ea580c', text: '#c2410c', label: 'T3 — Urgent' },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1.1px', textTransform: 'uppercase', margin: '0 0 6px' }}>
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #f1f5f9',
      borderRadius: 8,
      padding: '16px 18px',
      boxShadow: '0 1px 4px rgba(15,39,68,0.05)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function ProviderCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [outcome, setOutcome] = useState<TriageOutcome | ''>('');

  // SBAR fields
  const [sbarSituation, setSbarSituation] = useState('');
  const [sbarBackground, setSbarBackground] = useState('');
  const [sbarAssessment, setSbarAssessment] = useState('');
  const [sbarRecommendation, setSbarRecommendation] = useState('');

  // Conditional fields
  const [followupDays, setFollowupDays] = useState('');
  const [watchFor, setWatchFor] = useState('');
  const [providerType, setProviderType] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [urgencyNote, setUrgencyNote] = useState('');

  // Pharmacy fields
  const [pharmacyActions, setPharmacyActions] = useState<string[]>([]);
  const [pharmacyMedications, setPharmacyMedications] = useState('');
  const [pharmacyNote, setPharmacyNote] = useState('');

  // Doctor question to patient
  const [doctorQuestion, setDoctorQuestion] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/cases/${id}`)
      .then(r => r.json())
      .then(setCaseData);
  }, [id]);

  function togglePharmacyAction(key: string) {
    setPharmacyActions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function submitResponse() {
    if (!outcome || !sbarSituation.trim() || !sbarBackground.trim() || !sbarAssessment.trim() || !sbarRecommendation.trim()) return;
    setSubmitting(true);
    await fetch(`/api/respond/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        sbar_situation: sbarSituation,
        sbar_background: sbarBackground,
        sbar_assessment: sbarAssessment,
        sbar_recommendation: sbarRecommendation,
        followup_days: followupDays ? parseInt(followupDays) : null,
        watch_for: watchFor || null,
        provider_type: providerType || null,
        timeframe: timeframe || null,
        urgency_note: urgencyNote || null,
        pharmacy_actions: pharmacyActions,
        pharmacy_medications: pharmacyMedications || null,
        pharmacy_note: pharmacyNote || null,
        doctor_question: doctorQuestion.trim() || null,
      }),
    });
    router.push('/worklist');
  }

  if (!caseData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8', fontSize: 13 }}>
        Loading case...
      </div>
    );
  }

  const brief = caseData.ai_brief;
  const tier = caseData.tier ?? 1;
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
  const navAction = caseData.navigation_action as NavigationAction | null;
  const navCfg = navAction ? NAV_ACTION_CONFIG[navAction] : null;
  const canSubmit = outcome && sbarSituation.trim() && sbarBackground.trim() && sbarAssessment.trim() && sbarRecommendation.trim() && !submitting;

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1280, margin: '0 auto', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push('/worklist')}
          style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, fontFamily: 'inherit' }}
        >
          ← Back to worklist
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>
            {caseData.body_location} — {caseData.symptom_type}
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: tierCfg.text }}>
            <span style={{ width: 8, height: 8, background: tierCfg.dot, borderRadius: '50%', display: 'inline-block' }} />
            {tierCfg.label}
          </span>
        </div>
      </div>

      {/* AI navigation action banner — what the patient was already told */}
      {navCfg && (
        <div style={{
          background: navCfg.bg,
          border: `1.5px solid ${navCfg.border}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={navCfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: navCfg.color }}>{navCfg.label}</p>
            <p style={{ margin: 0, fontSize: 11.5, color: navCfg.color, opacity: 0.8, lineHeight: 1.5 }}>{navCfg.detail}</p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, alignItems: 'start' }}>

        {/* LEFT — Brief + intake */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tier reasoning */}
          {caseData.ai_tier_reasoning && (
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              {caseData.ai_tier_reasoning}
            </p>
          )}

          {/* AI Clinical Brief */}
          {brief && (
            <Card>
              <SectionLabel>AI Clinical Brief</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Chief complaint: </span>
                  <span style={{ color: '#1e293b' }}>{brief.chiefComplaint}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Timeline: </span>
                  <span style={{ color: '#1e293b' }}>{brief.timeline}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Severity: </span>
                  <span style={{ color: '#1e293b' }}>{brief.severity}</span>
                </div>
                {brief.redFlags.length > 0 && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#c2410c' }}>Red flags: </span>
                    <span style={{ color: '#c2410c' }}>{brief.redFlags.join(', ')}</span>
                  </div>
                )}
                {brief.medicationFlags.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 6, padding: '10px 12px', marginTop: 6 }}>
                    <span style={{ fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      <svg style={{ display: 'inline-block', verticalAlign: 'text-top', marginRight: 4 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Medication Flags
                    </span>
                    <span style={{ color: '#92400e', fontWeight: 600, fontSize: 13 }}>{brief.medicationFlags.join(', ')}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>History: </span>
                  <span style={{ color: '#1e293b' }}>{brief.relevantHistory}</span>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <span style={{ fontWeight: 600, color: '#1d4ed8' }}>NIH context: </span>
                  <span style={{ color: '#1e293b' }}>{brief.nihContext}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Patient questions + doctor Q&A */}
          <Card style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <SectionLabel>Patient&apos;s questions</SectionLabel>
            {(caseData.patient_questions?.length ?? 0) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {caseData.patient_questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: '#a37b23', marginBottom: 14 }}>No questions submitted by patient.</p>
            )}
            <div style={{ borderTop: '1px solid #fde68a', paddingTop: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#a37b23', letterSpacing: '1px', textTransform: 'uppercase' }}>Ask the patient a follow-up question</p>
              <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#92400e', opacity: 0.8, lineHeight: 1.5 }}>Optional — this will appear on the patient&apos;s status page alongside your response.</p>
              <Textarea
                placeholder="e.g. Have you noticed any swelling around the area? Does the pain radiate anywhere?"
                value={doctorQuestion}
                onChange={e => setDoctorQuestion(e.target.value)}
                rows={2}
                className="resize-none"
                style={{ borderColor: '#fde68a', background: '#fffef5', fontSize: 13 }}
              />
            </div>
          </Card>

          {/* Patient description */}
          <Card>
            <SectionLabel>Patient&apos;s description</SectionLabel>
            <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {caseData.free_text || <span style={{ color: '#94a3b8' }}>No description provided.</span>}
            </p>
          </Card>

          {/* Medical history */}
          <Card>
            <SectionLabel>Medical history</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div><span style={{ fontWeight: 600, color: '#374151' }}>Conditions: </span><span style={{ color: '#1e293b' }}>{caseData.medical_conditions?.join(', ') || 'None reported'}</span></div>
              <div><span style={{ fontWeight: 600, color: '#374151' }}>Medications: </span><span style={{ color: '#1e293b' }}>{caseData.medications?.join(', ') || 'None reported'}</span></div>
              <div><span style={{ fontWeight: 600, color: '#374151' }}>Allergies: </span><span style={{ color: '#1e293b' }}>{caseData.allergies?.join(', ') || 'None reported'}</span></div>
            </div>
          </Card>

          {/* Photos */}
          {caseData.photo_count > 0 && (
            <Card>
              <SectionLabel>Photos ({caseData.photo_count})</SectionLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {caseData.photo_names?.map((name, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 72, height: 72, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={18} color="#94a3b8" />
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', maxWidth: 72, textAlign: 'center', wordBreak: 'break-word' }}>{name}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>Photo preview unavailable in demo mode.</p>
            </Card>
          )}
        </div>

        {/* RIGHT — Response form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Outcome selector */}
          <Card>
            <SectionLabel>Select outcome</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {OUTCOMES.map(o => {
                const Icon = o.icon;
                const selected = outcome === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '14px 10px',
                      background: selected ? o.accentBg : '#f8fafc',
                      border: `1.5px solid ${selected ? o.accentColor : '#e2e8f0'}`,
                      borderRadius: 7,
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon size={18} color={selected ? o.accentColor : '#94a3b8'} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: selected ? o.accentColor : '#64748b', textAlign: 'center', lineHeight: 1.3 }}>
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Pharmacy guidance panel */}
          {outcome === 'pharmacy_guidance' && (
            <Card style={{ border: '1.5px solid #ddd6fe' }}>
              <SectionLabel>Pharmacy &amp; Medication Actions</SectionLabel>
              <p style={{ fontSize: 11.5, color: '#6d28d9', margin: '0 0 12px', lineHeight: 1.5, opacity: 0.8 }}>
                Select all actions that apply. These will be shown as clear, interactive steps to the patient.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {PHARMACY_ACTIONS.map(action => {
                  const selected = pharmacyActions.includes(action.key);
                  return (
                    <button
                      key={action.key}
                      onClick={() => togglePharmacyAction(action.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        background: selected ? '#f5f3ff' : '#fafafa',
                        border: `1.5px solid ${selected ? '#7c3aed' : '#e2e8f0'}`,
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'all 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{action.icon}</span>
                      <span style={{ fontSize: 12.5, fontWeight: selected ? 600 : 400, color: selected ? '#5b21b6' : '#374151' }}>
                        {action.label}
                      </span>
                      {selected && (
                        <span style={{ marginLeft: 'auto', width: 16, height: 16, background: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2 6 5 9 10 3"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6d28d9', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                  Specific medications to take / avoid (optional)
                </label>
                <Textarea
                  placeholder={`e.g. Take Ibuprofen 400mg every 6 hours with food.\nAvoid Aspirin if you are on blood thinners.`}
                  value={pharmacyMedications}
                  onChange={e => setPharmacyMedications(e.target.value)}
                  rows={3}
                  className="resize-none"
                  style={{ borderColor: '#ddd6fe', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6d28d9', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                  Additional pharmacy note (optional)
                </label>
                <Textarea
                  placeholder="e.g. Your current medications may interact. Ask your pharmacist before starting anything new."
                  value={pharmacyNote}
                  onChange={e => setPharmacyNote(e.target.value)}
                  rows={2}
                  className="resize-none"
                  style={{ borderColor: '#ddd6fe', fontSize: 13 }}
                />
              </div>
            </Card>
          )}

          {/* Monitor details */}
          {outcome === 'monitor' && (
            <Card>
              <SectionLabel>Monitor details</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    Follow up in (days)
                  </label>
                  <Input type="number" placeholder="e.g. 7" value={followupDays} onChange={e => setFollowupDays(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    Watch for these symptoms
                  </label>
                  <Textarea placeholder="e.g. Increased redness, fever above 38°C..." value={watchFor} onChange={e => setWatchFor(e.target.value)} rows={3} className="resize-none" />
                </div>
              </div>
            </Card>
          )}

          {/* Book appointment */}
          {outcome === 'book_appointment' && (
            <Card>
              <SectionLabel>Appointment details</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    Specialist type
                  </label>
                  <Select value={providerType} onValueChange={v => setProviderType(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select specialist..." /></SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    Recommended timeframe
                  </label>
                  <Select value={timeframe} onValueChange={v => setTimeframe(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select timeframe..." /></SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {/* Urgent */}
          {outcome === 'urgent' && (
            <Card style={{ borderColor: '#fca5a5' }}>
              <SectionLabel>Urgency note</SectionLabel>
              <Textarea
                placeholder="e.g. Go to an urgent care clinic today. Do not wait more than 24 hours..."
                value={urgencyNote}
                onChange={e => setUrgencyNote(e.target.value)}
                rows={3}
                className="resize-none"
                style={{ borderColor: '#fca5a5' }}
              />
            </Card>
          )}

          {/* SBAR Response */}
          <Card>
            <SectionLabel>SBAR Response (all fields required)</SectionLabel>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.5 }}>
              Use the SBAR framework for clinical clarity. Write in plain language for the patient.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                Situation — What is happening right now?
              </label>
              <Textarea
                placeholder="e.g. You've described a persistent headache that started 3 days ago..."
                value={sbarSituation}
                onChange={e => setSbarSituation(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                Background — Relevant history and context
              </label>
              <Textarea
                placeholder="e.g. You mentioned this is similar to tension headaches you've had before, but this one is lasting longer..."
                value={sbarBackground}
                onChange={e => setSbarBackground(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                Assessment — Your clinical impression
              </label>
              <Textarea
                placeholder="e.g. Based on your description, this appears to be a tension-type headache without red flag features..."
                value={sbarAssessment}
                onChange={e => setSbarAssessment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                Recommendation — What should the patient do?
              </label>
              <Textarea
                placeholder="e.g. Try over-the-counter ibuprofen 400mg every 6 hours. Apply a warm compress to your neck and temples..."
                value={sbarRecommendation}
                onChange={e => setSbarRecommendation(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </Card>

          {/* Submit */}
          <button
            onClick={submitResponse}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '13px',
              background: canSubmit ? '#0f2744' : '#e2e8f0',
              color: canSubmit ? '#ffffff' : '#94a3b8',
              border: 'none', borderRadius: 7,
              fontSize: 14, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', letterSpacing: 0.1,
              transition: 'background 0.1s',
            }}
          >
            {submitting ? 'Sending...' : 'Send Response to Patient'}
          </button>

          <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            By submitting, you confirm this is triage navigation guidance, not a medical diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}
