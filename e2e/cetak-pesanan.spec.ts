import { expect, type Page, test } from "@playwright/test"

import { HADIAH_SAMPLE } from "../src/lib/wa-parser/templates"
import { markQaOrderPaid, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

const randomPhone = () => `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`

// Permintaan pemilik toko (14 Nov 2026): Print / PDF Detail Pesanan, A4 lengkap dengan harga.
test.describe("Cetak Detail Pesanan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let orderNo: string | undefined
  test.afterEach(async () => {
    if (orderNo) await removeOrderByNo(orderNo)
    orderNo = undefined
  })

  test("A4 berisi penerima, kartu ucapan, menu + harga, total, dan pembayaran", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    test.setTimeout(90_000)
    const name = `QA Customer ${Date.now()} Cetak`
    // Dialog print otomatis tidak dipakai di tes.
    await page.addInitScript(() => {
      window.print = () => {}
    })

    await login(page, admin.email!, "/pesanan/baru")
    await page
      .getByRole("textbox", { name: "Pesan WhatsApp" })
      .fill(HADIAH_SAMPLE.replace("Alya Putri", name).replace("+62 813 2345 6789", randomPhone()))
    await page.getByRole("button", { name: "Isi Otomatis" }).click()
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const saved = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
    orderNo = await saved.getByTestId("saved-order-no").innerText()
    await markQaOrderPaid(orderNo)

    // Tombol di halaman Detail Pesanan membuka halaman cetak di tab baru.
    await page.goto(`/pesanan/${orderNo}`)
    const button = page.getByRole("link", { name: "Print / PDF" })
    await expect(button).toHaveAttribute("href", `/pesanan/${orderNo}/cetak`)
    await expect(button).toHaveAttribute("target", "_blank")

    await page.goto(`/pesanan/${orderNo}/cetak`)
    const sheet = page.getByRole("article", { name: `Cetak pesanan ${orderNo}` })
    await expect(sheet.getByRole("heading", { name: orderNo, level: 1 })).toBeVisible()
    await expect(page).toHaveTitle(`Pesanan ${orderNo}`)
    await expect(sheet).toContainText(name)
    await expect(sheet).toContainText("Rizky")
    const card = sheet.getByRole("region", { name: "Kartu ucapan" })
    await expect(card).toContainText("To: Alya")
    await expect(card).toContainText("From: Rizky")
    await expect(sheet.getByRole("row", { name: /Bundle of 3/ })).toContainText("Rp")
    await expect(sheet).toContainText("Total Pembayaran")
    await expect(sheet).toContainText("Lunas")
    // Tanpa sidebar aplikasi.
    await expect(page.getByRole("navigation", { name: /menu/i })).toHaveCount(0)
    await page.screenshot({ path: "test-results/cetak-pesanan.png", fullPage: true })
    // Layar ponsel: tanpa scroll ke samping.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: "test-results/cetak-pesanan-ponsel.png", fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await page.setViewportSize({ width: 1280, height: 900 })

    // Tampilan saat dicetak: bar atas hilang, satu halaman A4.
    await page.emulateMedia({ media: "print" })
    await expect(page.getByRole("button", { name: "Print / PDF" })).toBeHidden()
    await page.pdf({ path: "test-results/cetak-pesanan.pdf", format: "A4" })
  })

  test("Produksi tidak bisa membuka halaman cetak", async ({ page }, info) => {
    test.skip(!produksiEmail || info.project.name !== "desktop", "butuh E2E_PRODUKSI_EMAIL")
    await login(page, produksiEmail!, "/pesanan/BB000000000/cetak")
    await expect(page).toHaveURL(/akses=ditolak/)
  })
})
