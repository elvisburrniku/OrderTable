import { eq, desc, and, count, sql } from "drizzle-orm";
import { db } from "./db";
import {
  adminUsers,
  adminSessions,
  systemSettings,
  systemLogs,
  tenants,
  users,
  restaurants,
  subscriptionPlans,
  userSubscriptions,
  bookings,
  type AdminUser,
  type InsertAdminUser,
  type SystemSetting,
  type InsertSystemSetting,
  type SystemLog,
  type InsertSystemLog,
} from "../shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export class AdminStorage {
  // Admin user management
  async createAdminUser(data: InsertAdminUser): Promise<AdminUser> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db
      .insert(adminUsers)
      .values({
        ...data,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    return user || null;
  }

  async getAdminUserById(id: number): Promise<AdminUser | null> {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    return user || null;
  }

  async verifyAdminPassword(email: string, password: string): Promise<AdminUser | null> {
    const user = await this.getAdminUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    // Update last login
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));

    return user;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
  }

  // Admin session management
  async createAdminSession(adminUserId: number): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db
      .insert(adminSessions)
      .values({
        id: sessionId,
        adminUserId,
        expiresAt,
      });

    return sessionId;
  }

  async getAdminSession(sessionId: string): Promise<{ adminUser: AdminUser } | null> {
    const [session] = await db
      .select({
        adminUser: adminUsers,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
      .where(and(
        eq(adminSessions.id, sessionId),
        sql`${adminSessions.expiresAt} > NOW()`
      ))
      .limit(1);

    return session || null;
  }

  async deleteAdminSession(sessionId: string): Promise<void> {
    await db
      .delete(adminSessions)
      .where(eq(adminSessions.id, sessionId));
  }

  // System settings management
  async getSystemSetting(key: string): Promise<SystemSetting | null> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    return setting || null;
  }

  async setSystemSetting(key: string, value: string, description?: string, type?: string, adminUserId?: number): Promise<void> {
    await db
      .insert(systemSettings)
      .values({
        key,
        value,
        description,
        type: type || 'string',
        updatedBy: adminUserId,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value,
          description,
          type: type || 'string',
          updatedBy: adminUserId,
          updatedAt: new Date(),
        },
      });
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.key);
  }

  // System logs
  async addSystemLog(data: InsertSystemLog): Promise<void> {
    await db
      .insert(systemLogs)
      .values(data);
  }

  async getSystemLogs(limit: number = 100, offset: number = 0): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Dashboard statistics
  async getDashboardStats() {
    const [tenantsCount] = await db
      .select({ count: count() })
      .from(tenants);

    const [usersCount] = await db
      .select({ count: count() })
      .from(users);

    const [restaurantsCount] = await db
      .select({ count: count() })
      .from(restaurants);

    const [bookingsCount] = await db
      .select({ count: count() })
      .from(bookings);

    const [activeTenantsCount] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.subscriptionStatus, 'active'));

    const [trialTenantsCount] = await db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.subscriptionStatus, 'trial'));

    return {
      totalTenants: tenantsCount.count,
      totalUsers: usersCount.count,
      totalRestaurants: restaurantsCount.count,
      totalBookings: bookingsCount.count,
      activeTenants: activeTenantsCount.count,
      trialTenants: trialTenantsCount.count,
    };
  }

  // Tenant management
  async getAllTenants() {
    try {
      // Get all tenants with their subscription plans
      const tenantsWithPlans = await db
        .select({
          // Tenant fields
          tenantId: tenants.id,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
          subscriptionStatus: tenants.subscriptionStatus,
          subscriptionPlanId: tenants.subscriptionPlanId,
          trialStartDate: tenants.trialStartDate,
          trialEndDate: tenants.trialEndDate,
          subscriptionStartDate: tenants.subscriptionStartDate,
          subscriptionEndDate: tenants.subscriptionEndDate,
          stripeCustomerId: tenants.stripeCustomerId,
          stripeSubscriptionId: tenants.stripeSubscriptionId,
          maxRestaurants: tenants.maxRestaurants,
          additionalRestaurants: tenants.additionalRestaurants,
          additionalRestaurantsCost: tenants.additionalRestaurantsCost,
          tenantCreatedAt: tenants.createdAt,
          // Plan fields
          planId: subscriptionPlans.id,
          planName: subscriptionPlans.name,
          planPrice: subscriptionPlans.price,
          planInterval: subscriptionPlans.interval,
          planFeatures: subscriptionPlans.features,
          planMaxTables: subscriptionPlans.maxTables,
          planMaxBookingsPerMonth: subscriptionPlans.maxBookingsPerMonth,
          planMaxRestaurants: subscriptionPlans.maxRestaurants,
          planTrialDays: subscriptionPlans.trialDays,
          planIsActive: subscriptionPlans.isActive,
        })
        .from(tenants)
        .leftJoin(subscriptionPlans, eq(tenants.subscriptionPlanId, subscriptionPlans.id))
        .orderBy(desc(tenants.createdAt));

      // Build the response with proper structure
      const result = tenantsWithPlans.map(row => ({
        tenant: {
          id: row.tenantId,
          name: row.tenantName,
          slug: row.tenantSlug,
          subscriptionStatus: row.subscriptionStatus,
          subscriptionPlanId: row.subscriptionPlanId,
          trialStartDate: row.trialStartDate,
          trialEndDate: row.trialEndDate,
          subscriptionStartDate: row.subscriptionStartDate,
          subscriptionEndDate: row.subscriptionEndDate,
          stripeCustomerId: row.stripeCustomerId,
          stripeSubscriptionId: row.stripeSubscriptionId,
          maxRestaurants: row.maxRestaurants,
          additionalRestaurants: row.additionalRestaurants,
          additionalRestaurantsCost: row.additionalRestaurantsCost,
          createdAt: row.tenantCreatedAt,
        },
        subscriptionPlan: row.planId ? {
          id: row.planId,
          name: row.planName,
          price: row.planPrice,
          interval: row.planInterval,
          features: row.planFeatures,
          maxTables: row.planMaxTables,
          maxBookingsPerMonth: row.planMaxBookingsPerMonth,
          maxRestaurants: row.planMaxRestaurants,
          trialDays: row.planTrialDays,
          isActive: row.planIsActive,
        } : null,
        restaurantCount: 0,
        userCount: 0,
        bookingCount: 0,
      }));

      return result;
    } catch (error) {
      console.error("Error in getAllTenants:", error);
      throw error;
    }
  }

  async getTenantById(id: number) {
    try {
      // Get tenant data using simple SQL execution
      const tenantResult = await db.execute(sql`
        SELECT 
          id, name, slug, subscription_status, subscription_plan_id,
          trial_start_date, trial_end_date, subscription_start_date, subscription_end_date,
          stripe_customer_id, stripe_subscription_id, max_restaurants,
          additional_restaurants, additional_restaurants_cost, created_at
        FROM tenants 
        WHERE id = ${id} 
        LIMIT 1
      `);

      if (!tenantResult.rows || tenantResult.rows.length === 0) return null;
      
      const tenant = tenantResult.rows[0] as any;

      // Get subscription plan if exists
      let subscriptionPlan = null;
      if (tenant.subscription_plan_id) {
        const planResult = await db.execute(sql`
          SELECT 
            id, name, price, interval, features, max_tables,
            max_bookings_per_month, max_restaurants, trial_days, is_active
          FROM subscription_plans 
          WHERE id = ${tenant.subscription_plan_id} 
          LIMIT 1
        `);
        subscriptionPlan = planResult.rows?.[0] || null;
      }

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subscriptionStatus: tenant.subscription_status,
          subscriptionPlanId: tenant.subscription_plan_id,
          trialStartDate: tenant.trial_start_date,
          trialEndDate: tenant.trial_end_date,
          subscriptionStartDate: tenant.subscription_start_date,
          subscriptionEndDate: tenant.subscription_end_date,
          stripeCustomerId: tenant.stripe_customer_id,
          stripeSubscriptionId: tenant.stripe_subscription_id,
          maxRestaurants: tenant.max_restaurants,
          additionalRestaurants: tenant.additional_restaurants,
          additionalRestaurantsCost: tenant.additional_restaurants_cost,
          createdAt: tenant.created_at,
        },
        subscriptionPlan: subscriptionPlan ? {
          id: subscriptionPlan.id,
          name: subscriptionPlan.name,
          price: subscriptionPlan.price,
          interval: subscriptionPlan.interval,
          features: subscriptionPlan.features,
          maxTables: subscriptionPlan.max_tables,
          maxBookingsPerMonth: subscriptionPlan.max_bookings_per_month,
          maxRestaurants: subscriptionPlan.max_restaurants,
          trialDays: subscriptionPlan.trial_days,
          isActive: subscriptionPlan.is_active,
        } : null,
        restaurants: [],
        users: [],
        restaurantCount: 0,
        userCount: 0,
        recentBookingsCount: 0,
      };
    } catch (error) {
      console.error("Error in getTenantById:", error);
      return null;
    }
  }

  async updateTenant(tenantId: number, updateData: {
    name?: string;
    subscriptionStatus?: string;
    subscriptionPlanId?: number;
    maxRestaurants?: number;
    additionalRestaurants?: number;
    additionalRestaurantsCost?: number;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }) {
    try {
      // Build SET clause dynamically
      const setParts = [];
      const values = [];
      
      if (updateData.name !== undefined) {
        setParts.push('name = $' + (values.length + 1));
        values.push(updateData.name);
      }
      if (updateData.subscriptionStatus !== undefined) {
        setParts.push('subscription_status = $' + (values.length + 1));
        values.push(updateData.subscriptionStatus);
      }
      if (updateData.subscriptionPlanId !== undefined) {
        setParts.push('subscription_plan_id = $' + (values.length + 1));
        values.push(updateData.subscriptionPlanId);
      }
      if (updateData.maxRestaurants !== undefined) {
        setParts.push('max_restaurants = $' + (values.length + 1));
        values.push(updateData.maxRestaurants);
      }
      if (updateData.additionalRestaurants !== undefined) {
        setParts.push('additional_restaurants = $' + (values.length + 1));
        values.push(updateData.additionalRestaurants);
      }
      if (updateData.additionalRestaurantsCost !== undefined) {
        setParts.push('additional_restaurants_cost = $' + (values.length + 1));
        values.push(updateData.additionalRestaurantsCost);
      }
      if (updateData.subscriptionStartDate !== undefined) {
        setParts.push('subscription_start_date = $' + (values.length + 1));
        values.push(updateData.subscriptionStartDate);
      }
      if (updateData.subscriptionEndDate !== undefined) {
        setParts.push('subscription_end_date = $' + (values.length + 1));
        values.push(updateData.subscriptionEndDate);
      }
      if (updateData.stripeCustomerId !== undefined) {
        setParts.push('stripe_customer_id = $' + (values.length + 1));
        values.push(updateData.stripeCustomerId);
      }
      if (updateData.stripeSubscriptionId !== undefined) {
        setParts.push('stripe_subscription_id = $' + (values.length + 1));
        values.push(updateData.stripeSubscriptionId);
      }

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      // Use simple approach for now - just update subscription status
      if (updateData.subscriptionStatus) {
        const result = await db.execute(sql`
          UPDATE tenants SET subscription_status = ${updateData.subscriptionStatus} WHERE id = ${tenantId} RETURNING *
        `);
        return result.rows?.[0] || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error in updateTenant:', error);
      throw error;
    }
  }

  async suspendTenant(tenantId: number, reason?: string) {
    await this.updateTenant(tenantId, { subscriptionStatus: 'suspended' });
    
    // Log the suspension
    await this.addSystemLog({
      level: 'info',
      message: `Tenant ${tenantId} suspended${reason ? ': ' + reason : ''}`,
      data: JSON.stringify({ tenantId, reason }),
      source: 'admin_panel',
      adminUserId: 1, // Should be passed from context
    });
  }

  async unsuspendTenant(tenantId: number) {
    // Simply set to active status for now
    await this.updateTenant(tenantId, { subscriptionStatus: 'active' });
    
    // Log the unsuspension
    await this.addSystemLog({
      level: 'info',
      message: `Tenant ${tenantId} unsuspended (status: active)`,
      data: JSON.stringify({ tenantId, newStatus: 'active' }),
      source: 'admin_panel',
      adminUserId: 1, // Should be passed from context
    });
  }

  async pauseTenant(tenantId: number, pauseUntil?: Date) {
    const updateData: any = { subscriptionStatus: 'paused' };
    
    if (pauseUntil) {
      // Store pause end date in a metadata field or extend schema
      updateData.subscriptionEndDate = pauseUntil;
    }

    await this.updateTenant(tenantId, updateData);
    
    // Log the pause
    await this.addSystemLog({
      level: 'info',
      message: `Tenant ${tenantId} paused${pauseUntil ? ' until ' + pauseUntil : ''}`,
      data: JSON.stringify({ tenantId, pauseUntil }),
      source: 'admin_panel',
      adminUserId: 1, // Should be passed from context
    });
  }

  async getTenantStats(tenantId: number) {
    const [restaurantCount] = await db
      .select({ count: count() })
      .from(restaurants)
      .where(eq(restaurants.tenantId, tenantId));

    const [userCount] = await db
      .select({ count: count() })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));

    const [totalBookings] = await db
      .select({ count: count() })
      .from(bookings)
      .where(eq(bookings.tenantId, tenantId));

    const [thisMonthBookings] = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          sql`${bookings.createdAt} >= DATE_TRUNC('month', CURRENT_DATE)`
        )
      );

    const [upcomingBookings] = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          sql`${bookings.dateFrom} >= CURRENT_DATE`
        )
      );

    return {
      restaurantCount: restaurantCount.count,
      userCount: userCount.count,
      totalBookings: totalBookings.count,
      thisMonthBookings: thisMonthBookings.count,
      upcomingBookings: upcomingBookings.count,
    };
  }

  // Subscription plan management
  async getAllSubscriptionPlans() {
    return await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.price);
  }

  async createSubscriptionPlan(data: any) {
    const [plan] = await db
      .insert(subscriptionPlans)
      .values(data)
      .returning();
    return plan;
  }

  async updateSubscriptionPlan(id: number, data: any) {
    await db
      .update(subscriptionPlans)
      .set(data)
      .where(eq(subscriptionPlans.id, id));
  }

  async deleteSubscriptionPlan(id: number) {
    await db
      .delete(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
  }
}

export const adminStorage = new AdminStorage();