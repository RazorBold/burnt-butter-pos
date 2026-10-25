import { expect, type Page, test } from "@playwright/test"

import { removePackagingByName } from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

test.describe("Stok Packaging", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let created: string | undefined
  test.afterEach(async () => {
    if (created) await removePackagingByName(created)
    created = undefined
  })

  test("master data sesuai desain, halaman stok tampil", async ({ page }, info) => {
    await login(page, admin.email!, "/master-data/stok-packaging")
    const table = page.getByRole("table")
    await expect(table.getByRole("row", { name: /Box Large/ })).toBeVisible()
    // Desain: Box Dessert 30 pcs = Menipis.
    await expect(table.getByRole("row", { name: /Box Dessert/ }).getByText("Menipis")).toBeVisible()
    await page.screenshot({
      path: `test-results/master-packaging-${info.project.name}.png`,
      fullPage: true,
    })

    await page.goto("/stok-packaging")
    await expect(page.getByRole("heading", { name: "Stok Packaging", level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Box Dessert" })).toBeVisible()
    await page.screenshot({
      path: `test-results/stok-packaging-${info.project.name}.png`,
      fullPage: true,
    })
  })

  test("tambah packaging, masuk/keluar/hitung ulang, status, riwayat, ubah minimum", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Packaging ${Date.now()}`
    created = name
    await login(page, admin.email!, "/master-data/stok-packaging")

    await page.getByRole("button", { name: "Tambah Packaging" }).click()
    const dialog = page.getByRole("dialog", { name: "Tambah packaging" })
    await dialog.getByLabel("Nama packaging").fill("box large")
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
    await expect(row.getByText("Cukup")).toBeVisible()

    await page.goto("/stok-packaging")
    const card = page.getByRole("article", { name })
    await expect(card.getByText("Minimum 10 pcs, kapasitas 100")).toBeVisible()

    await card.getByRole("button", { name: `Stok keluar ${name}` }).click()
    let dialogStock = page.getByRole("dialog", { name: `Stok keluar: ${name}` })
    await dialogStock.getByLabel("Jumlah (pcs)").fill("20")
    await expect(dialogStock.getByText("Stok jadi: 25 → 5 pcs")).toBeVisible()
    await dialogStock.getByLabel(/^Catatan/).fill("QA rusak")
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText(`Stok ${name} jadi 5 pcs.`)).toBeVisible()
    await expect(card.getByText("Menipis")).toBeVisible()

    await card.getByRole("button", { name: `Stok keluar ${name}` }).click()
    dialogStock = page.getByRole("dialog", { name: `Stok keluar: ${name}` })
    await dialogStock.getByLabel("Jumlah (pcs)").fill("10")
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(dialogStock.getByText("Stok tinggal 5 pcs.")).toBeVisible()
    // Pindah ke Hitung ulang di dialog yang sama: hasil hitung fisik 0 → Habis.
    await dialogStock.getByRole("radio", { name: "Hitung ulang" }).click()
    // Judul dialog ikut berganti sesuai jenis perubahan.
    dialogStock = page.getByRole("dialog", { name: `Hitung ulang: ${name}` })
    await dialogStock.getByLabel("Hasil hitung (pcs)").fill("0")
    await expect(dialogStock.getByText("Stok jadi: 5 → 0 pcs (−5)")).toBeVisible()
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(card.getByText("Habis")).toBeVisible()
    await expect(card.getByRole("button", { name: `Stok keluar ${name}` })).toBeDisabled()

    await card.getByRole("button", { name: `Stok masuk ${name}` }).click()
    dialogStock = page.getByRole("dialog", { name: `Stok masuk: ${name}` })
    await dialogStock.getByLabel("Jumlah (pcs)").fill("40")
    await dialogStock.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText(`Stok ${name} jadi 40 pcs.`)).toBeVisible()
    await expect(card.getByText("Cukup")).toBeVisible()

    await page.getByRole("combobox", { name: "Filter packaging" }).click()
    await page.getByRole("option", { name }).click()
    const history = page.getByRole("region", { name: "Riwayat Stok" }).getByRole("row")
    await expect(history).toHaveCount(5) // header + 4 catatan
    await expect(history.nth(1)).toContainText("+40 pcs")
    await expect(history.nth(2)).toContainText("Hitung ulang stok")
    await expect(history.nth(3)).toContainText("QA rusak")
    await expect(history.nth(4)).toContainText("Stok awal")

    // Minimum dinaikkan di Master Data: stok 40 jadi Menipis.
    await page.goto("/master-data/stok-packaging")
    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah packaging" })
    await edit.getByLabel("Stok minimum").fill("50")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Data packaging disimpan.")).toBeVisible()
    await expect(row.getByText("Menipis")).toBeVisible()
  })

  test("Kasir tidak bisa membuka menu Stok Packaging", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, "/stok-packaging")
    await expectAccessDenied(page)
  })
})
