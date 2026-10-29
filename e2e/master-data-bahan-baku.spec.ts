import { expect, type Page, test } from "@playwright/test"

import { removeRawMaterialByName } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const password = process.env.E2E_PASSWORD
const adminEmail = process.env.E2E_EMAIL
const kasirEmail = process.env.E2E_KASIR_EMAIL
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

const PATH = "/master-data/bahan-baku"

/** Baris di tabel bahan baku (tabel pertama; tabel kedua adalah riwayat stok). */
const row = (page: Page, name: string) =>
  page
    .getByRole("table")
    .first()
    .getByRole("row", { name: new RegExp(name) })

async function recordStock(page: Page, opener: () => Promise<void>, mode: string, qty: string) {
  await opener()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: mode }).click()
  await dialog.getByLabel(/^(Jumlah|Hasil hitung)/).fill(qty)
  return dialog
}

test.describe("Master Data › Bahan Baku", () => {
  test.skip(!adminEmail || !password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let name: string | undefined
  test.afterEach(async () => {
    if (name) await removeRawMaterialByName(name)
    name = undefined
  })

  test("tambah, catat stok desimal, status, notifikasi, riwayat, ubah", async ({ page }, info) => {
    await loginAs(page, adminEmail!, password!, PATH)
    await expect(page.getByRole("heading", { name: "Bahan Baku", level: 1 })).toBeVisible()
    await expect(row(page, "Keju Cheddar")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Riwayat Stok Bahan Baku" })).toBeVisible()
    await page.screenshot({
      path: `test-results/bahan-baku-${info.project.name}.png`,
      fullPage: true,
    })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")

    name = `QA Bahan ${Date.now()}`
    await page.getByRole("button", { name: "Tambah Bahan Baku" }).click()
    const form = page.getByRole("dialog", { name: "Tambah bahan baku" })
    await form.getByLabel("Nama bahan").fill(name)
    await form.getByLabel("Stok minimum").fill("dua")
    await form.getByRole("button", { name: "Tambah bahan baku" }).click()
    await expect(form.getByText(/Isi stok minimum dengan angka/)).toBeVisible()
    await form.getByLabel("Stok minimum").fill("2,5")
    await form.getByLabel("Stok awal").fill("3")
    await form.getByRole("button", { name: "Tambah bahan baku" }).click()
    await expect(page.getByText("Bahan baku ditambahkan.")).toBeVisible()
    await expect(row(page, name)).toContainText("kg")
    await expect(row(page, name)).toContainText("2,5")
    await expect(row(page, name).getByText("Cukup")).toBeVisible()

    // Keluar 1,25 kg → 1,75 (di bawah minimum 2,5) = Menipis.
    const openMenu = async () => {
      await page.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
      await page.getByRole("menuitem", { name: "Catat stok" }).click()
    }
    let dialog = await recordStock(page, openMenu, "Keluar", "1,25")
    await expect(dialog.getByText("Stok jadi: 3 → 1,75 kg")).toBeVisible()
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText(`Stok ${name} jadi 1,75 kg.`)).toBeVisible()
    await expect(row(page, name).getByText("Menipis")).toBeVisible()

    // Lonceng menampilkan bahan yang menipis.
    await page.reload()
    const bell = page.getByRole("button", { name: /^Notifikasi: \d+ stok perlu restock$/ })
    await bell.click()
    const alert = page.getByRole("menuitem", { name: new RegExp(name) })
    await expect(alert).toContainText("Sisa 1,75 kg, minimum 2,5 kg")
    await page.screenshot({ path: "test-results/notifikasi-stok-desktop.png" })
    await page.keyboard.press("Escape")

    // Hitung ulang ke 0 = Habis; keluar melebihi stok ditolak.
    dialog = await recordStock(page, openMenu, "Keluar", "5")
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(dialog.getByText("Stok tinggal 1,75 kg.")).toBeVisible()
    await dialog.getByRole("radio", { name: "Hitung ulang" }).click()
    await dialog.getByLabel("Hasil hitung (kg)").fill("0")
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText(`Stok ${name} jadi 0 kg.`)).toBeVisible()
    await expect(row(page, name).getByText("Habis")).toBeVisible()

    // Riwayat: stok awal, keluar, hitung ulang.
    await page.getByRole("combobox", { name: "Filter bahan baku" }).click()
    await page.getByRole("option", { name }).click()
    const history = page.getByRole("region", { name: "Riwayat Stok Bahan Baku" })
    await expect(history.getByRole("row")).toHaveCount(4)
    await expect(history).toContainText("+3 kg")
    await expect(history).toContainText("−1,25 kg")
    await expect(history).toContainText("Hitung ulang stok")

    // Ubah minimum lalu isi ulang: peringatan hilang.
    await page.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah bahan baku" })
    await expect(edit.getByLabel("Stok minimum")).toHaveValue("2,5")
    await edit.getByLabel("Stok minimum").fill("1")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Data bahan baku disimpan.")).toBeVisible()
    dialog = await recordStock(page, openMenu, "Masuk", "4")
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(row(page, name).getByText("Cukup")).toBeVisible()
    await page.reload()
    await page.getByRole("button", { name: /^Notifikasi/ }).click()
    await expect(page.getByRole("menuitem", { name: new RegExp(name) })).toHaveCount(0)
  })

  test("Produksi hanya bisa catat stok; Kasir hanya melihat", async ({ page }, info) => {
    test.skip(
      !produksiEmail || !kasirEmail || info.project.name !== "desktop",
      "butuh akun Produksi dan Kasir, desktop saja",
    )
    name = `QA Bahan ${Date.now()}`
    await loginAs(page, adminEmail!, password!, PATH)
    await page.getByRole("button", { name: "Tambah Bahan Baku" }).click()
    const form = page.getByRole("dialog", { name: "Tambah bahan baku" })
    await form.getByLabel("Nama bahan").fill(name)
    await form.getByLabel("Stok minimum").fill("1")
    await form.getByRole("button", { name: "Tambah bahan baku" }).click()
    await expect(page.getByText("Bahan baku ditambahkan.")).toBeVisible()

    await loginAs(page, produksiEmail!, password!, PATH)
    await expect(page.getByRole("button", { name: "Tambah Bahan Baku" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: `Ubah ${name}` })).toHaveCount(0)
    const dialog = await recordStock(
      page,
      () => page.getByRole("button", { name: `Catat stok ${name}` }).click(),
      "Masuk",
      "2,5",
    )
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText(`Stok ${name} jadi 2,5 kg.`)).toBeVisible()
    await expect(page.getByRole("button", { name: /^Notifikasi/ })).toBeVisible()

    await loginAs(page, kasirEmail!, password!, PATH)
    await expect(row(page, name)).toContainText("2,5")
    await expect(page.getByRole("button", { name: `Catat stok ${name}` })).toHaveCount(0)
    await expect(page.getByText("Stok dicatat oleh Admin dan tim Produksi.")).toBeVisible()
    await page.getByRole("button", { name: "Notifikasi" }).click()
    await expect(page.getByText("Belum ada notifikasi.")).toBeVisible()
  })
})
