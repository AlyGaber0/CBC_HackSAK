'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';

export default function EmergencyPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const t = useT();
  const e = t.emergency;

  if (confirmed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 16px' }}>
        <div style={{ maxWidth: 680, width: '100%' }}>
          <div style={{ background: '#fff8f0', border: '1.5px solid #ef4444', borderRadius: 10, padding: '32px 32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>!</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{e.callHeading}</h1>
            </div>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
              {e.callBody}
            </p>
            <a href="tel:911" style={{ display: 'block', background: '#ef4444', color: 'white', textAlign: 'center', padding: '14px', borderRadius: 8, fontWeight: 700, fontSize: 18, textDecoration: 'none', letterSpacing: '0.5px', marginBottom: 16 }}>
              {e.callBtn}
            </a>
            <button
              onClick={() => setConfirmed(false)}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}
            >
              {e.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 16px' }}>
      <div style={{ maxWidth: 680, width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700, color: '#0f2744', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {e.heading.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#64748b', fontWeight: 400, lineHeight: 1.65 }}>
            {e.subheading}
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
            {e.steps}
          </p>
        </div>

        <div style={{ background: 'white', borderLeft: '3px solid #ef4444', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 2px 8px rgba(15,39,68,0.06)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              {e.checkBadge}
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              {e.checkQuestion}
            </p>
          </div>
          <div style={{ padding: '16px 28px 20px' }}>
            {e.symptoms.map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>&#10003;</span>
          {e.nihBadge}
        </p>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setConfirmed(true)}
            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <span>{e.btnYes}</span>
            <span>&rarr;</span>
          </button>
          <button
            onClick={() => router.push('/chat')}
            style={{ flex: 1, background: '#1a2332', color: 'white', border: 'none', borderRadius: 8, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <span>{e.btnNo}</span>
            <span>&rarr;</span>
          </button>
        </div>

        <p style={{ margin: '20px 0 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>
          {e.disclaimer}
        </p>
      </div>
    </div>
  );
}
