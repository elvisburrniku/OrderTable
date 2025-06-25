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
    const tenantsWithStats = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
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
        createdAt: tenants.createdAt,
        planName: subscriptionPlans.name,
        planPrice: subscriptionPlans.price,
        planMaxTables: subscriptionPlans.maxTables,
        planMaxBookingsPerMonth: subscriptionPlans.maxBookingsPerMonth,
        planMaxRestaurants: subscriptionPlans.maxRestaurants,
      })
      .from(tenants)
      .leftJoin(subscriptionPlans, eq(tenants.subscriptionPlanId, subscriptionPlans.id))
      .orderBy(desc(tenants.createdAt));

    // Get counts for each tenant
    const tenantsWithCounts = await Promise.all(
      tenantsWithStats.map(async (tenant) => {
        const [restaurantCount] = await db
          .select({ count: count() })
          .from(restaurants)
          .where(eq(restaurants.tenantId, tenant.id));

        const [userCount] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.tenantId, tenant.id));

        const [bookingCount] = await db
          .select({ count: count() })
          .from(bookings)
          .where(eq(bookings.tenantId, tenant.id));

        return {
          ...tenant,
          restaurantCount: restaurantCount.count,
          userCount: userCount.count,
          bookingCount: bookingCount.count,
        };
      })
    );

    return tenantsWithCounts;
  }

  async getTenantById(id: number) {
    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
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
        createdAt: tenants.createdAt,
        planName: subscriptionPlans.name,
        planPrice: subscriptionPlans.price,
        planInterval: subscriptionPlans.interval,
        planFeatures: subscriptionPlans.features,
        planMaxTables: subscriptionPlans.maxTables,
        planMaxBookingsPerMonth: subscriptionPlans.maxBookingsPerMonth,
        planMaxRestaurants: subscriptionPlans.maxRestaurants,
        planTrialDays: subscriptionPlans.trialDays,
      })
      .from(tenants)
      .leftJoin(subscriptionPlans, eq(tenants.subscriptionPlanId, subscriptionPlans.id))
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) return null;

    // Get tenant's restaurants with details
    const tenantRestaurants = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        address: restaurants.address,
        phone: restaurants.phone,
        email: restaurants.email,
        description: restaurants.description,
        setupCompleted: restaurants.setupCompleted,
        guestBookingEnabled: restaurants.guestBookingEnabled,
        createdAt: restaurants.createdAt,
        userId: restaurants.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(restaurants)
      .leftJoin(users, eq(restaurants.userId, users.id))
      .where(eq(restaurants.tenantId, id))
      .orderBy(restaurants.createdAt);

    // Get tenant's users
    const tenantUsersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        restaurantName: users.restaurantName,
        ssoProvider: users.ssoProvider,
        createdAt: users.createdAt,
        role: tenantUsers.role,
      })
      .from(users)
      .innerJoin(tenantUsers, eq(users.id, tenantUsers.userId))
      .where(eq(tenantUsers.tenantId, id))
      .orderBy(users.createdAt);

    // Get recent bookings count
    const [recentBookingsCount] = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.tenantId, id),
          sql`${bookings.createdAt} >= NOW() - INTERVAL '30 days'`
        )
      );

    return {
      ...tenant,
      restaurants: tenantRestaurants,
      users: tenantUsersList,
      recentBookingsCount: recentBookingsCount.count,
    };
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
    const [updatedTenant] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, tenantId))
      .returning();
    
    return updatedTenant;
  }

  async suspendTenant(tenantId: number, reason?: string) {
    await this.updateTenant(tenantId, { subscriptionStatus: 'suspended' });
    
    // Log the suspension
    await this.createSystemLog({
      level: 'info',
      category: 'tenant_management',
      message: `Tenant ${tenantId} suspended${reason ? ': ' + reason : ''}`,
      metadata: { tenantId, reason },
    });
  }

  async unsuspendTenant(tenantId: number) {
    // Determine appropriate status based on subscription dates
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    let newStatus = 'active';
    const now = new Date();
    
    if (tenant.trialEndDate && now < new Date(tenant.trialEndDate)) {
      newStatus = 'trial';
    } else if (tenant.subscriptionEndDate && now > new Date(tenant.subscriptionEndDate)) {
      newStatus = 'expired';
    }

    await this.updateTenant(tenantId, { subscriptionStatus: newStatus });
    
    // Log the unsuspension
    await this.createSystemLog({
      level: 'info',
      category: 'tenant_management',
      message: `Tenant ${tenantId} unsuspended, status set to ${newStatus}`,
      metadata: { tenantId, newStatus },
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
    await this.createSystemLog({
      level: 'info',
      category: 'tenant_management',
      message: `Tenant ${tenantId} paused${pauseUntil ? ' until ' + pauseUntil.toISOString() : ''}`,
      metadata: { tenantId, pauseUntil },
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