import { expect, type Page, test } from "@playwright/test"

import { removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

const dataRows = (page: Page) =>
  page
    .getByRole("table")
    .getByRole("row")
    .filter({ hasNot: page.getByRole("columnheader") })

test.describe("Pembayaran", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("tandai lunas, filter, ubah metode, jadikan belum bayar", async ({ page }, info) => {
    code = `${Date.now()}`
    // 5 pesanan QA: status ke-6 (Dibatalkan) tidak ikut, jadi semua tampil di Pembayaran.
    await seedQaOrders(code, 5, 1)
    await login(page, admin.email!, `/pembayaran?q=${code}`)

    await expect(page.getByRole("heading", { name: "Pembayaran" })).toBeVisible()
    await expect(dataRows(page)).toHaveCount(5)
    await expect(dataRows(page).getByText("Belum bayar")).toHaveCount(5)
    await page.screenshot({
      path: `test-results/pembayaran-${info.project.name}.png`,
      fullPage: true,
    })
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")

    const first = dataRows(page).filter({ hasText: `QA${code}01` })
    await first.getByRole("button", { name: "Tandai Lunas" }).click()
    const dialog = page.getByRole("dialog", { name: `Tandai QA${code}01 lunas` })
    await dialog.getByRole("button", { name: "Tandai lunas" }).click()
    await expect(dialog.getByText("Pilih dibayar lewat apa.")).toBeVisible()
    await dialog.getByRole("radio", { name: /DANA/ }).check()
    await dialog.getByLabel(/^Catatan/).fill("QA a.n. Siti, 10.12")
    await dialog.getByRole("button", { name: "Tandai lunas" }).click()
    await expect(page.getByText(`QA${code}01 lunas via DANA.`)).toBeVisible()
    await expect(first.getByText("Lunas", { exact: true })).toBeVisible()
    await expect(first.getByText("QA a.n. Siti, 10.12")).toBeVisible()

    await page.getByRole("combobox", { name: "Status bayar" }).click()
    await page.getByRole("option", { name: "Lunas" }).click()
    await expect(page).toHaveURL(/bayar=lunas/)
    await expect(dataRows(page)).toHaveCount(1)
    await page.getByRole("combobox", { name: "Metode bayar" }).click()
    await page.getByRole("option", { name: "OVO" }).click()
    await expect(page.getByText("Tidak ada pesanan yang cocok dengan filter.")).toBeVisible()
    await page.getByRole("combobox", { name: "Metode bayar" }).click()
    await page.getByRole("option", { name: "DANA" }).click()
    await expect(dataRows(page)).toHaveCount(1)

    await first.getByRole("button", { name: `Ubah pembayaran QA${code}01` }).click()
    const edit = page.getByRole("dialog", { name: `Ubah pembayaran QA${code}01` })
    await expect(edit.getByRole("radio", { name: /DANA/ })).toBeChecked()
    await edit.getByRole("radio", { name: /OVO/ }).check()
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText(`QA${code}01 lunas via OVO.`)).toBeVisible()

    await page.getByRole("button", { name: "Reset" }).click()
    await page.getByLabel("Cari nama, no. pesanan, atau no. telp").fill(code)
    const row = dataRows(page).filter({ hasText: `QA${code}01` })
    await expect(row.getByText("OVO")).toBeVisible()
    await row.getByRole("button", { name: `Aksi lain untuk pembayaran QA${code}01` }).click()
    await page.getByRole("menuitem", { name: "Jadikan belum bayar" }).click()
    await page
      .getByRole("dialog", { name: `Jadikan QA${code}01 belum bayar?` })
      .getByRole("button", { name: "Jadikan belum bayar" })
      .click()
    await expect(page.getByText(`QA${code}01 kembali jadi Belum bayar.`)).toBeVisible()
    await expect(dataRows(page).getByText("Belum bayar")).toHaveCount(5)

    // Panel Detail Pesanan juga bisa menandai lunas.
    await page.goto(`/pesanan?q=${code}&pesanan=QA${code}02`)
    const panel = page.getByRole("complementary", { name: "Detail Pesanan" })
    await expect(panel.getByText("Belum bayar")).toBeVisible()
    await panel.getByRole("button", { name: "Tandai Lunas" }).click()
    const fromPanel = page.getByRole("dialog", { name: `Tandai QA${code}02 lunas` })
    await fromPanel.getByRole("radio", { name: /Cash/ }).check()
    await fromPanel.getByRole("button", { name: "Tandai lunas" }).click()
    await expect(panel.getByText("via Cash")).toBeVisible()
    await expect(panel.getByRole("button", { name: "Ubah pembayaran" })).toBeVisible()
  })

  test("Kasir bisa membuka Pembayaran", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, "/pembayaran")
    await expect(page.getByRole("heading", { name: "Pembayaran" })).toBeVisible()
    await expect(page.getByText("Nilai Belum Dibayar")).toBeVisible()
  })
})
