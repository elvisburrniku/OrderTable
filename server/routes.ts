import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertBookingSchema, insertCustomerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const restaurant = await storage.getRestaurantByUserId(user.id);
      
      res.json({ 
        user: { ...user, password: undefined },
        restaurant 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      
      if (userData.restaurantName) {
        const restaurant = await storage.createRestaurant({
          name: userData.restaurantName,
          userId: user.id,
          address: "",
          phone: "",
          email: userData.email,
          description: ""
        });
        
        // Create default tables
        for (let i = 1; i <= 10; i++) {
          await storage.createTable({
            restaurantId: restaurant.id,
            tableNumber: i.toString(),
            capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
            isActive: true
          });
        }
        
        res.json({ 
          user: { ...user, password: undefined },
          restaurant 
        });
      } else {
        res.json({ user: { ...user, password: undefined } });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Restaurant routes
  app.get("/api/restaurants/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const restaurant = await storage.getRestaurantByUserId(userId);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Tables routes
  app.get("/api/restaurants/:restaurantId/tables", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const tables = await storage.getTablesByRestaurant(restaurantId);
      res.json(tables);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Bookings routes
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

  app.post("/api/restaurants/:restaurantId/bookings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        restaurantId,
        bookingDate: new Date(req.body.bookingDate)
      });
      
      const booking = await storage.createBooking(bookingData);
      
      // Update or create customer
      let customer = await storage.getCustomerByEmail(restaurantId, bookingData.customerEmail);
      if (customer) {
        await storage.updateCustomer(customer.id, {
          totalBookings: customer.totalBookings + 1,
          lastVisit: new Date()
        });
      } else {
        await storage.createCustomer({
          restaurantId,
          name: bookingData.customerName,
          email: bookingData.customerEmail,
          phone: bookingData.customerPhone || ""
        });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      if (updates.bookingDate) {
        updates.bookingDate = new Date(updates.bookingDate);
      }
      
      const booking = await storage.updateBooking(id, updates);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBooking(id);
      
      if (!success) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Customers routes
  app.get("/api/restaurants/:restaurantId/customers", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const customers = await storage.getCustomersByRestaurant(restaurantId);
      res.json(customers);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/restaurants/:restaurantId/customers", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId);
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        restaurantId
      });
      
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
