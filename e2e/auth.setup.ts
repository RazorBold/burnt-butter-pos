import { mkdirSync, rmSync } from "node:fs"
import path from "node:path"

import { expect, test as setup } from "@playwright/test"

import { sessionFile } from "./helpers/login"

const password = process.env.E2E_PASSWORD
const accounts = [
  process.env.E2E_EMAIL,
  process.env.E2E_KASIR_EMAIL,
  process.env.E2E_PRODUKSI_EMAIL,
].filter((email): email is string => Boolean(email))

// Sesi lama dibuang: kata sandi QA disetel ulang setiap run.
rmSync(path.resolve("e2e/.auth"), { recursive: true, force: true })
mkdirSync(path.resolve("e2e/.auth"), { recursive: true })

for (const email of accounts) {
  setup(`login sekali sebagai ${email}`, async ({ page }) => {
    setup.skip(!password, "E2E_PASSWORD belum diisi")
    await page.goto("/login")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Kata sandi", { exact: true }).fill(password!)
    await page.getByRole("button", { name: "Masuk" }).click()
    await expect(page).toHaveURL(/\/dashboard/)
    await page.context().storageState({ path: sessionFile(email) })
  })
}
