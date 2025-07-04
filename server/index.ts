import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { DatabaseStorage } from "./db-storage";
import { ReminderService } from "./reminder-service";
import { AutoAssignmentService } from "./auto-assignment-service";
import { activityCleanupService } from "./activity-cleanup-service";
import { SurveySchedulerService } from "./survey-scheduler-service";
import { initializeAdminSystem } from "./init-admin";
import { systemSettings } from "./system-settings";
import { AdminStorage } from "./admin-storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware with dynamic timeout from system settings
const configureSessionMiddleware = async () => {
  const sessionTimeoutHours = await systemSettings.getSetting('session_timeout_hours').catch(() => 24);
  return session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    name: 'restaurant.sid',
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: sessionTimeoutHours * 60 * 60 * 1000, // Use system setting for timeout
      sameSite: 'lax'
    }
  });
};

// Apply session middleware synchronously to avoid timing issues
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  name: 'restaurant.sid',
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // Default 24 hours
    sameSite: 'lax'
  }
}));

// Add global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Maintenance mode middleware
app.use(async (req, res, next) => {
  try {
    // Skip maintenance check for admin routes
    if (req.path.startsWith('/api/admin')) {
      return next();
    }

    // Use timeout to prevent hanging on database issues
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Maintenance check timeout')), 5000)
    );

    const maintenancePromise = systemSettings.isMaintenanceMode();
    
    const isMaintenanceMode = await Promise.race([maintenancePromise, timeoutPromise])
      .catch(() => false); // Default to not in maintenance mode if check fails
    
    if (isMaintenanceMode) {
      const message = await systemSettings.getSetting('maintenance_message')
        .catch(() => "System is temporarily under maintenance. Please try again later.");
      
      return res.status(503).json({
        error: "Service Unavailable",
        message: message,
        maintenanceMode: true
      });
    }

    next();
  } catch (error) {
    console.warn("Maintenance mode check failed, continuing:", error.message);
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add public survey routes BEFORE routes.ts authentication middleware
import { surveySchedules, restaurants, bookings } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { BrevoEmailService } from "./brevo-service.js";

// Public survey response API endpoint (no authentication required)
app.get("/api/survey/:token", async (req, res) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({ message: "Survey token is required" });
    }

    // Get survey schedule by token
    const schedule = await storage.db
      .select()
      .from(surveySchedules)
      .where(eq(surveySchedules.responseToken, token))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ message: "Survey not found or expired" });
    }

    const surveyData = schedule[0];

    // Get restaurant details
    const restaurant = await storage.db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, surveyData.restaurantId))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Get booking details
    const booking = await storage.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, surveyData.bookingId))
      .limit(1);

    if (booking.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const response = {
      survey: {
        id: surveyData.id,
        bookingId: surveyData.bookingId,
        customerName: surveyData.customerName,
        customerEmail: surveyData.customerEmail,
        bookingDate: booking[0].bookingDate,
        bookingTime: booking[0].bookingTime,
        guestCount: booking[0].guestCount
      },
      restaurant: {
        id: restaurant[0].id,
        name: restaurant[0].name,
        address: restaurant[0].address,
        phone: restaurant[0].phone
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Survey API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Submit survey response (no authentication required)
app.post("/api/survey/:token/submit", async (req, res) => {
  try {
    const { token } = req.params;
    const { rating, feedback } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Survey token is required" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Valid rating (1-5) is required" });
    }

    // Get survey schedule by token
    const schedule = await storage.db
      .select()
      .from(surveySchedules)
      .where(eq(surveySchedules.responseToken, token))
      .limit(1);

    if (schedule.length === 0) {
      return res.status(404).json({ message: "Survey not found or expired" });
    }

    const surveyData = schedule[0];

    // Check if already responded
    if (surveyData.responseReceived) {
      return res.status(400).json({ message: "Survey already completed" });
    }

    // Update survey schedule with response
    await storage.db
      .update(surveySchedules)
      .set({
        responseReceived: true,
        rating: parseInt(rating),
        feedback: feedback || null,
        respondedAt: new Date()
      })
      .where(eq(surveySchedules.id, surveyData.id));

    res.json({ message: "Survey response saved successfully" });
  } catch (error) {
    console.error("Error submitting survey response:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

(async () => {
  // Initialize storage with demo data
  await storage.initialize();

  // Initialize admin system asynchronously to prevent blocking
  initializeAdminSystem().then(() => {
    console.log('Admin system initialization completed.');
    
    // Start scheduled task to check for expired pauses
    const adminStorage = new AdminStorage();
    
    // Check for expired pauses periodically
    const checkExpiredPauses = async () => {
      try {
        const unpaused = await adminStorage.checkAndUnpauseExpiredTenants();
        console.log(`Checking for expired pauses: Found ${unpaused} expired tenant(s)`);
      } catch (error) {
        console.error('Error checking expired pauses:', error);
      }
    };
    
    // Run check every 2 minutes
    setInterval(checkExpiredPauses, 2 * 60 * 1000);
    
    // Run initial check
    checkExpiredPauses();
    
    console.log('📅 Unpause scheduler initialized - no pending schedules');
    console.log('Admin system and automatic unpause service initialized');
  }).catch(error => {
    console.error('Failed to initialize admin system:', error);
  });

  // Initialize survey scheduler for all storage types
  try {
    const surveySchedulerService = new SurveySchedulerService(storage as DatabaseStorage);
    surveySchedulerService.start();
    console.log('Survey scheduler service initialized and started');
  } catch (error) {
    console.log('Survey scheduler service not available:', error);
  }

  // Only start services if using memory storage to avoid database connection errors
  if (storage.constructor.name === 'MemoryStorage') {
    console.log('Starting services with memory storage...');
    
    // Start auto-assignment service for unassigned bookings
    const autoAssignmentService = new AutoAssignmentService(storage);
    autoAssignmentService.start();
  } else {
    console.log('Skipping services to avoid database connection issues');
  }

  // Public payment notification endpoint (no authentication required)
  app.post("/api/payment-notification", async (req, res) => {
    try {
      const { payment_intent, booking_id, amount, currency } = req.body;
      
      if (!payment_intent || !booking_id) {
        return res.status(400).json({ message: "Payment intent ID and booking ID are required" });
      }

      console.log(`Processing payment notification for booking ${booking_id}, payment intent: ${payment_intent}`);

      // Get booking details
      const booking = await storage.getBookingById(booking_id);
      if (!booking) {
        console.log(`No booking found with ID: ${booking_id}`);
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get restaurant and tenant details for notifications
      const restaurant = await storage.getRestaurantById(booking.restaurantId);
      const tenant = await storage.getTenantById(booking.tenantId);

      console.log(`Found booking for payment notification - Restaurant: ${restaurant?.name}, Customer: ${booking.customerName}`);

      // Initialize email service
      const emailService = new BrevoEmailService();

      // Send notifications and emails
      try {
        console.log(`Sending payment confirmation emails for booking ${booking.id}`);
        
        // Send payment confirmation email to customer
        if (booking.customerEmail) {
          await emailService.sendPaymentConfirmation(
            booking.customerEmail,
            booking.customerName,
            {
              bookingId: booking.id,
              amount: amount || booking.paymentAmount || 0,
              currency: currency || "USD",
              restaurantName: restaurant?.name || "Restaurant",
            },
          );
          console.log(`Payment confirmation email sent to customer: ${booking.customerEmail}`);
        }

        // Send payment notification to restaurant email
        if (restaurant?.email) {
          await emailService.sendPaymentNotificationToRestaurant(
            restaurant.email,
            {
              bookingId: booking.id,
              amount: amount || booking.paymentAmount || 0,
              currency: currency || "USD",
              customerName: booking.customerName,
              restaurantName: restaurant.name || "Restaurant",
              bookingDate: new Date(booking.bookingDate).toLocaleDateString(),
              bookingTime: booking.startTime,
              guestCount: booking.guestCount,
            },
          );
          console.log(`Payment notification email sent to restaurant: ${restaurant.email}`);
        }

        // Get owners and managers for additional notifications
        try {
          const { tenantUsers: tenantUsersTable, users: usersTable } = await import("../shared/schema");
          const { eq } = await import("drizzle-orm");
          
          const tenantUsersList = await storage.db
            .select({
              tenantId: tenantUsersTable.tenantId,
              userId: tenantUsersTable.userId,
              role: tenantUsersTable.role,
              createdAt: tenantUsersTable.createdAt,
              user: {
                id: usersTable.id,
                email: usersTable.email,
                name: usersTable.name,
                restaurantName: usersTable.restaurantName,
                ssoProvider: usersTable.ssoProvider,
              },
            })
            .from(tenantUsersTable)
            .leftJoin(usersTable, eq(tenantUsersTable.userId, usersTable.id))
            .where(eq(tenantUsersTable.tenantId, booking.tenantId));

          const owners = tenantUsersList.filter(tu => tu.role === 'owner' || tu.role === 'manager');
          
          for (const userRole of owners) {
            if (userRole.user?.email && userRole.user.email !== restaurant?.email) {
              await emailService.sendPaymentNotificationToRestaurant(
                userRole.user.email,
                {
                  bookingId: booking.id,
                  amount: amount || booking.paymentAmount || 0,
                  currency: currency || "USD",
                  customerName: booking.customerName,
                  restaurantName: restaurant?.name || 'Restaurant',
                  bookingDate: new Date(booking.bookingDate).toLocaleDateString(),
                  bookingTime: booking.startTime,
                  guestCount: booking.guestCount,
                },
              );
              console.log(`Payment notification email sent to ${userRole.role}: ${userRole.user.email}`);
            }
          }
        } catch (userEmailError) {
          console.error("Error sending emails to restaurant users:", userEmailError);
        }

        res.json({ success: true, message: "Payment notifications sent successfully" });

      } catch (emailError) {
        console.error("Error sending payment confirmation emails:", emailError);
        res.status(500).json({ message: "Failed to send email notifications" });
      }

    } catch (error) {
      console.error("Error processing payment notification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();