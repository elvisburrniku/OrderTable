import type { Express } from "express";
import { restaurantStorage } from "./restaurant-storage";
import {
  registerSchema,
  loginSchema,
  insertRestaurantSchema,
  inviteUserSchema,
  insertRestaurantUserSchema,
  insertBookingSchema,
  insertOrderSchema,
  insertTableSchema,
  insertCustomerSchema,
  PERMISSIONS,
} from "@shared/restaurant-schema";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware for authentication
export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await restaurantStorage.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware for restaurant user authentication
export const authenticateRestaurantUser = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type === 'restaurant_user') {
      const user = await restaurantStorage.getRestaurantUsers(decoded.restaurantId);
      const restaurantUser = user.find(u => u.id === decoded.userId);
      
      if (!restaurantUser) {
        return res.status(401).json({ message: "Restaurant user not found" });
      }

      req.restaurantUser = restaurantUser;
      req.restaurantId = decoded.restaurantId;
    } else {
      // Regular owner user
      const user = await restaurantStorage.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = user;
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Permission middleware factory
export const requirePermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const restaurantId = req.params.restaurantId || req.body.restaurantId || req.restaurantId;
      
      if (!restaurantId) {
        return res.status(400).json({ message: "Restaurant ID required" });
      }

      // Check if user is restaurant owner
      if (req.user) {
        const restaurant = await restaurantStorage.getRestaurantById(parseInt(restaurantId));
        if (restaurant?.ownerId === req.user.id) {
          return next(); // Owner has all permissions
        }
      }

      // Check restaurant user permissions
      if (req.restaurantUser) {
        const permissions = await restaurantStorage.getUserPermissions(
          req.restaurantUser.id,
          parseInt(restaurantId)
        );
        
        if (!permissions.includes(permission)) {
          return res.status(403).json({ 
            message: "Insufficient permissions",
            required: permission,
            userPermissions: permissions
          });
        }
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};

export function registerRestaurantRoutes(app: Express) {
  // Authentication routes
  app.post("/api/restaurant/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await restaurantStorage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Set default subscription plan if not provided
      if (!userData.subscriptionPlanId) {
        const plans = await restaurantStorage.getSubscriptionPlans();
        userData.subscriptionPlanId = plans[0]?.id; // Basic plan
      }

      const user = await restaurantStorage.createUser(userData);
      
      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, type: 'owner' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          maxRestaurants: user.maxRestaurants,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/restaurant/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await restaurantStorage.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, type: 'owner' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          maxRestaurants: user.maxRestaurants,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Restaurant user login
  app.post("/api/restaurant/:restaurantId/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const restaurantId = parseInt(req.params.restaurantId);
      
      const restaurantUser = await restaurantStorage.getRestaurantUserByEmail(restaurantId, email);
      if (!restaurantUser || !restaurantUser.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(password, restaurantUser.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { 
          userId: restaurantUser.id, 
          restaurantId: restaurantId,
          type: 'restaurant_user' 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const permissions = await restaurantStorage.getUserPermissions(restaurantUser.id, restaurantId);

      res.json({
        token,
        user: {
          id: restaurantUser.id,
          email: restaurantUser.email,
          name: restaurantUser.name,
          restaurantId: restaurantId,
          permissions: permissions,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Restaurant management routes
  app.get("/api/restaurant/my-restaurants", authenticate, async (req, res) => {
    try {
      const restaurants = await restaurantStorage.getRestaurantsByOwner(req.user.id);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.post("/api/restaurant", authenticate, async (req, res) => {
    try {
      const restaurantData = insertRestaurantSchema.parse({
        ...req.body,
        ownerId: req.user.id,
      });

      const restaurant = await restaurantStorage.createRestaurant(restaurantData);
      res.json(restaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("Create restaurant error:", error);
      res.status(500).json({ message: error.message || "Failed to create restaurant" });
    }
  });

  app.get("/api/restaurant/:restaurantId", authenticateRestaurantUser, async (req, res) => {
    try {
      const restaurant = await restaurantStorage.getRestaurantById(parseInt(req.params.restaurantId));
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // User management routes
  app.get("/api/restaurant/:restaurantId/users", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.USERS_VIEW), 
    async (req, res) => {
      try {
        const users = await restaurantStorage.getRestaurantUsers(parseInt(req.params.restaurantId));
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
      }
    }
  );

  app.post("/api/restaurant/:restaurantId/users/invite", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.USERS_CREATE), 
    async (req, res) => {
      try {
        const inviteData = inviteUserSchema.parse(req.body);
        const restaurantId = parseInt(req.params.restaurantId);

        // Check if user already exists
        const existingUser = await restaurantStorage.getRestaurantUserByEmail(restaurantId, inviteData.email);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists in this restaurant" });
        }

        const user = await restaurantStorage.createRestaurantUser({
          restaurantId,
          email: inviteData.email,
          name: inviteData.name,
          roleId: inviteData.roleId,
          invitedBy: req.user?.id || req.restaurantUser?.id,
        });

        res.json(user);
      } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({ message: "Failed to invite user" });
      }
    }
  );

  // Update user
  app.put("/api/restaurant/:restaurantId/users/:userId",
    authenticateRestaurantUser,
    requirePermission(PERMISSIONS.USERS_EDIT),
    async (req, res) => {
      try {
        const restaurantId = parseInt(req.params.restaurantId);
        const userId = parseInt(req.params.userId);
        const updateData = req.body;

        const updatedUser = await restaurantStorage.updateRestaurantUser(userId, {
          name: updateData.name,
          email: updateData.email,
          roleId: parseInt(updateData.roleId),
          isActive: updateData.isActive,
        });

        res.json(updatedUser);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  );

  // Delete user
  app.delete("/api/restaurant/:restaurantId/users/:userId",
    authenticateRestaurantUser,
    requirePermission(PERMISSIONS.USERS_DELETE),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        await restaurantStorage.deleteRestaurantUser(userId);
        res.json({ message: "User removed successfully" });
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: "Failed to remove user" });
      }
    }
  );

  // Get available roles
  app.get("/api/restaurant/roles",
    authenticateRestaurantUser,
    async (req, res) => {
      try {
        const roles = await restaurantStorage.getRoles();
        res.json(roles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: "Failed to fetch roles" });
      }
    }
  );

  // Create custom role
  app.post("/api/restaurant/roles",
    authenticateRestaurantUser,
    requirePermission(PERMISSIONS.USERS_CREATE),
    async (req, res) => {
      try {
        const roleData = req.body;
        const role = await restaurantStorage.createRole({
          name: roleData.name,
          displayName: roleData.displayName,
          permissions: roleData.permissions,
          isSystem: false,
        });
        res.json(role);
      } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ message: "Failed to create role" });
      }
    }
  );

  // Booking management routes
  app.get("/api/restaurant/:restaurantId/bookings", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.BOOKINGS_VIEW), 
    async (req, res) => {
      try {
        const bookings = await restaurantStorage.getBookings(parseInt(req.params.restaurantId));
        res.json(bookings);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch bookings" });
      }
    }
  );

  app.post("/api/restaurant/:restaurantId/bookings", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.BOOKINGS_CREATE), 
    async (req, res) => {
      try {
        const bookingData = insertBookingSchema.parse({
          ...req.body,
          restaurantId: parseInt(req.params.restaurantId),
          createdBy: req.restaurantUser?.id,
        });

        const booking = await restaurantStorage.createBooking(bookingData);
        res.json(booking);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create booking" });
      }
    }
  );

  // Order management routes
  app.get("/api/restaurant/:restaurantId/orders", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.ORDERS_VIEW), 
    async (req, res) => {
      try {
        const orders = await restaurantStorage.getOrders(parseInt(req.params.restaurantId));
        res.json(orders);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch orders" });
      }
    }
  );

  app.post("/api/restaurant/:restaurantId/orders", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.ORDERS_CREATE), 
    async (req, res) => {
      try {
        const orderData = insertOrderSchema.parse({
          ...req.body,
          restaurantId: parseInt(req.params.restaurantId),
          createdBy: req.restaurantUser?.id,
        });

        const order = await restaurantStorage.createOrder(orderData);
        res.json(order);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  );

  // Table management routes
  app.get("/api/restaurant/:restaurantId/tables", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.TABLES_VIEW), 
    async (req, res) => {
      try {
        const tables = await restaurantStorage.getTables(parseInt(req.params.restaurantId));
        res.json(tables);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch tables" });
      }
    }
  );

  app.post("/api/restaurant/:restaurantId/tables", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.TABLES_CREATE), 
    async (req, res) => {
      try {
        const tableData = insertTableSchema.parse({
          ...req.body,
          restaurantId: parseInt(req.params.restaurantId),
        });

        const table = await restaurantStorage.createTable(tableData);
        res.json(table);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create table" });
      }
    }
  );

  // Customer management routes
  app.get("/api/restaurant/:restaurantId/customers", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.CUSTOMERS_VIEW), 
    async (req, res) => {
      try {
        const customers = await restaurantStorage.getCustomers(parseInt(req.params.restaurantId));
        res.json(customers);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch customers" });
      }
    }
  );

  app.post("/api/restaurant/:restaurantId/customers", 
    authenticateRestaurantUser, 
    requirePermission(PERMISSIONS.CUSTOMERS_CREATE), 
    async (req, res) => {
      try {
        const customerData = insertCustomerSchema.parse({
          ...req.body,
          restaurantId: parseInt(req.params.restaurantId),
        });

        const customer = await restaurantStorage.createCustomer(customerData);
        res.json(customer);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create customer" });
      }
    }
  );

  // Subscription plans
  app.get("/api/restaurant/subscription-plans", async (req, res) => {
    try {
      const plans = await restaurantStorage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Roles
  app.get("/api/restaurant/roles", async (req, res) => {
    try {
      const roles = await restaurantStorage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // User profile
  app.get("/api/restaurant/profile", authenticate, async (req, res) => {
    try {
      const limitCheck = await restaurantStorage.checkRestaurantLimit(req.user.id);
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          maxRestaurants: req.user.maxRestaurants,
        },
        restaurantLimit: limitCheck,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Initialize system (run once)
  app.post("/api/restaurant/init", async (req, res) => {
    try {
      await restaurantStorage.initializeSystem();
      res.json({ message: "System initialized successfully" });
    } catch (error) {
      console.error("System initialization error:", error);
      res.status(500).json({ message: "Failed to initialize system" });
    }
  });
}