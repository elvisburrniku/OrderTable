import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertBookingSchema,
  insertCustomerSchema,
  insertSubscriptionPlanSchema,
  insertUserSubscriptionSchema,
  insertCompanyRegistrationSchema,
} from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import * as tenantRoutes from "./tenant-routes";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  users,
  tenants,
  tenantUsers,
  restaurants,
  subscriptionPlans,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { BrevoEmailService } from "./brevo-service";
import { BookingHash } from "./booking-hash";
import { QRCodeService } from "./qr-service";
import { WebhookService } from "./webhook-service";
import { MetaIntegrationService } from "./meta-service";
import { metaInstallService } from "./meta-install-service";
import { setupSSO } from "./sso-auth";
import { SubscriptionService } from "./subscription-service";
import { CancellationReminderService } from "./cancellation-reminder-service";
import { GoogleCalendarService } from "./google-calendar-service";
import { ConflictDetector } from "./conflict-detector";
import { feedbackReminderService } from "./feedback-reminder-service";
import { activityLogger } from "./activity-logger";
import { activityCleanupService } from "./activity-cleanup-service";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_your_stripe_secret_key",
  {
    apiVersion: "2025-05-28.basil",
  },
);

// Initialize email service, passing API key from environment variables
let emailService: BrevoEmailService | null = null;
try {
  if (process.env.BREVO_API_KEY) {
    emailService = new BrevoEmailService();
    console.log("Email service initialized successfully with Brevo API key");
  } else {
    console.log("No BREVO_API_KEY found - email notifications disabled");
  }
} catch (error) {
  console.error("Failed to initialize email service:", error);
  emailService = null;
}

// Initialize webhook service
const webhookService = new WebhookService(storage);

// Initialize Google Calendar service
const googleCalendarService = new GoogleCalendarService(storage);

// Utility function to convert time string to minutes
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// WebSocket connections store
const wsConnections = new Map<string, Set<WebSocket>>();

