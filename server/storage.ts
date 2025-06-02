import { 
  users, 
  restaurants, 
  bookings, 
  customers,
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Booking,
  type InsertBooking,
  type Customer,
  type InsertCustomer
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Restaurant methods
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantByOwnerId(ownerId: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant & { ownerId: number }): Promise<Restaurant>;
  
  // Booking methods
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByRestaurant(restaurantId: number): Promise<Booking[]>;
  getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking & { restaurantId: number }): Promise<Booking>;
  updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomersByRestaurant(restaurantId: number): Promise<Customer[]>;
  searchCustomers(restaurantId: number, query: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer & { restaurantId: number }): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private restaurants: Map<number, Restaurant> = new Map();
  private bookings: Map<number, Booking> = new Map();
  private customers: Map<number, Customer> = new Map();
  private currentUserId = 1;
  private currentRestaurantId = 1;
  private currentBookingId = 1;
  private currentCustomerId = 1;

  constructor() {
    // Add demo data
    this.seedData();
  }

  private async seedData() {
    // Create demo user and restaurant
    const demoUser = await this.createUser({
      username: "demo",
      password: "demo123",
      email: "demo@restaurant.com",
      restaurantName: "Demo Restaurant"
    });

    const demoRestaurant = await this.createRestaurant({
      name: "Demo Restaurant",
      ownerId: demoUser.id,
      address: "123 Main Street, Copenhagen",
      phone: "+45 12 34 56 78",
      email: "info@demorestaurant.com",
      description: "A beautiful restaurant with modern cuisine",
      tables: 12
    });

    // Add some demo bookings
    await this.createBooking({
      restaurantId: demoRestaurant.id,
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerPhone: "+45 98 76 54 32",
      date: "2025-01-15",
      time: "19:00",
      partySize: 4,
      tableNumber: 5,
      notes: "Window table preferred"
    });

    await this.createBooking({
      restaurantId: demoRestaurant.id,
      customerName: "Emma Johnson",
      customerEmail: "emma@example.com",
      customerPhone: "+45 87 65 43 21",
      date: "2025-01-15",
      time: "20:30",
      partySize: 2,
      tableNumber: 8,
      notes: "Anniversary dinner"
    });

    // Add demo customers
    await this.createCustomer({
      restaurantId: demoRestaurant.id,
      name: "John Smith",
      email: "john@example.com",
      phone: "+45 98 76 54 32"
    });

    await this.createCustomer({
      restaurantId: demoRestaurant.id,
      name: "Emma Johnson",
      email: "emma@example.com",
      phone: "+45 87 65 43 21"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      role: "owner",
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Restaurant methods
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async getRestaurantByOwnerId(ownerId: number): Promise<Restaurant | undefined> {
    return Array.from(this.restaurants.values()).find(restaurant => restaurant.ownerId === ownerId);
  }

  async createRestaurant(restaurant: InsertRestaurant & { ownerId: number }): Promise<Restaurant> {
    const id = this.currentRestaurantId++;
    const newRestaurant: Restaurant = { 
      ...restaurant, 
      id,
      createdAt: new Date()
    };
    this.restaurants.set(id, newRestaurant);
    return newRestaurant;
  }

  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.restaurantId === restaurantId);
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.restaurantId === restaurantId && booking.date === date
    );
  }

  async createBooking(booking: InsertBooking & { restaurantId: number }): Promise<Booking> {
    const id = this.currentBookingId++;
    const newBooking: Booking = { 
      ...booking, 
      id,
      status: "confirmed",
      createdAt: new Date()
    };
    this.bookings.set(id, newBooking);
    return newBooking;
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

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomersByRestaurant(restaurantId: number): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(customer => customer.restaurantId === restaurantId);
  }

  async searchCustomers(restaurantId: number, query: string): Promise<Customer[]> {
    const customers = await this.getCustomersByRestaurant(restaurantId);
    if (!query) return customers;
    
    const searchTerm = query.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm) ||
      (customer.phone && customer.phone.includes(searchTerm))
    );
  }

  async createCustomer(customer: InsertCustomer & { restaurantId: number }): Promise<Customer> {
    const id = this.currentCustomerId++;
    const newCustomer: Customer = { 
      ...customer, 
      id,
      totalBookings: 0,
      lastVisit: null,
      createdAt: new Date()
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
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
