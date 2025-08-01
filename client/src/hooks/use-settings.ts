
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export interface GeneralSettings {
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  defaultBookingDuration: number;
  maxAdvanceBookingDays: number;
  currency: string;
  language: string;
}

export interface RestaurantSettings {
  generalSettings: GeneralSettings;
  emailSettings: any;
  bookingSettings: any;
  notificationSettings: any;
}

export function useSettings() {
  const { restaurant } = useAuth();
  
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Always call this hook to maintain consistent hook order
  const { data: bookingConfig, isLoading: configLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/booking-config`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  // Priority: bookingConfig (no validation) > settings > defaults
  const generalSettings: GeneralSettings = {
    timeZone: bookingConfig?.timeZone || settings?.generalSettings?.timeZone || "America/New_York",
    dateFormat: settings?.generalSettings?.dateFormat || "MM/dd/yyyy",
    timeFormat: settings?.generalSettings?.timeFormat || "12h",
    defaultBookingDuration: bookingConfig?.defaultBookingDuration || settings?.generalSettings?.defaultBookingDuration || 120,
    maxAdvanceBookingDays: bookingConfig?.maxAdvanceBookingDays || settings?.generalSettings?.maxAdvanceBookingDays || 30,
    currency: bookingConfig?.currency || settings?.generalSettings?.currency || "USD",
    language: settings?.generalSettings?.language || "en",
  };

  return {
    settings: settings as RestaurantSettings,
    generalSettings,
    isLoading: settingsLoading || configLoading
  };
}
