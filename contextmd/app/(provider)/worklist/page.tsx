'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Case } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Camera } from 'lucide-react';

const TIER_CONFIG: Record<number, { dot: string; label: string; text: string }> = {
  1: { dot: '#16a34a', label: 'T1', text: '#15803d' },
  2: { dot: '#ca8a04', label: 'T2', text: '#a16207' },
  3: { dot: '#ea580c', label: 'T3', text: '#c2410c' },
};

function getProviderId(): string {
  return typeof window !== 'undefined'
    ? (localStorage.getItem('triaje_provider_id') ?? 'provider-demo-001')
    : 'provider-demo-001';
}

export default function WorklistPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/cases?provider=true')
        .then(r => r.json())
        .then(data => Array.isArray(data) ? setCases(data) : null);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function claimCase(id: string) {
    setClaiming(id);
    await fetch(`/api/cases/${id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: getProviderId() }),
    });
    router.push(`/provider/case/${id}`);
  }

  const sorted = [...cases].sort((a, b) => {
    if ((b.tier ?? 0) !== (a.tier ?? 0)) return (b.tier ?? 0) - (a.tier ?? 0);
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-baseline justify-between">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
          Open Cases
        </h1>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{cases.length} case{cases.length !== 1 ? 's' : ''}</span>
          <span style={{ width: 7, height: 7, background: '#3b82f6', borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(15,39,68,0.10), 0 1px 4px rgba(15,39,68,0.06)' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr 90px 100px 80px', padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          {['Tier', 'Concern', 'Submitted', 'Status', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.9px', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No pending cases. Check back shortly.
          </div>
        ) : (
          sorted.map((c, idx) => {
            const tier = c.tier ?? 1;
            const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
            const isClaimed = c.status === 'in_review';
            return (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '78px 1fr 90px 100px 80px',
                  padding: '13px 20px',
                  background: '#ffffff',
                  borderBottom: idx < sorted.length - 1 ? '1px solid #f8fafc' : 'none',
                  alignItems: 'center',
                  borderLeft: `3px solid ${cfg.dot}`,
                }}
              >
                {/* Tier indicator */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: cfg.text }}>
                  <span style={{ width: 7, height: 7, background: cfg.dot, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                  {cfg.label}
                </span>

                {/* Concern */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.1px' }}>
                    {c.symptom_type || 'Unknown concern'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.body_location}
                    {c.photo_count > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Camera size={10} />
                        {c.photo_count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submitted */}
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {formatDistanceToNow(new Date(c.submitted_at), { addSuffix: true })}
                </span>

                {/* Status badge */}
                {isClaimed ? (
                  <span style={{ fontSize: 11, color: '#1d4ed8', background: '#eff6ff', padding: '4px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-block' }}>
                    In Review
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-block' }}>
                    Awaiting
                  </span>
                )}

                {/* Action button */}
                {!isClaimed ? (
                  <button
                    onClick={() => claimCase(c.id)}
                    disabled={claiming === c.id}
                    style={{ padding: '7px 13px', background: claiming === c.id ? '#94a3b8' : '#0f2744', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {claiming === c.id ? '...' : 'Claim'}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/provider/case/${c.id}`)}
                    style={{ padding: '7px 13px', background: 'transparent', color: '#0f2744', border: '1.5px solid #cbd5e1', borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Open
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Legend */}
        <div style={{ padding: '11px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Urgency:</span>
          {[
            { dot: '#16a34a', text: '#15803d', label: 'T1 Monitor' },
            { dot: '#ca8a04', text: '#a16207', label: 'T2 Appt.' },
            { dot: '#ea580c', text: '#c2410c', label: 'T3 Urgent' },
          ].map(u => (
            <span key={u.label} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: u.text, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, background: u.dot, borderRadius: '50%', display: 'inline-block' }} />
              {u.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
