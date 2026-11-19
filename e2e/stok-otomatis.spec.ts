import { expect, type Page, test } from "@playwright/test"

import { FO1_TEMPLATE, FO2_TEMPLATE } from "../src/lib/wa-parser/templates"
import { readPackagingStock, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

const STOCK_ITEMS = ["Loyang Large", "Loyang Regular", "Hampers LARGE", "Hampers REGULER"] as const

async function readStocks() {
  const entries = await Promise.all(
    STOCK_ITEMS.map(async (name) => [name, (await readPackagingStock(name)) ?? 0] as const),
  )
  return Object.fromEntries(entries) as Record<(typeof STOCK_ITEMS)[number], number>
}

function randomPhone() {
  return `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`
}

/** Isi template FO lalu set jumlah menu tertentu (baris "X. Nama :" di bagian ukuran tertentu). */
function fillTemplate(template: string, name: string, picks: [string, string, number][]) {
  let text = template
    .replace("Tanggal Pengiriman:", "Tanggal Pengiriman: besok")
    .replace("Jenis: PO/RS/MTO", "Jenis: PO")
    .replace("Nama Penerima:", `Nama Penerima: ${name}`)
    .replace("No.Telp:", `No.Telp: ${randomPhone()}`)
    .replace("Alamat Lengkap:", "Alamat Lengkap: Jl. QA No. 1, Bandung")
    .replace("- Pick Up\n", "")
    .replace(/- Kurir Internal.*\n/, "")
    .replace(/- Sameday.*\n/, "")
    .replace(/- Instant Prioritas.*\n/, "")
  for (const [section, menu, qty] of picks) {
    const start = text.indexOf(section)
    const line = text.indexOf(menu, start)
    const end = text.indexOf("\n", line)
    const lineEnd = end === -1 ? text.length : end
    text = `${text.slice(0, lineEnd).replace(/:\s*$/, `: ${qty}`)}${text.slice(lineEnd)}`
  }
  return text
}

test.describe("Stok otomatis saat lunas (loyang & box hampers)", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")
  test.describe.configure({ mode: "serial" })

  const saved: string[] = []
  test.afterEach(async () => {
    // Menghapus pesanan uji juga mengembalikan stok loyang/box yang terpotong.
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  async function saveAndPay(page: Page, text: string) {
    await loginAs(page, admin.email!, admin.password!, "/pesanan/baru")
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(text)
    await page.getByRole("button", { name: "Isi Otomatis" }).click()
    await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const savedDialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
    const orderNo = await savedDialog.getByTestId("saved-order-no").innerText()
    saved.push(orderNo)

    await page.goto(`/pembayaran?q=${orderNo}`)
    const row = page.getByRole("row", { name: new RegExp(orderNo) })
    await row.getByRole("button", { name: "Tandai Lunas" }).click()
    const pay = page.getByRole("dialog", { name: `Tandai ${orderNo} lunas` })
    await pay.getByRole("radio").first().check()
    await pay.getByRole("button", { name: "Tandai lunas" }).click()
    await expect(page.getByText(new RegExp(`${orderNo} lunas via`))).toBeVisible()
    return orderNo
  }

  test("Normal: pasta memotong loyang saja, bukan box hampers yang namanya mirip", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(90_000)
    const before = await readStocks()
    // Menu pasta biasa tidak memakai box hampers.
    await saveAndPay(
      page,
      fillTemplate(FO1_TEMPLATE, `QA Customer ${Date.now()} Normal`, [
        ["Size Large", "Spaghetti Classico Bologna Brulee", 1],
        ["Size Large", "Melt My Mac and Cheese", 1],
        ["Size Regular", "Spaghetti Aglio E Olio", 1],
      ]),
    )
    const after = await readStocks()
    expect(after["Loyang Large"]).toBe(before["Loyang Large"] - 2)
    expect(after["Loyang Regular"]).toBe(before["Loyang Regular"] - 1)
    expect(after["Hampers LARGE"]).toBe(before["Hampers LARGE"])
    expect(after["Hampers REGULER"]).toBe(before["Hampers REGULER"])
  })

  test("Hampers: memotong loyang dan box Hampers LARGE/REGULER sesuai ukuran", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(90_000)
    const before = await readStocks()
    const orderNo = await saveAndPay(
      page,
      fillTemplate(FO2_TEMPLATE, `QA Customer ${Date.now()} Hampers`, [
        ["Size Large", "Classico Red", 2],
        ["Size Regular", "Holy E Olio", 1],
      ]),
    )
    const after = await readStocks()
    expect(after["Loyang Large"]).toBe(before["Loyang Large"] - 2)
    expect(after["Loyang Regular"]).toBe(before["Loyang Regular"] - 1)
    expect(after["Hampers LARGE"]).toBe(before["Hampers LARGE"] - 2)
    expect(after["Hampers REGULER"]).toBe(before["Hampers REGULER"] - 1)

    // Pembayaran dibatalkan: stok kembali.
    await page.goto(`/pembayaran?q=${orderNo}`)
    const row = page.getByRole("row", { name: new RegExp(orderNo) })
    await row.getByRole("button", { name: `Aksi lain untuk pembayaran ${orderNo}` }).click()
    await page.getByRole("menuitem", { name: "Jadikan belum bayar" }).click()
    await page
      .getByRole("dialog", { name: `Jadikan ${orderNo} belum bayar?` })
      .getByRole("button", { name: "Jadikan belum bayar" })
      .click()
    await expect(page.getByText(`${orderNo} kembali jadi Belum bayar.`)).toBeVisible()
    const restored = await readStocks()
    expect(restored).toEqual(before)
  })

  test("Dashboard: pesanan belum bayar tampil sebagai pantauan, stok belum dipotong", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(90_000)
    const unpaidOf = async (label: string) => {
      const text = await page.getByTestId(`belum-bayar-${label}`).innerText()
      return Number(/Belum bayar:\s*(\d+)/.exec(text)?.[1] ?? NaN)
    }
    const readAll = async () => ({
      loyangLarge: await unpaidOf("Loyang Large"),
      loyangRegular: await unpaidOf("Loyang Regular"),
      // Kategori stok "Hampers" berisi Hampers LARGE dan Hampers REGULER.
      boxes: await unpaidOf("Hampers"),
    })

    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    const before = await readAll()
    const stockBefore = await readStocks()

    // Pesanan Hampers belum dibayar: 2 Classico Red Large + 1 Holy E Olio Regular.
    await page.goto("/pesanan/baru")
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(
      fillTemplate(FO2_TEMPLATE, `QA Customer ${Date.now()} Pantau`, [
        ["Size Large", "Classico Red", 2],
        ["Size Regular", "Holy E Olio", 1],
      ]),
    )
    await page.getByRole("button", { name: "Isi Otomatis" }).click()
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const savedDialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
    saved.push(await savedDialog.getByTestId("saved-order-no").innerText())

    await page.goto("/dashboard")
    const after = await readAll()
    expect(after.loyangLarge).toBe(before.loyangLarge + 2)
    expect(after.loyangRegular).toBe(before.loyangRegular + 1)
    expect(after.boxes).toBe(before.boxes + 3)
    // Belum dibayar = stok asli belum terpotong.
    expect(await readStocks()).toEqual(stockBefore)
    await page
      .getByRole("region", { name: "Packaging & Loyang" })
      .screenshot({ path: "test-results/dashboard-belum-bayar-desktop.png" })
  })
})
