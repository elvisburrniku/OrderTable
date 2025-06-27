import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsContext } from './settings-context';
import { addDays, isBefore, isAfter } from 'date-fns';

interface BookingContextType {
  defaultBookingDuration: number; // in minutes
  maxAdvanceBookingDays: number;
  getMaxBookingDate: () => Date;
  isDateBookable: (date: Date) => boolean;
  getDefaultEndTime: (startTime: Date) => Date;
  validateBookingDate: (date: Date) => { valid: boolean; message?: string };
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
}

export function BookingProvider({ children }: BookingProviderProps) {
  // Try to use settings context, but provide fallback if not available
  let generalSettings;
  try {
    const settingsContext = useSettingsContext();
    generalSettings = settingsContext.generalSettings;
  } catch (error) {
    // Fallback to default settings if SettingsProvider is not available
    generalSettings = {
      defaultBookingDuration: 120,
      maxAdvanceBookingDays: 30,
    };
  }

  const getMaxBookingDate = (): Date => {
    return addDays(new Date(), generalSettings.maxAdvanceBookingDays);
  };

  const isDateBookable = (date: Date): boolean => {
    const today = new Date();
    const maxDate = getMaxBookingDate();
    
    // Remove time component for date comparison
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);
    
    return !isBefore(date, today) && !isAfter(date, maxDate);
  };

  const getDefaultEndTime = (startTime: Date): Date => {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + generalSettings.defaultBookingDuration);
    return endTime;
  };

  const validateBookingDate = (date: Date): { valid: boolean; message?: string } => {
    const today = new Date();
    const maxDate = getMaxBookingDate();
    
    if (isBefore(date, today)) {
      return {
        valid: false,
        message: "Cannot create bookings for past dates"
      };
    }
    
    if (isAfter(date, maxDate)) {
      return {
        valid: false,
        message: `Cannot create bookings more than ${generalSettings.maxAdvanceBookingDays} days in advance`
      };
    }
    
    return { valid: true };
  };

  return (
    <BookingContext.Provider 
      value={{
        defaultBookingDuration: generalSettings.defaultBookingDuration,
        maxAdvanceBookingDays: generalSettings.maxAdvanceBookingDays,
        getMaxBookingDate,
        isDateBookable,
        getDefaultEndTime,
        validateBookingDate,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}