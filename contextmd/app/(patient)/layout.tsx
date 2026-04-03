'use client';
import { useEffect, useState } from 'react';

function ensurePatientId() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('contextmd_patient_id')) {
    localStorage.setItem('contextmd_patient_id', crypto.randomUUID());
  }
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { ensurePatientId(); setReady(true); }, []);
  if (!ready) return null;
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ background: '#0f2744', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, background: '#3b82f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', opacity: 0.9 }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>triaje</span>
        </div>
        <span style={{ fontSize: 11, color: '#334155', margin: '0 4px' }}>|</span>
        <span style={{ fontSize: 11.5, color: '#7dd3fc', fontWeight: 500 }}>Symptom Intake</span>
      </div>
      {children}
    </div>
  );
}
