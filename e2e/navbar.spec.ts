import { expect, type Page, test } from "@playwright/test"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasir = { email: process.env.E2E_KASIR_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, email: string, password: string, path = "/dashboard") {
  await loginAs(page, email, password, path)
  await page.waitForURL(/\/dashboard/)
}

test("Admin melihat semua menu dan bisa membuka Input Pesanan", async ({ page }, info) => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")
  await login(page, admin.email!, admin.password!)
  const isDesktop = info.project.name === "desktop"

  if (isDesktop) {
    const nav = page.getByRole("navigation", { name: "Menu utama" })
    await expect(nav.getByRole("link")).toHaveText([
      "Dashboard",
      "Pesanan",
      "Pembayaran",
      "Produksi",
      "Packaging",
      "Pengiriman",
      "Laporan",
      "Stok Packaging",
      "Master Data",
    ])
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await nav.getByRole("link", { name: "Pengiriman" }).click()
    await expect(page.getByRole("heading", { name: "Pengiriman" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Pengiriman" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await page.screenshot({ path: `test-results/navbar-${info.project.name}.png` })
  } else {
    await page.getByRole("button", { name: "Buka menu" }).click()
    const sheet = page.getByRole("dialog")
    await expect(sheet.getByRole("link")).toHaveCount(9)
    await page.screenshot({ path: `test-results/navbar-menu-${info.project.name}.png` })
    await sheet.getByRole("link", { name: "Laporan" }).click()
    await expect(page.getByRole("heading", { name: "Laporan" })).toBeVisible()
    await expect(page.getByRole("dialog")).toBeHidden()
  }

  await page.getByRole("button", { name: "Input Pesanan" }).click()
  const dialog = page.getByRole("dialog", { name: "Input Pesanan" })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Pesan WhatsApp").fill("Halo kak, pesan 2 Spaghetti Bolognese Large")
  await page.screenshot({ path: `test-results/input-pesanan-${info.project.name}.png` })
  await dialog.getByRole("button", { name: "Reset" }).click()
  await expect(dialog.getByLabel("Pesan WhatsApp")).toHaveValue("")
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
})

test("navbar tidak membuat halaman melebar ke samping", async ({ page }, info) => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")
  await login(page, admin.email!, admin.password!)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, `lebar berlebih di ${info.project.name}`).toBeLessThanOrEqual(0)
  await expect(page.getByRole("button", { name: /^Akun / })).toBeInViewport()

  if (info.project.name === "desktop") {
    // Laptop 1280 px: batas terkecil navbar penuh (breakpoint xl).
    await page.setViewportSize({ width: 1280, height: 800 })
    const laptopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(laptopOverflow, "lebar berlebih di 1280 px").toBeLessThanOrEqual(0)
    await expect(page.getByRole("button", { name: /^Akun / })).toBeInViewport()
    await page.screenshot({ path: "test-results/navbar-1280.png" })
  }
})

test("Kasir hanya melihat menunya dan ditolak membuka Laporan", async ({ page }, info) => {
  test.skip(!kasir.email || !kasir.password, "E2E_KASIR_EMAIL / E2E_PASSWORD belum diisi")
  test.skip(info.project.name !== "desktop", "cukup dicek di desktop")
  await login(page, kasir.email!, kasir.password!)

  const nav = page.getByRole("navigation", { name: "Menu utama" })
  await expect(nav.getByRole("link")).toHaveText([
    "Dashboard",
    "Pesanan",
    "Pembayaran",
    "Pengiriman",
    "Master Data",
  ])

  await page.goto("/laporan")
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("Halaman itu tidak tersedia untuk role kamu.")).toBeVisible()
})
