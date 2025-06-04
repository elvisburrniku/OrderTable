import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertBookingSchema, insertCustomerSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import * as tenantRoutes from "./tenant-routes";
import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import { users, tenants, tenantUsers, restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";
import { BrevoEmailService } from "./brevo-service"; // Import the BrevoEmailService

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key', {
  apiVersion: '2023-10-16'
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

      const restaurant = await storage.getRestaurantByUserId(user.id);

      res.json({ 
        user: { ...user, password: undefined },
        restaurant: restaurant ? { ...restaurant, tenantId: restaurant.tenantId || 1 } : null
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

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user using storage method
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        restaurantName
      });

      // Create restaurant for the user
      const newRestaurant = await storage.createRestaurant({
        name: restaurantName,
        userId: newUser.id,
        tenantId: 1 // Default tenant for now
      });

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          restaurantName: newUser.restaurantName
        },
        restaurant: newRestaurant
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Restaurant routes
  app.get("/api/restaurants", async (req, res) => {
    try {
      // For frontend compatibility - return current user's restaurant
      // This is a simplified version that doesn't require tenant validation
      res.json([]);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
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

  // Restaurant-based waiting list routes
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
      const entryData = {
        ...req.body,
        restaurantId,
        tenantId: 1 // Default tenant for non-tenant routes
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

  app.post("/api/restaurants/:restaurantId/bookings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);

      // Get or create customer first
      const customer = await storage.getOrCreateCustomer(restaurantId, 1, {
        name: req.body.customerName,
        email: req.body.customerEmail,
        phone: req.body.customerPhone
      });

      const bookingData = insertBookingSchema.parse({
        ...req.body,
        restaurantId,
        tenantId: 1, // Default tenant for non-tenant routes
        customerId: customer.id,
        bookingDate: new Date(req.body.bookingDate)
      });

      const booking = await storage.createBooking(bookingData);

      // Send email notifications if Brevo is configured
      if (emailService) {
        try {
          // Send confirmation email to customer
          await emailService.sendBookingConfirmation(
            req.body.customerEmail,
            req.body.customerName,
            {
              ...bookingData,
              tableNumber: booking.tableId
            }
          );

          // Send notification to restaurant
          const restaurant = await storage.getRestaurantById(restaurantId);
          if (restaurant?.email) {
            await emailService.sendRestaurantNotification(restaurant.email, {
              customerName: req.body.customerName,
              customerEmail: req.body.customerEmail,
              customerPhone: req.body.customerPhone,
              ...bookingData
            });
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          // Don't fail the booking if email fails
        }
      }

      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid booking data" });
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

  // Rooms routes
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
          
          return requestedStart < existingEnd && existingStart < requestedEnd;
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

      // Send email notifications if Brevo is configured
      if (emailService) {
        try {
          // Send confirmation email to customer
          await emailService.sendBookingConfirmation(
            req.body.customerEmail,
            req.body.customerName,
            {
              ...bookingData,
              tableNumber: booking.tableId
            }
          );

          // Send notification to restaurant
          const restaurant = await storage.getRestaurantById(restaurantId);
          if (restaurant?.email) {
            await emailService.sendRestaurantNotification(restaurant.email, {
              customerName: req.body.customerName,
              customerEmail: req.body.customerEmail,
              customerPhone: req.body.customerPhone,
              ...bookingData
            });
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
          // Don't fail the booking if email fails
        }
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

      // Verify booking belongs to tenant before updating
      const existingBooking = await storage.getBookingById(id);
      if (!existingBooking || existingBooking.tenantId !== tenantId) {
        return res.status(404).json({ message: "Booking not found" });
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

      // Verify booking belongs to tenant before deleting
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

  // Customers routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/customers", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const customers = await storage.getCustomersByRestaurant(restaurantId);
      // Filter customers by tenantId for security
      const tenantCustomers = customers.filter(customer => customer.tenantId === tenantId);
      res.json(tenantCustomers);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/customers", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
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
      const { planId, userId, successUrl, cancelUrl } = req.body;

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

  // Activity Log routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/activity-log", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const logs = await storage.getActivityLogByRestaurant(restaurantId);
      // Filter logs by tenantId for security
      const tenantLogs = logs.filter(log => log.tenantId === tenantId);
      res.json(tenantLogs);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/activity-log", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
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

  // SMS Messages routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const messages = await storage.getSmsMessagesByRestaurant(restaurantId);
      // Filter messages by tenantId for security
      const tenantMessages = messages.filter(message => message.tenantId === tenantId);
      res.json(tenantMessages);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/sms-messages", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
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

  // Waiting List routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/waiting-list", validateTenant, async (req, res) => {
    try {
      const restaurantId =parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const waitingList = await storage.getWaitingListByRestaurant(restaurantId);
      // Filter waiting list by tenantId for security
      const tenantWaitingList = waitingList.filter(entry => entry.tenantId === tenantId);
      res.json(tenantWaitingList);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/waiting-list", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
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

      // Verify waiting list entry belongs to tenant before updating
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
      const feedback = await storage.getFeedbackByRestaurant(restaurantId);
      // Filter feedback by tenantId for security
      const tenantFeedback = feedback.filter(fb => fb.tenantId === tenantId);
      res.json(tenantFeedback);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/feedback", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
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

  // Time Slots routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/time-slots", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { date } = req.query;

      const timeSlots = await storage.getTimeSlotsByRestaurant(restaurantId, date as string);
      // Filter time slots by tenantId for security
      const tenantTimeSlots = timeSlots.filter(slot => slot.tenantId === tenantId);
      res.json(tenantTimeSlots);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/time-slots", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
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

      // Verify time slot belongs to tenant before updating
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

  // Table layout routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/table-layout", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { room } = req.query;

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
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

      if (isNaN(restaurantId) || isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID or tenant ID" });
      }

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      if (!room || !positions) {
        return res.status(400).json({ message: "Room and positions are required" });
      }

      // Save the layout to database
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

  // Restaurant settings routes
  app.put("/api/tenants/:tenantId/restaurants/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      // Verify restaurant belongs to tenant before updating
      const existingRestaurant = await storage.getRestaurantById(id);
      if (!existingRestaurant || existingRestaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const restaurant = await storage.updateRestaurant(id, updates);
      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Activity Log routes (read-only activity tracking)
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/activity-log", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // For now, return sample activity log data
      // In a real implementation, you would fetch from an activity_logs table
      const activityLog = [
        {
          id: `${Date.now()}001`,
          createdAt: new Date().toLocaleString(),
          source: "manual",
          eventType: "login",
          description: "User login",
          userEmail: req.user?.email || "user@example.com",
          details: "Restaurant access",
          restaurantId,
          tenantId
        },
        {
          id: `${Date.now()}002`,
          createdAt: new Date(Date.now() - 3600000).toLocaleString(),
          source: "manual",
          eventType: "booking_created",
          description: "New booking created",
          userEmail: req.user?.email || "user@example.com",
          details: "Table reservation created",
          restaurantId,
          tenantId
        }
      ];

      res.json(activityLog);
    } catch (error) {
      console.error("Activity log fetch error:", error);
      res.status(500).json({ error: "Failed to fetch activity log" });
    }
  });

  // Opening Hours routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const hours = await storage.getOpeningHoursByRestaurant(restaurantId);
      res.json(hours);
    } catch (error) {
      console.error("Error fetching opening hours:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/opening-hours", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { hours } = req.body;

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const savedHours = await storage.createOrUpdateOpeningHours(restaurantId, tenantId, hours);
      res.json(savedHours);
    } catch (error) {
      console.error("Error saving opening hours:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Special Periods routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/special-periods", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const periods = await storage.getSpecialPeriodsByRestaurant(restaurantId);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching special periods:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/special-periods", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const periodData = {
        ...req.body,
        restaurantId,
        tenantId,
      };

      const period = await storage.createSpecialPeriod(periodData);
      res.json(period);
    } catch (error) {
      console.error("Error creating special period:", error);
      res.status(400).json({ message: "Invalid special period data" });
    }
  });

  app.put("/api/tenants/:tenantId/special-periods/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);
      const updates = req.body;

      const period = await storage.updateSpecialPeriod(id, updates);
      res.json(period);
    } catch (error) {
      console.error("Error updating special period:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tenants/:tenantId/special-periods/:id", validateTenant, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = parseInt(req.params.tenantId);

      const success = await storage.deleteSpecialPeriod(id);
      res.json({ message: "Special period deleted successfully" });
    } catch (error) {
      console.error("Error deleting special period:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cut-off Times routes
  app.get("/api/tenants/:tenantId/restaurants/:restaurantId/cut-off-times", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const cutOffTimes = await storage.getCutOffTimesByRestaurant(restaurantId);
      res.json(cutOffTimes);
    } catch (error) {
      console.error("Error fetching cut-off times:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/cut-off-times", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tenantId = parseInt(req.params.tenantId);
      const { cutOffTimes: timesData } = req.body;

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const savedTimes = await storage.createOrUpdateCutOffTimes(restaurantId, tenantId, timesData);
      res.json(savedTimes);
    } catch (error) {
      console.error("Error saving cut-off times:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Booking validation route
  app.post("/api/tenants/:tenantId/restaurants/:restaurantId/validate-booking", validateTenant, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const { bookingDate, bookingTime } = req.body;

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

      // Verify restaurant belongs to tenant
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant || restaurant.tenantId !== tenantId) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Update restaurant with email settings
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

      // Verify restaurant belongs to tenant
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

      // Parse saved settings if they exist
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
  return httpServer;
}