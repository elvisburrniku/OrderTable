import { systemSettings } from "./system-settings";
import { storage } from "./storage";

export class SystemSettingsValidator {
  static async validateTenantRestaurantLimit(tenantId: number): Promise<{ valid: boolean; message?: string }> {
    try {
      const maxRestaurants = await systemSettings.getSetting('max_restaurants_per_tenant');
      const currentRestaurants = await storage.getRestaurantsByTenant(tenantId);
      
      if (currentRestaurants.length >= maxRestaurants) {
        return {
          valid: false,
          message: `Maximum of ${maxRestaurants} restaurants allowed per tenant. Please upgrade your plan or contact support.`
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error("Error validating restaurant limit:", error);
      return { valid: true }; // Allow operation if validation fails
    }
  }

  static async validateTenantUserLimit(tenantId: number): Promise<{ valid: boolean; message?: string }> {
    try {
      const maxUsers = await systemSettings.getSetting('max_users_per_tenant');
      const currentUsers = await storage.getTenantUsers(tenantId);
      
      if (currentUsers.length >= maxUsers) {
        return {
          valid: false,
          message: `Maximum of ${maxUsers} users allowed per tenant. Please upgrade your plan or contact support.`
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error("Error validating user limit:", error);
      return { valid: true }; // Allow operation if validation fails
    }
  }

  static async validateBookingTiming(bookingDate: Date): Promise<{ valid: boolean; message?: string }> {
    try {
      const maxAdvanceDays = await systemSettings.getSetting('max_advance_booking_days');
      const minAdvanceHours = await systemSettings.getSetting('min_advance_booking_hours');
      
      const now = new Date();
      const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const daysUntilBooking = hoursUntilBooking / 24;
      
      if (hoursUntilBooking < minAdvanceHours) {
        return {
          valid: false,
          message: `Bookings must be made at least ${minAdvanceHours} hours in advance.`
        };
      }
      
      if (daysUntilBooking > maxAdvanceDays) {
        return {
          valid: false,
          message: `Bookings can only be made up to ${maxAdvanceDays} days in advance.`
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error("Error validating booking timing:", error);
      return { valid: true }; // Allow operation if validation fails
    }
  }

  static async getDefaultBookingDuration(): Promise<number> {
    try {
      return await systemSettings.getSetting('default_booking_duration_minutes');
    } catch (error) {
      console.error("Error getting default booking duration:", error);
      return 120; // Default 2 hours
    }
  }

  static async shouldRequirePhoneForBookings(): Promise<boolean> {
    try {
      return await systemSettings.getSetting('require_phone_for_bookings');
    } catch (error) {
      console.error("Error checking phone requirement:", error);
      return false;
    }
  }

  static async isFeatureEnabled(feature: string): Promise<boolean> {
    try {
      switch (feature) {
        case 'guest_bookings':
          return await systemSettings.isFeatureEnabled('enable_guest_bookings');
        case 'email_notifications':
          return await systemSettings.isFeatureEnabled('enable_email_notifications');
        case 'sms_notifications':
          return await systemSettings.isFeatureEnabled('enable_sms_notifications');
        case 'calendar_integration':
          return await systemSettings.isFeatureEnabled('enable_calendar_integration');
        case 'widgets':
          return await systemSettings.isFeatureEnabled('enable_widgets');
        case 'kitchen_management':
          return await systemSettings.isFeatureEnabled('enable_kitchen_management');
        case 'analytics':
          return await systemSettings.isFeatureEnabled('enable_analytics');
        case 'api_access':
          return await systemSettings.isFeatureEnabled('enable_api_access');
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking feature ${feature}:`, error);
      return false;
    }
  }

  static async getSystemInfo(): Promise<{ name: string; version: string; supportEmail: string }> {
    try {
      return {
        name: await systemSettings.getSetting('system_name'),
        version: await systemSettings.getSetting('system_version'),
        supportEmail: await systemSettings.getSetting('support_email')
      };
    } catch (error) {
      console.error("Error getting system info:", error);
      return {
        name: "Restaurant Booking Platform",
        version: "1.0.0",
        supportEmail: "support@replit.com"
      };
    }
  }

  static async getCurrencySettings(): Promise<{ defaultCurrency: string; stripeEnabled: boolean }> {
    try {
      return {
        defaultCurrency: await systemSettings.getSetting('default_currency'),
        stripeEnabled: await systemSettings.isFeatureEnabled('enable_stripe_payments')
      };
    } catch (error) {
      console.error("Error getting currency settings:", error);
      return {
        defaultCurrency: "USD",
        stripeEnabled: true
      };
    }
  }
}