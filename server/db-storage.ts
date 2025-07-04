import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, gte, lte, sql, lt, or } from "drizzle-orm";
import { IStorage } from "./storage";
const {
  users,
  tenants,
  tenantUsers,
  restaurants,
  tables,
  bookings,
  customers,
  subscriptionPlans,
  userSubscriptions,
  smsMessages,
  waitingList,
  feedback,
  feedbackQuestions,
  feedbackResponses,
  activityLog,
  timeSlots,
  rooms,
  combinedTables,
  bookingChangeRequests,
  notifications,
  openingHours,
  specialPeriods,
  cutOffTimes,
  tableLayouts,
  roles,
  permissions,
  integrationConfigurations,
  resolvedConflicts,
  menuCategories,
  menuItems,
  seasonalMenuThemes,
  menuPrintOrders,
  seatingConfigurations,
  periodicCriteria,
  customFields,
  bookingAgents,
  smsSettings,
  smsBalance,
  surveyResponses,
  surveySchedules,
  kitchenOrders,
  kitchenStations,
  kitchenStaff,
  kitchenMetrics,
  printOrders,
  productGroups,
  products,
  paymentSetups,
  floorPlans,
  floorPlanTemplates,
  stripePayments,
  stripeTransfers,
  webhookLogs,
} = schema;
export class DatabaseStorage implements IStorage {
  db: any;
  constructor() {
    if (!process.env.DATABASE_URL) {
      console.error(
        "No database connection string found. Database operations will fail until a proper connection string is provided.",
      );
      console.error(
        "No database connection string found. Database operations will be disabled until proper connection is configured.",
      );
      console.error(
        "DatabaseStorage initialized without database connection. All operations will throw errors until database is properly configured.",
      );
      return;
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql, { schema });
  }
  async initialize() {
    if (!this.db) {
      console.error(
        "Cannot initialize data without database connection. Please provide DATABASE_URL or SUPABASE_DATABASE_URL environment variable.",
      );
      return;
    }
    await this.initializeSubscriptionPlans();
    await this.initializeSystemRoles();
  }
  private async initializeSubscriptionPlans() {
    try {
      const existingPlans = await this.db
        .select()
        .from(subscriptionPlans)
        .limit(1);
      if (existingPlans.length === 0) {
        await this.db.insert(subscriptionPlans).values([
          {
            name: "Free",
            price: 0,
            interval: "monthly",
            features: JSON.stringify([
              "Basic booking management",
              "Up to 3 tables",
              "Email notifications",
            ]),
            maxTables: 3,
            maxBookingsPerMonth: 20,
            maxRestaurants: 1,
            trialDays: 0,
            isActive: true,
          },
          {
            name: "Starter",
            price: 2900,
            interval: "monthly",
            features: JSON.stringify([
              "Advanced booking management",
              "Customer CRM",
              "SMS notifications",
              "Analytics",
            ]),
            maxTables: 10,
            maxBookingsPerMonth: 100,
            maxRestaurants: 1,
            trialDays: 14,
            isActive: true,
          },
          {
            name: "Professional",
            price: 7900,
            interval: "monthly",
            features: JSON.stringify([
              "Everything in Starter",
              "Multiple restaurants",
              "API access",
              "Priority support",
            ]),
            maxTables: 50,
            maxBookingsPerMonth: 500,
            maxRestaurants: 3,
            trialDays: 14,
            isActive: true,
          },
          {
            name: "Enterprise",
            price: 19900,
            interval: "monthly",
            features: JSON.stringify([
              "Everything in Professional",
              "Unlimited tables",
              "Custom integrations",
              "Dedicated support",
            ]),
            maxTables: 999,
            maxBookingsPerMonth: 9999,
            maxRestaurants: 10,
            trialDays: 30,
            isActive: true,
          },
        ]);
        console.log("Initialized subscription plans in database");
      }
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
    }
  }

