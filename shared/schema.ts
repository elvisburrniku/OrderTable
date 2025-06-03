import { pgTable, text, serial, integer, boolean, timestamp, varchar, primaryKey, date, time, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  restaurantName: text("restaurant_name"),
  createdAt: timestamp("created_at").defaultNow()
});

export const tenantUsers = pgTable("tenant_users", {
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).default("administrator"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => {
  return {
    pk: primaryKey(table.tenantId, table.userId)
  }
});

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  tableNumber: text("table_number").notNull(),
  capacity: integer("capacity").notNull(),
  isActive: boolean("is_active").default(true)
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  tableId: integer("table_id").references(() => tables.id),
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  guestCount: integer("guest_count").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  status: varchar("status", { length: 20 }).default("confirmed"),
  source: varchar("source", { length: 20 }).default("manual"), // manual, online, google
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  totalBookings: integer("total_bookings").default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow()
});

export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("information"),
  content: text("content").notNull(),
  receivers: text("receivers").notNull(), // JSON array of phone numbers
  bookingDateFrom: date("booking_date_from"),
  bookingDateTo: date("booking_date_to"),
  language: varchar("language", { length: 10 }).default("english"),
  createdAt: timestamp("created_at").defaultNow()
});

export const waitingList = pgTable("waiting_list", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  guestCount: integer("guest_count").notNull(),
  requestedDate: date("requested_date").notNull(),
  requestedTime: text("requested_time").notNull(),
  status: varchar("status", { length: 20 }).default("waiting"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  rating: integer("rating"),
  comments: text("comments"),
  nps: integer("nps"), // Net Promoter Score
  visited: boolean("visited").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  source: varchar("source", { length: 20 }).default("manual"),
  userEmail: text("user_email"),
  details: text("details"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow()
});

export const timeSlots = pgTable("time_slots", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  date: date("date").notNull(),
  time: text("time").notNull(),
  isAvailable: boolean("is_available").default(true),
  maxCapacity: integer("max_capacity").default(0)
});

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  priority: varchar('priority', { length: 50 }).default("Medium"),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // price in cents
  interval: varchar("interval", { length: 20 }).default("monthly"), // monthly, yearly
  features: text("features").notNull(), // JSON string of features
  maxTables: integer("max_tables").default(10),
  maxBookingsPerMonth: integer("max_bookings_per_month").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  restaurantName: true
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers);

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  totalBookings: true,
  lastVisit: true
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true
});

export const insertWaitingListSchema = createInsertSchema(waitingList).omit({
  id: true,
  createdAt: true
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true
});

export const insertTimeSlotsSchema = createInsertSchema(timeSlots).omit({
  id: true
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true
});

export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type WaitingList = typeof waitingList.$inferSelect;
export type InsertWaitingList = z.infer<typeof waitingListSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof activityLogSchema>;
export type TimeSlots = typeof timeSlots.$inferSelect;
export type InsertTimeSlots = z.infer<typeof timeSlotsSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export const tableLayouts = pgTable('table_layouts', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id),
  room: varchar('room', { length: 50 }).notNull(),
  positions: json('positions').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date())
});

export type TableLayout = InferSelectModel<typeof tableLayouts>;
export type InsertTableLayout = InferInsertModel<typeof tableLayouts>;
export type LoginData = z.infer<typeof loginSchema>;