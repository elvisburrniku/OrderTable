import { GeneralSettings } from "@/hooks/use-settings";

export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = "USD",
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  // Handle amounts in cents (divide by 100)
  const actualAmount = amount > 1000 ? amount / 100 : amount;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(actualAmount);
}

export function formatPrice(
  price: number,
  settings: GeneralSettings
): string {
  return formatCurrency(price, {
    currency: settings.currency,
    locale: getCurrencyLocale(settings.currency),
  });
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
    CHF: "CHF",
    NOK: "kr",
    SEK: "kr",
    DKK: "kr",
  };
  
  return symbols[currency] || currency;
}

export function getCurrencyLocale(currency: string): string {
  const locales: Record<string, string> = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    CAD: "en-CA",
    AUD: "en-AU",
    JPY: "ja-JP",
    CHF: "de-CH",
    NOK: "nb-NO",
    SEK: "sv-SE",
    DKK: "da-DK",
  };
  
  return locales[currency] || "en-US";
}

export function getSupportedCurrencies() {
  return [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
    { code: "DKK", name: "Danish Krone", symbol: "kr" },
  ];
}