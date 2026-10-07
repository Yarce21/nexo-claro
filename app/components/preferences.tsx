'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { translate, type UiLanguage } from '@/lib/i18n';

type Theme = 'light' | 'dark';
const LanguageContext = createContext<{ language: UiLanguage; setLanguage: (value: UiLanguage) => void }>({ language: 'es', setLanguage: () => {} });
export function useUiLanguage() { return useContext(LanguageContext).language; }
export function useTranslation() {
  const language = useUiLanguage();
  return (text: string) => translate(language, text);
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<UiLanguage>('es');
  useEffect(() => {
    try { const saved = localStorage.getItem('nexo-language'); if (saved === 'es' || saved === 'en') setLanguage(saved); } catch { /* Storage can be disabled in private sessions. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate(language, 'Nexo Claro · Centro de operaciones');
    document.querySelector('meta[name="description"]')?.setAttribute('content', translate(language, 'Plataforma de operaciones para leads, precalificación, revisión humana y atribución. Entorno de demostración ficticio.'));
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function PreferenceControls() {
  const t = useTranslation();
  const { language, setLanguage } = useContext(LanguageContext);
  const [theme, setTheme] = useState<Theme>('light');
  const userTheme = useRef(false);
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      if (userTheme.current) return;
      try { if (['light', 'dark'].includes(localStorage.getItem('nexo-theme') || '')) return; } catch { /* Fall back to OS preference. */ }
      const next = media.matches ? 'dark' : 'light'; document.documentElement.dataset.theme = next; setTheme(next);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  function toggle() {
    userTheme.current = true;
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next; setTheme(next);
    try { localStorage.setItem('nexo-theme', next); } catch { /* Keep the current session usable without storage. */ }
  }
  function choose(next: UiLanguage) {
    try { localStorage.setItem('nexo-language', next); } catch { /* Session preference still applies. */ }
    document.documentElement.lang = next;
    setLanguage(next);
  }
  return <div className="preference-controls"><button className="button secondary theme-toggle" type="button" aria-label={`${t('Alternar tema')}: ${t(theme === 'light' ? 'Oscuro' : 'Día')}`} aria-pressed={theme === 'dark'} onClick={toggle}>{t(theme === 'light' ? 'Día' : 'Oscuro')}</button><div className="language-options" role="group" aria-label={t('Idioma de la interfaz')}>{(['es', 'en'] as const).map(lang => <button type="button" key={lang} className="button secondary" aria-label={lang === 'es' ? 'Español' : 'English'} aria-pressed={language === lang} onClick={() => choose(lang)}>{lang.toUpperCase()}</button>)}</div></div>;
}
