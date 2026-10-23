import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

import { directDatabaseUrl } from "./src/db/url"

config({ path: ".env.local", quiet: true })

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Hanya schema public; tabel auth.users milik Supabase tidak disentuh.
  schemaFilter: ["public"],
  dbCredentials: {
    url: directDatabaseUrl() ?? "",
  },
  strict: true,
  verbose: true,
})
