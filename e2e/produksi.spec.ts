import { expect, type Page, test } from "@playwright/test"

import { HADIAH_SAMPLE, PERSONAL_SAMPLE } from "../src/lib/wa-parser/templates"
import {
  markQaOrderPaid,
  readOrder,
  removeOrderByNo,
  removeQaOrders,
  seedQaOrders,
} from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const produksiEmail = process.env.E2E_PRODUKSI_EMAIL

async function login(page: Page, email: string, target: string) {
  await loginAs(page, email, admin.password!, target)
}

const randomPhone = () => `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`

/**
 * Tanggal kirim uji jauh ke depan (±200 hari), supaya pesanan asli tidak ikut di rekap.
 * Ditambah detik saat ini supaya dua run berurutan tidak memakai tanggal yang sama.
 */
function testDate() {
  const date = new Date(Date.now() + (200 + (Math.floor(Date.now() / 1000) % 100)) * 86_400_000)
  const pad = (value: number) => String(value).padStart(2, "0")
  return {
    iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    wa: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
  }
}

async function saveOrder(page: Page, text: string) {
  await page.goto("/pesanan/baru")
  await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(text)
  await page.getByRole("button", { name: "Isi Otomatis" }).click()
  await page.getByRole("button", { name: "Simpan pesanan" }).click()
  const dialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
  const orderNo = await dialog.getByTestId("saved-order-no").innerText()
  await dialog.getByRole("button", { name: "Input pesanan baru" }).click()
  return orderNo
}

