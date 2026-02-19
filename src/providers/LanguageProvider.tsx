"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  translations,
  type Language,
  type TranslationKey,
} from "@/lib/translations";
import { getStoredData, setStoredData } from "@/lib/utils";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: TranslationKey, key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = getStoredData<Language>("mila-lang", "en");
    if (stored !== "en") setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setStoredData("mila-lang", lang);
  }, []);

  const t = useCallback(
    (section: TranslationKey, key: string): string => {
      const sectionData = translations[section] as Record<
        string,
        Record<Language, string>
      >;
      return sectionData?.[key]?.[language] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
