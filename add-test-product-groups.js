
const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const { productGroups } = require("./shared/schema");

async function addTestProductGroups() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  const testGroups = [
    { groupName: "Appetizers", quantity: 15, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Main Courses", quantity: 25, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Desserts", quantity: 12, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Beverages", quantity: 30, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Salads", quantity: 8, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Soups", quantity: 6, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Pizza", quantity: 18, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Pasta", quantity: 14, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Seafood", quantity: 10, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Vegetarian", quantity: 16, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Grilled Items", quantity: 12, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Sandwiches", quantity: 9, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Burgers", quantity: 7, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Coffee & Tea", quantity: 20, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Wine", quantity: 35, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Beer", quantity: 22, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Cocktails", quantity: 15, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Frozen Treats", quantity: 8, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Kids Menu", quantity: 6, status: "active", restaurantId: 1, tenantId: 1 },
    { groupName: "Seasonal Specials", quantity: 5, status: "inactive", restaurantId: 1, tenantId: 1 }
  ];

  try {
    console.log("Adding 20 test product groups...");
    
    const insertedGroups = await db.insert(productGroups).values(testGroups).returning();
    
    console.log(`Successfully added ${insertedGroups.length} product groups:`);
    insertedGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.groupName} (${group.quantity} items) - ${group.status}`);
    });
    
  } catch (error) {
    console.error("Error adding test product groups:", error);
  }
}

addTestProductGroups();
