
import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsContext } from './settings-context';
import { formatDate, formatTime, formatDateTime, TimeFormatOptions } from '@/lib/time-formatter';

interface DateContextType {
  formatDate: (date: string | Date) => string;
  formatTime: (time: string | Date) => string;
  formatDateTime: (datetime: string | Date) => string;
  getDateFormatOptions: () => TimeFormatOptions;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

interface DateProviderProps {
  children: ReactNode;
}

export function DateProvider({ children }: DateProviderProps) {
  // Try to use settings context, but provide fallback if not available
  let generalSettings;
  try {
    const settingsContext = useSettingsContext();
    generalSettings = settingsContext.generalSettings;
  } catch (error) {
    // Fallback to default settings if SettingsProvider is not available
    generalSettings = {
      timeFormat: "24h" as const,
      dateFormat: "DD/MM/YYYY",
      timeZone: "UTC",
    };
  }

  const getDateFormatOptions = (): TimeFormatOptions => ({
    timeFormat: generalSettings.timeFormat as "12h" | "24h",
    dateFormat: generalSettings.dateFormat,
    timeZone: generalSettings.timeZone,
  });

  const formatDateWithSettings = (date: string | Date): string => {
    return formatDate(date, getDateFormatOptions());
  };

  const formatTimeWithSettings = (time: string | Date): string => {
    return formatTime(time, getDateFormatOptions());
  };

  const formatDateTimeWithSettings = (datetime: string | Date): string => {
    return formatDateTime(datetime, getDateFormatOptions());
  };

  return (
    <DateContext.Provider 
      value={{
        formatDate: formatDateWithSettings,
        formatTime: formatTimeWithSettings,
        formatDateTime: formatDateTimeWithSettings,
        getDateFormatOptions,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
}
