'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import type { Lang } from './translations';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  ready: boolean;
}

const LanguageContext = createContext<LangContextValue>({ lang: 'en', setLang: () => {}, ready: false });

export function LanguageProvider({ children, storageKey = 'triaje_lang' }: { children: React.ReactNode; storageKey?: string }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Lang | null;
      if (stored === 'fr') setLangState('fr');
    } catch { /* localStorage blocked */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem(storageKey, l); } catch { /* blocked */ }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
