'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const DISCLAIMER =
  'Triaje does not provide medical diagnosis or treatment. Responses are for informational purposes only and do not replace professional medical advice. In a life-threatening emergency, always call 911.';

export default function EmergencyPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 16px' }}>
        <div style={{ maxWidth: 680, width: '100%' }}>
          <div style={{ background: '#fff8f0', border: '1.5px solid #ef4444', borderRadius: 10, padding: '32px 32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>!</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Call Emergency Services</h1>
            </div>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
              If you or someone else is in immediate danger, call emergency services right away. Do not wait.
            </p>
            <a href="tel:911" style={{ display: 'block', background: '#ef4444', color: 'white', textAlign: 'center', padding: '14px', borderRadius: 8, fontWeight: 700, fontSize: 18, textDecoration: 'none', letterSpacing: '0.5px', marginBottom: 16 }}>
              Call 911
            </a>
            <button
              onClick={() => setConfirmed(false)}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}
            >
              ← Back
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
            Describe your concern.<br />Get clinical guidance.
          </h1>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: '#64748b', fontWeight: 400, lineHeight: 1.65 }}>
            Triaje helps you describe your symptoms and get asynchronous clinical guidance. It is not a substitute for emergency care.
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
            1. Describe your symptoms &rarr; 2. We organize your case &rarr; 3. Get a response grounded in NIH clinical data
          </p>
        </div>

        <div style={{ background: 'white', borderLeft: '3px solid #ef4444', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 2px 8px rgba(15,39,68,0.06)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Emergency check
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Are you experiencing any of the following right now?
            </p>
          </div>
          <div style={{ padding: '16px 28px 20px' }}>
            {[
              'Chest pain or pressure',
              'Difficulty breathing or shortness of breath',
              'Signs of stroke — face drooping, arm weakness, speech difficulty',
              'Severe bleeding or trauma',
              'Loss of consciousness or confusion',
              'Severe allergic reaction',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>&#10003;</span>
          Responses grounded in NIH MedlinePlus and PubMed clinical literature.
        </p>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setConfirmed(true)}
            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <span>Yes, I may be having an emergency</span>
            <span>→</span>
          </button>
          <button
            onClick={() => router.push('/chat')}
            style={{ flex: 1, background: '#1a2332', color: 'white', border: 'none', borderRadius: 8, padding: '11px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <span>No, continue to symptom intake</span>
            <span>→</span>
          </button>
        </div>

        <p style={{ margin: '20px 0 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6 }}>
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
