import { expect, test } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test("halaman terproteksi mengarah ke login dengan tujuan semula", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible()
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  })
})

test("kata sandi salah menampilkan pesan yang jelas", async ({ page }) => {
  test.skip(!email, "E2E_EMAIL belum diisi")
  await page.goto("/login")
  await page.getByLabel("Email").fill(email!)
  await page.getByLabel("Kata sandi", { exact: true }).fill("salah-sekali-123")
  await page.getByRole("button", { name: "Masuk" }).click()
  // Bukan getByRole("alert"): Next punya #__next-route-announcer__ yang juga role="alert".
  await expect(page.locator("#login-error")).toHaveText("Email atau kata sandi salah.")
  // Email tetap terisi setelah gagal, supaya cukup memperbaiki kata sandi.
  await expect(page.getByLabel("Email")).toHaveValue(email!)
  await page.screenshot({ path: `test-results/login-error-${test.info().project.name}.png` })
})

test("login, kembali ke tujuan, lalu keluar", async ({ page }) => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD belum diisi")
  await page.goto("/dashboard")
  await page.getByLabel("Email").fill(email!)
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!)
  await page.getByRole("button", { name: "Masuk" }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("heading", { name: /^Halo, .+!$/ })).toBeVisible()
  await page.screenshot({ path: `test-results/dashboard-${test.info().project.name}.png` })

  // Sudah login: membuka /login langsung diarahkan ke dashboard.
  await page.goto("/login")
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.getByRole("button", { name: /^Akun / }).click()
  await page.getByRole("menuitem", { name: "Keluar" }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login/)
})
