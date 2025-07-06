import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Define role-based permissions
export const PERMISSIONS = {
  // Page-level permissions
  ACCESS_DASHBOARD: "access_dashboard",
  ACCESS_BOOKINGS: "access_bookings",
  ACCESS_CUSTOMERS: "access_customers",
  ACCESS_MENU: "access_menu",
  ACCESS_TABLES: "access_tables",
  ACCESS_KITCHEN: "access_kitchen",
  ACCESS_USERS: "access_users",
  ACCESS_BILLING: "access_billing",
  ACCESS_REPORTS: "access_reports",
  ACCESS_NOTIFICATIONS: "access_notifications",
  ACCESS_INTEGRATIONS: "access_integrations",
  ACCESS_SETTINGS: "access_settings",
  ACCESS_FLOOR_PLAN: "access_floor_plan",

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
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.ACCESS_BOOKINGS,
    PERMISSIONS.ACCESS_CUSTOMERS,
    PERMISSIONS.ACCESS_MENU,
    PERMISSIONS.ACCESS_TABLES,
    PERMISSIONS.ACCESS_KITCHEN,
    PERMISSIONS.ACCESS_USERS,
    PERMISSIONS.ACCESS_REPORTS,
    PERMISSIONS.ACCESS_NOTIFICATIONS,
    PERMISSIONS.ACCESS_INTEGRATIONS,
    PERMISSIONS.ACCESS_SETTINGS,
    PERMISSIONS.ACCESS_FLOOR_PLAN,
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
    PERMISSIONS.ACCESS_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
    PERMISSIONS.VIEW_INTEGRATIONS,
  ],
  agent: [
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.ACCESS_BOOKINGS,
    PERMISSIONS.ACCESS_CUSTOMERS,
    PERMISSIONS.ACCESS_MENU,
    PERMISSIONS.ACCESS_TABLES,
    PERMISSIONS.ACCESS_REPORTS,
    PERMISSIONS.ACCESS_USERS, // Temporarily added for testing role permissions
    PERMISSIONS.ACCESS_FLOOR_PLAN,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.CREATE_BOOKINGS,
    PERMISSIONS.EDIT_BOOKINGS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.EDIT_CUSTOMERS,
    PERMISSIONS.VIEW_MENU,
    PERMISSIONS.VIEW_TABLES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_USERS, // Temporarily added for testing role permissions
  ],
  kitchen_staff: [
    PERMISSIONS.ACCESS_KITCHEN,
    PERMISSIONS.ACCESS_MENU,
    PERMISSIONS.VIEW_KITCHEN,
    PERMISSIONS.MANAGE_KITCHEN,
    PERMISSIONS.VIEW_BOOKINGS,
    PERMISSIONS.VIEW_MENU,
  ],
} as const;

// Define default redirect paths for each role
export const ROLE_REDIRECTS = {
  owner: "dashboard",
  manager: "dashboard",
  agent: "bookings",
  kitchen_staff: "kitchen-dashboard",
} as const;

