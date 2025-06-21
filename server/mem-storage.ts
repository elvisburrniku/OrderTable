import type { IStorage } from "./storage";
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
  InsertNotification
} from "@shared/schema";

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private tenants: any[] = [];
  private tenantUsers: any[] = [];
  private restaurants: Restaurant[] = [];
  private tables: Table[] = [];
  private bookings: Booking[] = [];
  private customers: Customer[] = [];
  private rooms: Room[] = [];
  private smsMessages: SmsMessage[] = [];
  private waitingList: WaitingList[] = [];
  private feedback: Feedback[] = [];
  private activityLog: ActivityLog[] = [];
  private timeSlots: TimeSlots[] = [];
  private subscriptionPlans: SubscriptionPlan[] = [];
  private userSubscriptions: UserSubscription[] = [];
  private combinedTables: CombinedTable[] = [];
  private tableLayouts: TableLayout[] = [];
  private openingHours: any[] = [];
  private specialPeriods: any[] = [];
  private cutOffTimes: any[] = [];
  private bookingChangeRequests: any[] = [];
  private notifications: Notification[] = [];
  private integrationConfigurations: any[] = [];
  private webhooks: any[] = [];
  private reschedulingSuggestions: any[] = [];
  private printOrders: any[] = [];

  private nextId = 1;

  async initialize() {
    // Initialize with default subscription plans
    await this.initializeSubscriptionPlans();
    // Initialize demo data for testing
    await this.initializeDemoData();
  }

  private async initializeSubscriptionPlans() {
    const defaultPlans = [
      {
        id: 1,
        name: "Free",
        price: 0,
        interval: "monthly",
        features: JSON.stringify(["Basic booking management", "Up to 10 tables", "Email notifications"]),
        maxTables: 10,
        maxBookingsPerMonth: 100,
        maxRestaurants: 1,
        trialDays: 0,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 2,
        name: "Pro",
        price: 2900,
        interval: "monthly", 
        features: JSON.stringify(["Advanced analytics", "Unlimited tables", "SMS notifications", "API access"]),
        maxTables: -1,
        maxBookingsPerMonth: -1,
        maxRestaurants: 3,
        trialDays: 14,
        isActive: true,
        createdAt: new Date()
      }
    ];

    for (const plan of defaultPlans) {
      if (!this.subscriptionPlans.find(p => p.id === plan.id)) {
        this.subscriptionPlans.push(plan as SubscriptionPlan);
      }
    }
    this.nextId = Math.max(this.nextId, ...this.subscriptionPlans.map(p => p.id), 0) + 1;
  }

  private async initializeDemoData() {
    // Create demo tenant
    if (this.tenants.length === 0) {
      const demoTenant = {
        id: 1,
        name: "Demo Restaurant Group",
        slug: "demo",
        subscriptionPlanId: 1,
        subscriptionStatus: "active",
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxRestaurants: 1,
        createdAt: new Date()
      };
      this.tenants.push(demoTenant);

      // Add test tenant for guest booking
      const testTenant = {
        id: 5,
        name: "TROFTA Restaurant Group",
        slug: "trofta",
        subscriptionPlanId: 1,
        subscriptionStatus: "active",
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxRestaurants: 3,
        createdAt: new Date()
      };
      this.tenants.push(testTenant);
    }

    // Create demo user
    if (this.users.length === 0) {
      const demoUser = {
        id: 1,
        email: "demo@restaurant.com",
        password: "$2b$10$demohashedpassword",
        name: "Demo User",
        restaurantName: "Demo Restaurant",
        ssoProvider: null,
        ssoId: null,
        createdAt: new Date()
      };
      this.users.push(demoUser);

      // Create tenant user relationship
      this.tenantUsers.push({
        id: 1,
        tenantId: 1,
        userId: 1,
        role: "admin",
        createdAt: new Date()
      });
    }

    // Create demo restaurant
    if (this.restaurants.length === 0) {
      const demoRestaurant = {
        id: 1,
        tenantId: 1,
        name: "Demo Restaurant",
        address: "123 Main St, City, Country",
        phone: "+1234567890",
        email: "contact@demorestaurant.com",
        cuisine: "International",
        priceRange: "$$",
        capacity: 50,
        timezone: "UTC",
        websiteUrl: "https://demorestaurant.com",
        guestBookingEnabled: true,
        createdAt: new Date()
      };
      this.restaurants.push(demoRestaurant);

      // Add TROFTA restaurant for guest booking testing
      const troftaRestaurant = {
        id: 7,
        tenantId: 5,
        name: "TROFTA",
        address: "456 Fine Dining Ave, Gourmet District",
        phone: "+1-555-TROFTA",
        email: "reservations@trofta.com",
        cuisine: "Modern European",
        priceRange: "$$$",
        capacity: 120,
        timezone: "America/New_York",
        websiteUrl: "https://trofta.com",
        guestBookingEnabled: true,
        createdAt: new Date()
      };
      this.restaurants.push(troftaRestaurant);
    }

    this.nextId = Math.max(this.nextId, 10);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async getUserBySSOId(ssoProvider: string, ssoId: string): Promise<User | undefined> {
    return this.users.find(u => u.ssoProvider === ssoProvider && u.ssoId === ssoId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.nextId++,
      email: user.email,
      password: user.password || null,
      name: user.name,
      restaurantName: user.restaurantName || null,
      ssoProvider: user.ssoProvider || null,
      ssoId: user.ssoId || null,
      createdAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    this.users[index] = { ...this.users[index], ...updates };
    return this.users[index];
  }

  async deleteUserAccount(userId: number): Promise<void> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users.splice(userIndex, 1);
    }
    
    // Remove related data
    this.restaurants = this.restaurants.filter(r => r.userId !== userId);
    this.tenantUsers = this.tenantUsers.filter(tu => tu.userId !== userId);
    this.userSubscriptions = this.userSubscriptions.filter(us => us.userId !== userId);
  }

  // Tenants
  async createTenant(tenant: any): Promise<any> {
    const newTenant = {
      id: this.nextId++,
      ...tenant,
      createdAt: new Date()
    };
    this.tenants.push(newTenant);
    return newTenant;
  }

  async getTenantById(id: number): Promise<any> {
    return this.tenants.find(t => t.id === id);
  }

  async getTenantByUserId(userId: number): Promise<any> {
    const tenantUser = this.tenantUsers.find(tu => tu.userId === userId);
    if (!tenantUser) return undefined;
    return this.tenants.find(t => t.id === tenantUser.tenantId);
  }

  async getTenantByStripeCustomerId(stripeCustomerId: string): Promise<any> {
    return this.tenants.find(t => t.stripeCustomerId === stripeCustomerId);
  }

  async getAllTenants(): Promise<any[]> {
    return this.tenants;
  }

  async updateTenant(id: number, updates: any): Promise<any> {
    const index = this.tenants.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    
    this.tenants[index] = { ...this.tenants[index], ...updates };
    return this.tenants[index];
  }

  async createTenantUser(tenantUser: any): Promise<any> {
    const newTenantUser = {
      ...tenantUser,
      createdAt: new Date()
    };
    this.tenantUsers.push(newTenantUser);
    return newTenantUser;
  }

  // Restaurants
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.find(r => r.id === id);
  }

  async getRestaurantByUserId(userId: number): Promise<Restaurant | undefined> {
    return this.restaurants.find(r => r.userId === userId);
  }

  async getRestaurantById(id: number): Promise<Restaurant | undefined> {
    return this.getRestaurant(id);
  }

  async getRestaurantsByTenantId(tenantId: number): Promise<Restaurant[]> {
    return this.restaurants.filter(r => r.tenantId === tenantId);
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const newRestaurant: Restaurant = {
      id: this.nextId++,
      tenantId: restaurant.tenantId,
      name: restaurant.name,
      userId: restaurant.userId,
      address: restaurant.address || null,
      phone: restaurant.phone || null,
      email: restaurant.email || null,
      description: restaurant.description || null,
      setupCompleted: restaurant.setupCompleted || false,
      createdAt: new Date(),
      emailSettings: restaurant.emailSettings || null
    };
    this.restaurants.push(newRestaurant);
    return newRestaurant;
  }

  async updateRestaurant(id: number, updates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    const index = this.restaurants.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    
    this.restaurants[index] = { ...this.restaurants[index], ...updates };
    return this.restaurants[index];
  }

  // Subscription Plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlans;
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.find(p => p.id === id);
  }

  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.find(p => p.id === id);
  }

  async getFreePlan(): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.find(p => p.price === 0 && p.isActive);
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const newPlan: SubscriptionPlan = {
      id: this.nextId++,
      name: plan.name,
      price: plan.price,
      interval: plan.interval || "monthly",
      features: plan.features,
      maxTables: plan.maxTables || 10,
      maxBookingsPerMonth: plan.maxBookingsPerMonth || 100,
      maxRestaurants: plan.maxRestaurants || 1,
      trialDays: plan.trialDays || 14,
      isActive: plan.isActive !== false,
      createdAt: new Date()
    };
    this.subscriptionPlans.push(newPlan);
    return newPlan;
  }

  // Stub implementations for other methods
  async getTablesByRestaurant(restaurantId: number): Promise<Table[]> {
    return this.tables.filter(t => t.restaurantId === restaurantId);
  }

  async createTable(table: InsertTable): Promise<Table> {
    const newTable: Table = {
      id: this.nextId++,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      restaurantId: table.restaurantId,
      tenantId: table.tenantId,
      status: table.status || "available",
      roomId: table.roomId || null,
      createdAt: new Date()
    };
    this.tables.push(newTable);
    return newTable;
  }

  async updateTable(id: number, updates: Partial<Table>): Promise<Table | undefined> {
    const index = this.tables.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    
    this.tables[index] = { ...this.tables[index], ...updates };
    return this.tables[index];
  }

  async deleteTable(id: number): Promise<boolean> {
    const index = this.tables.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.tables.splice(index, 1);
    return true;
  }

  async getBookingsByRestaurant(restaurantId: number): Promise<Booking[]> {
    return this.bookings.filter(b => b.restaurantId === restaurantId);
  }

  async getBookingsByDate(restaurantId: number, date: string): Promise<Booking[]> {
    return this.bookings.filter(b => 
      b.restaurantId === restaurantId && 
      b.bookingDate === date
    );
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const newBooking: Booking = {
      id: this.nextId++,
      customerId: booking.customerId,
      restaurantId: booking.restaurantId,
      tenantId: booking.tenantId,
      tableId: booking.tableId || null,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      partySize: booking.partySize,
      status: booking.status || "confirmed",
      notes: booking.notes || null,
      managementHash: booking.managementHash || null,
      createdAt: new Date()
    };
    this.bookings.push(newBooking);
    return newBooking;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return undefined;
    
    this.bookings[index] = { ...this.bookings[index], ...updates };
    return this.bookings[index];
  }

  async deleteBooking(id: number): Promise<boolean> {
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return false;
    
    this.bookings.splice(index, 1);
    return true;
  }

  async getBookingCountForTenantThisMonth(tenantId: number): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    return this.bookings.filter(booking => 
      booking.tenantId === tenantId &&
      booking.createdAt >= startOfMonth &&
      booking.createdAt < startOfNextMonth
    ).length;
  }

  async getCustomersByRestaurant(restaurantId: number): Promise<Customer[]> {
    return this.customers.filter(c => c.restaurantId === restaurantId);
  }

  async getCustomerByEmail(restaurantId: number, email: string): Promise<Customer | undefined> {
    return this.customers.find(c => c.restaurantId === restaurantId && c.email === email);
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer: Customer = {
      id: this.nextId++,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      restaurantId: customer.restaurantId,
      tenantId: customer.tenantId,
      notes: customer.notes || null,
      createdAt: new Date()
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    
    this.customers[index] = { ...this.customers[index], ...updates };
    return this.customers[index];
  }

  async getOrCreateCustomer(restaurantId: number, tenantId: number, customerData: { name: string; email: string; phone?: string }): Promise<Customer> {
    let customer = await this.getCustomerByEmail(restaurantId, customerData.email);
    if (!customer) {
      customer = await this.createCustomer({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        restaurantId,
        tenantId
      });
    }
    return customer;
  }

  async createWalkInCustomer(restaurantId: number, tenantId: number, customerData?: { name?: string; phone?: string; notes?: string }): Promise<Customer> {
    const walkInId = `walkin_${Date.now()}`;
    return this.createCustomer({
      name: customerData?.name || `Walk-in ${walkInId}`,
      email: `${walkInId}@walkin.local`,
      phone: customerData?.phone,
      restaurantId,
      tenantId,
      notes: customerData?.notes
    });
  }

  // User Subscriptions
  async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.find(s => s.userId === userId);
  }

  async getUserSubscriptionByStripeId(stripeSubscriptionId: string): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.find(s => s.stripeSubscriptionId === stripeSubscriptionId);
  }

  async getAllUserSubscriptions(): Promise<UserSubscription[]> {
    return this.userSubscriptions;
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const newSubscription: UserSubscription = {
      id: this.nextId++,
      userId: subscription.userId,
      subscriptionPlanId: subscription.subscriptionPlanId,
      stripeCustomerId: subscription.stripeCustomerId || null,
      stripeSubscriptionId: subscription.stripeSubscriptionId || null,
      status: subscription.status || "active",
      currentPeriodStart: subscription.currentPeriodStart || new Date(),
      currentPeriodEnd: subscription.currentPeriodEnd || new Date(),
      createdAt: new Date()
    };
    this.userSubscriptions.push(newSubscription);
    return newSubscription;
  }

  async updateUserSubscription(id: number, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const index = this.userSubscriptions.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    this.userSubscriptions[index] = { ...this.userSubscriptions[index], ...updates };
    return this.userSubscriptions[index];
  }

  async getUserSubscriptionById(id: number): Promise<UserSubscription | undefined> {
    return this.userSubscriptions.find(s => s.id === id);
  }

  // Additional stub implementations for interface compliance
  async getTableById(id: number): Promise<Table | undefined> {
    return this.tables.find(t => t.id === id);
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    return this.bookings.find(b => b.id === id);
  }

  async getWaitingListEntryById(id: number): Promise<WaitingList | undefined> {
    return this.waitingList.find(w => w.id === id);
  }

  async getTimeSlotById(id: number): Promise<TimeSlots | undefined> {
    return this.timeSlots.find(t => t.id === id);
  }

  // All other methods return empty arrays or undefined for now
  async getSmsMessagesByRestaurant(restaurantId: number): Promise<SmsMessage[]> { return []; }
  async createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage> { 
    const newMessage: SmsMessage = { id: this.nextId++, ...message, createdAt: new Date() };
    this.smsMessages.push(newMessage);
    return newMessage;
  }
  async getWaitingListByRestaurant(restaurantId: number): Promise<WaitingList[]> {
    return this.waitingList.filter(entry => entry.restaurantId === restaurantId);
  }
  async createWaitingListEntry(entry: InsertWaitingList): Promise<WaitingList> { 
    const newEntry: WaitingList = { id: this.nextId++, ...entry, createdAt: new Date() };
    this.waitingList.push(newEntry);
    return newEntry;
  }
  async getWaitingListEntryById(id: number): Promise<WaitingList | undefined> {
    return this.waitingList.find(entry => entry.id === id);
  }

  async updateWaitingListEntry(id: number, updates: Partial<WaitingList>): Promise<WaitingList | undefined> {
    const index = this.waitingList.findIndex(entry => entry.id === id);
    if (index === -1) return undefined;
    
    this.waitingList[index] = { ...this.waitingList[index], ...updates };
    return this.waitingList[index];
  }

  async deleteWaitingListEntry(id: number): Promise<boolean> {
    const index = this.waitingList.findIndex(entry => entry.id === id);
    if (index === -1) return false;
    
    this.waitingList.splice(index, 1);
    return true;
  }
  async getFeedbackByRestaurant(restaurantId: number): Promise<Feedback[]> { return []; }
  async createFeedback(feedback: InsertFeedback): Promise<Feedback> { 
    const newFeedback: Feedback = { id: this.nextId++, ...feedback, createdAt: new Date() };
    this.feedback.push(newFeedback);
    return newFeedback;
  }
  async deleteFeedback(id: number): Promise<void> {
    const index = this.feedback.findIndex(f => f.id === id);
    if (index >= 0) {
      this.feedback.splice(index, 1);
    }
  }
  async getActivityLogByRestaurant(restaurantId: number): Promise<ActivityLog[]> { 
    return this.activityLog.filter(log => log.restaurantId === restaurantId);
  }

  async getActivityLogByTenant(tenantId: number): Promise<any[]> {
    const tenantLogs = this.activityLog.filter(log => log.tenantId === tenantId);
    
    // Add restaurant names to the logs
    return tenantLogs.map(log => {
      const restaurant = this.restaurants.find(r => r.id === log.restaurantId);
      return {
        ...log,
        restaurantName: restaurant?.name || `Restaurant ${log.restaurantId}`
      };
    });
  }
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> { 
    const newLog: ActivityLog = { id: this.nextId++, ...log, createdAt: new Date() };
    this.activityLog.push(newLog);
    return newLog;
  }

  async deleteOldActivityLogs(beforeDate: Date): Promise<number> {
    const initialCount = this.activityLog.length;
    this.activityLog = this.activityLog.filter(log => log.createdAt >= beforeDate);
    return initialCount - this.activityLog.length;
  }

  // Product Groups
  private productGroups: any[] = [];
  
  async getProductGroupsByRestaurant(restaurantId: number): Promise<any[]> {
    return this.productGroups.filter(group => group.restaurantId === restaurantId);
  }

  async createProductGroup(group: any): Promise<any> {
    const newGroup = { 
      id: this.nextId++, 
      ...group, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.productGroups.push(newGroup);
    return newGroup;
  }

  async updateProductGroup(id: number, updates: any): Promise<any> {
    const index = this.productGroups.findIndex(group => group.id === id);
    if (index >= 0) {
      this.productGroups[index] = { 
        ...this.productGroups[index], 
        ...updates, 
        updatedAt: new Date() 
      };
      return this.productGroups[index];
    }
    return undefined;
  }

  async deleteProductGroup(id: number): Promise<void> {
    const index = this.productGroups.findIndex(group => group.id === id);
    if (index >= 0) {
      this.productGroups.splice(index, 1);
    }
  }

  // Products
  private products: any[] = [];
  
  async getProductsByRestaurant(restaurantId: number): Promise<any[]> {
    return this.products
      .filter(product => product.restaurantId === restaurantId)
      .map(product => {
        const category = this.productGroups.find(group => group.id === product.categoryId);
        return {
          ...product,
          categoryName: category?.groupName || 'Unknown Category'
        };
      });
  }

  async createProduct(product: any): Promise<any> {
    const newProduct = { 
      id: this.nextId++, 
      ...product, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: number, updates: any): Promise<any> {
    const index = this.products.findIndex(product => product.id === id);
    if (index >= 0) {
      this.products[index] = { 
        ...this.products[index], 
        ...updates, 
        updatedAt: new Date() 
      };
      return this.products[index];
    }
    return undefined;
  }

  async deleteProduct(id: number): Promise<void> {
    const index = this.products.findIndex(product => product.id === id);
    if (index >= 0) {
      this.products.splice(index, 1);
    }
  }

  // Payment Setups
  private paymentSetups: any[] = [];
  
  async getPaymentSetupsByRestaurant(restaurantId: number): Promise<any[]> {
    return this.paymentSetups
      .filter(setup => setup.restaurantId === restaurantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createPaymentSetup(setup: any): Promise<any> {
    const newSetup = { 
      id: this.nextId++, 
      ...setup, 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.paymentSetups.push(newSetup);
    return newSetup;
  }

  async updatePaymentSetup(id: number, updates: any): Promise<any> {
    const index = this.paymentSetups.findIndex(setup => setup.id === id);
    if (index >= 0) {
      this.paymentSetups[index] = { 
        ...this.paymentSetups[index], 
        ...updates, 
        updatedAt: new Date() 
      };
      return this.paymentSetups[index];
    }
    return undefined;
  }

  async deletePaymentSetup(id: number): Promise<void> {
    const index = this.paymentSetups.findIndex(setup => setup.id === id);
    if (index >= 0) {
      this.paymentSetups.splice(index, 1);
    }
  }
  async getTimeSlotsByRestaurant(restaurantId: number, date?: string): Promise<TimeSlots[]> { return []; }
  async createTimeSlot(slot: InsertTimeSlots): Promise<TimeSlots> { 
    const newSlot: TimeSlots = { id: this.nextId++, ...slot, createdAt: new Date() };
    this.timeSlots.push(newSlot);
    return newSlot;
  }
  async updateTimeSlot(id: number, updates: Partial<TimeSlots>): Promise<TimeSlots | undefined> { return undefined; }
  async getRoomsByRestaurant(restaurantId: number): Promise<Room[]> { 
    return this.rooms.filter(room => room.restaurantId === restaurantId);
  }
  async getRoomById(id: number): Promise<Room | undefined> { 
    return this.rooms.find(room => room.id === id);
  }
  async createRoom(room: InsertRoom): Promise<Room> { 
    const newRoom: Room = { id: this.nextId++, ...room, createdAt: new Date() };
    this.rooms.push(newRoom);
    return newRoom;
  }
  async updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined> { 
    const roomIndex = this.rooms.findIndex(room => room.id === id);
    if (roomIndex === -1) {
      return undefined;
    }
    
    this.rooms[roomIndex] = { ...this.rooms[roomIndex], ...updates };
    return this.rooms[roomIndex];
  }
  async deleteRoom(id: number): Promise<boolean> { 
    const roomIndex = this.rooms.findIndex(room => room.id === id);
    if (roomIndex === -1) {
      return false;
    }
    
    this.rooms.splice(roomIndex, 1);
    return true;
  }
  async getCombinedTablesByRestaurant(restaurantId: number): Promise<any[]> { return []; }
  async createCombinedTable(data: any): Promise<any> { return { id: this.nextId++, ...data }; }
  async updateCombinedTable(id: number, updates: any): Promise<any> { return undefined; }
  async deleteCombinedTable(id: number): Promise<boolean> { return false; }
  async getCombinedTableById(id: number): Promise<any> { return undefined; }
  async getTableLayout(restaurantId: number, room: string): Promise<TableLayout | undefined> { return undefined; }
  async saveTableLayout(restaurantId: number, tenantId: number, room: string, positions: any): Promise<TableLayout> { 
    const layout: TableLayout = { id: this.nextId++, restaurantId, tenantId, room, positions: JSON.stringify(positions), createdAt: new Date() };
    this.tableLayouts.push(layout);
    return layout;
  }
  async getOpeningHoursByRestaurant(restaurantId: number): Promise<any> { 
    return this.openingHours.filter(h => h.restaurantId === restaurantId).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }
  
  async createOrUpdateOpeningHours(restaurantId: number, tenantId: number, hoursData: any[]): Promise<any> { 
    // Remove existing hours for this restaurant
    this.openingHours = this.openingHours.filter(h => h.restaurantId !== restaurantId);
    
    // Add new hours
    if (hoursData && hoursData.length > 0) {
      const newHours = hoursData.map(hour => ({
        id: this.nextId++,
        restaurantId,
        tenantId,
        dayOfWeek: hour.dayOfWeek,
        isOpen: hour.isOpen,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      this.openingHours.push(...newHours);
      return newHours;
    }
    
    return [];
  }

  async getOpeningHours(tenantId: number, restaurantId: number): Promise<any[]> {
    return this.openingHours.filter(hour => 
      hour.restaurantId === restaurantId && hour.tenantId === tenantId
    ).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  async createOpeningHour(hourData: any): Promise<any> {
    const newHour = {
      id: this.nextId++,
      ...hourData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.openingHours.push(newHour);
    return newHour;
  }

  async clearOpeningHours(tenantId: number, restaurantId: number): Promise<void> {
    this.openingHours = this.openingHours.filter(hour => 
      !(hour.restaurantId === restaurantId && hour.tenantId === tenantId)
    );
  }
  async getSpecialPeriodsByRestaurant(restaurantId: number): Promise<any> { 
    return this.specialPeriods.filter(period => period.restaurantId === restaurantId);
  }
  async createSpecialPeriod(periodData: any): Promise<any> { 
    const newPeriod = { 
      id: this.nextId++, 
      ...periodData,
      createdAt: new Date()
    };
    this.specialPeriods.push(newPeriod);
    return newPeriod;
  }
  async updateSpecialPeriod(id: number, updates: any): Promise<any> { 
    const index = this.specialPeriods.findIndex(period => period.id === id);
    if (index !== -1) {
      this.specialPeriods[index] = { ...this.specialPeriods[index], ...updates };
      return this.specialPeriods[index];
    }
    return null;
  }
  async deleteSpecialPeriod(id: number): Promise<boolean> { 
    const index = this.specialPeriods.findIndex(period => period.id === id);
    if (index !== -1) {
      this.specialPeriods.splice(index, 1);
      return true;
    }
    return false;
  }
  async getCutOffTimesByRestaurant(restaurantId: number): Promise<any> { 
    return this.cutOffTimes.filter(time => time.restaurantId === restaurantId);
  }
  async createOrUpdateCutOffTimes(restaurantId: number, tenantId: number, timesData: any[]): Promise<any> { 
    // Remove existing cut-off times for this restaurant
    this.cutOffTimes = this.cutOffTimes.filter(time => time.restaurantId !== restaurantId);
    
    // Add new cut-off times
    const newCutOffTimes = timesData.map((timeData) => ({
      id: this.nextId++,
      restaurantId,
      tenantId,
      dayOfWeek: timeData.dayOfWeek,
      cutOffHours: timeData.cutOffHours,
      isEnabled: timeData.isEnabled !== undefined ? timeData.isEnabled : true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    this.cutOffTimes.push(...newCutOffTimes);
    return { success: true, data: newCutOffTimes };
  }
  async isRestaurantOpen(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> { return true; }
  async isBookingAllowed(restaurantId: number, bookingDate: Date, bookingTime: string): Promise<boolean> { 
    // Get cut-off times for this restaurant
    const cutOffTimes = this.cutOffTimes.filter(time => time.restaurantId === restaurantId && time.isEnabled);
    
    if (cutOffTimes.length === 0) {
      return true; // No cut-off times configured, allow booking
    }
    
    // Get the day of week for the booking date (0 = Sunday, 1 = Monday, etc.)
    const bookingDayOfWeek = bookingDate.getDay();
    
    // Find cut-off time for this day
    const cutOffTime = cutOffTimes.find(time => time.dayOfWeek === bookingDayOfWeek);
    
    if (!cutOffTime || cutOffTime.cutOffHours === 0) {
      return true; // No cut-off time for this day or set to "None"
    }
    
    // Create booking datetime by combining date and time
    const [hours, minutes] = bookingTime.split(':').map(Number);
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);
    
    // Calculate cut-off datetime (current time + cut-off hours)
    const now = new Date();
    const cutOffDateTime = new Date(now.getTime() + (cutOffTime.cutOffHours * 60 * 60 * 1000));
    
    // Check if booking time is after the cut-off time
    return bookingDateTime > cutOffDateTime;
  }
  async getBookingChangeRequestsByBookingId(bookingId: number): Promise<any[]> { return []; }
  async getBookingChangeRequestsByRestaurant(restaurantId: number): Promise<any[]> { return []; }
  async createBookingChangeRequest(request: any): Promise<any> { return { id: this.nextId++, ...request }; }
  async updateBookingChangeRequest(id: number, updates: any): Promise<any> { return undefined; }
  async getBookingChangeRequestById(id: number): Promise<any> { return undefined; }
  async getNotificationsByRestaurant(restaurantId: number): Promise<any[]> { return []; }
  async createNotification(notification: any): Promise<any> { return { id: this.nextId++, ...notification }; }
  async markNotificationAsRead(id: number): Promise<any> { return undefined; }
  async markAllNotificationsAsRead(restaurantId: number): Promise<void> { }
  async revertNotification(notificationId: number, userEmail: string): Promise<boolean> { return false; }
  async deleteNotification(id: number): Promise<boolean> { return false; }
  async getIntegrationConfigurationsByRestaurant(restaurantId: number): Promise<any[]> { 
    return this.integrationConfigurations.filter(config => config.restaurantId === restaurantId);
  }
  
  async getIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<any> { 
    return this.integrationConfigurations.find(config => 
      config.restaurantId === restaurantId && config.integrationId === integrationId
    );
  }

  async getIntegrationByRestaurantAndType(restaurantId: number, integrationType: string): Promise<any> {
    return this.integrationConfigurations.find(config => 
      config.restaurantId === restaurantId && config.integrationId === integrationType
    );
  }
  
  async createOrUpdateIntegrationConfiguration(restaurantId: number, tenantId: number, integrationId: string, isEnabled: boolean, configuration?: any): Promise<any> { 
    const existingIndex = this.integrationConfigurations.findIndex(config => 
      config.restaurantId === restaurantId && config.integrationId === integrationId
    );
    
    const configData = {
      id: existingIndex >= 0 ? this.integrationConfigurations[existingIndex].id : this.nextId++,
      restaurantId,
      tenantId,
      integrationId,
      isEnabled,
      configuration: configuration || {},
      createdAt: existingIndex >= 0 ? this.integrationConfigurations[existingIndex].createdAt : new Date(),
      updatedAt: new Date()
    };
    
    if (existingIndex >= 0) {
      this.integrationConfigurations[existingIndex] = configData;
    } else {
      this.integrationConfigurations.push(configData);
    }
    
    return configData;
  }
  
  async deleteIntegrationConfiguration(restaurantId: number, integrationId: string): Promise<boolean> { 
    const index = this.integrationConfigurations.findIndex(config => 
      config.restaurantId === restaurantId && config.integrationId === integrationId
    );
    
    if (index >= 0) {
      this.integrationConfigurations.splice(index, 1);
      return true;
    }
    return false;
  }
  
  async getWebhooksByRestaurant(restaurantId: number): Promise<any[]> { 
    return this.webhooks.filter(webhook => webhook.restaurantId === restaurantId);
  }
  
  async saveWebhooks(restaurantId: number, tenantId: number, webhooksData: any[]): Promise<any[]> { 
    // Remove existing webhooks for this restaurant
    this.webhooks = this.webhooks.filter(webhook => webhook.restaurantId !== restaurantId);
    
    // Add new webhooks
    const savedWebhooks = webhooksData.map(webhook => ({
      id: this.nextId++,
      restaurantId,
      tenantId,
      event: webhook.event,
      url: webhook.url,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    this.webhooks.push(...savedWebhooks);
    return savedWebhooks;
  }
  async getReschedulingSuggestionsByRestaurant(restaurantId: number): Promise<any[]> { return []; }
  async getReschedulingSuggestionsByBooking(bookingId: number): Promise<any[]> { return []; }
  async createReschedulingSuggestion(suggestion: any): Promise<any> { return { id: this.nextId++, ...suggestion }; }
  async updateReschedulingSuggestion(id: number, updates: any): Promise<any> { return undefined; }
  async getReschedulingSuggestionById(id: number): Promise<any> { return undefined; }
  async deleteReschedulingSuggestion(id: number): Promise<boolean> { return false; }
  async deleteExpiredReschedulingSuggestions(): Promise<void> { }

  // Auto-assignment methods
  async getUnassignedBookings(): Promise<Booking[]> {
    return this.bookings.filter(booking => 
      booking.status === 'confirmed' && 
      (booking.tableId === null || booking.tableId === undefined)
    );
  }

  async getBookingsByDateAndRestaurant(date: string, restaurantId: number): Promise<Booking[]> {
    return this.bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate).toISOString().split('T')[0];
      return bookingDate === date && booking.restaurantId === restaurantId;
    });
  }
}