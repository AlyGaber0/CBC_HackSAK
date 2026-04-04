'use client';
import { useEffect, useState } from 'react';
import DemoPanel from '@/components/DemoPanel';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useT } from '@/lib/i18n/useT';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function ensurePatientId() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('contextmd_patient_id')) {
    localStorage.setItem('contextmd_patient_id', crypto.randomUUID());
  }
}

function PatientNav() {
  const t = useT();
  return (
    <div style={{ background: '#0f2744', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, background: '#3b82f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>RS</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>RéponSanté</span>
      </div>
      <span style={{ fontSize: 11, color: '#334155', margin: '0 4px' }}>|</span>
      <span style={{ fontSize: 11.5, color: '#7dd3fc', fontWeight: 400 }}>{t.common.navSubtitle}</span>
      <span style={{ marginLeft: 'auto' }}>
        <LanguageToggle />
      </span>
    </div>
  );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { ensurePatientId(); setReady(true); }, []);
  if (!ready) return null;
  return (
    <LanguageProvider>
      <div style={{ minHeight: '100vh', background: '#f8f7f5', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <PatientNav />
        <ErrorBoundary>{children}</ErrorBoundary>
        <DemoPanel />
      </div>
    </LanguageProvider>
  );
}
