'use client';
import { useLang } from '@/lib/i18n/LanguageContext';

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
      style={{
        fontSize: 11, fontWeight: 700, color: '#7dd3fc',
        background: 'none', border: '1px solid #334155',
        borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
        letterSpacing: '0.5px', fontFamily: 'inherit',
      }}
      aria-label={lang === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      {lang === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
