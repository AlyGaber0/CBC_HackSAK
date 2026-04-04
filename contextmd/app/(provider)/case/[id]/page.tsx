'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Case, TriageOutcome, NavigationAction } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Eye, Calendar, AlertCircle, Camera, Pill } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { useLang } from '@/lib/i18n/LanguageContext';
import { translateCaseOption } from '@/lib/i18n/translations';
import { providerFetch } from '@/lib/providerFetch';

// Static visual config only — labels come from translations
const OUTCOME_VISUAL: Record<TriageOutcome, { icon: React.ElementType; accentColor: string; accentBg: string }> = {
  self_manageable:   { icon: CheckCircle2, accentColor: '#15803d', accentBg: '#f0fdf4' },
  monitor:           { icon: Eye,          accentColor: '#a16207', accentBg: '#fefce8' },
  book_appointment:  { icon: Calendar,     accentColor: '#1d4ed8', accentBg: '#eff6ff' },
  urgent:            { icon: AlertCircle,  accentColor: '#c2410c', accentBg: '#fff7ed' },
  pharmacy_guidance: { icon: Pill,         accentColor: '#7c3aed', accentBg: '#f5f3ff' },
};

// SVG icons for pharmacy actions — labels come from translations
const PHARMACY_ACTION_ICONS: Record<string, React.JSX.Element> = {
  call_pharmacy:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  take_medications:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="20" height="6" rx="3" ry="3"/><line x1="12" y1="9" x2="12" y2="15"/></svg>,
  avoid_medications:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  see_pharmacist:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>,
  monitor_side_effects: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  check_interactions:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// Static colors for nav action banners
const NAV_ACTION_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  stay_home:        { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  see_pharmacist:   { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  walk_in_soon:     { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  book_appointment: { color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  er_now:           { color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
};

const TIER_COLORS: Record<number, { dot: string; text: string }> = {
  1: { dot: '#16a34a', text: '#15803d' },
  2: { dot: '#ca8a04', text: '#a16207' },
  3: { dot: '#ea580c', text: '#c2410c' },
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
  const t = useT();
  const pc = t.provider.case;
  const { lang } = useLang();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [translated, setTranslated] = useState<Record<string, string> | null>(null);
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

  useEffect(() => {
    if (!caseData || lang === 'en') { setTranslated(null); return; }

    // Use pre-stored French translation if available (generated at triage time)
    const stored = caseData.ai_brief?.fr;
    if (stored) {
      setTranslated({
        tierReasoning:    stored.tierReasoning,
        chiefComplaint:   stored.chiefComplaint,
        timeline:         stored.timeline,
        severity:         stored.severity,
        redFlags:         stored.redFlags.join(' | '),
        medicationFlags:  stored.medicationFlags.join(' | '),
        relevantHistory:  stored.relevantHistory,
        nihContext:       stored.nihContext,
        freeText:         stored.freeText,
        patientQuestions: stored.patientQuestions.join(' || '),
      });
      return;
    }

    // Fallback: on-demand translation for older cases without stored fr
    const brief = caseData.ai_brief;
    const fields: Record<string, string> = {
      tierReasoning:    caseData.ai_tier_reasoning ?? '',
      chiefComplaint:   brief?.chiefComplaint ?? '',
      timeline:         brief?.timeline ?? '',
      severity:         brief?.severity ?? '',
      redFlags:         brief?.redFlags?.join(' | ') ?? '',
      medicationFlags:  brief?.medicationFlags?.join(' | ') ?? '',
      relevantHistory:  brief?.relevantHistory ?? '',
      nihContext:       brief?.nihContext ?? '',
      freeText:         caseData.free_text ?? '',
      patientQuestions: (caseData.patient_questions ?? []).join(' || '),
    };
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, targetLang: lang }),
    })
      .then(r => r.json())
      .then(setTranslated)
      .catch(() => setTranslated(null));
  }, [caseData, lang]);

  // Returns translated value if available, else original
  function tx(key: string, original: string): string {
    return translated?.[key] ?? original;
  }
  function txList(key: string, original: string[], sep: string): string[] {
    const raw = translated?.[key];
    if (!raw) return original;
    return raw.split(sep).map(s => s.trim()).filter(Boolean);
  }

  function togglePharmacyAction(key: string) {
    setPharmacyActions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function submitResponse() {
    if (!outcome || !sbarSituation.trim() || !sbarBackground.trim() || !sbarAssessment.trim() || !sbarRecommendation.trim()) return;
    setSubmitting(true);
    await providerFetch(`/api/respond/${id}`, {
      method: 'POST',
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

  const PROVIDER_TYPES = pc.providerTypes;
  const TIMEFRAMES = pc.timeframes;

  // Build translated outcome list
  const OUTCOMES = (Object.keys(OUTCOME_VISUAL) as TriageOutcome[]).map(value => ({
    value,
    label: pc.outcomes[value] ?? value,
    ...OUTCOME_VISUAL[value],
  }));

  // Build translated pharmacy actions list
  const PHARMACY_ACTIONS = Object.keys(PHARMACY_ACTION_ICONS).map(key => ({
    key,
    label: pc.pharmacyActions[key] ?? key,
    icon: PHARMACY_ACTION_ICONS[key],
  }));

  if (!caseData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8', fontSize: 13 }}>
        {pc.loading}
      </div>
    );
  }

  const brief = caseData.ai_brief;
  const tier = caseData.tier ?? 1;
  const tierColors = TIER_COLORS[tier] ?? TIER_COLORS[1];
  const tierCfg = { ...tierColors, label: pc.tierLabels[tier] ?? `T${tier}` };
  const navAction = caseData.navigation_action as NavigationAction | null;
  const navColors = navAction ? NAV_ACTION_COLORS[navAction] : null;
  const navText = navAction ? pc.navAction[navAction] : null;
  const canSubmit = outcome && sbarSituation.trim() && sbarBackground.trim() && sbarAssessment.trim() && sbarRecommendation.trim() && !submitting;

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1280, margin: '0 auto', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push('/worklist')}
          style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, fontFamily: 'inherit' }}
        >
          {pc.backToWorklist}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>
            {translateCaseOption(caseData.body_location ?? '', 'bodyLocations', lang)} / {translateCaseOption(caseData.symptom_type ?? '', 'symptomTypes', lang)}
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: tierCfg.text }}>
            <span style={{ width: 8, height: 8, background: tierCfg.dot, borderRadius: '50%', display: 'inline-block' }} />
            {tierCfg.label}
          </span>
        </div>
      </div>

      {/* AI navigation action banner:what the patient was already told */}
      {navColors && navText && (
        <div style={{
          background: navColors.bg,
          border: `1.5px solid ${navColors.border}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={navColors.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: navColors.color }}>{navText.label}</p>
            <p style={{ margin: 0, fontSize: 11.5, color: navColors.color, opacity: 0.8, lineHeight: 1.5 }}>{navText.detail}</p>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20, alignItems: 'start' }}>

        {/* LEFT:Brief + intake */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tier reasoning */}
          {caseData.ai_tier_reasoning && (
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              {tx('tierReasoning', caseData.ai_tier_reasoning)}
            </p>
          )}

          {/* AI Clinical Brief */}
          {brief && (
            <Card>
              <SectionLabel>{pc.aiBrief}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{pc.chiefComplaint}: </span>
                  <span style={{ color: '#1e293b' }}>{tx('chiefComplaint', brief.chiefComplaint)}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{pc.timeline}: </span>
                  <span style={{ color: '#1e293b' }}>{tx('timeline', brief.timeline)}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{pc.severity}: </span>
                  <span style={{ color: '#1e293b' }}>{tx('severity', brief.severity)}</span>
                </div>
                {brief.redFlags.length > 0 && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#c2410c' }}>{pc.redFlags}: </span>
                    <span style={{ color: '#c2410c' }}>{txList('redFlags', brief.redFlags, '|').join(', ')}</span>
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
                      {pc.medicationFlags}
                    </span>
                    <span style={{ color: '#92400e', fontWeight: 600, fontSize: 13 }}>{txList('medicationFlags', brief.medicationFlags, '|').join(', ')}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{pc.history}: </span>
                  <span style={{ color: '#1e293b' }}>{tx('relevantHistory', brief.relevantHistory)}</span>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{pc.nihContext}: </span>
                  <span style={{ color: '#1e293b' }}>{tx('nihContext', brief.nihContext)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Patient questions + doctor Q&A */}
          <Card style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <SectionLabel>{pc.patientQuestions}</SectionLabel>
            {(caseData.patient_questions?.length ?? 0) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {txList('patientQuestions', caseData.patient_questions, '||').map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: '#a37b23', marginBottom: 14 }}>{pc.noQuestions}</p>
            )}
            <div style={{ borderTop: '1px solid #fde68a', paddingTop: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#a37b23', letterSpacing: '1px', textTransform: 'uppercase' }}>{pc.askFollowup}</p>
              <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#92400e', opacity: 0.8, lineHeight: 1.5 }}>{pc.askFollowupHint}</p>
              <Textarea
                placeholder={pc.followupPlaceholder}
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
            <SectionLabel>{pc.patientDescription}</SectionLabel>
            <p style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {caseData.free_text ? tx('freeText', caseData.free_text) : <span style={{ color: '#94a3b8' }}>{pc.noDescription}</span>}
            </p>
          </Card>

          {/* Medical history */}
          <Card>
            <SectionLabel>{pc.medHistory}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div><span style={{ fontWeight: 600, color: '#374151' }}>{pc.conditions}: </span><span style={{ color: '#1e293b' }}>{caseData.medical_conditions?.join(', ') || pc.noneReported}</span></div>
              <div><span style={{ fontWeight: 600, color: '#374151' }}>{pc.medications}: </span><span style={{ color: '#1e293b' }}>{caseData.medications?.join(', ') || pc.noneReported}</span></div>
              <div><span style={{ fontWeight: 600, color: '#374151' }}>{pc.allergies}: </span><span style={{ color: '#1e293b' }}>{caseData.allergies?.join(', ') || pc.noneReported}</span></div>
            </div>
          </Card>

          {/* Photos */}
          {caseData.photo_count > 0 && (
            <Card>
              <SectionLabel>{pc.photos} ({caseData.photo_count})</SectionLabel>
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
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '10px 0 0' }}>{pc.photoPreview}</p>
            </Card>
          )}
        </div>

        {/* RIGHT:Response form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Outcome selector */}
          <Card>
            <SectionLabel>{pc.selectOutcome}</SectionLabel>
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
              <SectionLabel>{pc.pharmacyPanel}</SectionLabel>
              <p style={{ fontSize: 11.5, color: '#6d28d9', margin: '0 0 12px', lineHeight: 1.5, opacity: 0.8 }}>
                {pc.pharmacyPanelHint}
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
                      <span style={{ lineHeight: 1, display: 'flex', flexShrink: 0 }}>{action.icon}</span>
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
                  {pc.pharmacyMedsLabel}
                </label>
                <Textarea
                  placeholder={pc.pharmacyMedsPlaceholder}
                  value={pharmacyMedications}
                  onChange={e => setPharmacyMedications(e.target.value)}
                  rows={3}
                  className="resize-none"
                  style={{ borderColor: '#ddd6fe', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6d28d9', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                  {pc.pharmacyNoteLabel}
                </label>
                <Textarea
                  placeholder={pc.pharmacyNotePlaceholder}
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
              <SectionLabel>{pc.monitorTitle}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    {pc.followupDays}
                  </label>
                  <Input type="number" placeholder="7" value={followupDays} onChange={e => setFollowupDays(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    {pc.watchFor}
                  </label>
                  <Textarea placeholder={pc.watchForPlaceholder} value={watchFor} onChange={e => setWatchFor(e.target.value)} rows={3} className="resize-none" />
                </div>
              </div>
            </Card>
          )}

          {/* Book appointment */}
          {outcome === 'book_appointment' && (
            <Card>
              <SectionLabel>{pc.apptTitle}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    {pc.specialistType}
                  </label>
                  <Select value={providerType} onValueChange={v => setProviderType(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder={pc.selectSpecialist} /></SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                    {pc.timeframe}
                  </label>
                  <Select value={timeframe} onValueChange={v => setTimeframe(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder={pc.selectTimeframe} /></SelectTrigger>
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
              <SectionLabel>{pc.urgencyTitle}</SectionLabel>
              <Textarea
                placeholder={pc.urgencyNotePlaceholder}
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
            <SectionLabel>{pc.sbarTitle}</SectionLabel>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.5 }}>
              {pc.sbarHint}
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                {pc.sbarSituation}
              </label>
              <Textarea
                placeholder={pc.sbarPlaceholderSituation}
                value={sbarSituation}
                onChange={e => setSbarSituation(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                {pc.sbarBackground}
              </label>
              <Textarea
                placeholder={pc.sbarPlaceholderBackground}
                value={sbarBackground}
                onChange={e => setSbarBackground(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                {pc.sbarAssessment}
              </label>
              <Textarea
                placeholder={pc.sbarPlaceholderAssessment}
                value={sbarAssessment}
                onChange={e => setSbarAssessment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
                {pc.sbarRecommendation}
              </label>
              <Textarea
                placeholder={pc.sbarPlaceholderRecommendation}
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
            {submitting ? pc.submitting : pc.submit}
          </button>

          <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            {pc.submitDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
