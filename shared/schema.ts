import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  varchar,
  primaryKey,
  date,
  time,
  json,
  unique,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Define subscription plans first since tenants reference it
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // price in cents
  interval: varchar("interval", { length: 20 }).default("monthly"), // monthly, yearly
  features: text("features").notNull(), // JSON string of features
  maxTables: integer("max_tables").default(10),
  maxBookingsPerMonth: integer("max_bookings_per_month").default(100),
  maxRestaurants: integer("max_restaurants").default(1),
  trialDays: integer("trial_days").default(14),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  subscriptionPlanId: integer("subscription_plan_id").references(() => subscriptionPlans.id),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("trial"), // trial, active, expired, cancelled
  trialStartDate: timestamp("trial_start_date").defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  maxRestaurants: integer("max_restaurants").default(1),
  additionalRestaurants: integer("additional_restaurants").default(0), // Extra restaurants beyond plan limit
  additionalRestaurantsCost: integer("additional_restaurants_cost").default(0), // Cost in cents for extra restaurants
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  restaurantName: text("restaurant_name"),
  ssoProvider: varchar("sso_provider", { length: 50 }), // google, github, etc.
  ssoId: text("sso_id"), // Provider's user ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantUsers = pgTable(
  "tenant_users",
  {
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 20 }).default("administrator"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey(table.tenantId, table.userId),
    };
  },
);

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  description: text("description"),
  setupCompleted: boolean("setup_completed").default(false),
  guestBookingEnabled: boolean("guest_booking_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  emailSettings: text("email_settings"),
  // General settings as JSON
  generalSettings: text("general_settings"),
  bookingSettings: text("booking_settings"),
  notificationSettings: text("notification_settings"),
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  tableNumber: varchar("table_number", { length: 50 }).notNull(),
  capacity: integer("capacity").notNull(),
  isActive: boolean("is_active").default(true),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  roomId: integer("room_id").references(() => rooms.id),
  qrCode: text("qr_code"), // QR code data URL for the table
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const combinedTables = pgTable("combined_tables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  tableIds: text("table_ids").notNull(), // JSON array of table IDs
  totalCapacity: integer("total_capacity").notNull(),
  isActive: boolean("is_active").default(true),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  tableId: integer("table_id").references(() => tables.id),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  guestCount: integer("guest_count").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  status: varchar("status", { length: 20 }).default("confirmed"),
  source: varchar("source", { length: 20 }).default("manual"), // manual, online, google
  notes: text("notes"),
  managementHash: text("management_hash"), // Hash for booking management links
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").default("Walk-in Customer"),
  email: text("email"),
  phone: text("phone"),
  isWalkIn: boolean("is_walk_in").default(false),
  notes: text("notes"),
  totalBookings: integer("total_bookings").default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow(),
});



