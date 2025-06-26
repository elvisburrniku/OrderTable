import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// For development, we'll use a fallback or handle gracefully
let db: any;
let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  console.log("No database connection string found. Database operations will be disabled until proper connection is configured.");
  // Create a mock db object for development
  db = null;
}

export { pool, db };
