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
    if (!this.db) throw new Error("Database connection not available");
    const [newTenant] = await this.db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async getTenantByUserId(userId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .select({
        tenant: tenants,
        tenantUser: tenantUsers
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(eq(tenantUsers.userId, userId))
      .limit(1);
    
    return result[0]?.tenant;
  }

  async createTenantUser(tenantUser: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const [newTenantUser] = await this.db.insert(tenantUsers).values(tenantUser).returning();
    return newTenantUser;
  }

  async getUser(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserById(id: number): Promise<any> {
    if (!this.db) {
      throw new Error("Database connection not available");
    }
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<any> {
    if (!this.db) {
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
    }
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: any): Promise<any> {
    if (!this.db) {
      throw new Error("Database connection not available. Please configure DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
    }
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updates: any): Promise<any> {
    const result = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getRestaurant(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async getRestaurantByUserId(userId: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(restaurants).where(eq(restaurants.userId, userId));
    return result[0];
  }

  async getRestaurantById(id: number): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async createRestaurant(restaurant: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(restaurants).values(restaurant).returning();
    return result[0];
  }

  async updateRestaurant(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db
      .update(restaurants)
      .set(updates)
      .where(eq(restaurants.id, id))
      .returning();
    return result[0];
  }

  async getTablesByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
    return result;
  }

  async createTable(table: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(tables).values(table).returning();
    return result[0];
  }

  async updateTable(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.update(tables).set(updates).where(eq(tables.id, id)).returning();
    return result[0];
  }

  async deleteTable(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(tables).where(eq(tables.id, id));
    return true;
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(bookings).where(eq(bookings.restaurantId, restaurantId));
    return result;
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(bookings)
      .where(and(eq(bookings.restaurantId, restaurantId), eq(bookings.date, date)));
    return result;
  }

  async createBooking(booking: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(bookings).values(booking).returning();
    return result[0];
  }

  async updateBooking(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return result[0];
  }

  async deleteBooking(id: number): Promise<boolean> {
    if (!this.db) return false;
    await this.db.delete(bookings).where(eq(bookings.id, id));
    return true;
  }

  async getCustomersByRestaurant(restaurantId: number): Promise<any[]> {
    if (!this.db) return [];
    const result = await this.db.select().from(customers).where(eq(customers.restaurantId, restaurantId));
    return result;
  }

  async getCustomerByEmail(restaurantId: number, email: string): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(customers)
      .where(and(eq(customers.restaurantId, restaurantId), eq(customers.email, email)));
    return result[0];
  }

  async getCustomerById(id: number): Promise<any> {
    if (!this.db) return null;
    const result = await this.db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async createCustomer(customer: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: number, updates: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    const result = await this.db.update(customers).set(updates).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    let customer = await this.getCustomerByEmail(restaurantId, customerData.email);
    
    if (!customer) {
      customer = await this.createCustomer({
        ...customerData,
        restaurantId,
        tenantId
      });
    }
    
    return customer;
  }

  async createWalkInCustomer(restaurantId: number, tenantId: number, customerData: any): Promise<any> {
    if (!this.db) throw new Error("Database connection not available");
    
    const walkInData = {
      name: customerData?.name || "Walk-in Customer",
      email: customerData?.email || null,
      phone: customerData?.phone || null,
      restaurantId,
      tenantId,
      isWalkIn: true,
      ...customerData
    };
    
    const result = await this.db.insert(customers).values(walkInData).returning();
    return result[0];
  }
}