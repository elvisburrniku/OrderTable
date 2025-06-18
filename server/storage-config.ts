import { DatabaseStorage } from "./db-storage";
import { MemoryStorage } from "./mem-storage";

// Configure storage based on DATABASE_URL availability
let storage;
if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL found - connecting to Supabase database");
  storage = new DatabaseStorage();
} else {
  console.log("No DATABASE_URL - using memory storage for development");
  storage = new MemoryStorage();
}

// Initialize storage with default data
storage.initialize().catch(console.error);

export { storage };