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
    
    // Initialize default system settings
    const defaultSettings = [
      {
        key: "system_name",
        value: "Restaurant Booking Platform",
        description: "The name of the platform displayed in admin interface",
        type: "string"
      },
      {
        key: "max_trial_days",
        value: "14",
        description: "Default trial period for new tenants",
        type: "number"
      },
      {
        key: "enable_email_notifications",
        value: "true",
        description: "Enable system-wide email notifications",
        type: "boolean"
      },
      {
        key: "maintenance_mode",
        value: "false",
        description: "Put the system in maintenance mode",
        type: "boolean"
      },
      {
        key: "default_currency",
        value: "USD",
        description: "Default currency for pricing",
        type: "string"
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