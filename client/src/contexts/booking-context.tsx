import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsContext } from './settings-context';
import { addDays, isBefore, isAfter } from 'date-fns';

interface BookingContextType {
  // Duration and timing
  defaultBookingDuration: number; // in minutes
  maxAdvanceBookingDays: number;
  turnaroundTime: number; // in minutes
  useEndingTime: boolean;
  
  // Table management
  emptySeats: number;
  
  // Contact and communication
  contactMethod: 'phone' | 'email' | 'both';
  
  // Cancellation and changes
  allowCancellationAndChanges: boolean;
  cancellationNotice: 'none' | '2h' | '4h' | '24h' | '48h';
  
  // Group bookings
  groupRequest: boolean;
  
  // Helper functions
  getMaxBookingDate: () => Date;
  isDateBookable: (date: Date) => boolean;
  getDefaultEndTime: (startTime: Date) => Date;
  validateBookingDate: (date: Date) => { valid: boolean; message?: string };
  getEffectiveEndTime: (startTime: Date, useCustomDuration?: boolean, customDuration?: number) => Date;
  validateCancellation: (bookingDate: Date) => { allowed: boolean; message?: string };
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
}

export function BookingProvider({ children }: BookingProviderProps) {
  // Try to use settings context, but provide fallback if not available
  let generalSettings, bookingSettings;
  try {
    const settingsContext = useSettingsContext();
    generalSettings = settingsContext.generalSettings;
    bookingSettings = settingsContext.bookingSettings;
  } catch (error) {
    // Fallback to default settings if SettingsProvider is not available
    generalSettings = {
      defaultBookingDuration: 120,
      maxAdvanceBookingDays: 30,
    };
    bookingSettings = {
      turnaroundTime: 0,
      useEndingTime: false,
      emptySeats: 2,
      contactMethod: 'phone',
      allowCancellationAndChanges: true,
      cancellationNotice: 'none',
      groupRequest: false,
    };
  }

  // Merge settings with defaults
  const effectiveBookingSettings = {
    turnaroundTime: 0,
    useEndingTime: false,
    emptySeats: 2,
    contactMethod: 'phone' as const,
    allowCancellationAndChanges: true,
    cancellationNotice: 'none' as const,
    groupRequest: false,
    ...bookingSettings,
  };

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

  const getEffectiveEndTime = (startTime: Date, useCustomDuration?: boolean, customDuration?: number): Date => {
    const endTime = new Date(startTime);
    const duration = useCustomDuration && customDuration 
      ? customDuration 
      : generalSettings.defaultBookingDuration;
    
    endTime.setMinutes(endTime.getMinutes() + duration);
    
    // Add turnaround time if configured
    if (effectiveBookingSettings.turnaroundTime > 0) {
      endTime.setMinutes(endTime.getMinutes() + effectiveBookingSettings.turnaroundTime);
    }
    
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

  const validateCancellation = (bookingDate: Date): { allowed: boolean; message?: string } => {
    if (!effectiveBookingSettings.allowCancellationAndChanges) {
      return {
        allowed: false,
        message: "Cancellations and changes are not allowed for this restaurant"
      };
    }

    if (effectiveBookingSettings.cancellationNotice === 'none') {
      return { allowed: true };
    }

    const now = new Date();
    const noticeHours = {
      '2h': 2,
      '4h': 4,
      '24h': 24,
      '48h': 48,
    }[effectiveBookingSettings.cancellationNotice] || 0;

    const requiredNoticeTime = new Date(bookingDate);
    requiredNoticeTime.setHours(requiredNoticeTime.getHours() - noticeHours);

    if (isBefore(now, requiredNoticeTime)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: `Cancellations require at least ${noticeHours} hour${noticeHours > 1 ? 's' : ''} advance notice`
    };
  };

  return (
    <BookingContext.Provider 
      value={{
        // Duration and timing
        defaultBookingDuration: generalSettings.defaultBookingDuration,
        maxAdvanceBookingDays: generalSettings.maxAdvanceBookingDays,
        turnaroundTime: effectiveBookingSettings.turnaroundTime,
        useEndingTime: effectiveBookingSettings.useEndingTime,
        
        // Table management
        emptySeats: effectiveBookingSettings.emptySeats,
        
        // Contact and communication
        contactMethod: effectiveBookingSettings.contactMethod,
        
        // Cancellation and changes
        allowCancellationAndChanges: effectiveBookingSettings.allowCancellationAndChanges,
        cancellationNotice: effectiveBookingSettings.cancellationNotice,
        
        // Group bookings
        groupRequest: effectiveBookingSettings.groupRequest,
        
        // Helper functions
        getMaxBookingDate,
        isDateBookable,
        getDefaultEndTime,
        validateBookingDate,
        getEffectiveEndTime,
        validateCancellation,
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