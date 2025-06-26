// Add sample tenant users and roles for testing
import { Pool, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcrypt";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addSampleTenantData() {
  try {
    console.log("Adding sample tenant user management data...");

    // Create sample users if they don't exist
    const users = [
      {
        email: "owner@restaurant.com",
        name: "Restaurant Owner", 
        password: await bcrypt.hash("password123", 10)
      },
      {
        email: "manager@restaurant.com", 
        name: "Restaurant Manager",
        password: await bcrypt.hash("password123", 10)
      },
      {
        email: "agent@restaurant.com",
        name: "Booking Agent", 
        password: await bcrypt.hash("password123", 10)
      },
      {
        email: "kitchen@restaurant.com",
        name: "Kitchen Staff",
        password: await bcrypt.hash("password123", 10)
      }
    ];

    // Insert users
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (email, name, password) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (email) DO NOTHING
      `, [user.email, user.name, user.password]);
    }

    // Get sample tenant ID (assuming tenant ID 1 exists)
    const tenantResult = await pool.query("SELECT id FROM tenants LIMIT 1");
    if (tenantResult.rows.length === 0) {
      console.log("No tenants found. Creating sample tenant...");
      await pool.query(`
        INSERT INTO tenants (name, slug, subscription_plan_id) 
        VALUES ('Sample Restaurant', 'sample-restaurant', 1)
      `);
    }
    
    const tenantId = tenantResult.rows[0]?.id || 1;

    // Create system roles
    const systemRoles = [
      {
        name: "owner",
        displayName: "Owner", 
        permissions: JSON.stringify([
          "manage_users", "manage_restaurants", "manage_settings", 
          "view_analytics", "manage_billing", "manage_integrations"
        ]),
        isSystem: true
      },
      {
        name: "manager",
        displayName: "Manager",
        permissions: JSON.stringify([
          "manage_bookings", "view_analytics", "manage_staff",
          "manage_inventory", "view_reports"
        ]),
        isSystem: true
      },
      {
        name: "agent", 
        displayName: "Booking Agent",
        permissions: JSON.stringify([
          "create_bookings", "edit_bookings", "view_bookings", 
          "manage_customers", "view_calendar"
        ]),
        isSystem: true
      },
      {
        name: "kitchen_staff",
        displayName: "Kitchen Staff", 
        permissions: JSON.stringify([
          "view_orders", "update_order_status", "manage_menu",
          "view_kitchen_display"
        ]),
        isSystem: true
      }
    ];

    // Insert system roles
    for (const role of systemRoles) {
      await pool.query(`
        INSERT INTO roles (tenant_id, name, display_name, permissions, is_system) 
        VALUES (NULL, $1, $2, $3, $4) 
        ON CONFLICT DO NOTHING
      `, [role.name, role.displayName, role.permissions, role.isSystem]);
    }

    // Add users to tenant with appropriate roles
    const userRoleAssignments = [
      { email: "owner@restaurant.com", role: "owner" },
      { email: "manager@restaurant.com", role: "manager" }, 
      { email: "agent@restaurant.com", role: "agent" },
      { email: "kitchen@restaurant.com", role: "kitchen_staff" }
    ];

    for (const assignment of userRoleAssignments) {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE email = $1", 
        [assignment.email]
      );
      
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        
        await pool.query(`
          INSERT INTO tenant_users (tenant_id, user_id, role) 
          VALUES ($1, $2, $3) 
          ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3
        `, [tenantId, userId, assignment.role]);
      }
    }

    console.log("Sample tenant user management data added successfully!");
    
    // Display summary
    const usersCount = await pool.query(
      "SELECT COUNT(*) FROM tenant_users WHERE tenant_id = $1", 
      [tenantId]
    );
    
    const rolesCount = await pool.query("SELECT COUNT(*) FROM roles WHERE is_system = true");
    
    console.log(`Added ${usersCount.rows[0].count} users to tenant ${tenantId}`);
    console.log(`Created ${rolesCount.rows[0].count} system roles`);
    
  } catch (error) {
    console.error("Error adding sample data:", error);
  } finally {
    await pool.end();
  }
}

addSampleTenantData();