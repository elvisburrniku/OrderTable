import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertBookingSchema, insertCustomerSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertCompanyRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import * as tenantRoutes from "./tenant-routes";
import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import { users, tenants, tenantUsers, restaurants, subscriptionPlans } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { BrevoEmailService } from "./brevo-service";
import { BookingHash } from "./booking-hash";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key', {
  apiVersion: '2025-05-28.basil'
});

// Initialize email service, passing API key from environment variables
let emailService: BrevoEmailService | null = null;
try {
  if (process.env.BREVO_API_KEY) {
    emailService = new BrevoEmailService();
    console.log('Email service initialized successfully with Brevo API key');
  } else {
    console.log('No BREVO_API_KEY found - email notifications disabled');
  }
} catch (error) {
  console.error('Failed to initialize email service:', error);
  emailService = null;
}

// WebSocket connections store
const wsConnections = new Map<string, Set<WebSocket>>();

// Broadcast notification to all connected clients for a restaurant
function broadcastNotification(restaurantId: number, notification: any) {
  const restaurantKey = `restaurant_${restaurantId}`;
  const connections = wsConnections.get(restaurantKey);

  console.log(`Broadcasting notification for restaurant ${restaurantId}, connections found: ${connections ? connections.size : 0}`);

  if (connections && connections.size > 0) {
    const message = JSON.stringify(notification);
    let sentCount = 0;
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });
    console.log(`Notification sent to ${sentCount} clients for restaurant ${restaurantId}`);
  } else {
    console.log(`No active connections found for restaurant ${restaurantId}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to extract and validate tenant ID
  const validateTenant = async (req: any, res: any, next: any) => {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }

    req.tenantId = parseInt(tenantId as string);
    next();
  };

  // Company Registration route
  app.post("/api/auth/register-company", async (req, res) => {
    try {
      const { companyName, email, password, name, restaurantName, planId } = insertCompanyRegistrationSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Get free trial plan if no plan specified
      const plan = planId 
        ? await storage.getSubscriptionPlan(planId)
        : (await storage.getSubscriptionPlans()).find(p => p.name === "Free Trial");

      if (!plan) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant with trial period
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);

      const tenant = await storage.createTenant({
        name: companyName,
        slug,
        subscriptionPlanId: plan.id,
        subscriptionStatus: "trial",
        trialEndDate,
        maxRestaurants: plan.maxRestaurants
      });

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        restaurantName
      });

      // Link user to tenant
      await storage.createTenantUser({
        tenantId: tenant.id,
        userId: user.id,
        role: "administrator"
      });

      // Create first restaurant
      const restaurant = await storage.createRestaurant({
        tenantId: tenant.id,
        name: restaurantName,
        userId: user.id,
        emailSettings: JSON.stringify({})
      });

      res.status(201).json({
        message: "Company created successfully",
        user: { id: user.id, email: user.email, name: user.name },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        restaurant: { id: restaurant.id, name: restaurant.name },
        trialEndsAt: trialEndDate
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // Session validation endpoint
  app.get("/api/auth/validate", async (req, res) => {
    try {
      // Check if user is logged in via session or stored data
      // For now, we'll accept any request as valid since we're using localStorage
      // In a real app, you'd check session cookies or JWT tokens here
      res.json({ 
        valid: true,
        message: "Session valid"
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid session" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password with bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Get user's tenant information
      const tenantUser = await storage.getTenantByUserId(user.id);
      if (!tenantUser) {
        return res.status(401).json({ message: "User not associated with any tenant" });
      }

      const restaurant = await storage.getRestaurantByUserId(user.id);

      res.json({ 
        user: { ...user, password: undefined },
        tenant: tenantUser,
        restaurant: restaurant ? { ...restaurant, tenantId: restaurant.tenantId || tenantUser.id } : null
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // User password change route
  app.put("/api/users/:userId/change-password", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Get user from database
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      const updatedUser = await storage.updateUser(userId, { password: hashedNewPassword });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User profile update route
  app.put("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      // Check if email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Email is already taken by another user" });
      }

      // Update user in database
      const updatedUser = await storage.updateUser(userId, { name, email });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: "User updated successfully",
        user: { ...updatedUser, password: undefined } // Don't send password
      });
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.flatten().fieldErrors 
        });
      }

      const { email, password, name, restaurantName } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Get free trial plan
      const plans = await storage.getSubscriptionPlans();
      const trialPlan = plans.find(p => p.name === "Free Trial") || plans[0];

      if (!trialPlan) {
        return res.status(400).json({ message: "No subscription plan available" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant for the new user
      const slug = (restaurantName || 'restaurant').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + (trialPlan.trialDays || 30));

      const tenant = await storage.createTenant({
        name: restaurantName || 'New Restaurant',
        slug,
        subscriptionPlanId: trialPlan.id,
        subscriptionStatus: "trial",
        trialEndDate,
        maxRestaurants: trialPlan.maxRestaurants || 1
      });

      // Create user using storage method
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        restaurantName
      });

      // Link user to tenant
      await storage.createTenantUser({
        tenantId: tenant.id,
        userId: newUser.id,
        role: "administrator"
      });

      // Create restaurant for the user
      const newRestaurant = await storage.createRestaurant({
        name: restaurantName || 'New Restaurant',
        userId: newUser.id,
        tenantId: tenant.id,
        emailSettings: JSON.stringify({})
      });

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          restaurantName: newUser.restaurantName
        },
        restaurant: newRestaurant,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Multi-restaurant tenant routes
  app.get("/api/tenants/:tenantId/restaurants", validateTenant, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.tenantId);

      // Get all restaurants that belong to this tenant
      const tenantRestaurants = await storage.db
        .select()
        .from(restaurants)
        .where(eq(restaurants.tenantId, tenantId));

      res.json(tenantRestaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new restaurant for a tenant
  app.post("/api/tenants/:tenantId/restaurants", validateTenant, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      const { name, userId, email, address, phone, emailSettings } = req.body;

      if (!name || !userId) {
        return res.status(400).json({ message: "Restaurant name and user ID are required" });
      }

      // Verify that the tenant exists and user has permission
      const tenant = await storage.db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant.length) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Check if user belongs to this tenant
      const tenantUser = await storage.db
        .select()
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.userId, userId)
          )
        );

      if (!tenantUser.length) {
        return res.status(403).json({ message: "User does not belong to this tenant" });
      }

      // Check tenant's restaurant limit
      const existingRestaurants = await storage.db
        .select()
        .from(restaurants)
        .where(eq(restaurants.tenantId, tenantId));

      if (existingRestaurants.length >= (tenant[0].maxRestaurants || 1)) {
        return res.status(400).json({ 
          message: `Restaurant limit reached. This tenant can have maximum ${tenant[0].maxRestaurants || 1} restaurants.` 
        });
      }

      const restaurant = await storage.createRestaurant({
        name,
        userId,
        tenantId,
        email: email || null,
        address: address || null,
        phone: phone || null,
        emailSettings: emailSettings ? JSON.stringify(emailSettings) : JSON.stringify({})
      });

      res.status(201).json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // All tenant-restaurant routes now properly namespaced
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/bookings", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { date } = req.query;

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      let bookings;
      if (date && typeof date === 'string') {
        bookings = await storage.getBookingsByDate(restaurantId, date);
      } else {
        bookings = await storage.getBookingsByRestaurant(restaurantId);
      }

      res.json(bookings);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/bookings", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get or create customer first
      const customer = await storage.getOrCreateCustomer(restaurantId, tenantId, {
        name: req.body.customerName,
        email: req.body.customerEmail,
        phone: req.body.customerPhone
      });

      const bookingData = insertBookingSchema.parse({
        ...req.body,
        restaurantId,
        tenantId,
        customerId: customer.id,
        bookingDate: new Date(req.body.bookingDate)
      });

      const booking = await storage.createBooking(bookingData);

      // Send email notifications if Brevo is configured
      if (emailService) {
        console.log('Email service available - processing notifications for booking', booking.id);
        try {
          let emailSettings = null;

          // Parse email settings if they exist
          if (restaurant?.emailSettings) {
            try {
              emailSettings = JSON.parse(restaurant.emailSettings);
              console.log('Email settings loaded:', emailSettings);
            } catch (e) {
              console.warn("Failed to parse email settings, using defaults");
            }
          } else {
            console.log('No email settings found - using defaults (all notifications enabled)');
          }

          // Send confirmation email to customer if enabled (default: true)
          const shouldSendGuestConfirmation = emailSettings?.guestSettings?.sendBookingConfirmation !== false;
          console.log('Should send guest confirmation:', shouldSendGuestConfirmation);

          if (shouldSendGuestConfirmation) {
            console.log('Sending booking confirmation email to:', req.body.customerEmail);
            await emailService.sendBookingConfirmation(
              req.body.customerEmail,
              req.body.customerName,
              {
                ...bookingData,
                tableNumber: booking.tableId,
                id: booking.id
              }
            );
            console.log('Guest confirmation email sent successfully');
          }

          // Send notification to restaurant if enabled (default: true)
          const shouldSendRestaurantNotification = emailSettings?.placeSettings?.emailBooking !== false;
          const restaurantEmail = emailSettings?.placeSettings?.sentTo || restaurant?.email;
          console.log('Should send restaurant notification:', shouldSendRestaurantNotification, 'to email:', restaurantEmail);

          if (shouldSendRestaurantNotification && restaurantEmail) {
            console.log('Sending restaurant notification email to:', restaurantEmail);
            await emailService.sendRestaurantNotification(restaurantEmail, {
              customerName: req.body.customerName,
              customerEmail: req.body.customerEmail,
              customerPhone: req.body.customerPhone,
              ...bookingData
            });
            console.log('Restaurant notification email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          // Don't fail the booking if email fails
        }
      } else {
        console.log('Email service not available - skipping email notifications');
      }

      res.json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  // Complete tenant-restaurant routes implementation
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const tables = await storage.getTablesByRestaurant(restaurantId);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const tableData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const table = await storage.createTable(tableData);
      res.json(table);
    } catch (error) {
      res.status(400).json({ message: "Invalid table data" });
    }
  });

  // Rooms routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/rooms", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const rooms = await storage.getRoomsByRestaurant(restaurantId);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/rooms", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const roomData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  // Combined tables routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const combinedTables = await storage.getCombinedTablesByRestaurant(restaurantId);
      res.json(combinedTables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch combined tables" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const combinedTableData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const combinedTable = await storage.createCombinedTable(combinedTableData);
      res.json(combinedTable);
    } catch (error) {
      res.status(400).json({ message: "Invalid combined table data" });
    }
  });

  // Customers routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/customers", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const customers = await storage.getCustomersByRestaurant(restaurantId);
      res.json(customers);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/customers", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const customerData = insertCustomerSchema.parse({
        ...req.body,
        restaurantId,
        tenantId
      });

      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  // Opening hours routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const openingHours = await storage.getOpeningHoursByRestaurant(restaurantId);
      res.json(openingHours);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Extract hours from request body - frontend sends { hours: [...] }
      const hoursData = req.body.hours || req.body;
      const openingHours = await storage.createOrUpdateOpeningHours(restaurantId, tenantId, hoursData);
      res.json(openingHours);
    } catch (error) {
      console.error("Error saving opening hours:", error);
      res.status(400).json({ message: "Invalid opening hours data" });
    }
  });

  // Table layout routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/table-layout", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { room } = req.query;

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const roomName = (room as string) || "main";
      const layout = await storage.getTableLayout(restaurantId, roomName);

      res.json({
        room: roomName,
        positions: layout?.positions || {}
      });
    } catch (error) {
      console.error("Error fetching table layout:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/table-layout", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { room, positions } = req.body;

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!room || !positions) {
        return res.status(400).json({ message: "Room and positions are required" });
      }

      const savedLayout = await storage.saveTableLayout(restaurantId, tenantId, room, positions);

      res.json({ 
        message: "Table layout saved successfully",
        room: savedLayout.room,
        positions: savedLayout.positions
      });
    } catch (error) {
      console.error("Error saving table layout:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Waiting list routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/waiting-list", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const waitingList = await storage.getWaitingListByRestaurant(restaurantId);
      res.json(waitingList);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/waiting-list", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const entryData = {
        ...req.body,
        restaurantId,
        tenantId
      };

      const entry = await storage.createWaitingListEntry(entryData);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid waiting list data" });
    }
  });

  app.put("/api/tenants/:tenantId/waiting-list/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const existingEntry = await storage.getWaitingListEntryById(id);
      if (!existingEntry || existingEntry.tenantId !== tenantId) {
        return res.status(404).json({ message: "Waiting list entry not found" });
      }

      const entry = await storage.updateWaitingListEntry(id, updates);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Feedback routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/feedback", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const feedback = await storage.getFeedbackByRestaurant(restaurantId);
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/feedback", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const feedbackData = {
        ...req.body,
        restaurantId,
        tenantId
      };

      const feedback = await storage.createFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Invalid feedback data" });
    }
  });

  // Time slots routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/time-slots", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { date } = req.query;

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {        return res.status(404).json({ message: "Restaurant not found" });
      }

      const timeSlots = await storage.getTimeSlotsByRestaurant(restaurantId, date as string);
      res.json(timeSlots);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/time-slots", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const slotData = {
        ...req.body,
        restaurantId,
        tenantId
      };

      const slot = await storage.createTimeSlot(slotData);
      res.json(slot);
    } catch (error) {
      res.status(400).json({ message: "Invalid time slot data" });
    }
  });

  app.put("/api/tenants/:tenantId/time-slots/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const existingSlot = await storage.getTimeSlotById(id);
      if (!existingSlot || existingSlot.tenantId !== tenantId) {
        return res.status(404).json({ message: "Time slot not found" });
      }

      const slot = await storage.updateTimeSlot(id, updates);
      res.json(slot);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Activity log routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/activity-log", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const logs = await storage.getActivityLogByRestaurant(restaurantId);
      res.json(logs);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/activity-log", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const logData = {
        ...req.body,
        restaurantId,
        tenantId
      };

      const log = await storage.createActivityLog(logData);
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid log data" });
    }
    });

  // SMS messages routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const messages = await storage.getSmsMessagesByRestaurant(restaurantId);
      res.json(messages);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const messageData = {
        ...req.body,
        restaurantId,
        tenantId
      };

      const message = await storage.createSmsMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Special periods routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/special-periods", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const specialPeriods = await storage.getSpecialPeriodsByRestaurant(restaurantId);
      res.json(specialPeriods);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/special-periods", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const periodData = {
        ...req.body,
        restaurantId,
        tenantId
      };

      const period = await storage.createSpecialPeriod(periodData);
      res.json(period);
    } catch (error) {
      res.status(400).json({ message: "Invalid special period data" });
    }
  });

  app.put("/api/tenants/:tenantId/special-periods/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const period = await storage.updateSpecialPeriod(id, updates);
      if (!period) {
        return res.status(404).json({ message: "Special period not found" });
      }

      res.json(period);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/tenants/:tenantId/special-periods/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSpecialPeriod(id);

      if (success) {
        res.json({ message: "Special period deleted successfully" });
      } else {
        res.status(404).json({ message: "Special period not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Cut-off times routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/cut-off-times", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const cutOffTimes = await storage.getCutOffTimesByRestaurant(restaurantId);
      res.json(cutOffTimes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/cut-off-times", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const cutOffTimes = await storage.createOrUpdateCutOffTimes(restaurantId, tenantId, req.body);
      res.json(cutOffTimes);
    } catch (error) {
      res.status(400).json({ message: "Invalid cut-off times data" });
    }
  });

  // Booking validation route
  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/validate-booking", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { bookingDate, bookingTime } = req.body;

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const isAllowed = await storage.isBookingAllowed(restaurantId, new Date(bookingDate), bookingTime);
      res.json({ isAllowed });
    } catch (error) {
      console.error("Error validating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email notification settings routes
  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/email-settings", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { guestSettings, placeSettings } = req.body;

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updatedRestaurant = await storage.updateRestaurant(restaurantId, {
        emailSettings: JSON.stringify({
          guestSettings,
          placeSettings
        })
      });

      res.json({
        message: "Email settings saved successfully",
        settings: { guestSettings, placeSettings }
      });
    } catch (error) {
      console.error("Error saving email settings:", error);
      res.status(500).json({ message: "Failed to save email settings" });
    }
  });

  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/email-settings", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      let settings = {
        guestSettings: {
          emailConfirmation: true,
          sendBookingConfirmation: true,
          reminderHours: "24",
          sendReminder: true,
          confirmationLanguage: "english",
          satisfactionSurvey: false,
          reviewSite: "Google"
        },
        placeSettings: {
          sentTo: restaurant.email || "restaurant@example.com",
          emailBooking: true,
          newBookingsOnly: false,
          satisfactionSurvey: true,
          rating: "3.0"
        }
      };

      if (restaurant.emailSettings) {
        try {
          const savedSettings = JSON.parse(restaurant.emailSettings);
          settings = { ...settings, ...savedSettings };
        } catch (e) {
          console.warn("Failed to parse email settings, using defaults");
        }
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching email settings:", error);
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  // Restaurant statistics route
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/statistics", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get booking statistics
      const bookings = await storage.getBookingsByRestaurant(restaurantId);
      const totalBookings = bookings.length;
      const todayBookings = bookings.filter(b => {
        const today = new Date().toISOString().split('T')[0];
        return b.bookingDate.toISOString().split('T')[0] === today;
      }).length;

      // Get customer count
      const customers = await storage.getCustomersByRestaurant(restaurantId);
      const totalCustomers = customers.length;

      // Get table count
      const tables = await storage.getTablesByRestaurant(restaurantId);
      const totalTables = tables.length;

      res.json({
        totalBookings,
        todayBookings,
        totalCustomers,
        totalTables
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Restaurant management routes
  app.put("/api/tenants/:tenantId/restaurants/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const restaurant = await storage.getRestaurantById(id);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updatedRestaurant = await storage.updateRestaurant(id, updates);
      res.json(updatedRestaurant);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tenants/:tenantId/restaurants/:userId", validateTenant, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tenantId = parseInt(req.params.tenantId);
      const restaurant = await storage.getRestaurantByUserId(userId);

      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Additional booking management routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/rooms", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant exists and belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (restaurant.tenantId !== tenantId) {
        return res.status(403).json({ message: "Restaurant does not belong to this tenant" });
      }

      const rooms = await storage.getRoomsByRestaurant(restaurantId);
      // Filter rooms by tenantId for security
      const tenantRooms = rooms.filter(room => room.tenantId === tenantId);

      res.json(tenantRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/rooms", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const roomData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const room = await storage.createRoom(roomData);
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  app.put("/api/tenants/:tenantId/rooms/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      if (isNaN(id) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid room ID or tenant ID" });
      }

      // Verify room belongs to tenant before updating
      const existingRoom = await storage.getRoomById(id);
      if (!existingRoom || existingRoom.tenantId !== tenantId) {
        return res.status(404).json({ message: "Room not found" });
      }

      const room = await storage.updateRoom(id, updates);
      if (!room) {
        return res.status(404).json({ message: "Failed to update room" });
      }

      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tenants/:tenantId/rooms/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      // Verify room belongs to tenant before deleting
      const existingRoom = await storage.getRoomById(id);
      if (!existingRoom || existingRoom.tenantId !== tenantId) {
        return res.status(404).json({ message: "Room not found" });
      }

      const success = await storage.deleteRoom(id);
      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Tables routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant exists and belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (restaurant.tenantId !== tenantId) {
        return res.status(403).json({ message: "Restaurant does not belong to this tenant" });
      }

      const tables = await storage.getTablesByRestaurant(restaurantId);
      // Filter tables by tenantId for security
      const tenantTables = tables.filter(table => table.tenantId === tenantId);
      res.json(tenantTables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const tableData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const table = await storage.createTable(tableData);
      res.json(table);
    } catch (error) {
      res.status(400).json({ message: "Invalid table data" });
    }
  });

  app.put("/api/tenants/:tenantId/tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      // Verify table belongs to tenant before updating
      const existingTable = await storage.getTableById(id);
      if (!existingTable || existingTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Table not found" });
      }

      const table = await storage.updateTable(id, updates);
      res.json(table);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/tenants/:tenantId/tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      // Verify table belongs to tenant before deleting
      const existingTable = await storage.getTableById(id);
      if (!existingTable || existingTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Table not found" });
      }

      const success = await storage.deleteTable(id);
      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });



  // Combined Tables routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const combinedTables = await storage.getCombinedTablesByRestaurant(restaurantId);
      res.json(combinedTables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch combined tables" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const combinedTableData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const combinedTable = await storage.createCombinedTable(combinedTableData);
      res.json(combinedTable);
    } catch (error) {
      res.status(400).json({ message: "Invalid combined table data" });
    }
  });

  app.put("/api/tenants/:tenantId/combined-tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      // Verify combined table belongs to tenant before updating
      const existingCombinedTable = await storage.getCombinedTableById(id);
      if (!existingCombinedTable || existingCombinedTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Combined table not found" });
      }

      const combinedTable = await storage.updateCombinedTable(id, updates);
      res.json(combinedTable);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/tenants/:tenantId/combined-tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      // Verify combined table belongs to tenant before deleting
      const existingCombinedTable = await storage.getCombinedTableById(id);
      if (!existingCombinedTable || existingCombinedTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Combined table not found" });
      }

      const deleted = await storage.deleteCombinedTable(id);
      if (deleted) {
        res.json({ message: "Combined table deleted successfully" });
      } else {
        res.status(404).json({ message: "Combined table not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete combined table" });
    }
  });

  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/bookings", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const { date } = req.query;

      let bookings;
      if (date && typeof date === 'string') {
        bookings = await storage.getBookingsByDate(restaurantId, date);
      } else {
        bookings = await storage.getBookingsByRestaurant(restaurantId);
      }

      res.json(bookings);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/bookings", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Validate required fields
      if (!req.body.customerName || !req.body.customerEmail || !req.body.bookingDate || !req.body.startTime || !req.body.guestCount) {
        return res.status(400).json({ message: "Missing required booking fields" });
      }

      const bookingDate = new Date(req.body.bookingDate);
      const bookingTime = req.body.startTime;
      const tableId = req.body.tableId;

      // Validate booking against opening hours and cut-off times
      const isRestaurantOpen = await storage.isRestaurantOpen(restaurantId, bookingDate, bookingTime);
      if (!isRestaurantOpen) {
        return res.status(400).json({ 
          message: "Booking not allowed: Restaurant is closed on this day and time" 
        });
      }

      const isAllowed = await storage.isBookingAllowed(restaurantId, bookingDate, bookingTime);
      if (!isAllowed) {
        return res.status(400).json({ 
          message: "Booking not allowed: Restaurant is closed or past cut-off time" 
        });
      }

      // If a specific table is requested, check for conflicts
      if (tableId) {
        const existingBookings = await storage.getBookingsByDate(restaurantId, bookingDate.toISOString().split('T')[0]);
        const conflictingBookings = existingBookings.filter(booking => {
          if (booking.tableId !== tableId) return false;

          const requestedStartTime = req.body.startTime;
          const requestedEndTime = req.body.endTime || "23:59";

          // Convert times to minutes for easier comparison
          const requestedStartMinutes = parseInt(requestedStartTime.split(':')[0]) * 60 + parseInt(requestedStartTime.split(':')[1]);
          const requestedEndMinutes = parseInt(requestedEndTime.split(':')[0]) * 60 + parseInt(requestedEndTime.split(':')[1]);

          const existingStartMinutes = parseInt(booking.startTime.split(':')[0]) * 60 + parseInt(booking.startTime.split(':')[1]);
          const existingEndTime = booking.endTime || "23:59";
          const existingEndMinutes = parseInt(existingEndTime.split(':')[0]) * 60 + parseInt(existingEndTime.split(':')[1]);

          // Add 1-hour buffer (60 minutes) for table turnover
          const bufferMinutes = 60;

          // Check for time overlap with buffer
          // Two time ranges overlap if: start1 < end2 && start2 < end1
          const requestedStart = requestedStartMinutes - bufferMinutes;
          const requestedEnd = requestedEndMinutes + bufferMinutes;
          const existingStart = existingStartMinutes - bufferMinutes;
          const existingEnd = existingEndMinutes + bufferMinutes;

          return requestedStart < existingEnd && existingStart < existingEnd;
        });

        if (conflictingBookings.length > 0) {
          return res.status(400).json({ 
            message: `Table conflict: The selected table is already booked at ${bookingTime} on ${bookingDate.toISOString().split('T')[0]}` 
          });
        }

        // Check table capacity
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const selectedTable = tables.find(table => table.id === tableId);
        if (selectedTable && selectedTable.capacity < req.body.guestCount) {
          return res.status(400).json({ 
            message: `Table capacity exceeded: Table can accommodate ${selectedTable.capacity} guests, but ${req.body.guestCount} guests requested` 
          });
        }
      }

      // Get or create customer first
      const customer = await storage.getOrCreateCustomer(restaurantId, tenantId, {
        name: req.body.customerName,
        email: req.body.customerEmail,
        phone: req.body.customerPhone
      });

      const bookingData = insertBookingSchema.parse({
        ...req.body,
        restaurantId,
        tenantId,
        customerId: customer.id,
        bookingDate: bookingDate
      });

      const booking = await storage.createBooking(bookingData);

      console.log(`Booking created successfully: ${booking.id} for restaurant ${restaurantId}`);

      // Send real-time notification to all connected clients for this restaurant
      try {
        console.log(`Preparing real-time notification for booking ${booking.id}`);

        const notificationData = {
          type: 'new_booking',
          booking: {
            id: booking.id,
            customerName: req.body.customerName,
            customerEmail: req.body.customerEmail,
customerPhone: req.body.customerPhone,
            guestCount: booking.guestCount,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            tableId: booking.tableId,
            status: booking.status,
            notes: booking.notes,
            createdAt: booking.createdAt
          },
          restaurant: {
            id: restaurantId,
            name: (await storage.getRestaurantById(restaurantId))?.name
          },
          timestamp: new Date().toISOString()
        };

        console.log(`About to broadcast notification for restaurant ${restaurantId}`);
        broadcastNotification(restaurantId, notificationData);
        console.log(`Real-time notification processing completed for booking ${booking.id}`);
      } catch (notificationError) {
        console.error('Error sending real-time notification:', notificationError);
      }

      // Send email notifications if Brevo is configured and enabled in settings
      if (emailService) {
        console.log('Email service available - processing notifications for booking', booking.id);
        try {
          const restaurant = await storage.getRestaurantById(restaurantId);
          let emailSettings = null;

          // Parse email settings if they exist
          if (restaurant?.emailSettings) {
            try {
              emailSettings = JSON.parse(restaurant.emailSettings);
              console.log('Email settings loaded:', emailSettings);
            } catch (e) {
              console.warn("Failed to parse email settings, using defaults");
            }
          } else {
            console.log('No email settings found - using defaults (all notifications enabled)');
          }

          // Send confirmation email to customer if enabled
          const shouldSendGuestConfirmation = emailSettings?.guestSettings?.sendBookingConfirmation !== false;
          console.log('Should send guest confirmation:', shouldSendGuestConfirmation);

          if (shouldSendGuestConfirmation) {
            console.log('Sending booking confirmation email to:', req.body.customerEmail);
            await emailService.sendBookingConfirmation(
              req.body.customerEmail,
              req.body.customerName,
              {
                ...bookingData,
                tableNumber: booking.tableId,
                id: booking.id
              }
            );
            console.log('Guest confirmation email sent successfully');
          }

          // Send notification to restaurant if enabled
          const shouldSendRestaurantNotification = emailSettings?.placeSettings?.emailBooking !== false;
          const restaurantEmail = emailSettings?.placeSettings?.sentTo || restaurant?.email;
          console.log('Should send restaurant notification:', shouldSendRestaurantNotification, 'to email:', restaurantEmail);

          if (shouldSendRestaurantNotification && restaurantEmail) {
            console.log('Sending restaurant notification email to:', restaurantEmail);
            await emailService.sendRestaurantNotification(restaurantEmail, {
              customerName: req.body.customerName,
              customerEmail: req.body.customerEmail,
              customerPhone: req.body.customerPhone,
              ...bookingData
            });
            console.log('Restaurant notification email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          // Don't fail the booking if email fails
        }
      } else {
        console.log('Email service not available - skipping email notifications');
      }

      res.json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: `Invalid booking data: ${error.message}` });
      } else {
        res.status(400).json({ message: "Invalid booking data" });
      }
    }
  });

app.put("/api/tenants/:tenantId/bookings/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      if (updates.bookingDate) {
        updates.bookingDate = new Date(updates.bookingDate);
      }

      const existingBooking = await storage.getBookingById(id);
      if (!existingBooking || existingBooking.tenantId !== tenantId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const bookingDate = updates.bookingDate ? new Date(updates.bookingDate) : existingBooking.bookingDate;
      const restaurantId = existingBooking.restaurantId;

      // Check if restaurant is open on this day
        const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const openingHours = await storage.getOpeningHoursByRestaurant(restaurantId);
        const dayHours = openingHours.find(oh => oh.dayOfWeek === dayOfWeek);

        if (!dayHours || !dayHours.isOpen) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayNames[dayOfWeek];
          return res.status(400).json({ 
            message: `Restaurant is closed on ${dayName}s` 
          });
        }

      const booking = await storage.updateBooking(id, updates);
      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get("/api/tenants/:tenantId/bookings/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      const booking = await storage.getBookingById(id);
      if (!booking || booking.tenantId !== tenantId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/tenants/:tenantId/bookings/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      const existingBooking = await storage.getBookingById(id);
      if (!existingBooking || existingBooking.tenantId !== tenantId) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const success = await storage.deleteBooking(id);
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Table management routes
  app.put("/api/tenants/:tenantId/tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const existingTable = await storage.getTableById(id);
      if (!existingTable || existingTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Table not found" });
      }

      const table = await storage.updateTable(id, updates);
      res.json(table);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/tenants/:tenantId/tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      const existingTable = await storage.getTableById(id);
      if (!existingTable || existingTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Table not found" });
      }

      const success = await storage.deleteTable(id);
      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Room management routes
  app.put("/api/tenants/:tenantId/rooms/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const existingRoom = await storage.getRoomById(id);
      if (!existingRoom || existingRoom.tenantId !== tenantId) {
        return res.status(404).json({ message: "Room not found" });
      }

      const room = await storage.updateRoom(id, updates);
      if (!room) {
        return res.status(404).json({ message: "Failed to update room" });
      }

      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tenants/:tenantId/rooms/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      const existingRoom = await storage.getRoomById(id);
      if (!existingRoom || existingRoom.tenantId !== tenantId) {
        return res.status(404).json({ message: "Room not found" });
      }

      const success = await storage.deleteRoom(id);
      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Combined table management routes
  app.put("/api/tenants/:tenantId/combined-tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const existingCombinedTable = await storage.getCombinedTableById(id);
      if (!existingCombinedTable || existingCombinedTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Combined table not found" });
      }

      const combinedTable = await storage.updateCombinedTable(id, updates);
      res.json(combinedTable);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/tenants/:tenantId/combined-tables/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      const existingCombinedTable = await storage.getCombinedTableById(id);
      if (!existingCombinedTable || existingCombinedTable.tenantId !== tenantId) {
        return res.status(404).json({ message: "Combined table not found" });
      }

      const deleted = await storage.deleteCombinedTable(id);
      if (deleted) {
        res.json({ message: "Combined table deleted successfully" });
      } else {
        res.status(404).json({ message: "Combined table not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete combined table" });
    }
  });

  // Booking Management Routes (Public - for customer email links)
  app.get("/api/booking-manage/:id", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { hash } = req.query;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash for manage action
      const isValidHash = BookingHash.verifyHash(
        hash as string,
        booking.id,
        booking.tenantId,
        booking.restaurantId,
        'manage'
      );

      if (!isValidHash) {
        return res.status(403).json({ message: "Access denied - invalid or expired link" });
      }

      // Return booking details for customer management
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking for management:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel booking route with hash verification
  app.post("/api/booking-manage/:id/cancel", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { hash } = req.body;

      if (!hash) {
        return res.status(400).json({ message: "Security token is required" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - accept both cancel and manage hashes for cancel action
      const isValidCancelHash = BookingHash.verifyHash(
        hash,
        bookingId,
        booking.tenantId,
        booking.restaurantId,
        'cancel'
      );

      const isValidManageHash = BookingHash.verifyHash(
        hash,
        bookingId,
        booking.tenantId,
        booking.restaurantId,
        'manage'
      );

      if (!isValidCancelHash && !isValidManageHash) {
        console.log(`Invalid hash for booking ${bookingId} cancel action.`);
        return res.status(403).json({ message: "Invalid or expired cancellation link" });
      }

      // Check if booking time has passed to prevent cancellation
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const bookingTimeComponents = booking.startTime.split(':');
      bookingDateTime.setHours(parseInt(bookingTimeComponents[0]), parseInt(bookingTimeComponents[1]), 0, 0);
      
      const isBookingStarted = now >= bookingDateTime;

      if (isBookingStarted) {
        return res.status(403).json({ 
          message: "Cannot cancel booking - the booking time has already started or passed" 
        });
      }

      // Update booking status to cancelled
      const updatedBooking = await storage.updateBooking(bookingId, {
        status: 'cancelled'
      });

      console.log(`Customer cancelled booking ${bookingId} via secure link`);

      // Send real-time notification to restaurant
      broadcastNotification(booking.restaurantId, {
        type: 'booking_cancelled',
        booking: updatedBooking,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: "Booking cancelled successfully",
        booking: updatedBooking
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/booking-manage/:id", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const updates = req.body;
      const { hash } = req.query;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      // Get the existing booking
      const existingBooking = await storage.getBookingById(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash for manage action
      const isValidHash = BookingHash.verifyHash(
        hash as string,
        existingBooking.id,
        existingBooking.tenantId,
        existingBooking.restaurantId,
        'manage'
      );

      if (!isValidHash) {
        return res.status(403).json({ message: "Access denied - invalid security token" });
      }

      // Get restaurant and cut-off times to validate if changes are allowed
      const restaurant = await storage.getRestaurantById(existingBooking.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get cut-off times for validation
      const cutOffTimes = await storage.getCutOffTimesByRestaurant(existingBooking.restaurantId);

      // Validate if changes are allowed based on cut-off times
      const bookingDateTime = new Date(existingBooking.bookingDate);
      const now = new Date();

      const dayOfWeek = bookingDateTime.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      const cutOffTime = cutOffTimes.find((ct: any) => ct.dayOfWeek.toLowerCase() === dayName);

      let isChangeAllowed = false;
      if (!cutOffTime || !cutOffTime.isEnabled) {
        // Default: allow changes up to 1 hour before booking
        const oneHourBefore = new Date(bookingDateTime);
        const [hours, minutes] = existingBooking.startTime.split(':');
        oneHourBefore.setHours(parseInt(hours) - 1, parseInt(minutes));
        isChangeAllowed = now < oneHourBefore;
      } else {
        // Use restaurant's cut-off time policy
        const cutOffDeadline = new Date(bookingDateTime);
        cutOffDeadline.setHours(cutOffDeadline.getHours() - cutOffTime.hoursBeforeBooking);
        isChangeAllowed = now < cutOffDeadline;
      }

      if (!isChangeAllowed) {
        const hours = cutOffTime?.hoursBeforeBooking || 1;
        return res.status(400).json({ 
          message: `Changes are no longer allowed. You can only modify bookings up to ${hours} hour${hours > 1 ? 's' : ''} before your reservation time.`
        });
      }

      // Validate booking date and time changes
      if (updates.bookingDate || updates.startTime) {
        const newDate = updates.bookingDate ? new Date(updates.bookingDate) : new Date(existingBooking.bookingDate);
        const newTime = updates.startTime || existingBooking.startTime;

        // Check if restaurant is open
        const isOpen = await storage.isRestaurantOpen(existingBooking.restaurantId, newDate, newTime);
        if (!isOpen) {
          return res.status(400).json({ 
            message: "The restaurant is closed on the selected date and time."
          });
        }

        // Check booking cut-off for new date/time
        const isAllowed = await storage.isBookingAllowed(existingBooking.restaurantId, newDate, newTime);
        if (!isAllowed) {
          return res.status(400).json({ 
            message: "Booking is not allowed for the selected date and time."
          });
        }

        // Check for table conflicts if changing date/time
        if (existingBooking.tableId) {
          const existingBookings = await storage.getBookingsByDate(
            existingBooking.restaurantId, 
            newDate.toISOString().split('T')[0]
          );

          const conflictingBookings = existingBookings.filter(booking => {
            if (booking.id === bookingId || booking.tableId !== existingBooking.tableId) return false;

            const requestedStartTime = newTime;
            const requestedEndTime = existingBooking.endTime || "23:59";

            // Time conflict check logic
            const requestedStartMinutes = parseInt(requestedStartTime.split(':')[0]) * 60 + parseInt(requestedStartTime.split(':')[1]);
            const requestedEndMinutes = parseInt(requestedEndTime.split(':')[0]) * 60 + parseInt(requestedEndTime.split(':')[1]);

            const existingStartMinutes = parseInt(booking.startTime.split(':')[0]) * 60 + parseInt(booking.startTime.split(':')[1]);
            const existingEndTime = booking.endTime || "23:59";
            const existingEndMinutes = parseInt(existingEndTime.split(':')[0]) * 60 + parseInt(existingEndTime.split(':')[1]);

            const bufferMinutes = 60;
            const requestedStart = requestedStartMinutes - bufferMinutes;
            const requestedEnd = requestedEndMinutes + bufferMinutes;
            const existingStart = existingStartMinutes - bufferMinutes;
            const existingEnd = existingEndMinutes + bufferMinutes;

            return requestedStart < existingEnd && existingStart < existingEnd;
          });

          if (conflictingBookings.length > 0) {
            return res.status(400).json({ 
              message: "The selected time conflicts with another booking for the same table."
            });
          }
        }
      }

      // Process the update
      const updatedBooking = await storage.updateBooking(bookingId, updates);

      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      console.log(`Customer modified booking ${bookingId}:`, updates);

      // Send real-time notification to restaurant
      broadcastNotification(updatedBooking.restaurantId, {
        type: 'booking_changed',
        booking: updatedBooking,
        changes: updates,
        timestamp: new Date().toISOString()
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking change request routes
  app.post("/api/booking-change-request", async (req, res) => {
    try {
      const { bookingId, requestedDate, requestedTime, requestedGuestCount, requestNotes } = req.body;

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const restaurant = await storage.getRestaurantById(booking.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Create change request
      const changeRequest = await storage.createBookingChangeRequest({
        bookingId,
        restaurantId: booking.restaurantId,
        tenantId: booking.tenantId,
        requestedDate: requestedDate ? new Date(requestedDate) : null,
        requestedTime,
        requestedGuestCount,
        requestNotes,
        status: 'pending'
      });

      // Send email notification to restaurant if email service is available
      if (emailService) {
        try {
          let emailSettings = null;
          if (restaurant.emailSettings) {
            try {
              emailSettings = JSON.parse(restaurant.emailSettings);
            } catch (e) {
              console.warn("Failed to parse email settings");
            }
          }

          const restaurantEmail = emailSettings?.placeSettings?.sentTo || restaurant.email;
          if (restaurantEmail) {
            await emailService.sendBookingChangeRequest(restaurantEmail, changeRequest, booking);
          }
        } catch (emailError) {
          console.error('Error sending change request email:', emailError);
        }
      }

      // Send real-time notification to restaurant
      broadcastNotification(booking.restaurantId, {
        type: 'booking_change_request',
        changeRequest,
        booking,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Change request submitted successfully", changeRequest });
    } catch (error) {
      console.error("Error creating change request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Handle booking change request responses (approve/reject)
  app.post("/api/booking-change-response/:requestId", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { action, response } = req.body; // action: 'approve' or 'reject'

      const changeRequest = await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const booking = await storage.getBookingById(changeRequest.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const approved = action === 'approve';

      // Update change request status
      const updatedRequest = await storage.updateBookingChangeRequest(requestId, {
        status: approved ? 'approved' : 'rejected',
        restaurantResponse: response,
        respondedAt: new Date()
      });

      if (approved) {
        // Apply changes to the booking
        const bookingUpdates: any = {};
        if (changeRequest.requestedDate) bookingUpdates.bookingDate = changeRequest.requestedDate;
        if (changeRequest.requestedTime) bookingUpdates.startTime = changeRequest.requestedTime;
        if (changeRequest.requestedGuestCount) bookingUpdates.guestCount = changeRequest.requestedGuestCount;

        if (Object.keys(bookingUpdates).length > 0) {
          await storage.updateBooking(changeRequest.bookingId, bookingUpdates);
        }
      }

      // Send email notification to customer if email service is available
      if (emailService) {
        try {
          await emailService.sendChangeRequestResponse(
            booking.customerEmail,
            booking.customerName,
            approved,
            booking,
            changeRequest,
            response
          );
        } catch (emailError) {
          console.error('Error sending response email:', emailError);
        }
      }

      // Send real-time notification to restaurant dashboard
      broadcastNotification(booking.restaurantId, {
        type: 'change_request_responded',
        changeRequest: updatedRequest,
        booking,
        approved,
        timestamp: new Date().toISOString()
      });

      res.json({ 
        message: `Change request ${approved ? 'approved' : 'rejected'} successfully`,
        changeRequest: updatedRequest
      });
    } catch (error) {
      console.error("Error responding to change request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get booking change requests for a restaurant
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/change-requests", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const changeRequests = await storage.getBookingChangeRequestsByRestaurant(restaurantId);
      res.json(changeRequests);
    } catch (error) {
      console.error("Error fetching change requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public route for handling secure booking change responses via email links
  app.get("/api/booking-change-response/:requestId", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { action, hash } = req.query;

      if (!action || !hash) {
        return res.status(400).json({ message: "Invalid request parameters" });
      }

      const changeRequest = await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const booking = await storage.getBookingById(changeRequest.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash
      const isValidHash = BookingHash.verifyHash(
        hash as string,
        requestId,
        booking.tenantId,
        booking.restaurantId,
        action as 'cancel' | 'change'
      );

      if (!isValidHash) {
        return res.status(403).json({ message: "Invalid security token" });
      }

      const approved = action === 'approve';

      // Update change request status
      const updatedRequest = await storage.updateBookingChangeRequest(requestId, {
        status: approved ? 'approved' : 'rejected',
        respondedAt: new Date()
      });

      if (approved) {
        // Apply changes to the booking
        const bookingUpdates: any = {};
        if (changeRequest.requestedDate) bookingUpdates.bookingDate = changeRequest.requestedDate;
        if (changeRequest.requestedTime) bookingUpdates.startTime = changeRequest.requestedTime;
        if (changeRequest.requestedGuestCount) bookingUpdates.guestCount = changeRequest.requestedGuestCount;

        if (Object.keys(bookingUpdates).length > 0) {
          await storage.updateBooking(changeRequest.bookingId, bookingUpdates);
        }
      }

      // Send email notification to customer if email service is available
      if (emailService) {
        try {
          await emailService.sendChangeRequestResponse(
            booking.customerEmail,
            booking.customerName,
            approved,
            booking,
            changeRequest
          );
        } catch (emailError) {
          console.error('Error sending response email:', emailError);
        }
      }

      // Send real-time notification to restaurant dashboard
      broadcastNotification(booking.restaurantId, {
        type: 'change_request_responded',
        changeRequest: updatedRequest,
        booking,
        approved,
        timestamp: new Date().toISOString()
      });

      // Redirect to a success page or send HTML response
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Booking Change ${approved ? 'Approved' : 'Rejected'}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .success { color: #28a745; } .error { color: #dc3545; }
              h1 { margin-top: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="${approved ? 'success' : 'error'}">
                Change Request ${approved ? 'Approved' : 'Rejected'}
              </h1>
              <p>
                ${approved 
                  ? 'The booking changes have been approved. The customer has been notified via email.'
                  : 'The booking changes have been rejected. The customer has been notified and can still cancel their original booking if needed.'
                }
              </p>
              <p><strong>Customer:</strong> ${booking.customerName}</p>
              <p><strong>Original Date:</strong> ${new Date(booking.bookingDate).toLocaleDateString()}</p>
              <p><strong>Original Time:</strong> ${booking.startTime}</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error handling change request response:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tenant routes
  app.get("/api/tenants/:tenantId", tenantRoutes.getTenant);
  app.post("/api/tenants", tenantRoutes.createTenant);
  app.put("/api/tenants/:tenantId", tenantRoutes.updateTenant);
  app.post("/api/tenants/:tenantId/invite", tenantRoutes.inviteUserToTenant);
  app.delete("/api/tenants/:tenantId/users/:userId", tenantRoutes.removeUserFromTenant);

  // Subscription Plans
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      console.log("Fetched subscription plans:", plans.length, "plans");
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/subscription-plans", async (req, res) => {
    try {
      const planData = insertSubscriptionPlanSchema.parse(req.body);
      const plan = await storage.createSubscriptionPlan(planData);
      res.json(plan);
    } catch (error) {
      res.status(400).json({ message: "Invalid plan data" });
    }
  });

  // User Subscriptions routes
  app.get("/api/users/:userId/subscription", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscription = await storage.getUserSubscription(userId);

      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      res.json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/users/:userId/subscription", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscriptionData = insertUserSubscriptionSchema.parse({
        ...req.body,
        userId,
        currentPeriodStart: new Date(req.body.currentPeriodStart),
        currentPeriodEnd: new Date(req.body.currentPeriodEnd)
      });

      const subscription = await storage.createUserSubscription(subscriptionData);
      res.json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Invalid subscription data" });
    }
  });

  app.put("/api/subscriptions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      if (updates.currentPeriodStart) {
        updates.currentPeriodStart = new Date(updates.currentPeriodStart);
      }
      if (updates.currentPeriodEnd) {
        updates.currentPeriodEnd = new Date(updates.currentPeriodEnd);
      }

      const subscription = await storage.updateUserSubscription(id, updates);

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(subscription);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/subscriptions/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const subscription = await storage.getUserSubscriptionById(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Cancel the subscription in Stripe if it exists
      if (subscription.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        } catch (stripeError) {
          console.error("Failed to cancel Stripe subscription:", stripeError);
          // Continue with local cancellation even if Stripe fails
        }
      }

      // Update the subscription status to cancelled
      const updatedSubscription = await storage.updateUserSubscription(id, {
        status: 'cancelled'
      });

      res.json(updatedSubscription);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Stripe checkout session creation
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { planId, userId, successUrl, cancelUrl } =req.body;

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${plan.name} Plan`,
                description: `Restaurant booking system - ${plan.name} plan`,
              },
              unit_amount: plan.price,
              recurring: {
                interval: plan.interval === 'monthly' ? 'month' : plan.interval === 'yearly' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
        },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Legacy routes for backward compatibility
  app.get("/api/restaurants", async (req, res) => {
    res.json([]);
  });

  app.get("/api/restaurants/:restaurantId/bookings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const { date } = req.query;

      let bookings;
      if (date && typeof date === 'string') {
        bookings = await storage.getBookingsByDate(restaurantId, date);
      } else {
        bookings = await storage.getBookingsByRestaurant(restaurantId);
      }

      res.json(bookings);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Legacy waiting list routes for backward compatibility
  app.get("/api/restaurants/:restaurantId/waiting-list", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const waitingList = await storage.getWaitingListByRestaurant(restaurantId);
      res.json(waitingList);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/restaurants/:restaurantId/waiting-list", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);

      // Get the restaurant to determine the tenant ID
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const entryData = {
        ...req.body,
        restaurantId,
        tenantId: restaurant.tenantId
      };

      const entry = await storage.createWaitingListEntry(entryData);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid waiting list data" });
    }
  });

  app.put("/api/restaurants/:restaurantId/waiting-list/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurantId = parseInt(req.params.restaurantId);
      const updates = req.body;

      // Verify waiting list entry belongs to restaurant before updating
      const existingEntry = await storage.getWaitingListEntryById(id);
      if (!existingEntry || existingEntry.restaurantId !== restaurantId) {
        return res.status(404).json({ message: "Waiting list entry not found" });
      }

      const entry = await storage.updateWaitingListEntry(id, updates);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Legacy booking creation route for backward compatibility
  app.post("/api/restaurants/:restaurantId/bookings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);

      // Get the restaurant to determine the tenant ID
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get or create customer first
      const customer = await storage.getOrCreateCustomer(restaurantId, restaurant.tenantId, {
        name: req.body.customerName,
        email: req.body.customerEmail,
        phone: req.body.customerPhone
      });

      const bookingData = insertBookingSchema.parse({
        ...req.body,
        restaurantId,
        tenantId: restaurant.tenantId,
        customerId: customer.id,
        bookingDate: new Date(req.body.bookingDate)
      });

      const booking = await storage.createBooking(bookingData);

      // Send email notifications if Brevo is configured
      if (emailService) {
        console.log('Email service available - processing notifications for booking', booking.id);
        try {
          let emailSettings = null;

          // Parse email settings if they exist
          if (restaurant?.emailSettings) {
            try {
              emailSettings = JSON.parse(restaurant.emailSettings);
              console.log('Email settings loaded:', emailSettings);
            } catch (e) {
              console.warn("Failed to parse email settings, using defaults");
            }
          } else {
            console.log('No email settings found - using defaults (all notifications enabled)');
          }

          // Send confirmation email to customer if enabled
          const shouldSendGuestConfirmation = emailSettings?.guestSettings?.sendBookingConfirmation !== false;
          console.log('Should send guest confirmation:', shouldSendGuestConfirmation);

          if (shouldSendGuestConfirmation) {
            console.log('Sending booking confirmation email to:', req.body.customerEmail);
            await emailService.sendBookingConfirmation(
              req.body.customerEmail,
              req.body.customerName,
              {
                ...bookingData,
                tableNumber: booking.tableId,
                id: booking.id
              }
            );
            console.log('Guest confirmation email sent successfully');
          }

          // Send notification to restaurant if enabled
          const shouldSendRestaurantNotification = emailSettings?.placeSettings?.emailBooking !== false;
          const restaurantEmail = emailSettings?.placeSettings?.sentTo || restaurant?.email;
          console.log('Should send restaurant notification:', shouldSendRestaurantNotification, 'to email:', restaurantEmail);

          if (shouldSendRestaurantNotification && restaurantEmail) {
            console.log('Sending restaurant notification email to:', restaurantEmail);
            await emailService.sendRestaurantNotification(restaurantEmail, {
              customerName: req.body.customerName,
              customerEmail: req.body.customerEmail,
              customerPhone: req.body.customerPhone,
              ...bookingData
            });
            console.log('Restaurant notification email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          // Don't fail the booking if email fails
        }
      } else {
        console.log('Email service not available - skipping email notifications');
      }

      res.json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  // Customer booking management routes (public access with hash verification)
  app.get("/api/booking-manage/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { hash, action } = req.query;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - accept manage, cancel, or change hashes
      let isValidHash = false;
      
      // Try verifying with the specific action if provided
      if (action && (action === 'cancel' || action === 'change')) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          action as 'cancel' | 'change'
        );
      }
      
      // If no specific action or verification failed, try with manage hash
      if (!isValidHash) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          'manage'
        );
      }

      if (!isValidHash) {
        return res.status(403).json({ message: "Access denied - invalid or expired link" });
      }

      // Check if booking time has passed to determine allowed actions
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const bookingTimeComponents = booking.startTime.split(':');
      bookingDateTime.setHours(parseInt(bookingTimeComponents[0]), parseInt(bookingTimeComponents[1]), 0, 0);
      
      // Add booking duration (assume 2 hours if not specified)
      const bookingEndTime = new Date(bookingDateTime);
      bookingEndTime.setHours(bookingEndTime.getHours() + 2);
      
      const isPastBooking = now > bookingEndTime;
      const isBookingStarted = now >= bookingDateTime;

      // Return booking with action permissions
      const bookingWithPermissions = {
        ...booking,
        canModify: !isBookingStarted, // Can modify if booking hasn't started
        canCancel: !isBookingStarted, // Can cancel if booking hasn't started
        isPastBooking: isPastBooking,
        isBookingStarted: isBookingStarted
      };

      res.json(bookingWithPermissions);
    } catch (error) {
      console.error("Error fetching booking for customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/booking-manage/:id/available-tables", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { hash, action } = req.query;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - accept manage, cancel, or change hashes
      let isValidHash = false;
      
      // Try verifying with the specific action if provided
      if (action && (action === 'cancel' || action === 'change')) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          action as 'cancel' | 'change'
        );
      }
      
      // If no specific action or verification failed, try with manage hash
      if (!isValidHash) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          'manage'
        );
      }

      if (!isValidHash) {
        return res.status(403).json({ message: "Access denied - invalid security token" });
      }

      // Get available tables for the restaurant
      const tables = await storage.getTablesByRestaurant(booking.restaurantId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching available tables:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/booking-manage/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const { hash, action } = req.query;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - accept manage, cancel, or change hashes
      let isValidHash = false;
      
      // Try verifying with the specific action if provided
      if (action && (action === 'cancel' || action === 'change')) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          action as 'cancel' | 'change'
        );
      }
      
      // If no specific action or verification failed, try with manage hash
      if (!isValidHash) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          'manage'
        );
      }

      if (!isValidHash) {
        return res.status(403).json({ message: "Access denied - invalid security token" });
      }

      // Check if booking time has passed to prevent modifications
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const bookingTimeComponents = booking.startTime.split(':');
      bookingDateTime.setHours(parseInt(bookingTimeComponents[0]), parseInt(bookingTimeComponents[1]), 0, 0);
      
      const isBookingStarted = now >= bookingDateTime;

      if (isBookingStarted) {
        return res.status(403).json({ 
          message: "Cannot modify booking - the booking time has already started or passed" 
        });
      }

      // Only allow updating certain fields for customer management
      const allowedUpdates: any = {};
      if (updates.tableId !== undefined) {
        allowedUpdates.tableId = updates.tableId;
      }
      if (updates.status !== undefined) {
        allowedUpdates.status = updates.status;
      }
      if (updates.bookingDate !== undefined) {
        allowedUpdates.bookingDate = new Date(updates.bookingDate);
      }
      if (updates.startTime !== undefined) {
        allowedUpdates.startTime = updates.startTime;
      }
      if (updates.guestCount !== undefined) {
        allowedUpdates.guestCount = updates.guestCount;
      }

      const updatedBooking = await storage.updateBooking(id, allowedUpdates);
      
      // Send real-time notification to restaurant
      broadcastNotification(updatedBooking.restaurantId, {
        type: 'booking_changed',
        booking: updatedBooking,
        changes: allowedUpdates,
        timestamp: new Date().toISOString()
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Statistics routes (read-only data aggregation)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/statistics", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { startDate, endDate } = req.query;

      // Get bookings for the date range
      const bookings = await storage.getBookingsByRestaurant(restaurantId);
      const customers = await storage.getCustomersByRestaurant(restaurantId);
      const tables = await storage.getTablesByRestaurant(restaurantId);

      // Filter by tenantId for security
      const tenantBookings = bookings.filter(booking => booking.tenantId === tenantId);
      const tenantCustomers = customers.filter(customer => customer.tenantId === tenantId);
      const tenantTables = tables.filter(table => table.tenantId === tenantId);

      // Calculate current month's bookings for monthly revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyBookings = tenantBookings.filter(booking => {
        const bookingDate = new Date(booking.bookingDate);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      });

      // Calculate statistics
      const totalBookings = tenantBookings.length;
      const totalCustomers = tenantCustomers.length;
      const totalTables = tenantTables.length;

      // Group bookings by status
      const bookingsByStatus = tenantBookings.reduce((acc: any, booking) => {
        const status = booking.status || 'confirmed';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Calculate table utilization (percentage of tables used in current month)
      const uniqueTablesUsed = new Set(monthlyBookings.map(booking => booking.tableId).filter(Boolean)).size;
      const tableUtilization = totalTables > 0 ? (uniqueTablesUsed / totalTables) * 100 : 0;

      // Calculate monthly revenue (assuming average booking value of $50)
      const avgBookingValue = 50;
      const monthlyRevenue = monthlyBookings.length * avgBookingValue;

      // Calculate average bookings per day for current month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const avgBookingsPerDay = monthlyBookings.length / daysInMonth;

      const statistics = {
        totalBookings: totalBookings || 0,
        totalCustomers: totalCustomers || 0,
        tableUtilization: Math.min(Math.round(tableUtilization * 10) / 10, 100), // Round to 1 decimal, cap at 100%
        monthlyRevenue: monthlyRevenue || 0,
        bookingsByStatus: bookingsByStatus || { confirmed: 0, pending: 0, cancelled: 0 },
        avgBookingsPerDay: Math.round(avgBookingsPerDay * 10) / 10 || 0,
        monthlyBookings: monthlyBookings.length || 0,
        totalTables: totalTables || 0
      };

      res.json(statistics);
    } catch (error) {
      console.error("Statistics calculation error:", error);
      res.status(500).json({ message: "Failed to calculate statistics" });
    }
  });

  // Stripe webhook to handle successful payments
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret'
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    console.log(`Received webhook event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, planId } = session.metadata!;

      console.log(`Processing checkout.session.completed for user ${userId}, plan ${planId}`);

      // Check if user already has a subscription
      const existingSubscription = await storage.getUserSubscription(parseInt(userId));

      if (existingSubscription) {
        // Update existing subscription
        await storage.updateUserSubscription(existingSubscription.id, {
          planId: parseInt(planId),
          stripeSubscriptionId: session.subscription as string,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        console.log(`Updated existing subscription for user ${userId}`);
      } else {
        // Create new subscription
        await storage.createUserSubscription({
          userId: parseInt(userId),
          planId: parseInt(planId),
          stripeSubscriptionId: session.subscription as string,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        console.log(`Created new subscription for user ${userId}`);
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      // Find user subscription by Stripe subscription ID and extend their period
      const userSubscription = await storage.getUserSubscriptionByStripeId(subscriptionId);
      if (userSubscription) {
        await storage.updateUserSubscription(userSubscription.id, {
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
        console.log(`Extended subscription for user ${userSubscription.userId}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userSubscription = await storage.getUserSubscriptionByStripeId(subscription.id);
      if (userSubscription) {
        await storage.updateUserSubscription(userSubscription.id, {
          status: 'cancelled'
        });
        console.log(`Cancelled subscription for user ${userSubscription.userId}`);
      }
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.restaurantId) {
          const restaurantKey = `restaurant_${data.restaurantId}`;

          if (!wsConnections.has(restaurantKey)) {
            wsConnections.set(restaurantKey, new Set());
          }

          wsConnections.get(restaurantKey)!.add(ws);
          console.log(`Client subscribed to restaurant ${data.restaurantId} notifications`);

          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            restaurantId: data.restaurantId
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Remove connection from all restaurant subscriptions
      wsConnections.forEach((connections, key) => {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(key);
        }
      });
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}

// The code has been modified to improve email confirmation debugging and error handling.