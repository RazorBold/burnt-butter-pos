import path from "node:path"

import { expect, type Page, test } from "@playwright/test"

import { removeMenuByName, removeMenuCategoryByName } from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const ownerEmail = process.env.E2E_OWNER_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

test.describe("Master Data › Produk & Menu", () => {
  test.skip(!ownerEmail || !admin.password, "E2E_OWNER_EMAIL / E2E_PASSWORD belum diisi")

  // Data yang dibuat test terakhir; dihapus setelah test selesai (lulus atau gagal).
  let createdMenu: string | undefined
  let createdCategories: string[] = []
  test.afterEach(async () => {
    if (createdMenu) await removeMenuByName(createdMenu)
    for (const name of createdCategories) await removeMenuCategoryByName(name)
    createdMenu = undefined
    createdCategories = []
  })

  test("daftar, cari, dan filter kategori", async ({ page }, info) => {
    await login(page, ownerEmail!, "/master-data")
    await expect(page).toHaveURL(/\/master-data\/produk-menu$/)

    const table = page.getByRole("table")
    await expect(table.getByText("Potato Gratin Lasagna")).toBeVisible()
    await expect(table.getByText("Rp 65.000 / Rp 50.000").first()).toBeVisible()
    await expect(page.getByRole("region", { name: "Kategori menu" })).toContainText("Pasta")
    await page.screenshot({
      path: `test-results/produk-menu-${info.project.name}.png`,
      fullPage: true,
    })

    await page.getByLabel("Cari nama menu").fill("mac")
    await expect(page).toHaveURL(/q=mac/)
    await expect(table.getByRole("row")).toHaveCount(4) // header + 2 mac and cheese + Mac & Joy (hampers)

    await page.getByLabel("Cari nama menu").fill("")
    await page.getByRole("combobox", { name: "Filter kategori" }).click()
    await page.getByRole("option", { name: "Dessert" }).click()
    await expect(page).toHaveURL(/kategori=[0-9a-f-]{36}/)
    await expect(table.getByRole("row")).toHaveCount(2)
    await expect(table.getByText("Choco Bon Bon")).toBeVisible()
  })

  test("Owner: kategori baru, menu baru di dalamnya, tampil di form pesanan, lalu hapus", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "desktop saja")
    test.setTimeout(90_000)
    const stamp = Date.now()
    const category = `QA Kategori ${stamp}`
    const renamed = `QA Kategori ${stamp} Natal`
    const name = `QA Menu ${stamp}`
    createdMenu = name
    createdCategories = [category, renamed]
    await login(page, ownerEmail!, "/master-data/produk-menu")
    const categories = page.getByRole("region", { name: "Kategori menu" })

    // Tambah kategori satu harga; nama kembar ditolak.
    await categories.getByRole("button", { name: "Tambah kategori" }).click()
    let dialog = page.getByRole("dialog", { name: "Tambah kategori" })
    await dialog.getByLabel("Nama kategori").fill("pasta")
    await dialog.getByRole("button", { name: "Tambah kategori" }).click()
    await expect(dialog.getByText("Kategori dengan nama ini sudah ada.")).toBeVisible()
    await dialog.getByLabel("Nama kategori").fill(category)
    await dialog.getByRole("button", { name: "Tambah kategori" }).click()
    await expect(page.getByText(`Kategori ${category} ditambahkan.`)).toBeVisible()
    await expect(categories.getByText(category, { exact: true })).toBeVisible()

    // Menu baru: kategori Pasta = dua harga; pindah ke kategori baru = satu harga.
    await page.getByRole("button", { name: "Tambah Menu" }).click()
    dialog = page.getByRole("dialog", { name: "Tambah menu" })
    await dialog.getByRole("button", { name: "Tambah menu" }).click()
    await expect(dialog.getByText("Nama menu minimal 3 huruf.")).toBeVisible()
    await expect(dialog.getByText("Pilih kategori.")).toBeVisible()
    await dialog.getByLabel("Nama menu").fill(name)
    await dialog.getByRole("combobox", { name: "Kategori" }).click()
    await page.getByRole("option", { name: /^Pasta/ }).click()
    await expect(dialog.getByLabel("Harga Large")).toBeVisible()
    await expect(dialog.getByLabel("Harga Regular")).toBeVisible()
    await dialog.getByRole("combobox", { name: "Kategori" }).click()
    await page.getByRole("option", { name: category }).click()
    await expect(dialog.getByLabel("Harga Large")).toHaveCount(0)
    await dialog.getByLabel("Harga", { exact: true }).fill("90000")
    await expect(dialog.getByLabel("Harga", { exact: true })).toHaveValue("90.000")
    // Loyang per porsi: menu satu harga bawaannya tanpa loyang; Owner memilih 3 Loyang Regular.
    await expect(dialog.getByRole("combobox", { name: "Memakai loyang" })).toHaveText(
      "Tanpa loyang",
    )
    await dialog.getByRole("combobox", { name: "Memakai loyang" }).click()
    await page.getByRole("option", { name: "Loyang Regular" }).click()
    await dialog.getByLabel("Jumlah loyang per porsi").fill("3")
    await dialog.screenshot({ path: "test-results/produk-menu-loyang-desktop.png" })
    await dialog
      .getByLabel("Foto menu")
      .setInputFiles(
        path.join(process.cwd(), "public/images/menu/potato-gratin-lasagna-large.webp"),
      )
    await dialog.getByRole("button", { name: "Tambah menu" }).click()
    await expect(page.getByText("Menu baru ditambahkan.")).toBeVisible()
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row).toContainText("Rp 90.000")
    await expect(row.getByText("Loyang 3 Regular")).toBeVisible()
    await expect(row.getByText(category, { exact: true })).toBeVisible()
    await expect(categories).toContainText("1 menu")

    // Ganti nama kategori; jenis ukuran terkunci karena sudah ada menu.
    await categories.getByRole("button", { name: `Ubah kategori ${category}` }).click()
    dialog = page.getByRole("dialog", { name: `Ubah kategori ${category}` })
    await expect(dialog.getByRole("radio", { name: /Large & Regular/ })).toBeDisabled()
    await dialog.getByLabel("Nama kategori").fill(renamed)
    await dialog.getByRole("button", { name: "Simpan kategori" }).click()
    await expect(page.getByText("Kategori disimpan.")).toBeVisible()
    await page.screenshot({ path: "test-results/produk-menu-kategori-desktop.png", fullPage: true })

    // Form pesanan (Owner tidak membuka Input Pesanan, jadi dicek dengan akun Admin).
    const adminPage = await browser.newPage()
    await login(adminPage, admin.email!, "/pesanan/baru")
    const group = adminPage.getByRole("region", { name: renamed })
    await expect(group.getByText(name)).toBeVisible()
    await expect(group.getByText("Rp 90.000")).toBeVisible()
    await adminPage.close()

    // Kategori berisi menu tidak bisa dihapus.
    await categories.getByRole("button", { name: `Hapus kategori ${renamed}` }).click()
    dialog = page.getByRole("dialog", { name: `Hapus kategori ${renamed}?` })
    await expect(dialog).toContainText("Masih ada 1 menu")
    await expect(dialog.getByRole("button", { name: "Hapus kategori" })).toHaveCount(0)
    await dialog.getByRole("button", { name: "Tutup" }).first().click()

    // Hapus menu (belum pernah dipesan → benar-benar dihapus), lalu kategorinya.
    await row.getByRole("button", { name: `Hapus ${name}` }).click()
    await page
      .getByRole("dialog", { name: `Hapus ${name}?` })
      .getByRole("button", { name: "Hapus menu" })
      .click()
    await expect(page.getByText(`${name} dihapus.`)).toBeVisible()
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0)
    await categories.getByRole("button", { name: `Hapus kategori ${renamed}` }).click()
    await page
      .getByRole("dialog", { name: `Hapus kategori ${renamed}?` })
      .getByRole("button", { name: "Hapus kategori" })
      .click()
    await expect(page.getByText(`Kategori ${renamed} dihapus.`)).toBeVisible()
    await expect(categories.getByText(renamed, { exact: true })).toHaveCount(0)
  })

  test("Admin dan Kasir tidak bisa membuka Produk & Menu (khusus Owner)", async ({
    page,
  }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    for (const email of [admin.email!, kasirEmail!]) {
      await login(page, email, "/master-data/produk-menu")
      await expectAccessDenied(page)
    }
  })
})
