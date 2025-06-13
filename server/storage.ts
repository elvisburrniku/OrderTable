// Adds Supabase database connection option using environment variables and conditional drizzle setup.
import { 
  users, 
  restaurants, 
  bookings, 
  customers, 
  rooms, 
  tables, 
  activityLog, 
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
  cutOffTimes,
  bookingChangeRequests,
  notifications
} from "@shared/schema";
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
  CombinedTable,
  Notification,
  InsertUser,
  InsertRestaurant,
  InsertTable,
  InsertBooking,
  InsertCustomer,
  InsertWaitingList,
  InsertFeedback,
  InsertSmsMessage,
  InsertActivityLog,
  InsertTimeSlots,
  InsertSubscriptionPlan,
  InsertUserSubscription,
  InsertRoom,
  InsertCombinedTable,
  InsertNotification
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Use Supabase database URL if available, otherwise use the existing DATABASE_URL
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("No database connection string found. Database operations will be disabled until proper connection is configured.");
}

let db: any;

if (!databaseUrl) {
  db = null;
} else if (process.env.SUPABASE_DATABASE_URL && databaseUrl) {
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

export interface IStorage {
  initialize(): Promise<void>;
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySSOId(ssoProvider: string, ssoId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUserAccount(userId: number): Promise<void>;

  // Tenants
  createTenant(tenant: any): Promise<any>;
  getTenantById(id: number): Promise<any>;
  getTenantByUserId(userId: number): Promise<any>;
  getTenantByStripeCustomerId(stripeCustomerId: string): Promise<any>;
  getAllTenants(): Promise<any[]>;
  updateTenant(id: number, updates: any): Promise<any>;
  createTenantUser(tenantUser: any): Promise<any>;

  // Restaurants
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByUserId(userId: number): Promise<Restaurant | undefined>;
  getRestaurantById(id: number): Promise<Restaurant | undefined>;
  getRestaurantsByTenantId(tenantId: number): Promise<Restaurant[]>;
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
  getBookingById(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  getBookingCountForTenantThisMonth(tenantId: number): Promise<number>;

  // Customers
  getCustomersByRestaurant(restaurantId: number): Promise<Customer[]>;
  getCustomerByEmail(restaurantId: number, email: string): Promise<Customer | undefined>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined>;
  getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: { name: string; email: string; phone?: string }): Promise<Customer>;
  createWalkInCustomer(restaurantId: number, tenantId: number, customerData?: { name?: string; phone?: string; notes?: string }): Promise<Customer>;

  // SMS Messages
  getSmsMessagesByRestaurant(restaurantId: number): Promise<SmsMessage[]>;
  createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage>;

  // Waiting List
  getWaitingListByRestaurant(restaurantId: number): Promise<WaitingList[]>;
  createWaitingListEntry(entry: InsertWaitingList): Promise<WaitingList>;
  updateWaitingListEntry(id: number, updates: Partial<WaitingList>): Promise<WaitingList | undefined>;

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

  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined>;
  getFreePlan(): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;

  // User Subscriptions
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined>;
  getAllUserSubscriptions(): Promise<UserSubscription[]>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  getUserSubscriptionById(id: number): Promise<UserSubscription | undefined>;

  // Additional required methods
  getTableById(id: number): Promise<Table | undefined>;
  getWaitingListEntryById(id: number): Promise<WaitingList | undefined>;
  getTimeSlotById(id: number): Promise<TimeSlots | undefined>;

  // Rooms
  getRoomsByRestaurant(restaurantId: number): Promise<Room[]>;
  getRoomById(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;

  // Combined Tables
  getCombinedTablesByRestaurant(restaurantId: number): Promise<CombinedTable[]>;
  getCombinedTableById(id: number): Promise<CombinedTable | undefined>;
  createCombinedTable(insertCombinedTable: InsertCombinedTable): Promise<CombinedTable>;
  updateCombinedTable(id: number, updates: Partial<CombinedTable>): Promise<CombinedTable | undefined>;
  deleteCombinedTable(id: number): Promise<boolean>;

  // Table Layout
  getTableLayout(restaurantId: number, room: string): Promise<TableLayout | undefined>;
  saveTableLayout(restaurantId: number, tenantId: number, room: string, positions: any): Promise<TableLayout>;

  // Opening Hours
  getOpeningHours(tenantId: number, restaurantId: number): Promise<any[]>;
  getOpeningHoursByRestaurant(restaurantId: number): Promise<any[]>;
  createOpeningHour(hourData: any): Promise<any>;
  clearOpeningHours(tenantId: number, restaurantId: number): Promise<void>;

  // Special Periods
  getSpecialPeriodsByRestaurant(restaurantId: number): Promise<any>;
  createSpecialPeriod(periodData: any): Promise<any>;
  updateSpecialPeriod(id: number, updates: any): Promise<any>;
  deleteSpecialPeriod(id: number): Promise<boolean>;

  // Cut Off Times
  getCutOffTimesByRestaurant(restaurantId: number): Promise<any>;
  createOrUpdateCutOffTimes(restaurantId: number, tenantId: number, timesData: any[]): Promise<any>;

  // Business Rules
  isRestaurantOpen(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean>;
  isBookingAllowed(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean>;

  // Booking Change Requests
  getBookingChangeRequestsByBookingId(bookingId: number): Promise<any[]>;
  getBookingChangeRequestsByRestaurant(restaurantId: number): Promise<any[]>;
  createBookingChangeRequest(request: any): Promise<any>;
  updateBookingChangeRequest(id: number, updates: any): Promise<any>;
  getBookingChangeRequestById(id: number): Promise<any>;

  // Notifications
  getNotificationsByRestaurant(restaurantId: number): Promise<any[]>;
  createNotification(notification: any): Promise<any>;
  markNotificationAsRead(id: number): Promise<any>;
  markAllNotificationsAsRead(restaurantId: number): Promise<void>;
  revertNotification(notificationId: number, userEmail: string): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // Webhooks
  getWebhooksByRestaurant(restaurantId: number): Promise<any[]>;
  saveWebhooks(restaurantId: number, tenantId: number, webhooks: any[]): Promise<any[]>;

  // Integration Configurations
  getIntegrationConfigurationsByRestaurant(restaurantId: number): Promise<any[]>;
  getIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<any>;
  getIntegrationByRestaurantAndType(restaurantId: number, integrationType: string): Promise<any>;
  createOrUpdateIntegrationConfiguration(restaurantId: number, tenantId: number, integrationId: string, isEnabled: boolean, configuration?: any): Promise<any>;
  deleteIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<boolean>;

  // Rescheduling Suggestions
  getReschedulingSuggestionsByRestaurant(restaurantId: number): Promise<any[]>;
  getReschedulingSuggestionsByBooking(bookingId: number): Promise<any[]>;
  createReschedulingSuggestion(suggestion: any): Promise<any>;
  updateReschedulingSuggestion(id: number, updates: any): Promise<any>;
  getReschedulingSuggestionById(id: number): Promise<any>;
  deleteReschedulingSuggestion(id: number): Promise<boolean>;
  deleteExpiredReschedulingSuggestions(): Promise<void>;

  // Auto-assignment methods
  getUnassignedBookings(): Promise<Booking[]>;
  getBookingsByDateAndRestaurant(date: string, restaurantId: number): Promise<Booking[]>;
}

import { DatabaseStorage } from "./db-storage";
import { MemoryStorage } from "./mem-storage";

// Use database storage if available, otherwise use memory storage
let storage: IStorage;

if (!databaseUrl) {
  console.log("No database configured, using in-memory storage for development");
  storage = new MemoryStorage();
} else {
  console.log("Database configured, using database storage");
  storage = new DatabaseStorage();
}

// Initialize storage with default data
storage.initialize().catch(console.error);

export { storage };