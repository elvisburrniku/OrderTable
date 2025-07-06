import { adminStorage } from "./admin-storage";

interface SystemSettings {
  // Platform Identity
  system_name: string;
  system_version: string;
  support_email: string;
  
  // Tenant Management
  max_trial_days: number;
  auto_approve_signups: boolean;
  max_restaurants_per_tenant: number;
  max_users_per_tenant: number;
  default_subscription_plan: string;
  
  // Communication
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  booking_confirmation_emails: boolean;
  reminder_emails_enabled: boolean;
  reminder_hours_before: number;
  
  // Billing & Payments
  default_currency: string;
  enable_stripe_payments: boolean;
  subscription_grace_period_days: number;
  
  // Booking Settings
  max_advance_booking_days: number;
  min_advance_booking_hours: number;
  default_booking_duration_minutes: number;
  enable_guest_bookings: boolean;
  require_phone_for_bookings: boolean;
  
  // System Operations
  maintenance_mode: boolean;
  maintenance_message: string;
  enable_debug_logging: boolean;
  log_retention_days: number;
  session_timeout_hours: number;
  
  // Features
  enable_calendar_integration: boolean;
  enable_widgets: boolean;
  enable_kitchen_management: boolean;
  enable_analytics: boolean;
  enable_multi_language: boolean;
  
  // API & Integration
  api_rate_limit_per_minute: number;
  webhook_timeout_seconds: number;
  enable_api_access: boolean;
}

class SystemSettingsService {
  private static instance: SystemSettingsService;
  private settings: SystemSettings | null = null;
  private lastFetch: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SystemSettingsService {
    if (!SystemSettingsService.instance) {
      SystemSettingsService.instance = new SystemSettingsService();
    }
    return SystemSettingsService.instance;
  }

  async getSettings(): Promise<SystemSettings> {
    const now = new Date();
    
    // Return cached settings if still valid
    if (this.settings && this.lastFetch && 
        (now.getTime() - this.lastFetch.getTime()) < this.CACHE_DURATION) {
      return this.settings;
    }

    try {
      const allSettings = await adminStorage.getAllSystemSettings();
      
      // Convert settings array to object with proper types
      const settingsObject: any = {};
      
      for (const setting of allSettings) {
        let value: any = setting.value;
        
        // Convert based on type
        switch (setting.type) {
          case 'boolean':
            value = value === 'true';
            break;
          case 'number':
            value = parseInt(value, 10);
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch {
              value = null;
            }
            break;
          default:
            // string - keep as is
            break;
        }
        
        settingsObject[setting.key] = value;
      }

      // Set defaults for any missing settings
      this.settings = {
        // Platform Identity
        system_name: settingsObject.system_name || "Restaurant Booking Platform",
        system_version: settingsObject.system_version || "1.0.0",
        support_email: settingsObject.support_email || "support@replit.com",
        
        // Tenant Management
        max_trial_days: settingsObject.max_trial_days || 14,
        auto_approve_signups: settingsObject.auto_approve_signups !== false,
        max_restaurants_per_tenant: settingsObject.max_restaurants_per_tenant || 5,
        max_users_per_tenant: settingsObject.max_users_per_tenant || 25,
        default_subscription_plan: settingsObject.default_subscription_plan || "Free",
        
        // Communication
        enable_email_notifications: settingsObject.enable_email_notifications !== false,
        enable_sms_notifications: settingsObject.enable_sms_notifications === true,
        booking_confirmation_emails: settingsObject.booking_confirmation_emails !== false,
        reminder_emails_enabled: settingsObject.reminder_emails_enabled !== false,
        reminder_hours_before: settingsObject.reminder_hours_before || 24,
        
        // Billing & Payments
        default_currency: settingsObject.default_currency || "EUR",
        enable_stripe_payments: settingsObject.enable_stripe_payments !== false,
        subscription_grace_period_days: settingsObject.subscription_grace_period_days || 7,
        
        // Booking Settings
        max_advance_booking_days: settingsObject.max_advance_booking_days || 90,
        min_advance_booking_hours: settingsObject.min_advance_booking_hours || 2,
        default_booking_duration_minutes: settingsObject.default_booking_duration_minutes || 120,
        enable_guest_bookings: settingsObject.enable_guest_bookings !== false,
        require_phone_for_bookings: settingsObject.require_phone_for_bookings !== false,
        
        // System Operations
        maintenance_mode: settingsObject.maintenance_mode === true,
        maintenance_message: settingsObject.maintenance_message || "System is temporarily under maintenance. Please try again later.",
        enable_debug_logging: settingsObject.enable_debug_logging === true,
        log_retention_days: settingsObject.log_retention_days || 30,
        session_timeout_hours: settingsObject.session_timeout_hours || 24,
        
        // Features
        enable_calendar_integration: settingsObject.enable_calendar_integration !== false,
        enable_widgets: settingsObject.enable_widgets !== false,
        enable_kitchen_management: settingsObject.enable_kitchen_management !== false,
        enable_analytics: settingsObject.enable_analytics !== false,
        enable_multi_language: settingsObject.enable_multi_language !== false,
        
        // API & Integration
        api_rate_limit_per_minute: settingsObject.api_rate_limit_per_minute || 100,
        webhook_timeout_seconds: settingsObject.webhook_timeout_seconds || 30,
        enable_api_access: settingsObject.enable_api_access !== false,
      };

      this.lastFetch = now;
      return this.settings;
    } catch (error) {
      // Check if it's a database connection error
      const errorMessage = error?.message || '';
      const isConnectionError = errorMessage.includes('endpoint is disabled') || 
                               errorMessage.includes('Control plane request failed') ||
                               errorMessage.includes('Connection refused') ||
                               errorMessage.includes('ECONNREFUSED');
      
      if (isConnectionError) {
        console.warn("Database connection unavailable - using cached/default settings");
      } else {
        console.error("Error fetching system settings:", error);
      }
      
      // Return cached settings if available, otherwise return defaults
      if (!this.settings) {
        console.log("Initializing with default system settings due to database unavailability");
        this.settings = this.getDefaultSettings();
      }
      
      return this.settings;
    }
  }

