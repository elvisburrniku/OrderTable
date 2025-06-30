
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { roles } from "./shared/schema.ts";

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function seedRoles() {
  try {
    console.log("Seeding system roles...");

    const defaultRoles = [
      {
        tenantId: null,
        name: "owner",
        displayName: "Owner",
        permissions: JSON.stringify([
          "access_dashboard", "access_bookings", "access_customers", "access_menu",
          "access_tables", "access_kitchen", "access_users", "access_billing",
          "access_reports", "access_notifications", "access_integrations", "access_settings",
          "access_floor_plan", "view_bookings", "create_bookings", "edit_bookings",
          "delete_bookings", "view_customers", "edit_customers", "view_settings",
          "edit_settings", "view_menu", "edit_menu", "view_tables", "edit_tables",
          "view_kitchen", "manage_kitchen", "view_users", "manage_users",
          "view_billing", "manage_billing", "view_reports", "view_notifications",
          "manage_notifications", "view_integrations", "manage_integrations"
        ]),
        isSystem: true,
      },
      {
        tenantId: null,
        name: "manager",
        displayName: "Manager",
        permissions: JSON.stringify([
          "access_dashboard", "access_bookings", "access_customers", "access_menu",
          "access_tables", "access_kitchen", "access_reports", "access_settings",
          "view_bookings", "create_bookings", "edit_bookings", "delete_bookings",
          "view_customers", "edit_customers", "view_settings", "edit_settings",
          "view_menu", "edit_menu", "view_tables", "edit_tables",
          "view_kitchen", "manage_kitchen", "view_reports"
        ]),
        isSystem: true,
      },
      {
        tenantId: null,
        name: "agent",
        displayName: "Booking Agent",
        permissions: JSON.stringify([
          "access_dashboard", "access_bookings", "access_customers",
          "view_bookings", "create_bookings", "edit_bookings",
          "view_customers", "edit_customers"
        ]),
        isSystem: true,
      },
      {
        tenantId: null,
        name: "kitchen_staff",
        displayName: "Kitchen Staff",
        permissions: JSON.stringify([
          "access_dashboard", "access_kitchen",
          "view_kitchen", "manage_kitchen"
        ]),
        isSystem: true,
      },
    ];

    // Insert roles with conflict handling
    for (const role of defaultRoles) {
      try {
        await db.insert(roles).values(role).onConflictDoNothing();
        console.log(`✓ Role '${role.name}' seeded successfully`);
      } catch (error) {
        console.log(`- Role '${role.name}' already exists`);
      }
    }

    console.log("Role seeding completed!");
  } catch (error) {
    console.error("Error seeding roles:", error);
  } finally {
    await client.end();
  }
}

seedRoles();
