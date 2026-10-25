import { defineConfig, devices } from "@playwright/test"

// Memakai Chrome yang sudah terpasang (channel "chrome"), jadi tidak perlu `playwright install`.
// Test yang butuh login membaca E2E_EMAIL dan E2E_PASSWORD dari env; tanpa itu, test tersebut dilewati.
const PORT = Number(process.env.E2E_PORT ?? 3200)

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  // Semua test memakai satu database (Supabase free, sama dengan produksi): jalankan berurutan.
  workers: 1,
  // Compile pertama di `next dev` bisa lebih dari 5 detik.
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
  },
  projects: [
    // Login sekali per akun QA; test lain memakai sesinya (lihat e2e/helpers/login.ts).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 900 } },
    },
    { name: "mobile", dependencies: ["setup"], use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm dev --port ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
})
