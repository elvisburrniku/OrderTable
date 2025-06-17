import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, detectLanguage, translations, Translations } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage first, then fallback to detection
    const stored = localStorage.getItem('readytable-language');
    if (stored && stored in translations) {
      return stored as Language;
    }
    return detectLanguage();
  });

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('readytable-language', newLanguage);
  };

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    translations: translations[language]
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Updated hook for translations that uses the context
export function useTranslations(): Translations {
  const { translations } = useLanguage();
  return translations;
}