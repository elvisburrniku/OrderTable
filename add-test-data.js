
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Sample data arrays for realistic customer generation
const firstNames = [
  "John", "Jane", "Michael", "Sarah", "David", "Emily", "James", "Emma", "Robert", "Olivia",
  "William", "Ava", "Richard", "Isabella", "Charles", "Sophia", "Joseph", "Charlotte", "Thomas", "Mia",
  "Christopher", "Amelia", "Daniel", "Harper", "Matthew", "Evelyn", "Anthony", "Abigail", "Mark", "Emily",
  "Donald", "Elizabeth", "Steven", "Sofia", "Paul", "Avery", "Andrew", "Ella", "Joshua", "Madison",
  "Kenneth", "Scarlett", "Kevin", "Victoria", "Brian", "Aria", "George", "Grace", "Timothy", "Chloe"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
];

const emailDomains = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", 
  "protonmail.com", "live.com", "msn.com", "comcast.net"
];

const phoneAreaCodes = [
  "212", "213", "214", "215", "216", "217", "218", "219", "224", "225",
  "226", "228", "229", "231", "234", "239", "240", "248", "251", "252"
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomPhone() {
  const areaCode = getRandomElement(phoneAreaCodes);
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${exchange}${number}`;
}

function generateRandomEmail(firstName, lastName) {
  const domain = getRandomElement(emailDomains);
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}${Math.floor(Math.random() * 999)}@${domain}`,
    `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}@${domain}`
  ];
  return getRandomElement(variations);
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomTime() {
  const hours = [17, 18, 19, 20, 21, 22]; // Common dinner hours
  const minutes = ["00", "15", "30", "45"];
  const hour = getRandomElement(hours);
  const minute = getRandomElement(minutes);
  return `${hour}:${minute}`;
}

async function addTestData() {
  try {
    console.log("Starting to add test data...");

    // Get the first restaurant and tenant for testing
    const restaurantResult = await pool.query(`
      SELECT r.id as restaurant_id, r.tenant_id 
      FROM restaurants r 
      INNER JOIN tenants t ON r.tenant_id = t.id 
      ORDER BY r.id 
      LIMIT 1
    `);

    if (restaurantResult.rows.length === 0) {
      console.error("No restaurants found. Please create a restaurant first.");
      return;
    }

    const { restaurant_id: restaurantId, tenant_id: tenantId } = restaurantResult.rows[0];
    console.log(`Using restaurant ID: ${restaurantId}, tenant ID: ${tenantId}`);

    // Get available tables
    const tablesResult = await pool.query(`
      SELECT id, capacity FROM tables WHERE restaurant_id = $1 AND is_active = true
    `, [restaurantId]);

    if (tablesResult.rows.length === 0) {
      console.error("No tables found for this restaurant. Please create tables first.");
      return;
    }

    const tables = tablesResult.rows;
    console.log(`Found ${tables.length} tables`);

    // Generate 1000 customers
    console.log("Generating 1000 customers...");
    const customers = [];
    const customerBatch = [];

    for (let i = 0; i < 1000; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const email = generateRandomEmail(firstName, lastName);
      const phone = generateRandomPhone();
      const totalBookings = Math.floor(Math.random() * 10) + 1; // 1-10 previous bookings
      
      const customer = {
        restaurant_id: restaurantId,
        tenant_id: tenantId,
        name: `${firstName} ${lastName}`,
        email: email,
        phone: phone,
        total_bookings: totalBookings,
        is_walk_in: Math.random() < 0.1, // 10% walk-ins
        notes: Math.random() < 0.3 ? "VIP customer" : null,
        last_visit: getRandomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date())
      };

      customers.push(customer);
      customerBatch.push(`(${restaurantId}, ${tenantId}, '${customer.name}', '${customer.email}', '${customer.phone}', ${customer.total_bookings}, ${customer.is_walk_in}, ${customer.notes ? `'${customer.notes}'` : 'NULL'}, '${customer.last_visit.toISOString()}')`);

      // Insert in batches of 100
      if (customerBatch.length === 100 || i === 999) {
        const query = `
          INSERT INTO customers (restaurant_id, tenant_id, name, email, phone, total_bookings, is_walk_in, notes, last_visit)
          VALUES ${customerBatch.join(', ')}
          RETURNING id, name
        `;
        
        try {
          const result = await pool.query(query);
          console.log(`Inserted batch of ${result.rows.length} customers`);
          customerBatch.length = 0; // Clear the batch
        } catch (error) {
          console.error("Error inserting customer batch:", error);
          // Continue with next batch
          customerBatch.length = 0;
        }
      }
    }

    // Get inserted customers for booking generation
    const insertedCustomers = await pool.query(`
      SELECT id, name, email, phone FROM customers 
      WHERE restaurant_id = $1 
      ORDER BY id DESC 
      LIMIT 1000
    `, [restaurantId]);

    console.log(`Retrieved ${insertedCustomers.rows.length} customers for booking generation`);

    // Generate 1000 bookings
    console.log("Generating 1000 bookings...");
    const bookingBatch = [];
    const bookingStatuses = ["confirmed", "pending", "cancelled", "completed"];
    const bookingSources = ["manual", "online", "phone", "walk_in"];

    for (let i = 0; i < 1000; i++) {
      const customer = getRandomElement(insertedCustomers.rows);
      const table = getRandomElement(tables);
      const guestCount = Math.min(Math.floor(Math.random() * 8) + 1, table.capacity); // 1-8 guests, max table capacity
      const status = getRandomElement(bookingStatuses);
      const source = getRandomElement(bookingSources);
      
      // Generate booking date within next 60 days
      const bookingDate = getRandomDate(new Date(), new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
      const startTime = getRandomTime();
      
      // Calculate end time (1.5-3 hours later)
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const durationHours = Math.random() * 1.5 + 1.5; // 1.5-3 hours
      const endDate = new Date(bookingDate);
      endDate.setHours(startHour);
      endDate.setMinutes(startMinute);
      endDate.setTime(endDate.getTime() + (durationHours * 60 * 60 * 1000));
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      const notes = Math.random() < 0.3 ? [
        "Anniversary dinner", "Birthday celebration", "Business meeting", 
        "Date night", "Family gathering", "Special occasion"
      ][Math.floor(Math.random() * 6)] : null;

      bookingBatch.push(`(${restaurantId}, ${tenantId}, ${Math.random() < 0.8 ? table.id : 'NULL'}, ${customer.id}, '${customer.name}', '${customer.email}', '${customer.phone}', ${guestCount}, '${bookingDate.toISOString()}', '${startTime}', '${endTime}', '${status}', '${source}', ${notes ? `'${notes}'` : 'NULL'})`);

      // Insert in batches of 100
      if (bookingBatch.length === 100 || i === 999) {
        const query = `
          INSERT INTO bookings (restaurant_id, tenant_id, table_id, customer_id, customer_name, customer_email, customer_phone, guest_count, booking_date, start_time, end_time, status, source, notes)
          VALUES ${bookingBatch.join(', ')}
          RETURNING id
        `;
        
        try {
          const result = await pool.query(query);
          console.log(`Inserted batch of ${result.rows.length} bookings`);
          bookingBatch.length = 0; // Clear the batch
        } catch (error) {
          console.error("Error inserting booking batch:", error);
          // Continue with next batch
          bookingBatch.length = 0;
        }
      }
    }

    // Generate management hashes for bookings that don't have them
    console.log("Generating management hashes for new bookings...");
    const { BookingHash } = await import("./server/booking-hash.js");
    
    const bookingsWithoutHash = await pool.query(`
      SELECT id, tenant_id, restaurant_id 
      FROM bookings 
      WHERE management_hash IS NULL OR management_hash = ''
      AND restaurant_id = $1
    `, [restaurantId]);

    for (const booking of bookingsWithoutHash.rows) {
      const managementHash = BookingHash.generateHash(
        booking.id,
        booking.tenant_id,
        booking.restaurant_id,
        'manage'
      );
      
      await pool.query(`
        UPDATE bookings 
        SET management_hash = $1
        WHERE id = $2
      `, [managementHash, booking.id]);
    }

    console.log(`Updated ${bookingsWithoutHash.rows.length} booking management hashes`);

    // Final summary
    const finalCustomerCount = await pool.query(`
      SELECT COUNT(*) FROM customers WHERE restaurant_id = $1
    `, [restaurantId]);

    const finalBookingCount = await pool.query(`
      SELECT COUNT(*) FROM bookings WHERE restaurant_id = $1
    `, [restaurantId]);

    console.log("\n=== Test Data Generation Complete ===");
    console.log(`Total customers in restaurant ${restaurantId}: ${finalCustomerCount.rows[0].count}`);
    console.log(`Total bookings in restaurant ${restaurantId}: ${finalBookingCount.rows[0].count}`);
    console.log("Test data generation successful!");

  } catch (error) {
    console.error("Error adding test data:", error);
  } finally {
    await pool.end();
  }
}

addTestData();
