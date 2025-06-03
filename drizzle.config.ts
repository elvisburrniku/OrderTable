import { defineConfig } from "drizzle-kit";

if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL!,
  },
});