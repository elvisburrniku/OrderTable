import { readFileSync } from 'fs';
import { join } from 'path';

interface CountryPricing {
  iso: string;
  country: string;
  price: number;
}

interface PhoneNumberInfo {
  country: string;
  iso: string;
  price: number;
  formattedNumber: string;
}

class SMSPricingService {
  private countryPricing: Map<string, CountryPricing> = new Map();
  private countryCodeToISO: Map<string, string> = new Map();
  
  // Common country codes mapping
  private readonly countryCodeMapping: Record<string, string> = {
    '1': 'US',     // USA/Canada
    '44': 'GB',    // United Kingdom
    '33': 'FR',    // France
    '49': 'DE',    // Germany
    '39': 'IT',    // Italy
    '34': 'ES',    // Spain
    '31': 'NL',    // Netherlands
    '32': 'BE',    // Belgium
    '41': 'CH',    // Switzerland
    '43': 'AT',    // Austria
    '45': 'DK',    // Denmark
    '46': 'SE',    // Sweden
    '47': 'NO',    // Norway
    '358': 'FI',   // Finland
    '353': 'IE',   // Ireland
    '351': 'PT',   // Portugal
    '30': 'GR',    // Greece
    '48': 'PL',    // Poland
    '420': 'CZ',   // Czech Republic
    '421': 'SK',   // Slovakia
    '36': 'HU',    // Hungary
    '40': 'RO',    // Romania
    '359': 'BG',   // Bulgaria
    '385': 'HR',   // Croatia
    '386': 'SI',   // Slovenia
    '372': 'EE',   // Estonia
    '371': 'LV',   // Latvia
    '370': 'LT',   // Lithuania
    '7': 'RU',     // Russia
    '380': 'UA',   // Ukraine
    '375': 'BY',   // Belarus
    '381': 'RS',   // Serbia
    '382': 'ME',   // Montenegro
    '383': 'XK',   // Kosovo
    '389': 'MK',   // North Macedonia
    '355': 'AL',   // Albania
    '387': 'BA',   // Bosnia and Herzegovina
    '90': 'TR',    // Turkey
    '972': 'IL',   // Israel
    '971': 'AE',   // UAE
    '966': 'SA',   // Saudi Arabia
    '974': 'QA',   // Qatar
    '965': 'KW',   // Kuwait
    '973': 'BH',   // Bahrain
    '968': 'OM',   // Oman
    '962': 'JO',   // Jordan
    '961': 'LB',   // Lebanon
    '963': 'SY',   // Syria
    '964': 'IQ',   // Iraq
    '98': 'IR',    // Iran
    '93': 'AF',    // Afghanistan
    '92': 'PK',    // Pakistan
    '91': 'IN',    // India
    '880': 'BD',   // Bangladesh
    '94': 'LK',    // Sri Lanka
    '95': 'MM',    // Myanmar
    '66': 'TH',    // Thailand
    '84': 'VN',    // Vietnam
    '60': 'MY',    // Malaysia
    '65': 'SG',    // Singapore
    '62': 'ID',    // Indonesia
    '63': 'PH',    // Philippines
    '82': 'KR',    // South Korea
    '81': 'JP',    // Japan
    '86': 'CN',    // China
    '852': 'HK',   // Hong Kong
    '853': 'MO',   // Macau
    '886': 'TW',   // Taiwan
    '61': 'AU',    // Australia
    '64': 'NZ',    // New Zealand
    '27': 'ZA',    // South Africa
    '234': 'NG',   // Nigeria
    '254': 'KE',   // Kenya
    '233': 'GH',   // Ghana
    '255': 'TZ',   // Tanzania
    '256': 'UG',   // Uganda
    '250': 'RW',   // Rwanda
    '251': 'ET',   // Ethiopia
    '20': 'EG',    // Egypt
    '212': 'MA',   // Morocco
    '216': 'TN',   // Tunisia
    '213': 'DZ',   // Algeria
    '218': 'LY',   // Libya
    '52': 'MX',    // Mexico
    '51': 'PE',    // Peru
    '54': 'AR',    // Argentina
    '55': 'BR',    // Brazil
    '56': 'CL',    // Chile
    '57': 'CO',    // Colombia
    '58': 'VE',    // Venezuela
    '593': 'EC',   // Ecuador
    '591': 'BO',   // Bolivia
    '595': 'PY',   // Paraguay
    '598': 'UY',   // Uruguay
    '506': 'CR',   // Costa Rica
    '507': 'PA',   // Panama
    '504': 'HN',   // Honduras
    '503': 'SV',   // El Salvador
    '502': 'GT',   // Guatemala
    '501': 'BZ',   // Belize
    '505': 'NI',   // Nicaragua
  };

