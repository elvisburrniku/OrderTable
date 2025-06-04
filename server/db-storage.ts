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
  cutOffTimes 
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import type { IStorage } from "./storage";

// Use Supabase database URL if available, otherwise use the existing DATABASE_URL
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("No database connection string found. Please set SUPABASE_DATABASE_URL or DATABASE_URL environment variable.");
}

let db: ReturnType<typeof drizzle>;

if (process.env.SUPABASE_DATABASE_URL) {
  // Use postgres-js for Supabase connection
  const client = postgres(databaseUrl);
  db = drizzlePostgres(client, { schema });
} else {
  // Use neon for existing setup
  const sql = neon(databaseUrl);
  db = drizzle(sql, { schema });
}

export class DatabaseStorage implements IStorage {
  db: ReturnType<typeof drizzle>;

  constructor() {
    this.db = db;
  }

  // Initialize default data
  async initialize() {
    await this.initializeSubscriptionPlans();
    await this.initializeDemoData();
  }

  private async initializeSubscriptionPlans() {
    const existingPlans = await this.db.select().from(subscriptionPlans);

    if (existingPlans.length === 0) {
      const plans = [
        {
          name: "Starter",
          price: 2900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "Basic booking management",
            "Email notifications",
            "Customer database",
            "Table management",
            "Booking calendar"
          ]),
          maxTables: 10,
          maxBookingsPerMonth: 100,
          isActive: true
        },
        {
          name: "Professional",
          price: 4900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "Advanced booking management",
            "SMS notifications",
            "Custom fields",
            "Feedback system",
            "Analytics",
            "Waiting list management",
            "Payment setups"
          ]),
          maxTables: 25,
          maxBookingsPerMonth: 500,
          isActive: true
        },
        {
          name: "Enterprise",
          price: 9900,
          interval: "monthly" as const,
          features: JSON.stringify([
            "All Professional features",
            "Payment processing",
            "API access",
            "Custom integrations",
            "Priority support",
            "Advanced analytics",
            "Multi-location support"
          ]),
          maxTables: 100,
          maxBookingsPerMonth: 2000,
          isActive: true
        }
      ];

      await this.db.insert(subscriptionPlans).values(plans);
      console.log("Initialized subscription plans in database");
    }
  }

  private async initializeDemoData() {
    const existingUsers = await this.db.select().from(users);

    if (existingUsers.length === 0) {
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
        description: "A modern restaurant with exceptional dining experience"
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
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
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
    const [newRestaurant] = await this.db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: number, updates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    // Remove any undefined updatedAt to avoid column errors
    const cleanUpdates = { ...updates };
    delete cleanUpdates.updatedAt;
    
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
    const [newBooking] = await this.db.insert(bookings).values(booking).returning();
    return newBooking;
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
        ...time,
        restaurantId,
        tenantId,
        dayOfWeek: index // 0 = Sunday, 1 = Monday, etc.
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

    // Check cut-off times
    const now = new Date();
    const cutOffData = await this.db.select().from(cutOffTimes)
      .where(eq(cutOffTimes.restaurantId, restaurantId));

    if (cutOffData.length > 0) {
      const cutOff = cutOffData[0];
      const cutOffMinutes = cutOff.cutOffHours * 60 + cutOff.cutOffMinutes;
      const timeDiffMinutes = (bookingDate.getTime() - now.getTime()) / (1000 * 60);

      if (timeDiffMinutes < cutOffMinutes) {
        return false; // Booking is within cut-off time
      }
    }

    return true;
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}