  private getDefaultSettings(): SystemSettings {
    return {
      system_name: "Restaurant Booking Platform",
      system_version: "1.0.0",
      support_email: "support@replit.com",
      max_trial_days: 14,
      auto_approve_signups: true,
      max_restaurants_per_tenant: 5,
      max_users_per_tenant: 25,
      default_subscription_plan: "Free",
      enable_email_notifications: true,
      enable_sms_notifications: false,
      booking_confirmation_emails: true,
      reminder_emails_enabled: true,
      reminder_hours_before: 24,
      default_currency: "USD",
      enable_stripe_payments: true,
      subscription_grace_period_days: 7,
      max_advance_booking_days: 90,
      min_advance_booking_hours: 2,
      default_booking_duration_minutes: 120,
      enable_guest_bookings: true,
      require_phone_for_bookings: true,
      maintenance_mode: false,
      maintenance_message: "System is temporarily under maintenance. Please try again later.",
      enable_debug_logging: false,
      log_retention_days: 30,
      session_timeout_hours: 24,
      enable_calendar_integration: true,
      enable_widgets: true,
      enable_kitchen_management: true,
      enable_analytics: true,
      enable_multi_language: true,
      api_rate_limit_per_minute: 100,
      webhook_timeout_seconds: 30,
      enable_api_access: true,
    };
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.settings = null;
    this.lastFetch = null;
  }

  // Get specific setting
  async getSetting<K extends keyof SystemSettings>(key: K): Promise<SystemSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  // Check if maintenance mode is enabled
  async isMaintenanceMode(): Promise<boolean> {
    return await this.getSetting('maintenance_mode');
  }

  // Check if feature is enabled
  async isFeatureEnabled(feature: keyof Pick<SystemSettings, 
    'enable_email_notifications' | 'enable_sms_notifications' | 'booking_confirmation_emails' | 
    'reminder_emails_enabled' | 'enable_stripe_payments' | 'enable_guest_bookings' | 
    'require_phone_for_bookings' | 'enable_debug_logging' | 'enable_calendar_integration' | 
    'enable_widgets' | 'enable_kitchen_management' | 'enable_analytics' | 
    'enable_multi_language' | 'enable_api_access'>): Promise<boolean> {
    return await this.getSetting(feature);
  }
}

export const systemSettings = SystemSettingsService.getInstance();
export type { SystemSettings };