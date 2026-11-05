import { expect, test } from "@playwright/test"

import { readOrder, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const password = process.env.E2E_PASSWORD
const adminEmail = process.env.E2E_EMAIL
const kasirEmail = process.env.E2E_KASIR_EMAIL
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

test.describe("Catatan pesanan", () => {
  test.skip(!adminEmail || !password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("tambah dari Pesanan, tampil di semua menu, ubah dan hapus", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    code = `${Date.now()}`
    const orderNo = `QA${code}01`
    const note = `Add on keju extra ${code}`
    const date = new Date(Date.now() + (2200 + (Number(code) % 100)) * 86_400_000)
      .toISOString()
      .slice(0, 10)
    await seedQaOrders(code, 1, 0, {
      deliveryDate: date,
      plan: [{ status: "siap_kirim", method: "instant" }],
    })

    await loginAs(page, adminEmail!, password!, `/pesanan?q=${code}`)
    await page.getByRole("button", { name: `Aksi untuk ${orderNo}` }).click()
    await page.getByRole("menuitem", { name: "Tambah catatan" }).click()
    const dialog = page.getByRole("dialog", { name: `Catatan ${orderNo}` })
    await dialog.getByLabel("Catatan").fill(note)
    await dialog.getByRole("button", { name: "Simpan catatan" }).click()
    await expect(page.getByText(`Catatan ${orderNo} disimpan.`)).toBeVisible()
    const row = page.getByRole("row", { name: new RegExp(orderNo) })
    await expect(row).toContainText(note)
    await expect(page).not.toHaveURL(/pesanan=/)
    expect(await readOrder(orderNo)).toMatchObject({ note, total: 100000 })
    await page.screenshot({ path: "test-results/catatan-pesanan-desktop.png", fullPage: true })

    // Panel Detail Pesanan.
    await page.goto(`/pesanan?q=${code}&pesanan=${orderNo}`)
    const panel = page.getByRole("complementary", { name: "Detail Pesanan" })
    await expect(panel).toContainText(note)

    // Menu lain.
    await page.goto("/dashboard")
    await expect(page.getByRole("row", { name: `Catatan ${orderNo}: ${note}` })).toBeVisible()
    await page.screenshot({ path: "test-results/catatan-dashboard-desktop.png", fullPage: true })
    await page.goto(`/pembayaran?q=${code}`)
    await expect(page.getByRole("row", { name: new RegExp(orderNo) })).toContainText(note)
    await page.goto(`/produksi?tanggal=${date}`)
    await expect(page.getByRole("article", { name: orderNo })).toContainText(note)
    await page.goto(`/pengiriman?tanggal=${date}&pesanan=${orderNo}`)
    await expect(page.getByRole("row", { name: new RegExp(orderNo) })).toContainText(note)
    await expect(page.getByRole("complementary", { name: "Detail Pengiriman" })).toContainText(note)

    // Tim Produksi melihat catatan.
    if (produksiEmail) {
      await loginAs(page, produksiEmail, password!, `/produksi?tanggal=${date}`)
      await expect(page.getByRole("article", { name: orderNo })).toContainText(note)
    }

    // Kasir bisa mengubah lewat panel, lalu mengosongkan untuk menghapus.
    if (kasirEmail) {
      await loginAs(page, kasirEmail, password!, `/pesanan?q=${code}&pesanan=${orderNo}`)
      await panel.getByRole("button", { name: "Ubah catatan" }).click()
      await expect(dialog.getByLabel("Catatan")).toHaveValue(note)
      await dialog.getByLabel("Catatan").fill("")
      await dialog.getByRole("button", { name: "Simpan catatan" }).click()
      await expect(page.getByText(`Catatan ${orderNo} dihapus.`)).toBeVisible()
      await expect(panel.getByRole("button", { name: "Tambah catatan" })).toBeVisible()
      expect(await readOrder(orderNo)).toMatchObject({ note: null })
    }
  })
})
