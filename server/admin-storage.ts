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
    return await db
      .select({
        tenant: tenants,
        subscriptionPlan: subscriptionPlans,
        userCount: count(users.id),
      })
      .from(tenants)
      .leftJoin(subscriptionPlans, eq(tenants.subscriptionPlanId, subscriptionPlans.id))
      .leftJoin(users, eq(tenants.id, users.id))
      .groupBy(tenants.id, subscriptionPlans.id)
      .orderBy(desc(tenants.createdAt));
  }

  async getTenantById(id: number) {
    const [tenant] = await db
      .select({
        tenant: tenants,
        subscriptionPlan: subscriptionPlans,
      })
      .from(tenants)
      .leftJoin(subscriptionPlans, eq(tenants.subscriptionPlanId, subscriptionPlans.id))
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) return null;

    // Get tenant's restaurants and users
    const restaurants = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.tenantId, id));

    const tenantUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, id)); // This might need adjustment based on your tenant-user relationship

    return {
      ...tenant,
      restaurants,
      users: tenantUsers,
    };
  }

  async updateTenantSubscription(tenantId: number, subscriptionData: any) {
    await db
      .update(tenants)
      .set({
        subscriptionStatus: subscriptionData.status,
        subscriptionPlanId: subscriptionData.planId,
        subscriptionStartDate: subscriptionData.startDate,
        subscriptionEndDate: subscriptionData.endDate,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
      })
      .where(eq(tenants.id, tenantId));
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