import { expect, type Page, test } from "@playwright/test"

import { OLSHOP_TEMPLATE } from "../src/lib/wa-parser/templates"
import { readOrder, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

/** Tanggal kirim jauh ke depan supaya Produksi dan Pengiriman hanya berisi pesanan uji. */
function farDate() {
  const offset = 400 + (Math.floor(Date.now() / 1000) % 200)
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
}

/** Template Olshop 4 baris yang sudah diisi (menu dipilih manual di form). */
function olshopText(values: { marketplace: string; no: string; name: string; date: string }) {
  const [year, month, day] = values.date.split("-")
  return OLSHOP_TEMPLATE.replace(
    "Marketplace: Tokopedia/Shopee",
    `Marketplace: ${values.marketplace}`,
  )
    .replace("Tanggal pengiriman:", `Tanggal pengiriman: ${day}/${month}/${year}`)
    .replace("Nama Penerima:", `Nama Penerima: ${values.name}`)
    .replace("Nomor Invoice:", `Nomor Invoice: ${values.no}`)
}

/** Admin memilih menu manual setelah Isi Otomatis. */
async function pickMenus(page: Page, picks: Record<string, number>) {
  for (const [label, qty] of Object.entries(picks)) {
    await page.getByLabel(`Jumlah ${label}`, { exact: true }).fill(String(qty))
  }
}

const MENU_HINT = /Pilih menu \(biasa atau hampers\) di daftar menu/

/** Tempel template di panel kiri halaman Input Pesanan, lalu Isi Otomatis. */
async function pasteOlshop(page: Page, text: string) {
  await page.getByRole("textbox", { name: /^Template / }).fill(text)
  await page.getByRole("button", { name: "Isi Otomatis" }).click()
}

test.describe("Input Pesanan marketplace", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const saved: string[] = []
  test.afterEach(async () => {
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  test("modal navbar: tempel template Olshop, sumber dan isian terbaca", async ({ page }, info) => {
    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    await page.getByRole("button", { name: "Input Pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: "Input Pesanan" })
    await expect(dialog.getByLabel("Pesan WhatsApp")).toBeVisible()
    await dialog.getByRole("radio", { name: "Shopee" }).click()
    // Template menyebut Tokopedia, jadi sumbernya ikut template walau tab Shopee yang dipilih.
    const text = olshopText({
      marketplace: "Tokopedia",
      no: "INV/QA/1",
      name: "QA Penerima",
      date: farDate(),
    })
    await dialog.getByLabel("Template Shopee").fill(text)
    await dialog.getByRole("button", { name: "Isi Otomatis" }).click()
    await expect(page).toHaveURL(/\/pesanan\/baru\?sumber=tokopedia$/)
    await expect(page.getByRole("radio", { name: "Tokopedia" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByLabel("Nomor invoice")).toHaveValue("INV/QA/1")
    await expect(page.getByLabel("Nama penerima")).toHaveValue("QA Penerima")
    await expect(page.getByText(MENU_HINT)).toBeVisible()
    await pickMenus(page, { "Choco Bon Bon": 1 })
    // Template Olshop tanpa no. HP dan alamat.
    await expect(page.getByLabel("No. telp")).toHaveCount(0)
    await expect(page.getByLabel("Alamat lengkap")).toHaveCount(0)
    await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()
    await page.screenshot({
      path: `test-results/input-marketplace-${info.project.name}.png`,
      fullPage: true,
    })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
  })

  test("Shopee: template, simpan Lunas, tolak input ganda, tanpa kurir/resi, Dikirim = Selesai", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const stamp = Date.now()
    const no = `QA-SHP-${stamp}`
    const name = `QA Customer ${stamp}`
    const date = farDate()
    const text = olshopText({ marketplace: "Shopee", no, name, date })

    await loginAs(page, admin.email!, admin.password!, "/pesanan/baru?sumber=shopee")
    // Olshop tidak meminta kurir atau resi.
    await expect(page.getByLabel("Kurir")).toHaveCount(0)
    await expect(page.getByLabel("Nomor resi")).toHaveCount(0)
    await pasteOlshop(page, text)
    await expect(page.getByText(MENU_HINT)).toBeVisible()
    await expect(page.getByText(/^Terbaca 3 dari 3 isian wajib\./)).toBeVisible()
    await pickMenus(page, { "Choco Bon Bon": 1 })
    await expect(page.getByLabel("Nomor invoice")).toHaveValue(no)
    // Total kosong = harga menu; diisi = total marketplace (voucher/diskon).
    await expect(page.getByLabel("Total pembayaran")).toHaveValue("")
    await page.getByLabel("Total pembayaran").fill("210000")
    await expect(page.getByTestId("order-total")).toHaveText("Rp 210.000")
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
    await expect(dialog.getByText("sudah Lunas via Shopee")).toBeVisible()
    const orderNo = await dialog.getByTestId("saved-order-no").innerText()
    saved.push(orderNo)
    expect(await readOrder(orderNo)).toMatchObject({
      channel: "shopee",
      marketplace_order_no: no,
      order_name: name,
      total: 210000,
      method: "ekspedisi",
      expedition: null,
      tracking_no: null,
      raw_wa_text: text,
      items: 1,
      payments: 1,
      shipment_status: null,
    })

    // Nomor invoice yang sama ditolak.
    await page.goto("/pesanan/baru?sumber=shopee")
    await pasteOlshop(page, text)
    await pickMenus(page, { "Choco Bon Bon": 1 })
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

    // Packing Normal dulu di menu Packaging (stok tidak dicatat), baru bisa dikirim.
    await page.goto(`/packaging?tanggal=${date}`)
    await page.getByRole("button", { name: `Selesai packing: ${orderNo}` }).click()
    const packing = page.getByRole("dialog", { name: `Packing ${orderNo}` })
    await packing.getByRole("button", { name: "Simpan & selesai packing" }).click()
    await expect(
      page
        .getByRole("region", { name: /^Selesai packing/ })
        .getByRole("article", { name: orderNo }),
    ).toBeVisible()

    // Pengiriman olshop: langsung bisa Tandai Dikirim, tanpa resi, kurir, atau link lacak.
    await page.goto(`/pengiriman?tanggal=${date}&pesanan=${orderNo}`)
    const panel = page.getByRole("complementary", { name: "Detail Pengiriman" })
    await expect(panel.getByRole("button", { name: "Tandai Dikirim" })).toBeEnabled()
    await expect(panel.getByRole("button", { name: /Resi/ })).toHaveCount(0)
    await expect(panel.getByRole("button", { name: /Kurir/ })).toHaveCount(0)
    const shipmentRow = page.getByRole("row", { name: new RegExp(orderNo) })
    await expect(shipmentRow.getByRole("button", { name: /link lacak/i })).toHaveCount(0)
    await shipmentRow.getByRole("button", { name: `Aksi untuk ${orderNo}` }).click()
    await expect(page.getByRole("menuitem", { name: /link lacak|resi/i })).toHaveCount(0)
    await page.keyboard.press("Escape")
    await page.screenshot({ path: "test-results/pengiriman-ekspedisi-desktop.png", fullPage: true })

    // Sudah dikirim = selesai untuk olshop.
    await panel.getByRole("button", { name: "Tandai Dikirim" }).click()
    await expect(page.getByText(`Status ${orderNo} jadi Selesai.`)).toBeVisible()
    await expect(page.getByRole("button", { name: "Selesai (1)" })).toBeVisible()
    expect(await readOrder(orderNo)).toMatchObject({
      status: "selesai",
      shipment_status: "selesai",
      tracking_no: null,
      tracking_url: null,
    })
  })

  test("Tokopedia: menu dipilih manual, tipe mengikuti menu (Normal & Hampers)", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const stamp = Date.now()
    const no = `QA-TKP-${stamp}`
    const text = olshopText({
      marketplace: "Tokopedia",
      no,
      name: `QA Customer ${stamp}`,
      date: farDate(),
    })
    await loginAs(page, admin.email!, admin.password!, "/pesanan/baru?sumber=tokopedia")
    await pasteOlshop(page, text)
    await expect(page.getByText(MENU_HINT)).toBeVisible()
    await pickMenus(page, { "Classico Red Large": 1, "Choco Bon Bon": 1 })
    await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
    const orderNo = await dialog.getByTestId("saved-order-no").innerText()
    saved.push(orderNo)
    expect(await readOrder(orderNo)).toMatchObject({
      channel: "tokopedia",
      marketplace_order_no: no,
      type: "normal_hampers",
      items: 2,
      payments: 1,
    })
  })
})
