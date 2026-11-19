import { expect, type Page, test } from "@playwright/test"

import { readOrder, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

const popupOf = (page: Page) => page.getByRole("alertdialog", { name: /selesai packing/ })
const beeps = (page: Page) => page.evaluate(() => (window as unknown as { beeps: number }).beeps)
const hasSeenKey = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("packed:seen:")))

/** Tanggal kirim jauh ke depan supaya papan Packaging hanya berisi pesanan uji. */
function farDate(code: string) {
  const date = new Date(Date.now() + (400 + (Number(code) % 200)) * 86_400_000)
  return date.toISOString().slice(0, 10)
}

/**
 * Akun QA hanya menerima pesanan uji bila flag test dinyalakan, dan AudioContext diganti tiruan
 * yang menghitung nada (headless Chrome tidak memutar suara tanpa klik).
 */
async function prepare(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("packed-alert:test", "1")
    const w = window as unknown as { beeps: number; AudioContext: unknown }
    w.beeps = 0
    const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }
    const node = () => ({
      frequency: param,
      gain: param,
      connect: (next: unknown) => next,
      start() {
        w.beeps++
      },
      stop() {},
    })
    w.AudioContext = class {
      state = "running"
      currentTime = 0
      destination = {}
      resume() {
        return Promise.resolve()
      }
      createOscillator = node
      createGain = node
    }
  })
}

// Permintaan pemilik toko (19 Nov 2026): Admin diberi tahu begitu pesanan selesai packing.
test.describe("Notifikasi selesai packing untuk Admin", () => {
  test.skip(!admin.email || !admin.password || !produksiEmail, "butuh akun QA admin & produksi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("Produksi packing → Admin dapat popup + bunyi sampai ditutup", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    test.setTimeout(120_000)
    await prepare(page)
    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    // Titik awal "sudah dilihat" tersimpan dulu; packing sebelumnya tidak memicu popup.
    await expect.poll(() => hasSeenKey(page), { timeout: 20_000 }).toBe(true)
    await expect(popupOf(page)).toBeHidden()

    code = `${Date.now()}`
    const orderNo = `QA${code}01`
    const date = farDate(code)
    await seedQaOrders(code, 1, 0, {
      deliveryDate: date,
      plan: [{ status: "siap_packing", method: "instant" }],
    })

    // Produksi menyelesaikan packing di sesi lain. Produksi sendiri tidak memakai watcher ini.
    const context = await browser.newContext()
    const produksi = await context.newPage()
    await prepare(produksi)
    await loginAs(produksi, produksiEmail!, admin.password!, `/packaging?tanggal=${date}`)
    await produksi.getByRole("button", { name: `Selesai packing: ${orderNo}` }).click()
    await expect(produksi.getByText(`${orderNo} selesai packing normal`)).toBeVisible()
    expect(await readOrder(orderNo)).toMatchObject({ status: "siap_kirim" })
    await produksi.waitForTimeout(6_000)
    expect(await hasSeenKey(produksi)).toBe(false)
    await expect(popupOf(produksi)).toHaveCount(0)
    await context.close()

    const popup = popupOf(page)
    await expect(popup).toBeVisible({ timeout: 25_000 })
    await expect(popup).toContainText(orderNo)
    await expect(popup).toContainText(`QA Customer ${code}`)
    await expect(popup).toContainText("oleh QA Produksi")
    await expect(popup.getByRole("link", { name: "Atur pengiriman" })).toHaveAttribute(
      "href",
      `/pengiriman?tanggal=${date}&q=${orderNo}`,
    )
    await page.screenshot({ path: "test-results/notifikasi-packing-desktop.png" })
    const first = await beeps(page)
    expect(first).toBeGreaterThan(0)
    await expect.poll(() => beeps(page), { timeout: 12_000 }).toBeGreaterThan(first)

    await popup.getByRole("button", { name: "Oke, saya proses" }).click()
    await expect(popup).toBeHidden()
    const stopped = await beeps(page)
    await page.waitForTimeout(9_000)
    expect(await beeps(page)).toBe(stopped)

    // Sudah dilihat: tidak muncul lagi setelah muat ulang.
    await page.reload()
    await page.waitForTimeout(15_000)
    await expect(popupOf(page)).toBeHidden()
  })
})
