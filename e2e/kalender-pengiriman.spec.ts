import { expect, test } from "@playwright/test"

import { FO1_TEMPLATE } from "../src/lib/wa-parser/templates"
import { removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

/** Tanggal WIB "YYYY-MM-DD" + n hari. */
function jakartaDate(offset: number) {
  const now = new Date(Date.now() + 7 * 3_600_000 + offset * 86_400_000)
  return now.toISOString().slice(0, 10)
}

function orderText(name: string) {
  return FO1_TEMPLATE.replace("Tanggal Pengiriman:", "Tanggal Pengiriman: besok")
    .replace("Jenis: PO/RS/MTO", "Jenis: PO")
    .replace("Nama Penerima:", `Nama Penerima: ${name}`)
    .replace(
      /No\.Telp: ?/,
      `No.Telp: 0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
    )
    .replace("Alamat Lengkap:", "Alamat Lengkap: Jl. QA No. 1, Bandung")
    .replace(/- Pick Up\s*\n/, "")
    .replace(/- Kurir Internal.*\n/, "")
    .replace("Choco Bon Bon :", "Choco Bon Bon : 2")
}

test.describe("Kalender Pengiriman dan filter tanggal kirim", () => {
  test.skip(!admin.email || !admin.password, "butuh akun QA Admin")

  let orderNo: string | undefined
  test.afterEach(async () => {
    if (orderNo) await removeOrderByNo(orderNo)
    orderNo = undefined
  })

  test("kalender tampil di dashboard dan bisa ganti bulan", async ({ page }, info) => {
    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    const calendar = page.getByRole("region", { name: "Kalender Pengiriman" })
    await expect(calendar).toBeVisible()
    await expect(calendar.getByText("Pengingat 7 hari ke depan")).toBeVisible()
    await expect(calendar.getByTestId(`kalender-${jakartaDate(0)}`)).toHaveAccessibleName(
      /hari ini/,
    )
    await calendar.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/kalender-${info.project.name}.png`,
      fullPage: false,
    })

    await calendar.getByRole("link", { name: "Bulan berikutnya" }).click()
    await expect(page).toHaveURL(/bulan=\d{4}-\d{2}/)
    await expect(calendar.getByRole("link", { name: "Bulan ini" })).toBeVisible()
  })

  test("pesanan kirim besok terhitung di kalender dan terbuka lewat filter Tgl Kirim", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(90_000)
    const tomorrow = jakartaDate(1)
    await loginAs(page, admin.email!, admin.password!, "/pesanan/baru")
    await page
      .getByRole("textbox", { name: "Pesan WhatsApp" })
      .fill(orderText(`QA Customer ${Date.now()}`))
    await page.getByRole("button", { name: "Isi Otomatis" }).click()
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    orderNo = await page
      .getByRole("dialog", { name: "Pesanan sudah terinput" })
      .getByTestId("saved-order-no")
      .innerText()

    await page.goto("/dashboard")
    const calendar = page.getByRole("region", { name: "Kalender Pengiriman" })
    const reminder = calendar.getByRole("link", { name: /^Besok/ })
    await expect(reminder).toContainText(/\d+ pesanan/)
    await expect(reminder).toContainText("belum bayar")
    await reminder.click()

    await expect(page).toHaveURL(new RegExp(`tgl=kirim&dari=${tomorrow}&sampai=${tomorrow}`))
    await expect(page.getByRole("button", { name: "Tgl Kirim" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByRole("link", { name: orderNo, exact: true }).first()).toBeVisible()

    // Kembali ke Tgl Pesan: rentang hari ini (pesanan baru dibuat hari ini tetap tampil).
    await page.getByRole("button", { name: "Tgl Pesan" }).click()
    await expect(page).not.toHaveURL(/tgl=kirim/)
    await expect(page.getByRole("link", { name: orderNo, exact: true }).first()).toBeVisible()

    // Tgl Kirim + preset "Besok".
    await page.getByRole("button", { name: "Tgl Kirim" }).click()
    await page.getByRole("button", { name: /^Tanggal kirim:/ }).click()
    await page.getByRole("button", { name: "Besok", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`dari=${tomorrow}`))
    await expect(page.getByRole("link", { name: orderNo, exact: true }).first()).toBeVisible()
    await page.screenshot({ path: "test-results/pesanan-tgl-kirim.png" })
  })
})