  constructor() {
    this.initializePricing();
  }

  private initializePricing(): void {
    // Default pricing structure based on the provided data
    const defaultPricing: CountryPricing[] = [
      // North America
      { iso: 'US', country: 'United States', price: 0.0075 },
      { iso: 'CA', country: 'Canada', price: 0.0083 },
      { iso: 'MX', country: 'Mexico', price: 0.0525 },
      
      // Europe
      { iso: 'GB', country: 'United Kingdom', price: 0.0525 },
      { iso: 'DE', country: 'Germany', price: 0.0959 },
      { iso: 'FR', country: 'France', price: 0.0959 },
      { iso: 'IT', country: 'Italy', price: 0.0959 },
      { iso: 'ES', country: 'Spain', price: 0.0959 },
      { iso: 'NL', country: 'Netherlands', price: 0.0959 },
      { iso: 'BE', country: 'Belgium', price: 0.1050 },
      { iso: 'CH', country: 'Switzerland', price: 0.0725 },
      { iso: 'AT', country: 'Austria', price: 0.0979 },
      { iso: 'DK', country: 'Denmark', price: 0.0525 },
      { iso: 'SE', country: 'Sweden', price: 0.0666 },
      { iso: 'NO', country: 'Norway', price: 0.0959 },
      { iso: 'FI', country: 'Finland', price: 0.0959 },
      { iso: 'IE', country: 'Ireland', price: 0.0959 },
      { iso: 'PT', country: 'Portugal', price: 0.0525 },
      { iso: 'GR', country: 'Greece', price: 0.0959 },
      { iso: 'PL', country: 'Poland', price: 0.0525 },
      { iso: 'CZ', country: 'Czech Republic', price: 0.0666 },
      { iso: 'SK', country: 'Slovakia', price: 0.0959 },
      { iso: 'HU', country: 'Hungary', price: 0.0959 },
      { iso: 'RO', country: 'Romania', price: 0.0959 },
      { iso: 'BG', country: 'Bulgaria', price: 0.1466 },
      { iso: 'HR', country: 'Croatia', price: 0.0959 },
      { iso: 'SI', country: 'Slovenia', price: 0.0959 },
      { iso: 'EE', country: 'Estonia', price: 0.0959 },
      { iso: 'LV', country: 'Latvia', price: 0.0959 },
      { iso: 'LT', country: 'Lithuania', price: 0.0959 },
      
      // Asia Pacific
      { iso: 'AU', country: 'Australia', price: 0.0515 },
      { iso: 'NZ', country: 'New Zealand', price: 0.0959 },
      { iso: 'JP', country: 'Japan', price: 0.0959 },
      { iso: 'KR', country: 'South Korea', price: 0.0525 },
      { iso: 'CN', country: 'China', price: 0.0386 },
      { iso: 'HK', country: 'Hong Kong', price: 0.0525 },
      { iso: 'SG', country: 'Singapore', price: 0.0525 },
      { iso: 'MY', country: 'Malaysia', price: 0.0525 },
      { iso: 'TH', country: 'Thailand', price: 0.0525 },
      { iso: 'VN', country: 'Vietnam', price: 0.0525 },
      { iso: 'ID', country: 'Indonesia', price: 0.0959 },
      { iso: 'PH', country: 'Philippines', price: 0.0525 },
      { iso: 'IN', country: 'India', price: 0.0525 },
      { iso: 'PK', country: 'Pakistan', price: 0.0959 },
      { iso: 'BD', country: 'Bangladesh', price: 0.3869 },
      { iso: 'LK', country: 'Sri Lanka', price: 0.0959 },
      
      // Middle East
      { iso: 'AE', country: 'United Arab Emirates', price: 0.1092 },
      { iso: 'SA', country: 'Saudi Arabia', price: 0.0525 },
      { iso: 'QA', country: 'Qatar', price: 0.0525 },
      { iso: 'KW', country: 'Kuwait', price: 0.0525 },
      { iso: 'BH', country: 'Bahrain', price: 0.0364 },
      { iso: 'OM', country: 'Oman', price: 0.0959 },
      { iso: 'JO', country: 'Jordan', price: 0.0959 },
      { iso: 'LB', country: 'Lebanon', price: 0.0959 },
      { iso: 'IL', country: 'Israel', price: 0.0525 },
      { iso: 'TR', country: 'Turkey', price: 0.0525 },
      { iso: 'IR', country: 'Iran', price: 0.0959 },
      
      // Africa
      { iso: 'ZA', country: 'South Africa', price: 0.0525 },
      { iso: 'NG', country: 'Nigeria', price: 0.0959 },
      { iso: 'KE', country: 'Kenya', price: 0.0959 },
      { iso: 'GH', country: 'Ghana', price: 0.0959 },
      { iso: 'TZ', country: 'Tanzania', price: 0.0959 },
      { iso: 'UG', country: 'Uganda', price: 0.0959 },
      { iso: 'RW', country: 'Rwanda', price: 0.0959 },
      { iso: 'ET', country: 'Ethiopia', price: 0.0959 },
      { iso: 'EG', country: 'Egypt', price: 0.0959 },
      { iso: 'MA', country: 'Morocco', price: 0.0959 },
      { iso: 'TN', country: 'Tunisia', price: 0.0959 },
      { iso: 'DZ', country: 'Algeria', price: 0.0959 },
      { iso: 'LY', country: 'Libya', price: 0.0959 },
      
      // South America
      { iso: 'BR', country: 'Brazil', price: 0.0599 },
      { iso: 'AR', country: 'Argentina', price: 0.0935 },
      { iso: 'CL', country: 'Chile', price: 0.0742 },
      { iso: 'CO', country: 'Colombia', price: 0.0525 },
      { iso: 'PE', country: 'Peru', price: 0.0525 },
      { iso: 'VE', country: 'Venezuela', price: 0.0525 },
      { iso: 'EC', country: 'Ecuador', price: 0.0959 },
      { iso: 'BO', country: 'Bolivia', price: 0.2215 },
      { iso: 'PY', country: 'Paraguay', price: 0.0525 },
      { iso: 'UY', country: 'Uruguay', price: 0.0959 },
      
      // Central America & Caribbean
      { iso: 'CR', country: 'Costa Rica', price: 0.0420 },
      { iso: 'PA', country: 'Panama', price: 0.0525 },
      { iso: 'HN', country: 'Honduras', price: 0.0959 },
      { iso: 'SV', country: 'El Salvador', price: 0.0959 },
      { iso: 'GT', country: 'Guatemala', price: 0.0959 },
      { iso: 'BZ', country: 'Belize', price: 0.2738 },
      { iso: 'NI', country: 'Nicaragua', price: 0.0959 },
      { iso: 'CU', country: 'Cuba', price: 0.0840 },
      { iso: 'DO', country: 'Dominican Republic', price: 0.0959 },
      { iso: 'JM', country: 'Jamaica', price: 0.0959 },
      { iso: 'TT', country: 'Trinidad and Tobago', price: 0.0959 },
      { iso: 'BB', country: 'Barbados', price: 0.1950 },
      { iso: 'BS', country: 'Bahamas', price: 0.0525 },
      
      // Default fallback for unknown countries
      { iso: 'XX', country: 'Unknown', price: 0.15 }
    ];

    // Populate the pricing map
    defaultPricing.forEach(pricing => {
      this.countryPricing.set(pricing.iso, pricing);
    });

    // Populate country code to ISO mapping
    Object.entries(this.countryCodeMapping).forEach(([code, iso]) => {
      this.countryCodeToISO.set(code, iso);
    });
  }

