import { expect, type Page, test } from "@playwright/test"

import { removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

/** Baris data di tabel (tanpa header). */
const dataRows = (page: Page) =>
  page
    .getByRole("table")
    .getByRole("row")
    .filter({ hasNot: page.getByRole("columnheader") })

test.describe("Daftar Pesanan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("tabel, paginasi, filter tipe dan status, rentang tanggal, Reset", async ({
    page,
  }, info) => {
    code = `${Date.now()}`
    // 12 pesanan hari ini: 8 Personal + 4 Hadiah. Dicari lewat kodenya supaya pesanan asli
    // (database produksi) tidak ikut terhitung.
    await seedQaOrders(code, 12, 4)
    await login(page, admin.email!, `/pesanan?q=${code}`)

    await expect(page.getByRole("heading", { name: "Daftar Pesanan" })).toBeVisible()
    await expect(page.getByText("Total Pesanan")).toBeVisible()
    await expect(page.getByText("Menampilkan 1–10 dari 12 pesanan")).toBeVisible()
    await expect(dataRows(page)).toHaveCount(10)
    const first = dataRows(page).first()
    await expect(first).toContainText(`QA${code}01`)
    await expect(first.getByText("Personal")).toBeVisible()
    await expect(first.getByText("Baru")).toBeVisible()
    await expect(first.getByText("Kurir Internal")).toBeVisible()
    await page.screenshot({ path: `test-results/pesanan-${info.project.name}.png`, fullPage: true })
    test.skip(info.project.name !== "desktop", "filter cukup diuji di desktop")

    await page.getByRole("link", { name: "Halaman 2" }).click()
    await expect(page).toHaveURL(new RegExp(`hal=2`))
    await expect(page).toHaveURL(new RegExp(`q=${code}`))
    await expect(page.getByText("Menampilkan 11–12 dari 12 pesanan")).toBeVisible()
    await expect(dataRows(page)).toHaveCount(2)

    await page.getByRole("combobox", { name: "Semua Tipe" }).click()
    await page.getByRole("option", { name: "Hadiah" }).click()
    await expect(page).toHaveURL(/tipe=hadiah/)
    await expect(page).not.toHaveURL(/hal=/)
    await expect(page.getByText("Menampilkan 1–4 dari 4 pesanan")).toBeVisible()

    await page.getByRole("combobox", { name: "Semua Status" }).click()
    await page.getByRole("option", { name: "Siap Kirim" }).click()
    await expect(dataRows(page)).toHaveCount(1)
    await expect(dataRows(page).first()).toContainText(`QA${code}09`)
    // Hadiah: pengirim tampil di bawah nama penerima.
    await expect(dataRows(page).first()).toContainText(`dari QA Pengirim ${code}`)

    await page.getByRole("button", { name: /^Tanggal pesanan/ }).click()
    await page.getByRole("button", { name: "Kemarin" }).click()
    await expect(page).toHaveURL(/dari=\d{4}-\d{2}-\d{2}/)
    await expect(page.getByText("Tidak ada pesanan yang cocok dengan filter.")).toBeVisible()

    await page.getByRole("button", { name: "Reset" }).click()
    await expect(page).toHaveURL(/\/pesanan$/)
    await expect(page.getByLabel("Cari nama, no. pesanan, atau no. telp")).toHaveValue("")
  })

  test("Kasir bisa membuka Daftar Pesanan", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, "/pesanan")
    await expect(page.getByRole("heading", { name: "Daftar Pesanan" })).toBeVisible()
    await expect(page.getByText("Pesanan Hadiah")).toBeVisible()
  })
})
