import { eq, and, desc, gte, lt } from "drizzle-orm";
import { 
  users, 
  restaurants, 
  bookings, 
  customers, 
  tables, 
  rooms, 
  combinedTables,
  subscriptionPlans, 
  userSubscriptions, 
  tenants, 
  tenantUsers, 
  waitingList, 
  smsMessages, 
  activityLog, 
  feedback, 
  timeSlots, 
  tableLayouts, 
  openingHours, 
  specialPeriods, 
  cutOffTimes,
  bookingChangeRequests,
  notifications,
  integrationConfigurations,
  webhooks,
  reschedulingSuggestions
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import type { IStorage } from "./storage";
import type { 
  User, 
  InsertUser, 
  Restaurant, 
  InsertRestaurant, 
  Table, 
  InsertTable, 
  Booking, 
  InsertBooking, 
  Customer, 
  InsertCustomer, 
  SmsMessage, 
  InsertSmsMessage, 
  WaitingList, 
  InsertWaitingList, 
  Feedback, 
  InsertFeedback, 
  ActivityLog, 
  InsertActivityLog, 
  TimeSlots, 
  InsertTimeSlots, 
  SubscriptionPlan, 
  InsertSubscriptionPlan, 
  UserSubscription, 
  InsertUserSubscription, 
  Room, 
  InsertRoom, 
  TableLayout, 
  IntegrationConfiguration 
} from "@shared/schema";
import { BookingHash } from "./booking-hash";

// Use Supabase database URL if available, otherwise use the existing DATABASE_URL
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

let db: any;

if (!databaseUrl) {
  console.warn("No database connection string found. Database operations will fail until a proper connection string is provided.");
  // Create a mock connection that will throw helpful errors
  db = null;
} else if (process.env.SUPABASE_DATABASE_URL) {
  // Use postgres-js for Supabase connection
  const client = postgres(databaseUrl);
  db = drizzlePostgres(client, { schema });
} else {
  // Use neon for existing setup - only if URL format is valid
  try {
    const sql = neon(databaseUrl);
    db = drizzle(sql, { schema });
  } catch (error) {
    console.error("Invalid database URL format:", error);
    db = null;
  }
}

export class DatabaseStorage implements IStorage {
  db: any;

  constructor() {
    this.db = db;
    if (!this.db) {
      console.warn("DatabaseStorage initialized without database connection. All operations will throw errors until database is properly configured.");
    }
  }

  // Initialize default data
  async initialize() {
    if (!this.db) {
      console.warn("Cannot initialize data without database connection. Please provide DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
      return;
    }
    await this.initializeSubscriptionPlans();
    await this.initializeDemoData();
  }

  private async initializeSubscriptionPlans() {
    const existingPlans = await this.db.select().from(subscriptionPlans);

    if (existingPlans.length === 0) {
      const plans = [
        {
          name: "Free Trial",
          price: 0,
          interval: "monthly" as const,
          features: JSON.stringify([
            "14-day trial",
            "1 restaurant",
            "Up to 5 tables",
            "Up to 20 bookings per month",
            "Basic customer management",
            "Email notifications"
          ]),
          maxTables: 5,
          maxBookingsPerMonth: 20,
          maxRestaurants: 1,
          trialDays: 14,
          isActive: true
        },
        {
          name: "Starter",
          price: 2900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "1 restaurant",
            "Up to 10 tables",
            "Up to 50 bookings per month",
            "Basic customer management",
            "Email notifications",
            "Basic reporting"
          ]),
          maxTables: 10,
          maxBookingsPerMonth: 50,
          maxRestaurants: 1,
          trialDays: 14,
          isActive: true
        },
        {
          name: "Professional",
          price: 4900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "3 restaurants",
            "Up to 25 tables per restaurant",
            "Up to 200 bookings per month",
            "Advanced booking management",
            "SMS notifications",
            "Custom fields",
            "Feedback system",
            "Analytics",
            "Waiting list management"
          ]),
          maxTables: 25,
          maxBookingsPerMonth: 200,
          maxRestaurants: 3,
          trialDays: 14,
          isActive: true
        },
        {
          name: "Business",
          price: 7900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "10 restaurants",
            "Up to 50 tables per restaurant",
            "Up to 500 bookings per month",
            "All Professional features",
            "Payment processing",
            "API access",
            "Priority support",
            "Advanced analytics"
          ]),
          maxTables: 50,
          maxBookingsPerMonth: 500,
          maxRestaurants: 10,
          trialDays: 14,
          isActive: true
        },
        {
          name: "Enterprise",
          price: 15900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "Unlimited restaurants",
            "Up to 100 tables per restaurant",
            "Unlimited bookings",
            "All Business features",
            "Custom integrations",
            "Dedicated support",
            "White-label solutions",
            "Multi-location management"
          ]),
          maxTables: 100,
          maxBookingsPerMonth: 99999,
          maxRestaurants: 999,
          trialDays: 14,
          isActive: true
        }
      ];

      await this.db.insert(subscriptionPlans).values(plans);
      console.log("Initialized subscription plans in database");
    }
  }

  private async initializeDemoData() {
    try {
      // Check if demo tenant already exists
      const existingTenant = await this.db.select().from(tenants).where(eq(tenants.slug, "demo-restaurant")).limit(1);

      if (existingTenant.length > 0) {
        console.log("Demo data already initialized, skipping...");
        return;
      }

      console.log("Initializing demo data...");
      
      // Create demo tenant
      const [tenant] = await this.db.insert(tenants).values({
        name: "Demo Restaurant",
        slug: "demo-restaurant"
      }).returning();

      // Create demo user
      const [user] = await this.db.insert(users).values({
        email: "demo@restaurant.com",
        password: "password123",
        name: "Demo Restaurant Owner",
        restaurantName: "The Demo Restaurant"
      }).returning();

      // Link user to tenant
      await this.db.insert(tenantUsers).values({
        tenantId: tenant.id,
        userId: user.id,
        role: "administrator"
      });

      // Create demo restaurant
      const [restaurant] = await this.db.insert(restaurants).values({
        name: "The Demo Restaurant",
        tenantId: tenant.id,
        userId: user.id,
        address: "123 Main Street, Copenhagen, Denmark",
        phone: "+45 12 34 56 78",
        email: "info@demorestaurant.com",
        description: "A modern restaurant with exceptional dining experience",
        emailSettings: JSON.stringify({
          enabled: true,
          confirmationTemplate: "default",
          reminderEnabled: true,
          reminderHours: 2
        })
      }).returning();

      // Create demo tables
      const tableData = [];
      for (let i = 1; i <= 12; i++) {
        tableData.push({
          restaurantId: restaurant.id,
          tenantId: tenant.id,
          tableNumber: i.toString(),
          capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
          isActive: true
        });
      }
      await this.db.insert(tables).values(tableData);

      // Create additional tables for any other restaurants that might exist
      const allRestaurants = await this.db.select().from(restaurants);
      for (const r of allRestaurants) {
        if (r.id !== restaurant.id) {
          const existingTables = await this.db.select().from(tables).where(eq(tables.restaurantId, r.id));
          if (existingTables.length === 0) {
            const additionalTableData = [];
            for (let i = 1; i <= 12; i++) {
              additionalTableData.push({
                restaurantId: r.id,
                tenantId: r.tenantId,
                tableNumber: i.toString(),
                capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
                isActive: true
              });
            }
            await this.db.insert(tables).values(additionalTableData);
          }
        }
      }

      // Create demo customers
      const customerData = [
        { restaurantId: restaurant.id, tenantId: tenant.id, name: "John Smith", email: "john@example.com", phone: "+45 11 22 33 44" },
        { restaurantId: restaurant.id, tenantId: tenant.id, name: "Sarah Johnson", email: "sarah@example.com", phone: "+45 22 33 44 55" },
        { restaurantId: restaurant.id, tenantId: tenant.id, name: "Michael Brown", email: "michael@example.com", phone: "+45 33 44 55 66" }
      ];
      await this.db.insert(customers).values(customerData);

        console.log("Initialized demo data in database");
      }
    } catch (error) {
      console.error("Error initializing demo data:", error);
    }
  }

  // Tenant methods
  async createTenant(tenant: any): Promise<any> {
    const [newTenant] = await this.db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async getTenantByUserId(userId: number): Promise<any> {
    const result = await this.db
      .select({
        tenant: tenants,
        tenantUser: tenantUsers
      })
      .from(tenantUsers)
      .leftJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(eq(tenantUsers.userId, userId))
      .limit(1);

    return result[0]?.tenant || null;
  }

  async createTenantUser(tenantUser: any): Promise<any> {
    const [newTenantUser] = await this.db.insert(tenantUsers).values(tenantUser).returning();
    return newTenantUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.db) {
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
    }
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.db) {
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
    }
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Restaurants
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const result = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async getRestaurantByUserId(userId: number): Promise<Restaurant | undefined> {
    const results = await this.db.select().from(restaurants).where(eq(restaurants.userId, userId));
    return results[0];
  }

  async getRestaurantById(id: number): Promise<Restaurant | undefined> {
    const results = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return results[0];
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const restaurantData = {
      ...restaurant,
      emailSettings: restaurant.emailSettings || null
    };
    const [newRestaurant] = await this.db.insert(restaurants).values(restaurantData).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: number, updates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    // Remove any properties that don't exist on the table
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).updatedAt;

    const [updated] = await this.db.update(restaurants)
      .set(cleanUpdates)
      .where(eq(restaurants.id, id))
      .returning();
    return updated;
  }

  // Tables
  async getTablesByRestaurant(restaurantId: number): Promise<Table[]> {
    return await this.db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [newTable] = await this.db.insert(tables).values(table).returning();
    return newTable;
  }

  async updateTable(id: number, updates: Partial<Table>): Promise<Table | undefined> {
    const [updated] = await this.db.update(tables)
      .set(updates)
      .where(eq(tables.id, id))
      .returning();
    return updated;
  }

  async deleteTable(id: number): Promise<boolean> {
    const result = await this.db.delete(tables).where(eq(tables.id, id));
    return result.rowCount > 0;
  }

  // Bookings
  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return await this.db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    return await this.db.select().from(bookings)
      .where(
        and(
          eq(bookings.restaurantId, restaurantId),
          gte(bookings.bookingDate, startOfDay),
          lt(bookings.bookingDate, endOfDay)
        )
      );
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    // Import BookingHash at the top of the file if not already imported
    const { BookingHash } = await import('./booking-hash');

    // Generate management hash for the booking
    const managementHash = BookingHash.generateHash(
      0, // Temporary ID, will be replaced with actual ID after insertion
      booking.tenantId,
      booking.restaurantId,
      'manage'
    );

    const [newBooking] = await this.db.insert(bookings).values({
      ...booking,
      managementHash
    }).returning();

    // Update the hash with the actual booking ID
    const finalHash = BookingHash.generateHash(
      newBooking.id,
      newBooking.tenantId,
      newBooking.restaurantId,
      'manage'
    );

    // Update the booking with the correct hash
    const [updatedBooking] = await this.db.update(bookings)
      .set({ managementHash: finalHash })
      .where(eq(bookings.id, newBooking.id))
      .returning();

    return updatedBooking;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const [updated] = await this.db.update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: number): Promise<boolean> {
    const result = await this.db.delete(bookings).where(eq(bookings.id, id));
    return result.rowCount > 0;
  }

  // Customers
  async getCustomersByRestaurant(restaurantId: number): Promise<Customer[]> {
    return await this.db.select().from(customers).where(eq(customers.restaurantId, restaurantId));
  }

  async getCustomerByEmail(restaurantId: number, email: string): Promise<Customer | undefined> {
    const result = await this.db.select().from(customers)
      .where(and(
        eq(customers.restaurantId, restaurantId),
        eq(customers.email, email)
      ));
    return result[0];
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const result = await this.db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await this.db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [updated] = await this.db.update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: { name: string; email: string; phone?: string }): Promise<Customer> {
    // First try to find existing customer
    let customer = await this.getCustomerByEmail(restaurantId, customerData.email);

    if (customer) {
      // Update existing customer with latest info and increment booking count
      const updatedCustomer = await this.updateCustomer(customer.id, {
        name: customerData.name,
        phone: customerData.phone,
        totalBookings: (customer.totalBookings || 0) + 1,
        lastVisit: new Date()
      });
      return updatedCustomer!;
    } else {
      // Create new customer
      customer = await this.createCustomer({
        restaurantId,
        tenantId,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone || ""
      });

      // Update with first booking count
      const updatedCustomer = await this.updateCustomer(customer.id, {
        totalBookings: 1,
        lastVisit: new Date()
      });
      return updatedCustomer!;
    }
  }

  async createWalkInCustomer(restaurantId: number, tenantId: number, customerData?: { name?: string; phone?: string; notes?: string }): Promise<Customer> {
    const walkInData = {
      restaurantId,
      tenantId,
      name: customerData?.name || "Walk-in Customer",
      email: null,
      phone: customerData?.phone || null,
      isWalkIn: true,
      notes: customerData?.notes || null
    };

    const [newCustomer] = await this.db.insert(customers).values(walkInData).returning();
    return newCustomer;
  }

  // SMS Messages
  async getSmsMessagesByRestaurant(restaurantId: number): Promise<SmsMessage[]> {
    return await this.db.select().from(smsMessages).where(eq(smsMessages.restaurantId, restaurantId));
  }

  async createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage> {
    const [newMessage] = await this.db.insert(smsMessages).values(message).returning();
    return newMessage;
  }

  // Waiting List
  async getWaitingListByRestaurant(restaurantId: number): Promise<WaitingList[]> {
    return await this.db.select().from(waitingList).where(eq(waitingList.restaurantId, restaurantId));
  }

  async createWaitingListEntry(entry: InsertWaitingList): Promise<WaitingList> {
    const [newEntry] = await this.db.insert(waitingList).values(entry).returning();
    return newEntry;
  }

  async updateWaitingListEntry(id: number, updates: Partial<WaitingList>): Promise<WaitingList | undefined> {
    const [updated] = await this.db.update(waitingList)
      .set(updates)
      .where(eq(waitingList.id, id))
      .returning();
    return updated;
  }

  // Feedback
  async getFeedbackByRestaurant(restaurantId: number): Promise<Feedback[]> {
    return await this.db.select().from(feedback).where(eq(feedback.restaurantId, restaurantId));
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await this.db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  // Activity Log
  async getActivityLogByRestaurant(restaurantId: number): Promise<ActivityLog[]> {
    return await this.db.select().from(activityLog).where(eq(activityLog.restaurantId, restaurantId));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await this.db.insert(activityLog).values(log).returning();
    return newLog;
  }

  // Time Slots
  async getTimeSlotsByRestaurant(restaurantId: number, date?: string): Promise<TimeSlots[]> {
    if (date) {
      return await this.db.select().from(timeSlots)
        .where(and(
          eq(timeSlots.restaurantId, restaurantId),
          eq(timeSlots.date, date)
        ));
    }
    return await this.db.select().from(timeSlots).where(eq(timeSlots.restaurantId, restaurantId));
  }

  async createTimeSlot(slot: InsertTimeSlots): Promise<TimeSlots> {
    const [newSlot] = await this.db.insert(timeSlots).values(slot).returning();
    return newSlot;
  }

  async updateTimeSlot(id: number, updates: Partial<TimeSlots>): Promise<TimeSlots | undefined> {
    const [updated] = await this.db.update(timeSlots)
      .set(updates)
      .where(eq(timeSlots.id, id))
      .returning();
    return updated;
  }

  // Subscription Plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await this.db.select().from(subscriptionPlans);
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const result = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return result[0];
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await this.db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  // User Subscriptions
  async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
    const result = await this.db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return result[0];
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    const result = await this.db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return result[0];
  }

  async getAllUserSubscriptions(): Promise<UserSubscription[]> {
    return await this.db.select().from(userSubscriptions);
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [newSubscription] = await this.db.insert(userSubscriptions).values(subscription).returning();
    return newSubscription;
  }

  async updateUserSubscription(id: number, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const [updated] = await this.db.update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updated;
  }

  async getUserSubscriptionById(id: number): Promise<UserSubscription | undefined> {
    const result = await this.db.select().from(userSubscriptions).where(eq(userSubscriptions.id, id));
    return result[0];
  }

  // Additional methods needed for complete functionality
  async getTableById(id: number): Promise<Table | undefined> {
    const result = await this.db.select().from(tables).where(eq(tables.id, id));
    return result[0];
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    const result = await this.db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async getWaitingListEntryById(id: number): Promise<WaitingList | undefined> {
    const result = await this.db.select().from(waitingList).where(eq(waitingList.id, id));
    return result[0];
  }

  async getTimeSlotById(id: number): Promise<TimeSlots | undefined> {
    const result = await this.db.select().from(timeSlots).where(eq(timeSlots.id, id));
    return result[0];
  }

  // Rooms
  async getRoomsByRestaurant(restaurantId: number): Promise<Room[]> {
    return await this.db.select().from(rooms).where(eq(rooms.restaurantId, restaurantId));
  }

  async getRoomById(id: number): Promise<Room | undefined> {
    const result = await this.db.select().from(rooms).where(eq(rooms.id, id));
    return result[0];
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await this.db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined> {
    const [updated] = await this.db.update(rooms)
      .set(updates)
      .where(eq(rooms.id, id))
      .returning();
    return updated;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const result = await this.db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount > 0;
  }

  // Combined tables methods
  async getCombinedTablesByRestaurant(restaurantId: number): Promise<any[]> {
    try {
      const result = await this.db
        .select()
        .from(combinedTables)
        .where(eq(combinedTables.restaurantId, restaurantId));
      return result;
    } catch (error) {
      console.error("Error fetching combined tables:", error);
      return [];
    }
  }

  async createCombinedTable(data: any): Promise<any> {
    try {
      const [result] = await this.db
        .insert(combinedTables)
        .values({
          name: data.name,
          tableIds: JSON.stringify(data.tableIds),
          totalCapacity: data.totalCapacity,
          restaurantId: data.restaurantId,
          tenantId: data.tenantId,
          isActive: true
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating combined table:", error);
      throw error;
    }
  }

  async updateCombinedTable(id: number, updates: any): Promise<any> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.tableIds !== undefined) updateData.tableIds = JSON.stringify(updates.tableIds);
      if (updates.totalCapacity !== undefined) updateData.totalCapacity = updates.totalCapacity;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const [result] = await this.db
        .update(combinedTables)
        .set(updateData)
        .where(eq(combinedTables.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating combined table:", error);
      throw error;
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
      const [result] = await this.db
        .select()
        .from(combinedTables)
        .where(eq(combinedTables.id, id));
      return result || null;
    } catch (error) {
      console.error("Error fetching combined table by id:", error);
      return null;
    }
  }

  // Table Layouts
  async getTableLayout(restaurantId: number, room: string): Promise<TableLayout | undefined> {
    const result = await this.db.select().from(tableLayouts)
      .where(and(
        eq(tableLayouts.restaurantId, restaurantId),
        eq(tableLayouts.room, room)
      ));
    return result[0];
  }

  async saveTableLayout(restaurantId: number, tenantId: number, room: string, positions: any): Promise<TableLayout> {
    // First try to find existing layout
    const existingLayout = await this.getTableLayout(restaurantId, room);

    if (existingLayout) {
      // Update existing layout
      const [updated] = await this.db.update(tableLayouts)
        .set({ 
          positions, 
          updatedAt: new Date() 
        })
        .where(eq(tableLayouts.id, existingLayout.id))
        .returning();
      return updated;
    } else {
      // Create new layout
      const [newLayout] = await this.db.insert(tableLayouts).values({
        restaurantId,
        tenantId,
        room,
        positions
      }).returning();
      return newLayout;
    }
  }

  // Opening Hours methods
  async getOpeningHoursByRestaurant(restaurantId: number): Promise<any> {
    return await this.db.select().from(openingHours).where(eq(openingHours.restaurantId, restaurantId));
  }

  async createOrUpdateOpeningHours(restaurantId: number, tenantId: number, hoursData: any[]): Promise<any> {
    // Delete existing hours first
    await this.db.delete(openingHours).where(eq(openingHours.restaurantId, restaurantId));

    // Insert new hours
    if (hoursData.length > 0) {
      const insertData = hoursData.map(hours => ({
        ...hours,
        restaurantId,
        tenantId
      }));
      return await this.db.insert(openingHours).values(insertData).returning();
    }
    return [];
  }

  // Special Periods methods
  async getSpecialPeriodsByRestaurant(restaurantId: number): Promise<any> {
    return await this.db.select().from(specialPeriods).where(eq(specialPeriods.restaurantId, restaurantId));
  }

  async createSpecialPeriod(periodData: any): Promise<any> {
    const [newPeriod] = await this.db.insert(specialPeriods).values(periodData).returning();
    return newPeriod;
  }

  async updateSpecialPeriod(id: number, updates: any): Promise<any> {
    const [updated] = await this.db.update(specialPeriods)
      .set(updates)
      .where(eq(specialPeriods.id, id))
      .returning();
    return updated;
  }

  async deleteSpecialPeriod(id: number): Promise<boolean> {
    const result = await this.db.delete(specialPeriods).where(eq(specialPeriods.id, id));
    return result.rowCount > 0;
  }

  // Cut-off Times methods
  async getCutOffTimesByRestaurant(restaurantId: number): Promise<any> {
    return await this.db.select().from(cutOffTimes).where(eq(cutOffTimes.restaurantId, restaurantId));
  }

  async createOrUpdateCutOffTimes(restaurantId: number, tenantId: number, timesData: any[]): Promise<any> {
    // Delete existing cut-off times first
    await this.db.delete(cutOffTimes).where(eq(cutOffTimes.restaurantId, restaurantId));

    // Insert new cut-off times
    if (timesData.length > 0) {
      const insertData = timesData.map((time, index) => ({
        restaurantId,
        tenantId,
        dayOfWeek: index, // 0 = Sunday, 1 = Monday, etc.
        cutOffHours: time.cutOffHours || 0,
        isEnabled: time.cutOffHours > 0
      }));
      return await this.db.insert(cutOffTimes).values(insertData).returning();
    }
    return [];
  }

  // Booking validation methods
  async isRestaurantOpen(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> {
    // Get opening hours for the day of the week
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hours = await this.db.select().from(openingHours)
      .where(and(
        eq(openingHours.restaurantId, restaurantId),
        eq(openingHours.dayOfWeek, dayOfWeek)
      ));

    if (hours.length === 0) {
      return false; // No opening hours set for this day
    }

    const hour = hours[0];
    if (!hour.isOpen) {
      return false; // Restaurant is closed on this day
    }

    // Check if booking time is within opening hours
    const bookingTimeNum = this.timeToMinutes(bookingTime);
    const openTimeNum = this.timeToMinutes(hour.openTime);
    const closeTimeNum = this.timeToMinutes(hour.closeTime);

    return bookingTimeNum >= openTimeNum && bookingTimeNum <= closeTimeNum;
  }

  async isBookingAllowed(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> {
    // First check if restaurant is open
    const isOpen = await this.isRestaurantOpen(restaurantId, bookingDate, bookingTime);
    if (!isOpen) {
      return false;
    }

    // Check cut-off times for the specific day of the week
    const now = new Date();
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const cutOffData = await this.db.select().from(cutOffTimes)
      .where(and(
        eq(cutOffTimes.restaurantId, restaurantId),
        eq(cutOffTimes.dayOfWeek, dayOfWeek)
      ));

    if (cutOffData.length > 0 && cutOffData[0].cutOffHours > 0) {
      const cutOff = cutOffData[0];

      // Create booking datetime by combining date and time
      const [hours, minutes] = bookingTime.split(':').map(Number);
      const bookingDateTime = new Date(bookingDate);
      bookingDateTime.setHours(hours, minutes, 0, 0);

      // Calculate cut-off deadline
      const cutOffMilliseconds = cutOff.cutOffHours * 60 * 60 * 1000; // Convert hours to milliseconds
      const cutOffDeadline = new Date(bookingDateTime.getTime() - cutOffMilliseconds);

      // Check if current time is past the cut-off deadline
      if (now > cutOffDeadline) {
        return false; // Booking is within cut-off time
      }
    }

    return true;
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Booking Change Request methods
  async getBookingChangeRequestsByBookingId(bookingId: number): Promise<any[]> {
    return await this.db.select().from(bookingChangeRequests).where(eq(bookingChangeRequests.bookingId, bookingId)).orderBy(desc(bookingChangeRequests.createdAt));
  }

  async getBookingChangeRequestsByRestaurant(restaurantId: number): Promise<any[]> {
    return await this.db.select().from(bookingChangeRequests).where(eq(bookingChangeRequests.restaurantId, restaurantId)).orderBy(desc(bookingChangeRequests.createdAt));
  }

  async createBookingChangeRequest(request: any): Promise<any> {
    const [newRequest] = await this.db.insert(bookingChangeRequests).values(request).returning();
    return newRequest;
  }

  async updateBookingChangeRequest(id: number, updates: any): Promise<any> {
    const [updatedRequest] = await this.db.update(bookingChangeRequests).set(updates).where(eq(bookingChangeRequests.id, id)).returning();
    return updatedRequest;
  }

  async getBookingChangeRequestById(id: number): Promise<any> {
    const [request] = await this.db.select().from(bookingChangeRequests).where(eq(bookingChangeRequests.id, id));
    return request;
  }


  // Notifications
  async getNotificationsByRestaurant(restaurantId: number): Promise<any[]> {
    return await this.db.select().from(notifications)
      .where(eq(notifications.restaurantId, restaurantId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: any): Promise<any> {
    const [newNotification] = await this.db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<any> {
    const [updated] = await this.db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(restaurantId: number): Promise<void> {
    await this.db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.restaurantId, restaurantId), eq(notifications.isRead, false)));
  }

  async revertNotification(notificationId: number, userEmail: string): Promise<boolean> {
    const notification = await this.db.select().from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
    
    if (!notification[0] || !notification[0].canRevert || notification[0].isReverted) {
      return false;
    }

    const notif = notification[0];
    
    // Revert the booking change if original data exists
    if (notif.bookingId && notif.originalData) {
      const originalData = notif.originalData as any;
      await this.db.update(bookings)
        .set(originalData)
        .where(eq(bookings.id, notif.bookingId));
    }

    // Mark notification as reverted
    await this.db.update(notifications)
      .set({ 
        isReverted: true, 
        revertedBy: userEmail, 
        revertedAt: new Date() 
      })
      .where(eq(notifications.id, notificationId));

    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      const result = await this.db.delete(notifications)
        .where(eq(notifications.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Integration Configuration methods
  async getIntegrationConfigurationsByRestaurant(restaurantId: number): Promise<IntegrationConfiguration[]> {
    return await this.db.select().from(integrationConfigurations).where(eq(integrationConfigurations.restaurantId, restaurantId));
  }

  async getIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<IntegrationConfiguration | undefined> {
    const [config] = await this.db.select().from(integrationConfigurations)
      .where(and(
        eq(integrationConfigurations.restaurantId, restaurantId),
        eq(integrationConfigurations.integrationId, integrationId)
      ));
    return config;
  }

  async createOrUpdateIntegrationConfiguration(
    restaurantId: number, 
    tenantId: number, 
    integrationId: string, 
    isEnabled: boolean, 
    configuration: any = {}
  ): Promise<IntegrationConfiguration> {
    const existing = await this.getIntegrationConfiguration(restaurantId, integrationId);

    if (existing) {
      const [updated] = await this.db.update(integrationConfigurations)
        .set({
          isEnabled,
          configuration,
          updatedAt: new Date()
        })
        .where(eq(integrationConfigurations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db.insert(integrationConfigurations)
        .values({
          restaurantId,
          tenantId,
          integrationId,
          isEnabled,
          configuration
        })
        .returning();
      return created;
    }
  }

  async deleteIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<boolean> {
    const result = await this.db.delete(integrationConfigurations)
      .where(and(
        eq(integrationConfigurations.restaurantId, restaurantId),
        eq(integrationConfigurations.integrationId, integrationId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Webhooks
  async getWebhooksByRestaurant(restaurantId: number) {
    return this.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.restaurantId, restaurantId));
  }

  async saveWebhooks(restaurantId: number, tenantId: number, webhooksData: any[]) {
    // First, delete existing webhooks for this restaurant
    await this.db
      .delete(webhooks)
      .where(eq(webhooks.restaurantId, restaurantId));

    // Then insert new webhooks
    if (webhooksData.length > 0) {
      const insertData = webhooksData.map(webhook => ({
        restaurantId,
        tenantId,
        event: webhook.event,
        url: webhook.url,
        isActive: true
      }));

      return this.db
        .insert(webhooks)
        .values(insertData)
        .returning();
    }

    return [];
  }

  // Rescheduling Suggestions methods
  async getReschedulingSuggestionsByRestaurant(restaurantId: number): Promise<any[]> {
    return await this.db.select().from(reschedulingSuggestions)
      .where(eq(reschedulingSuggestions.restaurantId, restaurantId))
      .orderBy(desc(reschedulingSuggestions.priority), desc(reschedulingSuggestions.createdAt));
  }

  async getReschedulingSuggestionsByBooking(bookingId: number): Promise<any[]> {
    return await this.db.select().from(reschedulingSuggestions)
      .where(eq(reschedulingSuggestions.originalBookingId, bookingId))
      .orderBy(desc(reschedulingSuggestions.priority), desc(reschedulingSuggestions.createdAt));
  }

  async createReschedulingSuggestion(suggestion: any): Promise<any> {
    // Set expiration time to 24 hours from now if not provided
    if (!suggestion.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      suggestion.expiresAt = expiresAt;
    }

    const [newSuggestion] = await this.db.insert(reschedulingSuggestions).values(suggestion).returning();
    return newSuggestion;
  }

  async updateReschedulingSuggestion(id: number, updates: any): Promise<any> {
    const [updatedSuggestion] = await this.db.update(reschedulingSuggestions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reschedulingSuggestions.id, id))
      .returning();
    return updatedSuggestion;
  }

  async getReschedulingSuggestionById(id: number): Promise<any> {
    const [suggestion] = await this.db.select().from(reschedulingSuggestions)
      .where(eq(reschedulingSuggestions.id, id));
    return suggestion;
  }

  async deleteReschedulingSuggestion(id: number): Promise<boolean> {
    try {
      await this.db.delete(reschedulingSuggestions)
        .where(eq(reschedulingSuggestions.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting rescheduling suggestion:', error);
      return false;
    }
  }

  async deleteExpiredReschedulingSuggestions(): Promise<void> {
    const now = new Date();
    await this.db.delete(reschedulingSuggestions)
      .where(lt(reschedulingSuggestions.expiresAt, now));
  }

}