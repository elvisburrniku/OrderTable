import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Initialize database connection only if DATABASE_URL is provided
let pool: Pool | null = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  console.log("Initializing Supabase database connection...");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  console.log("No DATABASE_URL provided, database connection will be null");
}

export { pool, db };
