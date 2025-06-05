
import { Request, Response } from "express";

export function setupSupportRoutes(app: any) {
  // Submit support ticket
  app.post("/api/support/ticket", async (req: Request, res: Response) => {
    try {
      const { type, subject, message, priority, userId, restaurantId, userEmail, restaurantName } = req.body;

      // In a real app, you would save this to a database and/or send to a support system
      console.log("Support ticket submitted:", {
        type,
        subject,
        message,
        priority,
        userId,
        restaurantId,
        userEmail,
        restaurantName,
        timestamp: new Date(),
      });

      // You could also send an email notification here
      // await sendSupportNotification({ type, subject, message, userEmail, restaurantName });

      res.json({ 
        success: true, 
        message: "Support ticket submitted successfully",
        ticketId: `TICKET-${Date.now()}` 
      });
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      res.status(500).json({ error: "Failed to submit support ticket" });
    }
  });

  // Submit bug report
  app.post("/api/support/bug-report", async (req: Request, res: Response) => {
    try {
      const { 
        title, 
        description, 
        stepsToReproduce, 
        expectedBehavior, 
        actualBehavior, 
        browserInfo, 
        severity,
        userId,
        restaurantId,
        userEmail,
        restaurantName
      } = req.body;

      // In a real app, you would save this to a database and/or send to a bug tracking system
      console.log("Bug report submitted:", {
        title,
        description,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        browserInfo,
        severity,
        userId,
        restaurantId,
        userEmail,
        restaurantName,
        timestamp: new Date(),
      });

      // You could also send to a bug tracking system like Jira, GitHub Issues, etc.
      // await createBugReport({ title, description, severity, userEmail, restaurantName });

      res.json({ 
        success: true, 
        message: "Bug report submitted successfully",
        reportId: `BUG-${Date.now()}` 
      });
    } catch (error) {
      console.error("Error submitting bug report:", error);
      res.status(500).json({ error: "Failed to submit bug report" });
    }
  });

  // Get payment methods (placeholder)
  app.get("/api/users/:userId/payment-methods", async (req: Request, res: Response) => {
    try {
      // In a real app, you would fetch from Stripe or your database
      res.json([
        {
          id: "pm_1234567890",
          last4: "4242",
          brand: "visa",
          expMonth: 12,
          expYear: 25,
          isDefault: true,
        }
      ]);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  // Get billing history (placeholder)
  app.get("/api/users/:userId/billing-history", async (req: Request, res: Response) => {
    try {
      // In a real app, you would fetch from Stripe or your database
      res.json([
        {
          id: "in_1234567890",
          amount: 2900,
          status: "paid",
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          invoiceUrl: "https://invoice.stripe.com/example",
        }
      ]);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({ error: "Failed to fetch billing history" });
    }
  });

  // Add payment method (placeholder)
  app.post("/api/payment-methods", async (req: Request, res: Response) => {
    try {
      const { cardNumber, expiryMonth, expiryYear, cvv, name } = req.body;

      // In a real app, you would use Stripe to create a payment method
      console.log("Adding payment method:", { cardNumber: "****" + cardNumber.slice(-4), name });

      res.json({ 
        success: true, 
        message: "Payment method added successfully" 
      });
    } catch (error) {
      console.error("Error adding payment method:", error);
      res.status(500).json({ error: "Failed to add payment method" });
    }
  });

  // Remove payment method (placeholder)
  app.delete("/api/payment-methods/:methodId", async (req: Request, res: Response) => {
    try {
      const { methodId } = req.params;

      // In a real app, you would use Stripe to detach the payment method
      console.log("Removing payment method:", methodId);

      res.json({ 
        success: true, 
        message: "Payment method removed successfully" 
      });
    } catch (error) {
      console.error("Error removing payment method:", error);
      res.status(500).json({ error: "Failed to remove payment method" });
    }
  });

  // Create billing portal session (placeholder)
  app.post("/api/create-billing-portal-session", async (req: Request, res: Response) => {
    try {
      const { returnUrl } = req.body;

      // In a real app, you would create a Stripe billing portal session
      res.json({ 
        url: "https://billing.stripe.com/session/example" 
      });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ error: "Failed to create billing portal session" });
    }
  });

  // Update user profile
  app.put("/api/users/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { name, email } = req.body;

      // In a real app, you would update the user in your database
      console.log("Updating user:", { userId, name, email });

      res.json({ 
        success: true, 
        message: "User updated successfully" 
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Update restaurant settings
  app.put("/api/tenants/:tenantId/restaurants/:restaurantId/settings", async (req: Request, res: Response) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const { emailSettings, appSettings } = req.body;

      // In a real app, you would update the settings in your database
      console.log("Updating restaurant settings:", { tenantId, restaurantId, emailSettings, appSettings });

      res.json({ 
        success: true, 
        message: "Settings updated successfully" 
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
}
