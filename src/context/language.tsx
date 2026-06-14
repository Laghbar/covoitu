import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'fr';

type LanguageContextType = {
  lang: Lang;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  toggle: () => {},
});

const STORAGE_KEY = 'horizon_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'en' || v === 'fr') setLang(v);
    });
  }, []);

  const toggle = () => {
    setLang(prev => {
      const next = prev === 'en' ? 'fr' : 'en';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Inline translation helper — call once per component */
export function useLang() {
  const { lang } = useLanguage();
  return (en: string, fr: string) => (lang === 'en' ? en : fr);
}
