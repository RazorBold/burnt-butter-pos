import { expect, type Page, test } from "@playwright/test"

import { removePackagingByName, removePackagingCategoryByName } from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const ownerEmail = process.env.E2E_OWNER_EMAIL
async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

test.describe("Stok Packaging", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let created: string | undefined
  let createdCategories: string[] = []
  test.afterEach(async () => {
    if (created) await removePackagingByName(created)
    for (const name of createdCategories) await removePackagingCategoryByName(name)
    created = undefined
    createdCategories = []
  })

  test("master data sesuai desain, halaman stok tampil", async ({ page }, info) => {
    test.skip(!ownerEmail, "butuh E2E_OWNER_EMAIL")
    // Master Data khusus Owner; Admin ditolak.
    await login(page, admin.email!, "/master-data/stok-packaging")
    await expectAccessDenied(page)
    await login(page, ownerEmail!, "/master-data/stok-packaging")
    const table = page.getByRole("table")
    // Sejak Nov 2026 hanya box hampers; packaging lama diarsipkan dan tidak tampil.
    await expect(table.getByRole("row", { name: /Classic Red \(Large\)/ })).toBeVisible()
    await expect(table.getByRole("row", { name: /Holy E Olio \(Regular\)/ })).toBeVisible()
    await expect(table.getByRole("row", { name: /Box Dessert/ })).toHaveCount(0)
    await expect(
      table.getByRole("row", { name: /Classic Red \(Large\)/ }).getByText("Box Hampers"),
    ).toBeVisible()
    const categories = page.getByRole("region", { name: "Kategori stok" })
    await expect(categories).toContainText("Box Hampers")
    await expect(categories).toContainText("Loyang")
    await expect(page.getByRole("button", { name: "Tambah Packaging" })).toBeVisible()
    await page.screenshot({
      path: `test-results/master-packaging-${info.project.name}.png`,
      fullPage: true,
    })

    // Menu Stok Packaging (catat stok) untuk Admin.
    await login(page, admin.email!, "/stok-packaging")
    await expect(page.getByRole("heading", { name: "Packaging & Loyang", level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Classic Red (Large)" })).toBeVisible()
    await expect(page.getByRole("heading", { name: /^Box Hampers Large/, level: 2 })).toBeVisible()
    await expect(page.getByRole("heading", { name: /^Loyang/, level: 2 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Paper Bag" })).toHaveCount(0)
    await page.screenshot({
      path: `test-results/stok-packaging-${info.project.name}.png`,
      fullPage: true,
    })
  })

  test("Owner: kategori + jenis stok baru; Admin catat masuk/hitung ulang; Owner hapus", async ({
    page,
    browser,
  }, info) => {
    test.skip(!ownerEmail || info.project.name !== "desktop", "butuh E2E_OWNER_EMAIL, desktop saja")
    test.setTimeout(120_000)
    const stamp = Date.now()
    const category = `QA Kategori Stok ${stamp}`
    const renamed = `QA Kategori Stok ${stamp} Natal`
    const name = `QA Packaging ${stamp}`
    created = name
    createdCategories = [category, renamed]
    await login(page, ownerEmail!, "/master-data/stok-packaging")
    const categories = page.getByRole("region", { name: "Kategori stok" })

    // Kategori baru; nama kembar ditolak.
    await categories.getByRole("button", { name: "Tambah kategori" }).click()
    let dialog = page.getByRole("dialog", { name: "Tambah kategori stok" })
    await dialog.getByLabel("Nama kategori").fill("box hampers large")
    await dialog.getByRole("button", { name: "Tambah kategori" }).click()
    await expect(dialog.getByText("Kategori dengan nama ini sudah ada.")).toBeVisible()
    await dialog.getByLabel("Nama kategori").fill(category)
    await dialog.getByRole("button", { name: "Tambah kategori" }).click()
    await expect(page.getByText(`Kategori ${category} ditambahkan.`)).toBeVisible()
    await expect(categories.getByText(category, { exact: true })).toBeVisible()

    // Jenis stok baru di kategori itu.
    await page.getByRole("button", { name: "Tambah Packaging" }).click()
    dialog = page.getByRole("dialog", { name: "Tambah packaging" })
    await dialog.getByLabel("Nama packaging").fill("classic red (large)")
    await dialog.getByLabel("Kategori").selectOption({ label: category })
    await dialog.getByLabel("Stok minimum").fill("10")
    await dialog.getByLabel("Kapasitas").fill("100")
    await dialog.getByLabel("Stok awal").fill("25")
    await dialog.getByRole("button", { name: "Tambah packaging" }).click()
    await expect(dialog.getByText("Packaging dengan nama ini sudah ada.")).toBeVisible()
    await dialog.getByLabel("Nama packaging").fill(name)
    await dialog.getByRole("button", { name: "Tambah packaging" }).click()
    await expect(page.getByText("Packaging ditambahkan.")).toBeVisible()
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByRole("cell", { name: "25", exact: true })).toBeVisible()
    await expect(row.getByText(category, { exact: true })).toBeVisible()
    await expect(row.getByText("Cukup")).toBeVisible()
    await expect(categories).toContainText("1 packaging")

    // Ganti nama kategori.
    await categories.getByRole("button", { name: `Ubah kategori ${category}` }).click()
    dialog = page.getByRole("dialog", { name: `Ubah kategori ${category}` })
    await dialog.getByLabel("Nama kategori").fill(renamed)
    await dialog.getByRole("button", { name: "Simpan kategori" }).click()
    await expect(page.getByText("Kategori disimpan.")).toBeVisible()
    await expect(row.getByText(renamed, { exact: true })).toBeVisible()
    await page.screenshot({
      path: "test-results/master-packaging-owner-desktop.png",
      fullPage: true,
    })

    // Admin mencatat stok di menu Stok Packaging (Owner tidak membuka menu itu).
    const adminPage = await browser.newPage()
    await login(adminPage, admin.email!, "/stok-packaging")
    const group = adminPage.getByRole("region", { name: new RegExp(`^${renamed}`) })
    const card = group.getByRole("article", { name })
    await expect(card.getByText("Minimum 10 pcs, kapasitas 100")).toBeVisible()
    // Stok keluar tercatat otomatis dari menu Packaging, jadi tidak ada tombol Keluar.
    await expect(card.getByRole("button", { name: `Stok keluar ${name}` })).toHaveCount(0)

    // Revisi: hasil hitung fisik 5 (ada yang rusak) → Menipis.
    await card.getByRole("button", { name: `Hitung ulang ${name}` }).click()
    let dialogStock = adminPage.getByRole("dialog", { name: `Hitung ulang: ${name}` })
    await expect(dialogStock.getByRole("radio")).toHaveText(["Masuk", "Hitung ulang"])
    await dialogStock.getByLabel("Hasil hitung (pcs)").fill("5")
    await expect(dialogStock.getByText("Stok jadi: 25 → 5 pcs (−20)")).toBeVisible()
    await dialogStock.getByLabel(/^Catatan/).fill("QA rusak")
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(adminPage.getByText(`Stok ${name} jadi 5 pcs.`)).toBeVisible()
    await expect(card.getByText("Menipis")).toBeVisible()

    // Hitung ulang lagi: hasil hitung fisik 0 → Habis.
    await card.getByRole("button", { name: `Hitung ulang ${name}` }).click()
    dialogStock = adminPage.getByRole("dialog", { name: `Hitung ulang: ${name}` })
    await dialogStock.getByLabel("Hasil hitung (pcs)").fill("0")
    await expect(dialogStock.getByText("Stok jadi: 5 → 0 pcs (−5)")).toBeVisible()
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(card.getByText("Habis")).toBeVisible()

    await card.getByRole("button", { name: `Stok masuk ${name}` }).click()
    dialogStock = adminPage.getByRole("dialog", { name: `Stok masuk: ${name}` })
    await dialogStock.getByLabel("Jumlah (pcs)").fill("40")
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(adminPage.getByText(`Stok ${name} jadi 40 pcs.`)).toBeVisible()
    await expect(card.getByText("Cukup")).toBeVisible()

    await adminPage.getByRole("combobox", { name: "Filter packaging" }).click()
    await adminPage.getByRole("option", { name }).click()
    const history = adminPage.getByRole("region", { name: "Riwayat Stok" }).getByRole("row")
    await expect(history).toHaveCount(5) // header + 4 catatan
    await expect(history.nth(1)).toContainText("+40 pcs")
    await expect(history.nth(2)).toContainText("Hitung ulang stok")
    await expect(history.nth(3)).toContainText("QA rusak")
    await expect(history.nth(3)).toContainText("−20 pcs")
    await expect(history.nth(4)).toContainText("Stok awal")
    await adminPage.close()

    // Owner menaikkan minimum: stok 40 jadi Menipis.
    await page.reload()
    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah packaging" })
    await edit.getByLabel("Stok minimum").fill("50")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Data packaging disimpan.")).toBeVisible()
    await expect(row.getByText("Menipis")).toBeVisible()

    // Kategori berisi packaging tidak bisa dihapus.
    await categories.getByRole("button", { name: `Hapus kategori ${renamed}` }).click()
    dialog = page.getByRole("dialog", { name: `Hapus kategori ${renamed}?` })
    await expect(dialog).toContainText("Masih ada 1 packaging")
    await expect(dialog.getByRole("button", { name: "Hapus kategori" })).toHaveCount(0)
    await dialog.getByRole("button", { name: "Tutup" }).first().click()

    // Hapus packaging (sudah punya riwayat → diarsipkan), lalu kategorinya.
    await row.getByRole("button", { name: `Hapus ${name}` }).click()
    await page
      .getByRole("dialog", { name: `Hapus ${name}?` })
      .getByRole("button", { name: "Hapus packaging" })
      .click()
    await expect(page.getByText(`${name} dihapus dari daftar.`)).toBeVisible()
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0)
    await categories.getByRole("button", { name: `Hapus kategori ${renamed}` }).click()
    await page
      .getByRole("dialog", { name: `Hapus kategori ${renamed}?` })
      .getByRole("button", { name: "Hapus kategori" })
      .click()
    await expect(page.getByText(`Kategori ${renamed} dihapus.`)).toBeVisible()
    await expect(categories.getByText(renamed, { exact: true })).toHaveCount(0)
  })

  test("Kasir tidak bisa membuka menu Stok Packaging", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, "/stok-packaging")
    await expectAccessDenied(page)
  })
})
