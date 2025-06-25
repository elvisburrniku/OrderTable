import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { DatabaseStorage } from "./db-storage";
import { ReminderService } from "./reminder-service";
import { AutoAssignmentService } from "./auto-assignment-service";
import { activityCleanupService } from "./activity-cleanup-service";
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

// Apply session middleware with dynamic configuration
configureSessionMiddleware().then(sessionMiddleware => {
  app.use(sessionMiddleware);
}).catch(error => {
  console.error("Error configuring session middleware:", error);
  // Fallback to default configuration
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

(async () => {
  // Initialize storage with demo data
  await storage.initialize();

  // Initialize admin system
  try {
    await initializeAdminSystem();
    
    // Start scheduled task to check for expired pauses every 5 minutes
    const adminStorage = new AdminStorage();
    
    // Display current upcoming schedules on startup
    const upcomingSchedules = await adminStorage.getUpcomingUnpauseSchedules();
    if (upcomingSchedules.length > 0) {
      console.log(`📅 Unpause scheduler initialized with ${upcomingSchedules.length} pending schedules:`);
      upcomingSchedules.forEach(schedule => {
        console.log(`   • ${schedule.tenantName} → ${new Date(schedule.pauseEndDate).toLocaleString()} (${schedule.hoursUntilUnpause}h remaining)`);
      });
    } else {
      console.log('📅 Unpause scheduler initialized - no pending schedules');
    }
    
    setInterval(async () => {
      try {
        const unpaused = await adminStorage.checkAndUnpauseExpiredTenants();
        if (unpaused > 0) {
          console.log(`Automatically unpaused ${unpaused} tenant(s) with expired pause periods`);
          
          // Show remaining schedules after unpause
          const remainingSchedules = await adminStorage.getUpcomingUnpauseSchedules();
          if (remainingSchedules.length > 0) {
            console.log(`📅 Remaining schedules: ${remainingSchedules.length}`);
            remainingSchedules.slice(0, 3).forEach(schedule => {
              console.log(`   • ${schedule.tenantName} → ${new Date(schedule.pauseEndDate).toLocaleString()}`);
            });
          }
        }
      } catch (error) {
        console.error('Error in automatic unpause check:', error);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
    
    console.log('Admin system and automatic unpause service initialized');
  } catch (error) {
    console.error('Failed to initialize admin system:', error);
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