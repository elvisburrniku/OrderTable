import { eq, desc, and, count, sql } from "drizzle-orm";
import { db } from "./db";
import {
  adminUsers,
  adminSessions,
  systemSettings,
  systemLogs,
  tenants,
  tenantUsers,
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
    if (!db) {
      console.log("Database not available - skipping admin user creation");
      return {
        id: 1,
        email: data.email,
        name: data.name,
        role: data.role,
        password: await bcrypt.hash(data.password, 10),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AdminUser;
    }
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
    if (!db) {
      console.log("Database not available - returning empty admin users array");
      return [];
    }
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
    if (!db) {
      console.log("Database not available - returning default system settings");
      return [];
    }
    return await db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.key);
  }

  // System logs
  async addSystemLog(data: InsertSystemLog): Promise<void> {
    if (!db) {
      console.log("Database not available - skipping system log creation");
      return;
    }
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
    if (!db) {
      console.log("Database not available - returning mock tenant data");
      return [{
        tenant: {
          id: 1,
          name: "Demo Restaurant",
          slug: "demo-restaurant",
          subscriptionStatus: "active",
          subscriptionPlanId: 1,
          trialStartDate: new Date().toISOString(),
          trialEndDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
          pauseStartDate: null,
          pauseEndDate: null,
          pauseReason: null,
          suspendReason: null,
          stripeCustomerId: "cus_demo123",
          stripeSubscriptionId: "sub_demo123",
          maxRestaurants: 1,
          additionalRestaurants: 0,
          additionalRestaurantsCost: 0,
          createdAt: new Date().toISOString(),
        },
        subscriptionPlan: {
          id: 1,
          name: "Free",
          price: 0,
          interval: "month",
          features: "Basic features",
          maxTables: 10,
          maxBookingsPerMonth: 100,
          maxRestaurants: 1,
          trialDays: 30,
          isActive: true,
        },
        restaurantCount: 1,
        userCount: 1,
        bookingCount: 0,
      }];
    }
    
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
          pauseStartDate: tenants.pauseStartDate,
          pauseEndDate: tenants.pauseEndDate,
          pauseReason: tenants.pauseReason,
          suspendReason: tenants.suspendReason,
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

      // Get counts for each tenant
      const result = [];
      for (const row of tenantsWithPlans) {
        // Get restaurant count for this tenant
        const restaurantCountResult = await db
          .select({ count: count() })
          .from(restaurants)
          .where(eq(restaurants.tenantId, row.tenantId));
        
        // Get user count for this tenant  
        const userCountResult = await db
          .select({ count: count() })
          .from(users)
          .innerJoin(tenantUsers, eq(users.id, tenantUsers.userId))
          .where(eq(tenantUsers.tenantId, row.tenantId));

        // Get booking count for this tenant
        const bookingCountResult = await db
          .select({ count: count() })
          .from(bookings)
          .innerJoin(restaurants, eq(bookings.restaurantId, restaurants.id))
          .where(eq(restaurants.tenantId, row.tenantId));

        result.push({
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
            pauseStartDate: row.pauseStartDate,
            pauseEndDate: row.pauseEndDate,
            pauseReason: row.pauseReason,
            suspendReason: row.suspendReason,
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
          restaurantCount: restaurantCountResult[0]?.count || 0,
          userCount: userCountResult[0]?.count || 0,
          bookingCount: bookingCountResult[0]?.count || 0,
        });
      }

      return result;
    } catch (error) {
      console.error("Error in getAllTenants:", error);
      throw error;
    }
  }

  async getTenantById(id: number) {
    if (!db) {
      console.log("Database not available - returning mock tenant detail data");
      return {
        tenant: {
          id: 1,
          name: "Demo Restaurant",
          slug: "demo-restaurant",
          subscriptionStatus: "active",
          subscriptionPlanId: 1,
          trialStartDate: new Date().toISOString(),
          trialEndDate: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
          pauseStartDate: null,
          pauseEndDate: null,
          pauseReason: null,
          suspendReason: null,
          stripeCustomerId: "cus_demo123",
          stripeSubscriptionId: "sub_demo123",
          maxRestaurants: 1,
          additionalRestaurants: 0,
          additionalRestaurantsCost: 0,
          createdAt: new Date().toISOString(),
        },
        subscriptionPlan: {
          id: 1,
          name: "Free",
          price: 0,
          interval: "month",
          features: "Basic features",
          maxTables: 10,
          maxBookingsPerMonth: 100,
          maxRestaurants: 1,
          trialDays: 30,
          isActive: true,
        },
        restaurants: [{
          id: 1,
          name: "Demo Restaurant",
          address: "123 Demo Street",
          phone: "+1-555-0123",
          email: "demo@restaurant.com",
          setupCompleted: true,
          guestBookingEnabled: true,
          createdAt: new Date().toISOString(),
          userName: "Demo User",
          userEmail: "user@demo.com",
        }],
        users: [{
          id: 1,
          email: "user@demo.com",
          name: "Demo User",
          restaurantName: "Demo Restaurant",
          ssoProvider: "local",
          createdAt: new Date().toISOString(),
          role: "owner",
        }],
        restaurantCount: 1,
        userCount: 1,
        bookingCount: 0,
        recentBookingsCount: 0,
      };
    }
    
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
          pauseStartDate: tenant.pause_start_date,
          pauseEndDate: tenant.pause_end_date,
          pauseReason: tenant.pause_reason,
          suspendReason: tenant.suspend_reason,
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
      };

      // Fetch additional data
      const restaurants = await this.getRestaurantsByTenantId(id);
      const users = await this.getUsersByTenantId(id);

      return {
        ...result,
        restaurants,
        users,
        restaurantCount: restaurants.length,
        userCount: users.length,
        recentBookingsCount: 0,
      };
    } catch (error) {
      console.error("Error in getTenantById:", error);
      return null;
    }
  }

  async getRestaurantsByTenantId(tenantId: number) {
    try {
      console.log(`AdminStorage: Fetching restaurants for tenant ${tenantId}`);
      const restaurantsResult = await db.execute(sql`
        SELECT 
          r.id, r.name, r.address, r.phone, r.email, r.description,
          r.setup_completed, r.guest_booking_enabled, r.is_active,
          r.paused_at, r.pause_reason, r.created_at,
          u.name as user_name, u.email as user_email
        FROM restaurants r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.tenant_id = ${tenantId}
        ORDER BY r.created_at DESC
      `);

      console.log(`AdminStorage: Found ${restaurantsResult.rows?.length || 0} restaurants for tenant ${tenantId}`);
      
      const mappedRestaurants = restaurantsResult.rows?.map((restaurant: any) => ({
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        description: restaurant.description,
        setupCompleted: restaurant.setup_completed,
        guestBookingEnabled: restaurant.guest_booking_enabled,
        isActive: restaurant.is_active,
        pausedAt: restaurant.paused_at,
        pauseReason: restaurant.pause_reason,
        createdAt: restaurant.created_at,
        userName: restaurant.user_name,
        userEmail: restaurant.user_email,
      })) || [];

      console.log(`AdminStorage: Returning ${mappedRestaurants.length} mapped restaurants`);
      return mappedRestaurants;
    } catch (error) {
      console.error("Error fetching restaurants by tenant ID:", error);
      return [];
    }
  }

  async getUsersByTenantId(tenantId: number) {
    try {
      const usersResult = await db.execute(sql`
        SELECT 
          u.id, u.name, u.email, u.created_at,
          tu.role,
          r.name as restaurant_name
        FROM users u
        INNER JOIN tenant_users tu ON u.id = tu.user_id
        LEFT JOIN restaurants r ON u.id = r.user_id AND r.tenant_id = ${tenantId}
        WHERE tu.tenant_id = ${tenantId}
        ORDER BY u.created_at DESC
      `);

      return usersResult.rows?.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantName: user.restaurant_name,
        createdAt: user.created_at,
      })) || [];
    } catch (error) {
      console.error("Error fetching users by tenant ID:", error);
      return [];
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

  async pauseTenant(tenantId: number, pauseUntil?: Date, reason?: string) {
    try {
      // Update tenant with pause information
      await db.execute(sql`
        UPDATE tenants 
        SET 
          subscription_status = 'paused',
          pause_start_date = NOW(),
          pause_end_date = ${pauseUntil || null},
          pause_reason = ${reason || null}
        WHERE id = ${tenantId}
      `);
      
      // Create unpause schedule entry if end date is provided
      if (pauseUntil) {
        await this.createUnpauseSchedule(tenantId, pauseUntil, reason);
      }
      
      // Log the pause
      await this.addSystemLog({
        level: 'info',
        message: `Tenant ${tenantId} paused${pauseUntil ? ' until ' + pauseUntil.toISOString() : ''}${reason ? ' - Reason: ' + reason : ''}`,
        data: JSON.stringify({ tenantId, pauseUntil, reason }),
        source: 'admin_panel',
        adminUserId: 1, // Should be passed from context
      });
    } catch (error) {
      console.error("Error pausing tenant:", error);
      throw error;
    }
  }

  async createUnpauseSchedule(tenantId: number, unpauseDate: Date, reason?: string) {
    try {
      // Create a scheduled task entry
      await db.execute(sql`
        INSERT INTO system_logs (level, message, data, source, created_at)
        VALUES (
          'scheduled',
          ${`Tenant ${tenantId} scheduled for automatic unpause`},
          ${JSON.stringify({ 
            tenantId, 
            unpauseDate: unpauseDate.toISOString(),
            reason,
            scheduleType: 'auto_unpause',
            status: 'pending'
          })},
          'scheduler',
          NOW()
        )
      `);

      // Get tenant info for better logging
      const tenantInfo = await this.getTenantById(tenantId);
      const tenantName = tenantInfo?.tenant?.name || `Tenant ${tenantId}`;

      console.log(`📅 Unpause scheduled: ${tenantName} will be automatically unpaused on ${unpauseDate.toLocaleString()}`);
      
      // Calculate time until unpause for immediate feedback
      const timeUntilUnpause = unpauseDate.getTime() - Date.now();
      const hoursUntilUnpause = Math.round(timeUntilUnpause / (1000 * 60 * 60));
      
      if (hoursUntilUnpause > 0) {
        console.log(`⏱️  Time until automatic unpause: ${hoursUntilUnpause} hours`);
      } else {
        console.log(`⚠️  Unpause date is in the past - tenant will be unpaused on next check cycle`);
      }

    } catch (error) {
      console.error("Error creating unpause schedule:", error);
      // Don't throw here to avoid breaking the pause operation
    }
  }

  async checkAndUnpauseExpiredTenants() {
    try {
      // Find all paused tenants with expired pause periods
      const expiredPausedTenants = await db.execute(sql`
        SELECT id, name, pause_end_date, pause_reason
        FROM tenants 
        WHERE subscription_status = 'paused' 
          AND pause_end_date IS NOT NULL 
          AND pause_end_date AT TIME ZONE 'UTC' <= NOW() AT TIME ZONE 'UTC'
      `);
      
      console.log(`Checking for expired pauses: Found ${expiredPausedTenants.rows.length} expired tenant(s)`);
      
      if (expiredPausedTenants.rows.length > 0) {
        console.log('Expired tenants:', expiredPausedTenants.rows.map(t => `${t.name} (ID: ${t.id})`));
      }

      for (const tenant of expiredPausedTenants.rows) {
        try {
          // Unpause the tenant
          await db.execute(sql`
            UPDATE tenants 
            SET 
              subscription_status = 'active',
              pause_start_date = NULL,
              pause_end_date = NULL,
              pause_reason = NULL
            WHERE id = ${tenant.id}
          `);

          // Update the scheduled task status
          await db.execute(sql`
            UPDATE system_logs 
            SET 
              level = 'completed',
              message = ${`Tenant ${tenant.id} (${tenant.name}) automatically unpaused - schedule completed`},
              data = ${JSON.stringify({ 
                tenantId: tenant.id, 
                pauseEndDate: tenant.pause_end_date,
                previousReason: tenant.pause_reason,
                scheduleType: 'auto_unpause',
                status: 'completed',
                completedAt: new Date().toISOString()
              })}
            WHERE source = 'scheduler' 
              AND data LIKE ${`%"tenantId":${tenant.id}%`}
              AND data LIKE '%"scheduleType":"auto_unpause"%'
              AND level = 'scheduled'
          `);

          // Log the automatic unpause
          await this.addSystemLog({
            level: 'info',
            message: `🎉 Tenant ${tenant.id} (${tenant.name}) automatically unpaused after pause period expired`,
            data: JSON.stringify({ 
              tenantId: tenant.id, 
              pauseEndDate: tenant.pause_end_date,
              previousReason: tenant.pause_reason,
              unpausedAt: new Date().toISOString()
            }),
            source: 'system_automation',
            adminUserId: null,
          });

          console.log(`🎉 Automatically unpaused tenant ${tenant.id} (${tenant.name}) - schedule completed`);
        } catch (error) {
          console.error(`Error auto-unpausing tenant ${tenant.id}:`, error);
        }
      }

      return expiredPausedTenants.rows.length;
    } catch (error) {
      console.error("Error checking for expired paused tenants:", error);
      return 0;
    }
  }

  async getUpcomingUnpauseSchedules() {
    try {
      // Get all pending unpause schedules
      const upcomingSchedules = await db.execute(sql`
        SELECT 
          t.id as tenant_id,
          t.name as tenant_name,
          t.pause_start_date,
          t.pause_end_date,
          t.pause_reason,
          sl.created_at as scheduled_at,
          sl.data as schedule_data
        FROM tenants t
        LEFT JOIN system_logs sl ON sl.data LIKE CONCAT('%"tenantId":', t.id, '%')
          AND sl.source = 'scheduler' 
          AND sl.level = 'scheduled'
          AND sl.data LIKE '%"scheduleType":"auto_unpause"%'
        WHERE t.subscription_status = 'paused' 
          AND t.pause_end_date IS NOT NULL 
          AND t.pause_end_date > NOW()
        ORDER BY t.pause_end_date ASC
      `);

      return upcomingSchedules.rows.map(schedule => ({
        tenantId: schedule.tenant_id,
        tenantName: schedule.tenant_name,
        pauseStartDate: schedule.pause_start_date,
        pauseEndDate: schedule.pause_end_date,
        pauseReason: schedule.pause_reason,
        scheduledAt: schedule.scheduled_at,
        timeUntilUnpause: Math.max(0, new Date(schedule.pause_end_date).getTime() - Date.now()),
        hoursUntilUnpause: Math.max(0, Math.round((new Date(schedule.pause_end_date).getTime() - Date.now()) / (1000 * 60 * 60)))
      }));
    } catch (error) {
      console.error("Error getting upcoming unpause schedules:", error);
      return [];
    }
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