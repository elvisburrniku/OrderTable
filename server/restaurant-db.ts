import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/restaurant-schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let restaurantDb: any = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  restaurantDb = drizzle({ client: pool, schema });
} else {
  console.log("No DATABASE_URL found - restaurant database operations will be disabled");
}

export { pool, restaurantDb };