'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Case } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Camera } from 'lucide-react';
import WorklistDevBar from '@/components/WorklistDevBar';
import { useT } from '@/lib/i18n/useT';
import { useLang } from '@/lib/i18n/LanguageContext';
import { translateCaseOption } from '@/lib/i18n/translations';
import { providerFetch } from '@/lib/providerFetch';

const TIER_CONFIG: Record<number, { dot: string; label: string; text: string; border: string }> = {
  1: { dot: '#16a34a', label: 'T1', text: '#15803d', border: '#16a34a' },
  2: { dot: '#ca8a04', label: 'T2', text: '#a16207', border: '#ca8a04' },
  3: { dot: '#ea580c', label: 'T3', text: '#c2410c', border: '#ea580c' },
};

function getAgeColor(isoTimestamp: string): string {
  const hours = (Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000;
  if (hours < 6)  return '#16a34a'; // green  — < 6 h
  if (hours < 12) return '#ca8a04'; // yellow — 6–12 h
  if (hours < 24) return '#ea580c'; // orange — 12–24 h
  return '#dc2626';                 // red    — 24 h+
}

function getProviderId(): string {
  if (typeof window === 'undefined') return 'provider-demo-001';
  try {
    return localStorage.getItem('triaje_provider_id') ?? 'provider-demo-001';
  } catch {
    return 'provider-demo-001';
  }
}

export default function WorklistPage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const wl = t.provider.worklist;
  const [cases, setCases] = useState<Case[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await providerFetch('/api/cases?provider=true');
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && Array.isArray(data)) setCases(data);
      } catch {
        // network error or JSON parse failure — silently skip, retry next interval
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function claimCase(id: string) {
    setClaiming(id);
    try {
      await providerFetch(`/api/cases/${id}/claim`, {
        method: 'POST',
        body: JSON.stringify({ providerId: getProviderId() }),
      });
    } catch {
      // ignore claim errors, still navigate
    }
    router.push(`/case/${id}`);
  }

  const sorted = [...cases].sort((a, b) => {
    if ((b.tier ?? 0) !== (a.tier ?? 0)) return (b.tier ?? 0) - (a.tier ?? 0);
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
  });

  return (
    <>
      <div className="p-6 max-w-5xl mx-auto space-y-5" style={{ paddingBottom: 60 }}>
        {/* Page header */}
        <div className="flex items-baseline justify-between">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
            {wl.title}
          </h1>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{wl.cases(cases.length)}</span>
            <span style={{ width: 7, height: 7, background: '#3b82f6', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{wl.live}</span>
          </div>
        </div>

        {/* Table card */}
        <div style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(15,39,68,0.10), 0 1px 4px rgba(15,39,68,0.06)' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr 18px 90px 100px 80px', padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            {[wl.headers.tier, wl.headers.concern, '', wl.headers.submitted, wl.headers.status, ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.9px', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {sorted.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              {wl.noPending}
            </div>
          ) : (
            sorted.map((c, idx) => {
              const tier = c.tier ?? 1;
              const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
              const isClaimed = c.status === 'in_review';
              const ageColor = getAgeColor(c.claimed_at ?? c.submitted_at);
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '78px 1fr 18px 90px 100px 80px',
                    padding: '13px 20px',
                    background: '#ffffff',
                    borderBottom: idx < sorted.length - 1 ? '1px solid #f8fafc' : 'none',
                    alignItems: 'center',
                    borderLeft: `3px solid ${cfg.border}`,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: cfg.text }}>
                    <span style={{ width: 7, height: 7, background: cfg.dot, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                    {cfg.label}
                  </span>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.1px' }}>
                      {c.symptom_type ? translateCaseOption(c.symptom_type, 'symptomTypes', lang) : 'Unknown concern'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.body_location ? translateCaseOption(c.body_location, 'bodyLocations', lang) : ''}
                      {c.photo_count > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Camera size={10} />
                          {c.photo_count}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 8, height: 8, background: ageColor, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} title={ageColor === '#16a34a' ? '< 6 h' : ageColor === '#ca8a04' ? '6–12 h' : ageColor === '#ea580c' ? '12–24 h' : '24 h+'} />
                  </span>

                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}
                  </span>

                  {isClaimed ? (
                    <span style={{ fontSize: 11, color: '#1d4ed8', background: '#eff6ff', padding: '4px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-block' }}>
                      {wl.badge.inReview}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-block' }}>
                      {wl.badge.awaiting}
                    </span>
                  )}

                  {!isClaimed ? (
                    <button
                      onClick={() => claimCase(c.id)}
                      disabled={claiming === c.id}
                      style={{ padding: '7px 13px', background: claiming === c.id ? '#94a3b8' : '#0f2744', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {claiming === c.id ? wl.btn.claiming : wl.btn.claim}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/case/${c.id}`)}
                      style={{ padding: '7px 13px', background: 'transparent', color: '#0f2744', border: '1.5px solid #cbd5e1', borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {wl.btn.open}
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Legend */}
          <div style={{ padding: '11px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{wl.legend.urgency}:</span>
            {[
              { dot: '#16a34a', text: '#15803d', label: wl.legend.t1 },
              { dot: '#ca8a04', text: '#a16207', label: wl.legend.t2 },
              { dot: '#ea580c', text: '#c2410c', label: wl.legend.t3 },
            ].map(u => (
              <span key={u.label} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: u.text, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, background: u.dot, borderRadius: '50%', display: 'inline-block' }} />
                {u.label}
              </span>
            ))}
            <span style={{ width: 1, height: 14, background: '#e2e8f0', display: 'inline-block' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{wl.legend.wait}:</span>
            {[
              { color: '#16a34a', label: '< 6 h' },
              { color: '#ca8a04', label: '6–12 h' },
              { color: '#ea580c', label: '12–24 h' },
              { color: '#dc2626', label: '24 h+' },
            ].map(w => (
              <span key={w.label} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: w.color, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, background: w.color, borderRadius: '50%', display: 'inline-block' }} />
                {w.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <WorklistDevBar caseCount={cases.length} />
    </>
  );
}
