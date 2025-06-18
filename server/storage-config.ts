import { DatabaseStorage } from "./db-storage";
import { MemoryStorage } from "./mem-storage";

// Use Supabase database now that DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  console.log("No database configured, using in-memory storage for development");
  export const storage = new MemoryStorage();
} else {
  console.log("Database configured, using Supabase database storage");
  export const storage = new DatabaseStorage();
}

// Initialize storage with default data
storage.initialize().catch(console.error);