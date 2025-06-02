import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertBookingSchema, insertCustomerSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key', {
  apiVersion: '2023-10-16'
});

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
          totalBookings: (customer.totalBookings || 0) + 1,
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, planId } = session.metadata!;

      // Create subscription in database
      await storage.createUserSubscription({
        userId: parseInt(userId),
        planId: parseInt(planId),
        stripeSubscriptionId: session.subscription as string,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active'
      });

      console.log(`Subscription created for user ${userId} with plan ${planId}`);
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}