import { expect, type Page, test } from "@playwright/test"

import { removeQaOrders, seedReportOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

// Data uji seedReportOrders (Feb-Mar 2021). Acuan 2 Mar, periode 7 hari = 24 Feb - 2 Mar:
// 4 pesanan aktif (3 Personal, 1 Hadiah), lunas 65.000 + 130.000 + 40.000 = 235.000,
// Kurir Internal 2, Instant 1, Pick Up 1. Dikirim 2 Mar: 1 Bolognese L + 1 Choco Bon Bon.
const URL = "/dashboard?tanggal=2021-03-02&periode=7"

test.describe("Dashboard", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("Admin: KPI, pesanan terbaru, grafik, rekap produksi, stok", async ({ page }, info) => {
    code = `${Date.now()}`
    await seedReportOrders(code)
    await login(page, admin.email!, URL)

    await expect(page.getByRole("heading", { name: /^Halo, .+!$/ })).toBeVisible()
    await expect(page.getByRole("button", { name: "7 Hari" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    const kpi = (label: string) => page.getByText(label, { exact: true }).first().locator("..")
    await expect(kpi("Total Pesanan")).toContainText("4")
    await expect(kpi("Pesanan Personal")).toContainText("3")
    await expect(kpi("Pesanan Hadiah")).toContainText("1")
    await expect(kpi("Total Pembayaran")).toContainText("Rp 235.000")

    const latest = page.getByRole("region", { name: "Daftar Pesanan Terbaru" }).getByRole("row")
    await expect(latest).toHaveCount(5) // header + 4
    await expect(latest.nth(1)).toContainText(`QA${code}04`)

    const methods = page.getByRole("region", { name: "Pesanan per Metode Pengiriman" })
    await expect(methods.getByRole("listitem").filter({ hasText: "Kurir Internal" })).toContainText(
      "2 (50%)",
    )
    const status = page.getByRole("region", { name: "Status Pesanan 7 Hari" })
    await expect(status.getByRole("table", { name: "Pesanan per status" })).toContainText(
      "Selesai2",
    )

    const production = page.getByRole("region", { name: /^Rekap Produksi/ })
    await expect(production.getByText("Spaghetti Classico Bologna Brulee")).toBeVisible()
    await expect(production.getByText("Choco Bon Bon")).toBeVisible()
    await expect(page.getByRole("region", { name: "Stok Packaging (Ringkas)" })).toContainText(
      "Box Dessert",
    )
    await page.screenshot({
      path: `test-results/dashboard-${info.project.name}.png`,
      fullPage: true,
    })
  })

  test("isi menyesuaikan role: Produksi tanpa uang & daftar pesanan, Kasir ke Pembayaran", async ({
    page,
    browser,
  }, info) => {
    test.skip(
      !produksiEmail || !kasirEmail || info.project.name !== "desktop",
      "butuh akun QA Produksi & Kasir, desktop saja",
    )
    await login(page, produksiEmail!, "/dashboard")
    await expect(page.getByText("Total Porsi Hari Ini")).toBeVisible()
    await expect(page.getByText("Total Pembayaran Hari Ini")).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Daftar Pesanan Terbaru" })).toHaveCount(0)

    const kasir = await browser.newPage()
    await login(kasir, kasirEmail!, "/dashboard")
    await expect(
      kasir
        .getByRole("region", { name: "Total Pembayaran" })
        .getByRole("link", { name: "Lihat Detail" }),
    ).toHaveAttribute("href", "/pembayaran")
    await kasir.close()
  })
})
