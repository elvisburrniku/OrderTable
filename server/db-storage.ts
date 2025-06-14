import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
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
  integrationConfigurations,
} = schema;

export class DatabaseStorage implements IStorage {
  db: any;

  constructor() {
    if (!process.env.DATABASE_URL) {
      console.error("No database connection string found. Database operations will fail until a proper connection string is provided.");
      console.error("No database connection string found. Database operations will be disabled until proper connection is configured.");
      console.error("DatabaseStorage initialized without database connection. All operations will throw errors until database is properly configured.");
      return;
    }

    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql, { schema });
  }

  async initialize() {
    if (!this.db) {
      console.error("Cannot initialize data without database connection. Please provide DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
      return;
    }

    await this.initializeSubscriptionPlans();
  }

  private async initializeSubscriptionPlans() {
    try {
      const existingPlans = await this.db.select().from(subscriptionPlans).limit(1);
      
      if (existingPlans.length === 0) {
        await this.db.insert(subscriptionPlans).values([
          {
            name: "Free",
            price: 0,
            interval: "monthly",
            features: JSON.stringify(["Basic booking management", "Up to 3 tables", "Email notifications"]),
            maxTables: 3,
            maxBookingsPerMonth: 20,
            maxRestaurants: 1,
            trialDays: 0,
            isActive: true
          },
          {
            name: "Starter",
            price: 2900,
            interval: "monthly", 
            features: JSON.stringify(["Advanced booking management", "Customer CRM", "SMS notifications", "Analytics"]),
            maxTables: 10,
            maxBookingsPerMonth: 100,
            maxRestaurants: 1,
            trialDays: 14,
            isActive: true
          },
          {
            name: "Professional",
            price: 7900,
            interval: "monthly",
            features: JSON.stringify(["Everything in Starter", "Multiple restaurants", "API access", "Priority support"]),
            maxTables: 50,
            maxBookingsPerMonth: 500,
            maxRestaurants: 3,
            trialDays: 14,
            isActive: true
          },
          {
            name: "Enterprise", 
            price: 19900,
            interval: "monthly",
            features: JSON.stringify(["Everything in Professional", "Unlimited tables", "Custom integrations", "Dedicated support"]),
            maxTables: 999,
            maxBookingsPerMonth: 9999,
            maxRestaurants: 10,
            trialDays: 30,
            isActive: true
          }
        ]);
        console.log("Initialized subscription plans in database");
      }
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
    }
  }

  // Stub methods for interface compliance
  async createTenant(tenant: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newTenant] = await this.db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async getTenantByUserId(userId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select({
        tenant: tenants,
        tenantUser: tenantUsers
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(eq(tenantUsers.userId, userId))
      .limit(1);
    
    return result[0]?.tenant;
  }

  async getTenantById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(tenants).where(eq(tenants.id, id));
    return result[0];
  }

  async getTenantByStripeCustomerId(stripeCustomerId: string): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(tenants).where(eq(tenants.stripeCustomerId, stripeCustomerId));
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
    const [newTenantUser] = await this.db.insert(tenantUsers).values(tenantUser).returning();
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
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
    }
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserBySSOId(ssoProvider: string, ssoId: string): Promise<any> {
    if (!this.db) {
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
    }
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.ssoProvider, ssoProvider), eq(users.ssoId, ssoId)));
    return result[0];
  }

  async createUser(insertUser: any): Promise<any> {
    if (!this.db) {
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
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
    
    // Get user's tenant to cascade delete tenant data
    const user = await this.getUserById(userId);
    if (!user) return;

    const tenantId = user.tenantId;

    try {
      // Delete in reverse dependency order to avoid foreign key constraints
      
      // Delete notifications for all restaurants owned by this tenant
      if (tenantId) {
        await this.db.execute(
          sql`DELETE FROM notifications WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete booking change requests
        await this.db.execute(
          sql`DELETE FROM booking_change_requests WHERE booking_id IN (SELECT id FROM bookings WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId}))`
        );
        
        // Delete activity logs
        await this.db.execute(
          sql`DELETE FROM activity_log WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete feedback
        await this.db.execute(
          sql`DELETE FROM feedback WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete SMS messages
        await this.db.execute(
          sql`DELETE FROM sms_messages WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete waiting list entries
        await this.db.execute(
          sql`DELETE FROM waiting_list WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete customers
        await this.db.execute(
          sql`DELETE FROM customers WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete bookings
        await this.db.execute(
          sql`DELETE FROM bookings WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete table layouts
        await this.db.execute(
          sql`DELETE FROM table_layouts WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete combined tables
        await this.db.execute(
          sql`DELETE FROM combined_tables WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete tables
        await this.db.execute(
          sql`DELETE FROM tables WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete rooms
        await this.db.execute(
          sql`DELETE FROM rooms WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete cut-off times
        await this.db.execute(
          sql`DELETE FROM cut_off_times WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete special periods
        await this.db.execute(
          sql`DELETE FROM special_periods WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete opening hours
        await this.db.execute(
          sql`DELETE FROM opening_hours WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete integration configurations
        await this.db.execute(
          sql`DELETE FROM integration_configurations WHERE restaurant_id IN (SELECT id FROM restaurants WHERE tenant_id = ${tenantId})`
        );
        
        // Delete restaurants
        await this.db.delete(restaurants).where(eq(restaurants.tenantId, tenantId));
        
        // Delete tenant
        await this.db.delete(tenants).where(eq(tenants.id, tenantId));
      }
      
      // Delete user subscriptions
      await this.db.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));
      
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
    const result = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async getRestaurantByUserId(userId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(restaurants).where(eq(restaurants.userId, userId));
    return result[0];
  }

  async getRestaurantById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async getRestaurantsByTenantId(tenantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(restaurants).where(eq(restaurants.tenantId, tenantId));
    return result;
  }

  async createRestaurant(restaurant: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(restaurants).values(restaurant).returning();
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
    const result = await this.db.execute(
      sql`SELECT * FROM tables WHERE restaurant_id = ${restaurantId}`
    );
    return result.rows;
  }

  async createTable(table: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(tables).values(table).returning();
    return result[0];
  }

  async updateTable(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.update(tables).set(updates).where(eq(tables.id, id)).returning();
    return result[0];
  }

  async deleteTable(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(tables).where(eq(tables.id, id));
    return true;
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
    return result;
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<any[]> {
    if (!this.db) return [];
    
    // Use SQL date function to compare dates
    const result = await this.db.select().from(bookings)
      .where(and(
        eq(bookings.restaurantId, restaurantId),
        sql`DATE(${bookings.bookingDate}) = ${date}`
      ));
    return result;
  }

  async createBooking(booking: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(bookings).values(booking).returning();
    return result[0];
  }

  async updateBooking(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return result[0];
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
          AND created_at < ${startOfNextMonth.toISOString()}`
    );
    
    return Number(result.rows[0]?.count || 0);
  }

  async getCustomersByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(customers).where(eq(customers.restaurantId, restaurantId));
    return result;
  }

  async getCustomerByEmail(restaurantId: number, email: string): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(customers)
      .where(and(eq(customers.restaurantId, restaurantId), eq(customers.email, email)));
    return result[0];
  }

  async getCustomerById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async createCustomer(customer: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.update(customers).set(updates).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    let customer = await this.getCustomerByEmail(restaurantId, customerData.email);
    
    if (!customer) {
      customer = await this.createCustomer({
        ...customerData,
        restaurantId,
        tenantId
      });
    }
    
    return customer;
  }

  async createWalkInCustomer(restaurantId: number, tenantId: number, customerData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const walkInData = {
      name: customerData?.name || "Walk-in Customer",
      email: customerData?.email || null,
      phone: customerData?.phone || null,
      restaurantId,
      tenantId,
      isWalkIn: true,
      ...customerData
    };
    
    const result = await this.db.insert(customers).values(walkInData).returning();
    return result[0];
  }

  async getSubscriptionPlans(): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
    return result;
  }

  async getSubscriptionPlan(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return result[0];
  }

  async createSubscriptionPlan(plan: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(subscriptionPlans).values(plan).returning();
    return result[0];
  }

  async getUserSubscription(userId: number): Promise<any> {
    return null; // Simplified for now
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<any> {
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
    const result = await this.db.select().from(tables).where(eq(tables.id, id));
    return result[0];
  }

  async getBookingById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async getUnassignedBookings(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(bookings)
      .where(and(
        eq(bookings.restaurantId, restaurantId),
        eq(bookings.tableId, null)
      ));
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
      const result = await this.db
        .select()
        .from(rooms)
        .where(eq(rooms.id, id));
      
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching room:", error);
      return null;
    }
  }

  async createRoom(room: any): Promise<any> {
    try {
      const [newRoom] = await this.db
        .insert(rooms)
        .values(room)
        .returning();
      
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
      await this.db
        .delete(rooms)
        .where(eq(rooms.id, id));
      
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
        .values(data)
        .returning();
      
      return newCombinedTable;
    } catch (error) {
      console.error("Error creating combined table:", error);
      throw error;
    }
  }

  async updateCombinedTable(id: number, updates: any): Promise<any> {
    try {
      const [updatedCombinedTable] = await this.db
        .update(combinedTables)
        .set(updates)
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
      await this.db
        .delete(combinedTables)
        .where(eq(combinedTables.id, id));
      
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

  async createOrUpdateOpeningHours(restaurantId: number, tenantId: number, hoursData: any[]): Promise<any> {
    try {
      // Delete existing opening hours for this restaurant
      await this.db
        .delete(openingHours)
        .where(eq(openingHours.restaurantId, restaurantId));

      // Insert new opening hours
      if (hoursData && hoursData.length > 0) {
        const hoursToInsert = hoursData.map(hour => ({
          restaurantId,
          tenantId,
          dayOfWeek: hour.dayOfWeek,
          isOpen: hour.isOpen,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          createdAt: new Date(),
          updatedAt: new Date()
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
      await this.db
        .delete(specialPeriods)
        .where(eq(specialPeriods.id, id));
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

  async createOrUpdateCutOffTimes(restaurantId: number, tenantId: number, timesData: any[]): Promise<any> {
    try {
      // Delete existing cut-off times for this restaurant
      await this.db
        .delete(cutOffTimes)
        .where(eq(cutOffTimes.restaurantId, restaurantId));

      // Insert new cut-off times
      if (timesData && timesData.length > 0) {
        const timesToInsert = timesData.map(time => ({
          restaurantId,
          tenantId,
          dayOfWeek: time.dayOfWeek,
          isEnabled: time.isEnabled,
          cutOffHours: time.cutOffHours,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await this.db.insert(cutOffTimes).values(timesToInsert);
      }

      return { success: true, message: "Cut-off times updated successfully" };
    } catch (error) {
      console.error("Error updating cut-off times:", error);
      return { success: false, message: "Failed to update cut-off times" };
    }
  }

  async isRestaurantOpen(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> {
    return true; // Simplified - assume always open
  }

  async isBookingAllowed(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> {
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
      console.error("Error fetching booking change requests by booking ID:", error);
      return [];
    }
  }

  async getBookingChangeRequestsByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const requests = await this.db
        .select()
        .from(bookingChangeRequests)
        .where(eq(bookingChangeRequests.restaurantId, restaurantId))
        .orderBy(desc(bookingChangeRequests.createdAt));
      
      return requests || [];
    } catch (error) {
      console.error("Error fetching booking change requests by restaurant:", error);
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
          status: request.status || 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
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
          updatedAt: new Date()
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

  async revertNotification(notificationId: number, userEmail: string): Promise<boolean> {
    return false;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return false;
  }

  async getIntegrationConfigurationsByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const integrationData = await this.db
        .select()
        .from(integrationConfigurations)
        .where(eq(integrationConfigurations.restaurantId, restaurantId));
      
      // Parse configuration JSON strings back to objects
      const parsedData = integrationData.map((config: any) => {
        let parsedConfig = config.configuration;
        if (typeof config.configuration === 'string') {
          try {
            parsedConfig = JSON.parse(config.configuration);
          } catch (e) {
            parsedConfig = {};
          }
        }
        return {
          ...config,
          configuration: parsedConfig
        };
      });
      
      return parsedData || [];
    } catch (error) {
      console.error("Error fetching integration configurations:", error);
      return [];
    }
  }

  async getIntegrationByRestaurantAndType(restaurantId: number, integrationType: string): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(integrationConfigurations)
        .where(and(
          eq(integrationConfigurations.restaurantId, restaurantId),
          eq(integrationConfigurations.integrationId, integrationType)
        ));
      
      if (result.length === 0) {
        return null;
      }

      const config = result[0];
      
      // Parse configuration JSON string back to object
      let parsedConfig = config.configuration;
      if (typeof config.configuration === 'string') {
        try {
          parsedConfig = JSON.parse(config.configuration);
        } catch (e) {
          parsedConfig = {};
        }
      }
      
      return {
        ...config,
        configuration: parsedConfig
      };
    } catch (error) {
      console.error("Error fetching integration by restaurant and type:", error);
      return null;
    }
  }

  async getIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(integrationConfigurations)
        .where(and(
          eq(integrationConfigurations.restaurantId, restaurantId),
          eq(integrationConfigurations.integrationId, integrationId)
        ));
      
      return result[0] || null;
    } catch (error) {
      console.error("Error fetching integration configuration:", error);
      return null;
    }
  }

  async createOrUpdateIntegrationConfiguration(restaurantId: number, tenantId: number, integrationId: string, isEnabled: boolean, configuration: any = {}): Promise<any> {
    try {
      // Check if configuration already exists
      const existing = await this.getIntegrationConfiguration(restaurantId, integrationId);
      
      if (existing) {
        // Update existing configuration
        const [updated] = await this.db
          .update(integrationConfigurations)
          .set({
            configuration: configuration,
            isEnabled: isEnabled,
            updatedAt: new Date()
          })
          .where(and(
            eq(integrationConfigurations.restaurantId, restaurantId),
            eq(integrationConfigurations.integrationId, integrationId)
          ))
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
            updatedAt: new Date()
          })
          .returning();
        
        return created;
      }
    } catch (error) {
      console.error("Error saving integration configuration:", error);
      throw error;
    }
  }

  async deleteIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<boolean> {
    try {
      await this.db
        .delete(integrationConfigurations)
        .where(and(
          eq(integrationConfigurations.restaurantId, restaurantId),
          eq(integrationConfigurations.integrationId, integrationId)
        ));
      
      return true;
    } catch (error) {
      console.error("Error deleting integration configuration:", error);
      return false;
    }
  }

  async getWebhooksByRestaurant(restaurantId: number) {
    return [];
  }

  async saveWebhooks(restaurantId: number, tenantId: number, webhooksData: any[]): Promise<any[]> {
    // For now, return the webhooks data as-is since webhooks table may not exist
    // This maintains interface compatibility while allowing the application to work
    return webhooksData || [];
  }

  async getSmsMessagesByRestaurant(restaurantId: number): Promise<any[]> {
    return [];
  }

  async createSmsMessage(message: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getWaitingListByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) throw new Error("Database connection not available");
    return await this.db.select().from(waitingList).where(eq(waitingList.restaurantId, restaurantId));
  }

  async createWaitingListEntry(entry: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newEntry] = await this.db.insert(waitingList).values(entry).returning();
    return newEntry;
  }

  async getWaitingListEntryById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(waitingList).where(eq(waitingList.id, id));
    return result[0];
  }

  async updateWaitingListEntry(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [updated] = await this.db.update(waitingList).set(updates).where(eq(waitingList.id, id)).returning();
    return updated;
  }



  async getFeedbackByRestaurant(restaurantId: number): Promise<any[]> {
    return [];
  }

  async createFeedback(feedbackData: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getActivityLogByRestaurant(restaurantId: number): Promise<any[]> {
    return [];
  }

  async createActivityLog(log: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(activityLog).values(log).returning();
    return result[0];
  }

  async getTimeSlotsByRestaurant(restaurantId: number, date?: string): Promise<any[]> {
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
    return null;
  }

  async saveTableLayout(restaurantId: number, tenantId: number, room: string, positions: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getReschedulingSuggestionsByRestaurant(restaurantId: number): Promise<any[]> {
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
    const result = await this.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      restaurantName: users.restaurantName,
      createdAt: users.createdAt
    }).from(users);
    return result;
  }

  // Additional subscription-related methods
  async getSubscriptionPlanById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return result[0];
  }

  async getFreePlan(): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.price, 0), eq(subscriptionPlans.isActive, true)))
      .limit(1);
    return result[0];
  }
}