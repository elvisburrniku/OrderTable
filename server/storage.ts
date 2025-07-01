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
  notifications,
  resolvedConflicts,
} from "../shared/schema";
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
  ResolvedConflict,
  InsertResolvedConflict,
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
  InsertNotification,
  ProductGroup,
  InsertProductGroup,
  Product,
  InsertProduct,
  FloorPlan,
  InsertFloorPlan,
  FloorPlanTemplate,
  InsertFloorPlanTemplate,
} from "../shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Import the database connection from db.ts
import { db } from "./db";

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
  getTenant(id: number): Promise<any>;
  getTenantById(id: number): Promise<any>;
  getTenantByUserId(userId: number): Promise<any>;
  getTenantByStripeCustomerId(stripeCustomerId: string): Promise<any>;
  getAllTenants(): Promise<any[]>;
  updateTenant(id: number, updates: any): Promise<any>;
  createTenantUser(tenantUser: any): Promise<any>;
  getUserTenants(userId: number): Promise<any[]>;
  getRestaurantByTenant(tenantId: number): Promise<any>;
  getRestaurantsByTenant(tenantId: number): Promise<any[]>;

  // Restaurants
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByUserId(userId: number): Promise<Restaurant | undefined>;
  getRestaurantById(id: number): Promise<Restaurant | undefined>;
  getRestaurantsByTenantId(tenantId: number): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(
    id: number,
    restaurant: Partial<Restaurant>,
  ): Promise<Restaurant | undefined>;

  // Tables
  getTablesByRestaurant(restaurantId: number): Promise<Table[]>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, table: Partial<Table>): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Bookings
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getUnassignedBookings(restaurantId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(
    id: number,
    booking: Partial<Booking>,
  ): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  getBookingCountForTenantThisMonth(tenantId: number): Promise<number>;

  // Customers
  getCustomersByRestaurant(restaurantId: number): Promise<Customer[]>;
  getCustomerByEmail(
    restaurantId: number,
    email: string,
  ): Promise<Customer | undefined>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(
    id: number,
    updates: Partial<Customer>,
  ): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getOrCreateCustomer(
    restaurantId: number,
    tenantId: number,
    customerData: { name: string; email: string; phone?: string },
  ): Promise<Customer>;
  createWalkInCustomer(
    restaurantId: number,
    tenantId: number,
    customerData?: { name?: string; phone?: string; notes?: string },
  ): Promise<Customer>;

  // SMS Messages
  getSmsMessagesByRestaurant(restaurantId: number): Promise<SmsMessage[]>;
  createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage>;

  // Waiting List
  getWaitingListByRestaurant(restaurantId: number): Promise<WaitingList[]>;
  createWaitingListEntry(entry: InsertWaitingList): Promise<WaitingList>;
  updateWaitingListEntry(
    id: number,
    updates: Partial<WaitingList>,
  ): Promise<WaitingList | undefined>;

  // Feedback
  getFeedbackByRestaurant(restaurantId: number): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  deleteFeedback(id: number): Promise<void>;

  // Activity Log
  getActivityLogByRestaurant(restaurantId: number): Promise<ActivityLog[]>;
  getActivityLogByTenant(tenantId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  deleteOldActivityLogs(beforeDate: Date): Promise<number>;

  // Product Groups
  getProductGroupsByRestaurant(restaurantId: number): Promise<ProductGroup[]>;
  createProductGroup(group: InsertProductGroup): Promise<ProductGroup>;
  updateProductGroup(id: number, updates: Partial<ProductGroup>): Promise<ProductGroup | undefined>;
  deleteProductGroup(id: number): Promise<void>;

  // Products
  getProductsByRestaurant(restaurantId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Time Slots
  getTimeSlotsByRestaurant(
    restaurantId: number,
    date?: string,
  ): Promise<TimeSlots[]>;
  createTimeSlot(slot: InsertTimeSlots): Promise<TimeSlots>;
  updateTimeSlot(
    id: number,
    updates: Partial<TimeSlots>,
  ): Promise<TimeSlots | undefined>;

  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined>;
  getFreePlan(): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(
    plan: InsertSubscriptionPlan,
  ): Promise<SubscriptionPlan>;

  // User Subscriptions
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  getUserSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<UserSubscription | undefined>;
  getAllUserSubscriptions(): Promise<UserSubscription[]>;
  createUserSubscription(
    subscription: InsertUserSubscription,
  ): Promise<UserSubscription>;
  updateUserSubscription(
    id: number,
    updates: Partial<UserSubscription>,
  ): Promise<UserSubscription | undefined>;
  getUserSubscriptionById(id: number): Promise<UserSubscription | undefined>;

  // Additional required methods
  getTableById(id: number): Promise<Table | undefined>;
  getWaitingListEntryById(id: number): Promise<WaitingList | undefined>;
  getTimeSlotById(id: number): Promise<TimeSlots | undefined>;

  // Auto-assignment methods
  getUnassignedBookings(): Promise<Booking[]>;
  getBookingsByDateAndRestaurant(
    restaurantId: number,
    date: string,
  ): Promise<Booking[]>;

  // Rooms
  getRoomsByRestaurant(restaurantId: number): Promise<Room[]>;
  getRoomById(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;

  // Combined Tables
  getCombinedTablesByRestaurant(restaurantId: number): Promise<CombinedTable[]>;
  getCombinedTableById(id: number): Promise<CombinedTable | undefined>;
  createCombinedTable(
    insertCombinedTable: InsertCombinedTable,
  ): Promise<CombinedTable>;
  updateCombinedTable(
    id: number,
    updates: Partial<CombinedTable>,
  ): Promise<CombinedTable | undefined>;
  deleteCombinedTable(id: number): Promise<boolean>;

  // Table Layout
  getTableLayout(
    restaurantId: number,
    room: string,
  ): Promise<TableLayout | undefined>;
  saveTableLayout(
    restaurantId: number,
    tenantId: number,
    room: string,
    positions: any,
  ): Promise<TableLayout>;

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
  createOrUpdateCutOffTimes(
    restaurantId: number,
    tenantId: number,
    timesData: any[],
  ): Promise<any>;

  // Business Rules
  isRestaurantOpen(
    restaurantId: number,
    bookingDate: Date,
    bookingTime: string,
  ): Promise<boolean>;
  isBookingAllowed(
    restaurantId: number,
    bookingDate: Date,
    bookingTime: string,
  ): Promise<boolean>;

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
  revertNotification(
    notificationId: number,
    userEmail: string,
  ): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;

  // Resolved Conflicts
  getResolvedConflictsByRestaurant(
    restaurantId: number,
  ): Promise<ResolvedConflict[]>;
  createResolvedConflict(
    resolvedConflict: InsertResolvedConflict,
  ): Promise<ResolvedConflict>;

  // Menu Categories
  getMenuCategoriesByRestaurant(restaurantId: number): Promise<MenuCategory[]>;
  getMenuCategories(
    restaurantId: number,
    tenantId: number,
  ): Promise<MenuCategory[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(
    id: number,
    updates: Partial<MenuCategory>,
  ): Promise<MenuCategory | undefined>;
  deleteMenuCategory(id: number): Promise<boolean>;

  // Menu Items
  getMenuItemsByRestaurant(restaurantId: number): Promise<MenuItem[]>;
  getMenuItems(restaurantId: number, tenantId: number): Promise<MenuItem[]>;
  getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(
    id: number,
    updates: Partial<MenuItem>,
  ): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Seasonal Menu Themes
  getSeasonalMenuThemes(restaurantId: number, tenantId: number): Promise<any[]>;
  getSeasonalMenuThemeById(id: number): Promise<any>;
  createSeasonalMenuTheme(theme: any): Promise<any>;
  updateSeasonalMenuTheme(id: number, updates: any): Promise<any>;
  deleteSeasonalMenuTheme(id: number): Promise<boolean>;
  setActiveSeasonalTheme(
    restaurantId: number,
    tenantId: number,
    themeId: number,
  ): Promise<boolean>;

  // Webhooks
  getWebhooksByRestaurant(restaurantId: number): Promise<any[]>;
  saveWebhooks(
    restaurantId: number,
    tenantId: number,
    webhooks: any[],
  ): Promise<any[]>;

  // Integration Configurations
  getIntegrationConfigurationsByRestaurant(
    restaurantId: number,
  ): Promise<any[]>;
  getIntegrationConfiguration(
    restaurantId: number,
    integrationId: string,
  ): Promise<any>;
  getIntegrationByRestaurantAndType(
    restaurantId: number,
    integrationType: string,
  ): Promise<any>;
  createOrUpdateIntegrationConfiguration(
    restaurantId: number,
    tenantId: number,
    integrationId: string,
    isEnabled: boolean,
    configuration?: any,
  ): Promise<any>;
  deleteIntegrationConfiguration(
    restaurantId: number,
    integrationId: string,
  ): Promise<boolean>;

  // Rescheduling Suggestions
  getReschedulingSuggestionsByRestaurant(restaurantId: number): Promise<any[]>;
  getReschedulingSuggestionsByBooking(bookingId: number): Promise<any[]>;
  createReschedulingSuggestion(suggestion: any): Promise<any>;
  updateReschedulingSuggestion(id: number, updates: any): Promise<any>;
  getReschedulingSuggestionById(id: number): Promise<any>;
  deleteReschedulingSuggestion(id: number): Promise<boolean>;
  deleteExpiredReschedulingSuggestions(): Promise<void>;

  // Auto-assignment methods
  getBookingsByDateAndRestaurant(
    date: string,
    restaurantId: number,
  ): Promise<Booking[]>;

  // Seating Configurations
  getSeatingConfigurationsByRestaurant(restaurantId: number): Promise<any[]>;
  createSeatingConfiguration(configuration: any): Promise<any>;
  updateSeatingConfiguration(id: number, updates: any): Promise<any>;
  deleteSeatingConfiguration(id: number): Promise<boolean>;

  // Periodic Criteria
  getPeriodicCriteriaByRestaurant(restaurantId: number): Promise<any[]>;
  createPeriodicCriteria(criteria: any): Promise<any>;
  updatePeriodicCriteria(id: number, updates: any): Promise<any>;
  deletePeriodicCriteria(id: number): Promise<boolean>;

  // Custom Fields
  getCustomFieldsByRestaurant(restaurantId: number): Promise<any[]>;
  createCustomField(field: any): Promise<any>;
  updateCustomField(id: number, updates: any): Promise<any>;
  deleteCustomField(id: number): Promise<boolean>;

  // Booking Agents
  getBookingAgentsByRestaurant(restaurantId: number): Promise<any[]>;
  createBookingAgent(agent: any): Promise<any>;
  updateBookingAgent(id: number, updates: any): Promise<any>;
  deleteBookingAgent(id: number): Promise<boolean>;
  isBookingAgent(
    email: string,
    phone: string,
    restaurantId: number,
  ): Promise<any | null>;
  // Print Orders
  createPrintOrder(orderData: any): Promise<any>;
  getPrintOrdersByRestaurant(
    restaurantId: number,
    tenantId: number,
  ): Promise<any[]>;
  getPrintOrderById(orderId: number): Promise<any>;
  updatePrintOrder(orderId: number, updates: any): Promise<any>;
  updatePrintOrderByPaymentIntent(
    paymentIntentId: string,
    updates: any,
  ): Promise<any>;
  getPrintOrderByOrderNumber(orderNumber: string): Promise<any>;
  deletePrintOrder(orderId: number): Promise<any>;

  // Floor Plans
  getFloorPlansByRestaurant(restaurantId: number): Promise<FloorPlan[]>;
  getFloorPlanById(id: number): Promise<FloorPlan | undefined>;
  createFloorPlan(floorPlan: InsertFloorPlan): Promise<FloorPlan>;
  updateFloorPlan(id: number, updates: Partial<FloorPlan>): Promise<FloorPlan | undefined>;
  deleteFloorPlan(id: number): Promise<boolean>;

  // Floor Plan Templates
  getFloorPlanTemplates(): Promise<FloorPlanTemplate[]>;
  getFloorPlanTemplateById(id: number): Promise<FloorPlanTemplate | undefined>;
  createFloorPlanTemplate(template: InsertFloorPlanTemplate): Promise<FloorPlanTemplate>;

  // Stripe Connect
  createStripePayment(payment: InsertStripePayment): Promise<StripePayment>;
  getStripePaymentsByTenant(tenantId: number): Promise<StripePayment[]>;
  updateStripePaymentByIntentId(paymentIntentId: string, updates: Partial<StripePayment>): Promise<StripePayment | undefined>;
  getTenantByStripeConnectAccountId(accountId: string): Promise<any | undefined>;
}

import { DatabaseStorage } from "./db-storage";
import { MemoryStorage } from "./mem-storage";

let storage: IStorage;

if (db) {
  console.log("Using database storage with PostgreSQL");
  storage = new DatabaseStorage(db);
} else {
  console.log("Using in-memory storage for development");
  storage = new MemoryStorage();
}

// Initialize storage with default data
storage.initialize().catch(console.error);

export { storage };
