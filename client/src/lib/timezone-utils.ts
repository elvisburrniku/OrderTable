// Comprehensive timezone utilities
export interface TimezoneInfo {
  value: string;
  label: string;
  offset: string;
  country: string;
  city: string;
}

// Auto-detect current timezone
export function getCurrentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone:', error);
    return 'America/New_York';
  }
}

// Format timezone offset
export function formatTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60);
    
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset);
    const minutes = Math.round((absOffset - hours) * 60);
    
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return 'UTC+00:00';
  }
}

// Complete list of world timezones
export const TIMEZONES: TimezoneInfo[] = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time', offset: '', country: 'US', city: 'New York' },
  { value: 'America/Chicago', label: 'Central Time', offset: '', country: 'US', city: 'Chicago' },
  { value: 'America/Denver', label: 'Mountain Time', offset: '', country: 'US', city: 'Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: '', country: 'US', city: 'Los Angeles' },
  { value: 'America/Anchorage', label: 'Alaska Time', offset: '', country: 'US', city: 'Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time', offset: '', country: 'US', city: 'Honolulu' },
  { value: 'America/Toronto', label: 'Eastern Time', offset: '', country: 'CA', city: 'Toronto' },
  { value: 'America/Vancouver', label: 'Pacific Time', offset: '', country: 'CA', city: 'Vancouver' },
  { value: 'America/Mexico_City', label: 'Central Time', offset: '', country: 'MX', city: 'Mexico City' },
  
  // Europe
  { value: 'Europe/London', label: 'Greenwich Mean Time', offset: '', country: 'GB', city: 'London' },
  { value: 'Europe/Paris', label: 'Central European Time', offset: '', country: 'FR', city: 'Paris' },
  { value: 'Europe/Berlin', label: 'Central European Time', offset: '', country: 'DE', city: 'Berlin' },
  { value: 'Europe/Rome', label: 'Central European Time', offset: '', country: 'IT', city: 'Rome' },
  { value: 'Europe/Madrid', label: 'Central European Time', offset: '', country: 'ES', city: 'Madrid' },
  { value: 'Europe/Amsterdam', label: 'Central European Time', offset: '', country: 'NL', city: 'Amsterdam' },
  { value: 'Europe/Brussels', label: 'Central European Time', offset: '', country: 'BE', city: 'Brussels' },
  { value: 'Europe/Zurich', label: 'Central European Time', offset: '', country: 'CH', city: 'Zurich' },
  { value: 'Europe/Vienna', label: 'Central European Time', offset: '', country: 'AT', city: 'Vienna' },
  { value: 'Europe/Copenhagen', label: 'Central European Time', offset: '', country: 'DK', city: 'Copenhagen' },
  { value: 'Europe/Stockholm', label: 'Central European Time', offset: '', country: 'SE', city: 'Stockholm' },
  { value: 'Europe/Oslo', label: 'Central European Time', offset: '', country: 'NO', city: 'Oslo' },
  { value: 'Europe/Helsinki', label: 'Eastern European Time', offset: '', country: 'FI', city: 'Helsinki' },
  { value: 'Europe/Dublin', label: 'Greenwich Mean Time', offset: '', country: 'IE', city: 'Dublin' },
  { value: 'Europe/Lisbon', label: 'Western European Time', offset: '', country: 'PT', city: 'Lisbon' },
  { value: 'Europe/Athens', label: 'Eastern European Time', offset: '', country: 'GR', city: 'Athens' },
  { value: 'Europe/Warsaw', label: 'Central European Time', offset: '', country: 'PL', city: 'Warsaw' },
  { value: 'Europe/Prague', label: 'Central European Time', offset: '', country: 'CZ', city: 'Prague' },
  { value: 'Europe/Moscow', label: 'Moscow Time', offset: '', country: 'RU', city: 'Moscow' },
  
  // Asia
  { value: 'Asia/Tokyo', label: 'Japan Standard Time', offset: '', country: 'JP', city: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'China Standard Time', offset: '', country: 'CN', city: 'Shanghai' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time', offset: '', country: 'HK', city: 'Hong Kong' },
  { value: 'Asia/Singapore', label: 'Singapore Time', offset: '', country: 'SG', city: 'Singapore' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time', offset: '', country: 'KR', city: 'Seoul' },
  { value: 'Asia/Taipei', label: 'Taiwan Time', offset: '', country: 'TW', city: 'Taipei' },
  { value: 'Asia/Bangkok', label: 'Indochina Time', offset: '', country: 'TH', city: 'Bangkok' },
  { value: 'Asia/Jakarta', label: 'Western Indonesian Time', offset: '', country: 'ID', city: 'Jakarta' },
  { value: 'Asia/Manila', label: 'Philippines Time', offset: '', country: 'PH', city: 'Manila' },
  { value: 'Asia/Kolkata', label: 'India Standard Time', offset: '', country: 'IN', city: 'Mumbai' },
  { value: 'Asia/Karachi', label: 'Pakistan Standard Time', offset: '', country: 'PK', city: 'Karachi' },
  { value: 'Asia/Dhaka', label: 'Bangladesh Time', offset: '', country: 'BD', city: 'Dhaka' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time', offset: '', country: 'AE', city: 'Dubai' },
  { value: 'Asia/Riyadh', label: 'Arabian Standard Time', offset: '', country: 'SA', city: 'Riyadh' },
  { value: 'Asia/Tehran', label: 'Iran Standard Time', offset: '', country: 'IR', city: 'Tehran' },
  { value: 'Asia/Istanbul', label: 'Turkey Time', offset: '', country: 'TR', city: 'Istanbul' },
  
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Australian Eastern Time', offset: '', country: 'AU', city: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time', offset: '', country: 'AU', city: 'Melbourne' },
  { value: 'Australia/Brisbane', label: 'Australian Eastern Time', offset: '', country: 'AU', city: 'Brisbane' },
  { value: 'Australia/Perth', label: 'Australian Western Time', offset: '', country: 'AU', city: 'Perth' },
  { value: 'Australia/Adelaide', label: 'Australian Central Time', offset: '', country: 'AU', city: 'Adelaide' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time', offset: '', country: 'NZ', city: 'Auckland' },
  { value: 'Pacific/Fiji', label: 'Fiji Time', offset: '', country: 'FJ', city: 'Suva' },
  
  // Africa
  { value: 'Africa/Cairo', label: 'Eastern European Time', offset: '', country: 'EG', city: 'Cairo' },
  { value: 'Africa/Johannesburg', label: 'South Africa Time', offset: '', country: 'ZA', city: 'Johannesburg' },
  { value: 'Africa/Lagos', label: 'West Africa Time', offset: '', country: 'NG', city: 'Lagos' },
  { value: 'Africa/Nairobi', label: 'East Africa Time', offset: '', country: 'KE', city: 'Nairobi' },
  { value: 'Africa/Casablanca', label: 'Western European Time', offset: '', country: 'MA', city: 'Casablanca' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'Brasília Time', offset: '', country: 'BR', city: 'São Paulo' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time', offset: '', country: 'AR', city: 'Buenos Aires' },
  { value: 'America/Lima', label: 'Peru Time', offset: '', country: 'PE', city: 'Lima' },
  { value: 'America/Bogota', label: 'Colombia Time', offset: '', country: 'CO', city: 'Bogotá' },
  { value: 'America/Caracas', label: 'Venezuela Time', offset: '', country: 'VE', city: 'Caracas' },
  { value: 'America/Santiago', label: 'Chile Time', offset: '', country: 'CL', city: 'Santiago' },
].map(tz => ({
  ...tz,
  offset: formatTimezoneOffset(tz.value)
}));

// Get timezone with auto-detection
export function getTimezoneWithAutoDetection(): TimezoneInfo[] {
  const current = getCurrentTimezone();
  const timezones = [...TIMEZONES];
  
  // Mark current timezone
  const currentTzIndex = timezones.findIndex(tz => tz.value === current);
  if (currentTzIndex >= 0) {
    timezones[currentTzIndex] = {
      ...timezones[currentTzIndex],
      label: `${timezones[currentTzIndex].label} (Current)`
    };
    
    // Move current timezone to top
    const currentTz = timezones.splice(currentTzIndex, 1)[0];
    timezones.unshift(currentTz);
  }
  
  return timezones;
}

// Search timezones
export function searchTimezones(query: string): TimezoneInfo[] {
  const lowerQuery = query.toLowerCase();
  return TIMEZONES.filter(tz => 
    tz.label.toLowerCase().includes(lowerQuery) ||
    tz.city.toLowerCase().includes(lowerQuery) ||
    tz.country.toLowerCase().includes(lowerQuery) ||
    tz.value.toLowerCase().includes(lowerQuery)
  );
}