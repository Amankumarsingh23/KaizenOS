import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI (migrate/generate/studio) always needs a direct connection.
    // In production: DIRECT_URL = Supabase port 5432 (no pgBouncer).
    // In dev: set DIRECT_URL (or DATABASE_URL as fallback) in .env.local.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