// Get user role from session or tenant_users table
export async function getUserRole(
  userId: number,
  tenantId: number,
): Promise<string | null> {
  try {
    // Check if user is the restaurant owner - this takes precedence
    const restaurant = await storage.getRestaurantByUserId(userId);
    if (
      restaurant &&
      restaurant.userId === userId &&
      restaurant.tenantId === tenantId
    ) {
      return "owner";
    }

    // Check tenant_users table for role assignment via direct database query
    try {
      const db = (storage as any).db;
      if (db) {
        const result = await db
          .select()
          .from((await import("@shared/schema")).tenantUsers)
          .where(
            (await import("drizzle-orm")).eq(
              (await import("@shared/schema")).tenantUsers.tenantId,
              tenantId,
            ),
          );

        const userTenant = result.find((tu: any) => tu.userId === userId);
        if (userTenant?.role) {
          return userTenant.role;
        }
      }
    } catch (error) {
      console.log("Could not query tenant_users table directly:", error);
    }

    // Final fallback: check if user owns any restaurant in this tenant
    try {
      const tenantRestaurants =
        await storage.getRestaurantsByTenantId(tenantId);
      if (
        tenantRestaurants &&
        tenantRestaurants.some((r: any) => r.userId === userId)
      ) {
        return "owner";
      }
    } catch (error) {
      console.log("Could not check tenant restaurants:", error);
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
export async function hasPermission(
  userId: number,
  tenantId: number,
  permission: string,
): Promise<boolean> {
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
        return res.status(401).json({
          error: "Authentication required",
          message: "Please log in to access this resource",
        });
      }

      // Check if tenant subscription is active and allows this feature
      try {
        const subscriptionStatus = await checkSubscriptionAccess(
          sessionTenant.id,
          permission,
        );
        if (!subscriptionStatus.allowed) {
          return res.status(403).json({
            error: "Subscription required",
            message:
              subscriptionStatus.message ||
              "Your current subscription plan does not include this feature",
            requiredPermission: permission,
            subscriptionStatus: subscriptionStatus.status,
          });
        }
      } catch (error) {
        console.log("Could not check subscription status:", error);
        // Continue with permission check even if subscription check fails
      }

      const hasAccess = await hasPermission(
        sessionUser.id,
        sessionTenant.id,
        permission,
      );

      if (!hasAccess) {
        const userRole = await getUserRole(sessionUser.id, sessionTenant.id);
        return res.status(403).json({
          error: "Access denied",
          message: `Your role (${userRole}) does not have permission to access this resource`,
          requiredPermission: permission,
          userRole: userRole,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "An error occurred while checking permissions",
      });
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
        const hasAccess = await hasPermission(
          sessionUser.id,
          sessionTenant.id,
          permission,
        );
        if (hasAccess) {
          return next();
        }
      }

      return res.status(403).json({
        error: "Access denied",
        message: "You don't have permission to perform this action",
      });
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

// Get user permissions endpoint
export async function getUserPermissions(
  userId: number,
  tenantId: number,
): Promise<string[]> {
  const userRole = await getUserRole(userId, tenantId);
  if (!userRole) return [];

  return getPermissionsForRole(userRole);
}

// Get role's default redirect URL
// Get role redirect from database
export async function getRoleRedirectFromDB(userId: number, tenantId: number): Promise<string> {
  try {
    // First get the user's role
    const userRole = await getUserRole(userId, tenantId);
    if (!userRole) {
      return "dashboard";
    }

    // For owner role, use hardcoded redirect
    if (userRole === "owner") {
      return "dashboard";
    }

    // Query database for role redirect
    const db = (storage as any).db;
    if (db) {
      const { roles } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const result = await db
        .select({ redirect: roles.redirect })
        .from(roles)
        .where(
          and(
            eq(roles.name, userRole),
            eq(roles.tenantId, tenantId)
          )
        )
        .limit(1);

      if (result && result.length > 0 && result[0].redirect) {
        return result[0].redirect;
      }
    }

    // Fallback to static redirects if database lookup fails
    return ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS] || "dashboard";
  } catch (error) {
    console.error("Error fetching role redirect from database:", error);
    // Fallback to static redirects
    const userRole = await getUserRole(userId, tenantId);
    return ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS] || "dashboard";
  }
}

// Legacy function for backward compatibility
export function getRoleRedirect(role: string): string {
  return ROLE_REDIRECTS[role as keyof typeof ROLE_REDIRECTS] || "dashboard";
}

// Update role permissions (for admin management)
export function updateRolePermissions(
  role: string,
  permissions: string[],
): boolean {
  if (!(role in ROLE_PERMISSIONS)) {
    return false;
  }

  // For safety, owners always keep all permissions
  if (role === "owner") {
    return false;
  }

  // Update the role permissions
  (ROLE_PERMISSIONS as any)[role] = permissions;
  return true;
}

// Update role redirect in database
export async function updateRoleRedirect(
  role: string,
  redirectPath: string,
  tenantId: number,
): Promise<boolean> {
  try {
    const db = (storage as any).db;
    if (!db) {
      // Fallback to in-memory storage if database not available
      if (!(role in ROLE_REDIRECTS)) {
        return false;
      }
      (ROLE_REDIRECTS as any)[role] = redirectPath;
      return true;
    }

    const { roles } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");
    
    // Update the redirect in the database
    await db
      .update(roles)
      .set({ redirect: redirectPath })
      .where(
        and(
          eq(roles.name, role),
          eq(roles.tenantId, tenantId)
        )
      );

    return true;
  } catch (error) {
    console.error("Error updating role redirect in database:", error);
    // Fallback to in-memory storage
    if (!(role in ROLE_REDIRECTS)) {
      return false;
    }
    (ROLE_REDIRECTS as any)[role] = redirectPath;
    return true;
  }
}

// Check if tenant's subscription allows access to a specific feature
async function checkSubscriptionAccess(
  tenantId: number,
  permission: string,
): Promise<{ allowed: boolean; status?: string; message?: string }> {
  try {
    // Get tenant subscription status
    const tenant = await storage.getTenantById(tenantId);
    if (!tenant) {
      return {
        allowed: false,
        status: "no_tenant",
        message: "Tenant not found",
      };
    }

    // If tenant is paused, only allow basic access
    if (tenant.status === "paused") {
      const allowedDuringPause = [
        PERMISSIONS.ACCESS_DASHBOARD,
        PERMISSIONS.ACCESS_BILLING,
        PERMISSIONS.ACCESS_SETTINGS,
        PERMISSIONS.VIEW_BILLING,
      ];

      if (!allowedDuringPause.includes(permission)) {
        return {
          allowed: false,
          status: "paused",
          message:
            "Your account is paused. Please contact support or update your billing information.",
        };
      }
    }

    // If tenant is suspended, deny all access except billing
    if (tenant.status === "suspended") {
      const allowedDuringSuspension = [
        PERMISSIONS.ACCESS_BILLING,
        PERMISSIONS.VIEW_BILLING,
      ];

      if (!allowedDuringSuspension.includes(permission)) {
        return {
          allowed: false,
          status: "suspended",
          message: "Your account is suspended. Please contact support.",
        };
      }
    }

    // Check if subscription is active - allow core functionality even for cancelled subscriptions
    if (tenant.subscriptionStatus !== "active") {
      // Allow essential restaurant management features even with cancelled subscription
      const allowedWithCancelledSubscription = [
        PERMISSIONS.ACCESS_DASHBOARD,
        PERMISSIONS.ACCESS_BOOKINGS,
        PERMISSIONS.ACCESS_CUSTOMERS,
        PERMISSIONS.ACCESS_MENU,
        PERMISSIONS.ACCESS_TABLES,
        PERMISSIONS.ACCESS_KITCHEN,
        PERMISSIONS.ACCESS_SETTINGS,
        PERMISSIONS.ACCESS_FLOOR_PLAN,
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
        PERMISSIONS.ACCESS_BILLING,
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.MANAGE_BILLING,
        PERMISSIONS.ACCESS_USERS,
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.MANAGE_USERS,
      ];

      if (!allowedWithCancelledSubscription.includes(permission)) {
        return {
          allowed: false,
          status: tenant.subscriptionStatus,
          message:
            "Your subscription is not active. Please update your billing information.",
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking subscription access:", error);
    return { allowed: true }; // Allow access if we can't check subscription
  }
}

// Get all available permissions grouped by category
export function getAllPermissions() {
  return {
    pageAccess: [
      { key: PERMISSIONS.ACCESS_DASHBOARD, label: "Dashboard" },
      { key: PERMISSIONS.ACCESS_BOOKINGS, label: "Bookings" },
      { key: PERMISSIONS.ACCESS_CUSTOMERS, label: "Customers" },
      { key: PERMISSIONS.ACCESS_MENU, label: "Menu" },
      { key: PERMISSIONS.ACCESS_TABLES, label: "Tables" },
      { key: PERMISSIONS.ACCESS_KITCHEN, label: "Kitchen" },
      { key: PERMISSIONS.ACCESS_USERS, label: "Users" },
      { key: PERMISSIONS.ACCESS_BILLING, label: "Billing" },
      { key: PERMISSIONS.ACCESS_REPORTS, label: "Reports" },
      { key: PERMISSIONS.ACCESS_NOTIFICATIONS, label: "Notifications" },
      { key: PERMISSIONS.ACCESS_INTEGRATIONS, label: "Integrations" },
      { key: PERMISSIONS.ACCESS_SETTINGS, label: "Settings" },
    ],
    features: [
      { key: PERMISSIONS.VIEW_BOOKINGS, label: "View Bookings" },
      { key: PERMISSIONS.CREATE_BOOKINGS, label: "Create Bookings" },
      { key: PERMISSIONS.EDIT_BOOKINGS, label: "Edit Bookings" },
      { key: PERMISSIONS.DELETE_BOOKINGS, label: "Delete Bookings" },
      { key: PERMISSIONS.VIEW_CUSTOMERS, label: "View Customers" },
      { key: PERMISSIONS.EDIT_CUSTOMERS, label: "Edit Customers" },
      { key: PERMISSIONS.VIEW_SETTINGS, label: "View Settings" },
      { key: PERMISSIONS.EDIT_SETTINGS, label: "Edit Settings" },
      { key: PERMISSIONS.VIEW_MENU, label: "View Menu" },
      { key: PERMISSIONS.EDIT_MENU, label: "Edit Menu" },
      { key: PERMISSIONS.VIEW_TABLES, label: "View Tables" },
      { key: PERMISSIONS.EDIT_TABLES, label: "Edit Tables" },
      { key: PERMISSIONS.VIEW_KITCHEN, label: "View Kitchen" },
      { key: PERMISSIONS.MANAGE_KITCHEN, label: "Manage Kitchen" },
      { key: PERMISSIONS.VIEW_USERS, label: "View Users" },
      { key: PERMISSIONS.MANAGE_USERS, label: "Manage Users" },
      { key: PERMISSIONS.VIEW_BILLING, label: "View Billing" },
      { key: PERMISSIONS.MANAGE_BILLING, label: "Manage Billing" },
      { key: PERMISSIONS.VIEW_REPORTS, label: "View Reports" },
      { key: PERMISSIONS.VIEW_NOTIFICATIONS, label: "View Notifications" },
      { key: PERMISSIONS.MANAGE_NOTIFICATIONS, label: "Manage Notifications" },
      { key: PERMISSIONS.VIEW_INTEGRATIONS, label: "View Integrations" },
      { key: PERMISSIONS.MANAGE_INTEGRATIONS, label: "Manage Integrations" },
    ],
  };
}
