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
    } catch (error) {
      console.error("Error initializing demo data:", error);
    }
