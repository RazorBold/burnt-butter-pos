import { expect, test } from "@playwright/test"

import { readOrder, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const password = process.env.E2E_PASSWORD
const adminEmail = process.env.E2E_EMAIL
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

test.describe("Hapus pesanan", () => {
  test.skip(!adminEmail || !password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    // Juga menghapus jejak order_deletions milik pesanan uji.
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("hapus dari menu baris: hilang dari daftar & DB, tercatat di notifikasi", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    code = `${Date.now()}`
    const orderNo = `QA${code}01`
    await seedQaOrders(code, 2, 0, {
      plan: [
        { status: "baru", method: "instant" },
        { status: "baru", method: "instant" },
      ],
    })

    await loginAs(page, adminEmail!, password!, `/pesanan?q=${code}`)
    await page.getByRole("button", { name: `Aksi untuk ${orderNo}` }).click()
    await page.getByRole("menuitem", { name: "Hapus pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: `Hapus ${orderNo}?` })
    await dialog.getByLabel(/^Alasan/).fill("Pesanan dobel")
    await page.screenshot({ path: "test-results/hapus-pesanan-dialog.png" })
    await dialog.getByRole("button", { name: "Hapus pesanan" }).click()
    await expect(page.getByText(`${orderNo} dihapus.`)).toBeVisible()
    await expect(page.getByRole("row", { name: new RegExp(orderNo) })).toHaveCount(0)
    await expect(page.getByRole("row", { name: new RegExp(`QA${code}02`) })).toBeVisible()
    expect(await readOrder(orderNo)).toBeUndefined()

    // Staf lain melihat notifikasi pesanan dihapus beserta alasannya (tanpa nominal untuk Produksi).
    test.skip(!produksiEmail, "butuh akun QA Produksi")
    const other = await browser.newPage()
    await loginAs(other, produksiEmail!, password!, "/produksi")
    await other.getByRole("button", { name: /^Notifikasi/ }).click()
    const item = other
      .getByRole("group", { name: "Aktivitas terbaru" })
      .getByText(`Pesanan ${orderNo} dihapus`)
    await expect(item).toBeVisible()
    await expect(
      other.getByRole("group", { name: "Aktivitas terbaru" }).getByText(/Alasan: Pesanan dobel/),
    ).toBeVisible()
    await other.screenshot({ path: "test-results/hapus-pesanan-notifikasi.png" })
    await other.close()
  })
})
