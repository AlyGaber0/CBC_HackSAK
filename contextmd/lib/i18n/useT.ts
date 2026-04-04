'use client';
import { useLang } from './LanguageContext';
import { translations } from './translations';

export function useT() {
  const { lang } = useLang();
  return translations[lang];
}
