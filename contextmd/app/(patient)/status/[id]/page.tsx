'use client';
import React, { use, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Case, Response, NihSource, NavigationAction } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';

// Static visual config (icons + colors only — text comes from translations)
const OUTCOME_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  self_manageable:   { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  monitor:           { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  book_appointment:  { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent:            { color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
  pharmacy_guidance: { color: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
};

const PHARMACY_ICONS: Record<string, React.JSX.Element> = {
  call_pharmacy:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  take_medications:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="20" height="6" rx="3" ry="3"/><line x1="12" y1="9" x2="12" y2="15"/></svg>,
  avoid_medications:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  see_pharmacist:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>,
  monitor_side_effects: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  check_interactions:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const NAV_ICONS: Record<string, { icon: React.JSX.Element; color: string; bg: string; border: string }> = {
  stay_home:        { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  see_pharmacist:   { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  walk_in_soon:     { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  book_appointment: { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  er_now:           { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
  walkin_soon:      { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  self_care:        { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
};

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const output: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    output.push(
      <ul key={key++} style={{ margin: '10px 0 10px 4px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bulletBuffer.map((item, i) => (
          <li key={i} style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7 }}>
            {inlineBold(item)}
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  function inlineBold(line: string): React.ReactNode[] {
    const parts = line.split(/(\*\*[^*]+\*\*)/);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} style={{ fontWeight: 700, color: '#0f2744' }}>{part.slice(2, -2)}</strong>
        : part
    );
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      output.push(<div key={key++} style={{ height: 8 }} />);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      bulletBuffer.push(line.slice(2));
      continue;
    }
    flushBullets();
    output.push(
      <p key={key++} style={{ margin: '0 0 10px', fontSize: 14, color: '#1e293b', lineHeight: 1.75 }}>
        {inlineBold(line)}
      </p>
    );
  }
  flushBullets();
  return output;
}

export default function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusHint = searchParams.get('status');
  const t = useT();
  const s = t.status;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [nihOpen, setNihOpen] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    async function load() {
      try {
        const res = await fetch(`/api/cases/${id}`);
        if (!res.ok) return;
        const data: Case = await res.json();
        setCaseData(data);
        if (data.status === 'response_ready' || data.status === 'escalated') {
          stoppedRef.current = true;
        }
      } catch { /* silently retry */ }
    }
    load();
    const interval = setInterval(() => { if (!stoppedRef.current) load(); }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const effectiveStatus = caseData?.status ?? statusHint ?? null;

  if (!effectiveStatus) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 16px' }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <Spinner size={32} />
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 16 }}>{s.loadingCase}</p>
        </div>
      </div>
    );
  }

  if (effectiveStatus === 'processing') {
    return (
      <StatusShell caseStatusLabel={s.caseStatus}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 24px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)', textAlign: 'center' }}>
          <Spinner size={32} style={{ margin: '0 auto 18px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f2744' }}>{s.processingHeading}</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>
            {s.processingDetail}
          </p>
        </div>
      </StatusShell>
    );
  }

  if (effectiveStatus === 'awaiting_review' || effectiveStatus === 'in_review') {
    const inReview = effectiveStatus === 'in_review';
    const navAction = caseData?.navigation_action;
    const navVisual = navAction ? NAV_ICONS[navAction as NavigationAction] : null;
    const navText = navAction ? s.nav[navAction as NavigationAction] : null;

    return (
      <StatusShell caseStatusLabel={s.caseStatus}>
        {navVisual && navText && (
          <div style={{ background: navVisual.bg, border: `1.5px solid ${navVisual.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 14, boxShadow: '0 2px 8px rgba(15,39,68,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: navVisual.color, lineHeight: 1, flexShrink: 0 }}>{navVisual.icon}</span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: navVisual.color }}>{navText.label}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: navVisual.color, opacity: 0.85, lineHeight: 1.6 }}>{navText.detail}</p>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 22px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 10px', marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>
              {inReview ? s.providerReviewing : s.caseReceived}
            </span>
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#0f2744', letterSpacing: '-0.3px' }}>
            {inReview ? s.inReviewHeading : s.awaitingHeading}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.7 }}>
            {inReview ? s.inReviewBody : s.awaitingBody}
          </p>
          <div style={{ height: 1, background: '#f1f5f9', margin: '18px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
            <span>{s.mostResponses}</span>
            <span>{s.updatesEvery}</span>
          </div>
        </div>
        <EmergencyFooter call911={s.call911} call911Detail={s.call911Detail} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      </StatusShell>
    );
  }

  if (effectiveStatus === 'response_ready') {
    const response: Response | undefined = caseData?.responses?.[0];

    if (!response) {
      return (
        <StatusShell caseStatusLabel={s.caseStatus}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 24px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)', textAlign: 'center' }}>
            <Spinner size={32} style={{ margin: '0 auto 18px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f2744' }}>{s.preparingResponse}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{s.preparingDetail}</p>
          </div>
        </StatusShell>
      );
    }

    const outcomeKey = response.outcome ?? 'self_manageable';
    const cfgColors = OUTCOME_COLORS[outcomeKey] ?? OUTCOME_COLORS.self_manageable;
    const outcomeLabel = s.outcome[outcomeKey] ?? s.outcome.self_manageable;
    const nihs: NihSource[] = response.nih_sources ?? [];
    const hasSBAR = response.sbar_situation || response.sbar_background || response.sbar_assessment || response.sbar_recommendation;
    const pharmacyActions: string[] = response.pharmacy_actions ?? [];
    const hasPharmacy = response.outcome === 'pharmacy_guidance' || pharmacyActions.length > 0;

    return (
      <StatusShell caseStatusLabel={s.caseStatus}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 22px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)' }}>

          {/* Outcome badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cfgColors.bg, border: `1.5px solid ${cfgColors.border}`, borderRadius: 7, padding: '7px 13px', marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, background: cfgColors.color, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: cfgColors.color }}>{outcomeLabel}</span>
          </div>

          {/* Pharmacy guidance block */}
          {hasPharmacy && (
            <div style={{ background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#5b21b6', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{s.pharmacySectionTitle}</p>
              {pharmacyActions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: response.pharmacy_medications || response.pharmacy_note ? 14 : 0 }}>
                  {pharmacyActions.map(key => {
                    const icon = PHARMACY_ICONS[key];
                    const text = s.pharmacy[key];
                    if (!icon || !text) return null;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'white', border: '1px solid #ddd6fe', borderRadius: 7, padding: '10px 12px' }}>
                        <span style={{ lineHeight: 1, flexShrink: 0, display: 'flex' }}>{icon}</span>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#4c1d95' }}>{text.label}</p>
                          <p style={{ margin: 0, fontSize: 12, color: '#6d28d9', opacity: 0.8, lineHeight: 1.5 }}>{text.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {response.pharmacy_medications && (
                <div style={{ marginBottom: response.pharmacy_note ? 10 : 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, color: '#5b21b6', letterSpacing: '0.7px', textTransform: 'uppercase' }}>{s.medicationInstructions}</p>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#3b0764', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{response.pharmacy_medications}</p>
                </div>
              )}
              {response.pharmacy_note && (
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, color: '#5b21b6', letterSpacing: '0.7px', textTransform: 'uppercase' }}>{s.noteFromProvider}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#4c1d95', lineHeight: 1.65 }}>{response.pharmacy_note}</p>
                </div>
              )}
            </div>
          )}

          {/* SBAR */}
          {hasSBAR ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {response.sbar_situation && <SbarSection label={s.sbar.situation} text={response.sbar_situation} />}
              {response.sbar_background && <SbarSection label={s.sbar.background} text={response.sbar_background} />}
              {response.sbar_assessment && <SbarSection label={s.sbar.assessment} text={response.sbar_assessment} />}
              {response.sbar_recommendation && <SbarSection label={s.sbar.recommendation} text={response.sbar_recommendation} bold />}
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {renderMarkdown(response.message ?? '')}
            </div>
          )}

          {/* Conditional detail blocks */}
          {response.followup_days != null && <Detail label={s.detail.followUpIn} value={`${response.followup_days} day${response.followup_days !== 1 ? 's' : ''}`} />}
          {response.watch_for && <Detail label={s.detail.watchFor} value={response.watch_for} />}
          {response.provider_type && <Detail label={s.detail.seeA} value={`${response.provider_type}${response.timeframe ? ` within ${response.timeframe}` : ''}`} />}
          {response.urgency_note && <Detail label={s.detail.urgentAction} value={response.urgency_note} accent />}

          {/* Doctor question to patient */}
          {response.doctor_question && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '14px 16px', marginTop: 4, marginBottom: 4 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10.5, fontWeight: 700, color: '#92400e', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{s.doctorQuestion}</p>
              <p style={{ margin: 0, fontSize: 14, color: '#78350f', lineHeight: 1.7, fontWeight: 500 }}>{response.doctor_question}</p>
            </div>
          )}

          {/* NIH sources */}
          {nihs.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: 20 }}>
              <button
                onClick={() => setNihOpen(o => !o)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: '#f8fafc', border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                <span>{s.nihSources(nihs.length)}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{nihOpen ? '\u25b2' : '\u25bc'}</span>
              </button>
              {nihOpen && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nihs.map((src, i) => (
                    <div key={i}>
                      <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: '#1d4ed8', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                        {src.title} &#x2197;
                      </a>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.55 }}>{src.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>{s.disclaimer}</p>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => router.push('/intake')}
            style={{
              width: '100%', padding: '13px 16px',
              background: '#0f2744', color: 'white',
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '-0.2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {s.submitAnother}
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              width: '100%', padding: '11px 16px',
              background: 'white', color: '#0f2744',
              border: '1.5px solid #e2e8f0', borderRadius: 8,
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {s.backToHome}
          </button>
        </div>

        <EmergencyFooter call911={s.call911} call911Detail={s.call911Detail} />
      </StatusShell>
    );
  }

  return null;
}

function EmergencyFooter({ call911, call911Detail }: { call911: string; call911Detail: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <a
        href="tel:911"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px 16px',
          background: '#fff1f2', color: '#991b1b',
          border: '1.5px solid #fecaca', borderRadius: 8,
          fontSize: 13.5, fontWeight: 700, textDecoration: 'none',
          fontFamily: 'Inter, -apple-system, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        {call911}
      </a>
      <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
        {call911Detail}
      </p>
    </div>
  );
}

function Spinner({ size = 24, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <>
      <div style={{
        width: size, height: size,
        border: `${size > 20 ? 3 : 2}px solid #e2e8f0`,
        borderTopColor: '#0f2744',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
        ...style,
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function StatusShell({ children, caseStatusLabel }: { children: React.ReactNode; caseStatusLabel: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px 60px' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{caseStatusLabel}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function SbarSection({ label, text, bold = false }: { label: string; text: string; bold?: boolean }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: '#1e293b', lineHeight: 1.75, fontWeight: bold ? 600 : 400 }}>{text}</p>
    </div>
  );
}

function Detail({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: accent ? '#fff1f2' : '#f8fafc', border: `1px solid ${accent ? '#fecaca' : '#f1f5f9'}`, borderRadius: 7, padding: '10px 14px', marginBottom: 10 }}>
      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: accent ? '#991b1b' : '#94a3b8', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 3 }}>{label}</span>
      <span style={{ fontSize: 13, color: accent ? '#7f1d1d' : '#374151', lineHeight: 1.55 }}>{value}</span>
    </div>
  );
}
