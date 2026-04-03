'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Case, TriageOutcome } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Eye, Calendar, AlertCircle, Camera } from 'lucide-react';

const OUTCOMES: {
  value: TriageOutcome;
  label: string;
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
}[] = [
  { value: 'self_manageable', label: 'Self-manageable', icon: CheckCircle2, accentColor: '#15803d', accentBg: '#f0fdf4' },
  { value: 'monitor',         label: 'Monitor',          icon: Eye,          accentColor: '#a16207', accentBg: '#fefce8' },
  { value: 'book_appointment',label: 'Book appointment', icon: Calendar,     accentColor: '#1d4ed8', accentBg: '#eff6ff' },
  { value: 'urgent',          label: 'Urgent',           icon: AlertCircle,  accentColor: '#c2410c', accentBg: '#fff7ed' },
];

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
  const [message, setMessage] = useState('');
  const [followupDays, setFollowupDays] = useState('');
  const [watchFor, setWatchFor] = useState('');
  const [providerType, setProviderType] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [urgencyNote, setUrgencyNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/cases/${id}`)
      .then(r => r.json())
      .then(setCaseData);
  }, [id]);

  async function submitResponse() {
    if (!outcome || !message.trim()) return;
    setSubmitting(true);
    await fetch(`/api/respond/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        message,
        followup_days: followupDays ? parseInt(followupDays) : null,
        watch_for: watchFor || null,
        provider_type: providerType || null,
        timeframe: timeframe || null,
        urgency_note: urgencyNote || null,
      }),
    });
    router.push('/provider/worklist');
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
  const canSubmit = outcome && message.trim() && !submitting;

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1280, margin: '0 auto', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push('/provider/worklist')}
          style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, fontFamily: 'inherit' }}
        >
          ← Back to worklist
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>
            {caseData.body_location} — {caseData.symptom_type}
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: tierCfg.text }}>
            <span style={{ width: 8, height: 8, background: tierCfg.dot, borderRadius: '50%', display: 'inline-block' }} />
            {tierCfg.label}
          </span>
        </div>
        {caseData.ai_tier_reasoning && (
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
            {caseData.ai_tier_reasoning}
          </p>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, alignItems: 'start' }}>

        {/* LEFT — Brief + intake */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

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
                  <div>
                    <span style={{ fontWeight: 600, color: '#a16207' }}>Medication flags: </span>
                    <span style={{ color: '#92400e' }}>{brief.medicationFlags.join(', ')}</span>
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

          {/* Patient questions */}
          {(caseData.patient_questions?.length ?? 0) > 0 && (
            <Card style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <SectionLabel>Patient's questions</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {caseData.patient_questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Patient description */}
          <Card>
            <SectionLabel>Patient's description</SectionLabel>
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

          {/* Conditional fields */}
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

          {/* Patient message */}
          <Card>
            <SectionLabel>Response to patient</SectionLabel>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px', lineHeight: 1.5 }}>
              Write in plain language. Address their specific questions directly.
            </p>
            <Textarea
              placeholder="Based on your description..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              className="resize-none"
            />
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
