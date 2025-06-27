import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsContext } from './settings-context';
import { formatCurrency, formatPrice, getCurrencySymbol, CurrencyFormatOptions } from '@/lib/currency-formatter';

interface CurrencyContextType {
  formatCurrency: (amount: number, options?: CurrencyFormatOptions) => string;
  formatPrice: (price: number) => string;
  getCurrencySymbol: () => string;
  currency: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  // Try to use settings context, but provide fallback if not available
  let generalSettings;
  try {
    const settingsContext = useSettingsContext();
    generalSettings = settingsContext.generalSettings;
  } catch (error) {
    // Fallback to default settings if SettingsProvider is not available
    generalSettings = {
      currency: "USD",
    };
  }

  const formatCurrencyWithSettings = (amount: number, options: CurrencyFormatOptions = {}): string => {
    return formatCurrency(amount, {
      currency: generalSettings.currency,
      ...options,
    });
  };

  const formatPriceWithSettings = (price: number): string => {
    return formatPrice(price, generalSettings);
  };

  const getCurrencySymbolFromSettings = (): string => {
    return getCurrencySymbol(generalSettings.currency);
  };

  return (
    <CurrencyContext.Provider 
      value={{
        formatCurrency: formatCurrencyWithSettings,
        formatPrice: formatPriceWithSettings,
        getCurrencySymbol: getCurrencySymbolFromSettings,
        currency: generalSettings.currency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}