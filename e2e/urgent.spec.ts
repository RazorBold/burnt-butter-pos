import { expect, type Page, test } from "@playwright/test"

import { removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

const popupOf = (page: Page) => page.getByRole("alertdialog", { name: /URGENT/ })

// Pesanan uji (QA Customer …) hanya memicu popup di akun QA, jadi staf asli tidak terganggu.
test.describe("Pesanan urgent", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("tandai urgent: label merah, popup di akun lain, Saya mengerti, hapus urgent", async ({
    page,
    browser,
  }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    test.setTimeout(90_000)
    code = `${Date.now()}`
    const orderNo = `QA${code}01`
    await seedQaOrders(code, 1, 0, { plan: [{ status: "baru", method: "instant" }] })

    // Admin pesanan menandai urgent dari menu ⋮ baris.
    await loginAs(page, admin.email!, admin.password!, `/pesanan?q=${code}`)
    const row = page.getByRole("row", { name: new RegExp(orderNo) })
    await row.getByRole("button", { name: `Aksi untuk ${orderNo}` }).click()
    await page.getByRole("menuitem", { name: "Tandai urgent" }).click()
    const dialog = page.getByRole("dialog", { name: `Tandai ${orderNo} URGENT?` })
    await dialog.getByLabel(/^Alasan/).fill("QA customer minta jam 10")
    await dialog.getByRole("button", { name: "Tandai urgent" }).click()
    await expect(page.getByText(`${orderNo} ditandai URGENT.`, { exact: false })).toBeVisible()
    await expect(row.getByText("Urgent", { exact: true })).toBeVisible()

    // Akun lain (Kasir) mendapat popup.
    const kasir = await browser.newPage()
    await loginAs(kasir, kasirEmail!, admin.password!, "/pesanan")
    const popup = popupOf(kasir)
    await expect(popup).toBeVisible({ timeout: 20_000 })
    await expect(popup).toContainText(orderNo)
    await expect(popup).toContainText("QA customer minta jam 10")
    await expect(popup).toContainText("Ditandai QA Admin")
    await kasir.screenshot({ path: "test-results/urgent-popup-desktop.png" })
    await popup.getByRole("button", { name: "Saya mengerti" }).click()
    await expect(popup).toBeHidden()
    // Sudah dilihat: tidak muncul lagi setelah muat ulang dan polling berikutnya.
    await kasir.reload()
    await kasir.waitForTimeout(12_000)
    await expect(popupOf(kasir)).toBeHidden()
    await kasir.close()

    // Admin juga akun QA: popup-nya ditutup, lalu urgent dihapus dari panel detail.
    await expect(popupOf(page)).toBeVisible({ timeout: 20_000 })
    await popupOf(page).getByRole("button", { name: "Saya mengerti" }).click()
    await page.screenshot({ path: "test-results/urgent-pesanan-desktop.png" })
    await row.getByRole("link", { name: orderNo }).click()
    const panel = page.getByRole("complementary", { name: "Detail Pesanan" })
    await expect(panel.getByText("Urgent: QA customer minta jam 10")).toBeVisible()
    await panel.getByRole("button", { name: "Hapus urgent" }).click()
    await page
      .getByRole("dialog", { name: `Hapus urgent ${orderNo}?` })
      .getByRole("button", { name: "Hapus urgent" })
      .click()
    await expect(page.getByText(`Tanda urgent ${orderNo} dihapus.`)).toBeVisible()
    await expect(row.getByText("Urgent", { exact: true })).toHaveCount(0)
  })
})
