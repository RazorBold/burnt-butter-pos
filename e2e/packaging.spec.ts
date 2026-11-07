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

  test("packing Hampers memotong stok box, batal packing mengembalikannya", async ({
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
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")

    // Pengiriman menahan pesanan yang belum di-packing.
    await page.goto(`/pengiriman?tanggal=${date}&pesanan=${orderNo}`)
    await expect(
      page
        .getByRole("complementary", { name: "Detail Pengiriman" })
        .getByText("Pesanan belum di-packing (lihat menu Packaging)."),
    ).toBeVisible()

    // Dialog: Normal (default) tanpa isian; Hampers wajib isi box, tidak boleh melebihi stok.
    await page.goto(`/packaging?tanggal=${date}`)
    await page.getByRole("button", { name: `Selesai packing: ${orderNo}` }).click()
    const dialog = page.getByRole("dialog", { name: `Packing ${orderNo}` })
    await expect(dialog.getByRole("radio", { name: "Normal" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(dialog.getByRole("textbox", { name: /^Jumlah / })).toHaveCount(0)
    await dialog.getByRole("radio", { name: "Hampers" }).click()
    await expect(dialog.getByRole("region", { name: "Size Large" })).toBeVisible()
    await expect(dialog.getByRole("region", { name: "Size Regular" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Simpan & selesai packing" })).toBeDisabled()
    await dialog.getByRole("textbox", { name: `Jumlah ${name}` }).fill("6")
    await expect(dialog.getByRole("alert")).toContainText(`Stok ${name} tidak cukup`)
    await expect(dialog.getByRole("button", { name: "Simpan & selesai packing" })).toBeDisabled()
    await page.screenshot({ path: "test-results/packaging-dialog-desktop.png" })
    await dialog.getByRole("textbox", { name: `Jumlah ${name}` }).fill("2")
    await dialog.getByRole("button", { name: "Simpan & selesai packing" }).click()
    await expect(
      page.getByText(`${orderNo} selesai packing hampers, stok box dipotong.`),
    ).toBeVisible()
    const packed = done.getByRole("article", { name: orderNo })
    await expect(packed).toContainText("Packing Hampers")
    await expect(packed).toContainText(`2 ${name}`)
    expect(await readPackagingStock(name)).toBe(3)
    expect(await readOrder(orderNo)).toMatchObject({
      status: "siap_kirim",
      shipment_status: "menunggu_kurir",
    })

    // Riwayat stok mencatat pemakaian untuk pesanan ini.
    await page.goto("/stok-packaging")
    await expect(
      page
        .getByRole("region", { name: "Riwayat Stok" })
        .getByRole("row", { name: new RegExp(`Packing ${orderNo}`) }),
    ).toContainText("−2 pcs")

    // Batal packing: stok kembali, pesanan menunggu packing lagi.
    await page.goto(`/packaging?tanggal=${date}`)
    await page.getByRole("button", { name: `Batal packing: ${orderNo}` }).click()
    await expect(
      page.getByText(`Packing ${orderNo} dibatalkan, stok packaging dikembalikan.`),
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
