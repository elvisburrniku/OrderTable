
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
  
  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/tenants/${restaurant?.tenantId}/restaurants/${restaurant?.id}/settings`],
    enabled: !!restaurant?.id && !!restaurant?.tenantId,
  });

  const generalSettings: GeneralSettings = {
    timeZone: "America/New_York",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "12h",
    defaultBookingDuration: 120,
    maxAdvanceBookingDays: 30,
    currency: "USD",
    language: "en",
    ...settings?.generalSettings
  };

  return {
    settings: settings as RestaurantSettings,
    generalSettings,
    isLoading
  };
}
