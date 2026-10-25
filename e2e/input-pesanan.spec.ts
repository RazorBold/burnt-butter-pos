import { expect, type Page, test } from "@playwright/test"

import { HADIAH_SAMPLE, PERSONAL_SAMPLE, PERSONAL_TEMPLATE } from "../src/lib/wa-parser/templates"
import { readOrder, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, target: string) {
  await loginAs(page, admin.email!, admin.password!, target)
}

test.describe("Input Pesanan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  test("Personal: tempel di modal navbar, Isi Otomatis membuka form yang terisi", async ({
    page,
  }, info) => {
    await login(page, "/dashboard")
    const trigger = page.getByRole("button", { name: "Input Pesanan" })
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: "Input Pesanan" })
    // "besok" supaya tanggal kirim tidak pernah lewat, kapan pun test dijalankan.
    await dialog
      .getByLabel("Pesan WhatsApp")
      .fill(PERSONAL_SAMPLE.replace("Sabtu, 25 Oktober 2026", "besok"))
    await dialog.getByRole("button", { name: "Isi Otomatis" }).click()

    await expect(page).toHaveURL(/\/pesanan\/baru$/)
    await expect(page.getByRole("radio", { name: "Personal" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByLabel("Nama", { exact: true })).toHaveValue("Siti Nurhaliza")
    await expect(page.getByLabel("No. telp")).toHaveValue("081234567890")
    await expect(page.getByLabel(/^Alamat lengkap/)).toHaveValue(
      "Jl. Melati No. 12, RT 03/RW 05\nKel. Sukajadi, Bandung",
    )
    await expect(page.getByRole("radio", { name: /^Instant/ })).toBeChecked()
    await expect(page.getByLabel(/^Request/)).toHaveValue("Sausnya dipisah ya kak")
    await expect(page.getByLabel("Jumlah Spaghetti Classico Bologna Brulee Large")).toHaveValue("2")
    await expect(page.getByLabel("Jumlah Not Your Mac and Cheese Regular")).toHaveValue("1")
    await expect(page.getByLabel("Jumlah Choco Bon Bon")).toHaveValue("2")
    // 2×65.000 + 65.000 + 50.000 + 2×40.000
    await expect(page.getByTestId("order-total")).toHaveText("Rp 325.000")
    await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()
    await expect(page.getByText(/Terbaca 5 dari 5 isian wajib dan 4 menu\./)).toBeVisible()
    await page.screenshot({
      path: `test-results/input-pesanan-form-${info.project.name}.png`,
      fullPage: true,
    })

    // Ubah jumlah lewat tombol: total ikut berubah.
    await page.getByRole("button", { name: "Tambah Choco Bon Bon" }).click()
    await expect(page.getByTestId("order-total")).toHaveText("Rp 365.000")
  })

  test("Hadiah: penerima, pengirim, kartu ucapan, dan Kurir Internal", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    await login(page, "/pesanan/baru")
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(HADIAH_SAMPLE)
    await page.getByRole("button", { name: "Isi Otomatis" }).click()

    await expect(page.getByRole("radio", { name: "Hadiah" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByLabel("Nama penerima")).toHaveValue("Alya Putri")
    await expect(page.getByLabel("Nama pengirim")).toHaveValue("Rizky")
    await expect(page.getByLabel(/^Wishes/)).toHaveValue(
      "Happy birthday sayang!\nSemoga suka pastanya",
    )
    await expect(page.getByRole("radio", { name: /^Kurir Internal/ })).toBeChecked()
    await expect(page.getByLabel("Jumlah Bundle of 3")).toHaveValue("1")
    await expect(page.getByTestId("order-total")).toHaveText("Rp 245.000")
    await page.screenshot({ path: "test-results/input-pesanan-hadiah.png", fullPage: true })
  })

  test("template kosong: isian wajib ditandai, tanda hilang setelah diisi", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "cukup sekali, di desktop")
    await login(page, "/pesanan/baru")
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(PERSONAL_TEMPLATE)
    await page.getByRole("button", { name: "Isi Otomatis" }).click()

    await expect(page.getByText(/Terbaca 0 dari 5 isian wajib dan 0 menu\./)).toBeVisible()
    await expect(page.getByText("Nama wajib diisi.")).toBeVisible()
    await expect(page.getByText("Pilih metode pengiriman.")).toBeVisible()
    await expect(page.getByText("Pilih minimal satu menu.")).toBeVisible()
    await expect(page.getByText(/^Belum lengkap:/)).toContainText(
      "Nama, No. telp, Alamat, Tanggal kirim, Metode pengiriman, Menu",
    )

    await page.getByLabel("Nama", { exact: true }).fill("Dewi")
    await expect(page.getByText("Nama wajib diisi.")).toBeHidden()
    await page.getByRole("radio", { name: /^Pick Up/ }).check()
    // Pick Up tidak butuh alamat.
    await expect(page.getByText(/^Belum lengkap:/)).not.toContainText("Alamat")
    await expect(page.getByRole("button", { name: "Simpan pesanan" })).toBeDisabled()

    await page.getByRole("button", { name: "Reset" }).click()
    await expect(page.getByRole("textbox", { name: "Pesan WhatsApp" })).toHaveValue("")
    await expect(page.getByLabel("Nama", { exact: true })).toHaveValue("")
  })
})

