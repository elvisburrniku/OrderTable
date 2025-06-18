import { MemoryStorage } from "./mem-storage";

// Force memory storage due to database connectivity issues
console.log("Using memory storage due to database connectivity issues");
export const storage = new MemoryStorage();

// Initialize storage with default data
storage.initialize().catch(console.error);