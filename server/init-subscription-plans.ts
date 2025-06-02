
import { storage } from "./storage";

async function initializeSubscriptionPlans() {
  console.log("Initializing subscription plans...");

  const plans = [
    {
      name: "Starter",
      price: 2900, // $29.00
      interval: "monthly",
      features: JSON.stringify([
        "Basic booking management",
        "Email notifications",
        "Customer database"
      ]),
      maxTables: 10,
      maxBookingsPerMonth: 100,
      isActive: true
    },
    {
      name: "Professional",
      price: 4900, // $49.00
      interval: "monthly",
      features: JSON.stringify([
        "Advanced booking management",
        "SMS notifications",
        "Custom fields",
        "Feedback system",
        "Analytics"
      ]),
      maxTables: 25,
      maxBookingsPerMonth: 500,
      isActive: true
    },
    {
      name: "Enterprise",
      price: 9900, // $99.00
      interval: "monthly",
      features: JSON.stringify([
        "All Professional features",
        "Payment processing",
        "API access",
        "Custom integrations",
        "Priority support"
      ]),
      maxTables: 100,
      maxBookingsPerMonth: 2000,
      isActive: true
    }
  ];

  try {
    const existingPlans = await storage.getSubscriptionPlans();
    
    if (existingPlans.length === 0) {
      for (const plan of plans) {
        await storage.createSubscriptionPlan(plan);
        console.log(`Created plan: ${plan.name}`);
      }
      console.log("Subscription plans initialized successfully!");
    } else {
      console.log("Subscription plans already exist, skipping initialization.");
    }
  } catch (error) {
    console.error("Error initializing subscription plans:", error);
  }
}

// Run if called directly
if (require.main === module) {
  initializeSubscriptionPlans().then(() => process.exit(0));
}

export { initializeSubscriptionPlans };
