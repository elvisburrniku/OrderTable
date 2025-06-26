import { restaurantDb } from "./restaurant-db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users,
  restaurants,
  roles,
  restaurantUsers,
  bookings,
  orders,
  tables,
  customers,
  subscriptionPlans,
  type User,
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Role,
  type InsertRole,
  type RestaurantUser,
  type InsertRestaurantUser,
  type Booking,
  type InsertBooking,
  type Order,
  type InsertOrder,
  type Table,
  type InsertTable,
  type Customer,
  type InsertCustomer,
  type SubscriptionPlan,
  DEFAULT_ROLES,
  DEFAULT_SUBSCRIPTION_PLANS,
  PERMISSIONS,
} from "@shared/restaurant-schema";
import bcrypt from "bcrypt";

export interface IRestaurantStorage {
  // User management
  createUser(userData: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  updateUserSubscription(userId: number, subscriptionPlanId: number): Promise<void>;
  checkRestaurantLimit(userId: number): Promise<{ canCreate: boolean; currentCount: number; maxAllowed: number }>;

  // Restaurant management
  createRestaurant(restaurantData: InsertRestaurant): Promise<Restaurant>;
  getRestaurantsByOwner(ownerId: number): Promise<Restaurant[]>;
  getRestaurantById(id: number): Promise<Restaurant | null>;
  updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant>;
  deleteRestaurant(id: number): Promise<void>;

  // Role and permission management
  getRoles(): Promise<Role[]>;
  createRole(roleData: InsertRole): Promise<Role>;
  getRoleById(id: number): Promise<Role | null>;
  updateRole(id: number, data: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  // Restaurant user management
  createRestaurantUser(userData: InsertRestaurantUser): Promise<RestaurantUser>;
  getRestaurantUsers(restaurantId: number): Promise<(RestaurantUser & { role: Role })[]>;
  getRestaurantUserByEmail(restaurantId: number, email: string): Promise<RestaurantUser | null>;
  updateRestaurantUser(id: number, data: Partial<InsertRestaurantUser>): Promise<RestaurantUser>;
  deleteRestaurantUser(id: number): Promise<void>;
  getUserPermissions(userId: number, restaurantId: number): Promise<string[]>;

  // Booking management
  createBooking(bookingData: InsertBooking): Promise<Booking>;
  getBookings(restaurantId: number): Promise<Booking[]>;
  getBookingById(id: number): Promise<Booking | null>;
  updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;
  getBookingsByDateRange(restaurantId: number, startDate: Date, endDate: Date): Promise<Booking[]>;

  // Order management
  createOrder(orderData: InsertOrder): Promise<Order>;
  getOrders(restaurantId: number): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | null>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  getOrdersByStatus(restaurantId: number, status: string): Promise<Order[]>;

  // Table management
  createTable(tableData: InsertTable): Promise<Table>;
  getTables(restaurantId: number): Promise<Table[]>;
  getTableById(id: number): Promise<Table | null>;
  updateTable(id: number, data: Partial<InsertTable>): Promise<Table>;
  deleteTable(id: number): Promise<void>;

  // Customer management
  createCustomer(customerData: InsertCustomer): Promise<Customer>;
  getCustomers(restaurantId: number): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | null>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  // Subscription plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;

  // System initialization
  initializeSystem(): Promise<void>;
}

export class RestaurantStorage implements IRestaurantStorage {
  // User management
  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await restaurantDb
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await restaurantDb
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await restaurantDb
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user || null;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async updateUserSubscription(userId: number, subscriptionPlanId: number): Promise<void> {
    const [plan] = await restaurantDb
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscriptionPlanId));

    if (!plan) throw new Error("Subscription plan not found");

    await restaurantDb
      .update(users)
      .set({
        subscriptionPlanId,
        maxRestaurants: plan.maxRestaurants,
      })
      .where(eq(users.id, userId));
  }

  async checkRestaurantLimit(userId: number): Promise<{ canCreate: boolean; currentCount: number; maxAllowed: number }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    const restaurantCount = await restaurantDb
      .select({ count: sql<number>`count(*)` })
      .from(restaurants)
      .where(eq(restaurants.ownerId, userId));

    const currentCount = Number(restaurantCount[0].count);
    const maxAllowed = user.maxRestaurants || 1;