/** No. HP acak 0899 + 8 digit, supaya tidak bentrok dengan customer asli. */
function randomPhone() {
  return `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`
}

test.describe("Input Pesanan › Simpan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const saved: string[] = []
  test.afterEach(async () => {
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  async function saveFrom(page: Page, text: string) {
    await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(text)
    await page.getByRole("button", { name: "Isi Otomatis" }).click()
    await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()
    await page.getByRole("button", { name: "Simpan pesanan" }).click()
    const dialog = page.getByRole("dialog", { name: "Pesanan tersimpan" })
    await expect(dialog).toBeVisible()
    const orderNo = await dialog.getByTestId("saved-order-no").innerText()
    saved.push(orderNo)
    expect(orderNo).toMatch(/^BB\d{6}\d{3,}$/)
    return { dialog, orderNo }
  }

  test("Personal tersimpan: nomor otomatis, customer baru, item, pengiriman, log", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Customer ${Date.now()}`
    const phone = randomPhone()
    await login(page, "/pesanan/baru")
    const { dialog, orderNo } = await saveFrom(
      page,
      PERSONAL_SAMPLE.replace("Siti Nurhaliza", name)
        .replace("0812-3456-7890", phone)
        .replace("Sabtu, 25 Oktober 2026", "besok"),
    )
    await expect(dialog.getByText(name)).toBeVisible()
    await expect(dialog.getByText("Rp 325.000")).toBeVisible()

    const order = await readOrder(orderNo)
    expect(order).toMatchObject({
      type: "personal",
      status: "baru",
      total: 325000,
      customer: name,
      sender_name: null,
      method: "instant",
      shipment_status: null,
      items: 4,
      logs: 1,
    })
    expect(order?.raw_wa_text).toContain(`Nama Lengkap: ${name}`)

    // Form dikosongkan supaya pesanan yang sama tidak tersimpan dua kali.
    await dialog.getByRole("button", { name: "Input pesanan baru" }).click()
    await expect(page.getByLabel("Nama", { exact: true })).toHaveValue("")
    await expect(page.getByRole("textbox", { name: "Pesan WhatsApp" })).toHaveValue("")

    // Ringkasan customer ikut terisi.
    await page.goto(`/master-data/customer?q=${phone}`)
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByRole("cell", { name: "Rp 325.000" })).toBeVisible()
    await expect(row.getByRole("cell", { name: "1", exact: true })).toBeVisible()
  })

  test("Hadiah Pick Up tersimpan: pengirim, kartu ucapan, status kirim kosong", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const name = `QA Customer ${Date.now()} Hadiah`
    await login(page, "/pesanan/baru")
    const text = HADIAH_SAMPLE.replace("Alya Putri", name)
      .replace("+62 813 2345 6789", randomPhone())
      .replace("Tanggal kirim: 28/10", "Tanggal kirim: besok")
      .replace("- Pick Up", "- Pick Up ✅")
      .replace(" mengikuti rute kurir) ✅", " mengikuti rute kurir)")
    const { orderNo } = await saveFrom(page, text)

    expect(await readOrder(orderNo)).toMatchObject({
      type: "hadiah",
      customer: name,
      sender_name: "Rizky",
      card_wishes: "Happy birthday sayang!\nSemoga suka pastanya",
      method: "pick_up",
      shipment_status: null,
      total: 245000,
      items: 2,
    })
  })
})
