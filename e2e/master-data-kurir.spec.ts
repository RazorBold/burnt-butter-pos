import { expect, type Page, test } from "@playwright/test"

import { removeCourierByName } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, password: string, target: string) {
  await loginAs(page, email, password, target)
}

test.describe("Master Data › Kurir & Pengiriman", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let createdCourier: string | undefined
  test.afterEach(async () => {
    if (createdCourier) await removeCourierByName(createdCourier)
    createdCourier = undefined
  })

  test("daftar kurir sesuai desain", async ({ page }, info) => {
    await login(page, admin.email!, admin.password!, "/master-data/kurir")
    const table = page.getByRole("table")
    await expect(table.getByRole("row", { name: /Andi/ }).getByText("0812 3456 7890")).toBeVisible()
    const citra = table.getByRole("row", { name: /Citra Express/ })
    await expect(citra.getByText("Eksternal")).toBeVisible()
    await expect(citra.getByRole("cell", { name: "-", exact: true })).toBeVisible()
    await expect(
      page.getByRole("navigation", { name: "Bagian Master Data" }).getByRole("link", {
        name: "Kurir & Pengiriman",
      }),
    ).toHaveAttribute("aria-current", "page")
    await page.screenshot({ path: `test-results/kurir-${info.project.name}.png`, fullPage: true })
  })

  test("tambah, validasi, ubah, lalu nonaktifkan kurir", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Kurir ${Date.now()}`
    createdCourier = name
    await login(page, admin.email!, admin.password!, "/master-data/kurir")

    await page.getByRole("button", { name: "Tambah Kurir" }).click()
    const dialog = page.getByRole("dialog", { name: "Tambah kurir" })

    // Nama kembar ditolak, nomor wajib untuk kurir internal.
    await dialog.getByLabel("Nama kurir").fill("andi")
    await dialog.getByRole("button", { name: "Tambah kurir" }).click()
    await expect(dialog.getByText("No. telp wajib untuk kurir internal.")).toBeVisible()
    // Isian tidak boleh hilang setelah validasi gagal (React 19 me-reset <form action>).
    await expect(dialog.getByLabel("Nama kurir")).toHaveValue("andi")
    await dialog.getByLabel("No. telp").fill("0811 2222 3333")
    await expect(dialog.getByText("No. telp wajib untuk kurir internal.")).toBeHidden()
    await dialog.getByRole("button", { name: "Tambah kurir" }).click()
    await expect(dialog.getByText("Nama kurir ini sudah ada.")).toBeVisible()

    await dialog.getByLabel("Nama kurir").fill(name)
    await dialog.getByLabel("No. telp").fill("+62 811-2222-3333")
    await page.screenshot({ path: "test-results/kurir-form.png" })
    await dialog.getByRole("button", { name: "Tambah kurir" }).click()
    await expect(page.getByText("Kurir baru ditambahkan.")).toBeVisible()
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByText("0811 2222 3333")).toBeVisible()

    // Ubah ke eksternal tanpa nomor.
    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah kurir" })
    await edit.getByRole("radio", { name: "Eksternal" }).click()
    await expect(edit.getByText("(opsional)")).toBeVisible()
    await edit.getByLabel("No. telp").fill("")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Data kurir disimpan.")).toBeVisible()
    await expect(row.getByText("Eksternal")).toBeVisible()
    await expect(row.getByRole("cell", { name: "-", exact: true })).toBeVisible()

    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Nonaktifkan" }).click()
    await expect(row.getByText("Nonaktif", { exact: true })).toBeVisible()
  })

  test("Kasir hanya bisa melihat", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, admin.password!, "/master-data/kurir")
    await expect(page.getByRole("table").getByText("Budi")).toBeVisible()
    await expect(page.getByRole("button", { name: "Tambah Kurir" })).toHaveCount(0)
    await expect(
      page.getByText("Hanya Admin yang bisa menambah atau mengubah kurir."),
    ).toBeVisible()
  })
})
