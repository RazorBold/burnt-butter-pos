import { expect, type Page, test } from "@playwright/test"

import { readOrder, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

/** Tanggal kirim jauh ke depan supaya Produksi dan Pengiriman hanya berisi pesanan uji. */
function farDate() {
  const offset = 400 + (Math.floor(Date.now() / 1000) % 200)
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
}

async function fillShopeeForm(page: Page, values: { no: string; name: string; date: string }) {
  await page.getByLabel("No. pesanan Shopee").fill(values.no)
  await page.getByLabel("Total pembayaran").fill("210000")
  await page.getByLabel("Nama pembeli").fill(values.name)
  await page.getByLabel("Tanggal kirim").fill(values.date)
  await page.getByLabel("Kurir").fill("SPX Express")
  await page.getByRole("button", { name: "Tambah Choco Bon Bon" }).click()
}

test.describe("Input Pesanan marketplace", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const saved: string[] = []
  test.afterEach(async () => {
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  test("modal navbar membuka form sesuai sumber", async ({ page }, info) => {
    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    await page.getByRole("button", { name: "Input Pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: "Input Pesanan" })
    await expect(dialog.getByLabel("Pesan WhatsApp")).toBeVisible()
    await dialog.getByRole("radio", { name: "Tokopedia" }).click()
    await expect(dialog.getByLabel("Pesan WhatsApp")).toHaveCount(0)
    await dialog.getByRole("link", { name: "Isi form Tokopedia" }).click()
    await expect(page).toHaveURL(/\/pesanan\/baru\?sumber=tokopedia$/)
    await expect(page.getByRole("radio", { name: "Tokopedia" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByLabel("No. pesanan Tokopedia")).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Pesan WhatsApp" })).toHaveCount(0)
    await page.screenshot({
      path: `test-results/input-marketplace-${info.project.name}.png`,
      fullPage: true,
    })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
  })

  test("Shopee: simpan Lunas, tolak input ganda, resi wajib sebelum Dikirim", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const stamp = Date.now()
    const no = `QA-SHP-${stamp}`
    const name = `QA Customer ${stamp}`
    const date = farDate()

    await loginAs(page, admin.email!, admin.password!, "/pesanan/baru?sumber=shopee")
    await fillShopeeForm(page, { no, name, date })
    await expect(page.getByTestId("order-total")).toHaveText("Rp 210.000")
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: "Pesanan tersimpan" })
    await expect(dialog.getByText("sudah Lunas via Shopee")).toBeVisible()
    const orderNo = await dialog.getByTestId("saved-order-no").innerText()
    saved.push(orderNo)
    expect(await readOrder(orderNo)).toMatchObject({
      channel: "shopee",
      marketplace_order_no: no,
      total: 210000,
      method: "ekspedisi",
      expedition: "SPX Express",
      tracking_no: null,
      payments: 1,
      shipment_status: null,
    })

    // No. pesanan yang sama ditolak.
    await dialog.getByRole("button", { name: "Input pesanan baru" }).click()
    await fillShopeeForm(page, { no, name, date })
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    await expect(
      page.getByText(`No. pesanan ini sudah diinput sebagai ${orderNo}.`).first(),
    ).toBeVisible()

    // Tabel: badge sumber, bisa dicari lewat no. marketplace dan disaring.
    await page.goto(`/pesanan?q=${no}&sumber=shopee`)
    const row = page.getByRole("row", { name: new RegExp(orderNo) })
    await expect(row.getByText("Shopee")).toBeVisible()

    // Dapur memasak seperti biasa.
    await page.goto(`/produksi?tanggal=${date}`)
    await page.getByRole("button", { name: `Mulai masak: ${orderNo}` }).click()
    await page.getByRole("button", { name: `Selesai masak: ${orderNo}` }).click()
    await expect(
      page.getByRole("region", { name: /^Selesai masak/ }).getByRole("article", { name: orderNo }),
    ).toBeVisible()

    // Tandai Dikirim terkunci sampai resi diisi.
    await page.goto(`/pengiriman?tanggal=${date}&pesanan=${orderNo}`)
    const panel = page.getByRole("complementary", { name: "Detail Pengiriman" })
    await expect(panel.getByText("Isi nomor resi dulu lewat Isi Resi.")).toBeVisible()
    await expect(panel.getByRole("button", { name: "Tandai Dikirim" })).toBeDisabled()
    await page.screenshot({ path: "test-results/pengiriman-ekspedisi-desktop.png", fullPage: true })
    await panel.getByRole("button", { name: "Isi Resi" }).click()
    const tracking = page.getByRole("dialog", { name: `Resi ${orderNo}` })
    await expect(tracking.getByLabel("Kurir")).toHaveValue("SPX Express")
    await tracking.getByLabel("Nomor resi").fill("SPXID0123456789")
    await tracking.getByRole("button", { name: "Simpan resi" }).click()
    await expect(page.getByText(`Resi ${orderNo} disimpan`)).toBeVisible()
    await expect(page.getByRole("row", { name: new RegExp(orderNo) })).toContainText(
      "Resi SPXID0123456789",
    )

    await panel.getByRole("button", { name: "Tandai Dikirim" }).click()
    await expect(page.getByText(`Status ${orderNo} jadi Dikirim.`)).toBeVisible()
    await expect(page.getByRole("button", { name: "Dalam Perjalanan (1)" })).toBeVisible()
    expect(await readOrder(orderNo)).toMatchObject({
      status: "dikirim",
      shipment_status: "dalam_perjalanan",
      tracking_no: "SPXID0123456789",
    })
  })
})
