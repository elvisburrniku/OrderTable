import type { Express, Request, Response, NextFunction } from "express";
import { adminStorage } from "./admin-storage";
import { z } from "zod";
import type { AdminUser } from "../shared/schema";

// Extend Request interface to include admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

// Admin authentication middleware
const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                     req.session?.adminSessionId;

    if (!sessionId) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    const session = await adminStorage.getAdminSession(sessionId);
    if (!session) {
      return res.status(401).json({ message: "Invalid admin session" });
    }

    req.adminUser = session.adminUser;
    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Validation schemas
const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(["admin", "super_admin"]).default("admin"),
});

const updateTenantSubscriptionSchema = z.object({
  status: z.enum(["trial", "active", "expired", "cancelled"]),
  planId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
});

const createSubscriptionPlanSchema = z.object({
  name: z.string(),
  price: z.number(),
  interval: z.string().default("monthly"),
  features: z.string(),
  maxTables: z.number().default(10),
  maxBookingsPerMonth: z.number().default(100),
  maxRestaurants: z.number().default(1),
  trialDays: z.number().default(14),
  isActive: z.boolean().default(true),
});

const systemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  type: z.enum(["string", "number", "boolean", "json"]).default("string"),
});

export function registerAdminRoutes(app: Express) {
  // Admin login - no auth required
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = adminLoginSchema.parse(req.body);
      
      const adminUser = await adminStorage.verifyAdminPassword(email, password);
      if (!adminUser) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const sessionId = await adminStorage.createAdminSession(adminUser.id);
      
      // Store session in both cookie and return token
      req.session.adminSessionId = sessionId;
      
      res.json({
        success: true,
        token: sessionId,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                       req.session?.adminSessionId;
      
      if (sessionId) {
        await adminStorage.deleteAdminSession(sessionId);
      }
      
      req.session.adminSessionId = undefined;
      res.json({ success: true });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get current admin user
  app.get("/api/admin/me", requireAdminAuth, (req: Request, res: Response) => {
    res.json({
      id: req.adminUser!.id,
      email: req.adminUser!.email,
      name: req.adminUser!.name,
      role: req.adminUser!.role,
    });
  });

  // Dashboard statistics
  app.get("/api/admin/dashboard/stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await adminStorage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Tenant management
  app.get("/api/admin/tenants", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenants = await adminStorage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Get tenants error:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.get("/api/admin/tenants/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const tenant = await adminStorage.getTenantById(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Get tenant error:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // Update tenant details
  app.put("/api/admin/tenants/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const {
        name,
        subscriptionStatus,
        subscriptionPlanId,
        maxRestaurants,
        additionalRestaurants,
        additionalRestaurantsCost,
        subscriptionStartDate,
        subscriptionEndDate,
        stripeCustomerId,
        stripeSubscriptionId,
      } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
      if (subscriptionPlanId !== undefined) updateData.subscriptionPlanId = subscriptionPlanId;
      if (maxRestaurants !== undefined) updateData.maxRestaurants = maxRestaurants;
      if (additionalRestaurants !== undefined) updateData.additionalRestaurants = additionalRestaurants;
      if (additionalRestaurantsCost !== undefined) updateData.additionalRestaurantsCost = additionalRestaurantsCost;
      if (subscriptionStartDate !== undefined) updateData.subscriptionStartDate = new Date(subscriptionStartDate);
      if (subscriptionEndDate !== undefined) updateData.subscriptionEndDate = new Date(subscriptionEndDate);
      if (stripeCustomerId !== undefined) updateData.stripeCustomerId = stripeCustomerId;
      if (stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = stripeSubscriptionId;

      const updatedTenant = await adminStorage.updateTenant(tenantId, updateData);
      
      // Log the action
      await adminStorage.addSystemLog({
        level: "info",
        message: `Tenant ${tenantId} updated by admin ${req.adminUser!.email}`,
        data: JSON.stringify({ tenantId, updatedFields: Object.keys(updateData), adminUserId: req.adminUser!.id }),
        source: 'admin_panel',
        adminUserId: req.adminUser!.id,
      });
      
      res.json(updatedTenant);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  // Suspend tenant
  app.post("/api/admin/tenants/:id/suspend", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const { reason } = req.body;
      
      await adminStorage.suspendTenant(tenantId, reason);
      
      // Additional log with admin context
      await adminStorage.addSystemLog({
        level: "warning",
        message: `Tenant ${tenantId} suspended by admin ${req.adminUser!.email}`,
        data: JSON.stringify({ tenantId, reason, adminUserId: req.adminUser!.id }),
        source: 'admin_panel',
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true, message: "Tenant suspended successfully" });
    } catch (error) {
      console.error("Suspend tenant error:", error);
      res.status(500).json({ message: "Failed to suspend tenant" });
    }
  });

  // Unsuspend tenant
  app.post("/api/admin/tenants/:id/unsuspend", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      
      await adminStorage.unsuspendTenant(tenantId);
      
      // Additional log with admin context
      await adminStorage.addSystemLog({
        level: "info",
        message: `Tenant ${tenantId} unsuspended by admin ${req.adminUser!.email}`,
        data: JSON.stringify({ tenantId, adminUserId: req.adminUser!.id }),
        source: 'admin_panel',
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true, message: "Tenant unsuspended successfully" });
    } catch (error) {
      console.error("Unsuspend tenant error:", error);
      res.status(500).json({ message: "Failed to unsuspend tenant" });
    }
  });

  // Pause tenant
  app.post("/api/admin/tenants/:id/pause", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const { pauseUntil } = req.body;
      
      const pauseDate = pauseUntil ? new Date(pauseUntil) : undefined;
      await adminStorage.pauseTenant(tenantId, pauseDate);
      
      // Additional log with admin context
      await adminStorage.addSystemLog({
        level: "info",
        message: `Tenant ${tenantId} paused by admin ${req.adminUser!.email}`,
        data: JSON.stringify({ tenantId, pauseUntil: pauseDate, adminUserId: req.adminUser!.id }),
        source: 'admin_panel',
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true, message: "Tenant paused successfully" });
    } catch (error) {
      console.error("Pause tenant error:", error);
      res.status(500).json({ message: "Failed to pause tenant" });
    }
  });

  // Get tenant statistics
  app.get("/api/admin/tenants/:id/stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const stats = await adminStorage.getTenantStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Get tenant stats error:", error);
      res.status(500).json({ message: "Failed to fetch tenant statistics" });
    }
  });

  app.put("/api/admin/tenants/:id/subscription", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const subscriptionData = updateTenantSubscriptionSchema.parse(req.body);
      
      await adminStorage.updateTenantSubscription(tenantId, subscriptionData);
      
      // Log the action
      await adminStorage.addSystemLog({
        level: "info",
        message: `Tenant subscription updated`,
        data: JSON.stringify({ tenantId, subscriptionData }),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
        tenantId: tenantId,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update tenant subscription error:", error);
      res.status(500).json({ message: "Failed to update tenant subscription" });
    }
  });

  // Subscription plan management
  app.get("/api/admin/subscription-plans", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const plans = await adminStorage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Get subscription plans error:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/admin/subscription-plans", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const planData = createSubscriptionPlanSchema.parse(req.body);
      const plan = await adminStorage.createSubscriptionPlan(planData);
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Subscription plan created: ${plan.name}`,
        data: JSON.stringify(plan),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json(plan);
    } catch (error) {
      console.error("Create subscription plan error:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.put("/api/admin/subscription-plans/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const planData = createSubscriptionPlanSchema.partial().parse(req.body);
      
      await adminStorage.updateSubscriptionPlan(planId, planData);
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Subscription plan updated: ${planId}`,
        data: JSON.stringify(planData),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update subscription plan error:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  app.delete("/api/admin/subscription-plans/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      await adminStorage.deleteSubscriptionPlan(planId);
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Subscription plan deleted: ${planId}`,
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subscription plan error:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // Admin user management
  app.get("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const users = await adminStorage.getAllAdminUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.post("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Only super_admin can create new admin users
      if (req.adminUser!.role !== 'super_admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const userData = createAdminUserSchema.parse(req.body);
      const user = await adminStorage.createAdminUser(userData);
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Admin user created: ${user.email}`,
        data: JSON.stringify({ userId: user.id, email: user.email, role: user.role }),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Create admin user error:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // System settings
  app.get("/api/admin/system-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await adminStorage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post("/api/admin/system-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settingData = systemSettingSchema.parse(req.body);
      
      await adminStorage.setSystemSetting(
        settingData.key,
        settingData.value,
        settingData.description,
        settingData.type,
        req.adminUser!.id
      );
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `System setting updated: ${settingData.key}`,
        data: JSON.stringify(settingData),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update system setting error:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  // System logs
  app.get("/api/admin/system-logs", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const logs = await adminStorage.getSystemLogs(limit, offset);
      res.json(logs);
    } catch (error) {
      console.error("Get system logs error:", error);
      res.status(500).json({ message: "Failed to fetch system logs" });
    }
  });
}