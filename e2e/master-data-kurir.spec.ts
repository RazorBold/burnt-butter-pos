import { expect, type Page, test } from "@playwright/test"

import { removeCourierByName, removeShippingOptionByName } from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const ownerEmail = process.env.E2E_OWNER_EMAIL

async function login(page: Page, email: string, password: string, target: string) {
  await loginAs(page, email, password, target)
}

test.describe("Master Data › Kurir & Pengiriman", () => {
  test.skip(!ownerEmail || !admin.password, "E2E_OWNER_EMAIL / E2E_PASSWORD belum diisi")

  let createdCourier: string | undefined
  let createdOption: string | undefined
  test.afterEach(async () => {
    if (createdCourier) await removeCourierByName(createdCourier)
    if (createdOption) await removeShippingOptionByName(createdOption)
    createdCourier = undefined
    createdOption = undefined
  })

  test("daftar kurir sesuai desain", async ({ page }, info) => {
    await login(page, ownerEmail!, admin.password!, "/master-data/kurir")
    const table = page.getByRole("table").first()
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
    await login(page, ownerEmail!, admin.password!, "/master-data/kurir")

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

  test("kategori pengiriman: tambah dengan live tracking, ubah alur, tampil di Pengiriman & Input", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Kirim ${Date.now()}`
    createdOption = name
    await login(page, ownerEmail!, admin.password!, "/master-data/kurir")
    // Kategori bawaan hasil migrasi.
    for (const preset of ["Pick Up", "Instant", "Kurir Internal", "Ekspedisi"]) {
      await expect(page.getByTestId(`kategori-kirim-${preset}`)).toBeVisible()
    }

    await page.getByRole("button", { name: "Tambah Kategori" }).click()
    const dialog = page.getByRole("dialog", { name: "Tambah kategori pengiriman" })
    await dialog.getByLabel("Nama kategori").fill(name)
    await dialog.getByRole("radio", { name: "Instant" }).click()
    await dialog.getByLabel(/^Keterangan/).fill("Diantar Lalamove")
    await expect(dialog.getByLabel("Live tracking")).toBeChecked()
    // Pick Up tidak bisa live tracking.
    await dialog.getByRole("radio", { name: "Pick Up" }).click()
    await expect(dialog.getByLabel("Live tracking")).toBeDisabled()
    await dialog.getByRole("radio", { name: "Instant" }).click()
    await page.screenshot({ path: "test-results/kategori-kirim-form.png" })
    await dialog.getByRole("button", { name: "Tambah kategori" }).click()
    await expect(page.getByText("Kategori pengiriman ditambahkan.")).toBeVisible()
    const row = page.getByTestId(`kategori-kirim-${name}`)
    await expect(row).toContainText("Diantar Lalamove")
    await expect(row).toContainText("Instant")
    await expect(row.getByText("Ya", { exact: true })).toBeVisible()

    // Matikan live tracking.
    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah kategori pengiriman" })
    await edit.getByLabel("Live tracking").click()
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Kategori pengiriman disimpan.")).toBeVisible()
    await expect(row.getByText("Tidak", { exact: true })).toBeVisible()
    await page.screenshot({ path: "test-results/kategori-kirim.png", fullPage: true })

    // Tampil sebagai kartu di Pengiriman dan pilihan di Input Pesanan.
    await page.goto("/pengiriman")
    await expect(page.getByText(name, { exact: true })).toBeVisible()
    await page.goto("/pesanan/baru")
    await expect(
      page.getByRole("radiogroup", { name: "Metode pengiriman" }).getByText(name, { exact: true }),
    ).toBeVisible()

    // Nonaktif: hilang dari Input Pesanan.
    await page.goto("/master-data/kurir")
    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Nonaktifkan" }).click()
    await expect(row.getByText("Nonaktif", { exact: true })).toBeVisible()
    await page.goto("/pesanan/baru")
    await expect(page.getByRole("radiogroup", { name: "Metode pengiriman" })).toBeVisible()
    await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  })

  test("Admin dan Kasir tidak bisa membuka Kurir (khusus Owner)", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    for (const email of [admin.email!, kasirEmail!]) {
      await login(page, email, admin.password!, "/master-data/kurir")
      await expectAccessDenied(page)
    }
  })
})
