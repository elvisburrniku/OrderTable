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