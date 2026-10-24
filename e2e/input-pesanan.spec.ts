import { expect, type Page, test } from "@playwright/test"

import { HADIAH_SAMPLE, PERSONAL_SAMPLE, PERSONAL_TEMPLATE } from "../src/lib/wa-parser/templates"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, target: string) {
  await page.goto(target)
  await page.getByLabel("Email").fill(admin.email!)
  await page.getByLabel("Kata sandi", { exact: true }).fill(admin.password!)
  await page.getByRole("button", { name: "Masuk" }).click()
}

test.describe("Input Pesanan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  test("Personal: tempel di modal navbar, Isi Otomatis membuka form yang terisi", async ({
    page,
  }, info) => {
    await login(page, "/dashboard")
    const trigger = page.getByRole("button", { name: "Input Pesanan" })
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: "Input Pesanan" })
    // "besok" supaya tanggal kirim tidak pernah lewat, kapan pun test dijalankan.
    await dialog
      .getByLabel("Pesan WhatsApp")
      .fill(PERSONAL_SAMPLE.replace("Sabtu, 25 Oktober 2026", "besok"))
    await dialog.getByRole("button", { name: "Isi Otomatis" }).click()

    await expect(page).toHaveURL(/\/pesanan\/baru$/)
    await expect(page.getByRole("radio", { name: "Personal" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByLabel("Nama", { exact: true })).toHaveValue("Siti Nurhaliza")
    await expect(page.getByLabel("No. telp")).toHaveValue("081234567890")
    await expect(page.getByLabel(/^Alamat lengkap/)).toHaveValue(
      "Jl. Melati No. 12, RT 03/RW 05\nKel. Sukajadi, Bandung",
    )
    await expect(page.getByRole("radio", { name: /^Instant/ })).toBeChecked()
    await expect(page.getByLabel(/^Request/)).toHaveValue("Sausnya dipisah ya kak")
    await expect(page.getByLabel("Jumlah Spaghetti Classico Bologna Brulee Large")).toHaveValue("2")
    await expect(page.getByLabel("Jumlah Not Your Mac and Cheese Regular")).toHaveValue("1")
    await expect(page.getByLabel("Jumlah Choco Bon Bon")).toHaveValue("2")
    // 2×65.000 + 65.000 + 50.000 + 2×40.000
    await expect(page.getByTestId("order-total")).toHaveText("Rp 325.000")
    await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()
    await expect(page.getByText(/Terbaca 5 dari 5 isian wajib dan 4 menu\./)).toBeVisible()
    await page.screenshot({
      path: `test-results/input-pesanan-form-${info.project.name}.png`,
      fullPage: true,
    })

    // Ubah jumlah lewat tombol: total ikut berubah.
    await page.getByRole("button", { name: "Tambah Choco Bon Bon" }).click()
    await expect(page.getByTestId("order-total")).toHaveText("Rp 365.000")
  })

  test("Hadiah: penerima, pengirim, kartu ucapan, dan Kurir Internal", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    await login(page, "/pesanan/baru")
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(HADIAH_SAMPLE)
    await page.getByRole("button", { name: "Isi Otomatis" }).click()

    await expect(page.getByRole("radio", { name: "Hadiah" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByLabel("Nama penerima")).toHaveValue("Alya Putri")
    await expect(page.getByLabel("Nama pengirim")).toHaveValue("Rizky")
    await expect(page.getByLabel(/^Wishes/)).toHaveValue(
      "Happy birthday sayang!\nSemoga suka pastanya",
    )
    await expect(page.getByRole("radio", { name: /^Kurir Internal/ })).toBeChecked()
    await expect(page.getByLabel("Jumlah Bundle of 3")).toHaveValue("1")
    await expect(page.getByTestId("order-total")).toHaveText("Rp 245.000")
    await page.screenshot({ path: "test-results/input-pesanan-hadiah.png", fullPage: true })
  })

  test("template kosong: isian wajib ditandai, tanda hilang setelah diisi", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    await login(page, "/pesanan/baru")
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(PERSONAL_TEMPLATE)
    await page.getByRole("button", { name: "Isi Otomatis" }).click()

    await expect(page.getByText(/Terbaca 0 dari 5 isian wajib dan 0 menu\./)).toBeVisible()
    await expect(page.getByText("Nama wajib diisi.")).toBeVisible()
    await expect(page.getByText("Pilih metode pengiriman.")).toBeVisible()
    await expect(page.getByText("Pilih minimal satu menu.")).toBeVisible()
    await expect(page.getByText(/^Belum lengkap:/)).toContainText(
      "Nama, No. telp, Alamat, Tanggal kirim, Metode pengiriman, Menu",
    )

    await page.getByLabel("Nama", { exact: true }).fill("Dewi")
    await expect(page.getByText("Nama wajib diisi.")).toBeHidden()
    await page.getByRole("radio", { name: /^Pick Up/ }).check()
    // Pick Up tidak butuh alamat.
    await expect(page.getByText(/^Belum lengkap:/)).not.toContainText("Alamat")
    await expect(page.getByRole("button", { name: "Simpan pesanan" })).toBeDisabled()

    await page.getByRole("button", { name: "Reset" }).click()
    await expect(page.getByRole("textbox", { name: "Pesan WhatsApp" })).toHaveValue("")
    await expect(page.getByLabel("Nama", { exact: true })).toHaveValue("")
  })
})
