import type { Express } from "express";
import { createServer, type Server } from "http";
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key', {
  apiVersion: '2024-06-20'
});

// Initialize email service, passing API key from environment variables
const emailService = process.env.BREVO_API_KEY ? new BrevoEmailService() : null;

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
        try {
          let emailSettings = null;

          // Parse email settings if they exist
          if (restaurant?.emailSettings) {
            try {
              emailSettings = JSON.parse(restaurant.emailSettings);
            } catch (e) {
              console.warn("Failed to parse email settings, using defaults");
            }
          }

          // Send confirmation email to customer if enabled (default: true)
          const shouldSendGuestConfirmation = emailSettings?.guestSettings?.sendBookingConfirmation !== false;
          if (shouldSendGuestConfirmation) {
            await emailService.sendBookingConfirmation(
              req.body.customerEmail,
              req.body.customerName,
              {
                ...bookingData,
                tableNumber: booking.tableId
              }
            );
          }

          // Send notification to restaurant if enabled (default: true)
          const shouldSendRestaurantNotification = emailSettings?.placeSettings?.emailBooking !== false;
          const restaurantEmail = emailSettings?.placeSettings?.sentTo || restaurant?.email;

          if (shouldSendRestaurantNotification && restaurantEmail) {
            await emailService.sendRestaurantNotification(restaurantEmail, bookingData);
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          // Don't fail the booking if email fails
        }
      }

      res.json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  // All other tenant-restaurant routes follow the same pattern
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

  return createServer(app);
}