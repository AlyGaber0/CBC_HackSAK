'use client';
import React, { use, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Case, Response, NihSource, TriageOutcome, NavigationAction } from '@/lib/types';

const OUTCOME_CONFIG: Record<TriageOutcome, { label: string; color: string; bg: string; border: string }> = {
  self_manageable: { label: 'Self-Manageable', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  monitor:         { label: 'Monitor',          color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  book_appointment:{ label: 'Book Appointment', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent:          { label: 'Urgent',           color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
};

const NAV_CONFIG: Record<NavigationAction, { icon: React.JSX.Element; label: string; detail: string; color: string; bg: string; border: string }> = {
  stay_home:        { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Stay home & rest',         detail: 'Manage your symptoms at home with the self-care guidance below.',                                                    color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  call_811:         { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label: 'Call 811 (Info-Santé)',     detail: 'Speak with a registered nurse 24/7 for guidance. Free, confidential, available in English and French.',            color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  see_pharmacist:   { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>, label: 'See your pharmacist',       detail: 'Quebec pharmacists can prescribe for this type of concern. Visit any pharmacy — no appointment needed.',           color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  walk_in_soon:     { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, label: 'Visit a walk-in clinic',    detail: 'See a provider at a walk-in clinic or CLSC within the next 2\u20135 days. No referral needed.',                        color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  book_appointment: { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Book an appointment',       detail: 'Schedule a follow-up with your healthcare provider or request a specialist referral.',                             color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  er_now:           { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, label: 'Go to Emergency now',       detail: 'Your symptoms need same-day evaluation. Go to your nearest emergency department or call 911 if worsening rapidly.', color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
};

const DISCLAIMER =
  'This response is for informational purposes only and does not replace professional medical advice. If your symptoms worsen or you have concerns, contact a healthcare provider.';

export default function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusHint = searchParams.get('status');

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
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 16 }}>Loading your case\u2026</p>
        </div>
      </div>
    );
  }

  if (effectiveStatus === 'processing') {
    return (
      <StatusShell>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 24px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)', textAlign: 'center' }}>
          <Spinner size={32} style={{ margin: '0 auto 18px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f2744' }}>Analysing your symptoms</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>
            Our AI is reviewing your intake and cross-referencing NIH clinical data. This takes about 15\u201330 seconds.
          </p>
        </div>
      </StatusShell>
    );
  }

  if (effectiveStatus === 'awaiting_review' || effectiveStatus === 'in_review') {
    const inReview = effectiveStatus === 'in_review';
    const navAction = caseData?.navigation_action;
    const nav = navAction ? NAV_CONFIG[navAction as NavigationAction] : null;
    return (
      <StatusShell>
        {nav && (
          <div style={{ background: nav.bg, border: `1.5px solid ${nav.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 14, boxShadow: '0 2px 8px rgba(15,39,68,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: nav.color, lineHeight: 1, flexShrink: 0 }}>{nav.icon}</span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: nav.color }}>{nav.label}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: nav.color, opacity: 0.85, lineHeight: 1.6 }}>{nav.detail}</p>
              </div>
            </div>
          </div>
        )}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 22px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 10px', marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>
              {inReview ? 'Provider reviewing' : 'Case received'}
            </span>
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#0f2744', letterSpacing: '-0.3px' }}>
            {inReview ? 'A provider is reviewing your case' : 'Your case is in the provider queue'}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.7 }}>
            {inReview
              ? "A licensed provider has picked up your case and is composing a response. You'll see it here as soon as they submit."
              : 'Your symptoms have been organised into a clinical brief and added to the provider queue. A licensed provider will review it and write a response.'}
          </p>
          <div style={{ height: 1, background: '#f1f5f9', margin: '18px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
            <span>Most responses arrive within a few hours</span>
            <span>Updates automatically every 3s</span>
          </div>
        </div>
        {/* 911 button even while waiting */}
        <EmergencyFooter />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      </StatusShell>
    );
  }

  if (effectiveStatus === 'response_ready') {
    const response: Response | undefined = caseData?.responses?.[0];

    if (!response) {
      return (
        <StatusShell>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 24px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)', textAlign: 'center' }}>
            <Spinner size={32} style={{ margin: '0 auto 18px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f2744' }}>Preparing your response</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Almost there \u2014 loading your care guidance.</p>
          </div>
        </StatusShell>
      );
    }

    const cfg = response.outcome && OUTCOME_CONFIG[response.outcome]
      ? OUTCOME_CONFIG[response.outcome]
      : OUTCOME_CONFIG.self_manageable;
    const nihs: NihSource[] = response.nih_sources ?? [];
    const hasSBAR = response.sbar_situation || response.sbar_background || response.sbar_assessment || response.sbar_recommendation;

    return (
      <StatusShell>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 22px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)' }}>
          {/* Outcome badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 7, padding: '7px 13px', marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, background: cfg.color, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>

          {hasSBAR ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {response.sbar_situation && <SbarSection label="Situation" text={response.sbar_situation} />}
              {response.sbar_background && <SbarSection label="Background" text={response.sbar_background} />}
              {response.sbar_assessment && <SbarSection label="Assessment" text={response.sbar_assessment} />}
              {response.sbar_recommendation && <SbarSection label="Recommendation" text={response.sbar_recommendation} bold />}
            </div>
          ) : (
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1e293b', lineHeight: 1.75 }}>
              {response.message}
            </p>
          )}

          {response.followup_days != null && <Detail label="Follow up in" value={`${response.followup_days} day${response.followup_days !== 1 ? 's' : ''}`} />}
          {response.watch_for && <Detail label="Watch for" value={response.watch_for} />}
          {response.provider_type && <Detail label="See a" value={`${response.provider_type}${response.timeframe ? ` within ${response.timeframe}` : ''}`} />}
          {response.urgency_note && <Detail label="Urgent action" value={response.urgency_note} accent />}

          {nihs.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: 20 }}>
              <button
                onClick={() => setNihOpen(o => !o)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: '#f8fafc', border: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                <span>NIH Sources ({nihs.length})</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{nihOpen ? '\u25b2' : '\u25bc'}</span>
              </button>
              {nihOpen && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nihs.map((src, i) => (
                    <div key={i}>
                      <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: '#1d4ed8', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                        {src.title} \u2197
                      </a>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.55 }}>{src.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>{DISCLAIMER}</p>
          </div>
        </div>

        {/* ── Post-response actions ── */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Submit another case */}
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
            Submit another concern
          </button>

          {/* Back to home */}
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
            Back to home
          </button>
        </div>

        {/* 911 emergency button */}
        <EmergencyFooter />
      </StatusShell>
    );
  }

  return null;
}

// ── Emergency footer (shown on all terminal states) ──────────────
function EmergencyFooter() {
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
        Call 911 — If this is an emergency
      </a>
      <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
        If you believe you are in immediate danger, call 911 or go to your nearest emergency department.
      </p>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────

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

function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px 60px' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Case Status</p>
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
