import { adminStorage } from "./admin-storage";
import bcrypt from "bcrypt";

export async function initializeAdminSystem() {
  try {
    console.log("Initializing admin system...");
    
    // Check if any admin users exist
    const existingAdmins = await adminStorage.getAllAdminUsers();
    
    if (existingAdmins.length === 0) {
      console.log("No admin users found. Creating default super admin...");
      
      // Create default super admin
      const defaultAdmin = await adminStorage.createAdminUser({
        email: "admin@replit.com",
        password: "admin123456", // This should be changed immediately
        name: "System Administrator",
        role: "super_admin",
        isActive: true,
      });
      
      console.log(`Created default super admin: ${defaultAdmin.email}`);
      console.log("IMPORTANT: Change the default password immediately!");
      
      // Log the creation
      await adminStorage.addSystemLog({
        level: "info",
        message: "Default super admin created",
        data: JSON.stringify({ adminId: defaultAdmin.id, email: defaultAdmin.email }),
        source: "system_init",
        adminUserId: defaultAdmin.id,
      });
    }
    
    // Initialize comprehensive system settings
    const defaultSettings = [
      // Platform Identity
      {
        key: "system_name",
        value: "Restaurant Booking Platform",
        description: "The name of the platform displayed in admin interface",
        type: "string"
      },
      {
        key: "system_version",
        value: "1.0.0",
        description: "Current platform version",
        type: "string"
      },
      {
        key: "support_email",
        value: "support@replit.com",
        description: "Email address for platform support",
        type: "string"
      },
      
      // Tenant Management
      {
        key: "max_trial_days",
        value: "14",
        description: "Default trial period for new tenants",
        type: "number"
      },
      {
        key: "auto_approve_signups",
        value: "true",
        description: "Automatically approve new tenant registrations",
        type: "boolean"
      },
      {
        key: "max_restaurants_per_tenant",
        value: "5",
        description: "Maximum restaurants allowed per tenant",
        type: "number"
      },
      {
        key: "max_users_per_tenant",
        value: "25",
        description: "Maximum users allowed per tenant",
        type: "number"
      },
      
      // Communication
      {
        key: "enable_email_notifications",
        value: "true",
        description: "Enable system-wide email notifications",
        type: "boolean"
      },
      {
        key: "enable_sms_notifications",
        value: "false",
        description: "Enable SMS notifications (requires Twilio)",
        type: "boolean"
      },
      {
        key: "booking_confirmation_emails",
        value: "true",
        description: "Send email confirmations for bookings",
        type: "boolean"
      },
      {
        key: "reminder_emails_enabled",
        value: "true",
        description: "Send reminder emails before bookings",
        type: "boolean"
      },
      {
        key: "reminder_hours_before",
        value: "24",
        description: "Hours before booking to send reminder",
        type: "number"
      },
      
      // Billing & Payments
      {
        key: "default_currency",
        value: "EUR",
        description: "Default currency for pricing",
        type: "string"
      },
      {
        key: "enable_stripe_payments",
        value: "true",
        description: "Enable Stripe payment processing",
        type: "boolean"
      },
      {
        key: "subscription_grace_period_days",
        value: "7",
        description: "Grace period before deactivating expired subscriptions",
        type: "number"
      },
      {
        key: "default_subscription_plan",
        value: "Free",
        description: "Default subscription plan for new tenants",
        type: "string"
      },
      
      // Booking Settings
      {
        key: "max_advance_booking_days",
        value: "90",
        description: "Maximum days in advance customers can book",
        type: "number"
      },
      {
        key: "min_advance_booking_hours",
        value: "2",
        description: "Minimum hours in advance for bookings",
        type: "number"
      },
      {
        key: "default_booking_duration_minutes",
        value: "120",
        description: "Default booking duration in minutes",
        type: "number"
      },
      {
        key: "enable_guest_bookings",
        value: "true",
        description: "Allow bookings without user accounts",
        type: "boolean"
      },
      {
        key: "require_phone_for_bookings",
        value: "true",
        description: "Require phone number for all bookings",
        type: "boolean"
      },
      
      // System Operations
      {
        key: "maintenance_mode",
        value: "false",
        description: "Put the system in maintenance mode",
        type: "boolean"
      },
      {
        key: "maintenance_message",
        value: "System is temporarily under maintenance. Please try again later.",
        description: "Message displayed during maintenance mode",
        type: "string"
      },
      {
        key: "enable_debug_logging",
        value: "false",
        description: "Enable detailed debug logging",
        type: "boolean"
      },
      {
        key: "log_retention_days",
        value: "30",
        description: "Number of days to retain system logs",
        type: "number"
      },
      {
        key: "session_timeout_hours",
        value: "24",
        description: "User session timeout in hours",
        type: "number"
      },
      
      // Features
      {
        key: "enable_calendar_integration",
        value: "true",
        description: "Enable Google Calendar integration",
        type: "boolean"
      },
      {
        key: "enable_widgets",
        value: "true",
        description: "Enable embeddable booking widgets",
        type: "boolean"
      },
      {
        key: "enable_kitchen_management",
        value: "true",
        description: "Enable kitchen order management features",
        type: "boolean"
      },
      {
        key: "enable_analytics",
        value: "true",
        description: "Enable analytics and reporting features",
        type: "boolean"
      },
      {
        key: "enable_multi_language",
        value: "true",
        description: "Enable multi-language support",
        type: "boolean"
      },
      
      // API & Integration
      {
        key: "api_rate_limit_per_minute",
        value: "100",
        description: "API requests per minute per tenant",
        type: "number"
      },
      {
        key: "webhook_timeout_seconds",
        value: "30",
        description: "Timeout for webhook requests in seconds",
        type: "number"
      },
      {
        key: "enable_api_access",
        value: "true",
        description: "Enable API access for tenants",
        type: "boolean"
      }
    ];
    
    for (const setting of defaultSettings) {
      const existing = await adminStorage.getSystemSetting(setting.key);
      if (!existing) {
        await adminStorage.setSystemSetting(
          setting.key,
          setting.value,
          setting.description,
          setting.type
        );
        console.log(`Initialized setting: ${setting.key}`);
      }
    }
    
    console.log("Admin system initialization completed.");
    
  } catch (error) {
    console.error("Error initializing admin system:", error);
    throw error;
  }
}