  private async initializeSystemRoles() {
    try {
      const existingRoles = await this.db
        .select()
        .from(roles)
        .where(eq(roles.isSystem, true))
        .limit(1);

      if (existingRoles.length === 0) {
        console.log("Creating default system roles...");
        
        const defaultRoles = [
          {
            tenantId: null,
            name: "owner",
            displayName: "Owner",
            permissions: JSON.stringify([
              "access_dashboard", "access_bookings", "access_customers", "access_menu",
              "access_tables", "access_kitchen", "access_users", "access_billing",
              "access_reports", "access_notifications", "access_integrations", "access_settings",
              "access_floor_plan", "view_bookings", "create_bookings", "edit_bookings",
              "delete_bookings", "view_customers", "edit_customers", "view_settings",
              "edit_settings", "view_menu", "edit_menu", "view_tables", "edit_tables",
              "view_kitchen", "manage_kitchen", "view_users", "manage_users",
              "view_billing", "manage_billing", "view_reports", "view_notifications",
              "manage_notifications", "view_integrations", "manage_integrations"
            ]),
            isSystem: true,
          },
          {
            tenantId: null,
            name: "manager",
            displayName: "Manager",
            permissions: JSON.stringify([
              "access_dashboard", "access_bookings", "access_customers", "access_menu",
              "access_tables", "access_kitchen", "access_reports", "access_settings",
              "view_bookings", "create_bookings", "edit_bookings", "delete_bookings",
              "view_customers", "edit_customers", "view_settings", "edit_settings",
              "view_menu", "edit_menu", "view_tables", "edit_tables",
              "view_kitchen", "manage_kitchen", "view_reports"
            ]),
            isSystem: true,
          },
          {
            tenantId: null,
            name: "agent",
            displayName: "Booking Agent",
            permissions: JSON.stringify([
              "access_dashboard", "access_bookings", "access_customers",
              "view_bookings", "create_bookings", "edit_bookings",
              "view_customers", "edit_customers"
            ]),
            isSystem: true,
          },
          {
            tenantId: null,
            name: "kitchen_staff",
            displayName: "Kitchen Staff",
            permissions: JSON.stringify([
              "access_dashboard", "access_kitchen",
              "view_kitchen", "manage_kitchen"
            ]),
            isSystem: true,
          },
        ];

        await this.db.insert(roles).values(defaultRoles);
        console.log("Default system roles created successfully");
      } else {
        console.log("System roles already exist");
      }
    } catch (error) {
      console.error("Error initializing system roles:", error);
    }
  }
  // Stub methods for interface compliance
  async createTenant(tenant: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newTenant] = await this.db
      .insert(tenants)
      .values(tenant)
      .returning();
    return newTenant;
  }

  async getTenant(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id));
    return result[0];
  }

  async getUserTenants(userId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    
    try {
      // Get all tenants the user is associated with using raw SQL to avoid complex query issues
      const tenantsResult = await this.db.execute(sql`
        SELECT 
          t.id,
          t.name,
          t.slug,
          t.subscription_status as "subscriptionStatus",
          t.max_restaurants as "maxRestaurants",
          CASE WHEN tu.role = 'owner' THEN true ELSE false END as "isOwner"
        FROM tenant_users tu
        LEFT JOIN tenants t ON tu.tenant_id = t.id
        WHERE tu.user_id = ${userId}
      `);

      // For each tenant, get their restaurants
      const result = await Promise.all(
        tenantsResult.rows.map(async (tenant: any) => {
          if (!tenant.id) return { ...tenant, restaurants: [] };
          
          const restaurantsResult = await this.db.execute(sql`
            SELECT 
              id,
              name,
              tenant_id as "tenantId",
              description,
              address,
              email,
              phone
            FROM restaurants
            WHERE tenant_id = ${tenant.id}
          `);

          return {
            ...tenant,
            restaurants: restaurantsResult.rows || [],
          };
        })
      );

      return result.filter(t => t.id); // Filter out any null tenants
    } catch (error) {
      console.error("Error in getUserTenants:", error);
      throw error;
    }
  }

  async getRestaurantByTenant(tenantId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.tenantId, tenantId))
      .limit(1);
    return result[0];
  }

  async getRestaurantsByTenant(tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.tenantId, tenantId));
    return result;
  }
  async getTenantByUserId(userId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select({
        tenant: tenants,
        tenantUser: tenantUsers,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(eq(tenantUsers.userId, userId))
      .limit(1);
    return result[0]?.tenant;
  }
  async getTenantById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id));
    return result[0];
  }
  async getTenantByStripeCustomerId(stripeCustomerId: string): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.stripeCustomerId, stripeCustomerId));
    return result[0];
  }
  async updateTenant(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, id))
      .returning();
    return result[0];
  }
  async createTenantUser(tenantUser: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newTenantUser] = await this.db
      .insert(tenantUsers)
      .values(tenantUser)
      .returning();
    return newTenantUser;
  }
  async getUser(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserById(id: number): Promise<any> {
    if (!this.db) {
      throw new Error("Database connection not available");
    }
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserByEmail(email: string): Promise<any> {
    if (!this.db) {
      throw new Error(
        "Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.",
      );
    }
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return result[0];
  }
  async getUserBySSOId(ssoProvider: string, ssoId: string): Promise<any> {
    if (!this.db) {
      throw new Error(
        "Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.",
      );
    }
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.ssoProvider, ssoProvider), eq(users.ssoId, ssoId)));
    return result[0];
  }
  async createUser(insertUser: any): Promise<any> {
    if (!this.db) {
      throw new Error(
        "Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.",
      );
    }
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async getAllUsers(): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db.select().from(users);
  }
  async getAllTenants(): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db.select().from(tenants);
  }
  async updateUser(id: number, updates: any): Promise<any> {
    const result = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
  async deleteUserAccount(userId: number): Promise<void> {
    if (!this.db) throw new Error("Database connection not available");
    // Get user tenant to cascade delete tenant data
    const user = await this.getUserById(userId);
    if (!user) return;
    const tenantId = user.tenantId;
    try {
      // Delete in reverse dependency order to avoid foreign key constraints
      // Delete notifications for all restaurants owned by this tenant
      if (tenantId) {
        await this.db.execute(
          sql`DELETE FROM notifications WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete booking change requests
        await this.db.execute(
          sql`DELETE FROM booking_change_requests WHERE booking_id IN (SELECT id FROM bookings WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId}))`,
        );
        // Delete activity logs
        await this.db.execute(
          sql`DELETE FROM activity_log WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete feedback
        await this.db.execute(
          sql`DELETE FROM feedback WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete SMS messages
        await this.db.execute(
          sql`DELETE FROM sms_messages WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete waiting list entries
        await this.db.execute(
          sql`DELETE FROM waiting_list WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete customers
        await this.db.execute(
          sql`DELETE FROM customers WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete bookings
        await this.db.execute(
          sql`DELETE FROM bookings WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete table layouts
        await this.db.execute(
          sql`DELETE FROM table_layouts WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete combined tables
        await this.db.execute(
          sql`DELETE FROM combined_tables WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete tables
        await this.db.execute(
          sql`DELETE FROM tables WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete rooms
        await this.db.execute(
          sql`DELETE FROM rooms WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete cut-off times
        await this.db.execute(
          sql`DELETE FROM cut_off_times WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete special periods
        await this.db.execute(
          sql`DELETE FROM special_periods WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete opening hours
        await this.db.execute(
          sql`DELETE FROM opening_hours WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete integration configurations
        await this.db.execute(
          sql`DELETE FROM integration_configurations WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`,
        );
        // Delete restaurants
        await this.db
          .delete(restaurants)
          .where(eq(restaurants.tenantId, tenantId));
        // Delete tenant
        await this.db.delete(tenants).where(eq(tenants.id, tenantId));
      }
      // Delete user subscriptions
      await this.db
        .delete(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));
      // Delete tenant user associations
      await this.db.delete(tenantUsers).where(eq(tenantUsers.userId, userId));
      // Finally delete the user
      await this.db.delete(users).where(eq(users.id, userId));
    } catch (error) {
      console.error("Error deleting user account:", error);
      throw new Error("Failed to delete user account");
    }
  }
  async getRestaurant(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return result[0];
  }
  async getRestaurantByUserId(userId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId));
    return result[0];
  }
  async getRestaurantById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return result[0];
  }
  async getRestaurantsByTenantId(tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.tenantId, tenantId));
    return result;
  }
  async createRestaurant(restaurant: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .insert(restaurants)
      .values(restaurant)
      .returning();
    return result[0];
  }
  async updateRestaurant(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(restaurants)
      .set(updates)
      .where(eq(restaurants.id, id))
      .returning();
    return result[0];
  }
  async getTablesByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        isActive: tables.isActive,
        restaurantId: tables.restaurantId,
        tenantId: tables.tenantId,
        roomId: tables.roomId,
        qrCode: tables.qrCode,
        createdAt: tables.createdAt,
        updatedAt: tables.updatedAt,
      })
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId));
    return result;
  }
  async createTable(table: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(tables).values(table).returning();
    return result[0];
  }
  async updateTable(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(tables)
      .set(updates)
      .where(eq(tables.id, id))
      .returning({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        isActive: tables.isActive,
        restaurantId: tables.restaurantId,
        tenantId: tables.tenantId,
        roomId: tables.roomId,
        qrCode: tables.qrCode,
        createdAt: tables.createdAt,
        updatedAt: tables.updatedAt,
      });
    return result[0];
  }
  async deleteTable(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(tables).where(eq(tables.id, id));
    return true;
  }
  async getBookingsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.restaurantId, restaurantId));
    return result;
  }
  async getBookingsByDate(restaurantId: number, date: string): Promise<any[]> {
    if (!this.db) return [];
    // Use SQL date function to compare dates
    const result = await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.restaurantId, restaurantId),
          sql`DATE(${bookings.bookingDate}) = ${date}`,
        ),
      );
    return result;
  }
  async createBooking(booking: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    // Validate numeric fields to prevent invalid database values
    if (booking.guestCount !== undefined) {
      if (!Number.isFinite(booking.guestCount) || booking.guestCount <= 0) {
        throw new Error("Invalid guestCount value: " + booking.guestCount);
      }
    }
    if (booking.tableId !== undefined && booking.tableId !== null) {
      if (!Number.isFinite(booking.tableId) || booking.tableId <= 0) {
        throw new Error("Invalid tableId value: " + booking.tableId);
      }
    }
    if (booking.customerId !== undefined && booking.customerId !== null) {
      if (!Number.isFinite(booking.customerId) || booking.customerId <= 0) {
        throw new Error("Invalid customerId value: " + booking.customerId);
      }
    }
    // Import BookingHash for generating management hash
    const { BookingHash } = await import("./booking-hash");
    // Insert the booking first to get the ID
    const [newBooking] = await this.db
      .insert(bookings)
      .values(booking)
      .returning();
    // Generate management hash with the actual booking ID
    const managementHash = BookingHash.generateHash(
      newBooking.id,
      newBooking.tenantId,
      newBooking.restaurantId,
      "manage",
    );
    // Update the booking with the management hash
    const [updatedBooking] = await this.db
      .update(bookings)
      .set({ managementHash })
      .where(eq(bookings.id, newBooking.id))
      .returning();
    return updatedBooking;
  }
  async updateBooking(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    console.log(`UpdateBooking called for ID ${id} with updates:`, JSON.stringify(updates, null, 2));
    
    // Validate numeric fields to prevent invalid database values
    if (updates.guestCount !== undefined) {
      if (!Number.isFinite(updates.guestCount) || updates.guestCount <= 0) {
        throw new Error("Invalid guestCount value: " + updates.guestCount);
      }
    }
    if (updates.tableId !== undefined && updates.tableId !== null) {
      if (!Number.isFinite(updates.tableId) || updates.tableId <= 0) {
        throw new Error("Invalid tableId value: " + updates.tableId);
      }
    }
    
    try {
      const result = await this.db
        .update(bookings)
        .set(updates)
        .where(eq(bookings.id, id))
        .returning();
      
      console.log(`UpdateBooking result for ID ${id}:`, JSON.stringify(result[0], null, 2));
      return result[0];
    } catch (error) {
      console.error(`UpdateBooking error for ID ${id}:`, error);
      throw error;
    }
  }
  async deleteBooking(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(bookings).where(eq(bookings.id, id));
    return true;
  }
  async getBookingCountForTenantThisMonth(tenantId: number): Promise<number> {
    if (!this.db) throw new Error("Database connection not available");
    // Get the start and end of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const result = await this.db.execute(
      sql`SELECT COUNT(*) as count FROM bookings 
          WHERE tenant_id = ${tenantId} 
          AND created_at >= ${startOfMonth.toISOString()} 
          AND created_at < ${startOfNextMonth.toISOString()}`,
    );
    return Number(result.rows[0]?.count || 0);
  }
  async getCustomersByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.restaurantId, restaurantId));
    return result;
  }
  async getCustomerByEmail(restaurantId: number, email: string): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.restaurantId, restaurantId),
          eq(customers.email, email),
        ),
      );
    return result[0];
  }
  async getCustomerById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return result[0];
  }
  async createCustomer(customer: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(customers).values(customer).returning();
    return result[0];
  }
  async updateCustomer(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }
  async getOrCreateCustomer(
    restaurantId: number,
    tenantId: number,
    customerData: any,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    let customer = await this.getCustomerByEmail(
      restaurantId,
      customerData.email,
    );
    if (!customer) {
      customer = await this.createCustomer({
        ...customerData,
        restaurantId,
        tenantId,
      });
    }
    return customer;
  }
  async createWalkInCustomer(
    restaurantId: number,
    tenantId: number,
    customerData: any,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const walkInData = {
      name: customerData?.name || "Walk-in Customer",
      email: customerData?.email || null,
      phone: customerData?.phone || null,
      restaurantId,
      tenantId,
      isWalkIn: true,
      ...customerData,
    };
    const result = await this.db
      .insert(customers)
      .values(walkInData)
      .returning();
    return result[0];
  }
  async getSubscriptionPlans(): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
    return result;
  }
  async getSubscriptionPlan(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return result[0];
  }
  async createSubscriptionPlan(plan: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return result[0];
  }
  async getUserSubscription(userId: number): Promise<any> {
    return null; // Simplified for now
  }
  async getUserSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<any> {
    return null; // Simplified for now
  }
  async getAllUserSubscriptions(): Promise<any[]> {
    return []; // Simplified for now
  }
  async createUserSubscription(subscription: any): Promise<any> {
    throw new Error("Method not implemented");
  }
  async updateUserSubscription(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }
  async getUserSubscriptionById(id: number): Promise<any> {
    return null; // Simplified for now
  }
  async getTableById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        isActive: tables.isActive,
        restaurantId: tables.restaurantId,
        tenantId: tables.tenantId,
        roomId: tables.roomId,
        qrCode: tables.qrCode,
        createdAt: tables.createdAt,
        updatedAt: tables.updatedAt,
      })
      .from(tables)
      .where(eq(tables.id, id));
    return result[0] || null;
  }
  async getBookingById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    return result[0];
  }
  async getUnassignedBookings(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.restaurantId, restaurantId),
          eq(bookings.tableId, null),
        ),
      );
    return result;
  }
  // Additional required methods for the application
  async getNotificationsByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const notificationData = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.restaurantId, restaurantId))
        .orderBy(desc(notifications.createdAt));
      return notificationData;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }
  async createNotification(notification: any): Promise<any> {
    try {
      const [newNotification] = await this.db
        .insert(notifications)
        .values(notification)
        .returning();
      return newNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }
  async markNotificationAsRead(id: number): Promise<any> {
    try {
      const [updatedNotification] = await this.db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return null;
    }
  }
  async markAllNotificationsAsRead(restaurantId: number): Promise<void> {
    try {
      await this.db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.restaurantId, restaurantId));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }
  async getRoomsByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const roomData = await this.db
        .select()
        .from(rooms)
        .where(eq(rooms.restaurantId, restaurantId))
        .orderBy(rooms.id);
      return roomData;
    } catch (error) {
      console.error("Error fetching rooms:", error);
      return [];
    }
  }
  async getRoomById(id: number): Promise<any> {
    try {
      const result = await this.db.select().from(rooms).where(eq(rooms.id, id));
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching room:", error);
      return null;
    }
  }
  async createRoom(room: any): Promise<any> {
    try {
      const [newRoom] = await this.db.insert(rooms).values(room).returning();
      return newRoom;
    } catch (error) {
      console.error("Error creating room:", error);
      throw error;
    }
  }
  async updateRoom(id: number, updates: any): Promise<any> {
    try {
      const [updatedRoom] = await this.db
        .update(rooms)
        .set(updates)
        .where(eq(rooms.id, id))
        .returning();
      return updatedRoom;
    } catch (error) {
      console.error("Error updating room:", error);
      return null;
    }
  }
  async deleteRoom(id: number): Promise<boolean> {
    try {
      await this.db.delete(rooms).where(eq(rooms.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting room:", error);
      return false;
    }
  }
  async getCombinedTablesByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const combinedTableData = await this.db
        .select()
        .from(combinedTables)
        .where(eq(combinedTables.restaurantId, restaurantId))
        .orderBy(combinedTables.id);
      return combinedTableData;
    } catch (error) {
      console.error("Error fetching combined tables:", error);
      return [];
    }
  }
  async createCombinedTable(data: any): Promise<any> {
    try {
      const [newCombinedTable] = await this.db
        .insert(combinedTables)
        .values({
          name: data.name,
          tableIds: JSON.stringify(data.tableIds), // Properly serialize array to JSON
          totalCapacity: data.totalCapacity,
          restaurantId: data.restaurantId,
          tenantId: data.tenantId,
          isActive: data.isActive || true,
        })
        .returning();
      return newCombinedTable;
    } catch (error) {
      console.error("Error creating combined table:", error);
      throw error;
    }
  }
  async updateCombinedTable(id: number, updates: any): Promise<any> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.tableIds !== undefined)
        updateData.tableIds = JSON.stringify(updates.tableIds);
      if (updates.totalCapacity !== undefined)
        updateData.totalCapacity = updates.totalCapacity;
      if (updates.isActive !== undefined)
        updateData.isActive = updates.isActive;
      const [updatedCombinedTable] = await this.db
        .update(combinedTables)
        .set(updateData)
        .where(eq(combinedTables.id, id))
        .returning();
      return updatedCombinedTable;
    } catch (error) {
      console.error("Error updating combined table:", error);
      return null;
    }
  }
  async deleteCombinedTable(id: number): Promise<boolean> {
    try {
      await this.db.delete(combinedTables).where(eq(combinedTables.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting combined table:", error);
      return false;
    }
  }
  async getCombinedTableById(id: number): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(combinedTables)
        .where(eq(combinedTables.id, id));
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching combined table:", error);
      return null;
    }
  }
  async getOpeningHoursByRestaurant(restaurantId: number): Promise<any> {
    try {
      const hours = await this.db
        .select()
        .from(openingHours)
        .where(eq(openingHours.restaurantId, restaurantId))
        .orderBy(openingHours.dayOfWeek);
      return hours;
    } catch (error) {
      console.error("Error fetching opening hours:", error);
      return [];
    }
  }
  async createOrUpdateOpeningHours(
    restaurantId: number,
    tenantId: number,
    hoursData: any[],
  ): Promise<any> {
    try {
      // Delete existing opening hours for this restaurant
      await this.db
        .delete(openingHours)
        .where(eq(openingHours.restaurantId, restaurantId));
      // Insert new opening hours
      if (hoursData && hoursData.length > 0) {
        const hoursToInsert = hoursData.map((hour) => ({
          restaurantId,
          tenantId,
          dayOfWeek: hour.dayOfWeek,
          isOpen: hour.isOpen,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await this.db.insert(openingHours).values(hoursToInsert);
      }
      return { success: true, message: "Opening hours updated successfully" };
    } catch (error) {
      console.error("Error updating opening hours:", error);
      return { success: false, message: "Failed to update opening hours" };
    }
  }
  async getSpecialPeriodsByRestaurant(restaurantId: number): Promise<any> {
    try {
      const periods = await this.db
        .select()
        .from(specialPeriods)
        .where(eq(specialPeriods.restaurantId, restaurantId))
        .orderBy(specialPeriods.startDate);
      return periods;
    } catch (error) {
      console.error("Error fetching special periods:", error);
      return [];
    }
  }
  async createSpecialPeriod(periodData: any): Promise<any> {
    try {
      const [period] = await this.db
        .insert(specialPeriods)
        .values({
          restaurantId: periodData.restaurantId,
          tenantId: periodData.tenantId,
          name: periodData.name,
          startDate: periodData.startDate,
          endDate: periodData.endDate,
          isOpen: periodData.isOpen,
          openTime: periodData.openTime,
          closeTime: periodData.closeTime,
        })
        .returning();
      return period;
    } catch (error) {
      console.error("Error creating special period:", error);
      throw new Error("Failed to create special period");
    }
  }
  async updateSpecialPeriod(id: number, updates: any): Promise<any> {
    try {
      const [period] = await this.db
        .update(specialPeriods)
        .set({
          name: updates.name,
          startDate: updates.startDate,
          endDate: updates.endDate,
          isOpen: updates.isOpen,
          openTime: updates.openTime,
          closeTime: updates.closeTime,
          updatedAt: new Date(),
        })
        .where(eq(specialPeriods.id, id))
        .returning();
      return period;
    } catch (error) {
      console.error("Error updating special period:", error);
      throw new Error("Failed to update special period");
    }
  }
  async deleteSpecialPeriod(id: number): Promise<boolean> {
    try {
      await this.db.delete(specialPeriods).where(eq(specialPeriods.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting special period:", error);
      return false;
    }
  }
  async getCutOffTimesByRestaurant(restaurantId: number): Promise<any> {
    try {
      const cutOffData = await this.db
        .select()
        .from(cutOffTimes)
        .where(eq(cutOffTimes.restaurantId, restaurantId))
        .orderBy(cutOffTimes.dayOfWeek);
      return cutOffData || [];
    } catch (error) {
      console.error("Error fetching cut-off times:", error);
      return [];
    }
  }
  async createOrUpdateCutOffTimes(
    restaurantId: number,
    tenantId: number,
    timesData: any[],
  ): Promise<any> {
    try {
      // Delete existing cut-off times for this restaurant
      await this.db
        .delete(cutOffTimes)
        .where(eq(cutOffTimes.restaurantId, restaurantId));
      // Insert new cut-off times
      if (timesData && timesData.length > 0) {
        const timesToInsert = timesData.map((time) => ({
          restaurantId,
          tenantId,
          dayOfWeek: time.dayOfWeek,
          isEnabled: time.isEnabled,
          cutOffHours: time.cutOffHours,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await this.db.insert(cutOffTimes).values(timesToInsert);
      }
      return { success: true, message: "Cut-off times updated successfully" };
    } catch (error) {
      console.error("Error updating cut-off times:", error);
      return { success: false, message: "Failed to update cut-off times" };
    }
  }
  async isRestaurantOpen(
    restaurantId: number,
    bookingDate: Date,
    bookingTime: string,
  ): Promise<boolean> {
    return true; // Simplified - assume always open
  }
  async isBookingAllowed(
    restaurantId: number,
    bookingDate: Date,
    bookingTime: string,
  ): Promise<boolean> {
    return true; // Simplified - assume always allowed
  }
  async getBookingChangeRequestsByBookingId(bookingId: number): Promise<any[]> {
    try {
      const requests = await this.db
        .select()
        .from(bookingChangeRequests)
        .where(eq(bookingChangeRequests.bookingId, bookingId))
        .orderBy(desc(bookingChangeRequests.createdAt));
      return requests || [];
    } catch (error) {
      console.error(
        "Error fetching booking change requests by booking ID:",
        error,
      );
      return [];
    }
  }
  async getBookingChangeRequestsByRestaurant(
    restaurantId: number,
  ): Promise<any[]> {
    try {
      const requests = await this.db
        .select()
        .from(bookingChangeRequests)
        .where(eq(bookingChangeRequests.restaurantId, restaurantId))
        .orderBy(desc(bookingChangeRequests.createdAt));
      return requests || [];
    } catch (error) {
      console.error(
        "Error fetching booking change requests by restaurant:",
        error,
      );
      return [];
    }
  }
  async createBookingChangeRequest(request: any): Promise<any> {
    try {
      const [newRequest] = await this.db
        .insert(bookingChangeRequests)
        .values({
          bookingId: request.bookingId,
          restaurantId: request.restaurantId,
          tenantId: request.tenantId,
          requestType: request.requestType,
          requestedDate: request.requestedDate,
          requestedStartTime: request.requestedStartTime,
          requestedEndTime: request.requestedEndTime,
          requestedGuestCount: request.requestedGuestCount,
          requestedTableId: request.requestedTableId,
          customerMessage: request.customerMessage,
          status: request.status || "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newRequest;
    } catch (error) {
      console.error("Error creating booking change request:", error);
      throw error;
    }
  }
  async updateBookingChangeRequest(id: number, updates: any): Promise<any> {
    try {
      const [updatedRequest] = await this.db
        .update(bookingChangeRequests)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(bookingChangeRequests.id, id))
        .returning();
      return updatedRequest;
    } catch (error) {
      console.error("Error updating booking change request:", error);
      return null;
    }
  }
  async getBookingChangeRequestById(id: number): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(bookingChangeRequests)
        .where(eq(bookingChangeRequests.id, id));
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching booking change request by ID:", error);
      return null;
    }
  }
  async revertNotification(
    notificationId: number,
    userEmail: string,
  ): Promise<boolean> {
    return false;
  }
  // Restaurant Settings methods
  async getRestaurantSettings(
    restaurantId: number,
    tenantId: number,
  ): Promise<any> {
    try {
      const restaurant = await this.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        throw new Error("Restaurant not found or access denied");
      }

      // Get settings from various sources
      const emailSettings = restaurant.emailSettings
        ? JSON.parse(restaurant.emailSettings)
        : {};
      const openingHours = await this.getOpeningHoursByRestaurant(restaurantId);
      const cutOffTimes = await this.getCutOffTimesByRestaurant(restaurantId);
      const specialPeriods =
        await this.getSpecialPeriodsByRestaurant(restaurantId);

      // Get stored general settings or use defaults
      let generalSettings = {
        timeZone: "America/New_York",
        dateFormat: "MM/dd/yyyy",
        timeFormat: "12h",
        defaultBookingDuration: 120,
        maxAdvanceBookingDays: 30,
        currency: "USD",
        language: "en",
      };

      // Check if restaurant has stored general settings
      if (restaurant.generalSettings) {
        try {
          const storedSettings = JSON.parse(restaurant.generalSettings);
          generalSettings = { ...generalSettings, ...storedSettings };
        } catch (e) {
          console.warn(
            "Failed to parse stored general settings, using defaults",
          );
        }
      }

      return {
        emailSettings,
        generalSettings,
        bookingSettings: {},
        notificationSettings: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          bookingReminders: true,
          cancelationAlerts: true,
          noShowAlerts: true,
        },
        openingHours,
        cutOffTimes,
        specialPeriods,
      };
    } catch (error) {
      console.error("Error fetching restaurant settings:", error);
      throw error;
    }
  }
  async updateRestaurantSettings(
    restaurantId: number,
    tenantId: number,
    settings: any,
  ): Promise<any> {
    try {
      const restaurant = await this.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        throw new Error("Restaurant not found or access denied");
      }

      const updates: any = {};

      // Handle email settings
      if (settings.emailSettings) {
        updates.emailSettings = JSON.stringify(settings.emailSettings);
      }

      // Handle general settings
      if (settings.generalSettings) {
        updates.generalSettings = JSON.stringify(settings.generalSettings);
      }

      // Update restaurant record if there are changes
      if (Object.keys(updates).length > 0) {
        await this.updateRestaurant(restaurantId, updates);
      }

      // Handle other settings that have their own tables
      if (settings.openingHours) {
        await this.createOrUpdateOpeningHours(
          restaurantId,
          tenantId,
          settings.openingHours,
        );
      }

      if (settings.cutOffTimes) {
        await this.createOrUpdateCutOffTimes(
          restaurantId,
          tenantId,
          settings.cutOffTimes,
        );
      }

      // Return updated settings
      return await this.getRestaurantSettings(restaurantId, tenantId);
    } catch (error) {
      console.error("Error updating restaurant settings:", error);
      throw error;
    }
  }
  // SMS Settings methods
  async getSmsSettings(restaurantId: number, tenantId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(smsSettings)
      .where(
        and(
          eq(smsSettings.restaurantId, restaurantId),
          eq(smsSettings.tenantId, tenantId),
        ),
      )
      .limit(1);
    return (
      result[0] || {
        confirmationEnabled: false,
        reminderEnabled: false,
        reminderHours: 2,
        countryCode: "+1",
        phoneNumber: "",
        satisfactionSurveyEnabled: false,
      }
    );
  }
  async saveSmsSettings(
    restaurantId: number,
    tenantId: number,
    settings: any,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const existing = await this.db
      .select()
      .from(smsSettings)
      .where(
        and(
          eq(smsSettings.restaurantId, restaurantId),
          eq(smsSettings.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await this.db
        .update(smsSettings)
        .set({
          confirmationEnabled: settings.confirmationEnabled,
          reminderEnabled: settings.reminderEnabled,
          reminderHours: settings.reminderHours,
          countryCode: settings.countryCode,
          phoneNumber: settings.phoneNumber,
          satisfactionSurveyEnabled: settings.satisfactionSurveyEnabled,
          updatedAt: new Date(),
        })
        .where(eq(smsSettings.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(smsSettings)
        .values({
          restaurantId,
          tenantId,
          confirmationEnabled: settings.confirmationEnabled,
          reminderEnabled: settings.reminderEnabled,
          reminderHours: settings.reminderHours,
          countryCode: settings.countryCode,
          phoneNumber: settings.phoneNumber,
          satisfactionSurveyEnabled: settings.satisfactionSurveyEnabled,
        })
        .returning();
      return created;
    }
  }
  // SMS Balance methods
  async getSmsBalance(tenantId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(smsBalance)
      .where(eq(smsBalance.tenantId, tenantId))
      .limit(1);
    return result[0] || { balance: "0.00", currency: "EUR" };
  }
  async addSmsBalance(tenantId: number, amount: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const existing = await this.db
      .select()
      .from(smsBalance)
      .where(eq(smsBalance.tenantId, tenantId))
      .limit(1);
    if (existing.length > 0) {
      const currentBalance = parseFloat(existing[0].balance || "0");
      const newBalance = currentBalance + amount;
      const [updated] = await this.db
        .update(smsBalance)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(smsBalance.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(smsBalance)
        .values({
          tenantId,
          balance: amount.toFixed(2),
          currency: "EUR",
        })
        .returning();
      return created;
    }
  }
  // SMS Message methods
  async createSmsMessage(
    restaurantId: number,
    tenantId: number,
    messageData: any,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [message] = await this.db
      .insert(smsMessages)
      .values({
        restaurantId,
        tenantId,
        bookingId: messageData.bookingId,
        phoneNumber: messageData.phoneNumber,
        message: messageData.message,
        type: messageData.type,
        status: "pending",
        cost: messageData.cost || "0.08",
      })
      .returning();
    return message;
  }
  async updateSmsMessageStatus(
    messageId: number,
    status: string,
    errorMessage?: string,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const updateData: any = {
      status,
      sentAt: status === "sent" ? new Date() : undefined,
      deliveredAt: status === "delivered" ? new Date() : undefined,
      errorMessage: errorMessage || null,
    };
    const [updated] = await this.db
      .update(smsMessages)
      .set(updateData)
      .where(eq(smsMessages.id, messageId))
      .returning();
    return updated;
  }
  async getSmsMessages(restaurantId: number, tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.restaurantId, restaurantId),
          eq(smsMessages.tenantId, tenantId),
        ),
      )
      .orderBy(smsMessages.createdAt);
  }

  // Survey Response methods
  async createSurveyResponse(
    restaurantId: number,
    tenantId: number,
    responseData: any,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [response] = await this.db
      .insert(surveyResponses)
      .values({
        restaurantId,
        tenantId,
        bookingId: responseData.bookingId,
        smsMessageId: responseData.smsMessageId,
        customerPhone: responseData.customerPhone,
        customerName: responseData.customerName,
        customerEmail: responseData.customerEmail,
        rating: responseData.rating,
        feedback: responseData.feedback,
        responseMethod: responseData.responseMethod || "email",
        responseToken: responseData.responseToken,
        respondedAt: responseData.rating ? new Date() : null, // Only set respondedAt if actually responding
      })
      .returning();
    return response;
  }

  async getSurveyResponses(restaurantId: number, tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db
      .select()
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.restaurantId, restaurantId),
          eq(surveyResponses.tenantId, tenantId),
        ),
      )
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyResponseByToken(token: string): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.responseToken, token))
      .limit(1);
    return result[0] || null;
  }

  async getSurveyStats(restaurantId: number, tenantId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const responses = await this.db
      .select()
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.restaurantId, restaurantId),
          eq(surveyResponses.tenantId, tenantId),
          sql`${surveyResponses.rating} IS NOT NULL`,
        ),
      );

    if (responses.length === 0) {
      return {
        totalResponses: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalResponses = responses.length;
    const averageRating = responses.reduce((sum, r) => sum + (r.rating || 0), 0) / totalResponses;
    const ratingDistribution = responses.reduce((dist, r) => {
      if (r.rating) {
        dist[r.rating] = (dist[r.rating] || 0) + 1;
      }
      return dist;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    return {
      totalResponses,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingDistribution,
    };
  }

  async sendSurveyToBooking(bookingId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    // Get booking details
    const booking = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    
    if (!booking.length) {
      throw new Error("Booking not found");
    }

    const bookingData = booking[0];
    
    // Check if booking has either phone or email for survey delivery
    const hasPhone = bookingData.phone && bookingData.phone.trim() !== '';
    const hasEmail = bookingData.customerEmail && bookingData.customerEmail.trim() !== '';
    
    if (!hasPhone && !hasEmail) {
      throw new Error("Booking does not have contact information (phone or email) - cannot send survey");
    }
    
    // Generate response token
    const responseToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Create survey URL
    const surveyUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/survey/${responseToken}`;
    
    let smsMessage = null;
    let deliveryMethod = 'email';
    
    // Try SMS delivery if phone is available and SMS settings are enabled
    if (hasPhone) {
      try {
        const smsSettings = await this.db
          .select()
          .from(smsSettings)
          .where(
            and(
              eq(smsSettings.restaurantId, bookingData.restaurantId),
              eq(smsSettings.tenantId, bookingData.tenantId),
            ),
          )
          .limit(1);

        if (smsSettings.length > 0 && smsSettings[0].satisfactionSurveyEnabled) {
          const surveySettings = smsSettings[0];
          const message = `${surveySettings.surveyMessage || 'Thank you for visiting us! Please share your experience:'} ${surveyUrl}`;
          
          smsMessage = await this.createSmsMessage(
            bookingData.restaurantId,
            bookingData.tenantId,
            {
              bookingId: bookingData.id,
              phoneNumber: bookingData.phone,
              message,
              type: "survey",
              cost: "0.08",
            }
          );
          deliveryMethod = 'sms';
        }
      } catch (smsError) {
        console.error('SMS survey failed, falling back to email:', smsError);
        // Continue with email delivery
      }
    }

    // Create survey response record with token
    await this.createSurveyResponse(
      bookingData.restaurantId,
      bookingData.tenantId,
      {
        bookingId: bookingData.id,
        smsMessageId: smsMessage?.id || null,
        customerPhone: hasPhone ? bookingData.phone : null,
        customerName: bookingData.customerName,
        customerEmail: hasEmail ? bookingData.customerEmail : null,
        responseToken,
        responseMethod: deliveryMethod,
      }
    );

    return { 
      smsMessage, 
      responseToken, 
      surveyUrl,
      deliveryMethod,
      message: deliveryMethod === 'sms' ? 'Survey sent via SMS' : 'Survey token created for email delivery'
    };
  }

  async updateSurveyResponse(token: string, updateData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const [updatedResponse] = await this.db
      .update(surveyResponses)
      .set({
        rating: updateData.rating,
        feedback: updateData.feedback,
        respondedAt: new Date(),
      })
      .where(eq(surveyResponses.responseToken, token))
      .returning();
    
    return updatedResponse;
  }

  // Feedback Questions methods
  async getFeedbackQuestions(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db
      .select()
      .from(feedbackQuestions)
      .where(
        and(
          eq(feedbackQuestions.restaurantId, restaurantId),
          eq(feedbackQuestions.tenantId, tenantId),
        ),
      )
      .orderBy(feedbackQuestions.sortOrder, feedbackQuestions.createdAt);
  }
  async createFeedbackQuestion(
    restaurantId: number,
    tenantId: number,
    questionData: any,
  ): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [question] = await this.db
      .insert(feedbackQuestions)
      .values({
        restaurantId,
        tenantId,
        name: questionData.name,
        questionType: questionData.questionType || "nps",
        hasNps: questionData.hasNps !== false,
        hasComments: questionData.hasComments !== false,
        isActive: questionData.isActive !== false,
        sortOrder: questionData.sortOrder || 0,
      })
      .returning();
    return question;
  }
  async updateFeedbackQuestion(id: number, questionData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updated] = await this.db
      .update(feedbackQuestions)
      .set({
        name: questionData.name,
        questionType: questionData.questionType,
        hasNps: questionData.hasNps,
        hasComments: questionData.hasComments,
        isActive: questionData.isActive,
        sortOrder: questionData.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(feedbackQuestions.id, id))
      .returning();
    return updated;
  }
  async deleteFeedbackQuestion(id: number): Promise<void> {
    if (!this.db) throw new Error("Database connection not available");
    await this.db.delete(feedbackQuestions).where(eq(feedbackQuestions.id, id));
  }
  async deleteFeedback(id: number): Promise<void> {
    if (!this.db) throw new Error("Database connection not available");
    // First delete related feedback responses
    await this.db
      .delete(feedbackResponses)
      .where(eq(feedbackResponses.feedbackId, id));
    // Then delete the feedback entry
    await this.db.delete(feedback).where(eq(feedback.id, id));
  }
  // Feedback Response methods
  async createFeedbackResponse(responseData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newResponse] = await this.db
      .insert(feedbackResponses)
      .values(responseData)
      .returning();
    return newResponse;
  }
  async getFeedbackResponsesByFeedbackId(feedbackId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select({
        id: feedbackResponses.id,
        feedbackId: feedbackResponses.feedbackId,
        questionId: feedbackResponses.questionId,
        rating: feedbackResponses.rating,
        npsScore: feedbackResponses.npsScore,
        textResponse: feedbackResponses.textResponse,
        createdAt: feedbackResponses.createdAt,
        questionName: feedbackQuestions.name,
        questionType: feedbackQuestions.questionType,
      })
      .from(feedbackResponses)
      .leftJoin(
        feedbackQuestions,
        eq(feedbackResponses.questionId, feedbackQuestions.id),
      )
      .where(eq(feedbackResponses.feedbackId, feedbackId))
      .orderBy(asc(feedbackQuestions.sortOrder));
    return result;
  }
  async updateFeedback(feedbackId: number, updateData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updated] = await this.db
      .update(feedback)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, feedbackId))
      .returning();
    return updated;
  }
  async getFeedbackResponses(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");

    console.log(
      "Fetching feedback for restaurant",
      restaurantId,
      "tenant",
      tenantId,
    );

    const result = await this.db
      .select({
        id: feedback.id,
        customerName: feedback.customerName,
        customerEmail: feedback.customerEmail,
        rating: feedback.rating,
        npsScore: feedback.nps,
        comments: feedback.comments,
        createdAt: feedback.createdAt,
        visited: feedback.visited,
        restaurantId: feedback.restaurantId,
        tenantId: feedback.tenantId,
        bookingId: feedback.bookingId,
      })
      .from(feedback)
      .where(
        and(
          eq(feedback.restaurantId, restaurantId),
          eq(feedback.tenantId, tenantId),
        ),
      )
      .orderBy(desc(feedback.createdAt));

    console.log("Found", result.length, "feedback responses:", result);
    return result;
  }
  async deleteNotification(id: number): Promise<boolean> {
    return false;
  }
  async getIntegrationConfigurationsByRestaurant(
    restaurantId: number,
  ): Promise<any[]> {
    try {
      const integrationData = await this.db
        .select()
        .from(integrationConfigurations)
        .where(eq(integrationConfigurations.restaurantId, restaurantId));
      // Parse configuration JSON strings back to objects
      const parsedData = integrationData.map((config: any) => {
        let parsedConfig = config.configuration;
        if (typeof config.configuration === "string") {
          try {
            parsedConfig = JSON.parse(config.configuration);
          } catch (e) {
            parsedConfig = {};
          }
        }
        return {
          ...config,
          configuration: parsedConfig,
        };
      });
      return parsedData || [];
    } catch (error) {
      console.error("Error fetching integration configurations:", error);
      return [];
    }
  }
  async getIntegrationByRestaurantAndType(
    restaurantId: number,
    integrationType: string,
  ): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(integrationConfigurations)
        .where(
          and(
            eq(integrationConfigurations.restaurantId, restaurantId),
            eq(integrationConfigurations.integrationId, integrationType),
          ),
        );
      if (result.length === 0) {
        return null;
      }
      const config = result[0];
      // Parse configuration JSON string back to object
      let parsedConfig = config.configuration;
      if (typeof config.configuration === "string") {
        try {
          parsedConfig = JSON.parse(config.configuration);
        } catch (e) {
          parsedConfig = {};
        }
      }
      return {
        ...config,
        configuration: parsedConfig,
      };
    } catch (error) {
      console.error(
        "Error fetching integration by restaurant and type:",
        error,
      );
      return null;
    }
  }
  async getIntegrationConfiguration(
    restaurantId: number,
    integrationId: string,
  ): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(integrationConfigurations)
        .where(
          and(
            eq(integrationConfigurations.restaurantId, restaurantId),
            eq(integrationConfigurations.integrationId, integrationId),
          ),
        );
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching integration configuration:", error);
      return null;
    }
  }
  async createOrUpdateIntegrationConfiguration(
    restaurantId: number,
    tenantId: number,
    integrationId: string,
    isEnabled: boolean,
    configuration: any = {},
  ): Promise<any> {
    try {
      // Check if configuration already exists
      const existing = await this.getIntegrationConfiguration(
        restaurantId,
        integrationId,
      );
      if (existing) {
        // Update existing configuration
        const [updated] = await this.db
          .update(integrationConfigurations)
          .set({
            configuration: configuration,
            isEnabled: isEnabled,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(integrationConfigurations.restaurantId, restaurantId),
              eq(integrationConfigurations.integrationId, integrationId),
            ),
          )
          .returning();
        return updated;
      } else {
        // Create new configuration
        const [created] = await this.db
          .insert(integrationConfigurations)
          .values({
            restaurantId,
            tenantId,
            integrationId,
            configuration: configuration,
            isEnabled: isEnabled,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error saving integration configuration:", error);
      throw error;
    }
  }
  async deleteIntegrationConfiguration(
    restaurantId: number,
    integrationId: string,
  ): Promise<boolean> {
    try {
      await this.db
        .delete(integrationConfigurations)
        .where(
          and(
            eq(integrationConfigurations.restaurantId, restaurantId),
            eq(integrationConfigurations.integrationId, integrationId),
          ),
        );
      return true;
    } catch (error) {
      console.error("Error deleting integration configuration:", error);
      return false;
    }
  }
  async getWebhooksByRestaurant(restaurantId: number) {
    return [];
  }
  async saveWebhooks(
    restaurantId: number,
    tenantId: number,
    webhooksData: any[],
  ): Promise<any[]> {
    // For now, return the webhooks data as-is since webhooks table may not exist
    // This maintains interface compatibility while allowing the application to work
    return webhooksData || [];
  }

  // Webhook Logs methods
  async getWebhookLogs(tenantId?: number, limit: number = 100): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    
    try {
      let query = this.db
        .select()
        .from(webhookLogs)
        .orderBy(desc(webhookLogs.createdAt))
        .limit(limit);

      if (tenantId) {
        query = query.where(eq(webhookLogs.tenantId, tenantId));
      }

      const result = await query;
      return result;
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      return [];
    }
  }

  async getWebhookLogsByEventType(eventType: string, tenantId?: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    
    try {
      let query = this.db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.eventType, eventType))
        .orderBy(desc(webhookLogs.createdAt));

      if (tenantId) {
        query = query.where(
          and(
            eq(webhookLogs.eventType, eventType),
            eq(webhookLogs.tenantId, tenantId)
          )
        );
      }

      const result = await query;
      return result;
    } catch (error) {
      console.error("Error fetching webhook logs by event type:", error);
      return [];
    }
  }

  async createWebhookLog(logData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    try {
      const [newLog] = await this.db
        .insert(webhookLogs)
        .values({
          tenantId: logData.tenantId,
          restaurantId: logData.restaurantId,
          webhookId: logData.webhookId,
          eventType: logData.eventType,
          source: logData.source,
          status: logData.status,
          httpMethod: logData.httpMethod || 'POST',
          requestUrl: logData.requestUrl,
          requestHeaders: logData.requestHeaders || {},
          requestBody: logData.requestBody || {},
          responseStatus: logData.responseStatus,
          responseBody: logData.responseBody || {},
          processingTime: logData.processingTime,
          errorMessage: logData.errorMessage,
          metadata: logData.metadata || {},
        })
        .returning();
      
      return newLog;
    } catch (error) {
      console.error("Error creating webhook log:", error);
      throw error;
    }
  }

  async getStripePaymentsByTenant(tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    
    try {
      let query = this.db
        .select()
        .from(stripePayments)
        .orderBy(desc(stripePayments.createdAt));

      if (tenantId > 0) {
        query = query.where(eq(stripePayments.tenantId, tenantId));
      }

      const result = await query;
      return result;
    } catch (error) {
      console.error("Error fetching Stripe payments:", error);
      return [];
    }
  }
  async getSmsMessagesByRestaurant(restaurantId: number): Promise<any[]> {
    return [];
  }
  async getWaitingListByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db
      .select()
      .from(waitingList)
      .where(eq(waitingList.restaurantId, restaurantId));
  }
  async createWaitingListEntry(entry: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newEntry] = await this.db
      .insert(waitingList)
      .values(entry)
      .returning();
    return newEntry;
  }
  async getWaitingListEntryById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(waitingList)
      .where(eq(waitingList.id, id));
    return result[0];
  }
  async updateWaitingListEntry(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updated] = await this.db
      .update(waitingList)
      .set(updates)
      .where(eq(waitingList.id, id))
      .returning();
    return updated;
  }
  async deleteWaitingListEntry(id: number): Promise<boolean> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .delete(waitingList)
      .where(eq(waitingList.id, id));
    return result.rowCount > 0;
  }
  async getFeedbackByRestaurant(restaurantId: number): Promise<any[]> {
    return [];
  }
  async createFeedback(feedbackData: any): Promise<any> {
    const feedbackToInsert = {
      ...feedbackData,
      createdAt: new Date(),
      visited: false,
      bookingDate:
        feedbackData.visitDate || new Date().toISOString().split("T")[0],
      questionName: "Guest Feedback",
    };
    const [newFeedback] = await this.db
      .insert(feedback)
      .values(feedbackToInsert)
      .returning();
    return newFeedback;
  }
  async getActivityLogByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const logs = await this.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.restaurantId, restaurantId))
      .orderBy(desc(activityLog.createdAt));
    return logs;
  }
  async getActivityLogByTenant(tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const logs = await this.db
      .select()
      .from(activityLog)
      .leftJoin(restaurants, eq(activityLog.restaurantId, restaurants.id))
      .where(eq(activityLog.tenantId, tenantId))
      .orderBy(desc(activityLog.createdAt));
    // Transform the results to include restaurant name
    return logs.map((log) => ({
      ...log.activity_log,
      restaurantName:
        log.restaurants?.name || "Restaurant " + log.activity_log.restaurantId,
    }));
  }
  async createActivityLog(log: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(activityLog).values(log).returning();
    return result[0];
  }
  async deleteOldActivityLogs(beforeDate: Date): Promise<number> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .delete(activityLog)
      .where(lt(activityLog.createdAt, beforeDate));
    return result.rowCount || 0;
  }
  // Product Groups
  async getProductGroupsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const groups = await this.db
      .select()
      .from(productGroups)
      .where(eq(productGroups.restaurantId, restaurantId))
      .orderBy(desc(productGroups.createdAt));
    return groups;
  }
  async createProductGroup(group: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .insert(productGroups)
      .values(group)
      .returning();
    return result[0];
  }
  async updateProductGroup(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(productGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productGroups.id, id))
      .returning();
    return result[0];
  }
  async deleteProductGroup(id: number): Promise<boolean> {
    if (!this.db) throw new Error("Database connection not available");
    await this.db.delete(productGroups).where(eq(productGroups.id, id));
  }
  // Products
  async getProductsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const productsData = await this.db
      .select({
        id: products.id,
        productName: products.productName,
        categoryId: products.categoryId,
        price: products.price,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: productGroups.groupName,
      })
      .from(products)
      .leftJoin(productGroups, eq(products.categoryId, productGroups.id))
      .where(eq(products.restaurantId, restaurantId))
      .orderBy(desc(products.createdAt));
    return productsData;
  }
  async createProduct(product: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(products).values(product).returning();
    return result[0];
  }
  async updateProduct(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  }
  async deleteProduct(id: number): Promise<void> {
    if (!this.db) throw new Error("Database connection not available");
    await this.db.delete(products).where(eq(products.id, id));
  }
  // Payment Setups
  async getPaymentSetupsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const paymentSetupsData = await this.db
      .select()
      .from(paymentSetups)
      .where(eq(paymentSetups.restaurantId, restaurantId))
      .orderBy(desc(paymentSetups.createdAt));
    return paymentSetupsData;
  }
  async createPaymentSetup(setup: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .insert(paymentSetups)
      .values(setup)
      .returning();
    return result[0];
  }
  async updatePaymentSetup(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(paymentSetups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentSetups.id, id))
      .returning();
    return result[0];
  }
  async deletePaymentSetup(id: number): Promise<void> {
    if (!this.db) throw new Error("Database connection not available");
    await this.db.delete(paymentSetups).where(eq(paymentSetups.id, id));
  }
  // Custom Fields methods
  async getCustomFieldsByRestaurant(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const fields = await this.db
      .select()
      .from(customFields)
      .where(
        and(
          eq(customFields.restaurantId, restaurantId),
          eq(customFields.tenantId, tenantId),
        ),
      )
      .orderBy(customFields.sortOrder);
    return fields;
  }
  async createCustomField(customFieldData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [field] = await this.db
      .insert(customFields)
      .values({
        restaurantId: customFieldData.restaurantId,
        tenantId: customFieldData.tenantId,
        name: customFieldData.name,
        title: customFieldData.title,
        inputType: customFieldData.inputType || "single_line",
        options: customFieldData.options,
        translations: customFieldData.translations,
        isActive: customFieldData.isActive !== false,
        isOnline: customFieldData.isOnline !== false,
        sortOrder: customFieldData.sortOrder || 0,
        isRequired: customFieldData.isRequired || false,
        placeholder: customFieldData.placeholder,
        validation: customFieldData.validation,
      })
      .returning();
    return field;
  }
  async updateCustomField(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updated] = await this.db
      .update(customFields)
      .set({
        name: updates.name,
        title: updates.title,
        inputType: updates.inputType,
        options: updates.options,
        translations: updates.translations,
        isActive: updates.isActive,
        isOnline: updates.isOnline,
        sortOrder: updates.sortOrder,
        isRequired: updates.isRequired,
        placeholder: updates.placeholder,
        validation: updates.validation,
        updatedAt: new Date(),
      })
      .where(eq(customFields.id, id))
      .returning();
    return updated;
  }
  async deleteCustomField(id: number): Promise<boolean> {
    if (!this.db) throw new Error("Database connection not available");
    try {
      await this.db.delete(customFields).where(eq(customFields.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting custom field:", error);
      return false;
    }
  }

  async deleteCustomer(id: number): Promise<boolean> {
    if (!this.db) return false;

    try {
      // First, check if customer has any bookings
      const customerBookings = await this.db
        .select()
        .from(bookings)
        .where(eq(bookings.customerId, id));

      if (customerBookings.length > 0) {
        // Option 1: Set customer_id to null in bookings (soft delete approach)
        await this.db
          .update(bookings)
          .set({ customerId: null })
          .where(eq(bookings.customerId, id));
      }

      // Now delete the customer
      await this.db.delete(customers).where(eq(customers.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting customer:", error);
      return false;
    }
  }
  async getCustomFieldById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select()
      .from(customFields)
      .where(eq(customFields.id, id));
    return result[0];
  }
  async getTimeSlotsByRestaurant(
    restaurantId: number,
    date?: string,
  ): Promise<any[]> {
    return [];
  }
  async createTimeSlot(slot: any): Promise<any> {
    throw new Error("Method not implemented");
  }
  async updateTimeSlot(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }
  async getTimeSlotById(id: number): Promise<any> {
    return null;
  }
  async getTableLayout(restaurantId: number, room: string): Promise<any> {
    try {
      const layout = await this.db
        .select()
        .from(tableLayouts)
        .where(
          and(
            eq(tableLayouts.restaurantId, restaurantId),
            eq(tableLayouts.room, room),
          ),
        )
        .limit(1);
      if (layout.length > 0) {
        return {
          room: layout[0].room,
          positions: layout[0].positions,
        };
      }
      // Return default empty layout if none exists
      return {
        room: room,
        positions: {},
      };
    } catch (error) {
      console.error("Error fetching table layout:", error);
      return {
        room: room,
        positions: {},
      };
    }
  }
  async saveTableLayout(
    restaurantId: number,
    tenantId: number,
    room: string,
    positions: any,
  ): Promise<any> {
    try {
      // Check if layout already exists for this restaurant and room
      const existingLayout = await this.db
        .select()
        .from(tableLayouts)
        .where(
          and(
            eq(tableLayouts.restaurantId, restaurantId),
            eq(tableLayouts.tenantId, tenantId),
            eq(tableLayouts.room, room),
          ),
        )
        .limit(1);
      if (existingLayout.length > 0) {
        // Update existing layout
        const [updatedLayout] = await this.db
          .update(tableLayouts)
          .set({
            positions: positions,
            updatedAt: new Date(),
          })
          .where(eq(tableLayouts.id, existingLayout[0].id))
          .returning();
        return updatedLayout;
      } else {
        // Create new layout
        const [newLayout] = await this.db
          .insert(tableLayouts)
          .values({
            restaurantId,
            tenantId,
            room,
            positions,
          })
          .returning();
        return newLayout;
      }
    } catch (error) {
      console.error("Error saving table layout:", error);
      throw error;
    }
  }
  async getReschedulingSuggestionsByRestaurant(
    restaurantId: number,
  ): Promise<any[]> {
    return [];
  }
  async getReschedulingSuggestionsByBooking(bookingId: number): Promise<any[]> {
    return [];
  }
  async createReschedulingSuggestion(suggestion: any): Promise<any> {
    throw new Error("Method not implemented");
  }
  async updateReschedulingSuggestion(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }
  async getReschedulingSuggestionById(id: number): Promise<any> {
    return null;
  }
  async deleteReschedulingSuggestion(id: number): Promise<boolean> {
    return false;
  }
  async deleteExpiredReschedulingSuggestions(): Promise<void> {
    // Simplified implementation
  }
  async getAllUsers(): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        restaurantName: users.restaurantName,
        createdAt: users.createdAt,
      })
      .from(users);
    return result;
  }

  // Additional subscription-related methods
  async getSubscriptionPlanById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return result[0];
  }
  async getFreePlan(): Promise<any> {
    if (!this.db) return null;
    const result = await this.db
      .select()
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.price, 0),
          eq(subscriptionPlans.isActive, true),
        ),
      )
      .limit(1);
    return result[0];
  }
  // Resolved Conflicts
  async getResolvedConflictsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(resolvedConflicts)
      .where(eq(resolvedConflicts.restaurantId, restaurantId))
      .orderBy(desc(resolvedConflicts.resolvedAt));
    return result;
  }
  async createResolvedConflict(resolvedConflict: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newResolvedConflict] = await this.db
      .insert(resolvedConflicts)
      .values(resolvedConflict)
      .returning();
    return newResolvedConflict;
  }
  // Menu Categories
  async getMenuCategoriesByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));
    return result;
  }
  async getMenuCategories(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.restaurantId, restaurantId),
          eq(menuCategories.tenantId, tenantId),
        ),
      )
      .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));
    return result;
  }
  async createMenuCategory(category: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newCategory] = await this.db
      .insert(menuCategories)
      .values(category)
      .returning();
    return newCategory;
  }
  async updateMenuCategory(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedCategory] = await this.db
      .update(menuCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuCategories.id, id))
      .returning();
    return updatedCategory;
  }
  async deleteMenuCategory(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(menuCategories).where(eq(menuCategories.id, id));
    return true;
  }
  // Menu Items
  async getMenuItemsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));
    return result;
  }
  async getMenuItems(restaurantId: number, tenantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurantId),
          eq(menuItems.tenantId, tenantId),
        ),
      )
      .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));
    return result;
  }
  async getMenuItemsByCategory(categoryId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(menuItems)
      .where(eq(menuItems.categoryId, categoryId))
      .orderBy(asc(menuItems.displayOrder), asc(menuItems.name));
    return result;
  }
  async createMenuItem(item: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newItem] = await this.db.insert(menuItems).values(item).returning();
    return newItem;
  }
  async updateMenuItem(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedItem] = await this.db
      .update(menuItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updatedItem;
  }
  async deleteMenuItem(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(menuItems).where(eq(menuItems.id, id));
    return true;
  }
  // Seasonal Menu Themes
  async getSeasonalMenuThemes(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(seasonalMenuThemes)
      .where(
        and(
          eq(seasonalMenuThemes.restaurantId, restaurantId),
          eq(seasonalMenuThemes.tenantId, tenantId),
        ),
      )
      .orderBy(desc(seasonalMenuThemes.createdAt));
    return result;
  }
  async getSeasonalMenuThemeById(id: number): Promise<any> {
    if (!this.db) return null;
    const [theme] = await this.db
      .select()
      .from(seasonalMenuThemes)
      .where(eq(seasonalMenuThemes.id, id));
    return theme;
  }
  async createSeasonalMenuTheme(theme: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newTheme] = await this.db
      .insert(seasonalMenuThemes)
      .values(theme)
      .returning();
    return newTheme;
  }
  async updateSeasonalMenuTheme(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedTheme] = await this.db
      .update(seasonalMenuThemes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seasonalMenuThemes.id, id))
      .returning();
    return updatedTheme;
  }
  async deleteSeasonalMenuTheme(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db
      .delete(seasonalMenuThemes)
      .where(eq(seasonalMenuThemes.id, id));
    return true;
  }
  async setActiveSeasonalTheme(
    restaurantId: number,
    tenantId: number,
    themeId: number,
  ): Promise<boolean> {
    if (!this.db) return false;
    // First deactivate all themes for this restaurant
    await this.db
      .update(seasonalMenuThemes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(seasonalMenuThemes.restaurantId, restaurantId),
          eq(seasonalMenuThemes.tenantId, tenantId),
        ),
      );
    // Then activate the selected theme
    await this.db
      .update(seasonalMenuThemes)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(seasonalMenuThemes.id, themeId));
    return true;
  }
  // Professional Menu Print Orders
  async createMenuOrder(orderData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newOrder] = await this.db
      .insert(menuPrintOrders)
      .values(orderData)
      .returning();
    return newOrder;
  }
  async getMenuOrdersByRestaurant(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(menuPrintOrders)
      .where(
        and(
          eq(menuPrintOrders.restaurantId, restaurantId),
          eq(menuPrintOrders.tenantId, tenantId),
        ),
      )
      .orderBy(desc(menuPrintOrders.createdAt));
    return result;
  }
  async getMenuOrderById(id: number): Promise<any> {
    if (!this.db) return null;
    const [order] = await this.db
      .select()
      .from(menuPrintOrders)
      .where(eq(menuPrintOrders.id, id));
    return order;
  }
  async updateMenuOrder(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedOrder] = await this.db
      .update(menuPrintOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuPrintOrders.id, id))
      .returning();
    return updatedOrder;
  }
  async deleteMenuOrder(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(menuPrintOrders).where(eq(menuPrintOrders.id, id));
    return true;
  }
  async getSeatingConfigurationsByRestaurant(
    restaurantId: number,
  ): Promise<any[]> {
    try {
      const configs = await this.db
        .select()
        .from(seatingConfigurations)
        .where(eq(seatingConfigurations.restaurantId, restaurantId))
        .orderBy(seatingConfigurations.createdAt);
      return configs;
    } catch (error) {
      console.error("Error fetching seating configurations:", error);
      return [];
    }
  }
  async createSeatingConfiguration(configuration: any): Promise<any> {
    try {
      const [newConfig] = await this.db
        .insert(seatingConfigurations)
        .values({
          restaurantId: configuration.restaurantId,
          tenantId: configuration.tenantId,
          name: configuration.name,
          criteria: configuration.criteria || "Unlimited",
          validOnline: configuration.validOnline || "Unlimited",
          isActive: configuration.isActive ?? true,
        })
        .returning();
      return newConfig;
    } catch (error) {
      console.error("Error creating seating configuration:", error);
      throw error;
    }
  }
  async updateSeatingConfiguration(id: number, updates: any): Promise<any> {
    try {
      const [updatedConfig] = await this.db
        .update(seatingConfigurations)
        .set({
          name: updates.name,
          criteria: updates.criteria,
          validOnline: updates.validOnline,
          isActive: updates.isActive,
          updatedAt: new Date(),
        })
        .where(eq(seatingConfigurations.id, id))
        .returning();
      return updatedConfig;
    } catch (error) {
      console.error("Error updating seating configuration:", error);
      throw error;
    }
  }
  async deleteSeatingConfiguration(id: number): Promise<boolean> {
    try {
      await this.db
        .delete(seatingConfigurations)
        .where(eq(seatingConfigurations.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting seating configuration:", error);
      return false;
    }
  }
  async getPeriodicCriteriaByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const criteria = await this.db
        .select()
        .from(periodicCriteria)
        .where(eq(periodicCriteria.restaurantId, restaurantId))
        .orderBy(periodicCriteria.createdAt);
      return criteria;
    } catch (error) {
      console.error("Error fetching periodic criteria:", error);
      return [];
    }
  }
  async createPeriodicCriteria(criteria: any): Promise<any> {
    try {
      const [newCriteria] = await this.db
        .insert(periodicCriteria)
        .values({
          restaurantId: criteria.restaurantId,
          tenantId: criteria.tenantId,
          name: criteria.name,
          period: criteria.period,
          guests: criteria.guests,
          settings: criteria.settings || "Settings",
          isActive: criteria.isActive ?? true,
        })
        .returning();
      return newCriteria;
    } catch (error) {
      console.error("Error creating periodic criteria:", error);
      throw error;
    }
  }
  async updatePeriodicCriteria(id: number, updates: any): Promise<any> {
    try {
      const [updatedCriteria] = await this.db
        .update(periodicCriteria)
        .set({
          name: updates.name,
          period: updates.period,
          guests: updates.guests,
          settings: updates.settings,
          isActive: updates.isActive,
          updatedAt: new Date(),
        })
        .where(eq(periodicCriteria.id, id))
        .returning();
      return updatedCriteria;
    } catch (error) {
      console.error("Error updating periodic criteria:", error);
      throw error;
    }
  }
  async deletePeriodicCriteria(id: number): Promise<boolean> {
    try {
      await this.db.delete(periodicCriteria).where(eq(periodicCriteria.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting periodic criteria:", error);
      return false;
    }
  }
  async getBookingAgentsByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const agents = await this.db
        .select()
        .from(bookingAgents)
        .where(eq(bookingAgents.restaurantId, restaurantId))
        .orderBy(bookingAgents.createdAt);
      return agents;
    } catch (error) {
      console.error("Error fetching booking agents:", error);
      return [];
    }
  }
  async createBookingAgent(agent: any): Promise<any> {
    try {
      const [newAgent] = await this.db
        .insert(bookingAgents)
        .values({
          restaurantId: agent.restaurantId,
          tenantId: agent.tenantId,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          role: agent.role || "agent",
          isActive: agent.isActive ?? true,
          notes: agent.notes || null,
        })
        .returning();
      return newAgent;
    } catch (error) {
      console.error("Error creating booking agent:", error);
      throw error;
    }
  }
  async updateBookingAgent(id: number, updates: any): Promise<any> {
    try {
      const [updatedAgent] = await this.db
        .update(bookingAgents)
        .set({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          role: updates.role,
          isActive: updates.isActive,
          notes: updates.notes,
          updatedAt: new Date(),
        })
        .where(eq(bookingAgents.id, id))
        .returning();
      return updatedAgent;
    } catch (error) {
      console.error("Error updating booking agent:", error);
      throw error;
    }
  }
  async deleteBookingAgent(id: number): Promise<boolean> {
    try {
      await this.db.delete(bookingAgents).where(eq(bookingAgents.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting booking agent:", error);
      return false;
    }
  }
  async isBookingAgent(
    email: string,
    phone: string,
    restaurantId: number,
  ): Promise<any | null> {
    try {
      const agent = await this.db
        .select()
        .from(bookingAgents)
        .where(
          and(
            eq(bookingAgents.restaurantId, restaurantId),
            eq(bookingAgents.isActive, true),
            or(eq(bookingAgents.email, email), eq(bookingAgents.phone, phone)),
          ),
        )
        .limit(1);
      return agent.length > 0 ? agent[0] : null;
    } catch (error) {
      console.error("Error checking booking agent:", error);
      return null;
    }
  }
  // Kitchen Dashboard Methods
  // Kitchen Orders
  async createKitchenOrder(orderData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newOrder] = await this.db
      .insert(kitchenOrders)
      .values(orderData)
      .returning();
    return newOrder;
  }
  async getKitchenOrders(
    restaurantId: number,
    tenantId: number,
    timeRange?: string,
  ): Promise<any[]> {
    if (!this.db) return [];
    let query = this.db
      .select()
      .from(kitchenOrders)
      .where(
        and(
          eq(kitchenOrders.restaurantId, restaurantId),
          eq(kitchenOrders.tenantId, tenantId),
        ),
      );
    if (timeRange === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.where(gte(kitchenOrders.createdAt, today));
    } else if (timeRange === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.where(gte(kitchenOrders.createdAt, weekAgo));
    } else if (timeRange === "month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      query = query.where(gte(kitchenOrders.createdAt, monthAgo));
    }
    const result = await query.orderBy(desc(kitchenOrders.createdAt));
    return result;
  }
  async getKitchenOrderById(id: number): Promise<any> {
    if (!this.db) return null;
    const [order] = await this.db
      .select()
      .from(kitchenOrders)
      .where(eq(kitchenOrders.id, id));
    return order;
  }
  async updateKitchenOrder(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedOrder] = await this.db
      .update(kitchenOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(kitchenOrders.id, id))
      .returning();
    return updatedOrder;
  }
  async deleteKitchenOrder(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(kitchenOrders).where(eq(kitchenOrders.id, id));
    return true;
  }
  // Kitchen Stations
  async createKitchenStation(stationData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newStation] = await this.db
      .insert(kitchenStations)
      .values(stationData)
      .returning();
    return newStation;
  }
  async getKitchenStations(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(kitchenStations)
      .where(
        and(
          eq(kitchenStations.restaurantId, restaurantId),
          eq(kitchenStations.tenantId, tenantId),
        ),
      )
      .orderBy(asc(kitchenStations.name));
    return result;
  }
  async updateKitchenStation(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedStation] = await this.db
      .update(kitchenStations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(kitchenStations.id, id))
      .returning();
    return updatedStation;
  }
  async deleteKitchenStation(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(kitchenStations).where(eq(kitchenStations.id, id));
    return true;
  }
  // Kitchen Staff
  async createKitchenStaff(staffData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newStaff] = await this.db
      .insert(kitchenStaff)
      .values(staffData)
      .returning();
    return newStaff;
  }
  async getKitchenStaff(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(kitchenStaff)
      .where(
        and(
          eq(kitchenStaff.restaurantId, restaurantId),
          eq(kitchenStaff.tenantId, tenantId),
        ),
      )
      .orderBy(asc(kitchenStaff.name));
    return result;
  }
  async updateKitchenStaff(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedStaff] = await this.db
      .update(kitchenStaff)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(kitchenStaff.id, id))
      .returning();
    return updatedStaff;
  }
  async deleteKitchenStaff(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(kitchenStaff).where(eq(kitchenStaff.id, id));
    return true;
  }
  // Kitchen Performance Sparkline Data
  async getKitchenPerformanceSparkline(
    restaurantId: number,
    tenantId: number,
    timeRange: string = "4h",
  ): Promise<any[]> {
    if (!this.db) return [];
    // Generate time-series performance data based on current orders and historical patterns
    const now = new Date();
    const intervals = this.getTimeIntervals(timeRange, now);
    const orders = await this.getKitchenOrders(restaurantId, tenantId, "today");
    const stations = await this.getKitchenStations(restaurantId, tenantId);
    const staff = await this.getKitchenStaff(restaurantId, tenantId);
    return intervals.map((timestamp, index) => {
      // Calculate performance metrics for each time interval
      const baseEfficiency = 75 + Math.sin(index * 0.5) * 15; // Base wave pattern
      const orderInfluence = Math.min(orders.length * 2, 20); // More orders = higher efficiency up to a point
      const timeOfDayFactor = this.getTimeOfDayFactor(new Date(timestamp));
      const efficiency = Math.max(
        50,
        Math.min(
          100,
          baseEfficiency +
            orderInfluence +
            timeOfDayFactor +
            (Math.random() * 10 - 5),
        ),
      );
      // Calculate other metrics based on efficiency and current state
      const orderThroughput = Math.round(
        (efficiency / 100) * 25 + Math.random() * 5,
      );
      const averageTime = Math.round(
        30 - (efficiency / 100) * 8 + Math.random() * 4,
      );
      const activeOrders = Math.round(
        orders.filter((o) => ["pending", "preparing"].includes(o.status))
          .length *
          (0.8 + Math.random() * 0.4),
      );
      const completionRate = Math.max(
        70,
        Math.min(100, efficiency + Math.random() * 10 - 5),
      );
      const staffUtilization = Math.max(
        40,
        Math.min(
          100,
          (staff.filter((s: any) => s.status === "active").length /
            Math.max(staff.length, 1)) *
            100 +
            Math.random() * 15 -
            7.5,
        ),
      );
      const stationEfficiency = Math.max(
        60,
        Math.min(
          100,
          stations.reduce(
            (sum: number, station: any) => sum + station.efficiency,
            0,
          ) /
            Math.max(stations.length, 1) +
            Math.random() * 10 -
            5,
        ),
      );
      const customerSatisfaction = Math.max(
        70,
        Math.min(100, 85 + (efficiency - 75) * 0.5 + Math.random() * 8 - 4),
      );
      return {
        timestamp,
        efficiency: Math.round(efficiency * 10) / 10,
        orderThroughput: Math.round(orderThroughput * 10) / 10,
        averageTime: Math.round(averageTime * 10) / 10,
        activeOrders: Math.round(activeOrders),
        completionRate: Math.round(completionRate * 10) / 10,
        staffUtilization: Math.round(staffUtilization * 10) / 10,
        stationEfficiency: Math.round(stationEfficiency * 10) / 10,
        customerSatisfaction: Math.round(customerSatisfaction * 10) / 10,
      };
    });
  }
  private getTimeIntervals(timeRange: string, endTime: Date): string[] {
    const intervals: string[] = [];
    const intervalMinutes =
      timeRange === "1h"
        ? 5
        : timeRange === "4h"
          ? 15
          : timeRange === "12h"
            ? 30
            : 60;
    const totalMinutes =
      timeRange === "1h"
        ? 60
        : timeRange === "4h"
          ? 240
          : timeRange === "12h"
            ? 720
            : 1440;
    for (let i = totalMinutes; i >= 0; i -= intervalMinutes) {
      const time = new Date(endTime.getTime() - i * 60 * 1000);
      intervals.push(time.toISOString());
    }
    return intervals;
  }
  private getTimeOfDayFactor(time: Date): number {
    const hour = time.getHours();
    // Peak hours: 11-13 and 18-20, slower early morning and late night
    if ((hour >= 11 && hour <= 13) || (hour >= 18 && hour <= 20)) {
      return 10; // Peak efficiency
    } else if (hour >= 6 && hour <= 10) {
      return 5; // Morning prep
    } else if (hour >= 14 && hour <= 17) {
      return 0; // Afternoon lull
    } else if (hour >= 21 && hour <= 23) {
      return -5; // Evening cleanup
    } else {
      return -10; // Night/early morning
    }
  }
  // Kitchen Metrics
  async createKitchenMetrics(metricsData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newMetrics] = await this.db
      .insert(kitchenMetrics)
      .values(metricsData)
      .returning();
    return newMetrics;
  }
  async getKitchenMetrics(
    restaurantId: number,
    tenantId: number,
    timeRange?: string,
  ): Promise<any> {
    if (!this.db) return null;
    let query = this.db
      .select()
      .from(kitchenMetrics)
      .where(
        and(
          eq(kitchenMetrics.restaurantId, restaurantId),
          eq(kitchenMetrics.tenantId, tenantId),
        ),
      );
    if (timeRange === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.where(eq(kitchenMetrics.date, today));
    } else if (timeRange === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      query = query.where(gte(kitchenMetrics.date, weekAgoStr));
    } else if (timeRange === "month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr = monthAgo.toISOString().split("T")[0];
      query = query.where(gte(kitchenMetrics.date, monthAgoStr));
    }
    const result = await query.orderBy(desc(kitchenMetrics.date)).limit(1);
    return result[0] || null;
  }
  async updateKitchenMetrics(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updatedMetrics] = await this.db
      .update(kitchenMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(kitchenMetrics.id, id))
      .returning();
    return updatedMetrics;
  }
  // Calculate real-time metrics from orders
  async calculateKitchenMetrics(
    restaurantId: number,
    tenantId: number,
    timeRange: string = "today",
  ): Promise<any> {
    if (!this.db) return null;
    const orders = await this.getKitchenOrders(
      restaurantId,
      tenantId,
      timeRange,
    );
    const completedOrders = orders.filter(
      (order: any) => order.status === "served",
    );
    if (completedOrders.length === 0) {
      return {
        ordersToday: 0,
        averageTime: 0,
        efficiency: 0,
        revenue: 0,
        peakHours: [],
        popularItems: [],
        stationUtilization: [],
        waitTimes: [],
      };
    }
    // Calculate metrics
    const ordersToday = completedOrders.length;
    const totalTime = completedOrders.reduce(
      (sum: number, order: any) => sum + (order.actualTime || 0),
      0,
    );
    const averageTime = totalTime / completedOrders.length;
    const totalRevenue = completedOrders.reduce(
      (sum: number, order: any) => sum + order.totalAmount,
      0,
    );
    // Calculate efficiency (actual vs estimated time)
    const efficiencySum = completedOrders.reduce((sum: number, order: any) => {
      if (order.actualTime && order.estimatedTime) {
        return (
          sum + Math.min(100, (order.estimatedTime / order.actualTime) * 100)
        );
      }
      return sum + 100;
    }, 0);
    const efficiency = Math.round(efficiencySum / completedOrders.length);
    // Calculate peak hours
    const hourCounts: { [key: number]: number } = {};
    completedOrders.forEach((order: any) => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHours = Object.entries(hourCounts)
      .map(([hour, orders]) => ({ hour: parseInt(hour), orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
    // Calculate popular items
    const itemCounts: { [key: string]: { count: number; totalTime: number } } =
      {};
    completedOrders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.name;
          if (!itemCounts[key]) {
            itemCounts[key] = { count: 0, totalTime: 0 };
          }
          itemCounts[key].count += item.quantity || 1;
          itemCounts[key].totalTime += item.preparationTime || 0;
        });
      }
    });
    const popularItems = Object.entries(itemCounts)
      .map(([name, data]) => ({
        name,
        orders: data.count,
        time: Math.round(data.totalTime / data.count),
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);
    return {
      ordersToday,
      averageTime: Math.round(averageTime),
      efficiency,
      revenue: totalRevenue / 100, // Convert from cents to dollars
      peakHours,
      popularItems,
      stationUtilization: [], // Would need station assignment data
      waitTimes: [], // Would need detailed timing data
    };
  }
  // Print Orders Methods
  async createPrintOrder(orderData: any) {
    const [printOrder] = await this.db
      .insert(printOrders)
      .values(orderData)
      .returning();
    return printOrder;
  }
  async getPrintOrdersByRestaurant(restaurantId: number, tenantId: number) {
    return await this.db
      .select()
      .from(printOrders)
      .where(
        and(
          eq(printOrders.restaurantId, restaurantId),
          eq(printOrders.tenantId, tenantId),
        ),
      )
      .orderBy(desc(printOrders.createdAt));
  }
  async getPrintOrderById(orderId: number) {
    const [printOrder] = await this.db
      .select()
      .from(printOrders)
      .where(eq(printOrders.id, orderId));
    return printOrder;
  }
  async updatePrintOrder(orderId: number, updates: any) {
    const [updatedOrder] = await this.db
      .update(printOrders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(printOrders.id, orderId))
      .returning();
    return updatedOrder;
  }
  async updatePrintOrderByPaymentIntent(paymentIntentId: string, updates: any) {
    const [updatedOrder] = await this.db
      .update(printOrders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(printOrders.paymentIntentId, paymentIntentId))
      .returning();
    return updatedOrder;
  }
  async getPrintOrderByOrderNumber(orderNumber: string) {
    const [printOrder] = await this.db
      .select()
      .from(printOrders)
      .where(eq(printOrders.orderNumber, orderNumber));
    return printOrder;
  }
  async deletePrintOrder(orderId: number): Promise<void> {
    try {
      const result = await this.db
        .delete(printOrders)
        .where(eq(printOrders.id, orderId));
      console.log(`Deleted print order ${orderId}`);
    } catch (error) {
      console.error(`Error deleting print order ${orderId}:`, error);
      throw new Error(`Failed to delete print order: ${error.message}`);
    }
  }

  async getIntegrationConfigurations(tenantId: number, restaurantId: number) {
    try {
      const configs = await this.db
        .select()
        .from(integrationConfigurations)
        .where(
          and(
            eq(integrationConfigurations.tenantId, tenantId),
            eq(integrationConfigurations.restaurantId, restaurantId),
          ),
        );

      return configs;
    } catch (error) {
      console.error("Error fetching integration configurations:", error);
      return [];
    }
  }

  async saveIntegrationConfiguration(
    tenantId: number,
    restaurantId: number,
    integrationId: string,
    isEnabled: boolean,
    configuration: any,
  ) {
    const [result] = await this.db
      .insert(integrationConfigurations)
      .values({
        tenantId,
        restaurantId,
        integrationId,
        isEnabled,
        configuration,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          integrationConfigurations.tenantId,
          integrationConfigurations.restaurantId,
          integrationConfigurations.integrationId,
        ],
        set: {
          isEnabled,
          configuration,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  // Floor Plans
  async getFloorPlansByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(floorPlans)
      .where(eq(floorPlans.restaurantId, restaurantId))
      .orderBy(desc(floorPlans.createdAt));
    return result;
  }

  async getFloorPlanById(id: number): Promise<any | undefined> {
    if (!this.db) return undefined;
    const [result] = await this.db
      .select()
      .from(floorPlans)
      .where(eq(floorPlans.id, id));
    return result;
  }

  async createFloorPlan(floorPlan: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [result] = await this.db
      .insert(floorPlans)
      .values({
        ...floorPlan,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async updateFloorPlan(id: number, updates: any): Promise<any | undefined> {
    if (!this.db) return undefined;
    const [result] = await this.db
      .update(floorPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(floorPlans.id, id))
      .returning();
    return result;
  }

  async deleteFloorPlan(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(floorPlans).where(eq(floorPlans.id, id));
    return true;
  }

  // Floor Plan Templates
  async getFloorPlanTemplates(): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db
      .select()
      .from(floorPlanTemplates)
      .where(eq(floorPlanTemplates.isPublic, true))
      .orderBy(desc(floorPlanTemplates.popularity));
    return result;
  }

  async getFloorPlanTemplateById(id: number): Promise<any | undefined> {
    if (!this.db) return undefined;
    const [result] = await this.db
      .select()
      .from(floorPlanTemplates)
      .where(eq(floorPlanTemplates.id, id));
    return result;
  }

  async createFloorPlanTemplate(template: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [result] = await this.db
      .insert(floorPlanTemplates)
      .values({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  // Twilio SMS Methods
  async deductSmsBalance(tenantId: number, amount: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const existing = await this.db
      .select()
      .from(smsBalance)
      .where(eq(smsBalance.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) {
      const currentBalance = parseFloat(existing[0].balance);
      const newBalance = Math.max(0, currentBalance - amount);
      
      const [updated] = await this.db
        .update(smsBalance)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(smsBalance.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create balance record with negative amount (debt)
      const [created] = await this.db
        .insert(smsBalance)
        .values({
          tenantId,
          balance: (-amount).toFixed(2),
          currency: "EUR",
        })
        .returning();
      return created;
    }
  }

  async logSmsMessage(messageData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const [result] = await this.db
      .insert(smsMessages)
      .values({
        restaurantId: messageData.restaurantId,
        tenantId: messageData.tenantId,
        phoneNumber: messageData.phoneNumber,
        message: messageData.message,
        type: messageData.type,
        bookingId: messageData.bookingId,
        status: messageData.status || 'sent',
        cost: messageData.cost?.toFixed(4) || null,
        error: messageData.error || null,
        messageId: messageData.messageId || null,
        provider: messageData.provider || 'twilio',
        sentAt: new Date(),
      })
      .returning();
    return result;
  }

  async updateSmsMessageStatus(messageId: string, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const [result] = await this.db
      .update(smsMessages)
      .set({
        status: updates.status,
        error: updates.errorMessage || updates.error,
        updatedAt: updates.updatedAt || new Date(),
      })
      .where(eq(smsMessages.messageId, messageId))
      .returning();
    return result;
  }

  async getSmsMessagesByRestaurant(restaurantId: number, tenantId: number): Promise<any[]> {
    if (!this.db) return [];
    
    const result = await this.db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.restaurantId, restaurantId),
          eq(smsMessages.tenantId, tenantId)
        )
      )
      .orderBy(desc(smsMessages.sentAt))
      .limit(100);
    return result;
  }

  async getSmsMessagesByBooking(bookingId: number): Promise<any[]> {
    if (!this.db) return [];
    
    const result = await this.db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.bookingId, bookingId))
      .orderBy(desc(smsMessages.sentAt));
    return result;
  }

  // Stripe Connect Payment Methods
  async createStripePayment(payment: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const [result] = await this.db
      .insert(stripePayments)
      .values({
        ...payment,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async getStripePaymentsByTenant(tenantId: number): Promise<any[]> {
    if (!this.db) return [];
    
    const result = await this.db
      .select()
      .from(stripePayments)
      .where(eq(stripePayments.tenantId, tenantId))
      .orderBy(desc(stripePayments.createdAt));
    return result;
  }

  async getStripePaymentByIntentId(paymentIntentId: string): Promise<any | undefined> {
    if (!this.db) return undefined;
    
    const [result] = await this.db
      .select()
      .from(stripePayments)
      .where(eq(stripePayments.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    return result;
  }

  async updateStripePaymentByIntentId(paymentIntentId: string, updates: any): Promise<any | undefined> {
    if (!this.db) throw new Error("Database connection not available");
    
    const [result] = await this.db
      .update(stripePayments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(stripePayments.stripePaymentIntentId, paymentIntentId))
      .returning();
    return result;
  }

  async getTenantByStripeConnectAccountId(accountId: string): Promise<any | undefined> {
    if (!this.db) return undefined;
    
    const [result] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.stripeConnectAccountId, accountId))
      .limit(1);
    return result;
  }

  // Webhook Logging methods
  async createWebhookLog(log: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const [result] = await this.db
      .insert(webhookLogs)
      .values({
        ...log,
        createdAt: new Date(),
      })
      .returning();
    return result;
  }

  async getWebhookLogs(tenantId?: number, limit: number = 100): Promise<any[]> {
    if (!this.db) return [];
    
    let query = this.db
      .select()
      .from(webhookLogs)
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
    
    if (tenantId) {
      query = query.where(eq(webhookLogs.tenantId, tenantId));
    }
    
    return await query;
  }

  async getWebhookLogsByEventType(eventType: string, tenantId?: number): Promise<any[]> {
    if (!this.db) return [];
    
    let query = this.db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.eventType, eventType))
      .orderBy(desc(webhookLogs.createdAt));
    
    if (tenantId) {
      query = query.where(
        and(
          eq(webhookLogs.eventType, eventType),
          eq(webhookLogs.tenantId, tenantId)
        )
      );
    }
    
    return await query;
  }
}
