import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local" })

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Hanya schema public; tabel auth.users milik Supabase tidak disentuh.
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
})
