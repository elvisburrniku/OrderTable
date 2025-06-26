import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Define role-based permissions
export const PERMISSIONS = {
  // Booking management
  VIEW_BOOKINGS: "view_bookings",
  CREATE_BOOKINGS: "create_bookings", 
  EDIT_BOOKINGS: "edit_bookings",
  DELETE_BOOKINGS: "delete_bookings",
  
  // Customer management
  VIEW_CUSTOMERS: "view_customers",
  EDIT_CUSTOMERS: "edit_customers",
  
  // Restaurant settings
  VIEW_SETTINGS: "view_settings",
  EDIT_SETTINGS: "edit_settings",
  
  // Menu management
  VIEW_MENU: "view_menu",
  EDIT_MENU: "edit_menu",
  
  // Table management
  VIEW_TABLES: "view_tables",
  EDIT_TABLES: "edit_tables",
  
  // Kitchen management
  VIEW_KITCHEN: "view_kitchen",
  MANAGE_KITCHEN: "manage_kitchen",
  
  // User management
  VIEW_USERS: "view_users",
  MANAGE_USERS: "manage_users",
  
  // Billing and subscription
  VIEW_BILLING: "view_billing",
  MANAGE_BILLING: "manage_billing",
  
  // Reports and analytics
  VIEW_REPORTS: "view_reports",
  
  // Notifications
  VIEW_NOTIFICATIONS: "view_notifications",
  MANAGE_NOTIFICATIONS: "manage_notifications",
  
  // Integrations
  VIEW_INTEGRATIONS: "view_integrations",
  MANAGE_INTEGRATIONS: "manage_integrations",
} as const;

// Role-based permission matrix
export const ROLE_PERMISSIONS = {
  owner: Object.values(PERMISSIONS), // Owners have all permissions
  manager: [
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.EDIT_BOOKINGS,
    PERMISSIONS.DELETE_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.EDIT_CUSTOMERS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.EDIT_SETTINGS,
    PERMISSIONS.VIEW_MENU,
    PERMISSIONS.EDIT_MENU,
    PERMISSIONS.VIEW_TABLES,
    PERMISSIONS.EDIT_TABLES,
    PERMISSIONS.VIEW_KITCHEN,
    PERMISSIONS.MANAGE_KITCHEN,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_INTEGRATIONS,
  ],
  agent: [
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.EDIT_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.EDIT_CUSTOMERS,
    PERMISSIONS.VIEW_MENU,
    PERMISSIONS.VIEW_TABLES,
    PERMISSIONS.VIEW_REPORTS,
  ],
  kitchen_staff: [
    PERMISSIONS.VIEW_KITCHEN,
    PERMISSIONS.MANAGE_KITCHEN,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.VIEW_MENU,
  ],
} as const;

// Get user role from session or tenant_users table
async function getUserRole(userId: number, tenantId: number): Promise<string | null> {
  try {
    // Check if user is the restaurant owner
    const restaurant = await storage.getRestaurantByUserId(userId);
    if (restaurant && restaurant.userId === userId) {
      return 'owner';
    }

    // Check tenant_users table for role assignment via direct database query
    try {
      const db = (storage as any).db;
      if (db) {
        const result = await db.select().from((await import("@shared/schema")).tenantUsers)
          .where((await import("drizzle-orm")).eq((await import("@shared/schema")).tenantUsers.tenantId, tenantId));
        
        const userTenant = result.find((tu: any) => tu.userId === userId);
        if (userTenant?.role) {
          return userTenant.role;
        }
      }
    } catch (error) {
      console.log("Could not query tenant_users table directly:", error);
    }

    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

// Get permissions for a role
function getPermissionsForRole(role: string): string[] {
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  return permissions ? [...permissions] : [];
}

// Check if user has specific permission
export async function hasPermission(userId: number, tenantId: number, permission: string): Promise<boolean> {
  const userRole = await getUserRole(userId, tenantId);
  if (!userRole) return false;
  
  const permissions = getPermissionsForRole(userRole);
  return permissions.includes(permission);
}

// Middleware to check permissions
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUser = (req as any).session?.user;
      const sessionTenant = (req as any).session?.tenant;

      if (!sessionUser || !sessionTenant) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const hasAccess = await hasPermission(sessionUser.id, sessionTenant.id, permission);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You don't have permission to perform this action" 
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Middleware to check multiple permissions (user needs at least one)
export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUser = (req as any).session?.user;
      const sessionTenant = (req as any).session?.tenant;

      if (!sessionUser || !sessionTenant) {
        return res.status(401).json({ error: "Authentication required" });
      }

      for (const permission of permissions) {
        const hasAccess = await hasPermission(sessionUser.id, sessionTenant.id, permission);
        if (hasAccess) {
          return next();
        }
      }

      return res.status(403).json({ 
        error: "Access denied", 
        message: "You don't have permission to perform this action" 
      });
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Get user permissions endpoint
export async function getUserPermissions(userId: number, tenantId: number): Promise<string[]> {
  const userRole = await getUserRole(userId, tenantId);
  if (!userRole) return [];
  
  return getPermissionsForRole(userRole);
}