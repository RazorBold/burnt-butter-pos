import { expect, type Page, test } from "@playwright/test"

import { HADIAH_SAMPLE, PERSONAL_SAMPLE } from "../src/lib/wa-parser/templates"
import { readOrder, removeOrderByNo } from "./helpers/cleanup"
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
  const dialog = page.getByRole("dialog", { name: "Pesanan tersimpan" })
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

    await page.goto(`/produksi?tanggal=${date.iso}`)
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
      belum.getByRole("article", { name: hadiah }).getByText("Hadiah + kartu"),
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
    // Selesai masak = Siap Kirim; Instant langsung Menunggu Kurir di Pengiriman.
    expect(await readOrder(personal)).toMatchObject({
      status: "siap_kirim",
      shipment_status: "menunggu_kurir",
    })

    await page.getByRole("button", { name: `Masak lagi: ${personal}` }).click()
    await expect(proses.getByRole("article", { name: personal })).toBeVisible()
    expect((await readOrder(personal))?.status).toBe("diproses")
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
