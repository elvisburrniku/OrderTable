import { 
  users, restaurants, tables, bookings, customers,
  type User, type InsertUser, type Restaurant, type InsertRestaurant,
  type Table, type InsertTable, type Booking, type InsertBooking,
  type Customer, type InsertCustomer 
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Restaurants
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByUserId(userId: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  
  // Tables
  getTablesByRestaurant(restaurantId: number): Promise<Table[]>;
  createTable(table: InsertTable): Promise<Table>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private restaurants: Map<number, Restaurant>;
  private tables: Map<number, Table>;
  private bookings: Map<number, Booking>;
  private customers: Map<number, Customer>;
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentTableId: number;
  private currentBookingId: number;
  private currentCustomerId: number;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.tables = new Map();
    this.bookings = new Map();
    this.customers = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentTableId = 1;
    this.currentBookingId = 1;
    this.currentCustomerId = 1;
    
    this.seedData();
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

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const restaurant: Restaurant = {
      ...insertRestaurant,
      id: this.currentRestaurantId++,
      createdAt: new Date()
    };
    this.restaurants.set(restaurant.id, restaurant);
    return restaurant;
  }

  async getTablesByRestaurant(restaurantId: number): Promise<Table[]> {
    return Array.from(this.tables.values()).filter(table => table.restaurantId === restaurantId);
  }

  async createTable(insertTable: InsertTable): Promise<Table> {
    const table: Table = {
      ...insertTable,
      id: this.currentTableId++
    };
    this.tables.set(table.id, table);
    return table;
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
}

export const storage = new MemStorage();
