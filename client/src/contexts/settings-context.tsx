
import React, { createContext, useContext, ReactNode } from 'react';
import { useSettings as useSettingsHook, GeneralSettings, RestaurantSettings } from '@/hooks/use-settings';

interface SettingsContextType {
  settings: RestaurantSettings | undefined;
  generalSettings: GeneralSettings;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { settings, generalSettings, isLoading } = useSettingsHook();

  return (
    <SettingsContext.Provider value={{ settings, generalSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