test.describe("Produksi", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const saved: string[] = []
  test.afterEach(async () => {
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  test("rekap per menu dan papan dapur per tanggal kirim", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    // Input dua pesanan lewat form lalu alur dapur; lebih lama dari batas 30 detik.
    test.setTimeout(90_000)
    const stamp = Date.now()
    const date = testDate()
    await login(page, admin.email!, "/pesanan")
    await expect(page.getByRole("heading", { name: "Daftar Pesanan" })).toBeVisible()

    // Personal: 2 Bolognese L, 1 Lasagna L, 1 Mac R, 2 Choco (6 porsi). Hadiah: Melt L + Bundle.
    const personal = await saveOrder(
      page,
      PERSONAL_SAMPLE.replace("Siti Nurhaliza", `QA Customer ${stamp} P`)
        .replace("0812-3456-7890", randomPhone())
        .replace("Sabtu, 25 Oktober 2026", date.wa),
    )
    saved.push(personal)
    const hadiah = await saveOrder(
      page,
      HADIAH_SAMPLE.replace("Alya Putri", `QA Customer ${stamp} H`)
        .replace("+62 813 2345 6789", randomPhone())
        .replace("Tanggal kirim: 28/10", `Tanggal kirim: ${date.wa}`),
    )
    saved.push(hadiah)

    // Belum lunas: belum masuk antrean masak.
    await page.goto(`/produksi?tanggal=${date.iso}`)
    await expect(
      page.getByText(/2 pesanan untuk .* belum dibayar, jadi belum masuk antrean masak/),
    ).toBeVisible()
    await expect(page.getByRole("article", { name: personal })).toHaveCount(0)

    await markQaOrderPaid(personal)
    await markQaOrderPaid(hadiah)
    await page.reload()
    await expect(page.getByText(/belum dibayar, jadi belum masuk antrean masak/)).toHaveCount(0)
    await expect(page.getByText("Total Porsi")).toBeVisible()
    await expect(page.getByText("0 / 8")).toBeVisible()
    const bolo = page.getByRole("article", { name: "Spaghetti Classico Bologna Brulee" })
    await expect(bolo.getByText("Large")).toBeVisible()
    await expect(bolo.getByText("0 / 2 selesai")).toBeVisible()

    const belum = page.getByRole("region", { name: /^Belum mulai/ })
    const proses = page.getByRole("region", { name: /^Sedang dimasak/ })
    const selesai = page.getByRole("region", { name: /^Selesai masak/ })
    await expect(belum.getByRole("article")).toHaveCount(2)
    await expect(
      belum.getByRole("article", { name: hadiah }).getByText("Hampers", { exact: true }),
    ).toBeVisible()
    await expect(
      belum.getByRole("article", { name: personal }).getByText("Sausnya dipisah ya kak"),
    ).toBeVisible()
    await page.screenshot({ path: "test-results/produksi-desktop.png", fullPage: true })

    await page.getByRole("button", { name: `Mulai masak: ${personal}` }).click()
    await expect(proses.getByRole("article", { name: personal })).toBeVisible()
    await page.getByRole("button", { name: `Selesai masak: ${personal}` }).click()
    await expect(selesai.getByRole("article", { name: personal })).toBeVisible()
    await expect(page.getByText("6 / 8")).toBeVisible()
    await expect(bolo.getByText("2 / 2 selesai")).toBeVisible()
    // Selesai masak = Siap Packing; belum masuk Pengiriman sampai selesai packing.
    expect(await readOrder(personal)).toMatchObject({
      status: "siap_packing",
      shipment_status: null,
    })

    await page.getByRole("button", { name: `Masak lagi: ${personal}` }).click()
    await expect(proses.getByRole("article", { name: personal })).toBeVisible()
    expect((await readOrder(personal))?.status).toBe("diproses")
  })

  test("Pilih semua, Mulai/Selesai masak massal, dan filter Jenis", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const code = `${Date.now()}`
    const [first, second, third] = ["01", "02", "03"].map((n) => `QA${code}${n}`)
    const date = new Date(Date.now() + (900 + (Number(code) % 200)) * 86_400_000)
      .toISOString()
      .slice(0, 10)
    await seedQaOrders(code, 3, 0, {
      deliveryDate: date,
      plan: [
        { status: "baru", method: "instant", paid: true, kind: "po" },
        { status: "baru", method: "instant", paid: true, kind: "ready_stock" },
        { status: "diproses", method: "instant", paid: true, kind: "po" },
      ],
    })
    try {
      await login(page, admin.email!, `/produksi?tanggal=${date}`)
      const proses = page.getByRole("region", { name: /^Sedang dimasak/ })
      const selesai = page.getByRole("region", { name: /^Selesai masak/ })
      const bar = page.getByRole("region", { name: "Aksi untuk pesanan terpilih" })

      // Pilih semua: Mulai masak hanya untuk yang Belum mulai (2 dari 3).
      await page.getByRole("checkbox", { name: "Pilih semua (3)" }).check()
      await expect(bar).toContainText("3 pesanan dipilih")
      await page.screenshot({ path: "test-results/produksi-pilih-semua.png", fullPage: true })
      await bar.getByRole("button", { name: "Mulai masak (2)" }).click()
      await expect(page.getByText("2 pesanan mulai dimasak.")).toBeVisible()
      await expect(proses.getByRole("article")).toHaveCount(3)
      await expect(bar).toHaveCount(0)
      expect((await readOrder(first))?.status).toBe("diproses")
      expect((await readOrder(second))?.status).toBe("diproses")

      // Pilih satu kolom, lalu Selesai masak.
      await proses.getByRole("checkbox", { name: "Sedang dimasak" }).check()
      await bar.getByRole("button", { name: "Selesai masak" }).click()
      await expect(page.getByText("3 pesanan selesai dimasak.")).toBeVisible()
      await expect(selesai.getByRole("article")).toHaveCount(3)
      expect((await readOrder(third))?.status).toBe("siap_packing")

      // Filter Jenis: RS hanya pesanan Ready Stock; rekap ikut.
      const jenis = page.getByRole("group", { name: "Jenis" })
      await jenis.getByRole("button", { name: "RS" }).click()
      await expect(page).toHaveURL(/jenis=ready_stock/)
      await expect(page.getByRole("article", { name: second })).toBeVisible()
      await expect(page.getByRole("article", { name: first })).toHaveCount(0)
      await jenis.getByRole("button", { name: "MTO" }).click()
      await expect(page.getByText(/Tidak ada pesanan Made to Order yang dikirim/)).toBeVisible()
    } finally {
      await removeQaOrders(code)
    }
  })

  test("Produksi bisa menandai masak tapi tidak membuka Daftar Pesanan; Kasir tidak bisa Produksi", async ({
    page,
    browser,
  }, info) => {
    test.skip(
      !produksiEmail || !kasirEmail || info.project.name !== "desktop",
      "butuh E2E_PRODUKSI_EMAIL dan E2E_KASIR_EMAIL, desktop saja",
    )
    await login(page, produksiEmail!, "/produksi")
    await expect(page.getByRole("heading", { name: "Produksi", level: 1 })).toBeVisible()
    await page.goto("/pesanan")
    await expectAccessDenied(page)

    const kasir = await browser.newPage()
    await login(kasir, kasirEmail!, "/produksi")
    await expectAccessDenied(kasir)
    await kasir.close()
  })
})
