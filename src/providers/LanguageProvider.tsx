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
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const stored = getStoredData<Language | null>("mila-lang", null);
    if (stored) {
      // User has a saved preference
      setLanguageState(stored);
    } else {
      // Detect from browser language
      const browserLang = navigator.language || "";
      const detected: Language = browserLang.startsWith("en") ? "en" : "es";
      setLanguageState(detected);
    }
  }, []);

  // Sync html lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
