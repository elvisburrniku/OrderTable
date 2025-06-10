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
    throw new Error("Method not implemented");
  }

  async getTenantByUserId(userId: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async createTenantUser(tenantUser: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getUser(id: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getUserById(id: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getUserByEmail(email: string): Promise<any> {
    throw new Error("Method not implemented");
  }

  async createUser(insertUser: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async updateUser(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getRestaurant(id: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getRestaurantByUserId(userId: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getRestaurantById(id: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async createRestaurant(restaurant: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async updateRestaurant(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getTablesByRestaurant(restaurantId: number): Promise<any[]> {
    throw new Error("Method not implemented");
  }

  async createTable(table: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async updateTable(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async deleteTable(id: number): Promise<boolean> {
    throw new Error("Method not implemented");
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<any[]> {
    throw new Error("Method not implemented");
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<any[]> {
    throw new Error("Method not implemented");
  }

  async createBooking(booking: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async updateBooking(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async deleteBooking(id: number): Promise<boolean> {
    throw new Error("Method not implemented");
  }

  async getCustomersByRestaurant(restaurantId: number): Promise<any[]> {
    throw new Error("Method not implemented");
  }

  async getCustomerByEmail(restaurantId: number, email: string): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getCustomerById(id: number): Promise<any> {
    throw new Error("Method not implemented");
  }

  async createCustomer(customer: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async updateCustomer(id: number, updates: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: any): Promise<any> {
    throw new Error("Method not implemented");
  }

  async createWalkInCustomer(restaurantId: number, tenantId: number, customerData: any): Promise<any> {
    throw new Error("Method not implemented");
  }
}