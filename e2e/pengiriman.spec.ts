import { expect, type Page, test } from "@playwright/test"

import { HADIAH_SAMPLE, PERSONAL_SAMPLE } from "../src/lib/wa-parser/templates"
import { readOrder, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, target: string) {
  await loginAs(page, admin.email!, admin.password!, target)
}

const randomPhone = () => `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`

/** Tanggal kirim uji jauh ke depan supaya pesanan asli tidak ikut dihitung. */
function testDate() {
  const date = new Date(Date.now() + (320 + (Math.floor(Date.now() / 1000) % 100)) * 86_400_000)
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

test.describe("Pengiriman", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const saved: string[] = []
  test.afterEach(async () => {
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  test("belum siap, atur kurir & slot, kirim, selesai, pick up, tab & filter", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const stamp = Date.now()
    const date = testDate()
    const personal = (name: string, method: string) =>
      PERSONAL_SAMPLE.replace("Siti Nurhaliza", name)
        .replace("0812-3456-7890", randomPhone())
        .replace("Sabtu, 25 Oktober 2026", date.wa)
        .replace("- Instant", `- ${method}`)

    await login(page, "/pesanan")
    await expect(page.getByRole("heading", { name: "Daftar Pesanan" })).toBeVisible()
    const instant = await saveOrder(page, personal(`QA Customer ${stamp} I`, "Instant"))
    saved.push(instant)
    const kurir = await saveOrder(
      page,
      HADIAH_SAMPLE.replace("Alya Putri", `QA Customer ${stamp} K`)
        .replace("+62 813 2345 6789", randomPhone())
        .replace("Tanggal kirim: 28/10", `Tanggal kirim: ${date.wa}`),
    )
    saved.push(kurir)
    const pickUp = await saveOrder(page, personal(`QA Customer ${stamp} P`, "Pick Up"))
    saved.push(pickUp)

    const list = `/pengiriman?tanggal=${date.iso}`
    await page.goto(list)
    await expect(page.getByRole("button", { name: "Semua (3)" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Perlu Dikirim (3)" })).toBeVisible()
    const rows = page.getByRole("table").getByRole("row")
    await expect(rows.filter({ hasText: "Belum siap" })).toHaveCount(3)

    // Belum dimasak: belum bisa dikirim.
    await page.goto(`${list}&pesanan=${instant}`)
    const panel = page.getByRole("complementary", { name: "Detail Pengiriman" })
    await expect(
      panel.getByText("Pesanan belum selesai dimasak (lihat menu Produksi)."),
    ).toBeVisible()
    await expect(panel.getByRole("button", { name: "Tandai Dikirim" })).toBeDisabled()
    await expect(panel.getByRole("link", { name: "Lihat Rute di Maps" })).toHaveAttribute(
      "href",
      /google\.com\/maps/,
    )

    // Masak ketiganya lewat Produksi.
    await page.goto(`/produksi?tanggal=${date.iso}`)
    for (const orderNo of [instant, kurir, pickUp]) {
      await page.getByRole("button", { name: `Mulai masak: ${orderNo}` }).click()
      await page.getByRole("button", { name: `Selesai masak: ${orderNo}` }).click()
      await expect(
        page
          .getByRole("region", { name: /^Selesai masak/ })
          .getByRole("article", { name: orderNo }),
      ).toBeVisible()
    }

    // Instant: Menunggu Kurir → Dikirim → Selesai.
    await page.goto(`${list}&pesanan=${instant}`)
    await expect(panel.getByText("Menunggu Kurir")).toBeVisible()
    await page.screenshot({ path: "test-results/pengiriman-desktop.png", fullPage: true })
    await panel.getByRole("button", { name: "Tandai Dikirim" }).click()
    await expect(page.getByText(`Status ${instant} jadi Dikirim.`)).toBeVisible()
    await expect(page.getByRole("button", { name: "Dalam Perjalanan (1)" })).toBeVisible()
    await panel.getByRole("button", { name: "Tandai Selesai" }).click()
    await expect(page.getByText(`Status ${instant} jadi Selesai.`)).toBeVisible()
    expect(await readOrder(instant)).toMatchObject({
      status: "selesai",
      shipment_status: "selesai",
    })

    // Kurir Internal: wajib pilih kurir + slot dulu.
    await page.goto(`${list}&pesanan=${kurir}`)
    await expect(panel.getByText("Pilih kurir dulu lewat Ubah Kurir / Jadwal.")).toBeVisible()
    await panel.getByRole("button", { name: "Ubah Kurir / Jadwal" }).click()
    const dialog = page.getByRole("dialog", { name: `Kurir & jadwal ${kurir}` })
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(dialog.getByText("Pilih kurir.")).toBeVisible()
    await dialog.getByRole("radio", { name: "Andi" }).check()
    await dialog.getByRole("radio", { name: "09:00 - 12:00" }).check()
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText(`${kurir} diantar Andi, jam 09:00 - 12:00.`)).toBeVisible()
    const kurirRow = rows.filter({ hasText: kurir })
    await expect(kurirRow.getByText("Andi")).toBeVisible()
    await expect(kurirRow.getByText("09:00 - 12:00")).toBeVisible()
    await panel.getByRole("button", { name: "Tandai Dikirim" }).click()
    await expect(kurirRow.getByText("Dalam Perjalanan")).toBeVisible()
    expect(await readOrder(kurir)).toMatchObject({
      status: "dikirim",
      shipment_status: "dalam_perjalanan",
    })

    // Pick Up: Siap Diambil → Sudah Diambil = Selesai.
    await page.goto(`${list}&pesanan=${pickUp}`)
    await expect(panel.getByText("Siap Diambil")).toBeVisible()
    await panel.getByRole("button", { name: "Sudah Diambil" }).click()
    await expect(page.getByText(`Status ${pickUp} jadi Selesai.`)).toBeVisible()

    // Tab dan filter.
    await page.goto(list)
    await expect(page.getByRole("button", { name: "Selesai (2)" })).toBeVisible()
    await page.getByRole("button", { name: "Selesai (2)" }).click()
    await expect(page).toHaveURL(/tab=selesai/)
    await expect(rows).toHaveCount(3) // header + 2
    await page.getByRole("combobox", { name: "Semua Metode" }).click()
    await page.getByRole("option", { name: "Pick Up" }).click()
    await expect(rows).toHaveCount(2) // header + 1
    await expect(rows.nth(1)).toContainText(pickUp)
  })
})
