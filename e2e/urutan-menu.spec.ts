import { expect, test } from "@playwright/test"

import {
  createQaMenu,
  createQaMenuCategory,
  removeMenuByName,
  removeMenuCategoryByName,
} from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const ownerEmail = process.env.E2E_OWNER_EMAIL

// Permintaan pemilik toko (19 Nov 2026): urutan A, B, C menu diatur sendiri, dibuat sederhana.
test.describe("Urutan menu", () => {
  test.skip(!admin.email || !admin.password || !ownerEmail, "butuh akun QA Admin & Owner")

  let category: string | undefined
  let menus: string[] = []
  test.afterEach(async () => {
    for (const name of menus) await removeMenuByName(name)
    if (category) await removeMenuCategoryByName(category)
    category = undefined
    menus = []
  })

  test("Owner menggeser menu; urutan ikut di daftar, template, dan form pesanan", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(90_000)
    const stamp = Date.now()
    category = `QA Kategori ${stamp}`
    const first = `QA Menu ${stamp} Satu`
    const second = `QA Menu ${stamp} Dua`
    menus = [first, second]
    await createQaMenuCategory(category)
    await createQaMenu(first, category, 10_000)
    await createQaMenu(second, category, 20_000)

    await loginAs(page, ownerEmail!, admin.password!, `/master-data/produk-menu`)
    const names = () =>
      page
        .getByRole("row")
        .filter({ hasText: `QA Menu ${stamp}` })
        .getByRole("paragraph")
    await expect(names()).toHaveText([first, second])
    // Ujung kategori: menu pertama tidak bisa naik, menu terakhir tidak bisa turun.
    await expect(page.getByRole("button", { name: `Naikkan ${first}` })).toBeDisabled()
    await expect(page.getByRole("button", { name: `Turunkan ${second}` })).toBeDisabled()

    await page.getByRole("button", { name: `Naikkan ${second}` }).click()
    await expect(names()).toHaveText([second, first])
    await page.screenshot({ path: "test-results/urutan-menu-desktop.png", fullPage: true })

    // Saat mencari nama, panah disembunyikan.
    await page.goto(`/master-data/produk-menu?q=${stamp}`)
    await expect(page.getByRole("button", { name: `Naikkan ${first}` })).toHaveCount(0)

    // Template ({MENU} = semua kategori) mengikuti urutan baru.
    await page.goto("/master-data/pengaturan")
    const editor = page.getByRole("region", { name: "Template Pesan" })
    const body = editor.getByRole("textbox", { name: "Isi template FO1 (Normal)" })
    await body.fill(`${await body.inputValue()}\n\n{MENU: ${category}}`)
    await expect(editor.getByTestId("template-preview")).toContainText(
      `${category}*\n${second} :\n${first} :`,
    )

    // Form pesanan (Admin) juga.
    const adminPage = await browser.newPage()
    await loginAs(adminPage, admin.email!, admin.password!, "/pesanan/baru")
    const group = adminPage.getByRole("region", { name: category })
    await expect(group.getByText(/^QA Menu/)).toHaveText([second, first])
    await adminPage.close()
  })
})
