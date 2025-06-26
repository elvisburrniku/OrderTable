import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  varchar,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription Plans - defines what each user can access
export const subscriptionPlans = pgTable("restaurant_subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  maxRestaurants: integer("max_restaurants").notNull(),
  priceMonthly: integer("price_monthly").notNull(), // price in cents
  features: text("features").notNull(), // JSON array of features
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Main users (owners) who subscribe to plans
export const users = pgTable("restaurant_management_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  subscriptionPlanId: integer("subscription_plan_id").references(() => subscriptionPlans.id),
  maxRestaurants: integer("max_restaurants").default(1),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurants - each main user can create multiple restaurants
export const restaurants = pgTable("restaurant_management_restaurants", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  subscriptionPlanId: integer("subscription_plan_id").references(() => subscriptionPlans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role definitions with permissions
export const roles = pgTable("restaurant_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  displayName: text("display_name").notNull(),
  permissions: text("permissions").notNull(), // JSON array of permissions
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant users - people assigned to work at specific restaurants
export const restaurantUsers = pgTable(
  "restaurant_users",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    email: text("email").notNull(),
    password: text("password"),
    name: text("name").notNull(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    isActive: boolean("is_active").default(true),
    invitedBy: integer("invited_by").references(() => users.id),
    invitedAt: timestamp("invited_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      uniqueEmailPerRestaurant: unique().on(table.restaurantId, table.email),
    };
  },
);

// Tables for each restaurant
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableNumber: varchar("table_number", { length: 50 }).notNull(),
  capacity: integer("capacity").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableId: integer("table_id").references(() => tables.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  guestCount: integer("guest_count").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  status: varchar("status", { length: 20 }).default("confirmed"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => restaurantUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders (for kitchen staff)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  items: text("items").notNull(), // JSON array of order items
  totalAmount: integer("total_amount").notNull(), // in cents
  status: varchar("status", { length: 20 }).default("pending"),
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => restaurantUsers.id),
  createdBy: integer("created_by").references(() => restaurantUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  totalBookings: integer("total_bookings").default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertRestaurantUserSchema = createInsertSchema(restaurantUsers).omit({
  id: true,
  createdAt: true,
  invitedAt: true,
  acceptedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  totalBookings: true,
  lastVisit: true,
});

// User registration schema
export const registerSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  subscriptionPlanId: z.number().optional(),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

// User invitation schema
export const inviteUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  roleId: z.number().min(1, "Role is required"),
});

// Permission system
export const PERMISSIONS = {
  // Booking permissions
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_EDIT: 'bookings.edit',
  BOOKINGS_DELETE: 'bookings.delete',
  
  // Order permissions
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_DELETE: 'orders.delete',
  
  // Customer permissions
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  
  // Table permissions
  TABLES_VIEW: 'tables.view',
  TABLES_CREATE: 'tables.create',
  TABLES_EDIT: 'tables.edit',
  TABLES_DELETE: 'tables.delete',
  
  // Report permissions
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // Settings permissions
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  
  // User management permissions
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
} as const;

// Default roles
export const DEFAULT_ROLES = [
  {
    name: 'owner',
    displayName: 'Owner',
    permissions: Object.values(PERMISSIONS),
    isSystem: true,
  },
  {
    name: 'manager',
    displayName: 'Manager',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
      PERMISSIONS.BOOKINGS_EDIT,
      PERMISSIONS.BOOKINGS_DELETE,
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_EDIT,
      PERMISSIONS.ORDERS_DELETE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_EDIT,
      PERMISSIONS.TABLES_VIEW,
      PERMISSIONS.TABLES_CREATE,
      PERMISSIONS.TABLES_EDIT,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
    ],
    isSystem: true,
  },
  {
    name: 'agent',
    displayName: 'Agent',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
      PERMISSIONS.BOOKINGS_EDIT,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_EDIT,
      PERMISSIONS.TABLES_VIEW,
    ],
    isSystem: true,
  },
  {
    name: 'kitchen_staff',
    displayName: 'Kitchen Staff',
    permissions: [
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.ORDERS_EDIT,
    ],
    isSystem: true,
  },
] as const;

// Subscription plans
export const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    name: 'Basic',
    price: 2900, // $29/month
    maxRestaurants: 1,
    features: JSON.stringify(['1 Restaurant', 'Basic Support', 'Standard Features']),
  },
  {
    name: 'Pro',
    price: 7900, // $79/month
    maxRestaurants: 5,
    features: JSON.stringify(['5 Restaurants', 'Priority Support', 'Advanced Features', 'Analytics']),
  },
  {
    name: 'Enterprise',
    price: 19900, // $199/month
    maxRestaurants: 999,
    features: JSON.stringify(['Unlimited Restaurants', '24/7 Support', 'All Features', 'Custom Integration']),
  },
] as const;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type RestaurantUser = typeof restaurantUsers.$inferSelect;
export type InsertRestaurantUser = z.infer<typeof insertRestaurantUserSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;