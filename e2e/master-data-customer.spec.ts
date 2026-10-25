import { expect, type Page, test } from "@playwright/test"

import { removeCustomerByName, snapshotStoreSettings } from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

async function login(page: Page, email: string, password: string, target: string) {
  await page.goto(target)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Kata sandi", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Masuk" }).click()
}

/** No. HP acak 0899 + 8 digit, supaya tidak bentrok dengan customer asli. */
function randomPhone() {
  return `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`
}

test.describe("Master Data › Customer", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const created: string[] = []
  test.afterEach(async () => {
    for (const name of created.splice(0)) await removeCustomerByName(name)
  })

  test("tambah, no. HP kembar, cari lewat no. HP, lalu ubah", async ({ page }, info) => {
    const stamp = Date.now()
    const name = `QA Customer ${stamp} ${info.project.name}`
    const other = `QA Customer ${stamp} B ${info.project.name}`
    created.push(name, other)
    const phone = randomPhone()
    await login(page, admin.email!, admin.password!, "/master-data/customer")
    // Di ponsel, chip bagian aktif harus tergulir ke dalam layar.
    await expect(
      page
        .getByRole("navigation", { name: "Bagian Master Data" })
        .getByRole("link", { name: "Customer" }),
    ).toBeInViewport()

    await page.getByRole("button", { name: "Tambah Customer" }).click()
    let dialog = page.getByRole("dialog", { name: "Tambah customer" })
    await dialog.getByLabel("Nama customer").fill(name)
    await dialog.getByLabel("No. HP").fill(`+62 ${phone.slice(1)}`)
    await dialog.getByRole("button", { name: "Tambah customer" }).click()
    await expect(page.getByText("Customer ditambahkan.")).toBeVisible()

    await page.getByRole("button", { name: "Tambah Customer" }).click()
    dialog = page.getByRole("dialog", { name: "Tambah customer" })
    await dialog.getByLabel("Nama customer").fill(other)
    await dialog.getByLabel("No. HP").fill(phone)
    await dialog.getByRole("button", { name: "Tambah customer" }).click()
    await expect(dialog.getByText(`No. HP ini sudah tercatat atas nama ${name}.`)).toBeVisible()
    await expect(dialog.getByLabel("Nama customer")).toHaveValue(other)
    await page.keyboard.press("Escape")

    await page.getByLabel("Cari nama atau no. HP customer").fill(phone.slice(-6))
    await expect(page).toHaveURL(new RegExp(`q=${phone.slice(-6)}`))
    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByText(phone.replace(/(\d{4})(?=\d)/g, "$1 "))).toBeVisible()
    await expect(row.getByText("Belum ada")).toBeVisible()
    await expect(page.getByText("Menampilkan 1–1 dari 1 customer")).toBeVisible()
    await page.screenshot({
      path: `test-results/customer-${info.project.name}.png`,
      fullPage: true,
    })

    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah customer" })
    await edit.getByLabel(/Alamat/).fill("Jl. QA No. 1, Bandung")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Data customer disimpan.")).toBeVisible()
    await expect(row.getByText("Jl. QA No. 1, Bandung")).toBeVisible()

    await page.getByLabel("Cari nama atau no. HP customer").fill("tidak-ada-customer-ini")
    await expect(page.getByText("Tidak ada customer yang cocok.")).toBeVisible()
  })

  test("Kasir bisa menambah customer tapi tidak melihat Pengaturan", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    await login(page, kasirEmail!, admin.password!, "/master-data/customer")
    await expect(page.getByRole("button", { name: "Tambah Customer" })).toBeVisible()
    const nav = page.getByRole("navigation", { name: "Bagian Master Data" })
    await expect(nav.getByRole("link", { name: "Customer" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Pengaturan" })).toHaveCount(0)

    await page.goto("/master-data/pengaturan")
    await expectAccessDenied(page)
  })
})

test.describe("Master Data › Pengaturan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  test("simpan profil toko, link Maps divalidasi", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const restore = await snapshotStoreSettings()
    try {
      await login(page, admin.email!, admin.password!, "/master-data/pengaturan")
      const whatsapp = page.getByLabel(/No\. WhatsApp toko/)
      const maps = page.getByLabel(/Link Google Maps/)
      await whatsapp.fill("0812 1111 2222")
      await page.getByLabel(/^Alamat/).fill("Jl. QA Pick Up No. 9, Bandung")
      await maps.fill("maps.google.com/qa")
      await page.getByRole("button", { name: "Simpan pengaturan" }).click()
      await expect(
        page.getByText("Tempel link lengkap dari Google Maps, diawali https://"),
      ).toBeVisible()
      await expect(whatsapp).toHaveValue("0812 1111 2222")

      await maps.fill("https://maps.app.goo.gl/qa123")
      await page.getByRole("button", { name: "Simpan pengaturan" }).click()
      await expect(page.getByText("Pengaturan toko disimpan.")).toBeVisible()
      await expect(page.getByText(/Terakhir diubah .* oleh QA Admin\./)).toBeVisible()
      await page.screenshot({
        path: `test-results/pengaturan-${info.project.name}.png`,
        fullPage: true,
      })

      await page.reload()
      await expect(page.getByLabel(/No\. WhatsApp toko/)).toHaveValue("0812 1111 2222")
      await expect(page.getByRole("link", { name: "Buka link tersimpan" })).toHaveAttribute(
        "href",
        "https://maps.app.goo.gl/qa123",
      )
    } finally {
      await restore()
    }
  })
})
