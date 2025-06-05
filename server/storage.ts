// Adds Supabase database connection option using environment variables and conditional drizzle setup.
import { 
  users, 
  restaurants, 
  bookings, 
  customers, 
  rooms, 
  tables, 
  activityLogs, 
  smsMessages, 
  waitingList, 
  feedback, 
  timeSlots, 
  tableLayouts,
  tenants,
  tenantUsers,
  subscriptionPlans,
  userSubscriptions,
  openingHours,
  specialPeriods,
  cutOffTimes
} from "@shared/schema";
import type { User, InsertUser, Restaurant, InsertRestaurant, Table, InsertTable, Booking, InsertBooking, Customer, InsertCustomer, SmsMessage, InsertSmsMessage, WaitingList, InsertWaitingList, Feedback, InsertFeedback, ActivityLog, InsertActivityLog, TimeSlots, InsertTimeSlots, Room, InsertRoom, OpeningHours, InsertOpeningHours, SpecialPeriod, InsertSpecialPeriod, CutOffTime, InsertCutOffTime, TableLayout, InsertTableLayout, CombinedTable, InsertCombinedTable } from "@shared/schema";
import type {
  User,
  Restaurant,
  Table,
  Booking,
  Customer,
  WaitingList,
  Feedback,
  SmsMessage,
  ActivityLog,
  SubscriptionPlan,
  UserSubscription,
  TimeSlots,
  Room,
  TableLayout,
  InsertUser,
  InsertRestaurant,
  InsertTable,
  InsertBooking,
  InsertCustomer,
  InsertWaitingList,
  InsertFeedback,
  InsertSmsMessage,
  InsertActivityLog,
  InsertSubscriptionPlan,
  InsertUserSubscription,
  InsertTimeSlots,
  InsertRoom,
  InsertTableLayout
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

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

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tenants
  createTenant(tenant: any): Promise<any>;
  getTenantByUserId(userId: number): Promise<any>;
  createTenantUser(tenantUser: any): Promise<any>;

  // Restaurants
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByUserId(userId: number): Promise<Restaurant | undefined>;
  getRestaurantById(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, restaurant: Partial<Restaurant>): Promise<Restaurant | undefined>;

  // Tables
  getTablesByRestaurant(restaurantId: number): Promise<Table[]>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, table: Partial<Table>): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Bookings
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;

  // Customers
  getCustomersByRestaurant(restaurantId: number): Promise<Customer[]>;
  getCustomerByEmail(restaurantId: number, email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: { name: string; email: string; phone?: string }): Promise<Customer>;

  // SMS Messages
  getSmsMessagesByRestaurant(restaurantId: number): Promise<SmsMessage[]>;
  createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage>;

  // Waiting List
  getWaitingListByRestaurant(restaurantId: number): Promise<WaitingList[]>;
  createWaitingListEntry(entry: InsertWaitingList): Promise<WaitingList>;
  updateWaitingListEntry(id: number, entry: Partial<WaitingList>): Promise<WaitingList | undefined>;

  // Feedback
  getFeedbackByRestaurant(restaurantId: number): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;

  // Activity Log
  getActivityLogByRestaurant(restaurantId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Time Slots
  getTimeSlotsByRestaurant(restaurantId: number, date?: string): Promise<TimeSlots[]>;
  createTimeSlot(slot: InsertTimeSlots): Promise<TimeSlots>;
  updateTimeSlot(id: number, updates: Partial<TimeSlots>): Promise<TimeSlots | undefined>;
  getTimeSlotById(id: number): Promise<TimeSlots | undefined>;

  // Rooms
  getRoomsByRestaurant(restaurantId: number): Promise<Room[]>;
  getRoomById(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;

  // Table Layouts
  getTableLayout(restaurantId: number, room: string): Promise<TableLayout | undefined>;
  saveTableLayout(restaurantId: number, tenantId: number, room: string, positions: any): Promise<TableLayout>;

    // Subscription Plans
    getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
    getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
    createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;

    // User Subscriptions
    getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
    getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined>;
    getAllUserSubscriptions(): Promise<UserSubscription[]>;
    createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
    updateUserSubscription(id: number, subscription: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
    getUserSubscriptionById(id: number): Promise<UserSubscription | undefined>;

     // Opening Hours methods
     getOpeningHoursByRestaurant(restaurantId: number): Promise<any>;
     createOrUpdateOpeningHours(restaurantId: number, tenantId: number, hoursData: any[]): Promise<any>;

     // Special Periods methods
     getSpecialPeriodsByRestaurant(restaurantId: number): Promise<any>;
     createSpecialPeriod(periodData: any): Promise<any>;
     updateSpecialPeriod(id: number, updates: any): Promise<any>;
     deleteSpecialPeriod(id: number): Promise<boolean>;

     // Cut-off Times methods
     getCutOffTimesByRestaurant(restaurantId: number): Promise<any>;
     createOrUpdateCutOffTimes(restaurantId: number, tenantId: number, timesData: any[]): Promise<any>;

     // Booking validation methods
     isRestaurantOpen(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean>;
     isBookingAllowed(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean>;

  // Combined Tables
  getCombinedTablesByRestaurant(restaurantId: number): Promise<CombinedTable[]>;
  getCombinedTableById(id: number): Promise<CombinedTable | undefined>;
  createCombinedTable(insertCombinedTable: InsertCombinedTable): Promise<CombinedTable>;
  updateCombinedTable(id: number, updates: Partial<CombinedTable>): Promise<CombinedTable | undefined>;
  deleteCombinedTable(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private restaurants: Map<number, Restaurant>;
  private tables: Map<number, Table>;
  private bookings: Map<number, Booking>;
  private customers: Map<number, Customer>;
  private smsMessages: Map<number, SmsMessage>;
  private waitingList: Map<number, WaitingList>;
  private feedback: Map<number, Feedback>;
  private activityLog: Map<number, ActivityLog>;
  private timeSlots: Map<number, TimeSlots>;
  private subscriptionPlans: Map<number, SubscriptionPlan>;
  private userSubscriptions: Map<number, UserSubscription>;
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentTableId: number;
  private currentBookingId: number;
  private currentCustomerId: number;
  private currentSmsMessageId: number;
  private currentWaitingListId: number;
  private currentFeedbackId: number;
  private currentActivityLogId: number;
  private currentTimeSlotsId: number;
  private currentSubscriptionPlanId: number;
  private currentUserSubscriptionId: number;
  private combinedTables = new Map<number, CombinedTable>();
  private currentCombinedTableId = 1;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.tables = new Map();
    this.bookings = new Map();
    this.customers = new Map();
    this.smsMessages = new Map();
    this.waitingList = new Map();
    this.feedback = new Map();
    this.activityLog = new Map();
    this.timeSlots = new Map();
    this.subscriptionPlans = new Map();
    this.userSubscriptions = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentTableId = 1;
    this.currentBookingId = 1;
    this.currentCustomerId = 1;
    this.currentSmsMessageId = 1;
    this.currentWaitingListId = 1;
    this.currentFeedbackId = 1;
    this.currentActivityLogId = 1;
    this.currentTimeSlotsId = 1;
    this.currentSubscriptionPlanId = 1;
    this.currentUserSubscriptionId = 1;

    this.seedData();
  }

  private initializeSubscriptionPlans() {
    const plans = [
      {
        name: "Starter",
        price: 2900, // $29.00
        interval: "month",
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
        price: 4900, // $49.00
        interval: "month",
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
        price: 9900, // $99.00
        interval: "month",
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

    plans.forEach(planData => {
      const plan: SubscriptionPlan = {
        ...planData,
        id: this.currentSubscriptionPlanId++,
        createdAt: new Date()
      };
      this.subscriptionPlans.set(plan.id, plan);
    });

    console.log(`Initialized ${plans.length} subscription plans`);
  }

  private seedData() {
    // Create demo user
    const user: User = {
      id: this.currentUserId++,
      email: "demo@restaurant.com",
      password: "password123",
      name: "Demo Restaurant Owner",
      restaurantName: "The Demo Restaurant",
      createdAt: new Date()
    };
    this.users.set(user.id, user);

    // Create demo restaurant
    const restaurant: Restaurant = {
      id: this.currentRestaurantId++,
      name: "The Demo Restaurant",
      userId: user.id,
      tenantId: 1, // Default tenant
      address: "123 Main Street, Copenhagen, Denmark",
      phone: "+45 12 34 56 78",
      email: "info@demorestaurant.com",
      description: "A modern restaurant with exceptional dining experience",
      createdAt: new Date()
    };
    this.restaurants.set(restaurant.id, restaurant);

    // Create demo tables
    for (let i = 1; i <= 12; i++) {
      const table: Table = {
        id: this.currentTableId++,
        restaurantId: restaurant.id,
        tableNumber: i.toString(),
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
        isActive: true
      };
      this.tables.set(table.id, table);
    }

    // Create demo customers
    const demoCustomers = [
      { name: "John Smith", email: "john@example.com", phone: "+45 11 22 33 44" },
      { name: "Sarah Johnson", email: "sarah@example.com", phone: "+45 22 33 44 55" },
      { name: "Michael Brown", email: "michael@example.com", phone: "+45 33 44 55 66" }
    ];

    demoCustomers.forEach(customerData => {
      const customer: Customer = {
        id: this.currentCustomerId++,
        restaurantId: restaurant.id,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        totalBookings: 3,
        lastVisit: new Date(),
        createdAt: new Date()
      };
      this.customers.set(customer.id, customer);
    });

    // Initialize subscription plans
    this.initializeSubscriptionPlans();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      restaurantName: insertUser.restaurantName || null,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async getRestaurantByUserId(userId: number): Promise<Restaurant | undefined> {
    return Array.from(this.restaurants.values()).find(restaurant => restaurant.userId === userId);
  }

  async getRestaurantById(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const restaurant: Restaurant = {
      ...insertRestaurant,
      id: this.currentRestaurantId++,
      tenantId: insertRestaurant.tenantId || 1, // Default to tenant 1 if not specified
      address: insertRestaurant.address || null,
      phone: insertRestaurant.phone || null,
      email: insertRestaurant.email || null,
      description: insertRestaurant.description || null,
      createdAt: new Date()
    };
    this.restaurants.set(restaurant.id, restaurant);
    return restaurant;
  }

  async updateRestaurant(id: number, updates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    const restaurant = this.restaurants.get(id);
    if (!restaurant) return undefined;

    const updatedRestaurant = { ...restaurant, ...updates };
    this.restaurants.set(id, updatedRestaurant);
    return updatedRestaurant;
  }

  async getTablesByRestaurant(restaurantId: number): Promise<Table[]> {
    return Array.from(this.tables.values()).filter(table => table.restaurantId === restaurantId);
  }

  async createTable(insertTable: InsertTable): Promise<Table> {
    const table: Table = {
      ...insertTable,
      id: this.currentTableId++,
      isActive: insertTable.isActive ?? true
    };
    this.tables.set(table.id, table);
    return table;
  }

  async updateTable(id: number, updates: Partial<Table>): Promise<Table | undefined> {
    const table = this.tables.get(id);
    if (!table) return undefined;

    const updatedTable = { ...table, ...updates };
    this.tables.set(id, updatedTable);
    return updatedTable;
  }

  async deleteTable(id: number): Promise<boolean> {
    return this.tables.delete(id);
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.restaurantId === restaurantId);
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => 
      booking.restaurantId === restaurantId && 
      booking.bookingDate.toISOString().split('T')[0] === date
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const booking: Booking = {
      ...insertBooking,
      id: this.currentBookingId++,
      tableId: insertBooking.tableId || null,
      customerPhone: insertBooking.customerPhone || null,
      endTime: insertBooking.endTime || null,
      status: insertBooking.status || "confirmed",
      notes: insertBooking.notes || null,
      createdAt: new Date()
    };
    this.bookings.set(booking.id, booking);
    return booking;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    const updatedBooking = { ...booking, ...updates };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }

  async getCustomersByRestaurant(restaurantId: number): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(customer => customer.restaurantId === restaurantId);
  }

  async getCustomerByEmail(restaurantId: number, email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => 
      customer.restaurantId === restaurantId && customer.email === email
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customer: Customer = {
      ...insertCustomer,
      id: this.currentCustomerId++,
      phone: insertCustomer.phone || null,
      totalBookings: 0,
      lastVisit: null,
      createdAt: new Date()
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
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
    return Array.from(this.smsMessages.values()).filter(msg => msg.restaurantId === restaurantId);
  }

  async createSmsMessage(insertSmsMessage: InsertSmsMessage): Promise<SmsMessage> {
    const smsMessage: SmsMessage = {
      id: this.currentSmsMessageId++,
      ...insertSmsMessage,
      createdAt: new Date()
    };
    this.smsMessages.set(smsMessage.id, smsMessage);
    return smsMessage;
  }

  // Waiting List
  async getWaitingListByRestaurant(restaurantId: number): Promise<WaitingList[]> {
    return Array.from(this.waitingList.values()).filter(entry => entry.restaurantId === restaurantId);
  }

  async createWaitingListEntry(insertWaitingList: InsertWaitingList): Promise<WaitingList> {
    const waitingListEntry: WaitingList = {
      id: this.currentWaitingListId++,
      ...insertWaitingList,
      createdAt: new Date()
    };
    this.waitingList.set(waitingListEntry.id, waitingListEntry);
    return waitingListEntry;
  }

  async updateWaitingListEntry(id: number, updates: Partial<WaitingList>): Promise<WaitingList | undefined> {
    const entry = this.waitingList.get(id);
    if (!entry) return undefined;

    const updatedEntry = { ...entry, ...updates };
    this.waitingList.set(id, updatedEntry);
    return updatedEntry;
  }

  async getWaitingListEntryById(id: number): Promise<WaitingList | undefined> {
    return this.waitingList.get(id);
  }

  // Feedback
  async getFeedbackByRestaurant(restaurantId: number): Promise<Feedback[]> {
    return Array.from(this.feedback.values()).filter(feedback => feedback.restaurantId === restaurantId);
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const feedback: Feedback = {
      id: this.currentFeedbackId++,
      ...insertFeedback,
      createdAt: new Date()
    };
    this.feedback.set(feedback.id, feedback);
    return feedback;
  }

  // Activity Log
  async getActivityLogByRestaurant(restaurantId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLog.values()).filter(log => log.restaurantId === restaurantId);
  }

  async createActivityLog(insertActivityLog: InsertActivityLog): Promise<ActivityLog> {
    const activityLog: ActivityLog = {
      id: this.currentActivityLogId++,
      ...insertActivityLog,
      createdAt: new Date()
    };
    this.activityLog.set(activityLog.id, activityLog);
    return activityLog;
  }

  // Time Slots
  async getTimeSlotsByRestaurant(restaurantId: number, date?: string): Promise<TimeSlots[]> {
    const slots = Array.from(this.timeSlots.values()).filter(slot => slot.restaurantId === restaurantId);
    if (date) {
      return slots.filter(slot => slot.date === date);
    }
    return slots;
  }

  async createTimeSlot(insertTimeSlots: InsertTimeSlots): Promise<TimeSlots> {
    const timeSlot: TimeSlots = {
      id: this.currentTimeSlotsId++,
      ...insertTimeSlots
    };
    this.timeSlots.set(timeSlot.id, timeSlot);
    return timeSlot;
  }

  async updateTimeSlot(id: number, updates: Partial<TimeSlots>): Promise<TimeSlots | undefined> {
    const timeSlot = this.timeSlots.get(id);
    if (!timeSlot) return undefined;

    const updatedTimeSlot = { ...timeSlot, ...updates };
    this.timeSlots.set(id, updatedTimeSlot);
    return updatedTimeSlot;
  }

    // Subscription Plans
    async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
      const plans = Array.from(this.subscriptionPlans.values());
      console.log("Storage getSubscriptionPlans called, returning:", plans.length, "plans");
      console.log("Plans data:", plans.map(p => ({ id: p.id, name: p.name, price: p.price })));
      return plans;
    }

    async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
      return this.subscriptionPlans.get(id);
    }

    async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    // Check if plan with same name exists and update it
    const existingPlan = Array.from(this.subscriptionPlans.values()).find(p => p.name === plan.name);
    if (existingPlan) {
      const updatedPlan: SubscriptionPlan = {
        ...existingPlan,
        ...plan,
        id: existingPlan.id,
        createdAt: existingPlan.createdAt
      };
      this.subscriptionPlans.set(existingPlan.id, updatedPlan);
      return updatedPlan;
    }

    const newPlan: SubscriptionPlan = {
      ...plan,
      id: this.currentSubscriptionPlanId++,
      createdAt: new Date()
    };
    this.subscriptionPlans.set(newPlan.id, newPlan);
    return newPlan;
  }

    // User Subscriptions
    async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
      return Array.from(this.userSubscriptions.values()).find(subscription => subscription.userId === userId);
    }

    async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
      return Array.from(this.userSubscriptions.values()).find(subscription => subscription.stripeSubscriptionId === stripeSubscriptionId);
    }

    async getAllUserSubscriptions(): Promise<UserSubscription[]> {
      return Array.from(this.userSubscriptions.values());
    }

    async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
      const newSubscription: UserSubscription = {
        ...subscription,
        id: this.currentUserSubscriptionId++,
        createdAt: new Date(),
        updatedAt: null
      };
      this.userSubscriptions.set(newSubscription.id, newSubscription);
      return newSubscription;
    }

    async updateUserSubscription(id: number, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
      const subscription = this.userSubscriptions.get(id);
      if (!subscription) return undefined;

      const updatedSubscription = { ...subscription, ...updates, updatedAt: new Date() };
      this.userSubscriptions.set(id, updatedSubscription);
      return updatedSubscription;
    }

    async getUserSubscriptionById(id: number): Promise<UserSubscription | undefined> {
      return this.userSubscriptions.get(id);
    }

    // Table Layouts
    async getTableLayout(restaurantId: number, room: string): Promise<TableLayout | undefined> {
      // For memory storage, we'll just return empty layout
      return undefined;
    }

    async saveTableLayout(restaurantId: number, tenantId: number, room: string, positions: any): Promise<TableLayout> {
      // For memory storage, just return a mock layout
      return {
        id: 1,
        restaurantId,
        tenantId,
        room,
        positions,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Opening Hours methods
    async getOpeningHoursByRestaurant(restaurantId: number): Promise<any> {
      return [];
    }
    async createOrUpdateOpeningHours(restaurantId: number, tenantId: number, hoursData: any[]): Promise<any> {
        return [];
    }

    // Special Periods methods
    async getSpecialPeriodsByRestaurant(restaurantId: number): Promise<any> {
        return [];
    }
    async createSpecialPeriod(periodData: any): Promise<any> {
        return {};
    }
    async updateSpecialPeriod(id: number, updates: any): Promise<any> {
        return {};
    }
    async deleteSpecialPeriod(id: number): Promise<boolean> {
        return true;
    }

    // Cut-off Times methods
    async getCutOffTimesByRestaurant(restaurantId: number): Promise<any>  {
        return [];
    }
    async createOrUpdateCutOffTimes(restaurantId: number, tenantId: number, timesData: any[]): Promise<any> {
        return [];
    }

    // Booking validation methods
    async isRestaurantOpen(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> {
        return true;
    }
    async isBookingAllowed(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> {
        return true;
    }

  // Combined Tables
  async getCombinedTablesByRestaurant(restaurantId: number): Promise<CombinedTable[]> {
    return Array.from(this.combinedTables.values()).filter(ct => ct.restaurantId === restaurantId);
  }

  async getCombinedTableById(id: number): Promise<CombinedTable | undefined> {
    return this.combinedTables.get(id);
  }

  async createCombinedTable(insertCombinedTable: InsertCombinedTable): Promise<CombinedTable> {
    const combinedTable: CombinedTable = {
      ...insertCombinedTable,
      id: this.currentCombinedTableId++,
      isActive: insertCombinedTable.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.combinedTables.set(combinedTable.id, combinedTable);
    return combinedTable;
  }

  async updateCombinedTable(id: number, updates: Partial<CombinedTable>): Promise<CombinedTable | undefined> {
    const combinedTable = this.combinedTables.get(id);
    if (!combinedTable) return undefined;

    const updatedCombinedTable = { ...combinedTable, ...updates, updatedAt: new Date() };
    this.combinedTables.set(id, updatedCombinedTable);
    return updatedCombinedTable;
  }

  async deleteCombinedTable(id: number): Promise<boolean> {
    return this.combinedTables.delete(id);
  }
}

import { DatabaseStorage } from "./db-storage";

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();

// Initialize database with default data
storage.initialize().catch(console.error);