  /**
   * Parse phone number and extract country information
   */
  private parsePhoneNumber(phoneNumber: string): PhoneNumberInfo {
    // Remove all non-digit characters except +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    const formatted = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
    
    // Extract country code (try different lengths)
    let countryCode = '';
    let iso = 'XX';
    
    // Try 1-4 digit country codes
    for (let i = 1; i <= 4; i++) {
      const testCode = formatted.substring(1, 1 + i);
      if (this.countryCodeToISO.has(testCode)) {
        countryCode = testCode;
        iso = this.countryCodeToISO.get(testCode)!;
        break;
      }
    }
    
    // If no country code found, assume it's an unknown country
    if (!countryCode) {
      countryCode = 'unknown';
      iso = 'XX';
    }
    
    const pricing = this.countryPricing.get(iso) || this.countryPricing.get('XX')!;
    
    return {
      country: pricing.country,
      iso: iso,
      price: pricing.price,
      formattedNumber: formatted
    };
  }

  /**
   * Calculate SMS cost for a phone number
   */
  public calculateSMSCost(phoneNumber: string): number {
    const phoneInfo = this.parsePhoneNumber(phoneNumber);
    return phoneInfo.price;
  }

  /**
   * Get phone number information including country and pricing
   */
  public getPhoneNumberInfo(phoneNumber: string): PhoneNumberInfo {
    return this.parsePhoneNumber(phoneNumber);
  }

