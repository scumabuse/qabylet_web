"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, Lang, TranslationKey } from "@/lib/translations";

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    const saved = localStorage.getItem('qabilet_lang') as Lang | null;
    if (saved && ['ru', 'kk', 'en'].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Lang) => {
    localStorage.setItem('qabilet_lang', newLang);
    setLangState(newLang);
  };

  const t = (key: TranslationKey): string => {
    return translations[lang][key] ?? translations.ru[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
