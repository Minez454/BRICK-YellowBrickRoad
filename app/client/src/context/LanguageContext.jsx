import { createContext, useContext, useState } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  const toggleLang = () => {
    const next = lang === 'en' ? 'es' : 'en';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