  /**
   * Get pricing for a specific country ISO code
   */
  public getPricingForCountry(iso: string): CountryPricing | null {
    return this.countryPricing.get(iso.toUpperCase()) || null;
  }

  /**
   * Get all available countries and their pricing
   */
  public getAllCountryPricing(): CountryPricing[] {
    return Array.from(this.countryPricing.values()).filter(p => p.iso !== 'XX');
  }

  /**
   * Format phone number to international format
   */
  public formatPhoneNumber(phoneNumber: string): string {
    const phoneInfo = this.parsePhoneNumber(phoneNumber);
    return phoneInfo.formattedNumber;
  }

  /**
   * Calculate estimated cost for multiple SMS messages
   */
  public calculateBulkSMSCost(phoneNumbers: string[]): { total: number; breakdown: Array<{ phoneNumber: string; country: string; cost: number }> } {
    const breakdown = phoneNumbers.map(phoneNumber => {
      const phoneInfo = this.parsePhoneNumber(phoneNumber);
      return {
        phoneNumber: phoneNumber,
        country: phoneInfo.country,
        cost: phoneInfo.price
      };
    });

    const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return { total, breakdown };
  }

  /**
   * Get most expensive and cheapest countries for SMS
   */
  public getPricingStats(): { cheapest: CountryPricing; expensive: CountryPricing; average: number } {
    const prices = Array.from(this.countryPricing.values()).filter(p => p.iso !== 'XX');
    const sortedPrices = prices.sort((a, b) => a.price - b.price);
    
    const cheapest = sortedPrices[0];
    const expensive = sortedPrices[sortedPrices.length - 1];
    const average = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

    return { cheapest, expensive, average };
  }
}

// Export singleton instance
export const smsPricingService = new SMSPricingService();
export default smsPricingService;