import { expect, type Page, test } from "@playwright/test"

import { expectAccessDenied } from "./helpers/access"
import { removeQaOrders, seedReportOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const ownerEmail = process.env.E2E_OWNER_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

test.describe("Laporan", () => {
  test.skip(!ownerEmail || !admin.password, "E2E_OWNER_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("Ringkasan: KPI + tren, donat, produk terlaris, metode bayar", async ({ page }, info) => {
    code = `${Date.now()}`
    await seedReportOrders(code)
    await login(page, ownerEmail!, "/laporan?dari=2021-03-01&sampai=2021-03-03")

    await expect(page.getByRole("heading", { name: "Laporan", level: 1 })).toBeVisible()
    // Label KPI pertama di halaman (Total Pembayaran juga muncul di kartu Metode Pembayaran).
    const kpi = (label: string) => page.getByText(label, { exact: true }).first().locator("..")
    // 3 pesanan aktif (pembanding 1 → naik 200%), 4 porsi, Rp 170.000 lunas, 1 customer.
    await expect(kpi("Total Pesanan")).toContainText("3")
    await expect(kpi("Total Pesanan").locator("..")).toContainText("200%")
    await expect(kpi("Total Produk Terjual")).toContainText("4 porsi")
    await expect(kpi("Total Pembayaran")).toContainText("Rp 170.000")
    await expect(kpi("Total Customer")).toContainText("1")

    const shipping = page.getByRole("region", { name: "Distribusi Pesanan per Metode Pengiriman" })
    await expect(
      shipping.getByRole("listitem").filter({ hasText: "Kurir Internal" }),
    ).toContainText("1(33%)")
    const status = page.getByRole("region", { name: "Status Pesanan" })
    await expect(status.getByRole("listitem").filter({ hasText: "Dikirim" })).toContainText("1")
    await expect(status.getByText("1 pesanan dibatalkan tidak dihitung.")).toBeVisible()

    const top = page.getByRole("region", { name: "Produk Terlaris" }).getByRole("row")
    await expect(top.nth(1)).toContainText("Spaghetti Classico Bologna Brulee")
    await expect(top.nth(1)).toContainText("75%")
    await expect(top.nth(2)).toContainText("Choco Bon Bon")

    const pay = page.getByRole("region", { name: "Metode Pembayaran" })
    await expect(pay.getByRole("img", { name: /^Bank 76%/ })).toBeVisible()
    await expect(pay.getByRole("img", { name: /^E-Wallet 24%/ })).toBeVisible()

    // Toggle Pesanan / Pendapatan di Rekap Penjualan per Hari.
    const daily = page.getByRole("region", { name: "Rekap Penjualan per Hari" })
    await daily.getByRole("radio", { name: "Pendapatan" }).click()
    await expect(daily.getByRole("table", { name: "Pendapatan per hari" })).toContainText(
      "Rp 130.000",
    )
    await page.screenshot({ path: `test-results/laporan-${info.project.name}.png`, fullPage: true })
  })

  test("Admin dan Kasir tidak bisa membuka Laporan (khusus Owner)", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    for (const email of [admin.email!, kasirEmail!]) {
      await login(page, email, "/laporan")
      await expectAccessDenied(page)
    }
  })
})