export const waitingList = pgTable("waiting_list", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  guestCount: integer("guest_count").notNull(),
  requestedDate: text("requested_date").notNull(),
  requestedTime: text("requested_time").notNull(),
  status: varchar("status", { length: 20 }).default("waiting"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  rating: integer("rating"),
  comments: text("comments"),
  nps: integer("nps"), // Net Promoter Score
  visited: boolean("visited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  source: varchar("source", { length: 20 }).default("manual"),
  userEmail: text("user_email"),
  details: text("details"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeSlots = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  isAvailable: boolean("is_available").default(true),
  maxCapacity: integer("max_capacity").default(0),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  priority: varchar("priority", { length: 50 }).default("Medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  planId: integer("plan_id")
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  planId: integer("plan_id")
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingChangeRequests = pgTable("booking_change_requests", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  requestedDate: timestamp("requested_date"),
  requestedTime: text("requested_time"),
  requestedGuestCount: integer("requested_guest_count"),
  requestedTableId: integer("requested_table_id").references(() => tables.id),
  requestNotes: text("request_notes"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  restaurantResponse: text("restaurant_response"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // new_booking, booking_changed, booking_cancelled, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  changeRequestId: integer("change_request_id").references(() => bookingChangeRequests.id),
  data: json("data"), // Additional notification data
  originalData: json("original_data"), // For revert functionality
  isRead: boolean("is_read").default(false),
  isReverted: boolean("is_reverted").default(false),
  canRevert: boolean("can_revert").default(false),
  revertedBy: text("reverted_by"), // User email who reverted
  revertedAt: timestamp("reverted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingChangeRequestSchema = createInsertSchema(bookingChangeRequests).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
  isReverted: true,
  revertedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  trialStartDate: true,
  trialEndDate: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export const insertCompanyRegistrationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  planId: z.number().optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  restaurantName: true,
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers);

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  totalBookings: true,
  lastVisit: true,
});

export const insertWalkInCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  totalBookings: true,
  lastVisit: true,
}).extend({
  name: z.string().optional().default("Walk-in Customer"),
  email: z.string().optional(),
  phone: z.string().optional(),
  isWalkIn: z.boolean().default(true),
});

export const insertWaitingListSchema = createInsertSchema(waitingList).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertTimeSlotsSchema = createInsertSchema(timeSlots).omit({
  id: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(
  subscriptionPlans,
).omit({
  id: true,
  createdAt: true,
});

export const insertTenantSubscriptionSchema = createInsertSchema(
  tenantSubscriptions,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema =
  createInsertSchema(userSubscriptions);
export const selectUserSubscriptionSchema =
  createSelectSchema(userSubscriptions);

// Notification types
export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Opening Hours table
export const openingHours = pgTable("opening_hours", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  isOpen: boolean("is_open").default(true).notNull(),
  openTime: text("open_time").notNull(),
  closeTime: text("close_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Special Periods table
export const specialPeriods = pgTable("special_periods", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isOpen: boolean("is_open").default(true).notNull(),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cut-off Times table
export const cutOffTimes = pgTable("cut_off_times", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  cutOffHours: integer("cut_off_hours").default(0).notNull(), // Hours before closing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpeningHoursSchema = createInsertSchema(openingHours);
export const selectOpeningHoursSchema = createSelectSchema(openingHours);

export const insertSpecialPeriodSchema = createInsertSchema(specialPeriods);
export const selectSpecialPeriodSchema = createSelectSchema(specialPeriods);

export const insertCutOffTimeSchema = createInsertSchema(cutOffTimes);
export const selectCutOffTimeSchema = createSelectSchema(cutOffTimes);



export const tableLayouts = pgTable("table_layouts", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  room: varchar("room", { length: 50 }).notNull(),
  positions: json("positions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Integration Configurations table
export const integrationConfigurations = pgTable("integration_configurations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  integrationId: text("integration_id").notNull(),
  isEnabled: boolean("is_enabled").default(false),
  configuration: json("configuration").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  url: text("url").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Resolved Conflicts table
export const resolvedConflicts = pgTable("resolved_conflicts", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  conflictId: text("conflict_id").notNull(),
  conflictType: text("conflict_type").notNull(),
  severity: text("severity").notNull(),
  bookingIds: json("booking_ids").notNull().default([]),
  resolutionType: text("resolution_type").notNull(),
  resolutionDetails: text("resolution_details").notNull(),
  appliedBy: text("applied_by").default("system"),
  originalData: json("original_data").notNull().default({}),
  resolvedAt: timestamp("resolved_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Menu Categories table
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => menuCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"), // price in cents
  currency: varchar("currency", { length: 3 }).default("USD"),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  allergens: text("allergens").array(),
  dietary: text("dietary").array(),
  preparationTime: integer("preparation_time"), // in minutes
  ingredients: text("ingredients"),
  nutritionalInfo: text("nutritional_info"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Seasonal Menu Themes table
export const seasonalMenuThemes = pgTable("seasonal_menu_themes", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  season: varchar("season", { length: 20 }).notNull(), // spring, summer, autumn, winter
  year: integer("year").notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"), // hex color for theme
  isActive: boolean("is_active").default(false),
  aiGenerated: boolean("ai_generated").default(true),
  prompt: text("prompt"), // original AI prompt used
  suggestedMenuItems: text("suggested_menu_items").array(), // AI-generated menu item suggestions
  marketingCopy: text("marketing_copy"), // AI-generated marketing description
  targetIngredients: text("target_ingredients").array(), // seasonal ingredients to focus on
  moodKeywords: text("mood_keywords").array(), // theme mood descriptors
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rescheduling Suggestions table
export const reschedulingSuggestions = pgTable("rescheduling_suggestions", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  originalBookingId: integer("original_booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  originalDate: text("original_date").notNull(),
  originalTime: text("original_time").notNull(),
  suggestedDate: text("suggested_date").notNull(),
  suggestedTime: text("suggested_time").notNull(),
  tableId: integer("table_id").references(() => tables.id),
  guestCount: integer("guest_count").notNull(),
  reason: text("reason").notNull(), // "table_conflict", "restaurant_closed", "capacity_issue", etc.
  priority: integer("priority").default(1), // 1-5, higher is more suitable
  availability: boolean("availability").default(true),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, rejected, expired
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Type exports for all tables
export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export type Restaurant = InferSelectModel<typeof restaurants>;
export type InsertRestaurant = InferInsertModel<typeof restaurants>;

export type Table = InferSelectModel<typeof tables>;
export type InsertTable = InferInsertModel<typeof tables>;

export type Booking = InferSelectModel<typeof bookings>;
export type InsertBooking = InferInsertModel<typeof bookings>;

export type Customer = InferSelectModel<typeof customers>;
export type InsertCustomer = InferInsertModel<typeof customers>;

export type WaitingList = InferSelectModel<typeof waitingList>;
export type InsertWaitingList = InferInsertModel<typeof waitingList>;

export type Feedback = InferSelectModel<typeof feedback>;
export type InsertFeedback = InferInsertModel<typeof feedback>;

export type ActivityLog = InferSelectModel<typeof activityLog>;
export type InsertActivityLog = InferInsertModel<typeof activityLog>;

export type TimeSlots = InferSelectModel<typeof timeSlots>;
export type InsertTimeSlots = InferInsertModel<typeof timeSlots>;

export type Room = InferSelectModel<typeof rooms>;
export type InsertRoom = InferInsertModel<typeof rooms>;

export type SubscriptionPlan = InferSelectModel<typeof subscriptionPlans>;
export type InsertSubscriptionPlan = InferInsertModel<typeof subscriptionPlans>;

export type UserSubscription = InferSelectModel<typeof userSubscriptions>;
export type InsertUserSubscription = InferInsertModel<typeof userSubscriptions>;

export type CombinedTable = InferSelectModel<typeof combinedTables>;
export type InsertCombinedTable = InferInsertModel<typeof combinedTables>;

export type TableLayout = InferSelectModel<typeof tableLayouts>;
export type InsertTableLayout = InferInsertModel<typeof tableLayouts>;

export type BookingChangeRequest = InferSelectModel<typeof bookingChangeRequests>;
export type InsertBookingChangeRequest = InferInsertModel<typeof bookingChangeRequests>;

export type IntegrationConfiguration = InferSelectModel<typeof integrationConfigurations>;
export type InsertIntegrationConfiguration = InferInsertModel<typeof integrationConfigurations>;

export type ReschedulingSuggestion = InferSelectModel<typeof reschedulingSuggestions>;
export type InsertReschedulingSuggestion = InferInsertModel<typeof reschedulingSuggestions>;

export const insertIntegrationConfigurationSchema = createInsertSchema(integrationConfigurations);
export const selectIntegrationConfigurationSchema = createSelectSchema(integrationConfigurations);

export const insertReschedulingSuggestionSchema = createInsertSchema(reschedulingSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectReschedulingSuggestionSchema = createSelectSchema(reschedulingSuggestions);

export const insertResolvedConflictSchema = createInsertSchema(resolvedConflicts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export const selectResolvedConflictSchema = createSelectSchema(resolvedConflicts);

export type ResolvedConflict = InferSelectModel<typeof resolvedConflicts>;
export type InsertResolvedConflict = InferInsertModel<typeof resolvedConflicts>;

export type MenuCategory = InferSelectModel<typeof menuCategories>;
export type InsertMenuCategory = InferInsertModel<typeof menuCategories>;

export type MenuItem = InferSelectModel<typeof menuItems>;
export type InsertMenuItem = InferInsertModel<typeof menuItems>;

// Menu Print Orders table for professional printing service
export const menuPrintOrders = pgTable("menu_print_orders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull().unique(),
  printingOption: text("printing_option").notNull(), // standard, premium, deluxe, luxury
  shippingOption: text("shipping_option").notNull(), // standard, expedited, overnight
  quantity: integer("quantity").notNull(),
  menuTheme: text("menu_theme").notNull(),
  menuLayout: text("menu_layout").notNull(), // single, double, trifold
  subtotal: integer("subtotal").notNull(), // in cents
  shippingCost: integer("shipping_cost").notNull(), // in cents
  tax: integer("tax").notNull(), // in cents
  total: integer("total").notNull(), // in cents
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  specialInstructions: text("special_instructions"),
  orderStatus: text("order_status").default("pending").notNull(), // pending, confirmed, printing, shipped, delivered, cancelled
  estimatedDelivery: date("estimated_delivery"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const seatingConfigurations = pgTable("seating_configurations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  criteria: text("criteria").default("Unlimited"),
  validOnline: text("valid_online").default("Unlimited"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const periodicCriteria = pgTable("periodic_criteria", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  period: text("period").notNull(), // Time period like "4" hours
  guests: integer("guests").notNull(), // Guest count
  settings: text("settings").default("Settings"), // Settings configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  inputType: text("input_type").notNull().default("single_line"), // "single_line", "multi_line", "number", "select", "checkbox", "switch"
  options: text("options"), // JSON array for select options
  translations: text("translations"), // JSON field for language translations
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  sortOrder: integer("sort_order").default(0),
  isRequired: boolean("is_required").default(false),
  placeholder: text("placeholder"),
  validation: text("validation"), // JSON field for validation rules
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingFormFields = pgTable("booking_form_fields", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fieldType: text("field_type").notNull(), // "default" or "custom"
  fieldId: text("field_id").notNull(), // field identifier (customerName, email, phone, etc. or custom field id)
  customFieldId: integer("custom_field_id").references(() => customFields.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  inputType: text("input_type").notNull(), // text, email, tel, number, select, checkbox, switch, textarea
  isRequired: boolean("is_required").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  placeholder: text("placeholder"),
  options: text("options"), // JSON array for select options
  validation: text("validation"), // JSON field for validation rules
  width: text("width").default("full"), // full, half, third, quarter
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingAgents = pgTable("booking_agents", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  role: text("role").default("agent"), // "agent", "concierge"
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsSettings = pgTable("sms_settings", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  confirmationEnabled: boolean("confirmation_enabled").default(false),
  reminderEnabled: boolean("reminder_enabled").default(false),
  reminderHours: integer("reminder_hours").default(2),
  countryCode: text("country_code").default("+1"),
  phoneNumber: text("phone_number"),
  satisfactionSurveyEnabled: boolean("satisfaction_survey_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsBalance = pgTable("sms_balance", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  currency: text("currency").default("EUR"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'confirmation', 'reminder', 'survey'
  status: text("status").default("pending"), // 'pending', 'sent', 'failed', 'delivered'
  cost: decimal("cost", { precision: 8, scale: 4 }),
  providerId: text("provider_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin system tables - completely separate from tenant system
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).default("admin"), // admin, super_admin
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  type: varchar("type", { length: 20 }).default("string"), // string, number, boolean, json
  updatedBy: integer("updated_by").references(() => adminUsers.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: varchar("level", { length: 10 }).notNull(), // info, warn, error, debug
  message: text("message").notNull(),
  data: text("data"), // JSON string for additional log data
  source: text("source"), // component or service that generated the log
  adminUserId: integer("admin_user_id").references(() => adminUsers.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedbackQuestions = pgTable("feedback_questions", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  questionType: text("question_type").default("nps"), // 'nps', 'rating', 'text'
  hasNps: boolean("has_nps").default(true),
  hasComments: boolean("has_comments").default(true),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedbackResponses = pgTable("feedback_responses", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => feedbackQuestions.id, { onDelete: "cascade" }),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  rating: integer("rating"), // Star rating (1-5)
  npsScore: integer("nps_score"), // NPS score (0-10)
  textResponse: text("text_response"), // Text answer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MenuPrintOrder = InferSelectModel<typeof menuPrintOrders>;
export type InsertMenuPrintOrder = InferInsertModel<typeof menuPrintOrders>;

export const insertMenuPrintOrderSchema = createInsertSchema(menuPrintOrders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});
export const selectMenuPrintOrderSchema = createSelectSchema(menuPrintOrders);

export type SeatingConfiguration = InferSelectModel<typeof seatingConfigurations>;
export type InsertSeatingConfiguration = InferInsertModel<typeof seatingConfigurations>;

export const insertSeatingConfigurationSchema = createInsertSchema(seatingConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertFeedbackResponseSchema = createInsertSchema(feedbackResponses).omit({
  id: true,
  createdAt: true,
});

export type FeedbackResponse = typeof feedbackResponses.$inferSelect;
export type InsertFeedbackResponse = typeof feedbackResponses.$inferInsert;

// Kitchen Dashboard Tables
export const kitchenOrders = pgTable("kitchen_orders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(),
  tableNumber: text("table_number").notNull(),
  customerName: text("customer_name").notNull(),
  items: json("items").notNull(), // Array of menu items with quantities and prep times
  status: text("status").default("pending").notNull(), // pending, preparing, ready, served, cancelled
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  estimatedTime: integer("estimated_time").notNull(), // in minutes
  actualTime: integer("actual_time"), // in minutes
  startedAt: timestamp("started_at"),
  readyAt: timestamp("ready_at"),
  servedAt: timestamp("served_at"),
  totalAmount: integer("total_amount").notNull(), // in cents
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitchenStations = pgTable("kitchen_stations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // grill, fryer, salad, dessert, beverage, prep
  capacity: integer("capacity").default(5).notNull(),
  currentOrders: integer("current_orders").default(0).notNull(),
  efficiency: integer("efficiency").default(100).notNull(), // percentage
  averageTime: integer("average_time").default(20).notNull(), // in minutes
  isActive: boolean("is_active").default(true).notNull(),
  temperature: integer("temperature"), // for temperature-controlled stations
  lastMaintenance: timestamp("last_maintenance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitchenStaff = pgTable("kitchen_staff", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  role: text("role").notNull(), // head_chef, sous_chef, line_cook, prep_cook, dishwasher
  shift: text("shift").notNull(), // morning, afternoon, evening, night
  efficiency: integer("efficiency").default(100).notNull(), // percentage
  ordersCompleted: integer("orders_completed").default(0).notNull(),
  status: text("status").default("offline").notNull(), // active, break, offline
  currentStation: text("current_station"),
  hourlyRate: integer("hourly_rate"), // in cents
  startTime: text("start_time"), // shift start time
  endTime: text("end_time"), // shift end time
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitchenMetrics = pgTable("kitchen_metrics", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  ordersCompleted: integer("orders_completed").default(0).notNull(),
  averageTime: integer("average_time").default(0).notNull(), // in minutes
  efficiency: integer("efficiency").default(0).notNull(), // percentage
  revenue: integer("revenue").default(0).notNull(), // in cents
  peakHour: integer("peak_hour"), // hour of day (0-23)
  popularItems: json("popular_items"), // array of popular items with counts
  stationUtilization: json("station_utilization"), // station usage data
  waitTimes: json("wait_times"), // hourly wait time data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KitchenOrder = InferSelectModel<typeof kitchenOrders>;
export type InsertKitchenOrder = InferInsertModel<typeof kitchenOrders>;

export type KitchenStation = InferSelectModel<typeof kitchenStations>;
export type InsertKitchenStation = InferInsertModel<typeof kitchenStations>;

export type KitchenStaff = InferSelectModel<typeof kitchenStaff>;
export type InsertKitchenStaff = InferInsertModel<typeof kitchenStaff>;

export type KitchenMetrics = InferSelectModel<typeof kitchenMetrics>;
export type InsertKitchenMetrics = InferInsertModel<typeof kitchenMetrics>;

export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSeatingConfigurationSchema = createSelectSchema(seatingConfigurations);

export type PeriodicCriteria = InferSelectModel<typeof periodicCriteria>;
export type InsertPeriodicCriteria = InferInsertModel<typeof periodicCriteria>;

export const insertPeriodicCriteriaSchema = createInsertSchema(periodicCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKitchenStationSchema = createInsertSchema(kitchenStations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectPeriodicCriteriaSchema = createSelectSchema(periodicCriteria);

export type CustomField = InferSelectModel<typeof customFields>;
export type InsertCustomField = InferInsertModel<typeof customFields>;

export const insertCustomFieldSchema = createInsertSchema(customFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKitchenStaffSchema = createInsertSchema(kitchenStaff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCustomFieldSchema = createSelectSchema(customFields);

export type BookingAgent = InferSelectModel<typeof bookingAgents>;
export type InsertBookingAgent = InferInsertModel<typeof bookingAgents>;

export const insertBookingAgentSchema = createInsertSchema(bookingAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKitchenMetricsSchema = createInsertSchema(kitchenMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectBookingAgentSchema = createSelectSchema(bookingAgents);

export type SmsSettings = InferSelectModel<typeof smsSettings>;
export type InsertSmsSettings = InferInsertModel<typeof smsSettings>;

export const insertSmsSettingsSchema = createInsertSchema(smsSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Print Orders Schema
export const printOrders = pgTable("print_orders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  printType: text("print_type").notNull(), // menu, flyer, poster, banner, business_card
  printSize: text("print_size").notNull(), // A4, A3, A2, A1, custom
  printQuality: text("print_quality").default("standard").notNull(), // draft, standard, high, premium
  quantity: integer("quantity").default(1).notNull(),
  design: json("design").notNull(), // design configuration object
  specialInstructions: text("special_instructions"),
  rushOrder: boolean("rush_order").default(false).notNull(),
  totalAmount: integer("total_amount").notNull(), // in cents
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, paid, failed, refunded
  paymentIntentId: text("payment_intent_id"),
  stripePaymentId: text("stripe_payment_id"),
  orderStatus: text("order_status").default("pending").notNull(), // pending, processing, printing, completed, cancelled
  estimatedCompletion: timestamp("estimated_completion"),
  completedAt: timestamp("completed_at"),
  processingStartedAt: timestamp("processing_started_at"),
  printingStartedAt: timestamp("printing_started_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  trackingNumber: text("tracking_number"),
  deliveryMethod: text("delivery_method").default("pickup").notNull(), // pickup, delivery, mail
  deliveryAddress: json("delivery_address"), // delivery address object
  estimatedDeliveryDate: date("estimated_delivery_date"),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PrintOrder = InferSelectModel<typeof printOrders>;
export type InsertPrintOrder = InferInsertModel<typeof printOrders>;

export const insertPrintOrderSchema = createInsertSchema(printOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSmsSettingsSchema = createSelectSchema(smsSettings);

export type SmsBalance = InferSelectModel<typeof smsBalance>;
export type InsertSmsBalance = InferInsertModel<typeof smsBalance>;

export const insertSmsBalanceSchema = createInsertSchema(smsBalance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSmsBalanceSchema = createSelectSchema(smsBalance);

export type FeedbackQuestion = InferSelectModel<typeof feedbackQuestions>;
export type InsertFeedbackQuestion = InferInsertModel<typeof feedbackQuestions>;

export const insertFeedbackQuestionSchema = createInsertSchema(feedbackQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectFeedbackQuestionSchema = createSelectSchema(feedbackQuestions);

export type SeasonalMenuTheme = InferSelectModel<typeof seasonalMenuThemes>;
export type InsertSeasonalMenuTheme = InferInsertModel<typeof seasonalMenuThemes>;

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectMenuCategorySchema = createSelectSchema(menuCategories);

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSeasonalMenuThemeSchema = createInsertSchema(seasonalMenuThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectMenuItemSchema = createSelectSchema(menuItems);

export type LoginData = z.infer<typeof loginSchema>;

// Product Groups table
export const productGroups = pgTable("product_groups", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  groupName: text("group_name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ProductGroup = InferSelectModel<typeof productGroups>;
export type InsertProductGroup = InferInsertModel<typeof productGroups>;

export const insertProductGroupSchema = createInsertSchema(productGroups);
export const selectProductGroupSchema = createSelectSchema(productGroups);

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  categoryId: integer("category_id").notNull().references(() => productGroups.id, { onDelete: "cascade" }), // Reference to product groups
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = InferSelectModel<typeof products>;
export type InsertProduct = InferInsertModel<typeof products>;

export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);

// Admin system type exports
export type AdminUser = InferSelectModel<typeof adminUsers>;
export type InsertAdminUser = InferInsertModel<typeof adminUsers>;

export type AdminSession = InferSelectModel<typeof adminSessions>;
export type InsertAdminSession = InferInsertModel<typeof adminSessions>;

export type SystemSetting = InferSelectModel<typeof systemSettings>;
export type InsertSystemSetting = InferInsertModel<typeof systemSettings>;

export type SystemLog = InferSelectModel<typeof systemLogs>;
export type InsertSystemLog = InferInsertModel<typeof systemLogs>;

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

// Payment Setups table
export const paymentSetups = pgTable("payment_setups", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  method: varchar("method", { length: 50 }).notNull(), // capture_amount, reserve_amount, membership_fee
  type: varchar("type", { length: 50 }).notNull(), // deposit, prepayment, membership
  priceType: varchar("price_type", { length: 50 }).default("one_price").notNull(), // one_price, multiple_prices
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("EUR").notNull(),
  priceUnit: varchar("price_unit", { length: 50 }).default("per_guest").notNull(), // per_guest, per_booking, per_table
  allowResidual: boolean("allow_residual").default(false).notNull(),
  residualAmount: decimal("residual_amount", { precision: 10, scale: 2 }),
  cancellationNotice: varchar("cancellation_notice", { length: 50 }).default("24_hours").notNull(), // 24_hours, 48_hours, 72_hours, 1_week
  description: text("description"),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PaymentSetup = InferSelectModel<typeof paymentSetups>;
export type InsertPaymentSetup = InferInsertModel<typeof paymentSetups>;

export const insertPaymentSetupSchema = createInsertSchema(paymentSetups);
export const selectPaymentSetupSchema = createSelectSchema(paymentSetups);