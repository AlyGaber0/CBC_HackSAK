'use client';
import { use, useEffect, useState } from 'react';
import type { Case, Response, NihSource, TriageOutcome } from '@/lib/types';

const OUTCOME_CONFIG: Record<TriageOutcome, { label: string; color: string; bg: string; border: string }> = {
  self_manageable: { label: 'Self-Manageable', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  monitor:         { label: 'Monitor',          color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  book_appointment:{ label: 'Book Appointment', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent:          { label: 'Urgent',           color: '#991b1b', bg: '#fff1f2', border: '#fecaca' },
};

const DISCLAIMER =
  'This response is for informational purposes only and does not replace professional medical advice. If your symptoms worsen or you have concerns, contact a healthcare provider.';

export default function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [nihOpen, setNihOpen] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const res = await fetch(`/api/cases/${id}`);
        if (!res.ok) return;
        const data: Case = await res.json();
        setCaseData(data);
        if (data.status === 'response_ready') stopped = true;
      } catch {
        // silently retry next interval
      }
    }

    load();
    const interval = setInterval(() => { if (!stopped) load(); }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // ── Loading ────────────────────────────────────────────────────
  if (!caseData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 16px' }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0f2744', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Loading your case…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Processing (AI running — brief state) ─────────────────────
  if (caseData.status === 'processing') {
    return (
      <StatusShell>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 24px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0f2744', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 18px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f2744' }}>Analysing your symptoms</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>
            Our AI is reviewing your intake and cross-referencing NIH clinical data. This takes about 15–30 seconds.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </StatusShell>
    );
  }

  // ── Awaiting / In Review — Q4: B ──────────────────────────────
  if (caseData.status === 'awaiting_review' || caseData.status === 'in_review') {
    const inReview = caseData.status === 'in_review';
    return (
      <StatusShell>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 22px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)' }}>
          {/* Pulse badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 10px', marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>
              {inReview ? 'Provider reviewing' : 'Case received'}
            </span>
          </div>

          <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#0f2744', letterSpacing: '-0.3px' }}>
            {inReview ? 'A provider is reviewing your case' : 'Your case is in the provider queue'}
          </h2>
          <p style={{ margin: '0', fontSize: 13.5, color: '#475569', lineHeight: 1.7 }}>
            {inReview
              ? 'A licensed provider has picked up your case and is composing a response. You\'ll see it here as soon as they submit.'
              : 'Your symptoms have been organised into a clinical brief and added to the provider queue. A licensed provider will review it and write a response.'}
          </p>

          <div style={{ height: 1, background: '#f1f5f9', margin: '18px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
            <span>Most responses arrive within a few hours</span>
            <span>Updates automatically</span>
          </div>
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      </StatusShell>
    );
  }

  // ── Response Ready — Q5: A single scrollable card ─────────────
  if (caseData.status === 'response_ready') {
    const response: Response | undefined = caseData.responses?.[0];
    // Response row not yet committed — keep polling
    if (!response) {
      return (
        <StatusShell>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '32px 24px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)', textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#0f2744', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 18px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f2744' }}>Preparing your response</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Almost there — loading your care guidance.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </StatusShell>
      );
    }

    const cfg = OUTCOME_CONFIG[response.outcome];
    const nihs: NihSource[] = response.nih_sources ?? [];

    return (
      <StatusShell>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 22px', boxShadow: '0 2px 8px rgba(15,39,68,0.06)' }}>

          {/* Outcome badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 7, padding: '7px 13px', marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, background: cfg.color, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>

          {/* Provider message */}
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1e293b', lineHeight: 1.75 }}>
            {response.message}
          </p>

          {/* Conditional fields */}
          {response.followup_days != null && (
            <Detail label="Follow up in" value={`${response.followup_days} day${response.followup_days !== 1 ? 's' : ''}`} />
          )}
          {response.watch_for && (
            <Detail label="Watch for" value={response.watch_for} />
          )}
          {response.provider_type && (
            <Detail label="See a" value={`${response.provider_type}${response.timeframe ? ` within ${response.timeframe}` : ''}`} />
          )}
          {response.urgency_note && (
            <Detail label="Urgent action" value={response.urgency_note} accent />
          )}

          {/* NIH sources — collapsible */}
          {nihs.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginTop: 20 }}>
              <button
                onClick={() => setNihOpen(o => !o)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '11px 14px',
                  background: '#f8fafc',
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <span>NIH Sources ({nihs.length})</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{nihOpen ? '▲' : '▼'}</span>
              </button>
              {nihOpen && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nihs.map((src, i) => (
                    <div key={i}>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12.5, fontWeight: 600, color: '#1d4ed8', textDecoration: 'none', display: 'block', marginBottom: 2 }}
                      >
                        {src.title} ↗
                      </a>
                      <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.55 }}>{src.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Disclaimer — always shown */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>
              {DISCLAIMER}
            </p>
          </div>
        </div>
      </StatusShell>
    );
  }

  return null;
}

// ── Small shared components ────────────────────────────────────

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

function Detail({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? '#fff1f2' : '#f8fafc',
      border: `1px solid ${accent ? '#fecaca' : '#f1f5f9'}`,
      borderRadius: 7,
      padding: '10px 14px',
      marginBottom: 10,
    }}>
      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: accent ? '#991b1b' : '#94a3b8', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: accent ? '#7f1d1d' : '#374151', lineHeight: 1.55 }}>
        {value}
      </span>
    </div>
  );
}
