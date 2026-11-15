import { expect, type Page, test } from "@playwright/test"

import { readOrder, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, target: string) {
  await loginAs(page, admin.email!, admin.password!, target)
}

/** Tanggal kirim jauh ke depan supaya daftar Pengiriman hanya berisi pesanan uji. */
function farDate(code: string) {
  const date = new Date(Date.now() + (700 + (Number(code) % 200)) * 86_400_000)
  return date.toISOString().slice(0, 10)
}

// Permintaan pemilik toko (14 Nov 2026): Tandai Dikirim dan Tandai Selesai beda warna, dan
// status yang salah klik bisa dikoreksi.
test.describe("Pengiriman: warna langkah dan koreksi status", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("Tandai Dikirim biru, Tandai Selesai hijau; koreksi dari daftar dan panel", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(90_000)
    code = `${Date.now()}`
    const sent = `QA${code}01`
    const pickedUp = `QA${code}02`
    const ready = `QA${code}03`
    const date = farDate(code)
    await seedQaOrders(code, 3, 0, {
      deliveryDate: date,
      plan: [
        { status: "dikirim", method: "instant" },
        { status: "selesai", method: "pick_up" },
        { status: "siap_kirim", method: "instant" },
      ],
    })

    await login(page, `/pengiriman?tanggal=${date}`)
    const finish = page.getByRole("button", { name: `Tandai Selesai ${sent}` })
    const send = page.getByRole("button", { name: `Tandai Dikirim ${ready}` })
    await expect(finish).toBeVisible()
    await expect(send).toBeVisible()
    const background = (button: typeof finish) =>
      button.evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(await background(finish)).toBe("rgb(21, 92, 22)")
    expect(await background(send)).toBe("rgb(11, 99, 169)")
    await page.screenshot({ path: "test-results/pengiriman-warna.png", fullPage: true })

    // Koreksi dari menu ⋮: Pick Up Selesai → Siap Kirim (Pick Up tidak punya Dikirim).
    await page.getByRole("button", { name: `Aksi untuk ${pickedUp}` }).click()
    await page.getByRole("menuitem", { name: "Koreksi status" }).click()
    const dialog = page.getByRole("dialog", { name: `Koreksi status ${pickedUp}` })
    await expect(dialog.getByRole("radio")).toHaveCount(1)
    await expect(dialog.getByRole("button", { name: "Simpan koreksi" })).toBeDisabled()
    await dialog.getByRole("radio", { name: "Siap Kirim" }).check()
    await dialog.screenshot({ path: "test-results/pengiriman-koreksi.png" })
    await dialog.getByRole("button", { name: "Simpan koreksi" }).click()
    await expect(page.getByText(`Status ${pickedUp} dikoreksi jadi Siap Kirim.`)).toBeVisible()
    await expect(dialog).toHaveCount(0)
    expect(await readOrder(pickedUp)).toMatchObject({
      status: "siap_kirim",
      shipment_status: "siap_diambil",
      logs: 1,
    })
    await expect(page.getByRole("button", { name: `Sudah Diambil ${pickedUp}` })).toBeVisible()

    // Koreksi dari panel detail: Dikirim → Selesai.
    await page.goto(`/pengiriman?tanggal=${date}&pesanan=${sent}`)
    const panel = page.getByRole("complementary", { name: "Detail Pengiriman" })
    await panel.getByRole("button", { name: "Koreksi status" }).click()
    const panelDialog = page.getByRole("dialog", { name: `Koreksi status ${sent}` })
    await expect(panelDialog.getByRole("radio")).toHaveCount(2)
    await panelDialog.getByRole("radio", { name: "Selesai" }).check()
    await panelDialog.getByRole("button", { name: "Simpan koreksi" }).click()
    await expect(page.getByText(`Status ${sent} dikoreksi jadi Selesai.`)).toBeVisible()
    expect(await readOrder(sent)).toMatchObject({
      status: "selesai",
      shipment_status: "selesai",
      logs: 1,
    })

    // Belum dikirim: tidak ada koreksi, cukup langkah biasa.
    await page.getByRole("button", { name: `Aksi untuk ${ready}` }).click()
    await expect(page.getByRole("menuitem", { name: "Tandai Dikirim" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Koreksi status" })).toHaveCount(0)
    await page.keyboard.press("Escape")
  })
})
