import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Stripe from 'stripe';

// Initialize database connection
const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixSubscriptionDate() {
  try {
    console.log('Fetching current subscription data from Stripe...');
    
    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve('sub_1RZ9UTCi9JMBFIWGaBI8eOBg');
    
    console.log('Stripe subscription status:', subscription.status);
    console.log('Cancel at period end:', subscription.cancel_at_period_end);
    console.log('Current period end timestamp:', subscription.current_period_end);
    console.log('Current period start timestamp:', subscription.current_period_start);
    console.log('Full subscription object:', JSON.stringify(subscription, null, 2));
    
    // Calculate next billing date (1 month from now for monthly subscription)
    let nextBillingDate;
    if (subscription.current_period_end) {
      nextBillingDate = new Date(subscription.current_period_end * 1000);
    } else {
      // If no period end, calculate next month from current date
      nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
    
    console.log('Next billing date:', nextBillingDate.toISOString());
    
    // Update the database directly
    await sql`
      UPDATE tenants 
      SET subscription_end_date = ${nextBillingDate.toISOString()}
      WHERE id = 48
    `;
    
    console.log('Successfully updated subscription end date in database');
    
    // Verify the update
    const result = await sql`
      SELECT subscription_status, subscription_end_date 
      FROM tenants 
      WHERE id = 48
    `;
    
    console.log('Updated tenant data:', result[0]);
    
  } catch (error) {
    console.error('Error fixing subscription date:', error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fixSubscriptionDate();