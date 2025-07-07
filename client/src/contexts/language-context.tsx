import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, detectLanguage, translations, Translations } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Translations;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en'); // Start with English default
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeLanguage() {
      try {
        const detectedLang = await detectLanguage();
        setLanguageState(detectedLang);
        console.log(`Language initialized: ${detectedLang}`);
      } catch (error) {
        console.log('Language detection failed, using English default');
        setLanguageState('en');
      } finally {
        setIsLoading(false);
      }
    }

    initializeLanguage();
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('readytable-language', newLanguage);
    console.log(`Language changed to: ${newLanguage}`);
  };

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    translations: translations[language],
    isLoading
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