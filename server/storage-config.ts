import { DatabaseStorage } from "./db-storage";
import { MemoryStorage } from "./mem-storage";

// Temporarily using memory storage while Supabase connection is being configured
console.log("Using memory storage - Supabase database connection needs to be configured");
const storage = new MemoryStorage();

// Initialize storage with default data
storage.initialize().catch(console.error);

export { storage };