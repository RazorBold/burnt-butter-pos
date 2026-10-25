import path from "node:path"

import { expect, type Page, test } from "@playwright/test"

import { removeMenuByName } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, password: string, target: string) {
  await loginAs(page, email, password, target)
}

test.describe("Master Data › Produk & Menu", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  // Menu yang dibuat test terakhir; dihapus setelah test itu selesai (lulus atau gagal).
  let createdMenu: string | undefined
  test.afterEach(async () => {
    if (createdMenu) await removeMenuByName(createdMenu)
    createdMenu = undefined
  })

  test("daftar, cari, dan filter kategori", async ({ page }, info) => {
    await login(page, admin.email!, admin.password!, "/master-data")
    await expect(page).toHaveURL(/\/master-data\/produk-menu$/)

    const table = page.getByRole("table")
    await expect(table.getByText("Potato Gratin Lasagna")).toBeVisible()
    await expect(table.getByText("Rp 65.000 / Rp 50.000").first()).toBeVisible()
    await page.screenshot({
      path: `test-results/produk-menu-${info.project.name}.png`,
      fullPage: true,
    })

    await page.getByLabel("Cari nama menu").fill("mac")
    await expect(page).toHaveURL(/q=mac/)
    await expect(table.getByRole("row")).toHaveCount(3) // header + 2 menu mac and cheese

    await page.getByLabel("Cari nama menu").fill("")
    await page.getByRole("combobox", { name: "Filter kategori" }).click()
    await page.getByRole("option", { name: "Dessert" }).click()
    await expect(page).toHaveURL(/kategori=dessert/)
    await expect(table.getByRole("row")).toHaveCount(2)
    await expect(table.getByText("Choco Bon Bon")).toBeVisible()
  })

  test("tambah, ubah, lalu nonaktifkan menu", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Menu ${Date.now()}`
    createdMenu = name
    await login(page, admin.email!, admin.password!, "/master-data/produk-menu")

    // Kirim kosong: pesan error per field.
    await page.getByRole("button", { name: "Tambah Menu" }).click()
    const dialog = page.getByRole("dialog", { name: "Tambah menu" })
    await dialog.getByRole("button", { name: "Tambah menu" }).click()
    await expect(dialog.getByText("Nama menu minimal 3 huruf.")).toBeVisible()
    await expect(dialog.getByText("Pilih kategori.")).toBeVisible()

    await dialog.getByLabel("Nama menu").fill(name)
    await expect(dialog.getByText("Nama menu minimal 3 huruf.")).toBeHidden()
    await dialog.getByRole("combobox", { name: "Kategori" }).click()
    await page.getByRole("option", { name: "Pasta" }).click()
    await expect(dialog.getByText("Pilih kategori.")).toBeHidden()
    await expect(dialog.getByRole("radio", { name: "Large & Regular" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await dialog.getByLabel("Harga Large").fill("70000")
    await expect(dialog.getByLabel("Harga Large")).toHaveValue("70.000")
    await dialog.getByLabel("Harga Regular").fill("55000")
    await dialog
      .getByLabel("Foto menu")
      .setInputFiles(
        path.join(process.cwd(), "public/images/menu/potato-gratin-lasagna-large.webp"),
      )
    await page.screenshot({ path: "test-results/produk-menu-form.png" })
    await dialog.getByRole("button", { name: "Tambah menu" }).click()

    await expect(page.getByText("Menu baru ditambahkan.")).toBeVisible()
    await expect(dialog).toBeHidden()
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByText("Rp 70.000 / Rp 55.000")).toBeVisible()
    // Foto dekoratif (alt="") tidak punya role img, jadi dicari lewat tag.
    await expect(row.locator("img")).toHaveAttribute("src", /supabase\.co|menu-photos/)

    // Ubah ke satu harga.
    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah menu" })
    await edit.getByRole("radio", { name: "Satu harga" }).click()
    await edit.getByLabel("Harga", { exact: true }).fill("45000")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Perubahan menu disimpan.")).toBeVisible()
    await expect(row.getByText("Rp 45.000", { exact: true })).toBeVisible()

    // Nonaktifkan lewat menu ⋮.
    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Nonaktifkan" }).click()
    await expect(row.getByText("Nonaktif", { exact: true })).toBeVisible()
  })

  test("Kasir hanya bisa melihat", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, admin.password!, "/master-data/produk-menu")
    await expect(page.getByRole("table").getByText("Choco Bon Bon")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tambah Menu" })).toHaveCount(0)
    await expect(page.getByRole("columnheader", { name: "Aksi" })).toHaveCount(0)
    await expect(page.getByText("Hanya Admin yang bisa menambah atau mengubah menu.")).toBeVisible()
  })
})
