import { expect, type Page, test } from "@playwright/test"

import { markQaOrderPaid, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

const popupOf = (page: Page) => page.getByRole("alertdialog", { name: /LUNAS/ })
const beeps = (page: Page) => page.evaluate(() => (window as unknown as { beeps: number }).beeps)

/**
 * Akun QA hanya menerima pesanan uji bila flag test dinyalakan, dan AudioContext diganti tiruan
 * yang menghitung beep (headless Chrome tidak memutar suara tanpa klik).
 */
async function prepare(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("paid-alert:test", "1")
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

// Permintaan pemilik toko (14 Nov 2026): suara notifikasi pesanan baru yang sudah LUNAS.
test.describe("Notifikasi pesanan baru Lunas", () => {
  test.skip(!admin.email || !admin.password || !produksiEmail, "butuh akun QA admin & produksi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("popup + alarm berulang sampai Siap, diproses; tidak muncul lagi", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    test.setTimeout(120_000)
    await prepare(page)
    // Role Produksi pun menerima notifikasi (semua role).
    await loginAs(page, produksiEmail!, admin.password!, "/produksi")
    // Titik awal "sudah dilihat" tersimpan dulu; pesanan lunas sebelumnya tidak memicu popup.
    await expect
      .poll(
        () =>
          page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("paid:seen:"))),
        {
          timeout: 20_000,
        },
      )
      .toBe(true)
    await expect(popupOf(page)).toBeHidden()

    code = `${Date.now()}`
    const orderNo = `QA${code}01`
    await seedQaOrders(code, 1, 0, { plan: [{ status: "baru", method: "instant" }] })
    await markQaOrderPaid(orderNo)

    const popup = popupOf(page)
    await expect(popup).toBeVisible({ timeout: 25_000 })
    await expect(popup).toContainText(orderNo)
    await expect(popup).toContainText(`QA Customer ${code}`)
    await expect(popup.getByRole("link", { name: "Lihat di Produksi" })).toBeVisible()
    await page.screenshot({ path: "test-results/notifikasi-lunas-desktop.png" })
    // Alarm berulang selama popup belum ditutup.
    const first = await beeps(page)
    expect(first).toBeGreaterThan(0)
    await expect.poll(() => beeps(page), { timeout: 10_000 }).toBeGreaterThan(first)

    await popup.getByRole("button", { name: "Siap, diproses" }).click()
    await expect(popup).toBeHidden()
    const stopped = await beeps(page)
    await page.waitForTimeout(5_000)
    expect(await beeps(page)).toBe(stopped)

    // Sudah dilihat: tidak muncul lagi setelah muat ulang dan polling berikutnya.
    await page.reload()
    await page.waitForTimeout(15_000)
    await expect(popupOf(page)).toBeHidden()
  })
})