// Broadcast notification to all connected clients for a restaurant
function broadcastNotification(restaurantId: number, notification: any) {
  const restaurantKey = `restaurant_${restaurantId}`;
  const connections = wsConnections.get(restaurantKey);

  console.log(
    `Broadcasting notification for restaurant ${restaurantId}, connections found: ${connections ? connections.size : 0}`,
  );

  if (connections && connections.size > 0) {
    const message = JSON.stringify({
      type: "notification",
      notification: notification,
    });
    let sentCount = 0;
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });
    console.log(
      `Notification sent to ${sentCount} clients for restaurant ${restaurantId}`,
    );
  } else {
    console.log(`No active connections found for restaurant ${restaurantId}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup SSO authentication first
  setupSSO(app);

  // Middleware to extract and validate tenant ID
  const validateTenant = async (req: any, res: any, next: any) => {
    const tenantId =
      req.params.tenantId ||
      req.headers["x-tenant-id"] ||
      req.query.tenantId ||
      req.body.tenantId;

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

  // Apply comprehensive activity logging middleware
  app.use(activityLogger.middleware());

  // Helper function to log activities
  const logActivity = async (params: {
    restaurantId?: number;
    tenantId?: number;
    eventType: string;
    description: string;
    source: string;
    userEmail?: string;
    userLogin?: string;
    guestEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    bookingId?: number;
    customerId?: number;
    details?: any;
  }) => {
    try {
      await storage.createActivityLog({
        restaurantId: params.restaurantId,
        tenantId: params.tenantId,
        eventType: params.eventType,
        description: params.description,
        source: params.source,
        userEmail: params.userEmail,
        userLogin: params.userLogin,
        guestEmail: params.guestEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        bookingId: params.bookingId,
        customerId: params.customerId,
        details: params.details,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  // Company Registration route
  app.post("/api/auth/register-company", async (req, res) => {
    try {
      const { companyName, email, password, name, restaurantName, planId } =
        insertCompanyRegistrationSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Get free trial plan if no plan specified
      const plan = planId
        ? await storage.getSubscriptionPlan(planId)
        : (await storage.getSubscriptionPlans()).find(
            (p) => p.name === "Free Trial",
          );

      if (!plan) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant with trial period
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);

      const tenant = await storage.createTenant({
        name: companyName,
        slug,
        subscriptionPlanId: plan.id,
        subscriptionStatus: "trial",
        trialEndDate,
        maxRestaurants: plan.maxRestaurants,
      });

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        restaurantName,
      });

      // Link user to tenant
      await storage.createTenantUser({
        tenantId: tenant.id,
        userId: user.id,
        role: "administrator",
      });

      // Create first restaurant
      const restaurant = await storage.createRestaurant({
        tenantId: tenant.id,
        name: restaurantName,
        userId: user.id,
        emailSettings: JSON.stringify({}),
      });

      // Log company registration
      await logActivity({
        restaurantId: restaurant.id,
        tenantId: tenant.id,
        eventType: "company_registration",
        description: `New company "${companyName}" registered with restaurant "${restaurantName}"`,
        source: "registration",
        userEmail: email,
        userLogin: email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          companyName,
          restaurantName,
          planName: plan.name,
          subscriptionStatus: "trial"
        }
      });

      // If this is a paid plan, create Stripe checkout session
      if (plan.price > 0) {
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: plan.name,
                    description: `${plan.name} subscription plan`,
                  },
                  unit_amount: plan.price,
                  recurring: {
                    interval: "month",
                  },
                },
                quantity: 1,
              },
            ],
            mode: "subscription",
            success_url: `${req.protocol}://${req.get("host")}/dashboard?payment=success`,
            cancel_url: `${req.protocol}://${req.get("host")}/register?payment=cancelled`,
            metadata: {
              userId: user.id.toString(),
              planId: plan.id.toString(),
              tenantId: tenant.id.toString(),
            },
            customer_email: email,
          });

          return res.status(201).json({
            message: "Company created successfully",
            user: { id: user.id, email: user.email, name: user.name },
            tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
            restaurant: { id: restaurant.id, name: restaurant.name },
            trialEndsAt: trialEndDate,
            requiresPayment: true,
            checkoutUrl: session.url,
          });
        } catch (stripeError) {
          console.error("Stripe error:", stripeError);
          return res.status(500).json({ message: "Payment processing error" });
        }
      }

      // For free plans, complete registration immediately and create session
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        restaurantName: user.restaurantName,
        createdAt: user.createdAt,
      };
      (req as any).session.tenant = tenant;
      (req as any).session.restaurant = restaurant;

      res.status(201).json({
        message: "Company created successfully",
        user: { id: user.id, email: user.email, name: user.name },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        restaurant: { id: restaurant.id, name: restaurant.name },
        trialEndsAt: trialEndDate,
        requiresPayment: false,
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
          restaurant: (req as any).session.restaurant,
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
          errors: validationResult.error.errors,
        });
      }

      const { email, password } = validationResult.data;
      const { rememberMe } = req.body;

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
        return res
          .status(401)
          .json({ message: "User not associated with any tenant" });
      }

      const restaurant = await storage.getRestaurantByUserId(user.id);

      // Handle "Remember me" functionality
      if (rememberMe) {
        // Extend session to 30 days for remembered users
        (req as any).session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      } else {
        // Standard session duration (24 hours)
        (req as any).session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      }

      // Store user in session for persistent authentication
      (req as any).session.user = { ...user, password: undefined };
      (req as any).session.tenant = tenantUser;
      (req as any).session.restaurant = restaurant;
      (req as any).session.rememberMe = rememberMe;

      // Log successful login
      await logActivity({
        restaurantId: restaurant?.id,
        tenantId: tenantUser.id,
        eventType: "login",
        description: `User logged in successfully`,
        source: "manual",
        userEmail: user.email,
        userLogin: user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          rememberMe,
          sessionDuration: rememberMe ? "30 days" : "24 hours"
        }
      });

      res.json({
        user: { ...user, password: undefined },
        tenant: tenantUser,
        restaurant: restaurant
          ? { ...restaurant, tenantId: restaurant.tenantId || tenantUser.id }
          : null,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      const sessionTenant = (req as any).session?.tenant;
      const sessionRestaurant = (req as any).session?.restaurant;

      // Log logout before destroying session
      if (sessionUser && sessionTenant) {
        await logActivity({
          restaurantId: sessionRestaurant?.id,
          tenantId: sessionTenant.id,
          eventType: "logout",
          description: `User logged out`,
          source: "manual",
          userEmail: sessionUser.email,
          userLogin: sessionUser.email,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      // Destroy session
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // User password change route
  app.put("/api/users/:userId/change-password", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters long" });
      }

      // Get user from database
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isValidPassword) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      const updatedUser = await storage.updateUser(userId, {
        password: hashedNewPassword,
      });

      // Log password change
      const sessionTenant = (req as any).session?.tenant;
      const sessionRestaurant = (req as any).session?.restaurant;
      await logActivity({
        restaurantId: sessionRestaurant?.id,
        tenantId: sessionTenant?.id,
        eventType: "password_change",
        description: `User changed password`,
        source: "manual",
        userEmail: user.email,
        userLogin: user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

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
        return res
          .status(400)
          .json({ message: "Email is already taken by another user" });
      }

      // Update user in database
      const updatedUser = await storage.updateUser(userId, { name, email });

      // Log profile update
      const sessionTenant = (req as any).session?.tenant;
      const sessionRestaurant = (req as any).session?.restaurant;
      await logActivity({
        restaurantId: sessionRestaurant?.id,
        tenantId: sessionTenant?.id,
        eventType: "profile_update",
        description: `User updated profile information`,
        source: "manual",
        userEmail: email,
        userLogin: email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          oldEmail: existingUser?.email !== email ? existingUser?.email : undefined,
          newEmail: email,
          nameChanged: true
        }
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User updated successfully",
        user: { ...updatedUser, password: undefined }, // Don't send password
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
          errors: result.error.flatten().fieldErrors,
        });
      }

      const { email, password, name, restaurantName } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant for the new user with unique slug generation
      const baseSlug = (restaurantName || "restaurant")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);

      let slug = baseSlug;
      let counter = 1;
      let tenant;

      // Try to create tenant with unique slug
      while (true) {
        try {
          tenant = await storage.createTenant({
            name: restaurantName || "New Restaurant",
            slug,
            subscriptionStatus: "trial",
          });
          break;
        } catch (error: any) {
          if (
            error.code === "23505" &&
            error.constraint === "tenants_slug_unique"
          ) {
            slug = `${baseSlug}-${counter}`;
            counter++;
            if (counter > 100) {
              throw new Error("Unable to generate unique slug");
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
        restaurantName,
      });

      // Initialize free trial subscription
      await SubscriptionService.initializeFreeTrialForTenant(tenant.id);

      // Link user to tenant
      await storage.createTenantUser({
        tenantId: tenant.id,
        userId: newUser.id,
        role: "administrator",
      });

      // Create restaurant for the user
      const newRestaurant = await storage.createRestaurant({
        name: restaurantName || "New Restaurant",
        userId: newUser.id,
        tenantId: tenant.id,
        emailSettings: JSON.stringify({}),
        address: null,
        phone: null,
        email: null,
        description: null,
      });

      // Create session for the new user
      (req as any).session.user = { ...newUser, password: undefined };
      (req as any).session.tenant = tenant;
      (req as any).session.restaurant = newRestaurant;

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          restaurantName: newUser.restaurantName,
        },
        restaurant: newRestaurant,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      });
    } catch (error: any) {
      console.error("Registration error:", error);

      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      if (error.code === "23505") {
        if (error.constraint === "users_email_unique") {
          return res.status(400).json({ message: "Email already exists" });
        }
        if (error.constraint === "tenants_slug_unique") {
          return res
            .status(400)
            .json({
              message:
                "Restaurant name already exists, please try a different name",
            });
        }
        return res.status(400).json({ message: "Registration data conflict" });
      }

      if (error.code === "42703") {
        return res
          .status(500)
          .json({ message: "Database configuration error" });
      }

      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Multi-restaurant tenant routes
  app.get(
    "/api/tenants/:tenantId/restaurants",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Create a new restaurant for a tenant
  app.post(
    "/api/tenants/:tenantId/restaurants",
    validateTenant,
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const { name, userId, email, address, phone, emailSettings } = req.body;

        if (!name || !userId) {
          return res
            .status(400)
            .json({ message: "Restaurant name and user ID are required" });
        }

        // Verify that the tenant exists and user has permission
        const tenant = await storage.db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId));
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
              eq(tenantUsers.userId, userId),
            ),
          );

        if (!tenantUser.length) {
          return res
            .status(403)
            .json({ message: "User does not belong to this tenant" });
        }

        // Check tenant's restaurant limit
        const existingRestaurants = await storage.db
          .select()
          .from(restaurants)
          .where(eq(restaurants.tenantId, tenantId));

        if (existingRestaurants.length >= (tenant[0].maxRestaurants || 1)) {
          return res.status(400).json({
            message: `Restaurant limit reached. This tenant can have maximum ${tenant[0].maxRestaurants || 1} restaurants.`,
          });
        }

        const restaurant = await storage.createRestaurant({
          name,
          userId,
          tenantId,
          email: email || null,
          address: address || null,
          phone: phone || null,
          emailSettings: emailSettings
            ? JSON.stringify(emailSettings)
            : JSON.stringify({}),
        });

        res.status(201).json(restaurant);
      } catch (error) {
        console.error("Error creating restaurant:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // All tenant-restaurant routes now properly namespaced
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings",
    validateTenant,
    async (req, res) => {
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
        if (date && typeof date === "string") {
          bookings = await storage.getBookingsByDate(restaurantId, date);
        } else {
          bookings = await storage.getBookingsByRestaurant(restaurantId);
        }

        res.json(bookings);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get or create customer first
        const customer = await storage.getOrCreateCustomer(
          restaurantId,
          tenantId,
          {
            name: req.body.customerName,
            email: req.body.customerEmail,
            phone: req.body.customerPhone,
          },
        );

        const bookingData = insertBookingSchema.parse({
          ...req.body,
          restaurantId,
          tenantId,
          customerId: customer.id,
          bookingDate: new Date(req.body.bookingDate),
        });

        // Check if booking is allowed based on cut-off times
        const isAllowed = await storage.isBookingAllowed(
          restaurantId,
          new Date(req.body.bookingDate),
          req.body.startTime,
        );

        if (!isAllowed) {
          return res.status(400).json({
            message:
              "Booking not allowed due to cut-off time restrictions. Please select a different time slot.",
          });
        }

        // Check subscription booking limits
        const tenant = await storage.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }

        const subscriptionPlan = await storage.getSubscriptionPlanById(
          tenant.subscriptionPlanId,
        );
        if (!subscriptionPlan) {
          return res.status(400).json({ message: "Invalid subscription plan" });
        }

        const currentBookingCount =
          await storage.getBookingCountForTenantThisMonth(tenantId);
        const maxBookingsPerMonth = subscriptionPlan.maxBookingsPerMonth || 100;

        if (currentBookingCount >= maxBookingsPerMonth) {
          return res.status(400).json({
            message: `You have reached your monthly booking limit of ${maxBookingsPerMonth} bookings for your ${subscriptionPlan.name} plan. Please upgrade your subscription to create more bookings.`,
          });
        }

        // Validate table availability and prevent conflicts
        if (bookingData.tableId) {
          const tableId = bookingData.tableId;
          const bookingDate = new Date(bookingData.bookingDate)
            .toISOString()
            .split("T")[0];
          const startTime = bookingData.startTime;
          const endTime =
            bookingData.endTime ||
            (() => {
              // Default to 2 hours if no end time provided
              const [hours, minutes] = startTime.split(":").map(Number);
              const endHours = (hours + 2) % 24;
              return `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
            })();

          // Get all existing bookings for this table on the same date
          const existingBookings = await storage.getBookingsByDate(
            restaurantId,
            bookingDate,
          );
          const tableBookings = existingBookings.filter(
            (booking) =>
              booking.tableId === tableId && booking.status !== "cancelled",
          );

          // Check for time conflicts
          const hasConflict = tableBookings.some((existingBooking) => {
            const existingStartTime = existingBooking.startTime;
            const existingEndTime =
              existingBooking.endTime ||
              (() => {
                // Default to 2 hours for existing bookings without end time
                const [hours, minutes] = existingStartTime
                  .split(":")
                  .map(Number);
                const endHours = (hours + 2) % 24;
                return `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
              })();

            // Convert times to minutes for easier comparison
            const timeToMinutes = (timeStr: string) => {
              const [hours, minutes] = timeStr.split(":").map(Number);
              return hours * 60 + minutes;
            };

            const newStartMinutes = timeToMinutes(startTime);
            const newEndMinutes = timeToMinutes(endTime);
            const existingStartMinutes = timeToMinutes(existingStartTime);
            const existingEndMinutes = timeToMinutes(existingEndTime);

            // Check for overlap: bookings overlap if one starts before the other ends
            // Using strict overlap check without buffer for exact table conflict detection
            return (
              newStartMinutes < existingEndMinutes &&
              existingStartMinutes < newEndMinutes
            );
          });

          if (hasConflict) {
            const conflictingBooking = tableBookings.find((existingBooking) => {
              const existingStartTime = existingBooking.startTime;
              const existingEndTime =
                existingBooking.endTime ||
                (() => {
                  const [hours, minutes] = existingStartTime
                    .split(":")
                    .map(Number);
                  const endHours = (hours + 2) % 24;
                  return `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                })();

              const timeToMinutes = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(":").map(Number);
                return hours * 60 + minutes;
              };

              const newStartMinutes = timeToMinutes(startTime);
              const newEndMinutes = timeToMinutes(endTime);
              const existingStartMinutes = timeToMinutes(existingStartTime);
              const existingEndMinutes = timeToMinutes(existingEndTime);

              return (
                newStartMinutes < existingEndMinutes &&
                existingStartMinutes < newEndMinutes
              );
            });

            const table = await storage.getTableById(tableId);
            const tableNumber = table?.tableNumber || tableId;

            return res.status(400).json({
              message: `Table ${tableNumber} is already booked from ${conflictingBooking?.startTime} to ${conflictingBooking?.endTime || "unknown"} on ${bookingDate}. Please select a different table or time slot.`,
              conflictDetails: {
                tableId: tableId,
                tableNumber: tableNumber,
                conflictingBooking: {
                  id: conflictingBooking?.id,
                  startTime: conflictingBooking?.startTime,
                  endTime: conflictingBooking?.endTime,
                  customerName: conflictingBooking?.customerName,
                },
              },
            });
          }
        }

        const booking = await storage.createBooking(bookingData);

        // Generate and store management hash for the booking
        if (booking.id) {
          const managementHash = BookingHash.generateHash(
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            "manage",
          );

          await storage.updateBooking(booking.id, { managementHash });
          booking.managementHash = managementHash;
          console.log(
            `Stored management hash for booking ${booking.id}: ${managementHash}`,
          );
        }

        // Log booking creation
        const sessionUser = (req as any).session?.user;
        await logActivity({
          restaurantId: booking.restaurantId,
          tenantId: booking.tenantId,
          eventType: "new_booking",
          description: `New booking created for ${booking.customerName}`,
          source: "manual",
          userEmail: sessionUser?.email,
          userLogin: sessionUser?.email,
          guestEmail: booking.customerEmail,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          bookingId: booking.id,
          customerId: booking.customerId,
          details: {
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            guestCount: booking.guestCount,
            tableId: booking.tableId,
            status: booking.status
          }
        });

        // Send email notifications if Brevo is configured
        if (emailService) {
          console.log(
            "Email service available - processing notifications for booking",
            booking.id,
          );
          try {
            let emailSettings = null;

            // Parse email settings if they exist
            if (restaurant?.emailSettings) {
              try {
                emailSettings = JSON.parse(restaurant.emailSettings);
                console.log("Email settings loaded:", emailSettings);
              } catch (e) {
                console.warn("Failed to parse email settings, using defaults");
              }
            } else {
              console.log(
                "No email settings found - using defaults (all notifications enabled)",
              );
            }

            // Send confirmation email to customer if enabled (default: true)
            const shouldSendGuestConfirmation =
              emailSettings?.guestSettings?.sendBookingConfirmation !== false;
            console.log(
              "Should send guest confirmation:",
              shouldSendGuestConfirmation,
            );

            if (shouldSendGuestConfirmation) {
              console.log(
                "Sending booking confirmation email to:",
                req.body.customerEmail,
              );
              await emailService.sendBookingConfirmation(
                req.body.customerEmail,
                req.body.customerName,
                {
                  ...bookingData,
                  tableNumber: booking.tableId,
                  id: booking.id,
                },
              );
              console.log("Guest confirmation email sent successfully");
            }

            // Send notification to restaurant if enabled (default: true)
            const shouldSendRestaurantNotification =
              emailSettings?.placeSettings?.emailBooking !== false;
            const restaurantEmail =
              emailSettings?.placeSettings?.sentTo || restaurant?.email;
            console.log(
              "Should send restaurant notification:",
              shouldSendRestaurantNotification,
              "to email:",
              restaurantEmail,
            );

            if (shouldSendRestaurantNotification && restaurantEmail) {
              console.log(
                "Sending restaurant notification email to:",
                restaurantEmail,
              );
              await emailService.sendRestaurantNotification(restaurantEmail, {
                customerName: req.body.customerName,
                customerEmail: req.body.customerEmail,
                customerPhone: req.body.customerPhone,
                ...bookingData,
              });
              console.log("Restaurant notification email sent successfully");
            }
          } catch (emailError) {
            console.error("Error sending email notifications:", emailError);
            // Don't fail the booking if email fails
          }
        } else {
          console.log(
            "Email service not available - skipping email notifications",
          );
        }

        // Send webhook notifications
        try {
          const webhookService = new WebhookService(storage);
          await webhookService.notifyBookingCreated(restaurantId, {
            ...booking,
            customerName: req.body.customerName,
            customerEmail: req.body.customerEmail,
            customerPhone: req.body.customerPhone,
          });
        } catch (webhookError) {
          console.error("Error sending webhook notifications:", webhookError);
          // Don't fail the booking if webhook fails
        }

        // Send Meta (Facebook/Instagram) notifications if enabled
        try {
          const metaService = new MetaIntegrationService(storage);
          await metaService.notifyBookingCreated(restaurantId, {
            ...booking,
            customerName: req.body.customerName,
            customerEmail: req.body.customerEmail,
            customerPhone: req.body.customerPhone,
          });
        } catch (metaError) {
          console.error(
            "Error sending Meta integration notifications:",
            metaError,
          );
          // Don't fail the booking if Meta integration fails
        }

        res.json(booking);
      } catch (error) {
        console.error("Booking creation error:", error);
        res.status(400).json({ message: "Invalid booking data" });
      }
    },
  );

  // Update booking route with tenant and restaurant validation
  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        // Validate request body
        if (!req.body || typeof req.body !== "object") {
          return res
            .status(400)
            .json({ message: "Invalid JSON in request body" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const existingBooking = await storage.getBookingById(id);
        if (
          !existingBooking ||
          existingBooking.tenantId !== tenantId ||
          existingBooking.restaurantId !== restaurantId
        ) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const updates = req.body;
        if (updates.bookingDate) {
          updates.bookingDate = new Date(updates.bookingDate);
        }

        // Validate table availability for updates that might cause conflicts
        // Only check conflicts if a table is actually assigned (not null)
        const tableId = updates.tableId !== undefined ? updates.tableId : existingBooking.tableId;
        if ((updates.tableId || updates.bookingDate || updates.startTime) && tableId !== null) {
          const bookingDate = updates.bookingDate
            ? new Date(updates.bookingDate).toISOString().split("T")[0]
            : new Date(existingBooking.bookingDate).toISOString().split("T")[0];
          const startTime = updates.startTime || existingBooking.startTime;
          const endTime =
            updates.endTime ||
            existingBooking.endTime ||
            (() => {
              // Default to 2 hours if no end time provided
              const [hours, minutes] = startTime.split(":").map(Number);
              const endHours = (hours + 2) % 24;
              return `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
            })();

          // Get all existing bookings for this table on the target date
          const existingBookings = await storage.getBookingsByDate(
            restaurantId,
            bookingDate,
          );
          const conflictingBookings = existingBookings.filter(
            (booking) =>
              booking.tableId === tableId &&
              booking.status !== "cancelled" &&
              booking.id !== id, // Exclude the current booking being updated
          );

          // Check for time conflicts
          const hasConflict = conflictingBookings.some((conflictingBooking) => {
            const conflictingStartTime = conflictingBooking.startTime;
            const conflictingEndTime =
              conflictingBooking.endTime ||
              (() => {
                // Default to 2 hours for existing bookings without end time
                const [hours, minutes] = conflictingStartTime
                  .split(":")
                  .map(Number);
                const endHours = (hours + 2) % 24;
                return `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
              })();

            // Convert times to minutes for easier comparison
            const timeToMinutes = (timeStr: string) => {
              const [hours, minutes] = timeStr.split(":").map(Number);
              return hours * 60 + minutes;
            };

            const newStartMinutes = timeToMinutes(startTime);
            const newEndMinutes = timeToMinutes(endTime);
            const conflictingStartMinutes = timeToMinutes(conflictingStartTime);
            const conflictingEndMinutes = timeToMinutes(conflictingEndTime);

            // Check for overlap: bookings overlap if one starts before the other ends
            return (
              newStartMinutes < conflictingEndMinutes &&
              conflictingStartMinutes < newEndMinutes
            );
          });

          if (hasConflict) {
            const conflictingBooking = conflictingBookings.find(
              (conflictingBooking) => {
                const conflictingStartTime = conflictingBooking.startTime;
                const conflictingEndTime =
                  conflictingBooking.endTime ||
                  (() => {
                    const [hours, minutes] = conflictingStartTime
                      .split(":")
                      .map(Number);
                    const endHours = (hours + 2) % 24;
                    return `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                  })();

                const timeToMinutes = (timeStr: string) => {
                  const [hours, minutes] = timeStr.split(":").map(Number);
                  return hours * 60 + minutes;
                };

                const newStartMinutes = timeToMinutes(startTime);
                const newEndMinutes = timeToMinutes(endTime);
                const conflictingStartMinutes =
                  timeToMinutes(conflictingStartTime);
                const conflictingEndMinutes = timeToMinutes(conflictingEndTime);

                return (
                  newStartMinutes < conflictingEndMinutes &&
                  conflictingStartMinutes < newEndMinutes
                );
              },
            );

            const table = await storage.getTableById(tableId);
            const tableNumber = table?.tableNumber || tableId;

            return res.status(400).json({
              message: `Cannot move booking: Table ${tableNumber} is already booked from ${conflictingBooking?.startTime} to ${conflictingBooking?.endTime || "unknown"} on ${bookingDate}. Please select a different table or time slot.`,
              conflictDetails: {
                tableId: tableId,
                tableNumber: tableNumber,
                conflictingBooking: {
                  id: conflictingBooking?.id,
                  startTime: conflictingBooking?.startTime,
                  endTime: conflictingBooking?.endTime,
                  customerName: conflictingBooking?.customerName,
                },
              },
            });
          }
        }

        const updatedBooking = await storage.updateBooking(id, updates);

        // Log booking update
        const sessionUser = (req as any).session?.user;
        await logActivity({
          restaurantId: updatedBooking.restaurantId,
          tenantId: updatedBooking.tenantId,
          eventType: "booking_update",
          description: `Booking updated for ${updatedBooking.customerName}`,
          source: "manual",
          userEmail: sessionUser?.email,
          userLogin: sessionUser?.email,
          guestEmail: updatedBooking.customerEmail,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          bookingId: updatedBooking.id,
          customerId: updatedBooking.customerId,
          details: {
            updatedFields: Object.keys(updates),
            newStatus: updates.status,
            newTableId: updates.tableId,
            newBookingDate: updates.bookingDate,
            newStartTime: updates.startTime
          }
        });

        // Send webhook notifications for booking update
        if (updatedBooking) {
          try {
            const webhookService = new WebhookService(storage);
            await webhookService.notifyBookingUpdated(
              restaurantId,
              updatedBooking,
            );
          } catch (webhookError) {
            console.error(
              "Error sending booking update webhook:",
              webhookError,
            );
          }
        }

        res.json(updatedBooking);
      } catch (error) {
        console.error("Booking update error:", error);
        res.status(400).json({ message: "Failed to update booking" });
      }
    },
  );

  // Complete tenant-restaurant routes implementation
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        console.log(
          `Fetching tables for restaurant ${restaurantId}, tenant ${tenantId}`,
        );

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          console.log(
            `Restaurant ${restaurantId} not found or doesn't belong to tenant ${tenantId}`,
          );
          return res.status(404).json({ message: "Restaurant not found" });
        }

        console.log(`Restaurant found: ${restaurant.name}, fetching tables...`);
        const tables = await storage.getTablesByRestaurant(restaurantId);
        console.log(
          `Found ${tables.length} tables for restaurant ${restaurantId}`,
        );
        
        // Add cache-control headers to ensure fresh data
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        res.json(tables);
      } catch (error) {
        console.error("Error fetching tables for tenant/restaurant:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables",
    validateTenant,
    async (req, res) => {
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
            tenantId,
          );

          // Update table with QR code
          const updatedTable = await storage.updateTable(table.id, { qrCode });
          res.json(updatedTable || table);
        } catch (qrError) {
          console.error("Error generating QR code for table:", qrError);
          // Return table without QR code if generation fails
          res.json(table);
        }
      } catch (error) {
        res.status(400).json({ message: "Invalid table data" });
      }
    },
  );

  // QR Code route for tables
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables/:tableId/qr",
    validateTenant,
    async (req, res) => {
      try {
        const tableId = parseInt(req.params.tableId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        // Verify table belongs to tenant
        const table = await storage.getTableById(tableId);
        if (
          !table ||
          table.tenantId !== tenantId ||
          table.restaurantId !== restaurantId
        ) {
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
            tenantId,
          );

          // Update table with QR code
          await storage.updateTable(table.id, { qrCode });
          res.json({ qrCode });
        } catch (qrError) {
          console.error("Error generating QR code:", qrError);
          res.status(500).json({ message: "Failed to generate QR code" });
        }
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  // Rooms routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rooms",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rooms",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Combined tables routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const combinedTables =
          await storage.getCombinedTablesByRestaurant(restaurantId);
        res.json(combinedTables);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch combined tables" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables",
    validateTenant,
    async (req, res) => {
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

        const combinedTable =
          await storage.createCombinedTable(combinedTableData);
        res.json(combinedTable);
      } catch (error) {
        res.status(400).json({ message: "Invalid combined table data" });
      }
    },
  );

  // Real-time table status route
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables/real-time-status",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get all tables, bookings, and rooms
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const rooms = await storage.getRoomsByRestaurant(restaurantId);

        // Get current time in the restaurant's timezone 
        const now = new Date();
        // Calculate timezone offset based on user's reported time vs server time
        // User says it's 18:09, server shows 16:13, so +2 hours difference
        const timeZoneOffset = 2; // UTC+2 hours
        const localNow = new Date(now.getTime() + (timeZoneOffset * 60 * 60 * 1000));
        const currentTime = localNow.getUTCHours() * 60 + localNow.getUTCMinutes(); // Use UTC methods for adjusted time
        const today = localNow.toISOString().split("T")[0]; // Today's date in local timezone
        
        // Optional debug logging (can be removed in production)
        // console.log(`Real-time status check - Local time: ${localNow.getUTCHours()}:${localNow.getUTCMinutes().toString().padStart(2, '0')} (${currentTime} minutes)`);

        // Create a map of room names
        const roomMap = new Map();
        rooms.forEach((room) => {
          roomMap.set(room.id, room.name);
        });

        // Process each table to determine its real-time status
        const tableStatuses = tables.map((table) => {
          // Filter bookings for this table today
          const todayBookings = bookings
            .filter((booking) => {
              const bookingDate = new Date(booking.bookingDate)
                .toISOString()
                .split("T")[0];
              return (
                booking.tableId === table.id &&
                bookingDate === today &&
                booking.status === "confirmed"
              );
            })
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          // Convert time strings to minutes for comparison
          const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
          };

          // Find current booking (if any)
          let currentBooking = null;
          let nextBooking = null;
          let status = "available";

          for (const booking of todayBookings) {
            const startMinutes = timeToMinutes(booking.startTime);
            const endMinutes = booking.endTime
              ? timeToMinutes(booking.endTime)
              : startMinutes + 120; // Default 2 hours

            // Optional debug: console.log(`Table ${table.tableNumber}: Booking ${booking.customerName} at ${booking.startTime} (${startMinutes}min) - ${booking.endTime || 'no end time'} (${endMinutes}min). Current: ${currentTime}min`);

            if (currentTime >= startMinutes && currentTime <= endMinutes) {
              // Table is currently occupied
              status = "occupied";
              currentBooking = {
                id: booking.id,
                customerName: booking.customerName,
                customerEmail: booking.customerEmail,
                guestCount: booking.guestCount,
                startTime: booking.startTime,
                endTime:
                  booking.endTime ||
                  `${Math.floor((startMinutes + 120) / 60)
                    .toString()
                    .padStart(
                      2,
                      "0",
                    )}:${((startMinutes + 120) % 60).toString().padStart(2, "0")}`,
                status: booking.status,
                timeRemaining: endMinutes - currentTime,
                isOvertime: currentTime > endMinutes,
              };
              break;
            } else if (startMinutes > currentTime) {
              // This is a future booking - find the next one
              if (!nextBooking) {
                // Check if table is reserved (within 30 minutes of start time)
                if (startMinutes - currentTime <= 30) {
                  status = "reserved";
                }

                nextBooking = {
                  id: booking.id,
                  customerName: booking.customerName,
                  startTime: booking.startTime,
                  guestCount: booking.guestCount,
                  timeUntilNext: startMinutes - currentTime,
                };
              }
              break;
            }
          }

          // If no current booking found, check if we need to find next booking
          if (!currentBooking && !nextBooking) {
            const futureBookings = todayBookings.filter((booking) => {
              const startMinutes = timeToMinutes(booking.startTime);
              return startMinutes > currentTime;
            });

            if (futureBookings.length > 0) {
              const nextBookingData = futureBookings[0];
              const startMinutes = timeToMinutes(nextBookingData.startTime);

              // Check if table should be marked as reserved
              if (startMinutes - currentTime <= 30) {
                status = "reserved";
              }

              nextBooking = {
                id: nextBookingData.id,
                customerName: nextBookingData.customerName,
                startTime: nextBookingData.startTime,
                guestCount: nextBookingData.guestCount,
                timeUntilNext: startMinutes - currentTime,
              };
            }
          }

          return {
            id: table.id,
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            roomId: table.roomId,
            roomName: roomMap.get(table.roomId),
            status,
            currentBooking,
            nextBooking,
            lastUpdated: now.toISOString(),
          };
        });

        res.json(tableStatuses);
      } catch (error) {
        console.error("Error fetching real-time table status:", error);
        res.status(500).json({ message: "Failed to fetch table status" });
      }
    },
  );

  // Customers routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/customers",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/customers",
    validateTenant,
    async (req, res) => {
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
          tenantId,
        });

        const customer = await storage.createCustomer(customerData);
        res.json(customer);
      } catch (error) {
        console.error("Customer creation error:", error);
        if (error.name === 'ZodError') {
          res.status(400).json({ 
            message: "Invalid customer data", 
            details: error.errors 
          });
        } else {
          res.status(400).json({ 
            message: "Invalid customer data",
            error: error.message 
          });
        }
      }
    },
  );

  // Opening hours routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const openingHours =
          await storage.getOpeningHoursByRestaurant(restaurantId);
        res.json(openingHours);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Extract hours from request body - frontend sends { hours: [...] }
        const hoursData = req.body.hours || req.body;
        const openingHours = await storage.createOrUpdateOpeningHours(
          restaurantId,
          tenantId,
          hoursData,
        );

        // Sync with Google Calendar after updating opening hours
        try {
          await googleCalendarService.syncOpeningHours(restaurantId, tenantId);
          console.log(`Google Calendar sync completed for restaurant ${restaurantId} opening hours`);
        } catch (error) {
          console.error('Google Calendar sync failed for opening hours:', error);
          // Don't fail the request if calendar sync fails
        }

        res.json(openingHours);
      } catch (error) {
        console.error("Error saving opening hours:", error);
        res.status(400).json({ message: "Invalid opening hours data" });
      }
    },
  );

  // Table layout routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/table-layout",
    validateTenant,
    async (req, res) => {
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
          positions: layout?.positions || {},
        });
      } catch (error) {
        console.error("Error fetching table layout:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/table-layout",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { room, positions } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        if (!room || !positions) {
          return res
            .status(400)
            .json({ message: "Room and positions are required" });
        }

        const savedLayout = await storage.saveTableLayout(
          restaurantId,
          tenantId,
          room,
          positions,
        );

        res.json({
          message: "Table layout saved successfully",
          room: savedLayout.room,
          positions: savedLayout.positions,
        });
      } catch (error) {
        console.error("Error saving table layout:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Waiting list routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/waiting-list",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const waitingList =
          await storage.getWaitingListByRestaurant(restaurantId);
        res.json(waitingList);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/waiting-list",
    validateTenant,
    async (req, res) => {
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
          tenantId,
        };

        const entry = await storage.createWaitingListEntry(entryData);
        res.json(entry);
      } catch (error) {
        res.status(400).json({ message: "Invalid waiting list data" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/waiting-list/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        const existingEntry = await storage.getWaitingListEntryById(id);
        if (!existingEntry || existingEntry.tenantId !== tenantId) {
          return res
            .status(404)
            .json({ message: "Waiting list entry not found" });
        }

        const entry = await storage.updateWaitingListEntry(id, updates);
        res.json(entry);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );



  // Public restaurant info (for customers via QR code)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId",
    async (req, res) => {
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
          tenantId: restaurant.tenantId,
        });
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  // Public table info (for customers via QR code)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables/:tableId",
    async (req, res) => {
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
          restaurantId: table.restaurantId,
        });
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  // Get bookings (authenticated route for dashboard)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings",
    validateTenant,
    async (req, res) => {
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
          const allBookings = await storage.getBookingsByDate(
            restaurantId,
            date as string,
          );
          bookings = allBookings.filter(
            (booking) =>
              booking.tableId === parseInt(table as string) &&
              booking.status !== "cancelled",
          );
        } else {
          // Get all bookings for the restaurant
          bookings = await storage.getBookingsByRestaurant(restaurantId);
        }

        res.json(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Failed to fetch bookings" });
      }
    },
  );

  // Public feedback submission (for customers via QR code)
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/feedback",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const { customerName, customerEmail, customerPhone, questionResponses } = req.body;

        // Create main feedback entry
        const feedbackData = {
          customerName,
          customerEmail,
          customerPhone,
          restaurantId,
          tenantId,
          rating: null, // Will be calculated from responses
          nps: null, // Will be set from NPS response
          comments: '', // Will be combined from text responses
        };

        const feedback = await storage.createFeedback(feedbackData);

        // Log guest feedback submission
        await logActivity({
          restaurantId,
          tenantId,
          eventType: "guest_feedback_submit",
          description: `Guest feedback submitted by ${feedbackData.customerName}`,
          source: "guest_form",
          guestEmail: feedbackData.customerEmail,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            feedbackId: feedback.id,
            customerName: feedbackData.customerName,
            customerEmail: feedbackData.customerEmail,
            overallRating: feedbackData.rating,
            hasQuestionResponses: !!(questionResponses && questionResponses.length > 0),
            responseCount: questionResponses ? questionResponses.length : 0
          }
        });

        // Store individual question responses and aggregate data
        let aggregatedRating = null;
        let aggregatedNps = null;
        let aggregatedComments = '';
        

        
        if (questionResponses && Array.isArray(questionResponses)) {
          // First, store all individual responses
          for (const response of questionResponses) {
            await storage.createFeedbackResponse({
              feedbackId: feedback.id,
              questionId: response.questionId,
              restaurantId,
              tenantId,
              rating: response.rating || null,
              npsScore: response.npsScore || null,
              textResponse: response.textResponse || null,
            });

            // Aggregate data from responses - prioritize rating over NPS for overall rating
            if (response.rating !== null && response.rating !== undefined) {
              aggregatedRating = response.rating;
            }
            if (response.npsScore !== null && response.npsScore !== undefined) {
              aggregatedNps = response.npsScore;
            }
            if (response.textResponse && response.textResponse.trim()) {
              aggregatedComments = aggregatedComments 
                ? `${aggregatedComments}; ${response.textResponse}`
                : response.textResponse;
            }
          }

          // Update the main feedback entry with aggregated data
          const updatedFeedback = await storage.updateFeedback(feedback.id, {
            rating: aggregatedRating,
            nps: aggregatedNps,
            comments: aggregatedComments || null,
          });
          
          res.json(updatedFeedback);
        } else {
          res.json(feedback);
        }
      } catch (error) {
        console.error("Feedback submission error:", error);
        res.status(400).json({ message: "Invalid feedback data" });
      }
    },
  );

  // Get feedback responses for specific feedback
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/feedback/:feedbackId/responses",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const feedbackId = parseInt(req.params.feedbackId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const responses = await storage.getFeedbackResponsesByFeedbackId(feedbackId);
        res.json(responses);
      } catch (error) {
        console.error("Error fetching feedback responses:", error);
        res.status(500).json({ message: "Failed to fetch feedback responses" });
      }
    },
  );

  // Delete feedback
  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/feedback/:feedbackId",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const feedbackId = parseInt(req.params.feedbackId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        await storage.deleteFeedback(feedbackId);
        res.json({ message: "Feedback deleted successfully" });
      } catch (error) {
        console.error("Error deleting feedback:", error);
        res.status(500).json({ message: "Failed to delete feedback" });
      }
    },
  );

  // Admin feedback route (requires authentication)
  app.post(
    "/api/admin/tenants/:tenantId/restaurants/:restaurantId/feedback",
    validateTenant,
    async (req, res) => {
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
          tenantId,
        };

        const feedback = await storage.createFeedback(feedbackData);
        res.json(feedback);
      } catch (error) {
        res.status(400).json({ message: "Invalid feedback data" });
      }
    },
  );

  // Time slots routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/time-slots",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { date } = req.query;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const timeSlots = await storage.getTimeSlotsByRestaurant(
          restaurantId,
          date as string,
        );
        res.json(timeSlots);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/time-slots",
    validateTenant,
    async (req, res) => {
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
          tenantId,
        };

        const slot = await storage.createTimeSlot(slotData);
        res.json(slot);
      } catch (error) {
        res.status(400).json({ message: "Invalid time slot data" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/time-slots/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Activity log routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/activity-log",
    validateTenant,
    async (req, res) => {
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
        console.error("Activity log fetch error:", error);
        res.status(500).json({ message: "Failed to fetch activity log" });
      }
    },
  );

  // Global activity log for entire tenant (all restaurants)
  app.get(
    "/api/tenants/:tenantId/activity-log",
    validateTenant,
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);

        const logs = await storage.getActivityLogByTenant(tenantId);
        res.json(logs);
      } catch (error) {
        console.error("Global activity log fetch error:", error);
        res.status(500).json({ message: "Failed to fetch global activity log" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/activity-log",
    validateTenant,
    async (req, res) => {
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
          tenantId,
        };

        const log = await storage.createActivityLog(logData);
        res.json(log);
      } catch (error) {
        res.status(400).json({ message: "Invalid log data" });
      }
    },
  );

  // SMS messages routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages",
    validateTenant,
    async (req, res) => {
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
          tenantId,
        };

        const message = await storage.createSmsMessage(messageData);
        res.json(message);
      } catch (error) {
        res.status(400).json({ message: "Invalid message data" });
      }
    },
  );

  // Special periods routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/special-periods",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const specialPeriods =
          await storage.getSpecialPeriodsByRestaurant(restaurantId);
        res.json(specialPeriods);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/special-periods",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        console.log('Special period creation request:', JSON.stringify(req.body, null, 2));
        
        const periodData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        console.log('Final period data:', JSON.stringify(periodData, null, 2));
        
        const period = await storage.createSpecialPeriod(periodData);

        // Sync with Google Calendar after creating special period
        try {
          await googleCalendarService.syncSpecialPeriods(restaurantId);
          console.log(`Google Calendar sync completed for restaurant ${restaurantId} special periods`);
        } catch (error) {
          console.error('Google Calendar sync failed for special periods:', error);
          // Don't fail the request if calendar sync fails
        }

        res.json(period);
      } catch (error) {
        console.error('Special period creation error:', error);
        res.status(400).json({ 
          message: "Invalid special period data",
          error: error.message 
        });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/special-periods/:id",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const id = parseInt(req.params.id);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updates = req.body;
        const period = await storage.updateSpecialPeriod(id, updates);
        if (!period) {
          return res.status(404).json({ message: "Special period not found" });
        }

        // Sync with Google Calendar after updating special period
        try {
          await googleCalendarService.syncSpecialPeriods(restaurantId);
          console.log(`Google Calendar sync completed for restaurant ${restaurantId} special periods update`);
        } catch (error) {
          console.error('Google Calendar sync failed for special periods update:', error);
        }

        res.json(period);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/special-periods/:id",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const id = parseInt(req.params.id);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteSpecialPeriod(id);
        if (success) {
          res.json({ message: "Special period deleted successfully" });
        } else {
          res.status(404).json({ message: "Special period not found" });
        }
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/special-periods/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/tenants/:tenantId/special-periods/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Cut-off times routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/cut-off-times",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const cutOffTimes =
          await storage.getCutOffTimesByRestaurant(restaurantId);
        res.json(cutOffTimes);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/cut-off-times",
    validateTenant,
    async (req, res) => {
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
          return res
            .status(400)
            .json({ message: "cutOffTimes array is required" });
        }

        const savedTimes = await storage.createOrUpdateCutOffTimes(
          restaurantId,
          tenantId,
          timesData,
        );

        // Sync with Google Calendar after updating cut-off times
        try {
          await googleCalendarService.syncCutOffTimes(restaurantId);
          console.log(`Google Calendar sync completed for restaurant ${restaurantId} cut-off times`);
        } catch (error) {
          console.error('Google Calendar sync failed for cut-off times:', error);
          // Don't fail the request if calendar sync fails
        }

        res.json(savedTimes);
      } catch (error) {
        console.error("Error saving cut-off times:", error);
        res.status(400).json({ message: "Invalid cut-off times data" });
      }
    },
  );

  // Booking validation route
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/validate-booking",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { bookingDate, bookingTime } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const isAllowed = await storage.isBookingAllowed(
          restaurantId,
          new Date(bookingDate),
          bookingTime,
        );
        res.json({ isAllowed });
      } catch (error) {
        console.error("Error validating booking:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get available tables for a specific time slot
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/available-tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { bookingDate, startTime, endTime, guestCount } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const tables = await storage.getTablesByRestaurant(restaurantId);
        const existingBookings = await storage.getBookingsByDate(
          restaurantId,
          bookingDate,
        );

        const requestedStartTime = startTime;
        const requestedEndTime = endTime || "23:59";
        const requestedGuestCount = guestCount;

        // Helper function to check if a table is available at the requested time
        const isTableAvailable = (tableToCheck: any) => {
          // Check capacity first
          if (tableToCheck.capacity < requestedGuestCount) {
            return false;
          }

          // Check for time conflicts with this specific table
          const conflictingBookings = existingBookings.filter(
            (booking: any) => {
              if (booking.tableId !== tableToCheck.id) return false;
              if (booking.status === "cancelled") return false;

              // Convert times to minutes for easier comparison
              const requestedStartMinutes =
                parseInt(requestedStartTime.split(":")[0]) * 60 +
                parseInt(requestedStartTime.split(":")[1]);
              const requestedEndMinutes =
                parseInt(requestedEndTime.split(":")[0]) * 60 +
                parseInt(requestedEndTime.split(":")[1]);

              const existingStartMinutes =
                parseInt(booking.startTime.split(":")[0]) * 60 +
                parseInt(booking.startTime.split(":")[1]);
              const existingEndTime = booking.endTime || "23:59";
              const existingEndMinutes =
                parseInt(existingEndTime.split(":")[0]) * 60 +
                parseInt(existingEndTime.split(":")[1]);

              // Add 1-hour buffer (60 minutes) for table turnover
              const bufferMinutes = 60;

              // Check for time overlap with buffer
              const requestedStart = requestedStartMinutes - bufferMinutes;
              const requestedEnd = requestedEndMinutes + bufferMinutes;
              const existingStart = existingStartMinutes - bufferMinutes;
              const existingEnd = existingEndMinutes + bufferMinutes;

              return (
                requestedStart < existingEnd && existingStart < requestedEnd
              );
            },
          );

          return conflictingBookings.length === 0;
        };

        // Get all available tables
        const availableTables = tables
          .filter((table) => isTableAvailable(table))
          .map((table) => ({
            id: table.id,
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            roomId: table.roomId,
            isAvailable: true,
          }));

        // Get all tables with their availability status
        const allTablesWithStatus = tables.map((table) => ({
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          roomId: table.roomId,
          isAvailable: isTableAvailable(table),
          suitableForGuestCount: table.capacity >= requestedGuestCount,
        }));

        res.json({
          availableTables,
          allTablesWithStatus,
          totalAvailable: availableTables.length,
          totalTables: tables.length,
        });
      } catch (error) {
        console.error("Error getting available tables:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Smart Rescheduling Assistant routes
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rescheduling-suggestions",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { originalDate, originalTime, guestCount, reason, options } =
          req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const { SmartReschedulingAssistant } = await import(
          "./rescheduling-assistant"
        );
        const assistant = new SmartReschedulingAssistant(storage);

        const suggestions = await assistant.generateReschedulingSuggestions(
          restaurantId,
          tenantId,
          originalDate,
          originalTime,
          guestCount,
          reason,
          options || {},
        );

        res.json({
          suggestions,
          count: suggestions.length,
          message:
            suggestions.length > 0
              ? "Alternative suggestions found"
              : "No alternative times available",
        });
      } catch (error) {
        console.error("Error generating rescheduling suggestions:", error);
        res.status(500).json({ message: "Failed to generate suggestions" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings/:bookingId/rescheduling-suggestions",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const bookingId = parseInt(req.params.bookingId);
        const { reason, options } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const booking = await storage.getBookingById(bookingId);
        if (!booking || booking.restaurantId !== restaurantId) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const { SmartReschedulingAssistant } = await import(
          "./rescheduling-assistant"
        );
        const assistant = new SmartReschedulingAssistant(storage);

        const suggestions = await assistant.generateSuggestionsForBooking(
          bookingId,
          reason || "booking_conflict",
          options || {},
        );

        res.json({
          suggestions,
          count: suggestions.length,
          bookingId,
          message: "Rescheduling suggestions generated successfully",
        });
      } catch (error) {
        console.error(
          "Error generating booking rescheduling suggestions:",
          error,
        );
        res.status(500).json({ message: "Failed to generate suggestions" });
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rescheduling-suggestions",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const suggestions =
          await storage.getReschedulingSuggestionsByRestaurant(restaurantId);
        res.json(suggestions);
      } catch (error) {
        console.error("Error fetching rescheduling suggestions:", error);
        res.status(500).json({ message: "Failed to fetch suggestions" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/rescheduling-suggestions/:suggestionId/accept",
    validateTenant,
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const suggestionId = parseInt(req.params.suggestionId);
        const { userEmail } = req.body;

        const suggestion =
          await storage.getReschedulingSuggestionById(suggestionId);
        if (!suggestion || suggestion.tenantId !== tenantId) {
          return res.status(404).json({ message: "Suggestion not found" });
        }

        const { SmartReschedulingAssistant } = await import(
          "./rescheduling-assistant"
        );
        const assistant = new SmartReschedulingAssistant(storage);

        const result = await assistant.acceptReschedulingSuggestion(
          suggestionId,
          userEmail || "system",
        );

        if (result.success) {
          res.json({
            success: true,
            updatedBooking: result.updatedBooking,
            message: result.message,
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.message,
          });
        }
      } catch (error) {
        console.error("Error accepting rescheduling suggestion:", error);
        res.status(500).json({ message: "Failed to accept suggestion" });
      }
    },
  );

  app.delete(
    "/api/tenants/:tenantId/rescheduling-suggestions/:suggestionId",
    validateTenant,
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const suggestionId = parseInt(req.params.suggestionId);

        const suggestion =
          await storage.getReschedulingSuggestionById(suggestionId);
        if (!suggestion || suggestion.tenantId !== tenantId) {
          return res.status(404).json({ message: "Suggestion not found" });
        }

        const success =
          await storage.deleteReschedulingSuggestion(suggestionId);
        if (success) {
          res.json({ message: "Suggestion deleted successfully" });
        } else {
          res.status(500).json({ message: "Failed to delete suggestion" });
        }
      } catch (error) {
        console.error("Error deleting rescheduling suggestion:", error);
        res.status(500).json({ message: "Failed to delete suggestion" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/alternative-times",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { date, guestCount, excludeTime } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const { SmartReschedulingAssistant } = await import(
          "./rescheduling-assistant"
        );
        const assistant = new SmartReschedulingAssistant(storage);

        const alternatives = await assistant.findAlternativeTimeSlotsForDay(
          restaurantId,
          date,
          guestCount,
          excludeTime,
        );

        res.json({
          alternatives,
          date,
          count: alternatives.length,
          message:
            alternatives.length > 0
              ? "Alternative times found"
              : "No alternative times available",
        });
      } catch (error) {
        console.error("Error finding alternative times:", error);
        res.status(500).json({ message: "Failed to find alternative times" });
      }
    },
  );

  // Walk-in booking routes
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/walk-in-booking",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const {
          guestCount,
          bookingDate,
          startTime,
          endTime,
          tableId,
          customerName,
          customerPhone,
          notes,
          specialRequests,
        } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check subscription booking limits
        const tenant = await storage.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }

        const subscriptionPlan = await storage.getSubscriptionPlanById(
          tenant.subscriptionPlanId,
        );
        if (!subscriptionPlan) {
          return res.status(400).json({ message: "Invalid subscription plan" });
        }

        const currentBookingCount =
          await storage.getBookingCountForTenantThisMonth(tenantId);
        const maxBookingsPerMonth = subscriptionPlan.maxBookingsPerMonth || 100;

        if (currentBookingCount >= maxBookingsPerMonth) {
          return res.status(400).json({
            message: `You have reached your monthly booking limit of ${maxBookingsPerMonth} bookings for your ${subscriptionPlan.name} plan. Please upgrade your subscription to create more bookings.`,
          });
        }

        // Create walk-in customer
        const walkInCustomer = await storage.createWalkInCustomer(
          restaurantId,
          tenantId,
          {
            name: customerName || undefined,
            phone: customerPhone || undefined,
            notes: notes || undefined,
          },
        );

        // Create booking data
        const bookingData = {
          restaurantId,
          tenantId,
          customerId: walkInCustomer.id,
          customerName: walkInCustomer.name || "Walk-in Customer",
          customerEmail: walkInCustomer.email || null,
          customerPhone: walkInCustomer.phone || null,
          guestCount: parseInt(guestCount),
          bookingDate: new Date(bookingDate),
          startTime,
          endTime: endTime || undefined,
          tableId:
            tableId && tableId !== "auto" ? parseInt(tableId) : undefined,
          status: "confirmed" as const,
          source: "walk_in" as const,
          notes: specialRequests || undefined,
        };

        // If no table specified or auto-assign, try to find an available one
        if (!tableId || tableId === "auto") {
          const tables = await storage.getTablesByRestaurant(restaurantId);
          const suitableTables = tables.filter(
            (table) => table.isActive && table.capacity >= guestCount,
          );

          if (suitableTables.length === 0) {
            return res.status(400).json({
              message: "No available tables for walk-in at this time",
              alternatives: [],
            });
          }

          // Check availability for each suitable table
          let selectedTable = null;
          for (const table of suitableTables) {
            const existingBookings = await storage.getBookingsByDate(
              restaurantId,
              bookingDate,
            );
            const isAvailable = !existingBookings.some(
              (booking) =>
                booking.tableId === table.id &&
                booking.status !== "cancelled" &&
                booking.startTime === startTime,
            );

            if (isAvailable) {
              selectedTable = table;
              break;
            }
          }

          if (!selectedTable) {
            return res.status(400).json({
              message: "No available tables for walk-in at this time",
              alternatives: [],
            });
          }

          bookingData.tableId = selectedTable.id;
        }

        const newBooking = await storage.createBooking(bookingData);

        // Log the walk-in activity
        await storage.createActivityLog({
          restaurantId,
          tenantId,
          eventType: "walk_in_booking_created",
          description: `Walk-in booking created for ${guestCount} guests`,
          source: "staff",
          userEmail: "walk-in-system",
          details: JSON.stringify({
            bookingId: newBooking.id,
            customerId: walkInCustomer.id,
            customerName: walkInCustomer.name,
            tableId: bookingData.tableId,
          }),
        });

        res.status(201).json({
          booking: newBooking,
          customer: walkInCustomer,
          message: "Walk-in booking created successfully",
        });
      } catch (error) {
        console.error("Error creating walk-in booking:", error);
        res.status(500).json({ message: "Failed to create walk-in booking" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/customers/:customerId",
    validateTenant,
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const customerId = parseInt(req.params.customerId);
        const { name, email, phone, notes } = req.body;

        const customer = await storage.getCustomerById(customerId);
        if (!customer || customer.tenantId !== tenantId) {
          return res.status(404).json({ message: "Customer not found" });
        }

        const updatedCustomer = await storage.updateCustomer(customerId, {
          name: name || customer.name,
          email: email || customer.email,
          phone: phone || customer.phone,
          notes: notes || customer.notes,
          isWalkIn: email ? false : customer.isWalkIn, // Convert to regular customer if email provided
        });

        if (!updatedCustomer) {
          return res.status(500).json({ message: "Failed to update customer" });
        }

        // Log the customer update
        await storage.createActivityLog({
          restaurantId: customer.restaurantId,
          tenantId,
          eventType: "customer_updated",
          description: `Customer information updated: ${updatedCustomer.name}`,
          source: "staff",
          userEmail: "system",
          details: JSON.stringify({
            customerId,
            wasWalkIn: customer.isWalkIn,
            isWalkIn: updatedCustomer.isWalkIn,
          }),
        });

        res.json(updatedCustomer);
      } catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({ message: "Failed to update customer" });
      }
    },
  );

  // Email notification settings routes
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/email-settings",
    validateTenant,
    async (req, res) => {
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
            placeSettings,
          }),
        });

        res.json({
          message: "Email settings saved successfully",
          settings: { guestSettings, placeSettings },
        });
      } catch (error) {
        console.error("Error saving email settings:", error);
        res.status(500).json({ message: "Failed to save email settings" });
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/email-settings",
    validateTenant,
    async (req, res) => {
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
            reviewSite: "Google",
          },
          placeSettings: {
            sentTo: restaurant.email || "restaurant@example.com",
            emailBooking: true,
            newBookingsOnly: false,
            satisfactionSurvey: true,
            rating: "3.0",
          },
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
    },
  );

  // Opening hours routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const openingHours = await storage.getOpeningHours(
          tenantId,
          restaurantId,
        );
        res.json(openingHours);
      } catch (error) {
        console.error("Error fetching opening hours:", error);
        res.status(500).json({ message: "Failed to fetch opening hours" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const hoursData = req.body;

        if (!Array.isArray(hoursData)) {
          return res
            .status(400)
            .json({ message: "Invalid opening hours data format" });
        }

        // Clear existing opening hours for this restaurant
        await storage.clearOpeningHours(tenantId, restaurantId);

        // Save new opening hours
        const savedHours = [];
        for (const hour of hoursData) {
          const savedHour = await storage.createOpeningHour({
            tenantId,
            restaurantId,
            dayOfWeek: hour.dayOfWeek,
            isOpen: hour.isOpen,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
          });
          savedHours.push(savedHour);
        }

        res.json({
          message: "Opening hours saved successfully",
          hours: savedHours,
        });
      } catch (error) {
        console.error("Error saving opening hours:", error);
        res.status(500).json({ message: "Failed to save opening hours" });
      }
    },
  );

  // Statistics endpoint moved to comprehensive implementation below

  // Restaurant management routes
  app.put(
    "/api/tenants/:tenantId/restaurants/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        const restaurant = await storage.getRestaurantById(id);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updatedRestaurant = await storage.updateRestaurant(id, updates);

        // If setupCompleted was updated, refresh the session data
        if ("setupCompleted" in updates && (req as any).session) {
          const session = (req as any).session;
          if (session.restaurant && session.restaurant.id === id) {
            session.restaurant = {
              ...session.restaurant,
              ...updatedRestaurant,
            };
          }
        }

        res.json(updatedRestaurant);
      } catch (error) {
        console.error("Error updating restaurant:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/restaurants/:userId",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Additional booking management routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rooms",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant exists and belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        if (restaurant.tenantId !== tenantId) {
          return res
            .status(403)
            .json({ message: "Restaurant does not belong to this tenant" });
        }

        const rooms = await storage.getRoomsByRestaurant(restaurantId);
        // Filter rooms by tenantId for security
        const tenantRooms = rooms.filter((room) => room.tenantId === tenantId);

        res.json(tenantRooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rooms",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rooms/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        if (isNaN(id) || isNaN(restaurantId) || isNaN(tenantId)) {
          return res.status(400).json({ message: "Invalid parameters" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const existingRoom = await storage.getRoomById(id);
        if (
          !existingRoom ||
          existingRoom.tenantId !== tenantId ||
          existingRoom.restaurantId !== restaurantId
        ) {
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
    },
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/rooms/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(id) || isNaN(restaurantId) || isNaN(tenantId)) {
          return res.status(400).json({ message: "Invalid parameters" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const existingRoom = await storage.getRoomById(id);
        if (
          !existingRoom ||
          existingRoom.tenantId !== tenantId ||
          existingRoom.restaurantId !== restaurantId
        ) {
          return res.status(404).json({ message: "Room not found" });
        }

        const deleted = await storage.deleteRoom(id);
        if (!deleted) {
          return res.status(404).json({ message: "Failed to delete room" });
        }

        res.json({ message: "Room deleted successfully" });
      } catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/rooms/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        if (isNaN(id) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid room ID or tenant ID" });
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
    },
  );

  app.delete(
    "/api/tenants/:tenantId/rooms/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Tables routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant exists and belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        if (restaurant.tenantId !== tenantId) {
          return res
            .status(403)
            .json({ message: "Restaurant does not belong to this tenant" });
        }

        const tables = await storage.getTablesByRestaurant(restaurantId);
        // Filter tables by tenantId for security
        const tenantTables = tables.filter(
          (table) => table.tenantId === tenantId,
        );
        res.json(tenantTables);
      } catch (error) {
        console.error("Error fetching tables:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check table limits before creating
        const tenant = await storage.getTenantById(tenantId);
        if (tenant?.subscriptionPlanId) {
          const plan = await storage.getSubscriptionPlanById(
            tenant.subscriptionPlanId,
          );
          if (plan?.maxTables) {
            // Count existing tables across all restaurants for this tenant
            const restaurants =
              await storage.getRestaurantsByTenantId(tenantId);
            let totalTables = 0;

            for (const rest of restaurants) {
              const restTables = await storage.getTablesByRestaurant(rest.id);
              totalTables += restTables.length;
            }

            if (totalTables >= plan.maxTables) {
              return res.status(400).json({
                error: "Table limit exceeded",
                message: `Your ${plan.name} plan allows a maximum of ${plan.maxTables} tables. You currently have ${totalTables} tables. Please upgrade your subscription to add more tables.`,
                currentTables: totalTables,
                maxTablesAllowed: plan.maxTables,
                requiresUpgrade: true,
              });
            }
          }
        }

        const tableData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const table = await storage.createTable(tableData);
        res.json(table);
      } catch (error) {
        console.error("Error creating table:", error);
        res.status(400).json({ message: "Invalid table data" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/tables/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        console.log(`Updating table ${id} for tenant ${tenantId}:`, updates);

        // Verify table belongs to tenant before updating
        const existingTable = await storage.getTableById(id);
        if (!existingTable || existingTable.tenantId !== tenantId) {
          console.log(`Table ${id} not found or doesn't belong to tenant ${tenantId}`);
          return res.status(404).json({ message: "Table not found" });
        }

        console.log(`Existing table:`, existingTable);
        const table = await storage.updateTable(id, updates);
        console.log(`Updated table:`, table);
        res.json(table);
      } catch (error) {
        console.error("Error updating table:", error);
        res.status(500).json({ message: "Failed to update table", error: error.message });
      }
    },
  );

  app.delete(
    "/api/tenants/:tenantId/tables/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Combined Tables routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const combinedTables =
          await storage.getCombinedTablesByRestaurant(restaurantId);
        res.json(combinedTables);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch combined tables" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/combined-tables",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const combinedTableData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const combinedTable =
          await storage.createCombinedTable(combinedTableData);
        res.json(combinedTable);
      } catch (error) {
        res.status(400).json({ message: "Invalid combined table data" });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/combined-tables/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        // Verify combined table belongs to tenant before updating
        const existingCombinedTable = await storage.getCombinedTableById(id);
        if (
          !existingCombinedTable ||
          existingCombinedTable.tenantId !== tenantId
        ) {
          return res.status(404).json({ message: "Combined table not found" });
        }

        const combinedTable = await storage.updateCombinedTable(id, updates);
        res.json(combinedTable);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.delete(
    "/api/tenants/:tenantId/combined-tables/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);

        // Verify combined table belongs to tenant before deleting
        const existingCombinedTable = await storage.getCombinedTableById(id);
        if (
          !existingCombinedTable ||
          existingCombinedTable.tenantId !== tenantId
        ) {
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
    },
  );

  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const { date } = req.query;

        let bookings;
        if (date && typeof date === "string") {
          bookings = await storage.getBookingsByDate(restaurantId, date);
        } else {
          bookings = await storage.getBookingsByRestaurant(restaurantId);
        }

        res.json(bookings);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        // Validate required fields
        if (
          !req.body.customerName ||
          !req.body.customerEmail ||
          !req.body.bookingDate ||
          !req.body.startTime ||
          !req.body.guestCount
        ) {
          return res
            .status(400)
            .json({ message: "Missing required booking fields" });
        }

        const bookingDate = new Date(req.body.bookingDate);
        const bookingTime = req.body.startTime;
        const tableId = req.body.tableId;

        // Validate booking against opening hours and cut-off times
        const isRestaurantOpen = await storage.isRestaurantOpen(
          restaurantId,
          bookingDate,
          bookingTime,
        );
        if (!isRestaurantOpen) {
          return res.status(400).json({
            message:
              "Booking not allowed: Restaurant is closed on this day and time",
          });
        }

        const isAllowed = await storage.isBookingAllowed(
          restaurantId,
          bookingDate,
          bookingTime,
        );
        if (!isAllowed) {
          return res.status(400).json({
            message:
              "Booking not allowed: Restaurant is closed or past cut-off time",
          });
        }

        // Smart table assignment and conflict checking
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const existingBookings = await storage.getBookingsByDate(
          restaurantId,
          bookingDate.toISOString().split("T")[0],
        );

        const requestedStartTime = req.body.startTime;
        const requestedEndTime = req.body.endTime || "23:59";
        const requestedGuestCount = req.body.guestCount;

        // Helper function to check if a table is available at the requested time
        const isTableAvailable = (tableToCheck: any) => {
          // Check capacity first
          if (tableToCheck.capacity < requestedGuestCount) {
            return false;
          }

          // Check for time conflicts with this specific table
          const conflictingBookings = existingBookings.filter((booking) => {
            if (booking.tableId !== tableToCheck.id) return false;
            if (booking.status === "cancelled") return false;

            // Convert times to minutes for easier comparison
            const requestedStartMinutes =
              parseInt(requestedStartTime.split(":")[0]) * 60 +
              parseInt(requestedStartTime.split(":")[1]);
            const requestedEndMinutes =
              parseInt(requestedEndTime.split(":")[0]) * 60 +
              parseInt(requestedEndTime.split(":")[1]);

            const existingStartMinutes =
              parseInt(booking.startTime.split(":")[0]) * 60 +
              parseInt(booking.startTime.split(":")[1]);
            const existingEndTime = booking.endTime || "23:59";
            const existingEndMinutes =
              parseInt(existingEndTime.split(":")[0]) * 60 +
              parseInt(existingEndTime.split(":")[1]);

            // Add 1-hour buffer (60 minutes) for table turnover
            const bufferMinutes = 60;

            // Check for time overlap with buffer
            // Two time ranges overlap if: start1 < end2 && start2 < end1
            const requestedStart = requestedStartMinutes - bufferMinutes;
            const requestedEnd = requestedEndMinutes + bufferMinutes;
            const existingStart = existingStartMinutes - bufferMinutes;
            const existingEnd = existingEndMinutes + bufferMinutes;

            return requestedStart < existingEnd && existingStart < requestedEnd;
          });

          return conflictingBookings.length === 0;
        };

        let assignedTableId = tableId;

        if (tableId) {
          // Specific table requested - check if it's available
          const selectedTable = tables.find((table) => table.id === tableId);

          if (!selectedTable) {
            return res.status(400).json({
              message: "Selected table not found",
            });
          }

          if (!isTableAvailable(selectedTable)) {
            // Find alternative table suggestions
            const availableTables = tables
              .filter((table) => isTableAvailable(table))
              .sort((a, b) => a.capacity - b.capacity); // Sort by capacity (smallest suitable first)

            if (availableTables.length > 0) {
              const suggestedTable = availableTables[0];
              return res.status(400).json({
                message: `Table ${selectedTable.tableNumber} is not available at ${bookingTime}. Table ${suggestedTable.tableNumber} (capacity: ${suggestedTable.capacity}) is available as an alternative.`,
                suggestedTable: suggestedTable,
              });
            } else {
              return res.status(400).json({
                message: `Table ${selectedTable.tableNumber} is not available at ${bookingTime} and no alternative tables are available for ${requestedGuestCount} guests.`,
              });
            }
          }
        } else {
          // No specific table requested - automatically assign the best available table
          const availableTables = tables
            .filter((table) => isTableAvailable(table))
            .sort((a, b) => a.capacity - b.capacity); // Sort by capacity (smallest suitable first)

          if (availableTables.length === 0) {
            return res.status(400).json({
              message: `No tables available for ${requestedGuestCount} guests at ${bookingTime} on ${bookingDate.toISOString().split("T")[0]}. Please try a different time or date.`,
            });
          }

          // Assign the smallest suitable table
          assignedTableId = availableTables[0].id;
        }

        // Check subscription booking limits
        const tenant = await storage.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }

        const subscriptionPlan = await storage.getSubscriptionPlanById(
          tenant.subscriptionPlanId,
        );
        if (!subscriptionPlan) {
          return res.status(400).json({ message: "Invalid subscription plan" });
        }

        const currentBookingCount =
          await storage.getBookingCountForTenantThisMonth(tenantId);
        const maxBookingsPerMonth = subscriptionPlan.maxBookingsPerMonth || 100;

        if (currentBookingCount >= maxBookingsPerMonth) {
          return res.status(400).json({
            message: `You have reached your monthly booking limit of ${maxBookingsPerMonth} bookings for your ${subscriptionPlan.name} plan. Please upgrade your subscription to create more bookings.`,
          });
        }

        // Get or create customer first
        const customer = await storage.getOrCreateCustomer(
          restaurantId,
          tenantId,
          {
            name: req.body.customerName,
            email: req.body.customerEmail,
            phone: req.body.customerPhone,
          },
        );

        const bookingData = insertBookingSchema.parse({
          ...req.body,
          restaurantId,
          tenantId,
          customerId: customer.id,
          bookingDate: bookingDate,
          tableId: assignedTableId,
        });

        const booking = await storage.createBooking(bookingData);

        console.log(
          `Booking created successfully: ${booking.id} for restaurant ${restaurantId}`,
        );

        // Send real-time notification to all connected clients for this restaurant
        try {
          console.log(
            `Preparing real-time notification for booking ${booking.id}`,
          );

          // Create persistent notification
          const restaurant = await storage.getRestaurantById(restaurantId);
          const notification = await storage.createNotification({
            restaurantId: restaurantId,
            tenantId: booking.tenantId,
            type: "new_booking",
            title: "New Booking Created",
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
                createdAt: booking.createdAt,
              },
              restaurant: {
                id: restaurantId,
                name: restaurant?.name,
              },
            },
            canRevert: false,
          });

          const notificationData = {
            type: "notification",
            notification: {
              id: notification.id,
              type: "new_booking",
              title: notification.title,
              message: notification.message,
              booking: notification.data.booking,
              restaurant: notification.data.restaurant,
              timestamp: notification.createdAt,
              read: false,
              canRevert: false,
            },
          };

          console.log(
            `About to broadcast notification for restaurant ${restaurantId}`,
          );
          broadcastNotification(restaurantId, notificationData);
          console.log(
            `Real-time notification processing completed for booking ${booking.id}`,
          );
        } catch (notificationError) {
          console.error(
            "Error sending real-time notification:",
            notificationError,
          );
        }

        // Send email notifications if Brevo is configured and enabled in settings
        if (emailService) {
          console.log(
            "Email service available - processing notifications for booking",
            booking.id,
          );
          try {
            const restaurant = await storage.getRestaurantById(restaurantId);
            let emailSettings = null;

            // Parse email settings if they exist
            if (restaurant?.emailSettings) {
              try {
                emailSettings = JSON.parse(restaurant.emailSettings);
                console.log("Email settings loaded:", emailSettings);
              } catch (e) {
                console.warn("Failed to parse email settings, using defaults");
              }
            } else {
              console.log(
                "No email settings found - using defaults (all notifications enabled)",
              );
            }

            // Send confirmation email to customer if enabled
            const shouldSendGuestConfirmation =
              emailSettings?.guestSettings?.sendBookingConfirmation !== false;
            console.log(
              "Should send guest confirmation:",
              shouldSendGuestConfirmation,
            );

            if (shouldSendGuestConfirmation) {
              console.log(
                "Sending booking confirmation email to:",
                req.body.customerEmail,
              );
              await emailService.sendBookingConfirmation(
                req.body.customerEmail,
                req.body.customerName,
                {
                  ...bookingData,
                  tableNumber: booking.tableId,
                  id: booking.id,
                },
              );
              console.log("Guest confirmation email sent successfully");
            }

            // Send notification to restaurant if enabled
            const shouldSendRestaurantNotification =
              emailSettings?.placeSettings?.emailBooking !== false;
            const restaurantEmail =
              emailSettings?.placeSettings?.sentTo || restaurant?.email;
            console.log(
              "Should send restaurant notification:",
              shouldSendRestaurantNotification,
              "to email:",
              restaurantEmail,
            );

            if (shouldSendRestaurantNotification && restaurantEmail) {
              console.log(
                "Sending restaurant notification email to:",
                restaurantEmail,
              );
              await emailService.sendRestaurantNotification(restaurantEmail, {
                customerName: req.body.customerName,
                customerEmail: req.body.customerEmail,
                customerPhone: req.body.customerPhone,
                ...bookingData,
              });
              console.log("Restaurant notification email sent successfully");
            }
          } catch (emailError) {
            console.error("Error sending email notifications:", emailError);
            // Don't fail the booking if email fails
          }
        } else {
          console.log(
            "Email service not available - skipping email notifications",
          );
        }

        res.json(booking);
      } catch (error) {
        console.error("Booking creation error:", error);
        if (error instanceof Error) {
          res
            .status(400)
            .json({ message: `Invalid booking data: ${error.message}` });
        } else {
          res.status(400).json({ message: "Invalid booking data" });
        }
      }
    },
  );

  // Guest booking endpoint (public, no authentication required)
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/bookings/guest",
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const restaurantId = parseInt(req.params.restaurantId);

        // Verify restaurant exists and guest booking is enabled
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Guest booking is enabled by default for all restaurants
        // In the future, this could be controlled by a restaurant setting

        const bookingData = {
          tenantId,
          restaurantId,
          customerName: req.body.customerName,
          customerEmail: req.body.customerEmail,
          customerPhone: req.body.customerPhone || null,
          guestCount: req.body.guestCount,
          bookingDate: new Date(req.body.bookingDate),
          startTime: req.body.startTime,
          specialRequests: req.body.specialRequests || null,
          status: "confirmed",
          source: req.body.source || "guest_booking",
        };

        // Validate required fields
        if (
          !bookingData.customerName ||
          !bookingData.customerEmail ||
          !bookingData.guestCount ||
          !bookingData.bookingDate ||
          !bookingData.startTime
        ) {
          return res
            .status(400)
            .json({ message: "Missing required booking information" });
        }

        const booking = await storage.createBooking(bookingData);

        // Send email notifications if service is available
        if (
          emailService &&
          emailService.checkEnabled &&
          emailService.checkEnabled()
        ) {
          try {
            // Send confirmation email to customer
            await emailService.sendBookingConfirmation(
              bookingData.customerEmail,
              bookingData.customerName,
              {
                ...bookingData,
                id: booking.id,
                restaurantName: restaurant.name,
                restaurantAddress: restaurant.address,
              },
            );

            // Send notification to restaurant
            if (restaurant.email) {
              await emailService.sendRestaurantNotification(restaurant.email, {
                ...bookingData,
                id: booking.id,
                restaurantName: restaurant.name,
              });
            }
          } catch (emailError) {
            console.error(
              "Error sending guest booking email notifications:",
              emailError,
            );
            // Don't fail the booking if email fails
          }
        }

        res.json(booking);
      } catch (error) {
        console.error("Guest booking creation error:", error);
        res
          .status(400)
          .json({ message: "Failed to create booking. Please try again." });
      }
    },
  );

  app.put(
    "/api/tenants/:tenantId/bookings/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);

        // Validate request body
        if (!req.body || typeof req.body !== "object") {
          return res
            .status(400)
            .json({ message: "Invalid JSON in request body" });
        }

        const updates = req.body;

        if (updates.bookingDate) {
          updates.bookingDate = new Date(updates.bookingDate);
        }

        const existingBooking = await storage.getBookingById(id);
        if (!existingBooking || existingBooking.tenantId !== tenantId) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const bookingDate = updates.bookingDate
          ? new Date(updates.bookingDate)
          : existingBooking.bookingDate;
        const restaurantId = existingBooking.restaurantId;

        // Check if restaurant is open on this day
        const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const openingHours =
          await storage.getOpeningHoursByRestaurant(restaurantId);
        const dayHours = openingHours.find((oh) => oh.dayOfWeek === dayOfWeek);

        if (!dayHours || !dayHours.isOpen) {
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const dayName = dayNames[dayOfWeek];
          return res.status(400).json({
            message: `Restaurant is closed on ${dayName}s`,
          });
        }

        const booking = await storage.updateBooking(id, updates);

        // Send webhook notifications for booking update
        if (booking) {
          try {
            const webhookService = new WebhookService(storage);
            await webhookService.notifyBookingUpdated(restaurantId, booking);
          } catch (webhookError) {
            console.error(
              "Error sending booking update webhook:",
              webhookError,
            );
          }
        }

        res.json(booking);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/bookings/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/tenants/:tenantId/bookings/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);

        const existingBooking = await storage.getBookingById(id);
        if (!existingBooking || existingBooking.tenantId !== tenantId) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Send webhook notifications before deletion
        try {
          await webhookService.notifyBookingDeleted(
            existingBooking.restaurantId,
            existingBooking,
          );
        } catch (webhookError) {
          console.error(
            "Error sending booking deletion webhook:",
            webhookError,
          );
        }

        const success = await storage.deleteBooking(id);
        res.json({ message: "Booking deleted successfully" });
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  // Duplicate endpoint removed - table updates handled by existing PUT endpoint

  app.delete(
    "/api/tenants/:tenantId/tables/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  app.delete(
    "/api/tenants/:tenantId/rooms/:id",
    validateTenant,
    async (req, res) => {
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
    },
  );

  // Combined table management routes
  app.put(
    "/api/tenants/:tenantId/combined-tables/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);
        const updates = req.body;

        const existingCombinedTable = await storage.getCombinedTableById(id);
        if (
          !existingCombinedTable ||
          existingCombinedTable.tenantId !== tenantId
        ) {
          return res.status(404).json({ message: "Combined table not found" });
        }

        const combinedTable = await storage.updateCombinedTable(id, updates);
        res.json(combinedTable);
      } catch (error) {
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  app.delete(
    "/api/tenants/:tenantId/combined-tables/:id",
    validateTenant,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantId = parseInt(req.params.tenantId);

        const existingCombinedTable = await storage.getCombinedTableById(id);
        if (
          !existingCombinedTable ||
          existingCombinedTable.tenantId !== tenantId
        ) {
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
    },
  );

  // Booking Management Routes (Public - for customer email links)
  app.get("/api/booking-manage/:id", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { hash, action } = req.query;

      if (!hash) {
        return res
          .status(403)
          .json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - prioritize stored management hash
      let isValidHash = false;

      console.log(
        `Verifying hash for booking ${booking.id}, tenant ${booking.tenantId}, restaurant ${booking.restaurantId}`,
      );
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
        console.log(
          `Hash does not match stored management hash, trying action-specific verification`,
        );
        if (action && (action === "cancel" || action === "change")) {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            action as "cancel" | "change",
          );
        } else {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            "manage",
          );
        }
        console.log(`Action-specific hash verification result: ${isValidHash}`);
      } else {
        // Fallback for old bookings without stored hashes
        console.log(`No stored management hash, trying action verification`);
        if (action && (action === "cancel" || action === "change")) {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            action as "cancel" | "change",
          );
        } else {
          isValidHash = BookingHash.verifyHash(
            hash as string,
            booking.id,
            booking.tenantId,
            booking.restaurantId,
            "manage",
          );
        }
        console.log(`Fallback hash verification result: ${isValidHash}`);
      }

      if (!isValidHash) {
        console.log(`Hash verification failed for booking ${booking.id}`);
        return res
          .status(403)
          .json({ message: "Access denied - invalid or expired link" });
      }

      // Check if booking time has passed to determine allowed actions
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const bookingTimeComponents = booking.startTime.split(":");
      bookingDateTime.setHours(
        parseInt(bookingTimeComponents[0]),
        parseInt(bookingTimeComponents[1]),
        0,
        0,
      );

      // Add booking duration (assume 2 hours if not specified)
      const bookingEndTime = new Date(bookingDateTime);
      bookingEndTime.setHours(bookingEndTime.getHours() + 2);

      const isPastBooking = now > bookingEndTime;
      const isBookingStarted = now >= bookingDateTime;

      // Get cut-off times for the restaurant
      const cutOffTimes = await storage.getCutOffTimesByRestaurant(
        booking.restaurantId,
      );

      // Determine cut-off deadline based on restaurant policy
      const dayOfWeek = bookingDateTime.getDay();

      const cutOffTime =
        cutOffTimes && Array.isArray(cutOffTimes)
          ? cutOffTimes.find((ct: any) => ct.dayOfWeek === dayOfWeek)
          : null;

      let canModify = false;
      let canCancel = false;

      if (!isBookingStarted && !isPastBooking) {
        if (!cutOffTime || !cutOffTime.isEnabled) {
          // Default: allow changes up to 2 hours before booking for customer management
          const cutOffDeadline = new Date(
            bookingDateTime.getTime() - 2 * 60 * 60 * 1000,
          ); // 2 hours before in milliseconds
          canModify = now < cutOffDeadline;
          canCancel = now < cutOffDeadline;
          console.log(
            `Default cut-off: Now ${now.toISOString()}, Deadline ${cutOffDeadline.toISOString()}, Can modify: ${canModify}`,
          );
        } else {
          // Use restaurant's cut-off time policy
          const cutOffDeadline = new Date(
            bookingDateTime.getTime() -
              cutOffTime.hoursBeforeBooking * 60 * 60 * 1000,
          );
          canModify = now < cutOffDeadline;
          canCancel = now < cutOffDeadline;
          console.log(
            `Restaurant cut-off (${cutOffTime.hoursBeforeBooking}h): Now ${now.toISOString()}, Deadline ${cutOffDeadline.toISOString()}, Can modify: ${canModify}`,
          );
        }
      }

      // Return booking with action permissions
      const bookingWithPermissions = {
        ...booking,
        canModify: canModify,
        canCancel: canCancel,
        isPastBooking: isPastBooking,
        isBookingStarted: isBookingStarted,
        cutOffHours: cutOffTime?.hoursBeforeBooking || 2, // Include cut-off info for UI
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
        return res
          .status(403)
          .json({ message: "Access denied - security token required" });
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
          "manage",
        );
      }

      if (!isValidHash) {
        return res
          .status(403)
          .json({ message: "Access denied - invalid security token" });
      }

      const changeRequests =
        await storage.getBookingChangeRequestsByBookingId(bookingId);
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
        return res
          .status(403)
          .json({ message: "Access denied - security token required" });
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
        const actions = ["manage", "cancel", "change"];
        for (const action of actions) {
          if (
            BookingHash.verifyHash(
              hash as string,
              booking.id,
              booking.tenantId,
              booking.restaurantId,
              action as "manage" | "cancel" | "change",
            )
          ) {
            isValidHash = true;
            console.log(`Hash verified with ${action} action`);
            break;
          }
        }
      }

      if (!isValidHash) {
        console.log(`Hash verification failed for booking ${booking.id}`);
        return res
          .status(403)
          .json({ message: "Access denied - invalid or expired link" });
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
        return res
          .status(403)
          .json({ message: "Access denied - security token required" });
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
          "cancel",
        );
      }

      if (!isValidHash) {
        return res
          .status(403)
          .json({ message: "Access denied - invalid security token" });
      }

      // Check if booking can still be cancelled
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const bookingTimeComponents = booking.startTime.split(":");
      bookingDateTime.setHours(
        parseInt(bookingTimeComponents[0]),
        parseInt(bookingTimeComponents[1]),
        0,
        0,
      );

      const isBookingStarted = now >= bookingDateTime;
      if (isBookingStarted) {
        return res.status(403).json({
          message:
            "Cannot cancel booking - the booking time has already started or passed",
        });
      }

      // Cancel the booking
      const updatedBooking = await storage.updateBooking(id, {
        status: "cancelled",
      });

      // Send real-time notification to restaurant
      broadcastNotification(updatedBooking.restaurantId, {
        type: "booking_cancelled",
        booking: updatedBooking,
        cancelledBy: "customer",
        timestamp: new Date().toISOString(),
      });

      // Get restaurant and tenant information for email notification
      const restaurant = await storage.getRestaurantById(updatedBooking.restaurantId);
      const tenant = await storage.getTenantById(updatedBooking.tenantId);

      // Send email notification to restaurant
      if (restaurant && tenant && restaurant.email) {
        try {
          await emailService.sendBookingCancellationNotification(
            restaurant.email,
            restaurant.name,
            {
              ...updatedBooking,
              restaurantName: restaurant.name,
              tenantName: tenant.name,
            }
          );
          console.log(`Cancellation email sent to restaurant: ${restaurant.email}`);
        } catch (emailError) {
          console.error("Failed to send cancellation email:", emailError);
          // Don't fail the cancellation if email fails
        }
      }

      // Create a notification record in the database
      try {
        await storage.createNotification({
          restaurantId: updatedBooking.restaurantId,
          tenantId: updatedBooking.tenantId,
          type: "booking_cancelled",
          title: "Booking Cancelled",
          message: `${updatedBooking.customerName} cancelled their booking for ${new Date(updatedBooking.bookingDate).toLocaleDateString()} at ${updatedBooking.startTime}`,
          bookingId: updatedBooking.id,
          isRead: false,
        });
      } catch (notificationError) {
        console.error("Failed to create notification record:", notificationError);
        // Don't fail the cancellation if notification creation fails
      }

      res.json({
        message: "Booking cancelled successfully",
        booking: updatedBooking,
      });
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
        return res
          .status(403)
          .json({ message: "Access denied - security token required" });
      }

      const booking = await storage.getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify hash - accept manage, cancel, or change hashes
      let isValidHash = false;

      // Try verifying with the specific action if provided
      if (action && (action === "cancel" || action === "change")) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          action as "cancel" | "change",
        );
      }

      // If no specific action or verification failed, try with manage hash
      if (!isValidHash) {
        isValidHash = BookingHash.verifyHash(
          hash as string,
          booking.id,
          booking.tenantId,
          booking.restaurantId,
          "manage",
        );
      }

      if (!isValidHash) {
        return res
          .status(403)
          .json({ message: "Access denied - invalid security token" });
      }

      // Check if booking time has passed to prevent modifications
      const now = new Date();
      const bookingDateTime = new Date(booking.bookingDate);
      const bookingTimeComponents = booking.startTime.split(":");
      bookingDateTime.setHours(
        parseInt(bookingTimeComponents[0]),
        parseInt(bookingTimeComponents[1]),
        0,
        0,
      );

      const isBookingStarted = now >= bookingDateTime;

      if (isBookingStarted) {
        return res.status(403).json({
          message:
            "Cannot modify booking - the booking time has already started or passed",
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
      if (updates.newDate || updates.newTime || updates.newGuestCount) {
        console.log(
          "Processing change request for date/time/guest count changes",
        );

        // Validate availability for the requested changes
        const requestedDate = updates.newDate
          ? new Date(updates.newDate)
          : booking.bookingDate;
        const requestedTime = updates.newTime || booking.startTime;
        const requestedGuestCount = updates.newGuestCount || booking.guestCount;

        // Check if restaurant is open on the requested day
        const dayOfWeek = requestedDate.getDay();
        const openingHours = await storage.getOpeningHoursByRestaurant(
          booking.restaurantId,
        );
        const dayHours = openingHours.find((oh) => oh.dayOfWeek === dayOfWeek);

        if (!dayHours || !dayHours.isOpen) {
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const dayName = dayNames[dayOfWeek];
          return res.status(400).json({
            message: `Restaurant is closed on ${dayName}s. Please choose a different date.`,
          });
        }

        // Check if requested time is within opening hours
        const timeInMinutes = (time: string) => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes;
        };

        const requestedTimeMinutes = timeInMinutes(requestedTime);
        const openTimeMinutes = timeInMinutes(dayHours.openTime);
        const closeTimeMinutes = timeInMinutes(dayHours.closeTime);

        if (
          requestedTimeMinutes < openTimeMinutes ||
          requestedTimeMinutes > closeTimeMinutes
        ) {
          return res.status(400).json({
            message: `Requested time ${requestedTime} is outside restaurant hours (${dayHours.openTime} - ${dayHours.closeTime})`,
          });
        }

        // Check for booking conflicts
        const existingBookings = await storage.getBookingsByDate(
          booking.restaurantId,
          requestedDate.toISOString().split("T")[0],
        );

        const hasConflict = existingBookings.some((existingBooking) => {
          // Skip checking against the current booking
          if (existingBooking.id === booking.id) return false;
          if (existingBooking.status === "cancelled") return false;

          // Check if booking times overlap
          const existingStartMinutes = timeInMinutes(existingBooking.startTime);
          const existingEndMinutes = timeInMinutes(
            existingBooking.endTime ||
              `${Math.floor((existingStartMinutes + 120) / 60)
                .toString()
                .padStart(
                  2,
                  "0",
                )}:${((existingStartMinutes + 120) % 60).toString().padStart(2, "0")}`,
          );

          const requestedEndMinutes = requestedTimeMinutes + 120; // Assume 2-hour duration

          return (
            requestedTimeMinutes < existingEndMinutes &&
            requestedEndMinutes > existingStartMinutes
          );
        });

        if (hasConflict) {
          return res.status(400).json({
            message: `The requested time ${requestedTime} conflicts with another booking. Please choose a different time.`,
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
          requestNotes: updates.reason || "Customer requested booking changes",
          status: "pending",
        });

        // Create persistent notification
        const notification = await storage.createNotification({
          restaurantId: booking.restaurantId,
          tenantId: booking.tenantId,
          type: "booking_change_request",
          title: "Booking Change Request",
          message: `${booking.customerName} requested to change their booking from ${new Date(booking.bookingDate).toLocaleDateString()} ${booking.startTime}`,
          bookingId: booking.id,
          changeRequestId: changeRequest.id,
          data: {
            changeRequest: changeRequest,
            booking: booking,
          },
          canRevert: false,
        });

        // Send real-time notification to restaurant admin
        broadcastNotification(booking.restaurantId, {
          type: "booking_change_request",
          changeRequest: changeRequest,
          booking: booking,
          notification: notification,
          timestamp: new Date().toISOString(),
        });

        // Send email notification to restaurant if available
        if (emailService) {
          try {
            const restaurant = await storage.getRestaurantById(
              booking.restaurantId,
            );
            if (restaurant && restaurant.email) {
              await emailService.sendBookingChangeRequest(
                restaurant.email,
                changeRequest,
                booking,
              );
              console.log("Booking change request email sent to restaurant");
            }
          } catch (error) {
            console.error("Failed to send change request email:", error);
          }
        }

        res.json({
          message:
            "Change request submitted successfully. The restaurant will review your request and notify you of their decision.",
          changeRequest: changeRequest,
        });
      } else if (action === "cancel") {
        // For cancellations, update the booking status immediately but notify the restaurant
        const updatedBooking = await storage.updateBooking(id, {
          status: "cancelled",
        });

        // Create persistent notification
        const notification = await storage.createNotification({
          restaurantId: updatedBooking.restaurantId,
          tenantId: updatedBooking.tenantId,
          type: "booking_cancelled",
          title: "Booking Cancelled",
          message: `${updatedBooking.customerName} cancelled their booking for ${new Date(updatedBooking.bookingDate).toLocaleDateString()} at ${updatedBooking.startTime}`,
          bookingId: updatedBooking.id,
          data: {
            booking: updatedBooking,
            cancelledBy: "customer",
          },
          canRevert: false,
        });

        // Send real-time notification to restaurant
        broadcastNotification(updatedBooking.restaurantId, {
          type: "booking_cancelled",
          booking: updatedBooking,
          cancelledBy: "customer",
          notification: notification,
          timestamp: new Date().toISOString(),
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
          type: "booking_changed",
          title: "Booking Modified",
          message: `${updatedBooking.customerName} modified their booking for ${new Date(updatedBooking.bookingDate).toLocaleDateString()} at ${updatedBooking.startTime}`,
          bookingId: updatedBooking.id,
          data: {
            booking: updatedBooking,
            changes: allowedUpdates,
          },
          originalData: {
            bookingDate: originalBooking.bookingDate,
            startTime: originalBooking.startTime,
            endTime: originalBooking.endTime,
            guestCount: originalBooking.guestCount,
            tableId: originalBooking.tableId,
            notes: originalBooking.notes,
          },
          canRevert: true,
        });

        // Send real-time notification to restaurant with original data for reverting
        broadcastNotification(updatedBooking.restaurantId, {
          type: "booking_changed",
          booking: updatedBooking,
          changes: allowedUpdates,
          notification: notification,
          originalData: {
            bookingDate: originalBooking.bookingDate,
            startTime: originalBooking.startTime,
            endTime: originalBooking.endTime,
            guestCount: originalBooking.guestCount,
            tableId: originalBooking.tableId,
            notes: originalBooking.notes,
          },
          timestamp: new Date().toISOString(),
        });

        res.json(updatedBooking);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking Change Request Management Routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/change-requests",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const changeRequests =
          await storage.getBookingChangeRequestsByRestaurant(restaurantId);
        res.json(changeRequests);
      } catch (error) {
        console.error("Error fetching change requests:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Approve change request
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/change-requests/:requestId/approve",
    attachUser,
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const requestId = parseInt(req.params.requestId);
        const { response } = req.body;

        const changeRequest =
          await storage.getBookingChangeRequestById(requestId);
        if (!changeRequest) {
          return res.status(404).json({ message: "Change request not found" });
        }

        if (changeRequest.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Change request has already been processed" });
        }

        const booking = await storage.getBookingById(changeRequest.bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Update change request status
        await storage.updateBookingChangeRequest(requestId, {
          status: "approved",
          restaurantResponse: response || "Approved via admin dashboard",
          respondedAt: new Date(),
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

        const updatedBooking = await storage.updateBooking(
          changeRequest.bookingId,
          bookingUpdates,
        );

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
              managementHash: booking.managementHash,
            },
            {
              requestedDate: changeRequest.requestedDate,
              requestedTime: changeRequest.requestedTime,
              requestedGuestCount: changeRequest.requestedGuestCount,
            },
            response || "Your booking change request has been approved.",
          );
          console.log(`Approval email sent to ${booking.customerEmail}`);
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
        }

        // Send real-time notification
        broadcastNotification(booking.restaurantId, {
          type: "change_request_approved",
          changeRequest: { ...changeRequest, status: "approved" },
          booking: updatedBooking,
          timestamp: new Date().toISOString(),
        });

        res.json({
          message: "Change request approved successfully",
          changeRequest: { ...changeRequest, status: "approved" },
          booking: updatedBooking,
        });
      } catch (error) {
        console.error("Error approving change request:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Reject change request
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/change-requests/:requestId/reject",
    attachUser,
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const requestId = parseInt(req.params.requestId);
        const { response } = req.body;

        const changeRequest =
          await storage.getBookingChangeRequestById(requestId);
        if (!changeRequest) {
          return res.status(404).json({ message: "Change request not found" });
        }

        if (changeRequest.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Change request has already been processed" });
        }

        // Update change request status
        await storage.updateBookingChangeRequest(requestId, {
          status: "rejected",
          restaurantResponse: response || "Rejected via admin dashboard",
          respondedAt: new Date(),
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
              managementHash: booking.managementHash,
            },
            {
              requestedDate: changeRequest.requestedDate,
              requestedTime: changeRequest.requestedTime,
              requestedGuestCount: changeRequest.requestedGuestCount,
            },
            response || "Your booking change request has been rejected.",
          );
          console.log(`Rejection email sent to ${booking.customerEmail}`);
        } catch (emailError) {
          console.error("Error sending rejection email:", emailError);
        }

        // Send real-time notification
        broadcastNotification(changeRequest.restaurantId, {
          type: "change_request_rejected",
          changeRequest: { ...changeRequest, status: "rejected" },
          timestamp: new Date().toISOString(),
        });

        res.json({
          message: "Change request rejected successfully",
          changeRequest: { ...changeRequest, status: "rejected" },
        });
      } catch (error) {
        console.error("Error rejecting change request:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Email-based approval route (for clicking links in emails)
  app.get("/booking-change-response/:requestId", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { action, hash } = req.query;

      if (!["approve", "reject"].includes(action as string)) {
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

      const changeRequest =
        await storage.getBookingChangeRequestById(requestId);
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
        action as "approve" | "reject",
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
      if (changeRequest.status !== "pending") {
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
      const updatedRequest = await storage.updateBookingChangeRequest(
        requestId,
        {
          status: action === "approve" ? "approved" : "rejected",
          restaurantResponse: `Processed via email link on ${new Date().toLocaleString()}`,
          processedAt: new Date(),
        },
      );

      if (action === "approve") {
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
          type: "booking_change_approved",
          booking: { ...booking, ...bookingUpdates },
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Send real-time notification for rejection
        broadcastNotification(booking.restaurantId, {
          type: "booking_change_rejected",
          booking: booking,
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString(),
        });
      }

      // Send email notification to customer
      if (emailService) {
        try {
          await emailService.sendChangeRequestResponse(
            booking.customerEmail,
            booking.customerName,
            action === "approve",
            booking,
            changeRequest,
            `Processed via email link on ${new Date().toLocaleString()}`,
          );
          console.log(
            `Change request response email sent to customer: ${action}`,
          );
        } catch (error) {
          console.error("Failed to send change request response email:", error);
        }
      }

      // Return success page
      const actionText = action === "approve" ? "approved" : "rejected";
      const statusColor = action === "approve" ? "#28a745" : "#dc3545";

      return res.send(`
        <html>
          <head>
            <title>Booking Change ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</title>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="width: 60px; height: 60px; border-radius: 50%; background-color: ${statusColor}; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px; font-weight: bold;">${action === "approve" ? "✓" : "✗"}</span>
              </div>
              <h2 style="color: ${statusColor}; margin-bottom: 20px;">Change Request ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                The booking change request for <strong>${booking.customerName}</strong> has been successfully ${actionText}.
              </p>
              ${
                action === "approve"
                  ? `
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: left;">
                  <h4 style="margin: 0 0 10px 0; color: #333;">Updated Booking Details:</h4>
                  <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${changeRequest.requestedDate ? new Date(changeRequest.requestedDate).toLocaleDateString() : "No change"}</p>
                  <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${changeRequest.requestedTime || "No change"}</p>
                  <p style="margin: 5px 0; color: #666;"><strong>Party Size:</strong> ${changeRequest.requestedGuestCount || "No change"}</p>
                </div>
              `
                  : ""
              }
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

      if (!["approve", "reject"].includes(action)) {
        return res
          .status(400)
          .json({ message: "Invalid action. Must be 'approve' or 'reject'" });
      }

      const changeRequest =
        await storage.getBookingChangeRequestById(requestId);
      if (!changeRequest) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const booking = await storage.getBookingById(changeRequest.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update change request status
      const updatedRequest = await storage.updateBookingChangeRequest(
        requestId,
        {
          status: action === "approve" ? "approved" : "rejected",
          restaurantResponse: response || null,
          processedAt: new Date(),
        },
      );

      if (action === "approve") {
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

        const updatedBooking = await storage.updateBooking(
          changeRequest.bookingId,
          bookingUpdates,
        );

        // Send real-time notification to restaurant
        broadcastNotification(booking.restaurantId, {
          type: "booking_change_approved",
          booking: updatedBooking,
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Send real-time notification for rejection
        broadcastNotification(booking.restaurantId, {
          type: "booking_change_rejected",
          booking: booking,
          changeRequest: updatedRequest,
          timestamp: new Date().toISOString(),
        });
      }

      // Send email notification to customer
      if (emailService) {
        try {
          await emailService.sendChangeRequestResponse(
            changeRequest.customerEmail,
            changeRequest.customerName,
            action === "approve",
            booking,
            changeRequest,
            response,
          );
          console.log(
            `Change request response email sent to customer: ${action}`,
          );
        } catch (error) {
          console.error("Failed to send change request response email:", error);
        }
      }

      res.json({
        message: `Change request ${action}d successfully`,
        changeRequest: updatedRequest,
      });
    } catch (error) {
      console.error("Error processing change request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Statistics routes (read-only data aggregation)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/statistics",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { startDate, endDate } = req.query;

        // Get bookings for the date range
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const customers = await storage.getCustomersByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        // Filter by tenantId for security
        const tenantBookings = bookings.filter(
          (booking) => booking.tenantId === tenantId,
        );
        const tenantCustomers = customers.filter(
          (customer) => customer.tenantId === tenantId,
        );
        const tenantTables = tables.filter(
          (table) => table.tenantId === tenantId,
        );

        // Calculate current month's bookings for monthly revenue
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyBookings = tenantBookings.filter((booking) => {
          const bookingDate = new Date(booking.bookingDate);
          return (
            bookingDate.getMonth() === currentMonth &&
            bookingDate.getFullYear() === currentYear
          );
        });

        // Calculate today's bookings
        const today = new Date().toISOString().split("T")[0];
        const todayBookings = tenantBookings.filter((booking) => {
          const bookingDate = new Date(booking.bookingDate)
            .toISOString()
            .split("T")[0];
          return bookingDate === today;
        });

        // Calculate current occupancy (bookings currently in progress)
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const currentOccupancy = todayBookings.filter((booking) => {
          if (!booking.startTime) return false;
          // If no end time, assume 2 hour duration
          const endTime =
            booking.endTime ||
            (() => {
              const [hours, minutes] = booking.startTime.split(":");
              const endHours = (parseInt(hours) + 2) % 24;
              return `${endHours.toString().padStart(2, "0")}:${minutes}`;
            })();

          const startParts = booking.startTime.split(":");
          const endParts = endTime.split(":");
          const startTimeMinutes =
            parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          const endTimeMinutes =
            parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
          return (
            currentTime >= startTimeMinutes &&
            currentTime <= endTimeMinutes &&
            booking.status === "confirmed"
          );
        }).length;

        // Calculate statistics
        const totalBookings = tenantBookings.length;
        const totalCustomers = tenantCustomers.length;
        const totalTables = tenantTables.length;

        // Group bookings by status
        const bookingsByStatus = tenantBookings.reduce((acc: any, booking) => {
          const status = booking.status || "confirmed";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        // Calculate no-shows (past bookings with pending status)
        const noShows = tenantBookings.filter((booking) => {
          if (!booking.startTime) return false;
          // If no end time, assume 2 hour duration
          const endTime =
            booking.endTime ||
            (() => {
              const [hours, minutes] = booking.startTime.split(":");
              const endHours = (parseInt(hours) + 2) % 24;
              return `${endHours.toString().padStart(2, "0")}:${minutes}`;
            })();

          const bookingDate = new Date(booking.bookingDate);
          const endTimeParts = endTime.split(":");
          const bookingEndTime = new Date(bookingDate);
          bookingEndTime.setHours(
            parseInt(endTimeParts[0]),
            parseInt(endTimeParts[1]),
          );
          return bookingEndTime < now && booking.status === "pending";
        }).length;

        // Calculate table utilization (percentage of tables used in current month)
        const uniqueTablesUsed = new Set(
          monthlyBookings.map((booking) => booking.tableId).filter(Boolean),
        ).size;
        const tableUtilization =
          totalTables > 0 ? (uniqueTablesUsed / totalTables) * 100 : 0;

        // Calculate revenue based on guest count (estimate $25 per guest)
        const avgPerGuest = 25;
        const monthlyRevenue = monthlyBookings.reduce((total, booking) => {
          return total + booking.guestCount * avgPerGuest;
        }, 0);

        // Calculate average bookings per day for current month
        const daysInMonth = new Date(
          currentYear,
          currentMonth + 1,
          0,
        ).getDate();
        const avgBookingsPerDay = monthlyBookings.length / daysInMonth;

        // Calculate peak hours analysis
        const hourlyBookings = tenantBookings.reduce((acc: any, booking) => {
          if (!booking.startTime) return acc;
          const hour = parseInt(booking.startTime.split(":")[0]);
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {});

        const peakHour = Object.entries(hourlyBookings).reduce(
          (peak: any, [hour, count]: [string, any]) => {
            return count > (peak.count || 0)
              ? { hour: parseInt(hour), count }
              : peak;
          },
          {},
        );

        const statistics = {
          totalBookings: totalBookings || 0,
          todayBookings: todayBookings.length || 0,
          currentOccupancy: currentOccupancy || 0,
          totalCustomers: totalCustomers || 0,
          noShows: noShows || 0,
          tableUtilization: Math.min(
            Math.round(tableUtilization * 10) / 10,
            100,
          ),
          monthlyRevenue: monthlyRevenue || 0,
          bookingsByStatus: bookingsByStatus || {
            confirmed: 0,
            pending: 0,
            cancelled: 0,
          },
          avgBookingsPerDay: Math.round(avgBookingsPerDay * 10) / 10 || 0,
          monthlyBookings: monthlyBookings.length || 0,
          totalTables: totalTables || 0,
          peakHour: peakHour.hour || 19,
          peakHourBookings: peakHour.count || 0,
          occupancyRate:
            totalTables > 0
              ? Math.round((currentOccupancy / totalTables) * 100)
              : 0,
        };

        res.json(statistics);
      } catch (error) {
        console.error("Statistics calculation error:", error);
        res.status(500).json({ message: "Failed to calculate statistics" });
      }
    },
  );

  // Enhanced conflict detection and resolution endpoint
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        // Get all bookings and tables for conflict analysis
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        // Filter by tenant
        const tenantBookings = bookings.filter(
          (booking) => booking.tenantId === tenantId,
        );
        const tenantTables = tables.filter(
          (table) => table.tenant_id === tenantId,
        );

        // Detect conflicts
        const conflicts = [];
        const conflictId = Date.now().toString();

        // Check for table double bookings
        const tableBookings = {};
        tenantBookings.forEach((booking) => {
          if (!booking.tableId || !booking.startTime) return;

          // Normalize date format for comparison
          const bookingDate = new Date(booking.bookingDate)
            .toISOString()
            .split("T")[0];
          const key = `${booking.tableId}-${bookingDate}-${booking.startTime}`;
          if (!tableBookings[key]) {
            tableBookings[key] = [];
          }
          tableBookings[key].push(booking);
        });

        // Find double bookings
        Object.entries(tableBookings).forEach(([key, bookingsAtSlot]) => {
          if (bookingsAtSlot.length > 1) {
            // Find alternative tables for conflicting bookings
            const conflictedBookings = bookingsAtSlot as any[];
            const suggestedResolutions = [];

            conflictedBookings.slice(1).forEach((booking) => {
              // Find available tables with suitable capacity (excluding current table)
              const suitableTables = tenantTables.filter((table) => {
                // Must have sufficient capacity
                if (table.capacity < booking.guestCount) return false;
                // Don't reassign to same table
                if (table.id === booking.tableId) return false;

                // Check if table is available at this time slot
                const bookingDate = new Date(booking.bookingDate)
                  .toISOString()
                  .split("T")[0];
                const isTableOccupied = tenantBookings.some((b) => {
                  const bDate = new Date(b.bookingDate)
                    .toISOString()
                    .split("T")[0];
                  return (
                    b.tableId === table.id &&
                    bDate === bookingDate &&
                    b.startTime === booking.startTime &&
                    b.status === "confirmed"
                  );
                });
                return !isTableOccupied;
              });

              if (suitableTables.length > 0) {
                const recommendedTable = suitableTables[0];
                suggestedResolutions.push({
                  id: `resolution-${Date.now()}-${Math.random()}`,
                  type: "reassign_table",
                  description: `Move ${booking.customerName} to Table ${recommendedTable.table_number}`,
                  impact: "low",
                  bookingId: booking.id,
                  originalTableId: booking.tableId,
                  newTableId: recommendedTable.id,
                  newTableNumber: recommendedTable.table_number,
                  estimatedCustomerSatisfaction: 85,
                  autoExecutable: true,
                  cost: { timeMinutes: 1, staffEffort: "minimal" },
                });
              } else {
                // No available tables - suggest time adjustment
                suggestedResolutions.push({
                  id: `resolution-${Date.now()}-${Math.random()}`,
                  type: "adjust_time",
                  description: `Contact ${booking.customerName} to reschedule to next available slot`,
                  impact: "medium",
                  bookingId: booking.id,
                  originalTime: booking.startTime,
                  suggestedTimes: ["19:30", "20:00", "20:30"],
                  estimatedCustomerSatisfaction: 70,
                  autoExecutable: false,
                  cost: { timeMinutes: 5, staffEffort: "moderate" },
                });
              }
            });

            conflicts.push({
              id: `conflict-${conflictId}-${key}`,
              type: "table_double_booking",
              severity: "high",
              bookings: conflictedBookings.map((b) => ({
                id: b.id,
                customerName: b.customerName,
                customerEmail: b.customerEmail,
                customerPhone: b.customerPhone,
                guestCount: b.guestCount,
                bookingDate: b.bookingDate,
                startTime: b.startTime,
                endTime: b.endTime,
                tableId: b.tableId,
                status: b.status,
              })),
              suggestedResolutions,
              autoResolvable: suggestedResolutions.some(
                (r) => r.autoExecutable,
              ),
              createdAt: new Date().toISOString(),
            });
          }
        });

        // Check for capacity exceeded (more guests than table capacity)
        tenantBookings.forEach((booking) => {
          if (!booking.tableId) return;

          const table = tenantTables.find((t) => t.id === booking.tableId);
          if (table && booking.guestCount > table.capacity) {
            // Find larger tables
            const largerTables = tenantTables.filter((t) => {
              if (t.capacity < booking.guestCount) return false;
              if (t.id === booking.tableId) return false; // Exclude current table

              // Check availability at booking time
              const bookingDate = new Date(booking.bookingDate)
                .toISOString()
                .split("T")[0];
              const hasConflict = tenantBookings.some((b) => {
                const bDate = new Date(b.bookingDate)
                  .toISOString()
                  .split("T")[0];
                return (
                  b.tableId === t.id &&
                  bDate === bookingDate &&
                  b.startTime === booking.startTime &&
                  b.id !== booking.id
                );
              });
              return !hasConflict;
            });

            const suggestedResolutions = [];
            if (largerTables.length > 0) {
              const recommendedTable = largerTables[0];
              suggestedResolutions.push({
                id: `resolution-${Date.now()}-${Math.random()}`,
                type: "upgrade_table",
                description: `Upgrade ${booking.customerName} to larger Table ${recommendedTable.table_number}`,
                impact: "low",
                bookingId: booking.id,
                originalTableId: booking.tableId,
                newTableId: recommendedTable.id,
                newTableNumber: recommendedTable.table_number,
                estimatedCustomerSatisfaction: 95,
                autoExecutable: true,
                cost: { timeMinutes: 1, staffEffort: "minimal" },
              });
            }

            conflicts.push({
              id: `conflict-${conflictId}-capacity-${booking.id}`,
              type: "capacity_exceeded",
              severity: "medium",
              bookings: [
                {
                  id: booking.id,
                  customerName: booking.customerName,
                  customerEmail: booking.customerEmail,
                  customerPhone: booking.customerPhone,
                  guestCount: booking.guestCount,
                  bookingDate: booking.bookingDate,
                  startTime: booking.startTime,
                  endTime: booking.endTime,
                  tableId: booking.tableId,
                  status: booking.status,
                },
              ],
              suggestedResolutions,
              autoResolvable: suggestedResolutions.length > 0,
              createdAt: new Date().toISOString(),
            });
          }
        });

        res.json(conflicts);
      } catch (error) {
        console.error("Conflict detection error:", error);
        res.status(500).json({ message: "Failed to detect conflicts" });
      }
    },
  );

  // Auto-resolve conflict endpoint (simplified approach)
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/auto-resolve",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { bookingId, newTableId, resolutionType } = req.body;

        if (!bookingId || !newTableId || !resolutionType) {
          return res
            .status(400)
            .json({
              message:
                "Missing required fields: bookingId, newTableId, resolutionType",
            });
        }

        // Get the booking to be moved
        const booking = await storage.getBookingById(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify the new table exists and has capacity
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const newTable = tables.find(
          (t) => t.id === newTableId && t.tenant_id === tenantId,
        );
        if (!newTable) {
          return res.status(404).json({ message: "Target table not found" });
        }

        if (newTable.capacity < booking.guestCount) {
          return res
            .status(400)
            .json({ message: "Target table capacity insufficient" });
        }

        // Check if target table is available at the booking time
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const bookingDate = new Date(booking.bookingDate)
          .toISOString()
          .split("T")[0];
        const conflictingBookings = bookings.filter((b) => {
          const bDate = new Date(b.bookingDate).toISOString().split("T")[0];
          return (
            b.tableId === newTableId &&
            bDate === bookingDate &&
            b.startTime === booking.startTime &&
            b.id !== bookingId &&
            b.status === "confirmed"
          );
        });

        if (conflictingBookings.length > 0) {
          return res
            .status(400)
            .json({
              message: "Target table is not available at the requested time",
            });
        }

        // Update the booking with new table assignment
        const updatedBooking = {
          ...booking,
          tableId: newTableId,
        };

        await storage.updateBooking(bookingId, updatedBooking);

        // Get original table info for notification
        const originalTable = tables.find((t) => t.id === booking.tableId);

        // Create notification for staff
        const notification = {
          restaurantId,
          tenantId,
          type: "conflict_resolved",
          title: "Conflict Auto-Resolved",
          message: `${booking.customerName}'s booking moved from Table ${originalTable?.table_number || booking.tableId} to Table ${newTable.table_number}`,
          isRead: false,
          priority: "medium",
          createdAt: new Date(),
          metadata: {
            bookingId,
            originalTable: booking.tableId,
            newTable: newTableId,
            resolutionType,
          },
        };

        await storage.createNotification(notification);
        broadcastNotification(restaurantId, notification);

        res.json({
          success: true,
          message: "Conflict resolved successfully",
          resolutionApplied: `Moved ${booking.customerName} to Table ${newTable.table_number}`,
          bookingId,
          newTableId,
          newTableNumber: newTable.table_number,
        });
      } catch (error) {
        console.error("Auto-resolve conflict error:", error);
        res.status(500).json({ message: "Failed to resolve conflict" });
      }
    },
  );

  // Manual resolve conflict endpoint
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/:conflictId/resolve",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { conflictId } = req.params;
        const { resolutionType, bookingId, newTableId, newTime, notes } =
          req.body;

        const booking = await storage.getBookingById(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        let updatedBooking = { ...booking };
        let resolutionDescription = "";

        if (resolutionType === "reassign_table" && newTableId) {
          updatedBooking.tableId = newTableId;
          resolutionDescription = `Moved to Table ${newTableId}`;
        } else if (resolutionType === "adjust_time" && newTime) {
          updatedBooking.startTime = newTime;
          resolutionDescription = `Rescheduled to ${newTime}`;
        }

        await storage.updateBooking(bookingId, updatedBooking);

        // Create resolution notification
        const notification = {
          restaurantId,
          tenantId,
          type: "conflict_resolved",
          title: "Conflict Manually Resolved",
          message: `${booking.customerName}'s booking: ${resolutionDescription}`,
          isRead: false,
          priority: "medium",
          createdAt: new Date(),
          metadata: {
            bookingId,
            resolutionType,
            notes: notes || "",
          },
        };

        await storage.createNotification(notification);
        broadcastNotification(restaurantId, notification);

        res.json({
          success: true,
          message: "Conflict resolved manually",
          resolutionApplied: resolutionDescription,
        });
      } catch (error) {
        console.error("Manual resolve conflict error:", error);
        res
          .status(500)
          .json({ message: "Failed to resolve conflict manually" });
      }
    },
  );



  // Webhook Management Routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/webhooks",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check if webhooks integration is enabled
        const webhooksConfig = await storage.getIntegrationConfiguration(
          restaurantId,
          "webhooks",
        );
        if (!webhooksConfig?.isEnabled) {
          return res
            .status(403)
            .json({ message: "Webhooks integration is not enabled" });
        }

        const webhooks = await storage.getWebhooksByRestaurant(restaurantId);
        res.json(webhooks);
      } catch (error) {
        console.error("Error fetching webhooks:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/webhooks",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { webhooks } = req.body;

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check if webhooks integration is enabled
        const webhooksConfig = await storage.getIntegrationConfiguration(
          restaurantId,
          "webhooks",
        );
        if (!webhooksConfig?.isEnabled) {
          return res
            .status(403)
            .json({
              message:
                "Webhooks integration is not enabled. Please enable it first in the integrations settings.",
            });
        }

        if (!Array.isArray(webhooks)) {
          return res.status(400).json({ message: "Webhooks must be an array" });
        }

        const savedWebhooks = await storage.saveWebhooks(
          restaurantId,
          tenantId,
          webhooks,
        );
        res.json(savedWebhooks);
      } catch (error) {
        console.error("Error saving webhooks:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Integration Configuration Routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/integrations",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const configurations =
          await storage.getIntegrationConfigurationsByRestaurant(restaurantId);
        res.json(configurations);
      } catch (error) {
        console.error("Error fetching integration configurations:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const integrationId = req.params.integrationId;
        const { isEnabled, configuration } = req.body;

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const savedConfiguration =
          await storage.createOrUpdateIntegrationConfiguration(
            restaurantId,
            tenantId,
            integrationId,
            isEnabled,
            configuration || {},
          );

        res.json(savedConfiguration);
      } catch (error) {
        console.error("Error saving integration configuration:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Test integration connection
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId/test",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const integrationId = req.params.integrationId;
        const { configuration } = req.body;

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        let testResult = false;
        let errorMessage = "";

        try {
          // Test different integrations based on their API requirements
          switch (integrationId) {
            case "mailchimp":
              if (configuration.apiKey) {
                const response = await fetch(
                  `https://us1.api.mailchimp.com/3.0/`,
                  {
                    headers: {
                      Authorization: `Bearer ${configuration.apiKey}`,
                      "Content-Type": "application/json",
                    },
                  },
                );
                testResult = response.ok;
                if (!testResult)
                  errorMessage = "Invalid API key or server connection failed";
              } else {
                errorMessage = "API key is required";
              }
              break;

            case "google":
              if (configuration.accessToken) {
                const response = await fetch(
                  `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${configuration.accessToken}`,
                );
                testResult = response.ok;
                if (!testResult) errorMessage = "Invalid access token";
              } else {
                errorMessage = "Access token is required";
              }
              break;

            case "klaviyo":
              if (configuration.apiKey) {
                const response = await fetch(
                  `https://a.klaviyo.com/api/accounts/`,
                  {
                    headers: {
                      Authorization: `Klaviyo-API-Key ${configuration.apiKey}`,
                      revision: "2024-10-15",
                      "Content-Type": "application/json",
                    },
                  },
                );
                testResult = response.ok;
                if (!testResult)
                  errorMessage = "Invalid API key or server connection failed";
              } else {
                errorMessage = "API key is required";
              }
              break;

            case "webhooks":
              if (configuration.webhookUrl) {
                const response = await fetch(configuration.webhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    test: true,
                    timestamp: new Date().toISOString(),
                  }),
                });
                testResult = response.ok;
                if (!testResult)
                  errorMessage = "Webhook URL unreachable or returned error";
              } else {
                errorMessage = "Webhook URL is required";
              }
              break;

            default:
              // For integrations without API testing capability
              testResult = true;
              break;
          }
        } catch (error) {
          testResult = false;
          errorMessage = "Connection test failed: " + (error as Error).message;
        }

        res.json({
          success: testResult,
          integrationId,
          message: testResult ? "Connection successful" : errorMessage,
        });
      } catch (error) {
        console.error("Error testing integration connection:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Google My Business - Reserve with Google
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/google/profile",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Validate business profile completeness
        const validation = {
          isComplete: true,
          missingFields: [] as string[],
          warnings: [] as string[],
        };

        const requiredFields = [
          { field: "name", value: restaurant.name, label: "Restaurant Name" },
          { field: "address", value: restaurant.address, label: "Address" },
          { field: "phone", value: restaurant.phone, label: "Phone Number" },
        ];

        const recommendedFields = [
          { field: "website", value: restaurant.website, label: "Website" },
          { field: "email", value: restaurant.email, label: "Email" },
          {
            field: "description",
            value: restaurant.description,
            label: "Description",
          },
        ];

        requiredFields.forEach(({ field, value, label }) => {
          if (!value || value.trim() === "") {
            validation.missingFields.push(label);
            validation.isComplete = false;
          }
        });

        recommendedFields.forEach(({ field, value, label }) => {
          if (!value || value.trim() === "") {
            validation.warnings.push(
              `${label} is recommended for better Google matching`,
            );
          }
        });

        // Check if Google integration is already activated
        const googleIntegration =
          await storage.getIntegrationByRestaurantAndType(
            restaurantId,
            "google",
          );
        let integrationStatus = "inactive";

        if (googleIntegration && googleIntegration.isEnabled) {
          integrationStatus = validation.isComplete
            ? "active"
            : "pending_profile";
        } else if (validation.isComplete) {
          integrationStatus = "ready_to_activate";
        }

        // Generate booking URL
        const baseUrl =
          process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
        const bookingUrl = `${baseUrl}/guest-booking/${tenantId}/${restaurantId}?source=google`;

        res.json({
          restaurant: {
            name: restaurant.name,
            address: restaurant.address,
            phone: restaurant.phone,
            website: restaurant.website,
            email: restaurant.email,
            description: restaurant.description,
          },
          validation,
          bookingUrl,
          googleIntegrationStatus: integrationStatus,
          isIntegrationEnabled: googleIntegration?.isEnabled || false,
        });
      } catch (error) {
        console.error("Error fetching Google profile:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/google/activate",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check if Google integration is already activated
        const existingIntegration =
          await storage.getIntegrationByRestaurantAndType(
            restaurantId,
            "google",
          );
        if (existingIntegration && existingIntegration.isEnabled) {
          return res.json({
            success: true,
            message: "Reserve with Google is already activated",
            status: "active",
            alreadyActive: true,
          });
        }

        // Validate required fields before activation
        const requiredFields = ["name", "address", "phone"];
        const missingFields = requiredFields.filter(
          (field) => !restaurant[field as keyof typeof restaurant],
        );

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: "Missing required fields for Google integration",
            missingFields,
            requiredFields: ["Restaurant Name", "Address", "Phone Number"],
          });
        }

        // Save or update Google integration configuration
        await storage.createOrUpdateIntegrationConfiguration(
          restaurantId,
          tenantId,
          "google",
          true,
          {
            reserveWithGoogle: true,
            activatedAt: new Date().toISOString(),
            profileData: {
              name: restaurant.name,
              address: restaurant.address,
              phone: restaurant.phone,
              website: restaurant.website,
              email: restaurant.email,
              description: restaurant.description,
            },
          },
        );

        const baseUrl =
          process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
        const bookingUrl = `${baseUrl}/${tenantId}/book/${restaurantId}?source=google`;

        res.json({
          success: true,
          message: "Reserve with Google has been successfully activated",
          bookingUrl,
          status: "active",
        });
      } catch (error) {
        console.error("Error activating Google integration:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Public booking endpoint for Google
  app.get(
    "/api/public/:tenantId/restaurants/:restaurantId/availability",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { date, guests } = req.query;

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check if Google integration is active
        const googleConfig = await storage.getIntegrationConfiguration(
          restaurantId,
          "google",
        );
        if (!googleConfig || !googleConfig.isEnabled) {
          return res
            .status(403)
            .json({
              message: "Google booking not enabled for this restaurant",
            });
        }

        // Get available time slots for the date
        const availableTimes = await storage.getAvailableTimeSlots(
          restaurantId,
          date as string,
          parseInt(guests as string) || 2,
        );

        res.json({
          restaurant: {
            name: restaurant.name,
            address: restaurant.address,
            phone: restaurant.phone,
          },
          date,
          guests,
          availableTimes: availableTimes.map((time) => ({
            time,
            available: true,
          })),
        });
      } catch (error) {
        console.error("Error fetching public availability:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const integrationId = req.params.integrationId;

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const configuration = await storage.getIntegrationConfiguration(
          restaurantId,
          integrationId,
        );
        if (!configuration) {
          return res
            .status(404)
            .json({ message: "Integration configuration not found" });
        }

        res.json(configuration);
      } catch (error) {
        console.error("Error fetching integration configuration:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/integrations/:integrationId",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const integrationId = req.params.integrationId;

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const deleted = await storage.deleteIntegrationConfiguration(
          restaurantId,
          integrationId,
        );
        if (!deleted) {
          return res
            .status(404)
            .json({ message: "Integration configuration not found" });
        }

        res.json({ message: "Integration configuration deleted successfully" });
      } catch (error) {
        console.error("Error deleting integration configuration:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Google Calendar Integration Routes
  app.get(
    "/api/google-calendar/auth-url",
    async (req, res) => {
      try {
        const authUrl = await googleCalendarService.getAuthUrl();
        res.json({ authUrl });
      } catch (error) {
        console.error('Error generating Google Calendar auth URL:', error);
        res.status(500).json({ message: "Failed to generate authentication URL" });
      }
    }
  );

  app.post(
    "/api/google-calendar/auth-callback",
    async (req, res) => {
      try {
        const { code } = req.body;
        if (!code) {
          return res.status(400).json({ message: "Authorization code is required" });
        }

        const tokens = await googleCalendarService.handleAuthCallback(code);
        res.json({ 
          message: "Google Calendar authentication successful",
          tokens: {
            access_token: tokens.access_token ? "***" : null,
            refresh_token: tokens.refresh_token ? "***" : null,
            expiry_date: tokens.expiry_date
          }
        });
      } catch (error) {
        console.error('Error handling Google Calendar auth callback:', error);
        res.status(500).json({ message: "Authentication failed" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/google-calendar/sync",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Perform full calendar sync
        await googleCalendarService.fullSync(restaurantId, tenantId);
        
        res.json({ 
          message: "Google Calendar sync completed successfully",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error syncing with Google Calendar:', error);
        res.status(500).json({ 
          message: "Calendar sync failed",
          error: error.message 
        });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/google-calendar/sync-opening-hours",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        await googleCalendarService.syncOpeningHours(restaurantId, tenantId);
        
        res.json({ 
          message: "Opening hours synced to Google Calendar successfully",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error syncing opening hours to Google Calendar:', error);
        res.status(500).json({ 
          message: "Opening hours sync failed",
          error: error.message 
        });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/google-calendar/sync-special-periods",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        await googleCalendarService.syncSpecialPeriods(restaurantId);
        
        res.json({ 
          message: "Special periods synced to Google Calendar successfully",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error syncing special periods to Google Calendar:', error);
        res.status(500).json({ 
          message: "Special periods sync failed",
          error: error.message 
        });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/google-calendar/sync-cutoff-times",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        await googleCalendarService.syncCutOffTimes(restaurantId);
        
        res.json({ 
          message: "Cut-off times synced to Google Calendar successfully",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error syncing cut-off times to Google Calendar:', error);
        res.status(500).json({ 
          message: "Cut-off times sync failed",
          error: error.message 
        });
      }
    }
  );

  // Generate Meta install link
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/meta-install-link",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        if (isNaN(restaurantId) || isNaN(tenantId)) {
          return res
            .status(400)
            .json({ message: "Invalid restaurant ID or tenant ID" });
        }

        // Verify restaurant belongs to tenant
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check if Facebook credentials are configured
        const metaConfig = await storage.getIntegrationConfiguration(
          restaurantId,
          "meta",
        );
        let facebookAppId = process.env.FACEBOOK_APP_ID;
        let facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

        if (metaConfig && metaConfig.configuration) {
          const config =
            typeof metaConfig.configuration === "string"
              ? JSON.parse(metaConfig.configuration)
              : metaConfig.configuration;

          if (config.facebookAppId) {
            facebookAppId = config.facebookAppId;
          }
          if (config.facebookAppSecret) {
            facebookAppSecret = config.facebookAppSecret;
          }
        }

        if (
          !facebookAppId ||
          !facebookAppSecret ||
          facebookAppId === "YOUR_FACEBOOK_APP_ID"
        ) {
          return res.status(400).json({
            message:
              "Facebook App ID and App Secret are required to generate install link. Please configure them in the integration settings.",
          });
        }

        const baseUrl =
          process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : req.protocol + "://" + req.get("host");

        const callbackUrl = `${baseUrl}/api/meta-callback`;

        const installLink = await metaInstallService.generateInstallLink({
          restaurantId,
          tenantId,
          restaurantName: restaurant.name,
          callbackUrl,
        });

        res.json({
          installLinkId: installLink.id,
          installUrl: metaInstallService.getInstallLinkUrl(installLink.id),
          facebookAuthUrl: installLink.facebookAuthUrl,
          expiresAt: installLink.expiresAt,
        });
      } catch (error) {
        console.error("Error generating Meta install link:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Handle Meta install link access
  app.get("/api/meta-install-link/:linkId", async (req, res) => {
    try {
      const linkId = req.params.linkId;
      const installLink = metaInstallService.getInstallLink(linkId);

      if (!installLink) {
        return res.status(404).json({
          code: 404,
          message: "ERROR_MESSAGE_META_INSTALL_LINK_NOT_FOUND",
          statusCode: 404,
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

      res.setHeader("Content-Type", "text/html");
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
          error: error,
        });
      }

      if (!code || !state) {
        return res.status(400).json({
          message: "Missing required parameters",
        });
      }

      const result = await metaInstallService.handleCallback(
        code as string,
        state as string,
      );

      if (!result.success) {
        return res.status(400).json({
          message: result.error || "Failed to process Meta integration",
        });
      }

      // Redirect to success page
      const baseUrl =
        process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : req.protocol + "://" + req.get("host");

      const successUrl = `${baseUrl}/${result.data.tenantId}/integrations/meta?success=true`;
      res.redirect(successUrl);
    } catch (error) {
      console.error("Error handling Meta callback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public API endpoints for guest booking

  // Get public restaurant information
  app.get("/api/restaurants/:restaurantId/public", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);

      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Use restaurant's direct guestBookingEnabled property
      const guestBookingEnabled = restaurant.guestBookingEnabled || false;

      // Return only public information
      const publicInfo = {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        description: restaurant.description,
        cuisine: restaurant.cuisine,
        priceRange: restaurant.priceRange,
        websiteUrl: restaurant.websiteUrl,
        guestBookingEnabled,
      };

      res.json(publicInfo);
    } catch (error) {
      console.error("Error fetching public restaurant info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get public available time slots
  app.get(
    "/api/restaurants/:restaurantId/available-slots",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const { date, guests } = req.query;

        if (isNaN(restaurantId)) {
          return res.status(400).json({ message: "Invalid restaurant ID" });
        }

        if (!date) {
          return res
            .status(400)
            .json({ message: "Date parameter is required" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const guestCount = parseInt(guests as string) || 2;
        const targetDate = new Date(date as string);
        const dateStr = targetDate.toISOString().split("T")[0];

        // Get tables and existing bookings
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const existingBookings = await storage.getBookingsByDate(
          restaurantId,
          dateStr,
        );

        // Check for special periods that apply to this date
        const specialPeriods = await storage.getSpecialPeriodsByRestaurant(restaurantId);
        const activeSpecialPeriod = specialPeriods.find(period => {
          const periodStart = new Date(period.startDate);
          const periodEnd = new Date(period.endDate);
          const checkDate = new Date(dateStr);
          return checkDate >= periodStart && checkDate <= periodEnd;
        });

        // Special periods completely override opening hours for specific dates
        let openTime = null;
        let closeTime = null;
        
        if (activeSpecialPeriod) {
          // Special period exists for this date - completely disable opening hours
          console.log(`Special period found for ${dateStr} - opening hours disabled`);
          
          if (activeSpecialPeriod.isOpen && activeSpecialPeriod.openTime && activeSpecialPeriod.closeTime) {
            openTime = activeSpecialPeriod.openTime;
            closeTime = activeSpecialPeriod.closeTime;
            console.log(`Using special period hours: ${openTime} - ${closeTime}`);
          } else {
            // Special period exists but restaurant is closed for this period
            console.log(`Special period: Restaurant closed`);
            return res.json({ slots: [] });
          }
        } else {
          // No special period - use regular opening hours
          console.log(`No special period for ${dateStr}, using regular opening hours`);
          
          try {
            const openingHours = await storage.getOpeningHoursByRestaurant(restaurantId);
            
            if (openingHours && openingHours.length > 0) {
              const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
              const dayOpeningHours = openingHours.find(oh => oh.dayOfWeek === targetDayOfWeek);
              
              if (dayOpeningHours && dayOpeningHours.isOpen && dayOpeningHours.openTime && dayOpeningHours.closeTime) {
                openTime = dayOpeningHours.openTime;
                closeTime = dayOpeningHours.closeTime;
                console.log(`Regular opening hours: ${openTime} - ${closeTime}`);
              } else {
                console.log(`Restaurant closed on day ${targetDayOfWeek}`);
                return res.json({ slots: [] });
              }
            } else {
              console.log(`No opening hours configured`);
              return res.json({ slots: [] });
            }
          } catch (error) {
            console.error("Error fetching opening hours:", error);
            return res.json({ slots: [] });
          }
        }

        // Helper function to convert time string to minutes
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        // Helper function to convert minutes to time string
        const minutesToTime = (minutes) => {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
        };

        // Generate time slots based on operating hours
        const openMinutes = timeToMinutes(openTime);
        const closeMinutes = timeToMinutes(closeTime);
        const timeSlots = [];
        
        for (let minutes = openMinutes; minutes < closeMinutes; minutes += 15) {
          const time = minutesToTime(minutes);
          timeSlots.push(time);
        }

        // Filter available slots
        const availableSlots = timeSlots.filter((timeStr) => {
          // Check if any table is available for this time slot
          const hasAvailableTable = tables.some((table) => {
            if (table.capacity < guestCount) return false;

            // Check for conflicts with existing bookings
            const hasConflict = existingBookings.some((booking) => {
              if (
                booking.tableId !== table.id ||
                booking.status === "cancelled"
              )
                return false;

              const bookingStart =
                parseInt(booking.startTime.split(":")[0]) * 60 +
                parseInt(booking.startTime.split(":")[1]);
              const bookingEnd = booking.endTime
                ? parseInt(booking.endTime.split(":")[0]) * 60 +
                  parseInt(booking.endTime.split(":")[1])
                : bookingStart + 120; // Default 2 hours

              const slotStart =
                parseInt(timeStr.split(":")[0]) * 60 +
                parseInt(timeStr.split(":")[1]);
              const slotEnd = slotStart + 120; // 2 hour booking

              // Add buffer time (30 minutes)
              const buffer = 30;
              return (
                slotStart - buffer < bookingEnd &&
                bookingStart < slotEnd + buffer
              );
            });

            return !hasConflict;
          });

          return hasAvailableTable;
        });

        res.json({ slots: availableSlots });
      } catch (error) {
        console.error("Error fetching available slots:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get public opening hours
  app.get(
    "/api/restaurants/:restaurantId/opening-hours/public",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);

        if (isNaN(restaurantId)) {
          return res.status(400).json({ message: "Invalid restaurant ID" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const openingHours =
          await storage.getOpeningHoursByRestaurant(restaurantId);
        res.json(openingHours);
      } catch (error) {
        console.error("Error fetching opening hours:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get public special periods
  app.get(
    "/api/restaurants/:restaurantId/special-periods/public",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);

        if (isNaN(restaurantId)) {
          return res.status(400).json({ message: "Invalid restaurant ID" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const specialPeriods =
          await storage.getSpecialPeriodsByRestaurant(restaurantId);
        res.json(specialPeriods);
      } catch (error) {
        console.error("Error fetching special periods:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Create public booking (for guest booking form)
  app.post("/api/restaurants/:restaurantId/bookings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);

      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const {
        customerName,
        customerEmail,
        customerPhone,
        guestCount,
        bookingDate,
        comment,
        source = "website",
        status = "confirmed",
        tenantId,
      } = req.body;

      if (
        !customerName ||
        !customerEmail ||
        !guestCount ||
        !bookingDate ||
        !tenantId
      ) {
        return res.status(400).json({
          message:
            "Missing required fields: customerName, customerEmail, guestCount, bookingDate, tenantId",
        });
      }

      // Parse booking date and extract time
      const bookingDateTime = new Date(bookingDate);
      const bookingTime = `${bookingDateTime.getHours().toString().padStart(2, "0")}:${bookingDateTime.getMinutes().toString().padStart(2, "0")}`;
      const dateStr = bookingDateTime.toISOString().split("T")[0];

      // Get available tables for this time slot
      const tables = await storage.getTablesByRestaurant(restaurantId);
      const existingBookings = await storage.getBookingsByDate(
        restaurantId,
        dateStr,
      );

      // Find the best available table
      let assignedTableId = null;
      const availableTables = tables
        .filter((table) => {
          if (table.capacity < guestCount) return false;

          // Check for conflicts with existing bookings
          const hasConflict = existingBookings.some((booking) => {
            if (booking.tableId !== table.id || booking.status === "cancelled")
              return false;

            const bookingStart =
              parseInt(booking.startTime.split(":")[0]) * 60 +
              parseInt(booking.startTime.split(":")[1]);
            const bookingEnd = booking.endTime
              ? parseInt(booking.endTime.split(":")[0]) * 60 +
                parseInt(booking.endTime.split(":")[1])
              : bookingStart + 120; // Default 2 hours

            const slotStart =
              parseInt(bookingTime.split(":")[0]) * 60 +
              parseInt(bookingTime.split(":")[1]);
            const slotEnd = slotStart + 120; // 2 hour booking

            // Add buffer time (30 minutes)
            const buffer = 30;
            return (
              slotStart - buffer < bookingEnd && bookingStart < slotEnd + buffer
            );
          });

          return !hasConflict;
        })
        .sort((a, b) => a.capacity - b.capacity); // Sort by capacity (smallest suitable first)

      if (availableTables.length === 0) {
        return res.status(400).json({
          message: `No tables available for ${guestCount} guests at ${bookingTime} on ${dateStr}. Please try a different time or date.`,
        });
      }

      assignedTableId = availableTables[0].id;

      // Create the booking
      const newBooking = await storage.createBooking({
        restaurantId,
        tenantId,
        tableId: assignedTableId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        guestCount,
        bookingDate: bookingDateTime,
        startTime: bookingTime,
        endTime: `${(bookingDateTime.getHours() + 2).toString().padStart(2, "0")}:${bookingDateTime.getMinutes().toString().padStart(2, "0")}`,
        comment: comment || null,
        source,
        status,
        createdAt: new Date(),
      });

      res.status(201).json({
        id: newBooking.id,
        message: "Booking created successfully",
        booking: newBooking,
        tableNumber: availableTables[0].tableNumber,
      });
    } catch (error) {
      console.error("Error creating public booking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get calendar availability data for a specific date (includes closed periods)
  app.get(
    "/api/restaurants/:restaurantId/calendar-availability",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const { date, guests } = req.query;

        if (isNaN(restaurantId)) {
          return res.status(400).json({ message: "Invalid restaurant ID" });
        }

        if (!date || !guests) {
          return res
            .status(400)
            .json({ message: "Date and guest count are required" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const bookingDate = new Date(date as string);
        const guestCount = parseInt(guests as string);
        const dateStr = bookingDate.toISOString().split("T")[0];
        const dayOfWeek = bookingDate.getDay();

        // Check special periods first
        const specialPeriods = await storage.getSpecialPeriodsByRestaurant(restaurantId);
        const specialPeriod = specialPeriods.find(
          (sp: any) => dateStr >= sp.startDate && dateStr <= sp.endDate,
        );

        let isOpen = true;
        let openTime = null;
        let closeTime = null;
        let closureReason = null;

        if (specialPeriod) {
          if (!specialPeriod.isOpen) {
            isOpen = false;
            closureReason = specialPeriod.name || "Special closure";
          } else {
            openTime = specialPeriod.openTime;
            closeTime = specialPeriod.closeTime;
          }
        } else {
          // Check regular opening hours
          const openingHours = await storage.getOpeningHoursByRestaurant(restaurantId);
          const dayHours = openingHours.find((oh: any) => oh.dayOfWeek === dayOfWeek);

          if (!dayHours || !dayHours.isOpen) {
            isOpen = false;
            closureReason = "Closed on this day";
          } else {
            openTime = dayHours.openTime;
            closeTime = dayHours.closeTime;
          }
        }

        if (!isOpen) {
          return res.json({
            date: dateStr,
            isOpen: false,
            closureReason,
            availableSlots: [],
            allTimeSlots: [],
            openTime: null,
            closeTime: null
          });
        }

        // Generate all possible time slots within opening hours
        const openTimeMinutes = timeToMinutes(openTime);
        const closeTimeMinutes = timeToMinutes(closeTime);
        const allTimeSlots = [];
        
        for (let minutes = openTimeMinutes; minutes <= closeTimeMinutes - 60; minutes += 30) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
          allTimeSlots.push(timeStr);
        }

        // Get cut-off times and existing bookings
        const cutOffTimes = await storage.getCutOffTimesByRestaurant(restaurantId);
        const cutOffTime = cutOffTimes.find((ct: any) => ct.dayOfWeek === dayOfWeek);
        
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const combinedTables = await storage.getCombinedTablesByRestaurant(restaurantId);
        const suitableTables = tables.filter((table) => table.capacity >= guestCount);
        const suitableCombinedTables = combinedTables.filter((table) => table.capacity >= guestCount);

        if (suitableTables.length === 0 && suitableCombinedTables.length === 0) {
          return res.json({
            date: dateStr,
            isOpen: true,
            closureReason: null,
            availableSlots: [],
            allTimeSlots,
            openTime,
            closeTime,
            noTablesAvailable: true
          });
        }

        const existingBookings = await storage.getBookingsByDate(restaurantId, dateStr);
        const activeBookings = existingBookings.filter((booking) => booking.status !== "cancelled");
        const now = new Date();

        // Filter available slots
        const availableSlots = allTimeSlots.filter((timeStr) => {
          const [hours, mins] = timeStr.split(':').map(Number);
          const minutes = hours * 60 + mins;

          // Apply cut-off time validation
          if (cutOffTime && cutOffTime.cutOffHours > 0) {
            const bookingDateTime = new Date(bookingDate);
            bookingDateTime.setHours(hours, mins, 0, 0);
            const cutOffMilliseconds = cutOffTime.cutOffHours * 60 * 60 * 1000;
            const cutOffDeadline = new Date(bookingDateTime.getTime() - cutOffMilliseconds);

            if (now > cutOffDeadline) return false;
          }

          // Don't allow bookings in the past
          const bookingDateTime = new Date(bookingDate);
          bookingDateTime.setHours(hours, mins, 0, 0);
          if (bookingDateTime <= now) return false;

          // Check if any suitable table is available
          return [...suitableTables, ...suitableCombinedTables].some((table) => {
            const bookingStart = minutes;
            const bookingEnd = minutes + 120;
            const bufferMinutes = 60;

            const hasConflict = activeBookings.some((booking) => {
              if (booking.tableId !== table.id) return false;

              const existingStart = timeToMinutes(booking.startTime);
              const existingEnd = booking.endTime ? timeToMinutes(booking.endTime) : existingStart + 120;

              const requestedStart = bookingStart - bufferMinutes;
              const requestedEnd = bookingEnd + bufferMinutes;
              const existingStartWithBuffer = existingStart - bufferMinutes;
              const existingEndWithBuffer = existingEnd + bufferMinutes;

              return requestedStart < existingEndWithBuffer && existingStartWithBuffer < requestedEnd;
            });

            return !hasConflict;
          });
        });

        res.json({
          date: dateStr,
          isOpen: true,
          closureReason: null,
          availableSlots,
          allTimeSlots,
          openTime,
          closeTime,
          noTablesAvailable: false
        });

      } catch (error) {
        console.error("Error fetching calendar availability:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get available time slots for a specific date
  app.get(
    "/api/restaurants/:restaurantId/available-times",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const { date, guests } = req.query;

        if (isNaN(restaurantId)) {
          return res.status(400).json({ message: "Invalid restaurant ID" });
        }

        if (!date || !guests) {
          return res
            .status(400)
            .json({ message: "Date and guest count are required" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const bookingDate = new Date(date as string);
        const guestCount = parseInt(guests as string);

        // Check special periods first - they completely disable opening hours for specific dates
        const specialPeriods = await storage.getSpecialPeriodsByRestaurant(restaurantId);
        const dateStr = bookingDate.toISOString().split("T")[0];
        const specialPeriod = specialPeriods.find(
          (sp: any) => dateStr >= sp.startDate && dateStr <= sp.endDate,
        );

        let actualOpenTime = null;
        let actualCloseTime = null;
        const dayOfWeek = bookingDate.getDay();

        if (specialPeriod) {
          // Special period exists - completely disable opening hours
          console.log(`Restaurant ${restaurantId}: Special period active for ${dateStr} - opening hours disabled`);
          
          if (!specialPeriod.isOpen) {
            console.log(`Restaurant ${restaurantId}: Closed due to special period`);
            return res.json([]);
          }
          
          actualOpenTime = specialPeriod.openTime;
          actualCloseTime = specialPeriod.closeTime;
          console.log(`Restaurant ${restaurantId}: Using special period hours ${actualOpenTime} - ${actualCloseTime}`);
        } else {
          // No special period - use regular opening hours
          console.log(`Restaurant ${restaurantId}: No special period for ${dateStr}, checking regular opening hours`);
          
          const openingHours = await storage.getOpeningHoursByRestaurant(restaurantId);
          const dayHours = openingHours.find((oh: any) => oh.dayOfWeek === dayOfWeek);

          if (!dayHours || !dayHours.isOpen) {
            console.log(`Restaurant ${restaurantId}: Closed on day ${dayOfWeek}`);
            return res.json([]);
          }

          actualOpenTime = dayHours.openTime;
          actualCloseTime = dayHours.closeTime;
          console.log(`Restaurant ${restaurantId}: Using regular opening hours ${actualOpenTime} - ${actualCloseTime}`);
        }

        // Get cut-off times for the restaurant
        const cutOffTimes =
          await storage.getCutOffTimesByRestaurant(restaurantId);
        const cutOffTime = cutOffTimes.find(
          (ct: any) => ct.dayOfWeek === dayOfWeek,
        );

        // Get all tables and check capacity
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const combinedTables =
          await storage.getCombinedTablesByRestaurant(restaurantId);

        console.log(
          `Restaurant ${restaurantId}: Found ${tables.length} tables and ${combinedTables.length} combined tables for ${guestCount} guests`,
        );

        // Filter tables that can accommodate the guest count
        const suitableTables = tables.filter(
          (table) => table.capacity >= guestCount,
        );
        const suitableCombinedTables = combinedTables.filter(
          (table) => table.capacity >= guestCount,
        );

        console.log(
          `Restaurant ${restaurantId}: ${suitableTables.length} suitable tables and ${suitableCombinedTables.length} suitable combined tables`,
        );

        if (
          suitableTables.length === 0 &&
          suitableCombinedTables.length === 0
        ) {
          console.log(
            `Restaurant ${restaurantId}: No tables can accommodate ${guestCount} guests - returning empty time slots`,
          );
          return res.json([]); // No tables can accommodate this party size
        }

        // Get existing bookings for this date
        const existingBookings = await storage.getBookingsByDate(
          restaurantId,
          dateStr,
        );
        const activeBookings = existingBookings.filter(
          (booking) => booking.status !== "cancelled",
        );

        // Generate time slots based on actual opening hours (considering special periods)
        const openTimeMinutes = timeToMinutes(actualOpenTime);
        const closeTimeMinutes = timeToMinutes(actualCloseTime);

        const timeSlots = [];
        const now = new Date();

        // Generate 30-minute intervals within opening hours
        for (
          let minutes = openTimeMinutes;
          minutes <= closeTimeMinutes - 60;
          minutes += 30
        ) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;

          // Apply cut-off time validation - same as admin booking system
          if (cutOffTime && cutOffTime.cutOffHours > 0) {
            // Create booking datetime by combining date and time
            const bookingDateTime = new Date(bookingDate);
            bookingDateTime.setHours(hours, mins, 0, 0);

            // Calculate cut-off deadline
            const cutOffMilliseconds = cutOffTime.cutOffHours * 60 * 60 * 1000; // Convert hours to milliseconds
            const cutOffDeadline = new Date(
              bookingDateTime.getTime() - cutOffMilliseconds,
            );

            // Skip this time slot if current time is past the cut-off deadline
            if (now > cutOffDeadline) {
              console.log(
                `Restaurant ${restaurantId}: Time slot ${timeStr} blocked by cut-off time (${cutOffTime.cutOffHours}h before)`,
              );
              continue;
            }
          }

          // Additional check: don't allow bookings in the past
          const bookingDateTime = new Date(bookingDate);
          bookingDateTime.setHours(hours, mins, 0, 0);
          if (bookingDateTime <= now) {
            console.log(
              `Restaurant ${restaurantId}: Time slot ${timeStr} is in the past`,
            );
            continue;
          }

          // Check if any suitable table is available at this time
          const hasAvailableTable = [
            ...suitableTables,
            ...suitableCombinedTables,
          ].some((table) => {
            // Check for booking conflicts with 2-hour duration + 1-hour buffer
            const bookingStart = minutes;
            const bookingEnd = minutes + 120; // 2 hours
            const bufferMinutes = 60; // 1 hour buffer

            const hasConflict = activeBookings.some((booking) => {
              if (booking.tableId !== table.id) return false;

              const existingStart = timeToMinutes(booking.startTime);
              const existingEnd = booking.endTime
                ? timeToMinutes(booking.endTime)
                : existingStart + 120; // Default 2-hour duration

              // Check overlap with buffer
              const requestedStart = bookingStart - bufferMinutes;
              const requestedEnd = bookingEnd + bufferMinutes;
              const existingStartWithBuffer = existingStart - bufferMinutes;
              const existingEndWithBuffer = existingEnd + bufferMinutes;

              return (
                requestedStart < existingEndWithBuffer &&
                existingStartWithBuffer < requestedEnd
              );
            });

            return !hasConflict;
          });

          if (hasAvailableTable) {
            timeSlots.push(timeStr);
          }
        }

        console.log(
          `Restaurant ${restaurantId}: Generated ${timeSlots.length} available time slots for ${dateStr}`,
        );
        res.json(timeSlots);
      } catch (error) {
        console.error("Error fetching available times:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Create a public booking
  app.post(
    "/api/restaurants/:restaurantId/bookings/public",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);

        if (isNaN(restaurantId)) {
          return res.status(400).json({ message: "Invalid restaurant ID" });
        }

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Check if Google integration is enabled for guest bookings
        const googleConfig = await storage.getIntegrationConfiguration(
          restaurantId,
          "google",
        );
        if (!googleConfig || !googleConfig.isEnabled) {
          return res.status(403).json({
            message:
              "Guest bookings are currently disabled. Please contact the restaurant directly.",
          });
        }

        // Validate booking data
        const bookingSchema = z.object({
          customerName: z.string().min(1, "Customer name is required"),
          customerEmail: z.string().email("Valid email is required"),
          customerPhone: z.string().optional(),
          guestCount: z.number().min(1, "Guest count must be at least 1"),
          bookingDate: z.string().datetime("Valid booking date is required"),
          startTime: z.string().min(1, "Start time is required"),
          notes: z.string().optional(),
          source: z.string().default("online"),
        });

        const bookingData = bookingSchema.parse(req.body);
        const bookingDate = new Date(bookingData.bookingDate);

        // Use the same validation logic as admin booking system
        const dayOfWeek = bookingDate.getDay();
        const openingHours =
          await storage.getOpeningHoursByRestaurant(restaurantId);
        const dayHours = openingHours.find(
          (oh: any) => oh.dayOfWeek === dayOfWeek,
        );

        // Check basic opening hours
        if (!dayHours || !dayHours.isOpen) {
          return res
            .status(400)
            .json({ message: "Restaurant is closed on this day" });
        }

        // Check special periods that might override normal hours
        const specialPeriods =
          await storage.getSpecialPeriodsByRestaurant(restaurantId);
        const dateStr = bookingDate.toISOString().split("T")[0];
        const specialPeriod = specialPeriods.find(
          (sp: any) => dateStr >= sp.startDate && dateStr <= sp.endDate,
        );

        let actualOpenTime = dayHours.openTime;
        let actualCloseTime = dayHours.closeTime;

        // Apply special period rules
        if (specialPeriod) {
          if (specialPeriod.isClosed) {
            return res
              .status(400)
              .json({
                message: "Restaurant is closed during this special period",
              });
          } else if (specialPeriod.openTime && specialPeriod.closeTime) {
            actualOpenTime = specialPeriod.openTime;
            actualCloseTime = specialPeriod.closeTime;
          }
        }

        // Validate booking time against actual opening hours (including special periods)

        const bookingTimeMinutes = timeToMinutes(bookingData.startTime);
        const openTimeMinutes = timeToMinutes(actualOpenTime);
        const closeTimeMinutes = timeToMinutes(actualCloseTime);

        if (
          bookingTimeMinutes < openTimeMinutes ||
          bookingTimeMinutes > closeTimeMinutes
        ) {
          return res.status(400).json({
            message: `Booking time ${bookingData.startTime} is outside restaurant hours (${actualOpenTime} - ${actualCloseTime})`,
          });
        }

        // Apply cut-off time validation
        const cutOffTimes =
          await storage.getCutOffTimesByRestaurant(restaurantId);
        const cutOffTime = cutOffTimes.find(
          (ct: any) => ct.dayOfWeek === dayOfWeek,
        );

        if (cutOffTime && cutOffTime.cutOffHours > 0) {
          const [bookingHour, bookingMinute] = bookingData.startTime
            .split(":")
            .map(Number);
          const bookingDateTime = new Date(bookingDate);
          bookingDateTime.setHours(bookingHour, bookingMinute, 0, 0);

          const cutOffMilliseconds = cutOffTime.cutOffHours * 60 * 60 * 1000;
          const cutOffDeadline = new Date(
            bookingDateTime.getTime() - cutOffMilliseconds,
          );
          const now = new Date();

          if (now > cutOffDeadline) {
            return res.status(400).json({
              message: `Booking must be made at least ${cutOffTime.cutOffHours} hour${cutOffTime.cutOffHours > 1 ? "s" : ""} in advance`,
            });
          }
        }

        // Check subscription booking limits
        const tenant = await storage.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ message: "Tenant not found" });
        }

        const subscriptionPlan = await storage.getSubscriptionPlanById(
          tenant.subscriptionPlanId,
        );
        if (!subscriptionPlan) {
          return res.status(400).json({ message: "Invalid subscription plan" });
        }

        const currentBookingCount =
          await storage.getBookingCountForTenantThisMonth(tenantId);
        const maxBookingsPerMonth = subscriptionPlan.maxBookingsPerMonth || 100;

        if (currentBookingCount >= maxBookingsPerMonth) {
          return res.status(400).json({
            message: `You have reached your monthly booking limit of ${maxBookingsPerMonth} bookings for your ${subscriptionPlan.name} plan. Please upgrade your subscription to create more bookings.`,
          });
        }

        // Find an available table for this booking
        const tables = await storage.getTablesByRestaurant(restaurantId);
        const combinedTables =
          await storage.getCombinedTablesByRestaurant(restaurantId);

        // Filter tables that can accommodate the guest count
        const suitableTables = [...tables, ...combinedTables].filter(
          (table) => table.capacity >= bookingData.guestCount,
        );

        if (suitableTables.length === 0) {
          return res
            .status(400)
            .json({ message: "No tables available for this party size" });
        }

        // Get existing bookings for this date
        const existingBookings = await storage.getBookingsByDate(
          restaurantId,
          dateStr,
        );
        const activeBookings = existingBookings.filter(
          (booking) => booking.status !== "cancelled",
        );

        // Find the first available table
        const bookingStartMinutes = timeToMinutes(bookingData.startTime);
        const bookingEndMinutes = bookingStartMinutes + 120; // 2-hour duration
        const bufferMinutes = 60; // 1-hour buffer

        let availableTable = null;
        for (const table of suitableTables) {
          const hasConflict = activeBookings.some((booking) => {
            if (booking.tableId !== table.id) return false;

            const existingStart = timeToMinutes(booking.startTime);
            const existingEnd = booking.endTime
              ? timeToMinutes(booking.endTime)
              : existingStart + 120; // Default 2-hour duration

            // Check overlap with buffer
            const requestedStart = bookingStartMinutes - bufferMinutes;
            const requestedEnd = bookingEndMinutes + bufferMinutes;
            const existingStartWithBuffer = existingStart - bufferMinutes;
            const existingEndWithBuffer = existingEnd + bufferMinutes;

            return (
              requestedStart < existingEndWithBuffer &&
              existingStartWithBuffer < requestedEnd
            );
          });

          if (!hasConflict) {
            availableTable = table;
            break;
          }
        }

        if (!availableTable) {
          return res
            .status(400)
            .json({ message: "No tables available at the requested time" });
        }

        // Check if this is a booking agent to prevent guest profile overwrites
        const isAgent = await storage.isBookingAgent(
          bookingData.customerEmail,
          bookingData.customerPhone || "",
          restaurantId
        );

        let customer;
        if (isAgent) {
          // For booking agents, always create a new customer profile to prevent overwrites
          // The actual guest information should be provided separately from the agent's contact info
          console.log(`Booking agent detected: ${isAgent.name} (${isAgent.email})`);
          
          // Create a new customer profile without checking for existing ones
          customer = await storage.createCustomer(
            restaurantId,
            restaurant.tenantId,
            {
              name: bookingData.customerName,
              email: bookingData.customerEmail,
              phone: bookingData.customerPhone,
            }
          );
          
          // Add a note to the booking indicating it was made by an agent
          bookingData.notes = bookingData.notes 
            ? `${bookingData.notes} [Booked by agent: ${isAgent.name}]`
            : `[Booked by agent: ${isAgent.name}]`;
        } else {
          // For regular guests, use the existing logic to find or create customer
          customer = await storage.getOrCreateCustomer(
            restaurantId,
            restaurant.tenantId,
            {
              name: bookingData.customerName,
              email: bookingData.customerEmail,
              phone: bookingData.customerPhone,
            },
          );
        }

        // Calculate end time (2 hours from start time)
        const [startHour, startMinute] = bookingData.startTime
          .split(":")
          .map(Number);
        const endTime = `${(startHour + 2).toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;

        // Generate management hash
        const managementHash = BookingHash.generateHash(
          0,
          restaurant.tenantId,
          restaurantId,
          "manage",
        );

        // Create booking with assigned table
        const booking = await storage.createBooking({
          restaurantId,
          tenantId: restaurant.tenantId,
          customerId: customer.id,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          customerPhone: bookingData.customerPhone,
          guestCount: bookingData.guestCount,
          bookingDate: bookingDate,
          startTime: bookingData.startTime,
          endTime: endTime,
          tableId: availableTable.id,
          status: "confirmed",
          source: bookingData.source,
          notes: bookingData.notes,
          managementHash: managementHash,
        });

        // Update the hash with the actual booking ID
        const actualHash = BookingHash.generateHash(
          booking.id,
          restaurant.tenantId,
          restaurantId,
          "manage",
        );
        await storage.updateBooking(booking.id, { managementHash: actualHash });

        // Send real-time notification
        try {
          const notification = await storage.createNotification({
            restaurantId: restaurantId,
            tenantId: restaurant.tenantId,
            type: "new_booking",
            title: "New Online Booking",
            message: `New booking from ${bookingData.customerName} for ${bookingDate.toLocaleDateString()} at ${bookingData.startTime}`,
            bookingId: booking.id,
            data: {
              booking: {
                id: booking.id,
                customerName: bookingData.customerName,
                customerEmail: bookingData.customerEmail,
                customerPhone: bookingData.customerPhone,
                guestCount: booking.guestCount,
                bookingDate: booking.bookingDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                notes: booking.notes,
                createdAt: booking.createdAt,
              },
              restaurant: {
                id: restaurantId,
                name: restaurant.name,
              },
            },
            canRevert: false,
          });

          broadcastNotification(restaurantId, {
            type: "notification",
            notification: {
              id: notification.id,
              type: "new_booking",
              title: notification.title,
              message: notification.message,
              booking: notification.data.booking,
              restaurant: notification.data.restaurant,
              timestamp: notification.createdAt,
              read: false,
              canRevert: false,
            },
          });
        } catch (notificationError) {
          console.error(
            "Error sending real-time notification:",
            notificationError,
          );
        }

        // Send email notifications if available
        if (emailService) {
          try {
            // Send confirmation email to customer
            await emailService.sendBookingConfirmation(
              bookingData.customerEmail,
              bookingData.customerName,
              {
                ...booking,
                tableNumber: booking.tableId,
                restaurantName: restaurant.name,
                restaurantAddress: restaurant.address,
                restaurantPhone: restaurant.phone,
              },
            );

            // Send notification to restaurant if email is configured
            if (restaurant.email) {
              await emailService.sendRestaurantNotification(restaurant.email, {
                ...booking,
                restaurantName: restaurant.name,
              });
            }
          } catch (emailError) {
            console.error("Error sending emails:", emailError);
          }
        }

        res.status(201).json({
          message: "Booking created successfully",
          booking: {
            id: booking.id,
            customerName: booking.customerName,
            guestCount: booking.guestCount,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
          },
        });
      } catch (error) {
        console.error("Error creating public booking:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Validation error",
            errors: error.errors,
          });
        }
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

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
        category: z.enum([
          "general",
          "booking-channels",
          "reservation-software",
          "restaurants",
          "products",
          "partners",
        ]),
      });

      const validatedData = contactSchema.parse(req.body);

      // Log the contact form submission
      console.log("Contact form submission:", {
        name: validatedData.name,
        email: validatedData.email,
        company: validatedData.company,
        subject: validatedData.subject,
        category: validatedData.category,
        timestamp: new Date().toISOString(),
      });

      // Send email notification if email service is available
      if (emailService) {
        try {
          await emailService.sendContactFormNotification(validatedData);
        } catch (emailError) {
          console.error("Failed to send contact form email:", emailError);
          // Continue with success response even if email fails
        }
      }

      res.json({
        success: true,
        message: "Contact form submitted successfully",
      });
    } catch (error) {
      console.error("Error processing contact form:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stripe webhook to handle successful payments
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET || "whsec_your_webhook_secret",
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    console.log(`Received webhook event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, planId } = session.metadata!;

      console.log(
        `Processing checkout.session.completed for user ${userId}, plan ${planId}`,
      );

      // Check if user already has a subscription
      const existingSubscription = await storage.getUserSubscription(
        parseInt(userId),
      );

      if (existingSubscription) {
        // Update existing subscription
        await storage.updateUserSubscription(existingSubscription.id, {
          planId: parseInt(planId),
          stripeSubscriptionId: session.subscription as string,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "active",
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
          status: "active",
        });
        console.log(`Created new subscription for user ${userId}`);
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      // Find user subscription by Stripe subscription ID and extend their period
      const userSubscription =
        await storage.getUserSubscriptionByStripeId(subscriptionId);
      if (userSubscription) {
        await storage.updateUserSubscription(userSubscription.id, {
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "active",
        });
        console.log(
          `Extended subscription for user ${userSubscription.userId}`,
        );
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userSubscription = await storage.getUserSubscriptionByStripeId(
        subscription.id,
      );
      if (userSubscription) {
        await storage.updateUserSubscription(userSubscription.id, {
          status: "cancelled",
        });
        console.log(
          `Cancelled subscription for user ${userSubscription.userId}`,
        );
      }
    }

    res.json({ received: true });
  });

  // Working Notifications API (temporary fallback)
  app.get(
    "/api/notifications",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const restaurant = await storage.getRestaurantByUserId(req.user.id);
        if (!restaurant) {
          return res.status(404).json({ error: "Restaurant not found" });
        }

        const notifications = await storage.getNotificationsByRestaurant(
          restaurant.id,
        );
        res.json(notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
      }
    },
  );

  // Tenant-scoped Notifications API (preferred)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/notifications",
    attachUser,
    validateTenant,
    async (req: Request, res: Response) => {
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

        const notifications =
          await storage.getNotificationsByRestaurant(restaurantId);
        res.json(notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
      }
    },
  );

  // Mark notification as read (tenant-scoped)
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/notifications/:id/read",
    attachUser,
    validateTenant,
    async (req: Request, res: Response) => {
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

        const updatedNotification =
          await storage.markNotificationAsRead(notificationId);
        res.json(updatedNotification);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Failed to update notification" });
      }
    },
  );

  // Mark all notifications as read (tenant-scoped)
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/notifications/mark-all-read",
    attachUser,
    validateTenant,
    async (req: Request, res: Response) => {
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
    },
  );

  // Delete notification (tenant-scoped)
  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/notifications/:id",
    attachUser,
    validateTenant,
    async (req: Request, res: Response) => {
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
        const notifications =
          await storage.getNotificationsByRestaurant(restaurantId);
        const notification = notifications.find((n) => n.id === notificationId);

        if (!notification) {
          return res.status(404).json({ error: "Notification not found" });
        }

        // Delete the notification
        const success = await storage.deleteNotification(notificationId);

        if (success) {
          res.json({
            success: true,
            message: "Notification deleted successfully",
          });
        } else {
          res.status(400).json({ error: "Failed to delete notification" });
        }
      } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ error: "Failed to delete notification" });
      }
    },
  );

  app.patch(
    "/api/notifications/:id/read",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const notificationId = parseInt(req.params.id);
        const updatedNotification =
          await storage.markNotificationAsRead(notificationId);
        res.json(updatedNotification);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Failed to update notification" });
      }
    },
  );

  app.patch(
    "/api/notifications/mark-all-read",
    attachUser,
    async (req: Request, res: Response) => {
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
    },
  );

  app.post(
    "/api/notifications/:id/revert",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const notificationId = parseInt(req.params.id);
        const success = await storage.revertNotification(
          notificationId,
          req.user.email,
        );

        if (success) {
          res.json({ success: true, message: "Changes reverted successfully" });
        } else {
          res.status(400).json({ error: "Cannot revert this notification" });
        }
      } catch (error) {
        console.error("Error reverting notification:", error);
        res.status(500).json({ error: "Failed to revert changes" });
      }
    },
  );

  // Resolved conflicts endpoint
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/resolved-conflicts",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const resolvedConflicts = await storage.getResolvedConflictsByRestaurant(parseInt(restaurantId));
        res.json(resolvedConflicts);
      } catch (error) {
        console.error("Error fetching resolved conflicts:", error);
        res.status(500).json({ error: "Failed to fetch resolved conflicts" });
      }
    }
  );

  // Menu Categories endpoints
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-categories",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const categories = await storage.getMenuCategoriesByRestaurant(parseInt(restaurantId));
        res.json(categories);
      } catch (error) {
        console.error("Error fetching menu categories:", error);
        res.status(500).json({ error: "Failed to fetch menu categories" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-categories",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const categoryData = {
          ...req.body,
          restaurantId: parseInt(restaurantId),
          tenantId: parseInt(tenantId),
        };

        const category = await storage.createMenuCategory(categoryData);
        res.json(category);
      } catch (error) {
        console.error("Error creating menu category:", error);
        res.status(500).json({ error: "Failed to create menu category" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-categories/:categoryId",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId, categoryId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const category = await storage.updateMenuCategory(parseInt(categoryId), req.body);
        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
        res.json(category);
      } catch (error) {
        console.error("Error updating menu category:", error);
        res.status(500).json({ error: "Failed to update menu category" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-categories/:categoryId",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId, categoryId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteMenuCategory(parseInt(categoryId));
        if (!success) {
          return res.status(404).json({ message: "Category not found" });
        }
        res.json({ message: "Category deleted successfully" });
      } catch (error) {
        console.error("Error deleting menu category:", error);
        res.status(500).json({ error: "Failed to delete menu category" });
      }
    }
  );

  // Menu Items endpoints
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-items",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const { categoryId } = req.query;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        let items;
        if (categoryId) {
          items = await storage.getMenuItemsByCategory(parseInt(categoryId as string));
        } else {
          items = await storage.getMenuItemsByRestaurant(parseInt(restaurantId));
        }
        res.json(items);
      } catch (error) {
        console.error("Error fetching menu items:", error);
        res.status(500).json({ error: "Failed to fetch menu items" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-items",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const itemData = {
          ...req.body,
          restaurantId: parseInt(restaurantId),
          tenantId: parseInt(tenantId),
          ingredients: req.body.ingredients || null,
          nutritionalInfo: req.body.nutritionalInfo || null,
        };

        const item = await storage.createMenuItem(itemData);
        res.json(item);
      } catch (error) {
        console.error("Error creating menu item:", error);
        res.status(500).json({ error: "Failed to create menu item" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-items/:itemId",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId, itemId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updateData = {
          ...req.body,
          ingredients: req.body.ingredients || null,
          nutritionalInfo: req.body.nutritionalInfo || null,
        };
        const item = await storage.updateMenuItem(parseInt(itemId), updateData);
        if (!item) {
          return res.status(404).json({ message: "Item not found" });
        }
        res.json(item);
      } catch (error) {
        console.error("Error updating menu item:", error);
        res.status(500).json({ error: "Failed to update menu item" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-items/:itemId",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId, itemId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteMenuItem(parseInt(itemId));
        if (!success) {
          return res.status(404).json({ message: "Item not found" });
        }
        res.json({ message: "Item deleted successfully" });
      } catch (error) {
        console.error("Error deleting menu item:", error);
        res.status(500).json({ error: "Failed to delete menu item" });
      }
    }
  );

  // Seasonal Menu Themes Routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seasonal-themes",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const themes = await storage.getSeasonalMenuThemes(parseInt(restaurantId), parseInt(tenantId));
        res.json(themes);
      } catch (error) {
        console.error("Error fetching seasonal themes:", error);
        res.status(500).json({ error: "Failed to fetch seasonal themes" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seasonal-themes/generate",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const { season, customPrompt } = req.body;
        
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get existing menu items for context
        const menuItems = await storage.getMenuItems(parseInt(restaurantId), parseInt(tenantId));
        const categories = await storage.getMenuCategories(parseInt(restaurantId), parseInt(tenantId));
        
        const menuItemsWithCategories = menuItems.map(item => {
          const category = categories.find(cat => cat.id === item.categoryId);
          return {
            name: item.name,
            description: item.description,
            category: category?.name || 'Other',
            allergens: item.allergens,
            dietary: item.dietary
          };
        });

        const { AISeasonalMenuService } = await import('./ai-seasonal-menu');
        const aiService = new AISeasonalMenuService();
        
        const aiResult = await aiService.generateSeasonalTheme({
          season,
          year: new Date().getFullYear(),
          restaurantName: restaurant.name,
          existingMenuItems: menuItemsWithCategories,
          customPrompt
        });

        // Save the generated theme to database
        const themeData = {
          restaurantId: parseInt(restaurantId),
          tenantId: parseInt(tenantId),
          name: aiResult.name,
          description: aiResult.description,
          season,
          year: new Date().getFullYear(),
          color: aiResult.color,
          isActive: false,
          aiGenerated: true,
          prompt: customPrompt || `Generated ${season} theme`,
          suggestedMenuItems: aiResult.suggestedMenuItems,
          marketingCopy: aiResult.marketingCopy,
          targetIngredients: aiResult.targetIngredients,
          moodKeywords: aiResult.moodKeywords
        };

        const savedTheme = await storage.createSeasonalMenuTheme(themeData);
        res.json(savedTheme);
      } catch (error) {
        console.error("Error generating seasonal theme:", error);
        res.status(500).json({ error: "Failed to generate seasonal theme" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seasonal-themes/:themeId/activate",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId, themeId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.setActiveSeasonalTheme(
          parseInt(restaurantId), 
          parseInt(tenantId), 
          parseInt(themeId)
        );
        
        if (!success) {
          return res.status(404).json({ message: "Theme not found" });
        }

        res.json({ message: "Theme activated successfully" });
      } catch (error) {
        console.error("Error activating theme:", error);
        res.status(500).json({ error: "Failed to activate theme" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seasonal-themes/:themeId",
    validateTenant,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId, themeId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteSeasonalMenuTheme(parseInt(themeId));
        if (!success) {
          return res.status(404).json({ message: "Theme not found" });
        }

        res.json({ message: "Theme deleted successfully" });
      } catch (error) {
        console.error("Error deleting theme:", error);
        res.status(500).json({ error: "Failed to delete theme" });
      }
    }
  );

  // Test webhook endpoint for debugging
  app.post("/api/webhook-test", async (req, res) => {
    console.log("=== WEBHOOK TEST RECEIVED ===");
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("=== END WEBHOOK TEST ===");

    res.status(200).json({
      message: "Webhook received successfully",
      timestamp: new Date().toISOString(),
      received_data: req.body,
    });
  });

  // Subscription Plans API endpoints
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

  // User Management API endpoint
  app.get("/api/users", async (req, res) => {
    try {
      // This endpoint returns basic user info for admin purposes
      // In a production environment, this would need proper authorization
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Stripe checkout session creation
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { planId, userId, successUrl, cancelUrl } = req.body;

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.name} Plan`,
                description: `Restaurant booking system - ${plan.name} plan`,
              },
              unit_amount: plan.price,
              recurring: {
                interval:
                  plan.interval === "monthly"
                    ? "month"
                    : plan.interval === "yearly"
                      ? "year"
                      : "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
        },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // ===============================
  // CONFLICT RESOLUTION SYSTEM API
  // ===============================

  // Conflict resolution generator
  const ConflictResolver = {
    generateTableResolutions: (
      booking1: any,
      booking2: any,
      tableId: number,
    ) => {
      return [
        {
          id: `reassign-${booking1.id}`,
          type: "reassign_table",
          description: `Move ${booking1.customerName} to another table`,
          impact: "low",
          confidence: 85,
          estimatedCustomerSatisfaction: 80,
          details: { bookingToMove: booking1.id, originalTableId: tableId },
        },
        {
          id: `adjust-time-${booking2.id}`,
          type: "adjust_time",
          description: `Adjust ${booking2.customerName}'s time by 30 minutes`,
          impact: "low",
          confidence: 75,
          estimatedCustomerSatisfaction: 70,
          details: { bookingToAdjust: booking2.id, timeAdjustment: 30 },
        },
      ];
    },

    generateCapacityResolutions: (booking: any, tables: any[]) => {
      const suitableTables = tables.filter(
        (t) => t.capacity >= booking.guestCount && t.id !== booking.tableId,
      );
      const resolutions = [];

      if (suitableTables.length > 0) {
        resolutions.push({
          id: `reassign-${booking.id}`,
          type: "reassign_table",
          description: `Move to larger table (${suitableTables[0].name || `Table ${suitableTables[0].table_number}`})`,
          impact: "low",
          confidence: 90,
          estimatedCustomerSatisfaction: 85,
          details: {
            newTableId: suitableTables[0].id,
            newTableName: suitableTables[0].name,
          },
        });
      }

      if (booking.guestCount > 6) {
        resolutions.push({
          id: `split-party-${booking.id}`,
          type: "split_party",
          description: "Split large party across adjacent tables",
          impact: "moderate",
          confidence: 70,
          estimatedCustomerSatisfaction: 75,
          details: {
            splitSuggested: true,
            tablesNeeded: 2,
            compensationSuggested: true,
          },
        });
      }

      return resolutions;
    },

    generateTimeResolutions: (conflictingBookings: any[]) => {
      return [
        {
          id: `stagger-times-${conflictingBookings[0].id}`,
          type: "stagger_times",
          description: "Stagger booking times to reduce overlap",
          impact: "moderate",
          confidence: 80,
          estimatedCustomerSatisfaction: 75,
          details: {
            suggestedTimeAdjustments: conflictingBookings.map((b, i) => ({
              bookingId: b.id,
              newTime: `${parseInt(b.startTime.split(":")[0]) + i}:${b.startTime.split(":")[1]}`,
            })),
          },
        },
      ];
    },
  };

  // Conflict detection and analysis algorithms
  const ConflictDetector = {
    // Detect table double bookings
    detectTableDoubleBookings: (bookings: any[]) => {
      const conflicts: any[] = [];
      const tableBookings = new Map<number, any[]>();

      // Group bookings by table
      bookings.forEach((booking) => {
        if (booking.tableId) {
          if (!tableBookings.has(booking.tableId)) {
            tableBookings.set(booking.tableId, []);
          }
          tableBookings.get(booking.tableId)!.push(booking);
        }
      });

      // Check for overlaps within each table
      tableBookings.forEach((tableBookingList, tableId) => {
        for (let i = 0; i < tableBookingList.length; i++) {
          for (let j = i + 1; j < tableBookingList.length; j++) {
            const booking1 = tableBookingList[i];
            const booking2 = tableBookingList[j];

            if (booking1.bookingDate === booking2.bookingDate) {
              const start1 = timeToMinutes(booking1.startTime);
              const end1 =
                timeToMinutes(booking1.endTime || booking1.startTime) + 120; // Default 2h duration
              const start2 = timeToMinutes(booking2.startTime);
              const end2 =
                timeToMinutes(booking2.endTime || booking2.startTime) + 120;

              if (start1 < end2 && start2 < end1) {
                conflicts.push({
                  id: `table-conflict-${tableId}-${Math.min(booking1.id, booking2.id)}-${Math.max(booking1.id, booking2.id)}`,
                  type: "table_double_booking",
                  severity: "high",
                  bookings: [booking1, booking2],
                  autoResolvable: true,
                  createdAt: new Date().toISOString(),
                  suggestedResolutions:
                    ConflictResolver.generateTableResolutions(
                      booking1,
                      booking2,
                      tableId,
                    ),
                });
              }
            }
          }
        }
      });

      return conflicts;
    },

    // Detect capacity exceeded situations
    detectCapacityExceeded: (bookings: any[], tables: any[]) => {
      const conflicts: any[] = [];
      const tableCapacities = new Map(tables.map((t) => [t.id, t.capacity]));
      const maxRestaurantCapacity = Math.max(...tables.map(t => t.capacity), 0);

      bookings.forEach((booking) => {
        // Skip cancelled bookings
        if (booking.status === 'cancelled') return;

        let hasCapacityConflict = false;
        let conflictType = 'assigned_table_exceeded';

        if (booking.tableId && tableCapacities.has(booking.tableId)) {
          // Check assigned table capacity
          const tableCapacity = tableCapacities.get(booking.tableId);
          if (booking.guestCount > tableCapacity) {
            hasCapacityConflict = true;
            conflictType = 'assigned_table_exceeded';
          }
        } else if (!booking.tableId) {
          // Check if unassigned booking exceeds any available table capacity
          if (booking.guestCount > maxRestaurantCapacity) {
            hasCapacityConflict = true;
            conflictType = 'no_suitable_table';
          }
        }

        if (hasCapacityConflict) {
          const suitableTables = tables.filter(t => t.capacity >= booking.guestCount);
          conflicts.push({
            id: `capacity-conflict-${booking.id}`,
            type: "capacity_exceeded",
            severity: conflictType === 'no_suitable_table' ? "high" : "medium",
            bookings: [booking],
            autoResolvable: suitableTables.length > 0,
            createdAt: new Date().toISOString(),
            details: {
              conflictType,
              guestCount: booking.guestCount,
              maxTableCapacity: maxRestaurantCapacity,
              suitableTablesAvailable: suitableTables.length,
              currentTableId: booking.tableId
            },
            suggestedResolutions:
              ConflictResolver.generateCapacityResolutions(booking, tables),
          });
        }
      });

      return conflicts;
    },

    // Detect time overlaps across restaurant
    detectTimeOverlaps: (bookings: any[]) => {
      const conflicts: any[] = [];
      const dateGroups = new Map<string, any[]>();

      // Group by date
      bookings.forEach((booking) => {
        if (!dateGroups.has(booking.bookingDate)) {
          dateGroups.set(booking.bookingDate, []);
        }
        dateGroups.get(booking.bookingDate)!.push(booking);
      });

      // Check for problematic overlaps (too many concurrent bookings)
      dateGroups.forEach((dayBookings, date) => {
        const timeSlots = new Map<string, any[]>();

        dayBookings.forEach((booking) => {
          const startTime = booking.startTime;
          if (!timeSlots.has(startTime)) {
            timeSlots.set(startTime, []);
          }
          timeSlots.get(startTime)!.push(booking);
        });

        timeSlots.forEach((slotBookings, time) => {
          if (slotBookings.length > 3) {
            // More than 3 bookings at same time might be problematic
            conflicts.push({
              id: `time-overlap-${date}-${time}`,
              type: "time_overlap",
              severity: "low",
              bookings: slotBookings,
              autoResolvable: true,
              createdAt: new Date().toISOString(),
              suggestedResolutions:
                ConflictResolver.generateTimeResolutions(slotBookings),
            });
          }
        });
      });

      return conflicts;
    },
  };

  // Get heat map data for restaurant seating analytics
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/heat-map",
    validateTenant,
    async (req, res) => {
      console.log('Heat map endpoint reached');
      try {
        const tenantId = parseInt(req.params.tenantId);
        const restaurantId = parseInt(req.params.restaurantId);
        console.log(`Heat map: Processing tenant ${tenantId}, restaurant ${restaurantId}`);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const tables = await storage.getTablesByRestaurant(restaurantId);
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        
        console.log(`Heat map: Found ${tables.length} tables and ${bookings.length} bookings for restaurant ${restaurantId}`);
        
        // Get table layout positions (using default room "1")
        const tableLayout = await storage.getTableLayout(restaurantId, "1");
        const positions = tableLayout?.positions || {};

        // Calculate heat map data for each table
        const heatMapData = tables.map((table, index) => {
          const tableBookings = bookings.filter((b) => b.tableId === table.id);
          const totalBookings = tableBookings.length;
          const totalRevenue = tableBookings.reduce(
            (sum, booking) => sum + (booking.totalAmount || 0),
            0,
          );
          const avgGuestCount =
            totalBookings > 0
              ? tableBookings.reduce((sum, b) => sum + b.guestCount, 0) /
                totalBookings
              : 0;

          // Calculate heat score based on multiple factors
          const occupancyRate = table.capacity > 0 ? Math.round((avgGuestCount / table.capacity) * 100) : 0;
          const revenueScore = Math.min(100, Math.round((totalRevenue || 0) / 100));
          const bookingScore = Math.min(100, totalBookings * 10);
          const heatScore = Math.round((occupancyRate + revenueScore + bookingScore) / 3);

          // Get position from saved layout or use default grid position
          const savedPosition = positions[table.id.toString()];
          const defaultPosition = {
            x: 60 + (index % 4) * 120,
            y: 60 + Math.floor(index / 4) * 100
          };

          // Determine table status based on current time and bookings
          const now = new Date();
          const currentHour = now.getHours();
          const todayBookings = tableBookings.filter(b => {
            const bookingDate = new Date(b.bookingDate);
            return bookingDate.toDateString() === now.toDateString();
          });
          
          let status = 'available';
          const currentTimeSlot = todayBookings.find(b => {
            const startHour = parseInt(b.startTime.split(':')[0]);
            const endHour = b.endTime ? parseInt(b.endTime.split(':')[0]) : startHour + 2;
            return currentHour >= startHour && currentHour < endHour;
          });
          
          if (currentTimeSlot) {
            status = 'occupied';
          } else if (todayBookings.some(b => {
            const startHour = parseInt(b.startTime.split(':')[0]);
            return Math.abs(currentHour - startHour) <= 1;
          })) {
            status = 'reserved';
          }

          // Generate peak hours based on booking patterns
          const hourCounts = {};
          tableBookings.forEach(b => {
            const hour = parseInt(b.startTime.split(':')[0]);
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          });
          const peakHours = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => `${hour}:00`);

          return {
            tableId: table.id,
            tableName: `Table ${table.tableNumber}`,
            capacity: table.capacity || 4,
            position: savedPosition || defaultPosition,
            heatScore,
            bookingCount: totalBookings,
            occupancyRate,
            revenueGenerated: totalRevenue || 0,
            averageStayDuration: 90, // Default 90 minutes
            peakHours,
            status: status as 'available' | 'occupied' | 'reserved' | 'maintenance'
          };
        });

        res.json(heatMapData);
      } catch (error) {
        console.error("Error generating heat map data:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Working conflicts endpoint (bypasses routing issues)
  app.get(
    "/conflicts-check/:tenantId/:restaurantId",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        console.log(`CONFLICTS CHECK: Starting for restaurant ${restaurantId}, tenant ${tenantId}`);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          console.log(`CONFLICTS CHECK: Restaurant not found or tenant mismatch`);
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        // Filter bookings by tenant for security
        const tenantBookings = bookings.filter(
          (booking) => booking.tenantId === tenantId,
        );
        const tenantTables = tables.filter(
          (table) => table.tenant_id === tenantId,
        );

        console.log(`CONFLICTS CHECK: Found ${tenantBookings.length} bookings, ${tenantTables.length} tables`);
        
        // Detect all types of conflicts
        const capacityConflicts = ConflictDetector.detectCapacityExceeded(tenantBookings, tenantTables);
        console.log(`CONFLICTS CHECK: Capacity conflicts detected: ${capacityConflicts.length}`);
        
        const conflicts = [
          ...ConflictDetector.detectTableDoubleBookings(tenantBookings),
          ...capacityConflicts,
          ...ConflictDetector.detectTimeOverlaps(tenantBookings),
        ];

        console.log(`CONFLICTS CHECK: Total conflicts: ${conflicts.length}`);
        res.json(conflicts);
      } catch (error) {
        console.error("CONFLICTS CHECK: Error fetching conflicts:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    },
  );

  // Working conflict resolution endpoint (bypasses routing issues)
  app.post(
    "/resolve-conflict/:tenantId/:restaurantId/:conflictId",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const conflictId = req.params.conflictId;
        const { resolutionId, bookingId, newTableId, notes } = req.body;

        console.log(`CONFLICTS RESOLVE: Starting for conflict ${conflictId}, restaurant ${restaurantId}`);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          console.log(`CONFLICTS RESOLVE: Restaurant not found or tenant mismatch`);
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get current conflicts to find the specific one
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        const tenantBookings = bookings.filter(b => b.tenantId === tenantId);
        const tenantTables = tables.filter(t => t.tenant_id === tenantId);

        const allConflicts = [
          ...ConflictDetector.detectTableDoubleBookings(tenantBookings),
          ...ConflictDetector.detectCapacityExceeded(tenantBookings, tenantTables),
          ...ConflictDetector.detectTimeOverlaps(tenantBookings),
        ];

        const conflict = allConflicts.find((c) => c.id === conflictId);
        if (!conflict) {
          console.log(`CONFLICTS RESOLVE: Conflict ${conflictId} not found`);
          return res.status(404).json({ message: "Conflict not found" });
        }

        const resolution = conflict.suggestedResolutions.find(
          (r: any) => r.id === resolutionId,
        );
        if (!resolution) {
          console.log(`CONFLICTS RESOLVE: Resolution ${resolutionId} not found`);
          return res.status(404).json({ message: "Resolution not found" });
        }

        console.log(`CONFLICTS RESOLVE: Applying resolution type: ${resolution.type}`);

        // Apply the resolution based on type
        let resolutionDescription = "";
        const booking = conflict.bookings[0];

        if (resolution.type === "split_party") {
          // Actually split the large party into multiple bookings to resolve the conflict
          const tableCapacities = tenantTables.map(t => t.capacity).filter(c => c && c > 0);
          const maxCapacity = tableCapacities.length > 0 ? Math.max(...tableCapacities) : 4; // Default to 4 if no valid capacities
          
          // Validate guest count and capacity
          if (!booking.guestCount || booking.guestCount <= 0) {
            console.log(`CONFLICTS RESOLVE: Invalid guest count: ${booking.guestCount}`);
            return res.status(400).json({ message: "Invalid guest count" });
          }
          
          const tablesNeeded = Math.max(1, Math.ceil(booking.guestCount / maxCapacity));
          
          // Calculate guest distribution across tables
          const guestsPerTable = Math.floor(booking.guestCount / tablesNeeded);
          const remainderGuests = booking.guestCount % tablesNeeded;
          
          // Debug logging to identify the source of invalid values
          console.log(`CONFLICTS RESOLVE: Debug values - guestCount: ${booking.guestCount}, maxCapacity: ${maxCapacity}, tablesNeeded: ${tablesNeeded}, guestsPerTable: ${guestsPerTable}, remainderGuests: ${remainderGuests}`);
          
          // Update the original booking to first portion
          const firstPortionGuests = guestsPerTable + (remainderGuests > 0 ? 1 : 0);
          
          // Validate calculated values before database update
          if (!Number.isFinite(firstPortionGuests) || firstPortionGuests <= 0) {
            console.log(`CONFLICTS RESOLVE: Invalid firstPortionGuests: ${firstPortionGuests}`);
            return res.status(400).json({ message: "Invalid guest count calculation" });
          }
          
          await storage.updateBooking(booking.id, {
            guestCount: firstPortionGuests,
            notes: `Split party - Part 1 of ${tablesNeeded} (${firstPortionGuests} guests)`
          });
          
          // Create additional bookings for remaining guests
          for (let i = 1; i < tablesNeeded; i++) {
            const portionGuests = guestsPerTable + (i < remainderGuests ? 1 : 0);
            
            // Validate calculated values before database operation
            if (!Number.isFinite(portionGuests) || portionGuests <= 0) {
              console.log(`CONFLICTS RESOLVE: Invalid portionGuests: ${portionGuests} for booking ${i + 1}`);
              return res.status(400).json({ message: "Invalid guest count calculation for split booking" });
            }
            
            await storage.createBooking({
              restaurantId,
              tenantId,
              customerId: booking.customerId,
              customerName: `${booking.customerName} (Part ${i + 1})`,
              customerEmail: booking.customerEmail,
              customerPhone: booking.customerPhone,
              guestCount: portionGuests,
              bookingDate: booking.bookingDate,
              startTime: booking.startTime,
              endTime: booking.endTime,
              status: "confirmed",
              source: "split_party",
              notes: `Split party - Part ${i + 1} of ${tablesNeeded} (${portionGuests} guests)`,
              tableId: null // Will be assigned by staff
            });
          }
          
          resolutionDescription = `Split party of ${booking.guestCount} guests into ${tablesNeeded} separate bookings for table assignment`;
          
          // Create detailed notification for staff to assign tables after split bookings are created
          const splitBookingDetails = [];
          const baseCustomerName = booking.customerName.replace(/ - Part \d+$/, '');
          
          // Calculate actual guest distribution
          const totalGuests = booking.guestCount;
          const actualTablesNeeded = Math.ceil(totalGuests / maxCapacity);
          const baseGuestsPerTable = Math.floor(totalGuests / actualTablesNeeded);
          const extraGuests = totalGuests % actualTablesNeeded;
          
          // Show the main booking (updated)
          splitBookingDetails.push(`• Booking #${booking.id}: ${firstPortionGuests} guests (${baseCustomerName})`);
          
          // Show additional bookings that will be created
          for (let i = 2; i <= actualTablesNeeded; i++) {
            const guestsForThisTable = baseGuestsPerTable + (i <= extraGuests + 1 ? 1 : 0);
            splitBookingDetails.push(`• New booking: ${guestsForThisTable} guests (${baseCustomerName} - Part ${i})`);
          }
          
          const detailedMessage = `SPLIT PARTY ACTION REQUIRED:
Customer: ${baseCustomerName}
Original Party: ${booking.guestCount} guests
Date: ${new Date(booking.bookingDate).toLocaleDateString()}
Time: ${booking.startTime}

Split into ${tablesNeeded} bookings:
${splitBookingDetails.join('\n')}

NEXT STEPS:
1. Assign ${tablesNeeded} adjacent tables (capacity 6+ each)
2. Inform customer about split seating arrangement
3. Coordinate service timing across tables
4. Offer complimentary appetizer for split seating inconvenience`;

          const notification = {
            restaurantId,
            tenantId,
            type: "split_party_created",
            title: `🍽️ Split Party: ${booking.customerName} (${booking.guestCount} guests)`,
            message: detailedMessage,
            isRead: false,
            priority: "high",
            createdAt: new Date(),
            metadata: {
              originalBookingId: booking.id,
              conflictId,
              totalGuests: booking.guestCount,
              bookingsCreated: tablesNeeded,
              originalCustomerName: booking.customerName,
              actionRequired: true
            },
          };

          await storage.createNotification(notification);
          broadcastNotification(restaurantId, notification);

        } else if (resolution.type === "reassign_table" && newTableId) {
          // Reassign to specific table
          await storage.updateBooking(booking.id, {
            tableId: newTableId,
          });
          
          const newTable = tenantTables.find(t => t.id === newTableId);
          resolutionDescription = `Reassigned to Table ${newTable?.table_number} (capacity: ${newTable?.capacity})`;
        }

        // Log the resolution
        try {
          await storage.createActivityLog({
            restaurantId,
            tenantId,
            eventType: "conflict_resolved",
            description: `Resolved conflict ${conflictId}: ${resolutionDescription}`,
            source: "manual",
            createdAt: new Date(),
          });
        } catch (logError) {
          console.log(`CONFLICTS RESOLVE: Could not create activity log:`, logError);
        }

        // Save resolved conflict to database for tracking
        try {
          await storage.createResolvedConflict({
            restaurantId,
            tenantId,
            conflictId,
            conflictType: conflict.type,
            severity: conflict.severity,
            bookingIds: conflict.bookings.map((b: any) => b.id),
            resolutionType: resolution.type,
            resolutionDetails: resolutionDescription,
            appliedBy: 'manual',
            originalData: {
              conflict: conflict,
              resolution: resolution,
              bookingData: conflict.bookings
            }
          });
        } catch (saveError) {
          console.log(`CONFLICTS RESOLVE: Could not save resolved conflict:`, saveError);
        }

        console.log(`CONFLICTS RESOLVE: Successfully resolved conflict ${conflictId}`);

        res.json({
          message: "Conflict resolved successfully",
          resolution: resolutionDescription,
          conflictId,
          applied: resolution.type
        });
      } catch (error) {
        console.error("CONFLICTS RESOLVE: Error resolving conflict:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    },
  );

  // Get conflicts for a restaurant (working version)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts",
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        console.log(`CONFLICTS GET: Starting for restaurant ${restaurantId}, tenant ${tenantId}`);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          console.log(`CONFLICTS GET: Restaurant not found or tenant mismatch`);
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        // Filter bookings by tenant for security
        const tenantBookings = bookings.filter(
          (booking) => booking.tenantId === tenantId,
        );
        const tenantTables = tables.filter(
          (table) => table.tenant_id === tenantId,
        );

        console.log(`CONFLICTS GET: Found ${tenantBookings.length} bookings, ${tenantTables.length} tables`);
        
        // Detect all types of conflicts
        const capacityConflicts = ConflictDetector.detectCapacityExceeded(tenantBookings, tenantTables);
        console.log(`CONFLICTS GET: Capacity conflicts detected: ${capacityConflicts.length}`);
        
        const conflicts = [
          ...ConflictDetector.detectTableDoubleBookings(tenantBookings),
          ...capacityConflicts,
          ...ConflictDetector.detectTimeOverlaps(tenantBookings),
        ];

        console.log(`CONFLICTS GET: Total conflicts: ${conflicts.length}`);
        res.json(conflicts);
      } catch (error) {
        console.error("CONFLICTS GET: Error fetching conflicts:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    },
  );

  // Auto-resolve a conflict
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/:conflictId/auto-resolve",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const conflictId = req.params.conflictId;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get current conflicts to find the specific one
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        const allConflicts = [
          ...ConflictDetector.detectTableDoubleBookings(bookings),
          ...ConflictDetector.detectCapacityExceeded(bookings, tables),
          ...ConflictDetector.detectTimeOverlaps(bookings),
        ];

        const conflict = allConflicts.find((c) => c.id === conflictId);
        if (!conflict) {
          return res.status(404).json({ message: "Conflict not found" });
        }

        if (!conflict.autoResolvable) {
          return res
            .status(400)
            .json({ message: "Conflict is not auto-resolvable" });
        }

        // Actually resolve the conflict by applying changes
        let bestResolution;

        if (
          conflict.type === "capacity_exceeded" &&
          conflict.bookings.length > 0
        ) {
          const booking = conflict.bookings[0];

          // Find a suitable larger table
          const suitableTables = tables.filter(
            (t) => t.capacity >= booking.guestCount && t.id !== booking.tableId,
          );

          if (suitableTables.length > 0) {
            // Move to the largest available table
            const bestTable = suitableTables.sort(
              (a, b) => b.capacity - a.capacity,
            )[0];
            await storage.updateBooking(booking.id, {
              tableId: bestTable.id,
            });

            bestResolution = {
              id: `reassign-${booking.id}`,
              type: "reassign_table",
              description: `Moved to ${bestTable.name || `Table ${bestTable.table_number}`} (capacity: ${bestTable.capacity})`,
              impact: "low",
              confidence: 90,
              estimatedCustomerSatisfaction: 85,
              details: {
                newTableId: bestTable.id,
                newTableName:
                  bestTable.name || `Table ${bestTable.table_number}`,
                actuallyApplied: true,
              },
            };
          } else {
            // No single table can accommodate - move to largest available and note the issue
            const largestTable = tables.sort(
              (a, b) => b.capacity - a.capacity,
            )[0];
            if (largestTable && largestTable.id !== booking.tableId) {
              await storage.updateBooking(booking.id, {
                tableId: largestTable.id,
              });

              bestResolution = {
                id: `partial-resolve-${booking.id}`,
                type: "partial_solution",
                description: `Moved to largest available table ${largestTable.name || `Table ${largestTable.table_number}`} (capacity: ${largestTable.capacity}). Party size exceeds table capacity - staff attention required.`,
                impact: "moderate",
                confidence: 60,
                estimatedCustomerSatisfaction: 70,
                details: {
                  newTableId: largestTable.id,
                  newTableName:
                    largestTable.name || `Table ${largestTable.table_number}`,
                  actuallyApplied: true,
                  requiresStaffAttention: true,
                  capacityShortfall: booking.guestCount - largestTable.capacity,
                },
              };
            } else {
              bestResolution = {
                id: `split-party-${booking.id}`,
                type: "split_party",
                description: "Split large party across adjacent tables",
                impact: "moderate",
                confidence: 70,
                estimatedCustomerSatisfaction: 75,
                details: {
                  splitSuggested: true,
                  tablesNeeded: 2,
                  compensationSuggested: true,
                },
              };
            }
          }
        } else {
          bestResolution = {
            id: `resolve-${conflict.bookings[0]?.id || Date.now()}`,
            type: "manual_review",
            description: "Conflict marked for manual review",
            impact: "minimal",
            confidence: 100,
            estimatedCustomerSatisfaction: 90,
            details: { requiresStaffReview: true },
          };
        }

        res.json({
          message: "Conflict auto-resolved successfully",
          resolution: bestResolution,
          conflictId,
        });
      } catch (error) {
        console.error("Error auto-resolving conflict:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Manually resolve a conflict
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/:conflictId/resolve",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const conflictId = req.params.conflictId;
        const { resolutionId } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get the actual conflict to understand what needs to be resolved
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        const allConflicts = [
          ...ConflictDetector.detectTableDoubleBookings(bookings),
          ...ConflictDetector.detectCapacityExceeded(bookings, tables),
          ...ConflictDetector.detectTimeOverlaps(bookings),
        ];

        const conflict = allConflicts.find((c) => c.id === conflictId);
        if (!conflict) {
          return res.status(404).json({ message: "Conflict not found" });
        }

        // Find the resolution in the conflict's suggested resolutions
        const resolution = conflict.suggestedResolutions?.find(
          (r: any) => r.id === resolutionId,
        );
        if (!resolution) {
          return res.status(404).json({ message: "Resolution not found" });
        }

        // Actually apply the resolution to fix the conflict
        if (
          conflict.type === "capacity_exceeded" &&
          conflict.bookings.length > 0
        ) {
          const booking = conflict.bookings[0];

          // Find a suitable larger table
          const suitableTables = tables.filter(
            (t) => t.capacity >= booking.guestCount && t.id !== booking.tableId,
          );

          if (suitableTables.length > 0) {
            const bestTable = suitableTables.sort(
              (a, b) => b.capacity - a.capacity,
            )[0];
            await storage.updateBooking(booking.id, {
              tableId: bestTable.id,
            });

            resolution.description = `Moved to ${bestTable.name || `Table ${bestTable.table_number}`} (capacity: ${bestTable.capacity})`;
            resolution.details = {
              ...resolution.details,
              newTableId: bestTable.id,
              newTableName: bestTable.name || `Table ${bestTable.table_number}`,
              actuallyApplied: true,
            };
          } else {
            // No single table can accommodate - move to largest available
            const largestTable = tables.sort(
              (a, b) => b.capacity - a.capacity,
            )[0];
            if (largestTable && largestTable.id !== booking.tableId) {
              await storage.updateBooking(booking.id, {
                tableId: largestTable.id,
              });

              resolution.description = `Moved to largest available table ${largestTable.name || `Table ${largestTable.table_number}`} (capacity: ${largestTable.capacity}). Requires staff attention for ${booking.guestCount - largestTable.capacity} excess guests.`;
              resolution.details = {
                ...resolution.details,
                newTableId: largestTable.id,
                newTableName:
                  largestTable.name || `Table ${largestTable.table_number}`,
                actuallyApplied: true,
                requiresStaffAttention: true,
                capacityShortfall: booking.guestCount - largestTable.capacity,
              };
            }
          }
        }

        // Log the manual resolution
        await storage.createActivityLog({
          restaurantId,
          tenantId,
          eventType: "conflict_resolved",
          description: `Manually resolved conflict ${conflictId} using resolution ${resolutionId}`,
          source: "manual",
          createdAt: new Date(),
        });

        res.json({
          message: "Conflict resolved successfully",
          resolution,
          conflictId,
        });
      } catch (error) {
        console.error("Error resolving conflict:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Helper function to convert time to minutes
  function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Scan for new conflicts
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/scan",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Force refresh and scan for conflicts
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        const conflicts = [
          ...ConflictDetector.detectTableDoubleBookings(bookings),
          ...ConflictDetector.detectCapacityExceeded(bookings, tables),
          ...ConflictDetector.detectTimeOverlaps(bookings),
        ];

        res.json({
          message: "Conflict scan completed",
          conflictsFound: conflicts.length,
          conflicts,
        });
      } catch (error) {
        console.error("Error scanning for conflicts:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Auto-resolve a conflict
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/:conflictId/auto-resolve",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const conflictId = req.params.conflictId;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get current conflicts to find the specific one
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        const allConflicts = [
          ...ConflictDetector.detectTableDoubleBookings(bookings),
          ...ConflictDetector.detectCapacityExceeded(bookings, tables),
          ...ConflictDetector.detectTimeOverlaps(bookings),
        ];

        const conflict = allConflicts.find((c) => c.id === conflictId);
        if (!conflict) {
          return res.status(404).json({ message: "Conflict not found" });
        }

        if (!conflict.autoResolvable) {
          return res
            .status(400)
            .json({ message: "Conflict is not auto-resolvable" });
        }

        // Apply the best resolution automatically
        const bestResolution = conflict.suggestedResolutions[0];

        if (bestResolution.type === "reassign_table") {
          // Find available table and reassign
          const availableTables = tables.filter(
            (t) =>
              t.capacity >= conflict.bookings[0].guestCount &&
              t.id !== conflict.bookings[0].tableId,
          );

          if (availableTables.length > 0) {
            const newTable = availableTables[0];
            await storage.updateBooking(conflict.bookings[0].id, {
              tableId: newTable.id,
            });

            // Send notification to customer about table change
            if (emailService) {
              try {
                await emailService.sendBookingChangeNotification(
                  conflict.bookings[0].customerEmail,
                  conflict.bookings[0].customerName,
                  {
                    ...conflict.bookings[0],
                    tableName: newTable.name,
                    changeReason: "Table conflict resolved automatically",
                  },
                );
              } catch (emailError) {
                console.error(
                  "Failed to send change notification:",
                  emailError,
                );
              }
            }
          }
        } else if (bestResolution.type === "adjust_time") {
          // Adjust booking time
          await storage.updateBooking(conflict.bookings[0].id, {
            startTime: bestResolution.details.newTime,
          });

          // Send notification about time change
          if (emailService) {
            try {
              await emailService.sendBookingChangeNotification(
                conflict.bookings[0].customerEmail,
                conflict.bookings[0].customerName,
                {
                  ...conflict.bookings[0],
                  startTime: bestResolution.details.newTime,
                  changeReason: "Scheduling conflict resolved automatically",
                },
              );
            } catch (emailError) {
              console.error("Failed to send change notification:", emailError);
            }
          }
        }

        res.json({
          message: "Conflict auto-resolved successfully",
          resolution: bestResolution,
          conflictId,
        });
      } catch (error) {
        console.error("Error auto-resolving conflict:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Manually resolve a conflict
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/conflicts/:conflictId/resolve",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const conflictId = req.params.conflictId;
        const { resolutionId } = req.body;

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get the conflict and apply the selected resolution
        const bookings = await storage.getBookingsByRestaurant(restaurantId);
        const tables = await storage.getTablesByRestaurant(restaurantId);

        const allConflicts = [
          ...ConflictDetector.detectTableDoubleBookings(bookings),
          ...ConflictDetector.detectCapacityExceeded(bookings, tables),
          ...ConflictDetector.detectTimeOverlaps(bookings),
        ];

        const conflict = allConflicts.find((c) => c.id === conflictId);
        if (!conflict) {
          return res.status(404).json({ message: "Conflict not found" });
        }

        const resolution = conflict.suggestedResolutions.find(
          (r: any) => r.id === resolutionId,
        );
        if (!resolution) {
          return res.status(404).json({ message: "Resolution not found" });
        }

        // Apply the selected resolution
        if (
          resolution.type === "reassign_table" &&
          resolution.details.newTableId
        ) {
          await storage.updateBooking(conflict.bookings[0].id, {
            tableId: resolution.details.newTableId,
          });
        } else if (
          resolution.type === "adjust_time" &&
          resolution.details.newTime
        ) {
          await storage.updateBooking(conflict.bookings[0].id, {
            startTime: resolution.details.newTime,
          });
        }

        // Log the manual resolution
        await storage.createActivityLog({
          restaurantId,
          tenantId,
          eventType: "conflict_resolved",
          description: `Manually resolved conflict ${conflictId} using resolution ${resolutionId}`,
          source: "manual",
          createdAt: new Date(),
        });

        res.json({
          message: "Conflict resolved successfully",
          resolution,
          conflictId,
        });
      } catch (error) {
        console.error("Error resolving conflict:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Test downgrade validation endpoint
  app.post("/api/test/downgrade-validation", async (req, res) => {
    try {
      const { scenario } = req.body; // "high_tables", "high_bookings", "within_limits"

      // Mock different scenarios for testing
      let mockCurrentPlan = {
        id: 4,
        name: "Enterprise",
        maxTables: 100,
        maxBookingsPerMonth: 1000,
      };
      let mockTargetPlan = {
        id: 1,
        name: "Free",
        maxTables: 10,
        maxBookingsPerMonth: 20,
      };
      let mockTotalTables = 0;
      let mockCurrentBookings = 0;

      switch (scenario) {
        case "high_tables":
          mockTotalTables = 85; // Exceeds Free plan limit of 10
          mockCurrentBookings = 15; // Within Free plan limit of 20
          break;
        case "high_bookings":
          mockTotalTables = 8; // Within Free plan limit of 10
          mockCurrentBookings = 150; // Exceeds Free plan limit of 20
          break;
        case "both_exceeded":
          mockTotalTables = 85; // Exceeds Free plan limit of 10
          mockCurrentBookings = 150; // Exceeds Free plan limit of 20
          break;
        case "within_limits":
          mockTotalTables = 8; // Within Free plan limit of 10
          mockCurrentBookings = 15; // Within Free plan limit of 20
          break;
        default:
          return res.status(400).json({ error: "Invalid scenario" });
      }

      const tableExceeded = mockTotalTables > mockTargetPlan.maxTables;
      const bookingExceeded =
        mockCurrentBookings > mockTargetPlan.maxBookingsPerMonth;

      if (tableExceeded && bookingExceeded) {
        // Scenario: Both limits exceeded - comprehensive blocking
        return res.status(400).json({
          error: "Multiple limits exceeded",
          message: `❌ DOWNGRADE BLOCKED - You currently have ${mockTotalTables} tables (${mockTargetPlan.name} allows ${mockTargetPlan.maxTables}) and ${mockCurrentBookings} bookings this month (${mockTargetPlan.name} allows ${mockTargetPlan.maxBookingsPerMonth}). You must remove ${mockTotalTables - mockTargetPlan.maxTables} tables and wait until next month before downgrading.`,
          validationFailures: [
            {
              type: "table_limit",
              current: mockTotalTables,
              allowed: mockTargetPlan.maxTables,
              excess: mockTotalTables - mockTargetPlan.maxTables,
              action: `Must remove ${mockTotalTables - mockTargetPlan.maxTables} tables first`,
            },
            {
              type: "booking_limit",
              current: mockCurrentBookings,
              allowed: mockTargetPlan.maxBookingsPerMonth,
              excess: mockCurrentBookings - mockTargetPlan.maxBookingsPerMonth,
              action: "Must wait until next month",
            },
          ],
          currentPlan: mockCurrentPlan.name,
          targetPlan: mockTargetPlan.name,
          canDowngrade: false,
          requiresTableReduction: true,
          requiresBookingReduction: true,
        });
      }

      if (tableExceeded) {
        // Scenario: 85 tables active - Must remove 75 tables first
        return res.status(400).json({
          error: "Table limit exceeded",
          message: `❌ DOWNGRADE BLOCKED - Must remove ${mockTotalTables - mockTargetPlan.maxTables} tables first. You currently have ${mockTotalTables} tables, but the ${mockTargetPlan.name} plan allows only ${mockTargetPlan.maxTables} tables.`,
          validationFailures: [
            {
              type: "table_limit",
              current: mockTotalTables,
              allowed: mockTargetPlan.maxTables,
              excess: mockTotalTables - mockTargetPlan.maxTables,
              action: `Must remove ${mockTotalTables - mockTargetPlan.maxTables} tables first`,
            },
          ],
          currentPlan: mockCurrentPlan.name,
          targetPlan: mockTargetPlan.name,
          canDowngrade: false,
          requiresTableReduction: true,
          tableBreakdown: [
            { restaurantName: "Restaurant A", tableCount: 45 },
            { restaurantName: "Restaurant B", tableCount: 40 },
          ],
        });
      }

      if (bookingExceeded) {
        // Scenario: 150 bookings this month - Must wait until next month
        return res.status(400).json({
          error: "Booking limit exceeded",
          message: `❌ DOWNGRADE BLOCKED - Must wait until next month. You currently have ${mockCurrentBookings} bookings this month, but the ${mockTargetPlan.name} plan allows only ${mockTargetPlan.maxBookingsPerMonth} bookings per month.`,
          validationFailures: [
            {
              type: "booking_limit",
              current: mockCurrentBookings,
              allowed: mockTargetPlan.maxBookingsPerMonth,
              excess: mockCurrentBookings - mockTargetPlan.maxBookingsPerMonth,
              action: "Must wait until next month",
            },
          ],
          currentPlan: mockCurrentPlan.name,
          targetPlan: mockTargetPlan.name,
          canDowngrade: false,
          requiresBookingReduction: true,
          nextAllowedDowngrade: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            1,
          ).toISOString(),
        });
      }

      // Scenario: 8 tables, 15 bookings - DOWNGRADE ALLOWED
      return res.json({
        message: `✅ DOWNGRADE ALLOWED - Your current usage (${mockTotalTables} tables, ${mockCurrentBookings} bookings) is within the ${mockTargetPlan.name} plan limits (${mockTargetPlan.maxTables} tables, ${mockTargetPlan.maxBookingsPerMonth} bookings/month).`,
        validationResult: {
          canDowngrade: true,
          currentUsage: {
            tables: mockTotalTables,
            bookings: mockCurrentBookings,
          },
          newPlanLimits: {
            tables: mockTargetPlan.maxTables,
            bookings: mockTargetPlan.maxBookingsPerMonth,
          },
        },
        proceedWithDowngrade: true,
        requiresConfirmation: true,
      });
    } catch (error) {
      console.error("Error testing downgrade validation:", error);
      res.status(500).json({ error: "Failed to test downgrade validation" });
    }
  });

  // Account deletion endpoint
  app.delete("/api/account/delete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = req.user;

      // Get user's tenant to check subscription status
      const tenant = await storage.getTenantById(user.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Only allow deletion if subscription has ended or is canceled
      if (
        tenant.subscriptionStatus !== "ended" &&
        tenant.subscriptionStatus !== "canceled"
      ) {
        return res.status(403).json({
          message:
            "Account deletion is only allowed for ended or canceled subscriptions",
        });
      }

      // Delete user account and all associated data
      await storage.deleteUserAccount(user.id);

      // Destroy session
      req.logout((err) => {
        if (err) {
          console.error("Error logging out during account deletion:", err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Seating Configurations API routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seating-configurations",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const configurations = await storage.getSeatingConfigurationsByRestaurant(restaurantId);
        res.json(configurations);
      } catch (error) {
        console.error("Error fetching seating configurations:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seating-configurations",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const configurationData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const newConfiguration = await storage.createSeatingConfiguration(configurationData);
        res.json(newConfiguration);
      } catch (error) {
        console.error("Error creating seating configuration:", error);
        res.status(500).json({ message: "Failed to create seating configuration" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seating-configurations/:configId",
    validateTenant,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.configId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updatedConfiguration = await storage.updateSeatingConfiguration(configId, req.body);
        res.json(updatedConfiguration);
      } catch (error) {
        console.error("Error updating seating configuration:", error);
        res.status(500).json({ message: "Failed to update seating configuration" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/seating-configurations/:configId",
    validateTenant,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.configId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteSeatingConfiguration(configId);
        if (!success) {
          return res.status(404).json({ message: "Configuration not found" });
        }

        res.json({ message: "Seating configuration deleted successfully" });
      } catch (error) {
        console.error("Error deleting seating configuration:", error);
        res.status(500).json({ message: "Failed to delete seating configuration" });
      }
    }
  );

  // Periodic Criteria API routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/periodic-criteria",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const criteria = await storage.getPeriodicCriteriaByRestaurant(restaurantId);
        res.json(criteria);
      } catch (error) {
        console.error("Error fetching periodic criteria:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/periodic-criteria",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const criteriaData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const newCriteria = await storage.createPeriodicCriteria(criteriaData);
        res.json(newCriteria);
      } catch (error) {
        console.error("Error creating periodic criteria:", error);
        res.status(500).json({ message: "Failed to create periodic criteria" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/periodic-criteria/:criteriaId",
    validateTenant,
    async (req, res) => {
      try {
        const criteriaId = parseInt(req.params.criteriaId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updatedCriteria = await storage.updatePeriodicCriteria(criteriaId, req.body);
        res.json(updatedCriteria);
      } catch (error) {
        console.error("Error updating periodic criteria:", error);
        res.status(500).json({ message: "Failed to update periodic criteria" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/periodic-criteria/:criteriaId",
    validateTenant,
    async (req, res) => {
      try {
        const criteriaId = parseInt(req.params.criteriaId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deletePeriodicCriteria(criteriaId);
        if (!success) {
          return res.status(404).json({ message: "Criteria not found" });
        }

        res.json({ message: "Periodic criteria deleted successfully" });
      } catch (error) {
        console.error("Error deleting periodic criteria:", error);
        res.status(500).json({ message: "Failed to delete periodic criteria" });
      }
    }
  );

  // Custom Fields API routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/custom-fields",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const fields = await storage.getCustomFieldsByRestaurant(restaurantId);
        res.json(fields);
      } catch (error) {
        console.error("Error fetching custom fields:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/custom-fields",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const fieldData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const newField = await storage.createCustomField(fieldData);
        res.json(newField);
      } catch (error) {
        console.error("Error creating custom field:", error);
        res.status(500).json({ message: "Failed to create custom field" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/custom-fields/:fieldId",
    validateTenant,
    async (req, res) => {
      try {
        const fieldId = parseInt(req.params.fieldId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updatedField = await storage.updateCustomField(fieldId, req.body);
        res.json(updatedField);
      } catch (error) {
        console.error("Error updating custom field:", error);
        res.status(500).json({ message: "Failed to update custom field" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/custom-fields/:fieldId",
    validateTenant,
    async (req, res) => {
      try {
        const fieldId = parseInt(req.params.fieldId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteCustomField(fieldId);
        if (!success) {
          return res.status(404).json({ message: "Custom field not found" });
        }

        res.json({ message: "Custom field deleted successfully" });
      } catch (error) {
        console.error("Error deleting custom field:", error);
        res.status(500).json({ message: "Failed to delete custom field" });
      }
    }
  );

  // Booking Agents API routes
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/booking-agents",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const agents = await storage.getBookingAgentsByRestaurant(restaurantId);
        res.json(agents);
      } catch (error) {
        console.error("Error fetching booking agents:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/booking-agents",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const agentData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const newAgent = await storage.createBookingAgent(agentData);
        res.json(newAgent);
      } catch (error) {
        console.error("Error creating booking agent:", error);
        res.status(500).json({ message: "Failed to create booking agent" });
      }
    }
  );

  app.put(
    "/api/tenants/:tenantId/restaurants/:restaurantId/booking-agents/:agentId",
    validateTenant,
    async (req, res) => {
      try {
        const agentId = parseInt(req.params.agentId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updatedAgent = await storage.updateBookingAgent(agentId, req.body);
        res.json(updatedAgent);
      } catch (error) {
        console.error("Error updating booking agent:", error);
        res.status(500).json({ message: "Failed to update booking agent" });
      }
    }
  );

  app.delete(
    "/api/tenants/:tenantId/restaurants/:restaurantId/booking-agents/:agentId",
    validateTenant,
    async (req, res) => {
      try {
        const agentId = parseInt(req.params.agentId);
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const success = await storage.deleteBookingAgent(agentId);
        if (!success) {
          return res.status(404).json({ message: "Booking agent not found" });
        }

        res.json({ message: "Booking agent deleted successfully" });
      } catch (error) {
        console.error("Error deleting booking agent:", error);
        res.status(500).json({ message: "Failed to delete booking agent" });
      }
    }
  );

  // Product Groups API Routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/product-groups", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      
      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const productGroups = await storage.getProductGroupsByRestaurant(restaurantId);
      res.json(productGroups);
    } catch (error) {
      console.error("Error fetching product groups:", error);
      res.status(500).json({ message: "Failed to fetch product groups" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/product-groups", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { groupName, quantity, status } = req.body;
      
      if (!groupName) {
        return res.status(400).json({ message: "Group name is required" });
      }
      
      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const productGroup = await storage.createProductGroup({
        restaurantId,
        tenantId,
        groupName,
        quantity: quantity || 0,
        status: status || "active"
      });
      
      res.status(201).json(productGroup);
    } catch (error) {
      console.error("Error creating product group:", error);
      res.status(500).json({ message: "Failed to create product group" });
    }
  });

  app.put("/api/tenants/:tenantId/restaurants/:restaurantId/product-groups/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { groupName, quantity, status } = req.body;
      
      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const updatedGroup = await storage.updateProductGroup(id, {
        groupName,
        quantity,
        status
      });
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Product group not found" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating product group:", error);
      res.status(500).json({ message: "Failed to update product group" });
    }
  });

  app.delete("/api/tenants/:tenantId/restaurants/:restaurantId/product-groups/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      
      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      await storage.deleteProductGroup(id);
      res.json({ message: "Product group deleted successfully" });
    } catch (error) {
      console.error("Error deleting product group:", error);
      res.status(500).json({ message: "Failed to delete product group" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection established");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "subscribe" && data.restaurantId) {
          const restaurantKey = `restaurant_${data.restaurantId}`;

          if (!wsConnections.has(restaurantKey)) {
            wsConnections.set(restaurantKey, new Set());
          }

          wsConnections.get(restaurantKey)!.add(ws);
          console.log(
            `Client subscribed to restaurant ${data.restaurantId} notifications`,
          );

          ws.send(
            JSON.stringify({
              type: "subscription_confirmed",
              restaurantId: data.restaurantId,
            }),
          );
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      // Remove connection from all restaurant subscriptions
      wsConnections.forEach((connections, key) => {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(key);
        }
      });
      console.log("WebSocket connection closed");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Subscription Management Routes

  // Get subscription status for current tenant
  app.get(
    "/api/subscription/status",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const subscriptionStatus =
          await SubscriptionService.checkSubscriptionStatus(tenantUser.id);
        res.json(subscriptionStatus);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        res.status(500).json({ error: "Failed to check subscription status" });
      }
    },
  );

  // Create Stripe checkout session for subscription upgrade
  app.post(
    "/api/subscription/checkout",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const { planId } = req.body;
        if (!planId) {
          return res.status(400).json({ error: "Plan ID is required" });
        }

        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const baseUrl =
          process.env.NODE_ENV === "production"
            ? `https://${req.get("host")}`
            : `http://${req.get("host")}`;

        const successUrl = `${baseUrl}/subscription/success`;
        const cancelUrl = `${baseUrl}/subscription/cancel`;

        const session = await SubscriptionService.createCheckoutSession(
          tenantUser.id,
          planId,
          successUrl,
          cancelUrl,
        );

        res.json(session);
      } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
      }
    },
  );

  // Stripe webhook handler
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_webhook_secret",
      );
    } catch (err: any) {
      console.log(`Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await SubscriptionService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      console.error("Error handling webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Simulate successful payment (for testing)
  app.post(
    "/api/subscription/simulate-payment",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const { planId } = req.body;
        if (!planId) {
          return res.status(400).json({ error: "Plan ID is required" });
        }

        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Simulate successful payment
        const result = await SubscriptionService.simulateSuccessfulPayment(
          tenantUser.id,
          planId,
        );

        console.log(
          `Simulated successful payment for tenant ${tenantUser.id}, plan ${planId}`,
        );
        res.json({
          success: true,
          message: "Payment simulation successful",
          subscription: result,
        });
      } catch (error) {
        console.error("Error simulating payment:", error);
        res.status(500).json({ error: "Failed to simulate payment" });
      }
    },
  );

  // Subscribe to a plan (upgrade subscription)
  app.post(
    "/api/subscription/subscribe",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const { planId } = req.body;
        if (!planId) {
          return res.status(400).json({ error: "Plan ID is required" });
        }

        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const plan = await storage.getSubscriptionPlanById(planId);
        if (!plan) {
          return res.status(404).json({ error: "Subscription plan not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);

        // Check for downgrade validation
        if (tenant?.subscriptionPlanId) {
          const currentPlan = await storage.getSubscriptionPlanById(
            tenant.subscriptionPlanId,
          );
          const isDowngrade =
            currentPlan &&
            plan.maxTables &&
            currentPlan.maxTables &&
            (plan.maxTables < currentPlan.maxTables ||
              plan.maxBookingsPerMonth < currentPlan.maxBookingsPerMonth);

          if (isDowngrade) {
            // Get all restaurants for this tenant
            const restaurants = await storage.getRestaurantsByTenantId(
              tenantUser.id,
            );
            let totalTables = 0;
            const restaurantTableBreakdown = [];

            // Count total tables across all restaurants
            for (const restaurant of restaurants) {
              const restaurantTables = await storage.getTablesByRestaurant(
                restaurant.id,
              );
              totalTables += restaurantTables.length;
              restaurantTableBreakdown.push({
                restaurantName: restaurant.name,
                tableCount: restaurantTables.length,
              });
            }

            // Get current booking count for this month (with simulation override)
            const actualBookingCount =
              await storage.getBookingCountForTenantThisMonth(tenantUser.id);
            const currentBookingCount = simulateNextMonth
              ? 0
              : actualBookingCount;
            const newPlanTableLimit = plan.maxTables || 10;
            const newPlanBookingLimit = plan.maxBookingsPerMonth || 100;

            const tableExceeded = totalTables > newPlanTableLimit;
            const bookingExceeded = currentBookingCount > newPlanBookingLimit;

            if (tableExceeded && bookingExceeded) {
              // Both limits exceeded - comprehensive blocking
              return res.status(400).json({
                error: "Multiple limits exceeded",
                message: `❌ DOWNGRADE BLOCKED - You currently have ${totalTables} tables (${plan.name} allows ${newPlanTableLimit}) and ${currentBookingCount} bookings this month (${plan.name} allows ${newPlanBookingLimit}). You must remove ${totalTables - newPlanTableLimit} tables and wait until next month before downgrading.`,
                validationFailures: [
                  {
                    type: "table_limit",
                    current: totalTables,
                    allowed: newPlanTableLimit,
                    excess: totalTables - newPlanTableLimit,
                    action: `Must remove ${totalTables - newPlanTableLimit} tables first`,
                  },
                  {
                    type: "booking_limit",
                    current: currentBookingCount,
                    allowed: newPlanBookingLimit,
                    excess: currentBookingCount - newPlanBookingLimit,
                    action: "Must wait until next month",
                  },
                ],
                currentPlan: currentPlan.name,
                targetPlan: plan.name,
                canDowngrade: false,
                requiresTableReduction: true,
                requiresBookingReduction: true,
              });
            }

            if (tableExceeded) {
              // Table limit exceeded - Must remove tables first
              return res.status(400).json({
                error: "Table limit exceeded",
                message: `❌ DOWNGRADE BLOCKED - Must remove ${totalTables - newPlanTableLimit} tables first. You currently have ${totalTables} tables, but the ${plan.name} plan allows only ${newPlanTableLimit} tables.`,
                validationFailures: [
                  {
                    type: "table_limit",
                    current: totalTables,
                    allowed: newPlanTableLimit,
                    excess: totalTables - newPlanTableLimit,
                    action: `Must remove ${totalTables - newPlanTableLimit} tables first`,
                  },
                ],
                currentPlan: currentPlan.name,
                targetPlan: plan.name,
                canDowngrade: false,
                requiresTableReduction: true,
                tableBreakdown: restaurantTableBreakdown,
              });
            }

            if (bookingExceeded) {
              // Booking limit exceeded - Must wait until next month
              return res.status(400).json({
                error: "Booking limit exceeded",
                message: `❌ DOWNGRADE BLOCKED - Must wait until next month. You currently have ${currentBookingCount} bookings this month, but the ${plan.name} plan allows only ${newPlanBookingLimit} bookings per month.`,
                validationFailures: [
                  {
                    type: "booking_limit",
                    current: currentBookingCount,
                    allowed: newPlanBookingLimit,
                    excess: currentBookingCount - newPlanBookingLimit,
                    action: "Must wait until next month",
                  },
                ],
                currentPlan: currentPlan.name,
                targetPlan: plan.name,
                canDowngrade: false,
                requiresBookingReduction: true,
                nextAllowedDowngrade: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth() + 1,
                  1,
                ).toISOString(),
              });
            }
          }
        }

        // For free plans, update directly
        if (plan.price === 0) {
          await storage.updateTenant(tenantUser.id, {
            subscriptionPlanId: plan.id,
            subscriptionStatus: "active",
            subscriptionStartDate: new Date(),
            subscriptionEndDate: null,
          });

          // Send notification email for subscription change
          try {
            await emailService.sendSubscriptionChangeNotification(
              "admin@restaurant.com",
              "liridon.salihi123@gmail.com",
              tenant?.subscriptionPlanId && tenant.subscriptionPlanId > plan.id
                ? "downgrade"
                : "upgrade",
              tenantUser.name || "Restaurant",
              `Subscription ${tenant?.subscriptionPlanId && tenant.subscriptionPlanId > plan.id ? "downgraded" : "upgraded"} - ${tenantUser.name || "Restaurant"}`,
            );
          } catch (emailError) {
            console.error(
              "Failed to send subscription notification email:",
              emailError,
            );
          }

          const isDowngrade =
            tenant?.subscriptionPlanId && tenant.subscriptionPlanId > plan.id;
          return res.json({
            success: true,
            message: `Successfully ${isDowngrade ? "downgraded" : "upgraded"} to ${plan.name} plan`,
            plan: {
              id: plan.id,
              name: plan.name,
              price: plan.price,
              interval: plan.interval,
            },
          });
        }

        // For paid plans, check if user has payment method
        let customerId = tenant?.stripeCustomerId;

        if (!customerId) {
          // Create Stripe customer if doesn't exist
          const customer = await stripe.customers.create({
            email: req.user.email,
            name: req.user.name,
            metadata: {
              tenantId: tenantUser.id.toString(),
            },
          });

          await storage.updateTenant(tenantUser.id, {
            stripeCustomerId: customer.id,
          });

          customerId = customer.id;
        }

        // Check if customer has saved payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
        });

        if (paymentMethods.data.length === 0) {
          // No payment method - require adding one first
          return res.json({
            success: false,
            requiresPaymentMethod: true,
            message:
              "Please add a payment method first to upgrade to a paid plan",
          });
        }

        // Has payment method - proceed with subscription
        if (tenant?.stripeSubscriptionId) {
          // Update existing subscription
          const subscription = await stripe.subscriptions.retrieve(
            tenant.stripeSubscriptionId,
          );

          // Check if subscription is cancelled and reactivate it
          const isCancelled =
            tenant.subscriptionStatus === "cancelled" ||
            subscription.cancel_at_period_end;

          // First create a Stripe product and price
          const product = await stripe.products.create({
            name: plan.name,
            description: `${plan.name} subscription plan`,
          });

          const price = await stripe.prices.create({
            currency: "usd",
            unit_amount: plan.price,
            recurring: {
              interval: "month",
            },
            product: product.id,
          });

          const updateData: any = {
            items: [
              {
                id: subscription.items.data[0].id,
                price: price.id,
              },
            ],
            proration_behavior: "always_invoice",
          };

          // If subscription is cancelled, reactivate it
          if (isCancelled) {
            updateData.cancel_at_period_end = false;
          }

          const updatedSubscription = await stripe.subscriptions.update(
            tenant.stripeSubscriptionId,
            updateData,
          );

          // Get the subscription end date from Stripe
          let subscriptionEndDate = null;
          if (
            updatedSubscription.current_period_end &&
            typeof updatedSubscription.current_period_end === "number" &&
            updatedSubscription.current_period_end > 0
          ) {
            subscriptionEndDate = new Date(
              updatedSubscription.current_period_end * 1000,
            );

            // Validate the date is valid
            if (isNaN(subscriptionEndDate.getTime())) {
              console.error(
                "Invalid date created from Stripe timestamp:",
                updatedSubscription.current_period_end,
              );
              subscriptionEndDate = null;
            }
          }

          // Check for downgrade scenario and enforce comprehensive limits
          const currentPlan = await storage.getSubscriptionPlanById(
            tenant.subscriptionPlanId || 1,
          );
          const isDowngrade =
            currentPlan &&
            plan.maxTables &&
            currentPlan.maxTables &&
            (plan.maxTables < currentPlan.maxTables ||
              plan.maxBookingsPerMonth < currentPlan.maxBookingsPerMonth);

          if (isDowngrade) {
            // Get all restaurants for this tenant
            const restaurants = await storage.getRestaurantsByTenantId(
              tenantUser.id,
            );
            let totalTables = 0;
            const restaurantTableBreakdown = [];

            // Count total tables across all restaurants
            for (const restaurant of restaurants) {
              const restaurantTables = await storage.getTablesByRestaurant(
                restaurant.id,
              );
              totalTables += restaurantTables.length;
              restaurantTableBreakdown.push({
                restaurantName: restaurant.name,
                tableCount: restaurantTables.length,
              });
            }

            // Get current booking count for this month
            const currentBookingCount =
              await storage.getBookingCountForTenantThisMonth(tenantUser.id);
            const newPlanBookingLimit = plan.maxBookingsPerMonth || 100;

            // Check both limits and provide specific blocking scenarios
            const tableExceeded = totalTables > plan.maxTables;
            const bookingExceeded = currentBookingCount > newPlanBookingLimit;

            if (tableExceeded && bookingExceeded) {
              // Scenario: Both limits exceeded - comprehensive blocking
              return res.status(400).json({
                error: "Multiple limits exceeded",
                message: `❌ DOWNGRADE BLOCKED - You currently have ${totalTables} tables (${plan.name} allows ${plan.maxTables}) and ${currentBookingCount} bookings this month (${plan.name} allows ${newPlanBookingLimit}). You must remove ${totalTables - plan.maxTables} tables and wait until next month before downgrading.`,
                validationFailures: [
                  {
                    type: "table_limit",
                    current: totalTables,
                    allowed: plan.maxTables,
                    excess: totalTables - plan.maxTables,
                    action: `Must remove ${totalTables - plan.maxTables} tables first`,
                  },
                  {
                    type: "booking_limit",
                    current: currentBookingCount,
                    allowed: newPlanBookingLimit,
                    excess: currentBookingCount - newPlanBookingLimit,
                    action: "Must wait until next month",
                  },
                ],
                currentPlan: currentPlan.name,
                targetPlan: plan.name,
                canDowngrade: false,
                requiresTableReduction: true,
                requiresBookingReduction: true,
              });
            }

            if (tableExceeded) {
              // Scenario: 85 tables active - Must remove 75 tables first
              return res.status(400).json({
                error: "Table limit exceeded",
                message: `❌ DOWNGRADE BLOCKED - Must remove ${totalTables - plan.maxTables} tables first. You currently have ${totalTables} tables, but the ${plan.name} plan allows only ${plan.maxTables} tables.`,
                validationFailures: [
                  {
                    type: "table_limit",
                    current: totalTables,
                    allowed: plan.maxTables,
                    excess: totalTables - plan.maxTables,
                    action: `Must remove ${totalTables - plan.maxTables} tables first`,
                  },
                ],
                currentPlan: currentPlan.name,
                targetPlan: plan.name,
                canDowngrade: false,
                requiresTableReduction: true,
                tableBreakdown: restaurantTableBreakdown,
              });
            }

            if (bookingExceeded) {
              // Scenario: 150 bookings this month - Must wait until next month
              return res.status(400).json({
                error: "Booking limit exceeded",
                message: `❌ DOWNGRADE BLOCKED - Must wait until next month. You currently have ${currentBookingCount} bookings this month, but the ${plan.name} plan allows only ${newPlanBookingLimit} bookings per month.`,
                validationFailures: [
                  {
                    type: "booking_limit",
                    current: currentBookingCount,
                    allowed: newPlanBookingLimit,
                    excess: currentBookingCount - newPlanBookingLimit,
                    action: "Must wait until next month",
                  },
                ],
                currentPlan: currentPlan.name,
                targetPlan: plan.name,
                canDowngrade: false,
                requiresBookingReduction: true,
                nextAllowedDowngrade: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth() + 1,
                  1,
                ).toISOString(),
              });
            }
          }

          // Update tenant with new plan and reactivate if needed
          const tenantUpdateData: any = {
            subscriptionPlanId: plan.id,
            subscriptionStatus: "active",
            subscriptionStartDate: new Date(),
          };

          if (subscriptionEndDate) {
            tenantUpdateData.subscriptionEndDate = subscriptionEndDate;
          }

          await storage.updateTenant(tenantUser.id, tenantUpdateData);

          // Send admin notification for subscription change
          if (emailService && req.user.email) {
            try {
              const currentPlan = await storage.getSubscriptionPlanById(
                tenant.subscriptionPlanId || 1,
              );
              const action = isCancelled
                ? "reactivate"
                : isDowngrade
                  ? "downgrade"
                  : "upgrade";
              await emailService.sendSubscriptionChangeNotification({
                tenantName: tenant.name,
                customerEmail: req.user.email || "",
                customerName: req.user.name || "",
                action: action,
                fromPlan: currentPlan?.name || "Free",
                toPlan: plan.name,
                amount: plan.price / 100,
                currency: "$",
              });
            } catch (error) {
              console.error("Failed to send admin notification:", error);
            }
          }

          const message = isCancelled
            ? `Successfully upgraded to ${plan.name} plan and reactivated your subscription!`
            : `Successfully upgraded to ${plan.name} plan. Changes are effective immediately with prorated billing.`;

          return res.json({
            success: true,
            message,
            plan: {
              id: plan.id,
              name: plan.name,
              price: plan.price,
              interval: plan.interval,
            },
          });
        } else {
          // Create new subscription with existing product and price
          const product = await stripe.products.create({
            name: plan.name,
            description: `${plan.name} subscription plan`,
          });

          const price = await stripe.prices.create({
            currency: "usd",
            unit_amount: plan.price,
            recurring: {
              interval: "month",
            },
            product: product.id,
          });

          const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [
              {
                price: price.id,
              },
            ],
            default_payment_method: paymentMethods.data[0].id,
            expand: ["latest_invoice.payment_intent"],
          });

          // Update tenant with subscription details
          const currentPeriodStart = (subscription as any).current_period_start;
          const currentPeriodEnd = (subscription as any).current_period_end;
          const subscriptionStartDate = currentPeriodStart
            ? new Date(currentPeriodStart * 1000)
            : new Date();
          const subscriptionEndDate = currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000)
            : null;

          await storage.updateTenant(tenantUser.id, {
            subscriptionPlanId: plan.id,
            subscriptionStatus: "active",
            stripeSubscriptionId: subscription.id,
            subscriptionStartDate,
            ...(subscriptionEndDate && { subscriptionEndDate }),
          });

          return res.json({
            success: true,
            message: `Successfully subscribed to ${plan.name} plan!`,
            plan: {
              id: plan.id,
              name: plan.name,
              price: plan.price,
              interval: plan.interval,
            },
          });
        }
      } catch (error) {
        console.error("Error subscribing to plan:", error);
        res.status(500).json({ error: "Failed to subscribe to plan" });
      }
    },
  );

  // Get current subscription details
  app.get(
    "/api/subscription/details",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);
        const plan = tenant?.subscriptionPlanId
          ? await storage.getSubscriptionPlanById(tenant.subscriptionPlanId)
          : null;

        // Get real-time subscription data from Stripe if subscription exists
        let stripeSubscriptionEndDate = tenant?.subscriptionEndDate;
        let stripeSubscriptionStatus = tenant?.subscriptionStatus;

        if (tenant?.stripeSubscriptionId) {
          try {
            const stripeSubscription = await stripe.subscriptions.retrieve(
              tenant.stripeSubscriptionId,
              {
                expand: ["items.data.plan"],
              },
            );

            // Get billing period from subscription items (where the actual periods are stored)
            let endTimestamp = stripeSubscription.current_period_end;

            // If not found in main subscription, check the subscription items
            if (
              !endTimestamp &&
              stripeSubscription.items &&
              stripeSubscription.items.data.length > 0
            ) {
              const firstItem = stripeSubscription.items.data[0];
              endTimestamp = firstItem.current_period_end;
            }

            // Validate and convert Stripe timestamp to Date
            if (
              endTimestamp &&
              typeof endTimestamp === "number" &&
              endTimestamp > 0
            ) {
              stripeSubscriptionEndDate = new Date(endTimestamp * 1000);

              // Validate the date is valid
              if (isNaN(stripeSubscriptionEndDate.getTime())) {
                console.error(
                  "Invalid date created from Stripe timestamp:",
                  endTimestamp,
                );
                stripeSubscriptionEndDate = tenant?.subscriptionEndDate; // Fall back to existing date
              }
            }

            // Map Stripe status to our internal status
            if (
              stripeSubscription.status === "active" &&
              !stripeSubscription.cancel_at_period_end
            ) {
              stripeSubscriptionStatus = "active";
            } else if (stripeSubscription.cancel_at_period_end) {
              stripeSubscriptionStatus = "cancelled";
            } else {
              stripeSubscriptionStatus = stripeSubscription.status;
            }

            // Only update database if we have valid data and it's different from current
            if (
              stripeSubscriptionStatus !== tenant?.subscriptionStatus ||
              (stripeSubscriptionEndDate &&
                stripeSubscriptionEndDate.getTime() !==
                  tenant?.subscriptionEndDate?.getTime())
            ) {
              const updateData: any = {
                subscriptionStatus: stripeSubscriptionStatus,
              };

              // Only include end date if it's valid
              if (
                stripeSubscriptionEndDate &&
                !isNaN(stripeSubscriptionEndDate.getTime())
              ) {
                updateData.subscriptionEndDate = stripeSubscriptionEndDate;
              }

              await storage.updateTenant(tenantUser.id, updateData);
            }
          } catch (stripeError) {
            console.error("Error fetching Stripe subscription:", stripeError);
            // Fall back to local data if Stripe call fails
          }
        }

        // Calculate current usage statistics
        let usage = null;
        if (tenant) {
          // Count total tables across all restaurants for this tenant
          const restaurants = await storage.getRestaurantsByTenantId(tenant.id);
          let totalTables = 0;
          for (const restaurant of restaurants) {
            const restaurantTables = await storage.getTablesByRestaurant(
              restaurant.id,
            );
            totalTables += restaurantTables.length;
          }

          // Count bookings for this month
          const bookingsThisMonth =
            await storage.getBookingCountForTenantThisMonth(tenant.id);

          usage = {
            totalTables,
            bookingsThisMonth,
            totalRestaurants: restaurants.length,
          };
        }

        res.json({
          tenant: {
            id: tenant?.id,
            name: tenant?.name,
            subscriptionStatus: stripeSubscriptionStatus,
            trialStartDate: tenant?.trialStartDate,
            trialEndDate: tenant?.trialEndDate,
            subscriptionStartDate: tenant?.subscriptionStartDate,
            subscriptionEndDate: stripeSubscriptionEndDate,
          },
          plan: plan
            ? {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                interval: plan.interval,
                features: JSON.parse(plan.features || "[]"),
                maxTables: plan.maxTables,
                maxBookingsPerMonth: plan.maxBookingsPerMonth,
                maxRestaurants: plan.maxRestaurants,
              }
            : null,
          usage,
        });
      } catch (error) {
        console.error("Error getting subscription details:", error);
        res.status(500).json({ error: "Failed to get subscription details" });
      }
    },
  );

  // Billing Management Routes

  // Get billing information
  app.get(
    "/api/billing/info",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);

        let stripeCustomer = null;
        let paymentMethods = [];
        let upcomingInvoice = null;

        if (tenant?.stripeCustomerId) {
          try {
            // Get Stripe customer
            stripeCustomer = await stripe.customers.retrieve(
              tenant.stripeCustomerId,
            );

            // Get payment methods
            const paymentMethodsList = await stripe.paymentMethods.list({
              customer: tenant.stripeCustomerId,
              type: "card",
            });
            paymentMethods = paymentMethodsList.data;

            // Get upcoming invoice if there's an active subscription
            if (tenant.stripeSubscriptionId) {
              try {
                upcomingInvoice = await stripe.invoices.retrieveUpcoming({
                  customer: tenant.stripeCustomerId,
                });
              } catch (error) {
                console.log("No upcoming invoice found");
              }
            }
          } catch (error) {
            console.error("Error fetching Stripe data:", error);
          }
        }

        res.json({
          customer: stripeCustomer,
          paymentMethods,
          upcomingInvoice,
          subscriptionStatus: tenant?.subscriptionStatus,
          stripeSubscriptionId: tenant?.stripeSubscriptionId,
        });
      } catch (error) {
        console.error("Error getting billing info:", error);
        res.status(500).json({ error: "Failed to get billing information" });
      }
    },
  );

  // Create setup intent for adding payment method
  app.post(
    "/api/billing/setup-intent",
    attachUser,
    async (req: Request, res: Response) => {
      console.log("Setup intent endpoint called, user:", req.user?.id);

      // Set proper response headers
      res.setHeader("Content-Type", "application/json");

      if (!req.user) {
        console.log("No user found in request");
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);
        let customerId = tenant?.stripeCustomerId;

        // Create Stripe customer if doesn't exist
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: req.user.email,
            name: req.user.name,
            metadata: {
              tenantId: tenantUser.id.toString(),
            },
          });

          await storage.updateTenant(tenantUser.id, {
            stripeCustomerId: customer.id,
          });

          customerId = customer.id;
        }

        // Create setup intent
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ["card"],
          usage: "off_session",
        });

        console.log(
          "Setup intent created successfully for customer:",
          customerId,
        );

        return res.json({
          clientSecret: setupIntent.client_secret,
          customerId,
        });
      } catch (error) {
        console.error("Error creating setup intent:", error);
        return res.status(500).json({ error: "Failed to create setup intent" });
      }
    },
  );

  // Get invoices
  app.get(
    "/api/billing/invoices",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);

        if (!tenant?.stripeCustomerId) {
          return res.json({ invoices: [] });
        }

        const invoices = await stripe.invoices.list({
          customer: tenant.stripeCustomerId,
          limit: 100,
        });

        // Get current subscription data to use for correcting period dates
        let currentPeriodStart = null;
        let currentPeriodEnd = null;

        if (tenant.stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              tenant.stripeSubscriptionId,
              {
                expand: ["items.data.plan"],
              },
            );

            // Get current billing period from subscription items
            if (subscription.items && subscription.items.data.length > 0) {
              const firstItem = subscription.items.data[0];
              currentPeriodStart = firstItem.current_period_start;
              currentPeriodEnd = firstItem.current_period_end;
            }
          } catch (error) {
            console.log(
              "Could not fetch current subscription data for period correction",
            );
          }
        }

        res.json({
          invoices: invoices.data.map((invoice) => {
            // Use current subscription periods for the most recent invoice if available
            let periodStart = invoice.period_start;
            let periodEnd = invoice.period_end;

            // If this is the most recent invoice and we have current subscription data, use it
            if (
              currentPeriodStart &&
              currentPeriodEnd &&
              invoices.data.indexOf(invoice) === 0
            ) {
              // Most recent invoice
              periodStart = currentPeriodStart;
              periodEnd = currentPeriodEnd;
            }

            return {
              id: invoice.id,
              amount_paid: invoice.amount_paid,
              amount_due: invoice.amount_due,
              currency: invoice.currency,
              status: invoice.status,
              created: invoice.created,
              period_start: periodStart,
              period_end: periodEnd,
              hosted_invoice_url: invoice.hosted_invoice_url,
              invoice_pdf: invoice.invoice_pdf,
              number: invoice.number,
              description: invoice.description,
            };
          }),
        });
      } catch (error) {
        console.error("Error getting invoices:", error);
        res.status(500).json({ error: "Failed to get invoices" });
      }
    },
  );

  // Delete payment method
  app.delete(
    "/api/billing/payment-method/:id",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const paymentMethodId = req.params.id;

        await stripe.paymentMethods.detach(paymentMethodId);

        res.json({ success: true, message: "Payment method removed" });
      } catch (error) {
        console.error("Error removing payment method:", error);
        res.status(500).json({ error: "Failed to remove payment method" });
      }
    },
  );

  // Update default payment method
  app.put(
    "/api/billing/default-payment-method",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const { paymentMethodId } = req.body;

        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);

        if (!tenant?.stripeCustomerId) {
          return res.status(400).json({ error: "No Stripe customer found" });
        }

        // Update customer's default payment method
        await stripe.customers.update(tenant.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // If there's an active subscription, update its default payment method
        if (tenant.stripeSubscriptionId) {
          await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
            default_payment_method: paymentMethodId,
          });
        }

        res.json({ success: true, message: "Default payment method updated" });
      } catch (error) {
        console.error("Error updating default payment method:", error);
        res
          .status(500)
          .json({ error: "Failed to update default payment method" });
      }
    },
  );

  // Cancel subscription
  app.post(
    "/api/billing/cancel-subscription",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);

        if (!tenant?.stripeSubscriptionId) {
          return res
            .status(400)
            .json({ error: "No active subscription found" });
        }

        // Cancel subscription at period end
        const subscription = await stripe.subscriptions.update(
          tenant.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          },
        );

        // Get the subscription end date from Stripe
        let subscriptionEndDate = null;
        if (
          subscription.current_period_end &&
          typeof subscription.current_period_end === "number" &&
          subscription.current_period_end > 0
        ) {
          subscriptionEndDate = new Date(
            subscription.current_period_end * 1000,
          );

          // Validate the date is valid
          if (isNaN(subscriptionEndDate.getTime())) {
            console.error(
              "Invalid date created from Stripe timestamp:",
              subscription.current_period_end,
            );
            subscriptionEndDate = null;
          }
        }

        const updateData: any = {
          subscriptionStatus: "cancelled",
        };

        // Only include end date if it's valid
        if (subscriptionEndDate) {
          updateData.subscriptionEndDate = subscriptionEndDate;
        }

        await storage.updateTenant(tenantUser.id, updateData);

        // Send admin notification for subscription cancellation
        if (emailService && req.user.email) {
          try {
            const currentPlan = await storage.getSubscriptionPlanById(
              tenant.subscriptionPlanId || 1,
            );
            await emailService.sendSubscriptionChangeNotification({
              tenantName: tenant.name,
              customerEmail: req.user.email || "",
              customerName: req.user.name || "",
              action: "cancel",
              fromPlan: currentPlan?.name || "Free",
            });
          } catch (error) {
            console.error("Failed to send admin notification:", error);
          }
        }

        res.json({
          success: true,
          message:
            "Subscription will be cancelled at the end of the billing period",
          cancelAt: subscription.cancel_at,
          endDate: subscriptionEndDate,
        });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ error: "Failed to cancel subscription" });
      }
    },
  );

  // Reactivate subscription
  app.post(
    "/api/billing/reactivate-subscription",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const tenant = await storage.getTenantById(tenantUser.id);

        if (!tenant?.stripeSubscriptionId) {
          return res.status(400).json({ error: "No subscription found" });
        }

        // Reactivate subscription
        const subscription = await stripe.subscriptions.update(
          tenant.stripeSubscriptionId,
          {
            cancel_at_period_end: false,
          },
        );

        // Get the current subscription end date from Stripe
        let subscriptionEndDate = null;
        if (
          subscription.current_period_end &&
          typeof subscription.current_period_end === "number" &&
          subscription.current_period_end > 0
        ) {
          subscriptionEndDate = new Date(
            subscription.current_period_end * 1000,
          );

          // Validate the date is valid
          if (isNaN(subscriptionEndDate.getTime())) {
            console.error(
              "Invalid date created from Stripe timestamp:",
              subscription.current_period_end,
            );
            subscriptionEndDate = null;
          }
        }

        const updateData: any = {
          subscriptionStatus: "active",
        };

        // Update with current billing period end date
        if (subscriptionEndDate) {
          updateData.subscriptionEndDate = subscriptionEndDate;
        }

        await storage.updateTenant(tenantUser.id, updateData);

        // Send admin notification for subscription reactivation
        if (emailService && req.user.email) {
          try {
            const currentPlan = await storage.getSubscriptionPlanById(
              tenant.subscriptionPlanId || 1,
            );
            await emailService.sendSubscriptionChangeNotification({
              tenantName: tenant.name,
              customerEmail: req.user.email || "",
              customerName: req.user.name || "",
              action: "reactivate",
              fromPlan: currentPlan?.name || "Free",
            });
          } catch (error) {
            console.error("Failed to send admin notification:", error);
          }
        }

        res.json({
          success: true,
          message: "Subscription reactivated successfully",
          endDate: subscriptionEndDate,
        });
      } catch (error) {
        console.error("Error reactivating subscription:", error);
        res.status(500).json({ error: "Failed to reactivate subscription" });
      }
    },
  );

  // Test email endpoint for debugging
  app.post(
    "/api/test-email",
    attachUser,
    async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!emailService) {
        return res.status(500).json({ error: "Email service not available" });
      }

      try {
        const { testEmail } = req.body;
        const emailToTest = testEmail || req.user.email;

        if (!emailToTest) {
          return res.status(400).json({ error: "No email address provided" });
        }

        console.log(`Testing email delivery to: ${emailToTest}`);

        await emailService.sendSubscriptionChangeNotification({
          tenantName: "Test Restaurant",
          customerEmail: emailToTest,
          customerName: req.user.name || "Test User",
          action: "upgrade",
          fromPlan: "Free",
          toPlan: "Professional",
          amount: 29,
          currency: "$",
        });

        res.json({
          success: true,
          message: `Test email sent to ${emailToTest}. Check your inbox and spam folder.`,
          emailAddress: emailToTest,
        });
      } catch (error) {
        console.error("Error sending test email:", error);
        res
          .status(500)
          .json({ error: "Failed to send test email", details: error.message });
      }
    },
  );

  // Test endpoint to simulate next month for downgrade testing
  app.post(
    "/api/test/simulate-next-month",
    attachUser,
    async (req: Request, res: Response) => {
      try {
        const tenantUser = await storage.getTenantByUserId(req.user.id);
        if (!tenantUser) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Get current booking count
        const currentBookingCount =
          await storage.getBookingCountForTenantThisMonth(tenantUser.id);

        res.json({
          success: true,
          message: "Next month simulation ready",
          currentMonth: {
            bookings: currentBookingCount,
            month: new Date().toLocaleString("default", {
              month: "long",
              year: "numeric",
            }),
          },
          nextMonth: {
            bookings: 0,
            month: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1,
            ).toLocaleString("default", { month: "long", year: "numeric" }),
          },
          instructions:
            "Now test your downgrade - the system will temporarily simulate 0 bookings for this month",
        });
      } catch (error) {
        console.error("Simulate next month error:", error);
        res.status(500).json({ error: "Failed to simulate next month" });
      }
    },
  );

  // Temporary override for testing - when this flag is set, return 0 bookings
  let simulateNextMonth = false;

  app.post(
    "/api/test/enable-next-month-simulation",
    attachUser,
    async (req: Request, res: Response) => {
      simulateNextMonth = true;
      res.json({
        success: true,
        message: "Next month simulation enabled - booking count will be 0",
      });
    },
  );

  app.post(
    "/api/test/disable-next-month-simulation",
    attachUser,
    async (req: Request, res: Response) => {
      simulateNextMonth = false;
      res.json({
        success: true,
        message:
          "Next month simulation disabled - normal booking count restored",
      });
    },
  );

  // Legacy waiting list routes for backward compatibility
  app.get("/api/restaurants/:restaurantId/waiting-list", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const waitingList =
        await storage.getWaitingListByRestaurant(restaurantId);
      res.json(waitingList);
    } catch (error) {
      console.error("Error fetching waiting list:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/restaurants/:restaurantId/waiting-list", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      // This is a legacy route, we need to get the tenant ID from the restaurant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const entryData = {
        ...req.body,
        restaurantId,
        tenantId: restaurant.tenantId,
      };

      const entry = await storage.createWaitingListEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating waiting list entry:", error);
      res.status(400).json({ message: "Invalid waiting list data" });
    }
  });

  app.put(
    "/api/restaurants/:restaurantId/waiting-list/:id",
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const restaurantId = parseInt(req.params.restaurantId);
        const updates = req.body;

        // Verify waiting list entry belongs to restaurant before updating
        const existingEntry = await storage.getWaitingListEntryById(id);
        if (!existingEntry || existingEntry.restaurantId !== restaurantId) {
          return res
            .status(404)
            .json({ message: "Waiting list entry not found" });
        }

        const entry = await storage.updateWaitingListEntry(id, updates);

        // If status is changed to "booked", create a booking in the calendar
        if (updates.status === "booked" && existingEntry.status !== "booked") {
          try {
            const restaurant = await storage.getRestaurantById(restaurantId);
            if (restaurant) {
              // Parse the requested date and time to create a proper booking date
              const bookingDate = new Date(existingEntry.requestedDate);

              const bookingData = {
                tenantId: restaurant.tenantId,
                restaurantId: restaurantId,
                customerName: existingEntry.customerName,
                customerEmail: existingEntry.customerEmail,
                customerPhone: existingEntry.customerPhone || null,
                guestCount: existingEntry.guestCount,
                bookingDate: bookingDate,
                startTime: existingEntry.requestedTime,
                specialRequests: existingEntry.notes || null,
                status: "confirmed",
                source: "waiting_list",
              };

              const booking = await storage.createBooking(bookingData);
              console.log(
                `Booking created from waiting list entry ${id}:`,
                booking.id,
              );

              // Send notification via WebSocket
              if (wsClients.has(restaurantId)) {
                const clients = wsClients.get(restaurantId);
                const notification = {
                  type: "booking_created",
                  message: `Booking confirmed from waiting list: ${existingEntry.customerName}`,
                  data: booking,
                };

                clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(notification));
                  }
                });
              }

              // Log the activity
              await storage.createActivityLog({
                tenantId: restaurant.tenantId,
                restaurantId: restaurantId,
                eventType: "booking_created",
                description: `Booking created from waiting list for ${existingEntry.customerName}`,
                source: "waiting_list",
                userEmail: null,
                details: JSON.stringify({
                  waitingListId: id,
                  bookingId: booking.id,
                  customerName: existingEntry.customerName,
                  guestCount: existingEntry.guestCount,
                  requestedDate: existingEntry.requestedDate,
                  requestedTime: existingEntry.requestedTime,
                }),
              });
            }
          } catch (bookingError) {
            console.error(
              "Error creating booking from waiting list:",
              bookingError,
            );
            // Don't fail the waiting list update if booking creation fails
          }
        }

        // If status is changed to "waiting" or "canceled", remove any existing booking from calendar
        if (
          (updates.status === "waiting" || updates.status === "canceled") &&
          existingEntry.status === "booked"
        ) {
          try {
            const restaurant = await storage.getRestaurantById(restaurantId);
            if (restaurant) {
              // Find and delete the booking that was created from this waiting list entry
              const bookingDate = new Date(existingEntry.requestedDate);
              const existingBookings = await storage.getBookingsByDateRange(
                restaurant.tenantId,
                restaurantId,
                bookingDate,
                bookingDate,
              );

              // Find the booking that matches this waiting list entry
              const bookingToDelete = existingBookings.find(
                (booking) =>
                  booking.customerName === existingEntry.customerName &&
                  booking.customerEmail === existingEntry.customerEmail &&
                  booking.startTime === existingEntry.requestedTime &&
                  booking.source === "waiting_list",
              );

              if (bookingToDelete) {
                await storage.deleteBooking(bookingToDelete.id);
                console.log(
                  `Booking ${bookingToDelete.id} removed from calendar for waiting list entry ${id}`,
                );

                // Send notification via WebSocket
                if (wsClients.has(restaurantId)) {
                  const clients = wsClients.get(restaurantId);
                  const notification = {
                    type: "booking_removed",
                    message: `Booking removed from calendar: ${existingEntry.customerName}`,
                    data: { bookingId: bookingToDelete.id, waitingListId: id },
                  };

                  clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify(notification));
                    }
                  });
                }

                // Log the activity
                await storage.createActivityLog({
                  tenantId: restaurant.tenantId,
                  restaurantId: restaurantId,
                  eventType: "booking_removed",
                  description: `Booking removed from calendar for ${existingEntry.customerName} (status changed to ${updates.status})`,
                  source: "waiting_list",
                  userEmail: null,
                  details: JSON.stringify({
                    waitingListId: id,
                    bookingId: bookingToDelete.id,
                    customerName: existingEntry.customerName,
                    newStatus: updates.status,
                    requestedDate: existingEntry.requestedDate,
                    requestedTime: existingEntry.requestedTime,
                  }),
                });
              }
            }
          } catch (bookingError) {
            console.error(
              "Error removing booking from waiting list:",
              bookingError,
            );
            // Don't fail the waiting list update if booking removal fails
          }
        }

        res.json(entry);
      } catch (error) {
        console.error("Error updating waiting list entry:", error);
        res.status(400).json({ message: "Invalid request" });
      }
    },
  );

  // Professional Menu Ordering Service Routes
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-orders",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        console.log("Menu order request body:", JSON.stringify(req.body, null, 2));

        // Validate required fields
        const requiredFields = ['contactName', 'contactEmail', 'contactPhone', 'shippingAddress', 'city', 'state', 'zipCode', 'quantity', 'menuTheme', 'menuLayout', 'printingOption', 'shippingOption', 'subtotal', 'shippingCost', 'tax', 'total'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missingFields.join(', ')}`
          });
        }

        // Generate unique order number
        const orderNumber = `MO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Convert dollar amounts to cents for database storage
        const orderData = {
          restaurantId,
          tenantId,
          orderNumber,
          contactName: req.body.contactName,
          contactEmail: req.body.contactEmail,
          contactPhone: req.body.contactPhone,
          shippingAddress: req.body.shippingAddress,
          city: req.body.city,
          state: req.body.state,
          zipCode: req.body.zipCode,
          quantity: parseInt(req.body.quantity),
          menuTheme: req.body.menuTheme,
          menuLayout: req.body.menuLayout,
          printingOption: req.body.printingOption,
          shippingOption: req.body.shippingOption,
          subtotal: Math.round(parseFloat(req.body.subtotal) * 100), // Convert to cents
          shippingCost: Math.round(parseFloat(req.body.shippingCost) * 100),
          tax: Math.round(parseFloat(req.body.tax) * 100),
          total: Math.round(parseFloat(req.body.total) * 100),
          specialInstructions: req.body.specialInstructions || null,
          orderStatus: 'pending',
        };

        const order = await storage.createMenuOrder(orderData);

        // Send order confirmation email
        if (emailService) {
          try {
            const restaurant = await storage.getRestaurantById(restaurantId);
            const estimatedDelivery = new Date();
            estimatedDelivery.setDate(estimatedDelivery.getDate() + 7); // Default 7 days

            await emailService.sendEmail({
              to: [{ email: orderData.contactEmail, name: orderData.contactName }],
              subject: `Menu Order Confirmation - ${orderNumber}`,
              htmlContent: `
                <html>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                        Menu Order Confirmation
                      </h2>
                      
                      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2c3e50;">Order Details</h3>
                        <p><strong>Order Number:</strong> ${orderNumber}</p>
                        <p><strong>Restaurant:</strong> ${restaurant?.name}</p>
                        <p><strong>Quantity:</strong> ${orderData.quantity} menus</p>
                        <p><strong>Design Theme:</strong> ${orderData.menuTheme}</p>
                        <p><strong>Layout:</strong> ${orderData.menuLayout}</p>
                        <p><strong>Printing Option:</strong> ${orderData.printingOption}</p>
                        <p><strong>Shipping Method:</strong> ${orderData.shippingOption}</p>
                      </div>

                      <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #27ae60;">Order Summary</h3>
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                          <span>Subtotal:</span>
                          <span>$${(orderData.subtotal / 100).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                          <span>Shipping:</span>
                          <span>$${(orderData.shippingCost / 100).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                          <span>Tax:</span>
                          <span>$${(orderData.tax / 100).toFixed(2)}</span>
                        </div>
                        <hr style="border: 1px solid #27ae60; margin: 10px 0;">
                        <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; font-size: 18px;">
                          <span>Total:</span>
                          <span>$${(orderData.total / 100).toFixed(2)}</span>
                        </div>
                      </div>

                      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #856404;">Shipping Information</h3>
                        <p><strong>Delivery Address:</strong><br>
                        ${orderData.contactName}<br>
                        ${orderData.shippingAddress}<br>
                        ${orderData.city}, ${orderData.state} ${orderData.zipCode}</p>
                        <p><strong>Phone:</strong> ${orderData.contactPhone}</p>
                        <p><strong>Estimated Delivery:</strong> ${estimatedDelivery.toLocaleDateString()}</p>
                      </div>

                      ${orderData.specialInstructions ? `
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                          <h3 style="margin-top: 0;">Special Instructions</h3>
                          <p>${orderData.specialInstructions}</p>
                        </div>
                      ` : ''}

                      <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #0c5460;">What Happens Next?</h3>
                        <ol>
                          <li>Your order will be reviewed and confirmed within 24 hours</li>
                          <li>Professional design team will prepare your menus</li>
                          <li>Quality printing and finishing</li>
                          <li>Secure packaging and shipping</li>
                          <li>Delivery to your restaurant</li>
                        </ol>
                      </div>

                      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                        Thank you for choosing our professional menu printing service!<br>
                        Questions? Reply to this email or contact our support team.
                      </p>
                    </div>
                  </body>
                </html>
              `,
            });
          } catch (emailError) {
            console.error("Failed to send order confirmation email:", emailError);
          }
        }

        res.status(201).json({
          success: true,
          message: "Menu order placed successfully",
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total / 100, // Convert back to dollars for response
            status: order.orderStatus,
          },
        });
      } catch (error) {
        console.error("Error creating menu order:", error);
        res.status(500).json({ 
          success: false,
          message: "Failed to place menu order" 
        });
      }
    },
  );

  // Get menu orders for a restaurant
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-orders",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const orders = await storage.getMenuOrdersByRestaurant(restaurantId, tenantId);
        
        // Convert cents back to dollars for response
        const formattedOrders = orders.map(order => ({
          ...order,
          subtotal: order.subtotal / 100,
          shippingCost: order.shippingCost / 100,
          tax: order.tax / 100,
          total: order.total / 100,
        }));

        res.json(formattedOrders);
      } catch (error) {
        console.error("Error fetching menu orders:", error);
        res.status(500).json({ message: "Failed to fetch menu orders" });
      }
    },
  );

  // Update menu order status (for admin/fulfillment)
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/menu-orders/:orderId",
    validateTenant,
    async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const { orderStatus, trackingNumber, estimatedDelivery } = req.body;

        const updatedOrder = await storage.updateMenuOrder(orderId, {
          orderStatus,
          trackingNumber,
          estimatedDelivery,
        });

        res.json({
          success: true,
          message: "Menu order updated successfully",
          order: updatedOrder,
        });
      } catch (error) {
        console.error("Error updating menu order:", error);
        res.status(500).json({ message: "Failed to update menu order" });
      }
    },
  );

  // Kitchen Dashboard API Routes
  
  // Get kitchen orders
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/orders",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { timeRange } = req.query;

        const orders = await storage.getKitchenOrders(restaurantId, tenantId, timeRange as string);
        res.json(orders);
      } catch (error) {
        console.error("Error fetching kitchen orders:", error);
        res.status(500).json({ message: "Failed to fetch kitchen orders" });
      }
    },
  );

  // Update kitchen order status
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/orders/:orderId",
    validateTenant,
    async (req, res) => {
      try {
        const orderId = parseInt(req.params.orderId);
        const { status, actualTime, timestamp } = req.body;

        const updates: any = { status };
        
        if (status === 'preparing' && !req.body.startedAt) {
          updates.startedAt = new Date();
        } else if (status === 'ready' && actualTime) {
          updates.actualTime = actualTime;
          updates.readyAt = new Date();
        } else if (status === 'served') {
          updates.servedAt = new Date();
        }

        const updatedOrder = await storage.updateKitchenOrder(orderId, updates);
        res.json(updatedOrder);
      } catch (error) {
        console.error("Error updating kitchen order:", error);
        res.status(500).json({ message: "Failed to update kitchen order" });
      }
    },
  );

  // Create kitchen order
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/orders",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const orderData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        // Convert timestamp fields to Date objects if they exist and are valid
        if (orderData.startedAt) {
          const startedDate = new Date(orderData.startedAt);
          orderData.startedAt = isNaN(startedDate.getTime()) ? null : startedDate;
        }
        if (orderData.readyAt) {
          const readyDate = new Date(orderData.readyAt);
          orderData.readyAt = isNaN(readyDate.getTime()) ? null : readyDate;
        }
        if (orderData.servedAt) {
          const servedDate = new Date(orderData.servedAt);
          orderData.servedAt = isNaN(servedDate.getTime()) ? null : servedDate;
        }

        const order = await storage.createKitchenOrder(orderData);
        res.status(201).json(order);
      } catch (error) {
        console.error("Error creating kitchen order:", error);
        res.status(500).json({ message: "Failed to create kitchen order" });
      }
    },
  );

  // Get kitchen stations
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/stations",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const stations = await storage.getKitchenStations(restaurantId, tenantId);
        res.json(stations);
      } catch (error) {
        console.error("Error fetching kitchen stations:", error);
        res.status(500).json({ message: "Failed to fetch kitchen stations" });
      }
    },
  );

  // Update kitchen station
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/stations/:stationId",
    validateTenant,
    async (req, res) => {
      try {
        const stationId = parseInt(req.params.stationId);
        const updates = req.body;

        const updatedStation = await storage.updateKitchenStation(stationId, updates);
        res.json(updatedStation);
      } catch (error) {
        console.error("Error updating kitchen station:", error);
        res.status(500).json({ message: "Failed to update kitchen station" });
      }
    },
  );

  // Create kitchen station
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/stations",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const stationData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const station = await storage.createKitchenStation(stationData);
        res.status(201).json(station);
      } catch (error) {
        console.error("Error creating kitchen station:", error);
        res.status(500).json({ message: "Failed to create kitchen station" });
      }
    },
  );

  // Get kitchen staff
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/staff",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const staff = await storage.getKitchenStaff(restaurantId, tenantId);
        res.json(staff);
      } catch (error) {
        console.error("Error fetching kitchen staff:", error);
        res.status(500).json({ message: "Failed to fetch kitchen staff" });
      }
    },
  );

  // Update kitchen staff
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/staff/:staffId",
    validateTenant,
    async (req, res) => {
      try {
        const staffId = parseInt(req.params.staffId);
        const updates = req.body;

        const updatedStaff = await storage.updateKitchenStaff(staffId, updates);
        res.json(updatedStaff);
      } catch (error) {
        console.error("Error updating kitchen staff:", error);
        res.status(500).json({ message: "Failed to update kitchen staff" });
      }
    },
  );

  // Create kitchen staff
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/staff",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const staffData = {
          ...req.body,
          restaurantId,
          tenantId,
        };

        const staff = await storage.createKitchenStaff(staffData);
        res.status(201).json(staff);
      } catch (error) {
        console.error("Error creating kitchen staff:", error);
        res.status(500).json({ message: "Failed to create kitchen staff" });
      }
    },
  );

  // Get kitchen metrics (calculated in real-time)
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/metrics",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const { timeRange } = req.query;

        const metrics = await storage.calculateKitchenMetrics(restaurantId, tenantId, timeRange as string);
        res.json(metrics);
      } catch (error) {
        console.error("Error calculating kitchen metrics:", error);
        res.status(500).json({ message: "Failed to calculate kitchen metrics" });
      }
    },
  );

  // Get kitchen performance sparkline data
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/kitchen/performance-sparkline",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const timeRange = req.query.timeRange as string || '4h';

        const sparklineData = await storage.getKitchenPerformanceSparkline(restaurantId, tenantId, timeRange);
        res.json(sparklineData);
      } catch (error) {
        console.error("Error fetching kitchen performance sparkline:", error);
        res.status(500).json({ message: "Failed to fetch performance sparkline data" });
      }
    },
  );

  // Print Orders API Routes
  
  // Create print order and payment intent
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/print-orders",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const {
          customerName,
          customerEmail,
          customerPhone,
          printType,
          printSize,
          printQuality,
          quantity,
          design,
          specialInstructions,
          rushOrder,
          deliveryMethod,
          deliveryAddress,
          useSavedPaymentMethod
        } = req.body;

        // Calculate pricing based on print specifications
        const basePrices = {
          menu: { A4: 500, A3: 800, A2: 1200, A1: 1800, custom: 1000 }, // in cents
          flyer: { A4: 300, A3: 500, A2: 800, A1: 1200, custom: 600 },
          poster: { A4: 800, A3: 1200, A2: 1800, A1: 2500, custom: 1500 },
          banner: { A4: 1200, A3: 1800, A2: 2500, A1: 3500, custom: 2000 },
          business_card: { A4: 200, A3: 300, A2: 400, A1: 500, custom: 250 }
        };

        const qualityMultipliers = {
          draft: 0.8,
          standard: 1.0,
          high: 1.3,
          premium: 1.6
        };

        const basePrice = basePrices[printType]?.[printSize] || 1000;
        const qualityMultiplier = qualityMultipliers[printQuality] || 1.0;
        const rushMultiplier = rushOrder ? 1.5 : 1.0;
        const deliveryFee = deliveryMethod === 'delivery' ? 500 : deliveryMethod === 'mail' ? 300 : 0;

        const totalAmount = Math.round(basePrice * qualityMultiplier * rushMultiplier * quantity + deliveryFee);

        // Generate unique order number
        const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Get tenant and check for saved payment methods
        const tenant = await storage.getTenantById(tenantId);
        let paymentIntentOptions = {
          amount: totalAmount,
          currency: 'usd',
          metadata: {
            orderNumber,
            restaurantId: restaurantId.toString(),
            tenantId: tenantId.toString(),
            printType,
            quantity: quantity.toString()
          },
          description: `Print Order ${orderNumber} - ${printType} (${quantity}x ${printSize})`,
          automatic_payment_methods: {
            enabled: true,
          },
        };

        // If user wants to use saved payment method and has a Stripe customer ID
        if (useSavedPaymentMethod && tenant?.stripeCustomerId) {
          try {
            // Get customer's payment methods
            const paymentMethods = await stripe.paymentMethods.list({
              customer: tenant.stripeCustomerId,
              type: 'card',
            });

            if (paymentMethods.data.length > 0) {
              paymentIntentOptions.customer = tenant.stripeCustomerId;
              paymentIntentOptions.setup_future_usage = 'off_session';
            }
          } catch (error) {
            console.error('Error fetching payment methods:', error);
            // Continue with regular payment flow if error
          }
        }

        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

        // Create print order in database
        const printOrder = await storage.createPrintOrder({
          restaurantId,
          tenantId,
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
          printType,
          printSize,
          printQuality,
          quantity,
          design,
          specialInstructions,
          rushOrder,
          totalAmount,
          paymentIntentId: paymentIntent.id,
          deliveryMethod,
          deliveryAddress,
          estimatedCompletion: new Date(Date.now() + (rushOrder ? 24 : 72) * 60 * 60 * 1000) // 1-3 days
        });

        // Return saved payment methods if available
        let savedPaymentMethods = [];
        if (tenant?.stripeCustomerId) {
          try {
            const paymentMethods = await stripe.paymentMethods.list({
              customer: tenant.stripeCustomerId,
              type: 'card',
            });
            savedPaymentMethods = paymentMethods.data.map(pm => ({
              id: pm.id,
              brand: pm.card?.brand,
              last4: pm.card?.last4,
              exp_month: pm.card?.exp_month,
              exp_year: pm.card?.exp_year,
            }));
          } catch (error) {
            console.error('Error fetching payment methods for response:', error);
          }
        }

        res.json({
          printOrder,
          clientSecret: paymentIntent.client_secret,
          totalAmount,
          savedPaymentMethods
        });

      } catch (error) {
        console.error("Error creating print order:", error);
        res.status(500).json({ message: "Failed to create print order" });
      }
    }
  );

  // Get saved payment methods for tenant
  app.get(
    "/api/tenants/:tenantId/payment-methods",
    validateTenant,
    async (req, res) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const tenant = await storage.getTenantById(tenantId);

        if (!tenant?.stripeCustomerId) {
          return res.json({ paymentMethods: [] });
        }

        const paymentMethods = await stripe.paymentMethods.list({
          customer: tenant.stripeCustomerId,
          type: 'card',
        });

        const formattedMethods = paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
        }));

        res.json({ paymentMethods: formattedMethods });
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        res.status(500).json({ message: "Failed to fetch payment methods" });
      }
    }
  );

  // Get print orders for restaurant
  app.get(
    "/api/tenants/:tenantId/restaurants/:restaurantId/print-orders",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const printOrders = await storage.getPrintOrdersByRestaurant(restaurantId, tenantId);
        res.json(printOrders);

      } catch (error) {
        console.error("Error fetching print orders:", error);
        res.status(500).json({ message: "Failed to fetch print orders" });
      }
    }
  );

  // Create payment intent for existing print order
  app.post(
    "/api/tenants/:tenantId/restaurants/:restaurantId/print-orders/:orderId/create-payment-intent",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const orderId = parseInt(req.params.orderId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Get the existing print order
        const printOrder = await storage.getPrintOrderById(orderId);
        if (!printOrder) {
          return res.status(404).json({ message: "Print order not found" });
        }

        // Check if order is already paid
        if (printOrder.paymentStatus === 'paid') {
          return res.status(400).json({ message: "Order is already paid" });
        }

        // Get tenant for payment methods
        const tenant = await storage.getTenantById(tenantId);
        
        // Create payment intent options
        let paymentIntentOptions = {
          amount: printOrder.totalAmount,
          currency: 'usd',
          metadata: {
            orderNumber: printOrder.orderNumber,
            restaurantId: restaurantId.toString(),
            tenantId: tenantId.toString(),
            printType: printOrder.printType,
            quantity: printOrder.quantity.toString(),
            existingOrderId: orderId.toString()
          },
          description: `Print Order ${printOrder.orderNumber} - ${printOrder.printType} (${printOrder.quantity}x ${printOrder.printSize})`,
          automatic_payment_methods: {
            enabled: true,
          },
        };

        // Add customer if available
        if (tenant?.stripeCustomerId) {
          paymentIntentOptions.customer = tenant.stripeCustomerId;
        }

        // Create new payment intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

        // Update the print order with new payment intent ID
        await storage.updatePrintOrder(orderId, {
          paymentIntentId: paymentIntent.id
        });

        // Get saved payment methods if available
        let savedPaymentMethods = [];
        if (tenant?.stripeCustomerId) {
          try {
            const paymentMethods = await stripe.paymentMethods.list({
              customer: tenant.stripeCustomerId,
              type: 'card',
            });
            savedPaymentMethods = paymentMethods.data.map(pm => ({
              id: pm.id,
              brand: pm.card?.brand,
              last4: pm.card?.last4,
              exp_month: pm.card?.exp_month,
              exp_year: pm.card?.exp_year,
            }));
          } catch (error) {
            console.error('Error fetching payment methods:', error);
          }
        }

        res.json({
          clientSecret: paymentIntent.client_secret,
          savedPaymentMethods
        });

      } catch (error) {
        console.error("Error creating payment intent for existing order:", error);
        res.status(500).json({ message: "Failed to create payment intent" });
      }
    }
  );

  // Update print order status
  app.patch(
    "/api/tenants/:tenantId/restaurants/:restaurantId/print-orders/:orderId",
    validateTenant,
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const tenantId = parseInt(req.params.tenantId);
        const orderId = parseInt(req.params.orderId);

        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const updates = req.body;
        const updatedOrder = await storage.updatePrintOrder(orderId, updates);

        if (!updatedOrder) {
          return res.status(404).json({ message: "Print order not found" });
        }

        res.json(updatedOrder);

      } catch (error) {
        console.error("Error updating print order:", error);
        res.status(500).json({ message: "Failed to update print order" });
      }
    }
  );

  // Confirm payment and update order status
  app.post(
    "/api/print-orders/confirm-payment",
    async (req, res) => {
      try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
          return res.status(400).json({ message: "Payment intent ID is required" });
        }

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
          // Update print order status
          const updatedOrder = await storage.updatePrintOrderByPaymentIntent(paymentIntentId, {
            paymentStatus: 'paid',
            orderStatus: 'processing',
            stripePaymentId: paymentIntent.id
          });

          if (updatedOrder) {
            // Send confirmation email if email service is available
            if (emailService) {
              try {
                await emailService.sendPrintOrderConfirmation(
                  updatedOrder.customerEmail,
                  updatedOrder
                );
              } catch (emailError) {
                console.error("Failed to send print order confirmation email:", emailError);
              }
            }

            res.json({
              success: true,
              message: "Payment confirmed successfully",
              order: updatedOrder
            });
          } else {
            res.status(404).json({ message: "Print order not found" });
          }
        } else {
          res.status(400).json({ 
            message: "Payment not successful",
            status: paymentIntent.status 
          });
        }

      } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).json({ message: "Failed to confirm payment" });
      }
    }
  );

  // Public endpoint to create print order (for external customers)
  app.post("/api/restaurants/:restaurantId/print-orders/public", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);

      if (isNaN(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID" });
      }

      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const {
        customerName,
        customerEmail,
        customerPhone,
        printType,
        printSize,
        printQuality,
        quantity,
        design,
        specialInstructions,
        rushOrder,
        deliveryMethod,
        deliveryAddress
      } = req.body;

      // Calculate pricing (same logic as authenticated endpoint)
      const basePrices = {
        menu: { A4: 500, A3: 800, A2: 1200, A1: 1800, custom: 1000 },
        flyer: { A4: 300, A3: 500, A2: 800, A1: 1200, custom: 600 },
        poster: { A4: 800, A3: 1200, A2: 1800, A1: 2500, custom: 1500 },
        banner: { A4: 1200, A3: 1800, A2: 2500, A1: 3500, custom: 2000 },
        business_card: { A4: 200, A3: 300, A2: 400, A1: 500, custom: 250 }
      };

      const qualityMultipliers = {
        draft: 0.8,
        standard: 1.0,
        high: 1.3,
        premium: 1.6
      };

      const basePrice = basePrices[printType]?.[printSize] || 1000;
      const qualityMultiplier = qualityMultipliers[printQuality] || 1.0;
      const rushMultiplier = rushOrder ? 1.5 : 1.0;
      const deliveryFee = deliveryMethod === 'delivery' ? 500 : deliveryMethod === 'mail' ? 300 : 0;

      const totalAmount = Math.round(basePrice * qualityMultiplier * rushMultiplier * quantity + deliveryFee);

      // Generate unique order number
      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        metadata: {
          orderNumber,
          restaurantId: restaurantId.toString(),
          tenantId: restaurant.tenantId.toString(),
          printType,
          quantity: quantity.toString()
        },
        description: `Print Order ${orderNumber} - ${printType} (${quantity}x ${printSize})`
      });

      // Create print order in database
      const printOrder = await storage.createPrintOrder({
        restaurantId,
        tenantId: restaurant.tenantId,
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        printType,
        printSize,
        printQuality,
        quantity,
        design,
        specialInstructions,
        rushOrder,
        totalAmount,
        paymentIntentId: paymentIntent.id,
        deliveryMethod,
        deliveryAddress,
        estimatedCompletion: new Date(Date.now() + (rushOrder ? 24 : 72) * 60 * 60 * 1000)
      });

      res.json({
        printOrder,
        clientSecret: paymentIntent.client_secret,
        totalAmount
      });

    } catch (error) {
      console.error("Error creating public print order:", error);
      res.status(500).json({ message: "Failed to create print order" });
    }
  });

  // Initialize cancellation reminder service
  const cancellationReminderService = new CancellationReminderService();
  cancellationReminderService.start();

  // SMS Settings routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/sms-settings", async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const settings = await storage.getSmsSettings(parseInt(restaurantId), parseInt(tenantId));
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SMS settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/sms-settings", async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const settings = req.body;
      
      const savedSettings = await storage.saveSmsSettings(parseInt(restaurantId), parseInt(tenantId), settings);
      res.json({ message: "SMS settings saved successfully", settings: savedSettings });
    } catch (error) {
      console.error("Error saving SMS settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // SMS Balance routes
  app.get("/api/tenants/:tenantId/sms-balance", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const balance = await storage.getSmsBalance(parseInt(tenantId));
      res.json(balance);
    } catch (error) {
      console.error("Error fetching SMS balance:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/sms-balance/add", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const updatedBalance = await storage.addSmsBalance(parseInt(tenantId), parseFloat(amount));
      res.json({ message: "SMS balance added successfully", balance: updatedBalance });
    } catch (error) {
      console.error("Error adding SMS balance:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // SMS Test route for free testing
  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages/test", async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const { phoneNumber, message, type } = req.body;
      
      // For testing purposes, simulate sending SMS without actual delivery
      const testMessage = await storage.createSmsMessage(parseInt(restaurantId), parseInt(tenantId), {
        phoneNumber,
        message: message || "Test SMS from ReadyTable: Your booking has been confirmed!",
        type: type || "test",
        cost: "0.00", // Free for testing
      });
      
      // Simulate successful delivery
      await storage.updateSmsMessageStatus(testMessage.id, "delivered");
      
      res.json({ 
        message: "Test SMS sent successfully", 
        smsMessage: testMessage,
        note: "This is a test message - no actual SMS was sent to preserve your balance"
      });
    } catch (error) {
      console.error("Error sending test SMS:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Feedback Questions routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/feedback-questions", async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const questions = await storage.getFeedbackQuestions(parseInt(restaurantId), parseInt(tenantId));
      res.json(questions);
    } catch (error) {
      console.error("Error fetching feedback questions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/feedback-questions", async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const questionData = req.body;
      
      const question = await storage.createFeedbackQuestion(parseInt(restaurantId), parseInt(tenantId), questionData);
      res.json(question);
    } catch (error) {
      console.error("Error creating feedback question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/tenants/:tenantId/restaurants/:restaurantId/feedback-questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const questionData = req.body;
      
      const question = await storage.updateFeedbackQuestion(parseInt(id), questionData);
      res.json(question);
    } catch (error) {
      console.error("Error updating feedback question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tenants/:tenantId/restaurants/:restaurantId/feedback-questions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFeedbackQuestion(parseInt(id));
      res.json({ message: "Feedback question deleted successfully" });
    } catch (error) {
      console.error("Error deleting feedback question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Feedback responses route (authenticated)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/feedback", validateTenant, async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const feedbackData = await storage.getFeedbackResponses(parseInt(restaurantId), parseInt(tenantId));
      res.json(feedbackData);
    } catch (error) {
      console.error("Error fetching feedback responses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public API endpoints for guest feedback access (no authentication required)
  app.get(
    "/api/public/tenants/:tenantId/restaurants/:restaurantId",
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        // Return basic restaurant info for guest access
        res.json({
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
          address: restaurant.address,
          phone: restaurant.phone,
          email: restaurant.email
        });
      } catch (error) {
        console.error("Error fetching public restaurant info:", error);
        res.status(500).json({ error: "Failed to fetch restaurant information" });
      }
    }
  );

  app.get(
    "/api/public/tenants/:tenantId/restaurants/:restaurantId/feedback-questions",
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const questions = await storage.getFeedbackQuestions(parseInt(restaurantId), parseInt(tenantId));
        // Only return active questions for guest access
        const activeQuestions = questions.filter(q => q.isActive);
        res.json(activeQuestions);
      } catch (error) {
        console.error("Error fetching public feedback questions:", error);
        res.status(500).json({ error: "Failed to fetch feedback questions" });
      }
    }
  );

  app.post(
    "/api/public/tenants/:tenantId/restaurants/:restaurantId/feedback",
    async (req: Request, res: Response) => {
      try {
        const tenantId = parseInt(req.params.tenantId);
        const restaurantId = parseInt(req.params.restaurantId);
        
        const restaurant = await storage.getRestaurantById(restaurantId);
        if (!restaurant || restaurant.tenantId !== tenantId) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const { customerName, customerEmail, customerPhone, tableNumber, overallRating, questionResponses } = req.body;

        // Create main feedback entry with validated rating
        const validatedOverallRating = overallRating ? Math.min(Math.max(overallRating, 1), 5) : null;
        const feedbackData = {
          customerName,
          customerEmail,
          customerPhone,
          tableNumber,
          restaurantId,
          tenantId,
          rating: validatedOverallRating,
          nps: null,
          comments: null,
          visited: false,
        };

        const feedback = await storage.createFeedback(feedbackData);

        // Log public guest feedback submission
        await logActivity({
          restaurantId,
          tenantId,
          eventType: "guest_feedback_submit",
          description: `Public guest feedback submitted by ${feedbackData.customerName}`,
          source: "qr_code_guest_form",
          guestEmail: feedbackData.customerEmail,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            feedbackId: feedback.id,
            customerName: feedbackData.customerName,
            customerEmail: feedbackData.customerEmail,
            tableNumber: feedbackData.tableNumber,
            overallRating: validatedOverallRating,
            hasQuestionResponses: !!(questionResponses && questionResponses.length > 0),
            responseCount: questionResponses ? questionResponses.length : 0,
            accessMethod: "qr_code"
          }
        });

        // Store individual question responses and aggregate data
        let aggregatedRating = null;
        let aggregatedNps = null;
        let aggregatedComments = '';
        
        if (questionResponses && Array.isArray(questionResponses)) {
          // First, store all individual responses
          for (const response of questionResponses) {
            await storage.createFeedbackResponse({
              feedbackId: feedback.id,
              questionId: response.questionId,
              restaurantId,
              tenantId,
              rating: response.rating || null,
              npsScore: response.npsScore || null,
              textResponse: response.textResponse || null,
            });

            // Aggregate data from responses - prioritize rating over NPS for overall rating
            if (response.rating !== null && response.rating !== undefined) {
              aggregatedRating = response.rating;
            }
            if (response.npsScore !== null && response.npsScore !== undefined) {
              aggregatedNps = response.npsScore;
            }
            if (response.textResponse && response.textResponse.trim()) {
              aggregatedComments = aggregatedComments 
                ? `${aggregatedComments}; ${response.textResponse}`
                : response.textResponse;
            }
          }

          // Update the main feedback entry with aggregated data
          // Always prioritize the 5-star overall rating over individual question ratings
          const finalRating = validatedOverallRating !== null ? validatedOverallRating : aggregatedRating;
          const updatedFeedback = await storage.updateFeedback(feedback.id, {
            rating: finalRating,
            nps: aggregatedNps,
            comments: aggregatedComments || null,
          });
          
          res.json(updatedFeedback);
        } else {
          res.json(feedback);
        }
      } catch (error) {
        console.error("Error submitting public feedback:", error);
        res.status(500).json({ error: "Failed to submit feedback" });
      }
    }
  );

  // Public opening hours endpoint
  app.get(
    "/api/public/tenants/:tenantId/restaurants/:restaurantId/opening-hours",
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const openingHours = await storage.getOpeningHoursByRestaurant(parseInt(restaurantId));
        res.json(openingHours);
      } catch (error) {
        console.error("Error fetching public opening hours:", error);
        res.status(500).json({ error: "Failed to fetch opening hours" });
      }
    }
  );

  // Public seasonal themes endpoint
  app.get(
    "/api/public/tenants/:tenantId/restaurants/:restaurantId/seasonal-themes",
    async (req: Request, res: Response) => {
      try {
        const { tenantId, restaurantId } = req.params;
        const restaurant = await storage.getRestaurantById(parseInt(restaurantId));
        
        if (!restaurant || restaurant.tenantId !== parseInt(tenantId)) {
          return res.status(404).json({ message: "Restaurant not found" });
        }

        const themes = await storage.getSeasonalMenuThemes(parseInt(restaurantId), parseInt(tenantId));
        res.json(themes);
      } catch (error) {
        console.error("Error fetching public seasonal themes:", error);
        res.status(500).json({ error: "Failed to fetch seasonal themes" });
      }
    }
  );

  // Feedback reminder endpoints
  app.post("/api/admin/send-feedback-reminders", async (req, res) => {
    try {
      // Manual trigger for testing feedback reminders
      console.log("Manual feedback reminder check triggered");
      
      // This will be handled by the feedback reminder service
      res.json({ 
        message: "Feedback reminder check triggered successfully",
        note: "The service will process completed bookings and send emails automatically"
      });
    } catch (error) {
      console.error("Error triggering feedback reminders:", error);
      res.status(500).json({ message: "Failed to trigger feedback reminders" });
    }
  });

  // Send immediate feedback email for testing
  app.post("/api/admin/tenants/:tenantId/restaurants/:restaurantId/send-feedback-email/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      const booking = await storage.getBookingById(bookingId);
      const restaurant = await storage.getRestaurantById(restaurantId);

      if (!booking || !restaurant || booking.restaurantId !== restaurantId || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Booking or restaurant not found" });
      }

      if (!booking.customerEmail) {
        return res.status(400).json({ message: "No customer email available for this booking" });
      }

      // Send feedback request immediately using the existing service
      await feedbackReminderService.sendFeedbackRequest(booking, restaurant, tenantId);

      res.json({ 
        message: "Feedback email sent successfully",
        booking: {
          id: booking.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          bookingDate: booking.bookingDate
        }
      });
    } catch (error) {
      console.error("Error sending feedback email:", error);
      res.status(500).json({ message: "Failed to send feedback email" });
    }
  });

  // Initialize feedback reminder service
  console.log("Starting feedback reminder service...");
  feedbackReminderService.start();

  return httpServer;
}

// The code has been modified to improve email confirmation debugging and error handling.
