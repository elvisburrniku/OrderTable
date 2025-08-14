import type { Express, Request, Response, NextFunction } from "express";
import { adminStorage } from "./admin-storage";
import { z } from "zod";
import type { AdminUser } from "../shared/schema";
import { db } from "./db";
import { shopCategories, shopProducts, shopOrders, shopSettings } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe only if API key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });
} else {
  console.log("Stripe integration disabled: No STRIPE_SECRET_KEY found");
}

// Helper function to handle Stripe operations safely
const withStripe = async <T>(operation: (stripe: Stripe) => Promise<T>, fallback?: T): Promise<T | null> => {
  if (!stripe) {
    console.log("Stripe operation skipped: Stripe not initialized");
    return fallback ?? null;
  }
  try {
    return await operation(stripe);
  } catch (error) {
    console.error("Stripe operation failed:", error);
    return fallback ?? null;
  }
};

// Import storage for getting tenant and plan details
import { storage } from "./storage";
import { voiceAgentRequestService } from "./voice-agent-request-service";
import { 
  voiceAgentRequests, 
  voiceAgents, 
  voiceAgentCredits,
  voiceAgentTransactions,
  phoneNumbers
} from "../shared/schema";

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

const updateSubscriptionPriceSchema = z.object({
  planId: z.number(),
  updateStripe: z.boolean().default(true),
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

// Shop management schemas
const createShopCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

const createShopProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  price: z.string(),
  originalPrice: z.string().optional(),
  categoryId: z.number().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  specifications: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
  sku: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  inStock: z.boolean().default(true),
  stockQuantity: z.number().optional(),
  minQuantity: z.number().default(1),
  maxQuantity: z.number().optional(),
  deliveryTime: z.string().optional(),
  sortOrder: z.number().default(0),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  slug: z.string().min(1),
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
      console.log(`Admin route: Getting tenant details for ID ${tenantId}`);
      
      // Disable caching for this endpoint to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const tenant = await adminStorage.getTenantById(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      console.log(`Admin route: Returning tenant data with ${tenant.restaurants?.length || 0} restaurants and ${tenant.users?.length || 0} users`);
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
      
      // Handle both direct fields and nested tenant object
      const tenant = req.body.tenant || req.body;
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
      } = tenant;

      // Get the current tenant to compare against
      const currentTenant = await adminStorage.getTenantById(tenantId);
      if (!currentTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const updateData: any = {};
      
      // Only include fields that have actually changed
      if (name !== undefined && name !== currentTenant.tenant.name) {
        updateData.name = name;
      }
      if (subscriptionStatus !== undefined && subscriptionStatus !== currentTenant.tenant.subscriptionStatus) {
        updateData.subscriptionStatus = subscriptionStatus;
      }
      if (subscriptionPlanId !== undefined && subscriptionPlanId !== currentTenant.tenant.subscriptionPlanId) {
        updateData.subscriptionPlanId = subscriptionPlanId;
      }
      if (maxRestaurants !== undefined && maxRestaurants !== currentTenant.tenant.maxRestaurants) {
        updateData.maxRestaurants = maxRestaurants;
      }
      if (additionalRestaurants !== undefined && additionalRestaurants !== currentTenant.tenant.additionalRestaurants) {
        updateData.additionalRestaurants = additionalRestaurants;
      }
      if (additionalRestaurantsCost !== undefined && additionalRestaurantsCost !== currentTenant.tenant.additionalRestaurantsCost) {
        updateData.additionalRestaurantsCost = additionalRestaurantsCost;
      }
      if (subscriptionStartDate !== undefined) {
        const newStartDate = new Date(subscriptionStartDate);
        const currentStartDate = currentTenant.tenant.subscriptionStartDate ? new Date(currentTenant.tenant.subscriptionStartDate) : null;
        if (!currentStartDate || newStartDate.getTime() !== currentStartDate.getTime()) {
          updateData.subscriptionStartDate = newStartDate;
        }
      }
      if (subscriptionEndDate !== undefined) {
        const newEndDate = new Date(subscriptionEndDate);
        const currentEndDate = currentTenant.tenant.subscriptionEndDate ? new Date(currentTenant.tenant.subscriptionEndDate) : null;
        if (!currentEndDate || newEndDate.getTime() !== currentEndDate.getTime()) {
          updateData.subscriptionEndDate = newEndDate;
        }
      }
      if (stripeCustomerId !== undefined && stripeCustomerId !== currentTenant.tenant.stripeCustomerId) {
        updateData.stripeCustomerId = stripeCustomerId;
      }
      if (stripeSubscriptionId !== undefined && stripeSubscriptionId !== currentTenant.tenant.stripeSubscriptionId) {
        updateData.stripeSubscriptionId = stripeSubscriptionId;
      }

      // If no fields to update, return success without database call
      if (Object.keys(updateData).length === 0) {
        return res.json(currentTenant.tenant);
      }

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
      const { pauseUntil, reason } = req.body;
      
      if (!pauseUntil) {
        return res.status(400).json({ message: "Pause end date is required" });
      }

      const pauseDate = new Date(pauseUntil);
      if (pauseDate <= new Date()) {
        return res.status(400).json({ message: "Pause end date must be in the future" });
      }

      await adminStorage.pauseTenant(tenantId, pauseDate, reason);
      
      // Additional log with admin context
      await adminStorage.addSystemLog({
        level: "info",
        message: `Tenant ${tenantId} paused by admin ${req.adminUser!.email} until ${pauseDate.toISOString()}`,
        data: JSON.stringify({ 
          tenantId, 
          pauseUntil: pauseDate, 
          reason: reason || 'No reason provided',
          adminUserId: req.adminUser!.id 
        }),
        source: 'admin_panel',
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ 
        success: true, 
        message: `Tenant paused successfully until ${pauseDate.toLocaleDateString()}`,
        pauseEndDate: pauseDate
      });
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

  // Get upcoming unpause schedules
  app.get("/api/admin/schedules/unpause", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const upcomingSchedules = await adminStorage.getUpcomingUnpauseSchedules();
      res.json({
        schedules: upcomingSchedules,
        count: upcomingSchedules.length,
        nextUnpause: upcomingSchedules.length > 0 ? upcomingSchedules[0] : null
      });
    } catch (error) {
      console.error("Get unpause schedules error:", error);
      res.status(500).json({ message: "Failed to fetch unpause schedules" });
    }
  });

  app.put("/api/admin/tenants/:id/subscription", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const subscriptionData = updateTenantSubscriptionSchema.parse(req.body);
      
      // Get current tenant and new plan details
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      let stripeUpdateResult = null;

      // If plan is being changed and tenant has active Stripe subscription, update Stripe
      if (subscriptionData.planId && tenant.stripeSubscriptionId) {
        try {
          const newPlan = await storage.getSubscriptionPlanById(subscriptionData.planId);
          if (!newPlan) {
            return res.status(400).json({ message: "New subscription plan not found" });
          }

          // Get current Stripe subscription
          const stripeSubscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
          
          if (stripeSubscription.status === 'active') {
            // Create a new price in Stripe for the updated plan
            const price = await stripe.prices.create({
              currency: 'usd',
              unit_amount: Math.round(newPlan.price * 100), // Convert to cents
              recurring: {
                interval: newPlan.interval as 'month' | 'year',
              },
              product_data: {
                name: newPlan.name,
                description: `Subscription plan: ${newPlan.name}`,
              },
            });

            // Update the subscription with the new price
            const updatedSubscription = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
              items: [{
                id: stripeSubscription.items.data[0].id,
                price: price.id,
              }],
              proration_behavior: 'always_invoice', // This will create a prorated invoice
            });

            stripeUpdateResult = {
              subscriptionId: updatedSubscription.id,
              newPrice: newPlan.price,
              prorationCreated: true,
              nextBillingDate: new Date(updatedSubscription.current_period_end * 1000),
            };

            // Log Stripe update
            await adminStorage.addSystemLog({
              level: "info",
              message: `Stripe subscription updated for tenant ${tenantId}`,
              data: JSON.stringify({
                tenantId,
                stripeSubscriptionId: tenant.stripeSubscriptionId,
                oldPlanId: tenant.subscriptionPlanId,
                newPlanId: subscriptionData.planId,
                newPrice: newPlan.price,
                priceId: price.id,
              }),
              source: "admin_panel",
              adminUserId: req.adminUser!.id,
              tenantId: tenantId,
            });
          }
        } catch (stripeError: any) {
          console.error("Stripe subscription update error:", stripeError);
          // Log the Stripe error but continue with local update
          await adminStorage.addSystemLog({
            level: "warning",
            message: `Failed to update Stripe subscription for tenant ${tenantId}`,
            data: JSON.stringify({
              tenantId,
              error: stripeError.message,
              stripeSubscriptionId: tenant.stripeSubscriptionId,
            }),
            source: "admin_panel",
            adminUserId: req.adminUser!.id,
            tenantId: tenantId,
          });
        }
      }
      
      // Update local database subscription
      await adminStorage.updateTenantSubscription(tenantId, subscriptionData);
      
      // Log the action
      await adminStorage.addSystemLog({
        level: "info",
        message: `Tenant subscription updated by admin`,
        data: JSON.stringify({ 
          tenantId, 
          subscriptionData,
          stripeUpdateResult,
          adminUser: req.adminUser!.email,
        }),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
        tenantId: tenantId,
      });
      
      res.json({ 
        success: true,
        message: "Subscription updated successfully",
        stripeUpdate: stripeUpdateResult,
      });
    } catch (error) {
      console.error("Update tenant subscription error:", error);
      res.status(500).json({ message: "Failed to update tenant subscription" });
    }
  });

  // Dedicated endpoint for updating subscription pricing with Stripe integration
  app.put("/api/admin/tenants/:id/subscription-price", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const { planId, updateStripe } = updateSubscriptionPriceSchema.parse(req.body);

      // Get tenant and plan details
      const tenant = await storage.getTenantById(tenantId);
      const newPlan = await storage.getSubscriptionPlanById(planId);
      const currentPlan = tenant?.subscriptionPlanId ? await storage.getSubscriptionPlanById(tenant.subscriptionPlanId) : null;

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (!newPlan) {
        return res.status(400).json({ message: "New subscription plan not found" });
      }

      let stripeResult = null;
      let prorationAmount = 0;

      // Handle Stripe subscription update if requested and subscription exists
      if (updateStripe && tenant.stripeSubscriptionId) {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            tenant.stripeSubscriptionId,
            { expand: ['items.data.price'] }
          );

          if (stripeSubscription.status === 'active') {
            // Calculate proration preview
            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              customer: tenant.stripeCustomerId,
              subscription: tenant.stripeSubscriptionId,
              subscription_items: [{
                id: stripeSubscription.items.data[0].id,
                price_data: {
                  currency: 'usd',
                  unit_amount: Math.round(newPlan.price * 100),
                  recurring: {
                    interval: newPlan.interval as 'month' | 'year',
                  },
                  product_data: {
                    name: newPlan.name,
                  },
                },
              }],
            });

            prorationAmount = upcomingInvoice.amount_due / 100;

            // Create new price in Stripe
            const newPrice = await stripe.prices.create({
              currency: 'usd',
              unit_amount: Math.round(newPlan.price * 100),
              recurring: {
                interval: newPlan.interval as 'month' | 'year',
              },
              product_data: {
                name: newPlan.name,
                description: `Updated subscription: ${newPlan.name}`,
              },
            });

            // Update subscription with immediate proration
            const updatedSubscription = await stripe.subscriptions.update(
              tenant.stripeSubscriptionId,
              {
                items: [{
                  id: stripeSubscription.items.data[0].id,
                  price: newPrice.id,
                }],
                proration_behavior: 'always_invoice',
              }
            );

            stripeResult = {
              success: true,
              subscriptionId: updatedSubscription.id,
              oldPrice: currentPlan?.price || 0,
              newPrice: newPlan.price,
              prorationAmount,
              nextBillingDate: new Date(updatedSubscription.current_period_end * 1000),
              invoiceUrl: `https://dashboard.stripe.com/subscriptions/${updatedSubscription.id}`,
            };

            await adminStorage.addSystemLog({
              level: "info",
              message: `Subscription price updated via Stripe for tenant ${tenantId}`,
              data: JSON.stringify({
                tenantId,
                oldPlanId: tenant.subscriptionPlanId,
                newPlanId: planId,
                oldPrice: currentPlan?.price,
                newPrice: newPlan.price,
                prorationAmount,
                stripeSubscriptionId: tenant.stripeSubscriptionId,
              }),
              source: "admin_panel",
              adminUserId: req.adminUser!.id,
              tenantId,
            });
          } else {
            stripeResult = {
              success: false,
              reason: `Subscription status is '${stripeSubscription.status}', not active`,
            };
          }
        } catch (stripeError: any) {
          console.error("Stripe pricing update error:", stripeError);
          stripeResult = {
            success: false,
            error: stripeError.message,
          };

          await adminStorage.addSystemLog({
            level: "error",
            message: `Failed to update Stripe subscription pricing for tenant ${tenantId}`,
            data: JSON.stringify({
              tenantId,
              error: stripeError.message,
              newPlanId: planId,
            }),
            source: "admin_panel",
            adminUserId: req.adminUser!.id,
            tenantId,
          });
        }
      }

      // Update local subscription plan
      await storage.updateTenant(tenantId, {
        subscriptionPlanId: planId,
      });

      await adminStorage.addSystemLog({
        level: "info",
        message: `Subscription plan updated for tenant ${tenantId}`,
        data: JSON.stringify({
          tenantId,
          oldPlanId: tenant.subscriptionPlanId,
          newPlanId: planId,
          oldPrice: currentPlan?.price,
          newPrice: newPlan.price,
          stripeUpdated: updateStripe,
          stripeResult,
        }),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
        tenantId,
      });

      res.json({
        success: true,
        message: "Subscription pricing updated successfully",
        pricing: {
          oldPlan: currentPlan ? {
            id: currentPlan.id,
            name: currentPlan.name,
            price: currentPlan.price,
          } : null,
          newPlan: {
            id: newPlan.id,
            name: newPlan.name,
            price: newPlan.price,
          },
          priceChange: newPlan.price - (currentPlan?.price || 0),
        },
        stripe: stripeResult,
      });

    } catch (error) {
      console.error("Update subscription pricing error:", error);
      res.status(500).json({ message: "Failed to update subscription pricing" });
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

  // Webhook Logs Management
  app.get("/api/admin/webhook-logs", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { tenantId, eventType, limit = 100 } = req.query;
      
      let logs;
      if (eventType) {
        logs = await storage.getWebhookLogsByEventType(
          eventType as string, 
          tenantId ? parseInt(tenantId as string) : undefined
        );
      } else {
        logs = await storage.getWebhookLogs(
          tenantId ? parseInt(tenantId as string) : undefined, 
          parseInt(limit as string)
        );
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Get webhook logs error:", error);
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  app.get("/api/admin/webhook-logs/stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      
      // Get all logs for stats
      const logs = await storage.getWebhookLogs(
        tenantId ? parseInt(tenantId as string) : undefined,
        1000 // Get more for accurate stats
      );
      
      // Calculate statistics
      const stats = {
        total: logs.length,
        byStatus: logs.reduce((acc: any, log: any) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        byEventType: logs.reduce((acc: any, log: any) => {
          acc[log.eventType] = (acc[log.eventType] || 0) + 1;
          return acc;
        }, {}),
        bySource: logs.reduce((acc: any, log: any) => {
          acc[log.source] = (acc[log.source] || 0) + 1;
          return acc;
        }, {}),
        averageProcessingTime: logs.length > 0 
          ? logs.reduce((sum: number, log: any) => sum + (log.processingTime || 0), 0) / logs.length 
          : 0,
        recentErrors: logs
          .filter((log: any) => log.status === 'failed')
          .slice(0, 10)
          .map((log: any) => ({
            id: log.id,
            eventType: log.eventType,
            errorMessage: log.errorMessage,
            createdAt: log.createdAt
          }))
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get webhook stats error:", error);
      res.status(500).json({ message: "Failed to fetch webhook statistics" });
    }
  });

  // Stripe Connect Payment Methods and Transactions
  app.get("/api/admin/stripe/payments", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { tenantId, limit = 50 } = req.query;
      
      let payments;
      if (tenantId) {
        payments = await storage.getStripePaymentsByTenant(parseInt(tenantId as string));
      } else {
        // Get all payments across all tenants (admin view)
        payments = await storage.getStripePaymentsByTenant(0); // This needs to be implemented for admin view
      }
      
      // Enrich with tenant and restaurant information
      const enrichedPayments = await Promise.all(
        payments.slice(0, parseInt(limit as string)).map(async (payment: any) => {
          let tenantInfo = null;
          let restaurantInfo = null;
          
          if (payment.tenantId) {
            tenantInfo = await storage.getTenantById(payment.tenantId);
          }
          
          if (payment.restaurantId) {
            restaurantInfo = await storage.getRestaurantById(payment.restaurantId);
          }
          
          return {
            ...payment,
            tenant: tenantInfo ? { id: tenantInfo.id, name: tenantInfo.name } : null,
            restaurant: restaurantInfo ? { id: restaurantInfo.id, name: restaurantInfo.name } : null
          };
        })
      );
      
      res.json(enrichedPayments);
    } catch (error) {
      console.error("Get Stripe payments error:", error);
      res.status(500).json({ message: "Failed to fetch Stripe payments" });
    }
  });

  app.get("/api/admin/stripe/connect-accounts", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all tenants with Stripe Connect accounts
      const tenants = await adminStorage.getAllTenants();
      const connectAccounts = tenants
        .filter(tenant => tenant.stripeConnectAccountId)
        .map(tenant => ({
          tenantId: tenant.id,
          tenantName: tenant.name,
          stripeConnectAccountId: tenant.stripeConnectAccountId,
          stripeConnectStatus: tenant.stripeConnectStatus,
          stripeConnectChargesEnabled: tenant.stripeConnectChargesEnabled,
          stripeConnectPayoutsEnabled: tenant.stripeConnectPayoutsEnabled,
          stripeConnectOnboardingCompleted: tenant.stripeConnectOnboardingCompleted,
        }));
      
      res.json(connectAccounts);
    } catch (error) {
      console.error("Get Stripe Connect accounts error:", error);
      res.status(500).json({ message: "Failed to fetch Stripe Connect accounts" });
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

  // Shop Categories Management
  app.get("/api/admin/shop/categories", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const categories = await db.select().from(shopCategories).orderBy(desc(shopCategories.sortOrder));
      res.json(categories);
    } catch (error) {
      console.error("Get shop categories error:", error);
      res.status(500).json({ message: "Failed to fetch shop categories" });
    }
  });

  app.post("/api/admin/shop/categories", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const categoryData = createShopCategorySchema.parse(req.body);
      const [category] = await db.insert(shopCategories).values(categoryData).returning();
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop category created: ${category.name}`,
        data: JSON.stringify(category),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json(category);
    } catch (error) {
      console.error("Create shop category error:", error);
      res.status(500).json({ message: "Failed to create shop category" });
    }
  });

  app.put("/api/admin/shop/categories/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      const categoryData = createShopCategorySchema.partial().parse(req.body);
      
      await db.update(shopCategories)
        .set({ ...categoryData, updatedAt: new Date() })
        .where(eq(shopCategories.id, categoryId));
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop category updated: ${categoryId}`,
        data: JSON.stringify(categoryData),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update shop category error:", error);
      res.status(500).json({ message: "Failed to update shop category" });
    }
  });

  app.delete("/api/admin/shop/categories/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      await db.delete(shopCategories).where(eq(shopCategories.id, categoryId));
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop category deleted: ${categoryId}`,
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shop category error:", error);
      res.status(500).json({ message: "Failed to delete shop category" });
    }
  });

  // Shop Products Management
  app.get("/api/admin/shop/products", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const products = await db.select().from(shopProducts).orderBy(desc(shopProducts.createdAt));
      res.json(products);
    } catch (error) {
      console.error("Get shop products error:", error);
      res.status(500).json({ message: "Failed to fetch shop products" });
    }
  });

  app.post("/api/admin/shop/products", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const productData = createShopProductSchema.parse(req.body);
      const [product] = await db.insert(shopProducts).values(productData).returning();
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop product created: ${product.name}`,
        data: JSON.stringify(product),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Create shop product error:", error);
      res.status(500).json({ message: "Failed to create shop product" });
    }
  });

  app.put("/api/admin/shop/products/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const productData = createShopProductSchema.partial().parse(req.body);
      
      await db.update(shopProducts)
        .set({ ...productData, updatedAt: new Date() })
        .where(eq(shopProducts.id, productId));
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop product updated: ${productId}`,
        data: JSON.stringify(productData),
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update shop product error:", error);
      res.status(500).json({ message: "Failed to update shop product" });
    }
  });

  app.delete("/api/admin/shop/products/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      await db.delete(shopProducts).where(eq(shopProducts.id, productId));
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop product deleted: ${productId}`,
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shop product error:", error);
      res.status(500).json({ message: "Failed to delete shop product" });
    }
  });

  // Shop Orders Management
  app.get("/api/admin/shop/orders", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const orders = await db.select().from(shopOrders).orderBy(desc(shopOrders.createdAt));
      res.json(orders);
    } catch (error) {
      console.error("Get shop orders error:", error);
      res.status(500).json({ message: "Failed to fetch shop orders" });
    }
  });

  app.put("/api/admin/shop/orders/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      await db.update(shopOrders)
        .set({ status, updatedAt: new Date() })
        .where(eq(shopOrders.id, orderId));
      
      await adminStorage.addSystemLog({
        level: "info",
        message: `Shop order status updated: ${orderId} -> ${status}`,
        source: "admin_panel",
        adminUserId: req.adminUser!.id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update shop order status error:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // =====================================
  // VOICE AGENT ADMIN MANAGEMENT
  // =====================================

  // Get all voice agent requests (Admin)
  app.get("/api/admin/voice-agent/requests", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const requests = await voiceAgentRequestService.getAllRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get voice agent requests error:", error);
      res.status(500).json({ message: "Failed to fetch voice agent requests" });
    }
  });

  // Approve voice agent request (Admin)
  app.post("/api/admin/voice-agent/requests/:requestId/approve", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { phoneNumberId, adminNotes, maxCallsPerMonth } = req.body;
      
      if (!req.adminUser) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      const agent = await voiceAgentRequestService.approveRequest({
        requestId,
        approvedBy: req.adminUser.id,
        phoneNumberId,
        adminNotes,
        maxCallsPerMonth
      });

      res.json({
        message: "Voice agent request approved successfully",
        agent
      });
    } catch (error: any) {
      console.error("Approve voice agent request error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to approve voice agent request" 
      });
    }
  });

  // Reject voice agent request (Admin)
  app.post("/api/admin/voice-agent/requests/:requestId/reject", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { adminNotes } = req.body;

      await voiceAgentRequestService.rejectRequest(requestId, adminNotes || "Request rejected by admin");

      res.json({
        message: "Voice agent request rejected successfully"
      });
    } catch (error: any) {
      console.error("Reject voice agent request error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to reject voice agent request" 
      });
    }
  });

  // Revoke voice agent access (Admin)
  app.post("/api/admin/voice-agent/requests/:requestId/revoke", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { revokedReason } = req.body;

      await voiceAgentRequestService.revokeAccess(requestId, revokedReason || "Access revoked by admin");

      res.json({
        message: "Voice agent access revoked successfully"
      });
    } catch (error: any) {
      console.error("Revoke voice agent access error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to revoke voice agent access" 
      });
    }
  });

  // Get all phone numbers (Admin)
  app.get("/api/admin/voice-agent/phone-numbers", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const numbers = await db
        .select()
        .from(phoneNumbers)
        .orderBy(desc(phoneNumbers.createdAt));

      res.json(numbers);
    } catch (error) {
      console.error("Get phone numbers error:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Assign phone number to voice agent (Admin)
  app.post("/api/admin/voice-agent/assign-phone", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { agentId, phoneNumberId } = req.body;

      await db
        .update(voiceAgents)
        .set({ 
          phoneNumberId,
          updatedAt: new Date()
        })
        .where(eq(voiceAgents.id, agentId));

      res.json({
        message: "Phone number assigned successfully"
      });
    } catch (error: any) {
      console.error("Assign phone number error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to assign phone number" 
      });
    }
  });

  // Get voice agent usage statistics (Admin)
  app.get("/api/admin/voice-agent/usage-stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;

      // Get credit stats
      let creditQuery = db.select().from(voiceAgentCredits);
      if (tenantId) {
        creditQuery = creditQuery.where(eq(voiceAgentCredits.tenantId, parseInt(tenantId as string)));
      }
      const credits = await creditQuery;

      // Get transaction stats
      let transactionQuery = db.select().from(voiceAgentTransactions);
      if (tenantId) {
        transactionQuery = transactionQuery.where(eq(voiceAgentTransactions.tenantId, parseInt(tenantId as string)));
      }
      const transactions = await transactionQuery.orderBy(desc(voiceAgentTransactions.createdAt)).limit(100);

      // Calculate totals
      const totalCreditsAdded = credits.reduce((sum, credit) => sum + parseFloat(credit.totalCreditsAdded), 0);
      const totalCreditsUsed = credits.reduce((sum, credit) => sum + parseFloat(credit.totalCreditsUsed), 0);
      const totalCurrentBalance = credits.reduce((sum, credit) => sum + parseFloat(credit.creditBalance), 0);

      res.json({
        credits,
        transactions,
        summary: {
          totalCreditsAdded,
          totalCreditsUsed,
          totalCurrentBalance,
          activeTenants: credits.filter(c => c.isActive).length,
          totalTenants: credits.length
        }
      });
    } catch (error) {
      console.error("Get usage stats error:", error);
      res.status(500).json({ message: "Failed to fetch usage statistics" });
    }
  });

  // Manually add credits to tenant (Admin)
  app.post("/api/admin/voice-agent/add-credits", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { tenantId, amount, description } = req.body;

      await voiceAgentRequestService.addCredits({
        tenantId: parseInt(tenantId),
        amount: parseFloat(amount),
        description: description || `Admin credit adjustment: €${amount}`
      });

      res.json({
        message: "Credits added successfully"
      });
    } catch (error: any) {
      console.error("Add credits error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to add credits" 
      });
    }
  });
}