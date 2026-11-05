import { expect, type Page, test } from "@playwright/test"

import { removePaymentMethodByName } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, password: string, target: string) {
  await loginAs(page, email, password, target)
}

test.describe("Master Data › Metode Pembayaran", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let created: string | undefined
  test.afterEach(async () => {
    if (created) await removePaymentMethodByName(created)
    created = undefined
  })

  test("daftar metode sesuai desain", async ({ page }, info) => {
    await login(page, admin.email!, admin.password!, "/master-data/metode-pembayaran")
    const table = page.getByRole("table")
    // Metode lain bisa bertambah, mis. "Shopee" yang dibuat saat pesanan Shopee pertama disimpan.
    for (const text of [
      /Transfer Bank\s*Bank/,
      /DANA\s*E-Wallet/,
      /OVO\s*E-Wallet/,
      /Cash\s*Cash/,
    ]) {
      await expect(table.getByRole("row").filter({ hasText: text })).toBeVisible()
    }
    await page.screenshot({ path: `test-results/metode-${info.project.name}.png`, fullPage: true })
  })

  test("tambah, ubah tipe lewat keyboard, nama kembar, lalu nonaktifkan", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Metode ${Date.now()}`
    created = name
    await login(page, admin.email!, admin.password!, "/master-data/metode-pembayaran")

    await page.getByRole("button", { name: "Tambah Metode" }).click()
    const dialog = page.getByRole("dialog", { name: "Tambah metode" })
    await dialog.getByLabel("Nama metode").fill("ovo")
    await dialog.getByRole("radio", { name: "E-Wallet" }).click()
    await dialog.getByRole("button", { name: "Tambah metode" }).click()
    await expect(dialog.getByText("Metode dengan nama ini sudah ada.")).toBeVisible()
    await expect(dialog.getByLabel("Nama metode")).toHaveValue("ovo")

    await dialog.getByLabel("Nama metode").fill(name)
    await dialog.getByRole("button", { name: "Tambah metode" }).click()
    await expect(page.getByText("Metode pembayaran ditambahkan.")).toBeVisible()
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByText("E-Wallet")).toBeVisible()

    // Panah kanan di tombol pilihan: E-Wallet → Cash.
    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah metode" })
    await edit.getByRole("radio", { name: "E-Wallet" }).focus()
    await page.keyboard.press("ArrowRight")
    await expect(edit.getByRole("radio", { name: "Cash" })).toHaveAttribute("aria-checked", "true")
    await expect(edit.getByRole("radio", { name: "Cash" })).toBeFocused()
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Metode pembayaran disimpan.")).toBeVisible()
    await expect(row.getByRole("cell", { name: "Cash", exact: true })).toBeVisible()

    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Nonaktifkan" }).click()
    await expect(row.getByText("Nonaktif", { exact: true })).toBeVisible()
  })

  test("Kasir hanya bisa melihat", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, admin.password!, "/master-data/metode-pembayaran")
    await expect(page.getByRole("table").getByText("DANA")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tambah Metode" })).toHaveCount(0)
  })
})
