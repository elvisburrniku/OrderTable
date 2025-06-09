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
import { QRCodeService } from "./qr-service";
import { WebhookService } from "./webhook-service";
import { MetaIntegrationService } from "./meta-service";
import { metaInstallService } from "./meta-install-service";

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

// Initialize webhook service
const webhookService = new WebhookService(storage);

// WebSocket connections store
const wsConnections = new Map<string, Set<WebSocket>>();

// Broadcast notification to all connected clients for a restaurant
function broadcastNotification(restaurantId: number, notification: any) {
  const restaurantKey = `restaurant_${restaurantId}`;
  const connections = wsConnections.get(restaurantKey);

  console.log(`Broadcasting notification for restaurant ${restaurantId}, connections found: ${connections ? connections.size : 0}`);

  if (connections && connections.size > 0) {
    const message = JSON.stringify({
      type: 'notification',
      notification: notification
    });
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

  // Middleware to attach user from session to request
  const attachUser = (req: any, res: any, next: any) => {
    if (req.session && req.session.user) {
      req.user = req.session.user;
    }
    next();
  };

  // Apply session middleware to all routes
  app.use(attachUser);

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
      const sessionUser = (req as any).session?.user;
      if (sessionUser) {
        res.json({ 
          valid: true,
          message: "Session valid",
          user: sessionUser,
          tenant: (req as any).session.tenant,
          restaurant: (req as any).session.restaurant
        });
      } else {
        res.status(401).json({ valid: false, message: "No valid session" });
      }
    } catch (error) {
      res.status(401).json({ valid: false, message: "Invalid session" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate input using Zod schema
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input format",
          errors: validationResult.error.errors
        });
      }

      const { email, password } = validationResult.data;

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

      // Store user in session for persistent authentication
      (req as any).session.user = { ...user, password: undefined };
      (req as any).session.tenant = tenantUser;
      (req as any).session.restaurant = restaurant;

      res.json({ 
        user: { ...user, password: undefined },
        tenant: tenantUser,
        restaurant: restaurant ? { ...restaurant, tenantId: restaurant.tenantId || tenantUser.id } : null
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
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

      // Create tenant for the new user with unique slug generation
      const baseSlug = (restaurantName || 'restaurant').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + (trialPlan.trialDays || 30));

      let slug = baseSlug;
      let counter = 1;
      let tenant;

      // Try to create tenant with unique slug
      while (true) {
        try {
          tenant = await storage.createTenant({
            name: restaurantName || 'New Restaurant',
            slug,
            subscriptionPlanId: trialPlan.id,
            subscriptionStatus: "trial",
            trialEndDate,
            maxRestaurants: trialPlan.maxRestaurants || 1
          });
          break;
        } catch (error: any) {
          if (error.code === '23505' && error.constraint === 'tenants_slug_unique') {
            slug = `${baseSlug}-${counter}`;
            counter++;
            if (counter > 100) {
              throw new Error('Unable to generate unique slug');
            }
          } else {
            throw error;
          }
        }
      }

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
        emailSettings: JSON.stringify({}),
        address: null,
        phone: null,
        email: null,
        description: null
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
    } catch (error: any) {
      console.error("Registration error:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: error.errors
        });
      }
      
      if (error.code === '23505') {
        if (error.constraint === 'users_email_unique') {
          return res.status(400).json({ message: "Email already exists" });
        }
        if (error.constraint === 'tenants_slug_unique') {
          return res.status(400).json({ message: "Restaurant name already exists, please try a different name" });
        }
        return res.status(400).json({ message: "Registration data conflict" });
      }
      
      if (error.code === '42703') {
        return res.status(500).json({ message: "Database configuration error" });
      }
      
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

      // Generate and store management hash for the booking
      if (booking.id) {
        const managementHash = BookingHash.generateHash(
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          'manage'
        );

        await storage.updateBooking(booking.id, { managementHash });
        booking.managementHash = managementHash;
        console.log(`Stored management hash for booking ${booking.id}: ${managementHash}`);
      }

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

      // Send webhook notifications
      try {
        const webhookService = new WebhookService(storage);
        await webhookService.notifyBookingCreated(restaurantId, {
          ...booking,
          customerName: req.body.customerName,
          customerEmail: req.body.customerEmail,
          customerPhone: req.body.customerPhone
        });
      } catch (webhookError) {
        console.error('Error sending webhook notifications:', webhookError);
        // Don't fail the booking if webhook fails
      }

      // Send Meta (Facebook/Instagram) notifications if enabled
      try {
        const metaService = new MetaIntegrationService(storage);
        await metaService.notifyBookingCreated(restaurantId, {
          ...booking,
          customerName: req.body.customerName,
          customerEmail: req.body.customerEmail,
          customerPhone: req.body.customerPhone
        });
      } catch (metaError) {
        console.error('Error sending Meta integration notifications:', metaError);
        // Don't fail the booking if Meta integration fails
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

      console.log(`Fetching tables for restaurant ${restaurantId}, tenant ${tenantId}`);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        console.log(`Restaurant ${restaurantId} not found or doesn't belong to tenant ${tenantId}`);
        return res.status(404).json({ message: "Restaurant not found" });
      }

      console.log(`Restaurant found: ${restaurant.name}, fetching tables...`);
      const tables = await storage.getTablesByRestaurant(restaurantId);
      console.log(`Found ${tables.length} tables for restaurant ${restaurantId}`);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables for tenant/restaurant:", error);
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

      // Create table first
      const table = await storage.createTable(tableData);

      // Generate QR code for the table
      try {
        const qrCode = await QRCodeService.generateTableQRCode(
          table.id,
          table.tableNumber,
          restaurantId,
          tenantId
        );

        // Update table with QR code
        const updatedTable = await storage.updateTable(table.id, { qrCode });
        res.json(updatedTable || table);
      } catch (qrError) {
        console.error('Error generating QR code for table:', qrError);
        // Return table without QR code if generation fails
        res.json(table);
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid table data" });
    }
  });

  // QR Code route for tables
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/tables/:tableId/qr", validateTenant, async (req, res) => {
    try {
      const tableId = parseInt(req.params.tableId);
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify table belongs to tenant
      const table = await storage.getTableById(tableId);
      if (!table || table.tenantId !== tenantId || table.restaurantId !== restaurantId) {
        return res.status(404).json({ message: "Table not found" });
      }

      // If table already has QR code, return it
      if (table.qrCode) {
        res.json({ qrCode: table.qrCode });
        return;
      }

      // Generate new QR code if it doesn't exist
      try {
        const qrCode = await QRCodeService.generateTableQRCode(
          table.id,
          table.tableNumber,
          restaurantId,
          tenantId
        );

        // Update table with QR code
        await storage.updateTable(table.id, { qrCode });
        res.json({ qrCode });
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        res.status(500).json({ message: "Failed to generate QR code" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
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

  // Public restaurant info (for customers via QR code)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Return only public information
      res.json({
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        tenantId: restaurant.tenantId
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Public table info (for customers via QR code)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/tables/:tableId", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const tableId = parseInt(req.params.tableId);

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const table = await storage.getTableById(tableId);
      if (!table || table.restaurantId !== restaurantId) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Return only public table information
      res.json({
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        restaurantId: table.restaurantId
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Public booking info for feedback validation (for customers via QR code)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/bookings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { date, table } = req.query;

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      let bookings = [];
      
      if (date && table) {
        // Get bookings for specific date and table
        const allBookings = await storage.getBookingsByDate(restaurantId, date as string);
        bookings = allBookings.filter(booking => 
          booking.tableId === parseInt(table as string) &&
          booking.status !== 'cancelled'
        );
      }

      // Return only necessary booking information for feedback validation
      const publicBookings = bookings.map(booking => ({
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        tableId: booking.tableId,
        status: booking.status
      }));

      res.json(publicBookings);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Public feedback submission (for customers via QR code)
  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/feedback", async (req, res) => {
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

  // Admin feedback route (requires authentication)
  app.post("/api/admin/tenants/:tenantId/restaurants/:restaurantId/feedback", validateTenant, async (req, res) => {
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

      // Extract cutOffTimes array from request body
      const { cutOffTimes: timesData } = req.body;
      if (!timesData || !Array.isArray(timesData)) {
        return res.status(400).json({ message: "cutOffTimes array is required" });
      }

      const savedTimes = await storage.createOrUpdateCutOffTimes(restaurantId, tenantId, timesData);
      res.json(savedTimes);
    } catch (error) {
      console.error("Error saving cut-off times:", error);
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

        // Create persistent notification
        const restaurant = await storage.getRestaurantById(restaurantId);
        const notification = await storage.createNotification({
          restaurantId: restaurantId,
          tenantId: booking.tenantId,
          type: 'new_booking',
          title: 'New Booking Created',
          message: `New booking for ${req.body.customerName} on ${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.startTime}`,
          bookingId: booking.id,
          data: {
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
              name: restaurant?.name
            }
          },
          canRevert: false
        });

        const notificationData = {
          type: 'notification',
          notification: {
            id: notification.id,
            type: 'new_booking',
            title: notification.title,
            message: notification.message,
            booking: notification.data.booking,
            restaurant: notification.data.restaurant,
            timestamp: notification.createdAt,
            read: false,
            canRevert: false
          }
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
      
      // Send webhook notifications for booking update
      if (booking) {
        try {
          const webhookService = new WebhookService(storage);
          await webhookService.notifyBookingUpdated(restaurantId, booking);
        } catch (webhookError) {
          console.error('Error sending booking update webhook:', webhookError);
        }
      }
      
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

      // Send webhook notifications before deletion
      try {
        await webhookService.notifyBookingDeleted(existingBooking.restaurantId, existingBooking);
      } catch (webhookError) {
        console.error('Error sending booking deletion webhook:', webhookError);
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
      const { hash, action } = req.query;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - prioritize stored management hash
      let isValidHash = false;

      console.log(`Verifying hash for booking ${booking.id}, tenant ${booking.tenantId}, restaurant ${booking.restaurantId}`);
      console.log(`Hash: ${hash}, Action: ${action}`);
      console.log(`Stored management hash: ${booking.managementHash}`);

      // First check if the provided hash matches the stored management hash
      // The management hash should work for all actions (manage, cancel, change)
      if (booking.managementHash && hash === booking.managementHash) {
        isValidHash = true;
        console.log(`Hash matches stored management hash`);
      } else if (booking.managementHash) {
        // If we have a stored hash but it doesn't match, still try action-specific verification
        // for backwards compatibility with old email links
        console.log(`Hash does not match stored management hash, trying action-specific verification`);
        if (action && (action === 'cancel' || action === 'change')) {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            action as 'cancel' | 'change'
          );
        } else {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            'manage'
          );
        }
        console.log(`Action-specific hash verification result: ${isValidHash}`);
      } else {
        // Fallback for old bookings without stored hashes
        console.log(`No stored management hash, trying action verification`);
        if (action && (action === 'cancel' || action === 'change')) {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            action as 'cancel' | 'change'
          );
        } else {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            'manage'
          );
        }
        console.log(`Fallback hash verification result: ${isValidHash}`);
      }

      if (!isValidHash) {
        console.log(`Hash verification failed for booking ${booking.id}`);
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

      // Get cut-off times for the restaurant
      const cutOffTimes = await storage.getCutOffTimesByRestaurant(booking.restaurantId);

      // Determine cut-off deadline based on restaurant policy
      const dayOfWeek = bookingDateTime.getDay();

      const cutOffTime = cutOffTimes.find((ct: any) => ct.dayOfWeek === dayOfWeek);

      let canModify = false;
      let canCancel = false;

      if (!isBookingStarted && !isPastBooking) {
        if (!cutOffTime || !cutOffTime.isEnabled) {
          // Default: allow changes up to 2 hours before booking for customer management
          const cutOffDeadline = new Date(bookingDateTime.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before in milliseconds
          canModify = now < cutOffDeadline;
          canCancel = now < cutOffDeadline;
          console.log(`Default cut-off: Now ${now.toISOString()}, Deadline ${cutOffDeadline.toISOString()}, Can modify: ${canModify}`);
        } else {
          // Use restaurant's cut-off time policy
          const cutOffDeadline = new Date(bookingDateTime.getTime() - (cutOffTime.hoursBeforeBooking * 60 * 60 * 1000));
          canModify = now < cutOffDeadline;
          canCancel = now < cutOffDeadline;
          console.log(`Restaurant cut-off (${cutOffTime.hoursBeforeBooking}h): Now ${now.toISOString()}, Deadline ${cutOffDeadline.toISOString()}, Can modify: ${canModify}`);
        }
      }

      // Return booking with action permissions
      const bookingWithPermissions = {
        ...booking,
        canModify: canModify,
        canCancel: canCancel,
        isPastBooking: isPastBooking,
        isBookingStarted: isBookingStarted,
        cutOffHours: cutOffTime?.hoursBeforeBooking || 2 // Include cut-off info for UI
      };

      res.json(bookingWithPermissions);
    } catch (error) {
      console.error("Error fetching booking for customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get change requests for a specific booking (customer view)
  app.get("/api/booking-manage/:id/change-requests", async (req, res) => {
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

      // Verify hash using the stored management hash
      let isValidHash = false;
      if (booking.managementHash && hash === booking.managementHash) {
        isValidHash = true;
      } else {
        // Try verifying with manage hash for legacy bookings
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

      const changeRequests = await storage.getBookingChangeRequestsByBookingId(bookingId);
      res.json(changeRequests);
    } catch (error) {
      console.error("Error fetching booking change requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Available tables route for booking management
  app.get("/api/booking-manage/:id/available-tables", async (req, res) => {
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

      // Verify hash - accept management, cancel, or change hashes
      let isValidHash = false;

      // First try stored management hash
      if (booking.managementHash && hash === booking.managementHash) {
        isValidHash = true;
        console.log(`Hash matches stored management hash`);
      } else {
        console.log(`Hash does not match stored management hash`);
        
        // Try action-specific hashes for backwards compatibility
        const actions = ['manage', 'cancel', 'change'];
        for (const action of actions) {
          if (BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            action as 'manage' | 'cancel' | 'change'
          )) {
            isValidHash = true;
            console.log(`Hash verified with ${action} action`);
            break;
          }
        }
      }

      if (!isValidHash) {
        console.log(`Hash verification failed for booking ${booking.id}`);
        return res.status(403).json({ message: "Access denied - invalid or expired link" });
      }


      // Get available tables for the restaurant
      const tables = await storage.getTablesByRestaurant(booking.restaurantId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching available tables:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel booking route for booking management
  app.post("/api/booking-manage/:id/cancel", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { hash } = req.body;

      if (!hash) {
        return res.status(403).json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash using the stored management hash
      let isValidHash = false;
      if (booking.managementHash && hash === booking.managementHash) {
        isValidHash = true;
      } else {
        // Try verifying with cancel hash for legacy bookings
        isValidHash = BookingHash.verifyHash(
          hash,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          'cancel'
        );
      }

      if (!isValidHash) {
        return res.status(403).json({ message: "Access denied - invalid security token" });
      }

      // Check if booking can still be cancelled
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

      // Cancel the booking
      const updatedBooking = await storage.updateBooking(id, { status: 'cancelled' });

      // Send real-time notification to restaurant
      broadcastNotification(updatedBooking.restaurantId, {
        type: 'booking_cancelled',
        booking: updatedBooking,
        cancelledBy: 'customer',
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Booking cancelled successfully", booking: updatedBooking });
    } catch (error) {
      console.error("Error cancelling booking:", error);
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

      // For any date/time/guest changes, validate availability and create change request
      if (updates.bookingDate || updates.startTime || updates.guestCount) {
        console.log('Processing change request for date/time/guest count changes');
        
        // Validate availability for the requested changes
        const requestedDate = updates.bookingDate ? new Date(updates.bookingDate) : booking.bookingDate;
        const requestedTime = updates.startTime || booking.startTime;
        const requestedGuestCount = updates.guestCount || booking.guestCount;
        
        // Check if restaurant is open on the requested day
        const dayOfWeek = requestedDate.getDay();
        const openingHours = await storage.getOpeningHoursByRestaurant(booking.restaurantId);
        const dayHours = openingHours.find(oh => oh.dayOfWeek === dayOfWeek);
        
        if (!dayHours || !dayHours.isOpen) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = dayNames[dayOfWeek];
          return res.status(400).json({ 
            message: `Restaurant is closed on ${dayName}s. Please choose a different date.` 
          });
        }
        
        // Check if requested time is within opening hours
        const timeInMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const requestedTimeMinutes = timeInMinutes(requestedTime);
        const openTimeMinutes = timeInMinutes(dayHours.openTime);
        const closeTimeMinutes = timeInMinutes(dayHours.closeTime);
        
        if (requestedTimeMinutes < openTimeMinutes || requestedTimeMinutes > closeTimeMinutes) {
          return res.status(400).json({
            message: `Requested time ${requestedTime} is outside restaurant hours (${dayHours.openTime} - ${dayHours.closeTime})`
          });
        }
        
        // Check for booking conflicts
        const existingBookings = await storage.getBookingsByDate(
          booking.restaurantId, 
          requestedDate.toISOString().split('T')[0]
        );
        
        const hasConflict = existingBookings.some(existingBooking => {
          // Skip checking against the current booking
          if (existingBooking.id === booking.id) return false;
          if (existingBooking.status === 'cancelled') return false;
          
          // Check if booking times overlap
          const existingStartMinutes = timeInMinutes(existingBooking.startTime);
          const existingEndMinutes = timeInMinutes(existingBooking.endTime || 
            `${Math.floor((existingStartMinutes + 120) / 60).toString().padStart(2, '0')}:${((existingStartMinutes + 120) % 60).toString().padStart(2, '0')}`);
          
          const requestedEndMinutes = requestedTimeMinutes + 120; // Assume 2-hour duration
          
          return (requestedTimeMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes);
        });
        
        if (hasConflict) {
          return res.status(400).json({
            message: `The requested time ${requestedTime} conflicts with another booking. Please choose a different time.`
          });
        }
        
        // Create a change request that requires admin approval
        const changeRequest = await storage.createBookingChangeRequest({
          bookingId: id,
          restaurantId: booking.restaurantId,
          tenantId: booking.tenantId,
          requestedDate: requestedDate,
          requestedTime: requestedTime,
          requestedGuestCount: requestedGuestCount,
          requestNotes: updates.reason || 'Customer requested booking changes',
          status: 'pending'
        });

        // Create persistent notification
        const notification = await storage.createNotification({
          restaurantId: booking.restaurantId,
          tenantId: booking.tenantId,
          type: 'booking_change_request',
          title: 'Booking Change Request',
          message: `${booking.customerName} requested to change their booking from ${new Date(booking.bookingDate).toLocaleDateString()} ${booking.startTime}`,
          bookingId: booking.id,
          changeRequestId: changeRequest.id,
          data: {
            changeRequest: changeRequest,
            booking: booking
          },
          canRevert: false
        });

        // Send real-time notification to restaurant admin
        broadcastNotification(booking.restaurantId, {
          type: 'booking_change_request',
          changeRequest: changeRequest,
          booking: booking,
          notification: notification,
          timestamp: new Date().toISOString()
        });

        // Send email notification to restaurant if available
        if (emailService) {
          try {
            const restaurant = await storage.getRestaurantById(booking.restaurantId);
            if (restaurant && restaurant.email) {
              await emailService.sendBookingChangeRequest(restaurant.email, changeRequest, booking);
              console.log('Booking change request email sent to restaurant');
            }
          } catch (error) {
            console.error('Failed to send change request email:', error);
          }
        }

        res.json({ 
          message: 'Change request submitted successfully. The restaurant will review your request and notify you of their decision.',
          changeRequest: changeRequest
        });
      } else if (action === 'cancel') {
        // For cancellations, update the booking status immediately but notify the restaurant
        const updatedBooking = await storage.updateBooking(id, { status: 'cancelled' });

        // Create persistent notification
        const notification = await storage.createNotification({
          restaurantId: updatedBooking.restaurantId,
          tenantId: updatedBooking.tenantId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `${updatedBooking.customerName} cancelled their booking for ${new Date(updatedBooking.bookingDate).toLocaleDateString()} at ${updatedBooking.startTime}`,
          bookingId: updatedBooking.id,
          data: {
            booking: updatedBooking,
            cancelledBy: 'customer'
          },
          canRevert: false
        });

        // Send real-time notification to restaurant
        broadcastNotification(updatedBooking.restaurantId, {
          type: 'booking_cancelled',
          booking: updatedBooking,
          cancelledBy: 'customer',
          notification: notification,
          timestamp: new Date().toISOString()
        });

        res.json(updatedBooking);
      } else {
        // Store original booking data before making changes
        const originalBooking = { ...booking };

        // For other updates (table changes, etc.), update directly
        const updatedBooking = await storage.updateBooking(id, allowedUpdates);

        // Create persistent notification with revert capability
        const notification = await storage.createNotification({
          restaurantId: updatedBooking.restaurantId,
          tenantId: updatedBooking.tenantId,
          type: 'booking_changed',
          title: 'Booking Modified',
          message: `${updatedBooking.customerName} modified their booking for ${new Date(updatedBooking.bookingDate).toLocaleDateString()} at ${updatedBooking.startTime}`,
          bookingId: updatedBooking.id,
          data: {
            booking: updatedBooking,
            changes: allowedUpdates
          },
          originalData: {
            bookingDate: originalBooking.bookingDate,
            startTime: originalBooking.startTime,
            endTime: originalBooking.endTime,
            guestCount: originalBooking.guestCount,
            tableId: originalBooking.tableId,
            notes: originalBooking.notes
          },
          canRevert: true
        });

        // Send real-time notification to restaurant with original data for reverting
        broadcastNotification(updatedBooking.restaurantId, {
          type: 'booking_changed',
          booking: updatedBooking,
          changes: allowedUpdates,
          notification: notification,
          originalData: {
            bookingDate: originalBooking.bookingDate,
            startTime: originalBooking.startTime,
            endTime: originalBooking.endTime,
            guestCount: originalBooking.guestCount,
            tableId: originalBooking.tableId,
            notes: originalBooking.notes
          },
          timestamp: new Date().toISOString()
        });

        res.json(updatedBooking);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking Change Request Management Routes
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

  // Approve change request
  app.patch("/api/tenants/:tenantId/restaurants/:restaurantId/change-requests/:requestId/approve", attachUser, validateTenant, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { response } = req.body;

      const changeRequest = await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }

      if (changeRequest.status !== 'pending') {
        return res.status(400).json({ message: "Change request has already been processed" });
      }

      const booking = await storage.getBookingById(changeRequest.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update change request status
      await storage.updateBookingChangeRequest(requestId, {
        status: 'approved',
        restaurantResponse: response || 'Approved via admin dashboard',
        respondedAt: new Date()
      });

      // Apply the changes to the booking
      const bookingUpdates: any = {};
      if (changeRequest.requestedDate) {
        bookingUpdates.bookingDate = changeRequest.requestedDate;
      }
      if (changeRequest.requestedTime) {
        bookingUpdates.startTime = changeRequest.requestedTime;
      }
      if (changeRequest.requestedGuestCount) {
        bookingUpdates.guestCount = changeRequest.requestedGuestCount;
      }

      const updatedBooking = await storage.updateBooking(changeRequest.bookingId, bookingUpdates);

      // Send email notification to customer
      try {
        const emailService = new BrevoEmailService();
        await emailService.sendChangeRequestResponse(
          booking.customerEmail,
          booking.customerName,
          true, // approved
          {
            id: booking.id,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            bookingDate: updatedBooking.bookingDate,
            startTime: updatedBooking.startTime,
            guestCount: updatedBooking.guestCount,
            restaurantId: booking.restaurantId,
            tenantId: booking.tenantId,
            managementHash: booking.managementHash
          },
          {
            requestedDate: changeRequest.requestedDate,
            requestedTime: changeRequest.requestedTime,
            requestedGuestCount: changeRequest.requestedGuestCount
          },
          response || 'Your booking change request has been approved.'
        );
        console.log(`Approval email sent to ${booking.customerEmail}`);
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }

      // Send real-time notification
      broadcastNotification(booking.restaurantId, {
        type: 'change_request_approved',
        changeRequest: { ...changeRequest, status: 'approved' },
        booking: updatedBooking,
        timestamp: new Date().toISOString()
      });

      res.json({ 
        message: "Change request approved successfully", 
        changeRequest: { ...changeRequest, status: 'approved' },
        booking: updatedBooking
      });
    } catch (error) {
      console.error("Error approving change request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reject change request
  app.patch("/api/tenants/:tenantId/restaurants/:restaurantId/change-requests/:requestId/reject", attachUser, validateTenant, async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { response } = req.body;

      const changeRequest = await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }

      if (changeRequest.status !== 'pending') {
        return res.status(400).json({ message: "Change request has already been processed" });
      }

      // Update change request status
      await storage.updateBookingChangeRequest(requestId, {
        status: 'rejected',
        restaurantResponse: response || 'Rejected via admin dashboard',
        respondedAt: new Date()
      });

      const booking = await storage.getBookingById(changeRequest.bookingId);
      
      // Send email notification to customer
      try {
        const emailService = new BrevoEmailService();
        await emailService.sendChangeRequestResponse(
          booking.customerEmail,
          booking.customerName,
          false, // rejected
          {
            id: booking.id,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            guestCount: booking.guestCount,
            restaurantId: booking.restaurantId,
            tenantId: booking.tenantId,
            managementHash: booking.managementHash
          },
          {
            requestedDate: changeRequest.requestedDate,
            requestedTime: changeRequest.requestedTime,
            requestedGuestCount: changeRequest.requestedGuestCount
          },
          response || 'Your booking change request has been rejected.'
        );
        console.log(`Rejection email sent to ${booking.customerEmail}`);
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }

      // Send real-time notification
      broadcastNotification(changeRequest.restaurantId, {
        type: 'change_request_rejected',
        changeRequest: { ...changeRequest, status: 'rejected' },
        timestamp: new Date().toISOString()
      });

      res.json({ 
        message: "Change request rejected successfully", 
        changeRequest: { ...changeRequest, status: 'rejected' }
      });
    } catch (error) {
      console.error("Error rejecting change request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email-based approval route (for clicking links in emails)
  app.get("/booking-change-response/:requestId", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { action, hash } = req.query;

      if (!['approve', 'reject'].includes(action as string)) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Invalid Action</h2>
              <p>The action must be either 'approve' or 'reject'.</p>
            </body>
          </html>
        `);
      }

      if (!hash) {
        return res.status(403).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Access Denied</h2>
              <p>Security token is required to process this request.</p>
            </body>
          </html>
        `);
      }

      const changeRequest = await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Change Request Not Found</h2>
              <p>The requested booking change could not be found.</p>
            </body>
          </html>
        `);
      }

      const booking = await storage.getBookingById(changeRequest.bookingId);
      if (!booking) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Booking Not Found</h2>
              <p>The associated booking could not be found.</p>
            </body>
          </html>
        `);
      }

      // Verify hash
      const expectedHash = BookingHash.generateHash(
        changeRequest.id,
        booking.tenantId,
        booking.restaurantId,
        action as 'approve' | 'reject'
      );

      if (hash !== expectedHash) {
        return res.status(403).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Access Denied</h2>
              <p>Invalid or expired security token.</p>
            </body>
          </html>
        `);
      }

      // Check if already processed
      if (changeRequest.status !== 'pending') {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Already Processed</h2>
              <p>This change request has already been ${changeRequest.status}.</p>
            </body>
          </html>
        `);
      }

      // Update change request status
      const updatedRequest = await storage.updateBookingChangeRequest(requestId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        restaurantResponse: `Processed via email link on ${new Date().toLocaleString()}`,
        processedAt: new Date()
      });

      if (action === 'approve') {
        // Apply the changes to the booking
        const bookingUpdates: any = {};
        if (changeRequest.requestedDate) {
          bookingUpdates.bookingDate = changeRequest.requestedDate;
        }
        if (changeRequest.requestedTime) {
          bookingUpdates.startTime = changeRequest.requestedTime;
        }
        if (changeRequest.requestedGuestCount) {
          bookingUpdates.guestCount = changeRequest.requestedGuestCount;
        }

        await storage.updateBooking(changeRequest.bookingId, bookingUpdates);

        // Send real-time notification to restaurant
        broadcastNotification(booking.restaurantId, {
          type: 'booking_change_approved',
          booking: { ...booking, ...bookingUpdates },
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString()
        });
      } else {
        // Send real-time notification for rejection
        broadcastNotification(booking.restaurantId, {
          type: 'booking_change_rejected',
          booking: booking,
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString()
        });
      }

      // Send email notification to customer
      if (emailService) {
        try {
          await emailService.sendChangeRequestResponse(
            booking.customerEmail,
            booking.customerName,
            action === 'approve',
            booking,
            changeRequest,
            `Processed via email link on ${new Date().toLocaleString()}`
          );
          console.log(`Change request response email sent to customer: ${action}`);
        } catch (error) {
          console.error('Failed to send change request response email:', error);
        }
      }

      // Return success page
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      const statusColor = action === 'approve' ? '#28a745' : '#dc3545';
      
      return res.send(`
        <html>
          <head>
            <title>Booking Change ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</title>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="width: 60px; height: 60px; border-radius: 50%; background-color: ${statusColor}; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px; font-weight: bold;">${action === 'approve' ? '✓' : '✗'}</span>
              </div>
              <h2 style="color: ${statusColor}; margin-bottom: 20px;">Change Request ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                The booking change request for <strong>${booking.customerName}</strong> has been successfully ${actionText}.
              </p>
              ${action === 'approve' ? `
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: left;">
                  <h4 style="margin: 0 0 10px 0; color: #333;">Updated Booking Details:</h4>
                  <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${changeRequest.requestedDate ? new Date(changeRequest.requestedDate).toLocaleDateString() : 'No change'}</p>
                  <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${changeRequest.requestedTime || 'No change'}</p>
                  <p style="margin: 5px 0; color: #666;"><strong>Party Size:</strong> ${changeRequest.requestedGuestCount || 'No change'}</p>
                </div>
              ` : ''}
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                The customer has been automatically notified of this decision via email.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error processing change request via email:", error);
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Server Error</h2>
            <p>An error occurred while processing your request. Please try again later.</p>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/booking-change-response/:requestId", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { action, response } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'" });
      }

      const changeRequest = await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const booking = await storage.getBookingById(changeRequest.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update change request status
      const updatedRequest = await storage.updateBookingChangeRequest(requestId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        restaurantResponse: response || null,
        processedAt: new Date()
      });

      if (action === 'approve') {
        // Apply the changes to the booking
        const bookingUpdates: any = {};
        if (changeRequest.requestedDate) {
          bookingUpdates.bookingDate = changeRequest.requestedDate;
        }
        if (changeRequest.requestedTime) {
          bookingUpdates.startTime = changeRequest.requestedTime;
        }
        if (changeRequest.requestedGuestCount) {
          bookingUpdates.guestCount = changeRequest.requestedGuestCount;
        }

        const updatedBooking = await storage.updateBooking(changeRequest.bookingId, bookingUpdates);

        // Send real-time notification to restaurant
        broadcastNotification(booking.restaurantId, {
          type: 'booking_change_approved',
          booking: updatedBooking,
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString()
        });
      } else {
        // Send real-time notification for rejection
        broadcastNotification(booking.restaurantId, {
          type: 'booking_change_rejected',
          booking: booking,
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString()
        });
      }

      // Send email notification to customer
      if (emailService) {
        try {
          await emailService.sendChangeRequestResponse(
            changeRequest.customerEmail,
            changeRequest.customerName,
            action === 'approve',
            booking,
            changeRequest,
            response
          );
          console.log(`Change request response email sent to customer: ${action}`);
        } catch (error) {
          console.error('Failed to send change request response email:', error);
        }
      }

      res.json({
        message: `Change request ${action}d successfully`,
        changeRequest: updatedRequest
      });
    } catch (error) {
      console.error("Error processing change request:", error);
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

  // Webhook Management Routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/webhooks", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Check if webhooks integration is enabled
      const webhooksConfig = await storage.getIntegrationConfiguration(restaurantId, 'webhooks');
      if (!webhooksConfig?.isEnabled) {
        return res.status(403).json({ message: "Webhooks integration is not enabled" });
      }

      const webhooks = await storage.getWebhooksByRestaurant(restaurantId);
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/webhooks", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { webhooks } = req.body;

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Check if webhooks integration is enabled
      const webhooksConfig = await storage.getIntegrationConfiguration(restaurantId, 'webhooks');
      if (!webhooksConfig?.isEnabled) {
        return res.status(403).json({ message: "Webhooks integration is not enabled. Please enable it first in the integrations settings." });
      }

      if (!Array.isArray(webhooks)) {
        return res.status(400).json({ message: "Webhooks must be an array" });
      }

      const savedWebhooks = await storage.saveWebhooks(restaurantId, tenantId, webhooks);
      res.json(savedWebhooks);
    } catch (error) {
      console.error("Error saving webhooks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Integration Configuration Routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/integrations", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const configurations = await storage.getIntegrationConfigurationsByRestaurant(restaurantId);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching integration configurations:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const integrationId = req.params.integrationId;
      const { isEnabled, configuration } = req.body;

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const savedConfiguration = await storage.createOrUpdateIntegrationConfiguration(
        restaurantId,
        tenantId,
        integrationId,
        isEnabled,
        configuration || {}
      );

      res.json(savedConfiguration);
    } catch (error) {
      console.error("Error saving integration configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const integrationId = req.params.integrationId;

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const configuration = await storage.getIntegrationConfiguration(restaurantId, integrationId);
      if (!configuration) {
        return res.status(404).json({ message: "Integration configuration not found" });
      }

      res.json(configuration);
    } catch (error) {
      console.error("Error fetching integration configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const integrationId = req.params.integrationId;

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const deleted = await storage.deleteIntegrationConfiguration(restaurantId, integrationId);
      if (!deleted) {
        return res.status(404).json({ message: "Integration configuration not found" });
      }

      res.json({ message: "Integration configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting integration configuration:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate Meta install link
  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/meta-install-link", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Check if Facebook credentials are configured
      const metaConfig = await storage.getIntegrationConfiguration(restaurantId, 'meta');
      let facebookAppId = process.env.FACEBOOK_APP_ID;
      let facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (metaConfig && metaConfig.configuration) {
        const config = typeof metaConfig.configuration === 'string' 
          ? JSON.parse(metaConfig.configuration) 
          : metaConfig.configuration;
        
        if (config.facebookAppId) {
          facebookAppId = config.facebookAppId;
        }
        if (config.facebookAppSecret) {
          facebookAppSecret = config.facebookAppSecret;
        }
      }

      if (!facebookAppId || !facebookAppSecret || facebookAppId === 'YOUR_FACEBOOK_APP_ID') {
        return res.status(400).json({ 
          message: "Facebook App ID and App Secret are required to generate install link. Please configure them in the integration settings." 
        });
      }

      const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : req.protocol + '://' + req.get('host');

      const callbackUrl = `${baseUrl}/api/meta-callback`;

      const installLink = await metaInstallService.generateInstallLink({
        restaurantId,
        tenantId,
        restaurantName: restaurant.name,
        callbackUrl
      });

      res.json({
        installLinkId: installLink.id,
        installUrl: metaInstallService.getInstallLinkUrl(installLink.id),
        facebookAuthUrl: installLink.facebookAuthUrl,
        expiresAt: installLink.expiresAt
      });

    } catch (error) {
      console.error("Error generating Meta install link:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Handle Meta install link access
  app.get("/api/meta-install-link/:linkId", async (req, res) => {
    try {
      const linkId = req.params.linkId;
      const installLink = metaInstallService.getInstallLink(linkId);

      if (!installLink) {
        return res.status(404).json({ 
          code: 404,
          message: "ERROR_MESSAGE_META_INSTALL_LINK_NOT_FOUND",
          statusCode: 404
        });
      }

      // Generate an HTML page that redirects to Facebook OAuth
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Connect to Facebook - ${installLink.restaurantName}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              max-width: 400px;
              width: 100%;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #1877f2;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 20px 0;
              font-size: 24px;
            }
            p {
              color: #666;
              line-height: 1.5;
              margin: 15px 0;
            }
            .restaurant-name {
              font-weight: bold;
              color: #1877f2;
            }
            .connect-btn {
              background: #1877f2;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin: 20px 0;
              transition: background 0.3s;
            }
            .connect-btn:hover {
              background: #166fe5;
            }
            .expires {
              font-size: 12px;
              color: #999;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📱 MozRest</div>
            <h1>Connect to Facebook</h1>
            <p>You're about to connect <span class="restaurant-name">${installLink.restaurantName}</span> to Facebook and Instagram for social media integration.</p>
            <p>This will allow you to:</p>
            <ul style="text-align: left; color: #666;">
              <li>Automatically post booking announcements</li>
              <li>Manage Facebook page posts</li>
              <li>Share content to Instagram</li>
              <li>Engage with customers on social media</li>
            </ul>
            
            <a href="${installLink.facebookAuthUrl}" class="connect-btn">
              Connect with Facebook
            </a>
            
            <div class="expires">
              This link expires on ${installLink.expiresAt.toLocaleString()}
            </div>
          </div>
          
          <script>
            // Auto-redirect after 3 seconds if user doesn't click
            setTimeout(() => {
              if (confirm('Ready to connect to Facebook?')) {
                window.location.href = '${installLink.facebookAuthUrl}';
              }
            }, 3000);
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(htmlResponse);

    } catch (error) {
      console.error("Error accessing Meta install link:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Handle Meta OAuth callback
  app.get("/api/meta-callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.status(400).json({
          message: "Facebook authentication failed",
          error: error
        });
      }

      if (!code || !state) {
        return res.status(400).json({
          message: "Missing required parameters"
        });
      }

      const result = await metaInstallService.handleCallback(code as string, state as string);

      if (!result.success) {
        return res.status(400).json({
          message: result.error || "Failed to process Meta integration"
        });
      }

      // Redirect to success page
      const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : req.protocol + '://' + req.get('host');

      const successUrl = `${baseUrl}/${result.data.tenantId}/integrations/meta?success=true`;
      res.redirect(successUrl);

    } catch (error) {
      console.error("Error handling Meta callback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email address"),
        company: z.string().optional(),
        phone: z.string().optional(),
        subject: z.string().min(5, "Subject must be at least 5 characters"),
        message: z.string().min(10, "Message must be at least 10 characters"),
        category: z.enum(["general", "booking-channels", "reservation-software", "restaurants", "products", "partners"])
      });

      const validatedData = contactSchema.parse(req.body);

      // Log the contact form submission
      console.log('Contact form submission:', {
        name: validatedData.name,
        email: validatedData.email,
        company: validatedData.company,
        subject: validatedData.subject,
        category: validatedData.category,
        timestamp: new Date().toISOString()
      });

      // Send email notification if email service is available
      if (emailService) {
        try {
          await emailService.sendContactFormNotification(validatedData);
        } catch (emailError) {
          console.error('Failed to send contact form email:', emailError);
          // Continue with success response even if email fails
        }
      }

      res.json({ 
        success: true, 
        message: "Contact form submitted successfully" 
      });
    } catch (error) {
      console.error("Error processing contact form:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
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

<<<<<<< HEAD
  // Working Notifications API (temporary fallback)
  app.get("/api/notifications", attachUser, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const restaurant = await storage.getRestaurantByUserId(req.user.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const notifications = await storage.getNotificationsByRestaurant(restaurant.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Tenant-scoped Notifications API (preferred)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/notifications", attachUser, validateTenant, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify user has access to this restaurant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Additional security: verify user owns this restaurant
      const userRestaurant = await storage.getRestaurantByUserId(req.user.id);
      if (!userRestaurant || userRestaurant.id !== restaurantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const notifications = await storage.getNotificationsByRestaurant(restaurantId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read (tenant-scoped)
  app.patch("/api/tenants/:tenantId/restaurants/:restaurantId/notifications/:id/read", attachUser, validateTenant, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify user has access to this restaurant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Additional security: verify user owns this restaurant
      const userRestaurant = await storage.getRestaurantByUserId(req.user.id);
      if (!userRestaurant || userRestaurant.id !== restaurantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Mark all notifications as read (tenant-scoped)
  app.patch("/api/tenants/:tenantId/restaurants/:restaurantId/notifications/mark-all-read", attachUser, validateTenant, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify user has access to this restaurant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Additional security: verify user owns this restaurant
      const userRestaurant = await storage.getRestaurantByUserId(req.user.id);
      if (!userRestaurant || userRestaurant.id !== restaurantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.markAllNotificationsAsRead(restaurantId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  // Delete notification (tenant-scoped)
  app.delete("/api/tenants/:tenantId/restaurants/:restaurantId/notifications/:id", attachUser, validateTenant, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify user has access to this restaurant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Additional security: verify user owns this restaurant
      const userRestaurant = await storage.getRestaurantByUserId(req.user.id);
      if (!userRestaurant || userRestaurant.id !== restaurantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if notification exists and belongs to this restaurant
      const notifications = await storage.getNotificationsByRestaurant(restaurantId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      // Delete the notification
      const success = await storage.deleteNotification(notificationId);
      
      if (success) {
        res.json({ success: true, message: "Notification deleted successfully" });
      } else {
        res.status(400).json({ error: "Failed to delete notification" });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.patch("/api/notifications/:id/read", attachUser, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  app.patch("/api/notifications/mark-all-read", attachUser, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const restaurant = await storage.getRestaurantByUserId(req.user.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.markAllNotificationsAsRead(restaurant.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  app.post("/api/notifications/:id/revert", attachUser, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.revertNotification(notificationId, req.user.email);
      
      if (success) {
        res.json({ success: true, message: "Changes reverted successfully" });
      } else {
        res.status(400).json({ error: "Cannot revert this notification" });
      }
    } catch (error) {
      console.error("Error reverting notification:", error);
      res.status(500).json({ error: "Failed to revert changes" });
    }
=======
  // Test webhook endpoint for debugging
  app.post("/api/webhook-test", async (req, res) => {
    console.log("=== WEBHOOK TEST RECEIVED ===");
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("=== END WEBHOOK TEST ===");
    
    res.status(200).json({ 
      message: "Webhook received successfully",
      timestamp: new Date().toISOString(),
      received_data: req.body
    });
>>>>>>> 53b3ab91330f0f81f70d457f3d107944aab70637
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