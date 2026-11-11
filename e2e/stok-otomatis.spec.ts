import { expect, type Page, test } from "@playwright/test"

import { FO1_TEMPLATE, FO2_TEMPLATE } from "../src/lib/wa-parser/templates"
import { readPackagingStock, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

const STOCK_ITEMS = [
  "Loyang Large",
  "Loyang Regular",
  "Classic Red (Large)",
  "Melted Cheese (Large)",
  "Holy E Olio (Regular)",
] as const

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
    // Nama-nama ini dulu salah dicocokkan ke box Classic Red, Melted Cheese, dan Holy E Olio.
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
    expect(after["Classic Red (Large)"]).toBe(before["Classic Red (Large)"])
    expect(after["Melted Cheese (Large)"]).toBe(before["Melted Cheese (Large)"])
    expect(after["Holy E Olio (Regular)"]).toBe(before["Holy E Olio (Regular)"])
  })

  test("Hampers: memotong loyang dan box sesuai menu", async ({ page }, info) => {
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
    expect(after["Classic Red (Large)"]).toBe(before["Classic Red (Large)"] - 2)
    expect(after["Holy E Olio (Regular)"]).toBe(before["Holy E Olio (Regular)"] - 1)

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
})
