'use client';
import { useEffect, useState } from 'react';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useT } from '@/lib/i18n/useT';

function setProviderRole() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('triaje_role', 'provider');
    localStorage.setItem('triaje_provider_id', localStorage.getItem('triaje_provider_id') ?? 'provider-demo-001');
    // Store provider auth token (read from env, falls back to any ?key= URL param)
    const envToken = process.env.NEXT_PUBLIC_PROVIDER_SECRET ?? '';
    const urlToken = new URLSearchParams(window.location.search).get('key') ?? '';
    const token = envToken || urlToken;
    if (token) localStorage.setItem('triaje_provider_token', token);
  }
}

function ProviderNav() {
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
      <span style={{ fontSize: 11.5, color: '#7dd3fc', fontWeight: 500 }}>{t.provider.navSubtitle}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{t.provider.demoMode}</span>
        <LanguageToggle />
      </span>
    </div>
  );
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setProviderRole(); setReady(true); }, []);
  if (!ready) return null;
  return (
    <LanguageProvider storageKey="triaje_provider_lang">
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <ProviderNav />
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </LanguageProvider>
  );
}
