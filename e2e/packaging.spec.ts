import { expect, type Page, test } from "@playwright/test"

import { expectAccessDenied } from "./helpers/access"
import {
  createQaPackaging,
  readOrder,
  readPackagingStock,
  removePackagingByName,
  removeQaOrders,
  seedQaOrders,
} from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

/** Tanggal kirim jauh ke depan supaya papan Packaging hanya berisi pesanan uji. */
function farDate(code: string) {
  const date = new Date(Date.now() + (400 + (Number(code) % 200)) * 86_400_000)
  return date.toISOString().slice(0, 10)
}

test.describe("Packaging", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  let packagingName: string | undefined
  test.afterEach(async () => {
    // Pesanan dulu: cleanup-nya mengembalikan stok packaging sebelum packaging uji dihapus.
    if (code) await removeQaOrders(code)
    if (packagingName) await removePackagingByName(packagingName)
    code = undefined
    packagingName = undefined
  })

  test("selesai packing satu klik sesuai tipe pesanan, stok tetap; batal packing", async ({
    page,
  }, info) => {
    code = `${Date.now()}`
    const orderNo = `QA${code}01`
    const date = farDate(code)
    const name = `QA Packaging ${code}`
    packagingName = name
    await createQaPackaging(name, 5)
    await seedQaOrders(code, 2, 0, {
      deliveryDate: date,
      plan: [
        { status: "siap_packing", method: "instant" },
        { status: "diproses", method: "instant" },
      ],
    })

    await login(page, admin.email!, `/packaging?tanggal=${date}`)
    await expect(page.getByRole("heading", { name: "Packaging", level: 1 })).toBeVisible()
    const waiting = page.getByRole("region", { name: /^Menunggu packing/ })
    const done = page.getByRole("region", { name: /^Selesai packing/ })
    await expect(waiting.getByRole("article", { name: orderNo })).toBeVisible()
    await expect(page.getByText("1 pesanan", { exact: true }).first()).toBeVisible()
    await page.screenshot({
      path: `test-results/packaging-${info.project.name}.png`,
      fullPage: true,
    })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)

    // Filter Tipe dan Sumber (pesanan uji: Normal dari WhatsApp).
    const card = waiting.getByRole("article", { name: orderNo })
    await expect(card).toContainText("WhatsApp")
    await expect(card.getByTestId("packing-type")).toHaveText("Normal")
    const tipe = page.getByRole("group", { name: "Tipe" })
    const sumber = page.getByRole("group", { name: "Sumber" })
    await tipe.getByRole("button", { name: "Hampers" }).click()
    await expect(page).toHaveURL(/tipe=hampers/)
    await expect(card).toHaveCount(0)
    await expect(page.getByText(/Tidak ada pesanan yang cocok dengan filter/)).toBeVisible()
    await tipe.getByRole("button", { name: "Normal" }).click()
    await expect(card).toBeVisible()
    await sumber.getByRole("button", { name: "Olshop" }).click()
    await expect(card).toHaveCount(0)
    await sumber.getByRole("button", { name: "WhatsApp" }).click()
    await expect(card).toBeVisible()
    await expect(sumber.getByRole("button", { name: "WhatsApp" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await page.screenshot({ path: `test-results/packaging-filter-${info.project.name}.png` })
    await tipe.getByRole("button", { name: "Semua" }).click()
    await sumber.getByRole("button", { name: "Semua" }).click()
    await expect(page).not.toHaveURL(/tipe=|sumber=/)
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")

    // Pengiriman menahan pesanan yang belum di-packing.
    await page.goto(`/pengiriman?tanggal=${date}&pesanan=${orderNo}`)
    await expect(
      page
        .getByRole("complementary", { name: "Detail Pengiriman" })
        .getByText("Pesanan belum di-packing (lihat menu Packaging)."),
    ).toBeVisible()

    // Satu klik tanpa dialog: jenis packing mengikuti tipe pesanan (Normal); stok tidak berubah
    // (box dan loyang sudah dipotong otomatis saat Lunas).
    await page.goto(`/packaging?tanggal=${date}`)
    await expect(waiting.getByRole("article", { name: orderNo })).toContainText(
      "Packing Normal (sesuai tipe pesanan)",
    )
    await page.getByRole("button", { name: `Selesai packing: ${orderNo}` }).click()
    await expect(page.getByText(`${orderNo} selesai packing normal, siap dikirim.`)).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const packed = done.getByRole("article", { name: orderNo })
    await expect(packed).toContainText("Packing Normal")
    expect(await readPackagingStock(name)).toBe(5)
    expect(await readOrder(orderNo)).toMatchObject({
      status: "siap_kirim",
      shipment_status: "menunggu_kurir",
    })

    // Batal packing: pesanan menunggu packing lagi, stok tetap.
    await page.getByRole("button", { name: `Batal packing: ${orderNo}` }).click()
    await expect(
      page.getByText(`Packing ${orderNo} dibatalkan, pesanan menunggu packing lagi.`),
    ).toBeVisible()
    await expect(waiting.getByRole("article", { name: orderNo })).toBeVisible()
    expect(await readPackagingStock(name)).toBe(5)
    expect(await readOrder(orderNo)).toMatchObject({
      status: "siap_packing",
      shipment_status: null,
    })
  })

  test("Produksi bisa membuka Packaging; Kasir tidak", async ({ page, browser }, info) => {
    test.skip(
      !produksiEmail || !kasirEmail || info.project.name !== "desktop",
      "butuh E2E_PRODUKSI_EMAIL dan E2E_KASIR_EMAIL, desktop saja",
    )
    await login(page, produksiEmail!, "/packaging")
    await expect(page.getByRole("heading", { name: "Packaging", level: 1 })).toBeVisible()

    const kasir = await browser.newPage()
    await login(kasir, kasirEmail!, "/packaging")
    await expectAccessDenied(kasir)
    await kasir.close()
  })
})