    return {
      canCreate: currentCount < maxAllowed,
      currentCount,
      maxAllowed,
    };
  }

  // Restaurant management
  async createRestaurant(restaurantData: InsertRestaurant): Promise<Restaurant> {
    const limitCheck = await this.checkRestaurantLimit(restaurantData.ownerId);
    if (!limitCheck.canCreate) {
      throw new Error(`Restaurant limit reached. You can create up to ${limitCheck.maxAllowed} restaurants.`);
    }

    const [restaurant] = await restaurantDb
      .insert(restaurants)
      .values(restaurantData)
      .returning();
    return restaurant;
  }

  async getRestaurantsByOwner(ownerId: number): Promise<Restaurant[]> {
    return await restaurantDb
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerId, ownerId))
      .orderBy(desc(restaurants.createdAt));
  }

  async getRestaurantById(id: number): Promise<Restaurant | null> {
    const [restaurant] = await restaurantDb
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return restaurant || null;
  }

  async updateRestaurant(id: number, data: Partial<InsertRestaurant>): Promise<Restaurant> {
    const [restaurant] = await restaurantDb
      .update(restaurants)
      .set(data)
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  async deleteRestaurant(id: number): Promise<void> {
    await restaurantDb.delete(restaurants).where(eq(restaurants.id, id));
  }

  // Role and permission management
  async getRoles(): Promise<Role[]> {
    return await restaurantDb.select().from(roles).orderBy(roles.name);
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await restaurantDb
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  async getRoleById(id: number): Promise<Role | null> {
    const [role] = await restaurantDb
      .select()
      .from(roles)
      .where(eq(roles.id, id));
    return role || null;
  }

  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role> {
    const [role] = await restaurantDb
      .update(roles)
      .set(data)
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    const role = await this.getRoleById(id);
    if (role?.isSystem) {
      throw new Error("Cannot delete system roles");
    }
    await restaurantDb.delete(roles).where(eq(roles.id, id));
  }

  // Restaurant user management
  async createRestaurantUser(userData: InsertRestaurantUser): Promise<RestaurantUser> {
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
    const [user] = await restaurantDb
      .insert(restaurantUsers)
      .values({
        ...userData,
        password: hashedPassword,
        invitedAt: new Date(),
      })
      .returning();
    return user;
  }

  async getRestaurantUsers(restaurantId: number): Promise<(RestaurantUser & { role: Role })[]> {
    return await restaurantDb
      .select({
        id: restaurantUsers.id,
        restaurantId: restaurantUsers.restaurantId,
        email: restaurantUsers.email,
        password: restaurantUsers.password,
        name: restaurantUsers.name,
        roleId: restaurantUsers.roleId,
        isActive: restaurantUsers.isActive,
        invitedBy: restaurantUsers.invitedBy,
        invitedAt: restaurantUsers.invitedAt,
        acceptedAt: restaurantUsers.acceptedAt,
        createdAt: restaurantUsers.createdAt,
        role: {
          id: roles.id,
          name: roles.name,
          displayName: roles.displayName,
          permissions: roles.permissions,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
        },
      })
      .from(restaurantUsers)
      .leftJoin(roles, eq(restaurantUsers.roleId, roles.id))
      .where(eq(restaurantUsers.restaurantId, restaurantId))
      .orderBy(desc(restaurantUsers.createdAt));
  }

  async getRestaurantUserByEmail(restaurantId: number, email: string): Promise<RestaurantUser | null> {
    const [user] = await restaurantDb
      .select()
      .from(restaurantUsers)
      .where(and(eq(restaurantUsers.restaurantId, restaurantId), eq(restaurantUsers.email, email)));
    return user || null;
  }

  async updateRestaurantUser(id: number, data: Partial<InsertRestaurantUser>): Promise<RestaurantUser> {
    const updateData = { ...data };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const [user] = await restaurantDb
      .update(restaurantUsers)
      .set(updateData)
      .where(eq(restaurantUsers.id, id))
      .returning();
    return user;
  }

  async deleteRestaurantUser(id: number): Promise<void> {
    await restaurantDb.delete(restaurantUsers).where(eq(restaurantUsers.id, id));
  }

  async getUserPermissions(userId: number, restaurantId: number): Promise<string[]> {
    const [user] = await restaurantDb
      .select({
        role: {
          permissions: roles.permissions,
        },
      })
      .from(restaurantUsers)
      .leftJoin(roles, eq(restaurantUsers.roleId, roles.id))
      .where(and(eq(restaurantUsers.id, userId), eq(restaurantUsers.restaurantId, restaurantId)));

    if (!user?.role?.permissions) return [];

    try {
      return JSON.parse(user.role.permissions);
    } catch {
      return [];
    }
  }

  // Booking management
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const [booking] = await restaurantDb
      .insert(bookings)
      .values(bookingData)
      .returning();
    return booking;
  }

  async getBookings(restaurantId: number): Promise<Booking[]> {
    return await restaurantDb
      .select()
      .from(bookings)
      .where(eq(bookings.restaurantId, restaurantId))
      .orderBy(desc(bookings.bookingDate));
  }

  async getBookingById(id: number): Promise<Booking | null> {
    const [booking] = await restaurantDb
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    return booking || null;
  }

  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await restaurantDb
      .update(bookings)
      .set(data)
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async deleteBooking(id: number): Promise<void> {
    await restaurantDb.delete(bookings).where(eq(bookings.id, id));
  }

  async getBookingsByDateRange(restaurantId: number, startDate: Date, endDate: Date): Promise<Booking[]> {
    return await restaurantDb
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.restaurantId, restaurantId),
          sql`${bookings.bookingDate} >= ${startDate}`,
          sql`${bookings.bookingDate} <= ${endDate}`
        )
      )
      .orderBy(bookings.bookingDate);
  }

  // Order management
  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await restaurantDb
      .insert(orders)
      .values(orderData)
      .returning();
    return order;
  }

  async getOrders(restaurantId: number): Promise<Order[]> {
    return await restaurantDb
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<Order | null> {
    const [order] = await restaurantDb
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return order || null;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
    const [order] = await restaurantDb
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async deleteOrder(id: number): Promise<void> {
    await restaurantDb.delete(orders).where(eq(orders.id, id));
  }

  async getOrdersByStatus(restaurantId: number, status: string): Promise<Order[]> {
    return await restaurantDb
      .select()
      .from(orders)
      .where(and(eq(orders.restaurantId, restaurantId), eq(orders.status, status)))
      .orderBy(desc(orders.createdAt));
  }

  // Table management
  async createTable(tableData: InsertTable): Promise<Table> {
    const [table] = await restaurantDb
      .insert(tables)
      .values(tableData)
      .returning();
    return table;
  }

  async getTables(restaurantId: number): Promise<Table[]> {
    return await restaurantDb
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId))
      .orderBy(tables.tableNumber);
  }

  async getTableById(id: number): Promise<Table | null> {
    const [table] = await restaurantDb
      .select()
      .from(tables)
      .where(eq(tables.id, id));
    return table || null;
  }

  async updateTable(id: number, data: Partial<InsertTable>): Promise<Table> {
    const [table] = await restaurantDb
      .update(tables)
      .set(data)
      .where(eq(tables.id, id))
      .returning();
    return table;
  }

  async deleteTable(id: number): Promise<void> {
    await restaurantDb.delete(tables).where(eq(tables.id, id));
  }

  // Customer management
  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await restaurantDb
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async getCustomers(restaurantId: number): Promise<Customer[]> {
    return await restaurantDb
      .select()
      .from(customers)
      .where(eq(customers.restaurantId, restaurantId))
      .orderBy(desc(customers.lastVisit));
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const [customer] = await restaurantDb
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return customer || null;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await restaurantDb
      .update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await restaurantDb.delete(customers).where(eq(customers.id, id));
  }

  // Subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await restaurantDb
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }

  // System initialization
  async initializeSystem(): Promise<void> {
    // Create default subscription plans
    for (const planData of DEFAULT_SUBSCRIPTION_PLANS) {
      const existingPlan = await restaurantDb
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, planData.name));

      if (existingPlan.length === 0) {
        await restaurantDb.insert(subscriptionPlans).values(planData);
      }
    }

    // Create default roles
    for (const roleData of DEFAULT_ROLES) {
      const existingRole = await restaurantDb
        .select()
        .from(roles)
        .where(eq(roles.name, roleData.name));

      if (existingRole.length === 0) {
        await restaurantDb.insert(roles).values({
          ...roleData,
          permissions: JSON.stringify(roleData.permissions),
        });
      }
    }
  }
}

export const restaurantStorage = new RestaurantStorage();