'use client';
import { useRouter } from 'next/navigation';

export default function WorklistDevBar({ caseCount }: { caseCount: number }) {
  const router = useRouter();
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0f2744', color: '#94a3b8',
      borderTop: '1px solid #1e3a5f',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      fontSize: 12, fontFamily: 'Inter, monospace',
      zIndex: 9999,
    }}>
      <span style={{ color: '#3b82f6', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: 11 }}>DEV</span>
      <span style={{ color: '#475569' }}>|</span>
      <span>{caseCount} case{caseCount !== 1 ? 's' : ''} in queue</span>
      <span style={{ color: '#475569' }}>|</span>
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'none', border: '1px solid #1e3a5f',
          color: '#94a3b8', borderRadius: 5, padding: '4px 10px',
          fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        ← Patient Home
      </button>
      <button
        onClick={() => router.push('/intake')}
        style={{
          background: 'none', border: '1px solid #1e3a5f',
          color: '#94a3b8', borderRadius: 5, padding: '4px 10px',
          fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        + New Patient Case
      </button>
    </div>
  );
}
