import { readFile } from "node:fs/promises"

import { expect, type Page, test } from "@playwright/test"

import { readOrder, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, target: string) {
  await loginAs(page, admin.email!, admin.password!, target)
}

const bar = (page: Page) => page.getByRole("region", { name: "Aksi untuk pesanan terpilih" })
const pick = (page: Page, orderNo: string) =>
  page.getByRole("checkbox", { name: `Pilih ${orderNo}` }).check()

/** Tanggal kirim jauh ke depan supaya tabel Pengiriman hanya berisi pesanan uji. */
function farDate(code: string) {
  const date = new Date(Date.now() + (400 + (Number(code) % 200)) * 86_400_000)
  return date.toISOString().slice(0, 10)
}

test.describe("Aksi massal", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("Pesanan: ubah status, tandai lunas, batalkan, unduh CSV, menu ⋮", async ({
    page,
  }, info) => {
    code = `${Date.now()}`
    const no = (n: number) => `QA${code}${String(n).padStart(2, "0")}`
    await seedQaOrders(code, 6, 0, {
      plan: [
        { status: "baru", method: "kurir_internal", paid: true },
        { status: "baru", method: "instant", paid: true },
        { status: "diproses", method: "pick_up" },
        { status: "siap_kirim", method: "kurir_internal" },
        { status: "selesai", method: "instant" },
        { status: "dibatalkan", method: "instant" },
      ],
    })
    await login(page, `/pesanan?q=${code}`)
    await expect(page.getByText("Menampilkan 1–6 dari 6 pesanan")).toBeVisible()
    await expect(bar(page)).toBeHidden()

    await pick(page, no(1))
    await pick(page, no(2))
    await expect(bar(page)).toContainText("2 pesanan dipilih")
    // Mencentang tidak membuka panel detail.
    await expect(page).not.toHaveURL(/pesanan=/)
    await page.screenshot({
      path: `test-results/aksi-massal-pesanan-${info.project.name}.png`,
      fullPage: true,
    })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")

    // Ubah status: Baru → Diproses untuk dua pesanan.
    await bar(page).getByRole("button", { name: "Ubah status" }).click()
    const toDiproses = page.getByRole("menuitem", { name: /Diproses/ })
    await expect(toDiproses).toContainText("2 pesanan")
    await expect(page.getByRole("menuitem", { name: /Selesai/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    await toDiproses.click()
    await expect(page.getByText("2 pesanan jadi Diproses.")).toBeVisible()
    await expect(bar(page)).toBeHidden()
    expect(await readOrder(no(1))).toMatchObject({ status: "diproses", logs: 1 })
    expect(await readOrder(no(2))).toMatchObject({ status: "diproses", logs: 1 })

    // Pilih semua: hanya pesanan yang memenuhi syarat yang dihitung.
    await page.getByRole("checkbox", { name: "Pilih semua pesanan di halaman ini" }).check()
    await expect(bar(page)).toContainText("6 pesanan dipilih")
    await bar(page).getByRole("button", { name: "Ubah status" }).click()
    await expect(page.getByRole("menuitem", { name: /Siap Packing/ })).toContainText("4 dari 6")
    // Siap Kirim hanya lewat menu Packaging.
    await expect(page.getByRole("menuitem", { name: /Siap Kirim/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    await page.keyboard.press("Escape")

    // Tandai lunas: yang sudah lunas (1, 2) dan dibatalkan tidak ikut.
    await bar(page).getByRole("button", { name: "Tandai lunas (3)" }).click()
    const paidDialog = page.getByRole("dialog", { name: "Tandai 3 pesanan lunas" })
    await paidDialog.getByRole("button", { name: "Tandai 3 lunas" }).click()
    await expect(paidDialog.getByText("Pilih dibayar lewat apa.")).toBeVisible()
    await paidDialog.getByRole("radio").first().check()
    await paidDialog.getByRole("button", { name: "Tandai 3 lunas" }).click()
    await expect(page.getByText(/^3 pesanan lunas via /)).toBeVisible()
    expect(await readOrder(no(3))).toMatchObject({ payments: 1 })
    expect(await readOrder(no(6))).toMatchObject({ payments: 0 })

    // Batalkan: yang sudah Selesai tidak ikut.
    await pick(page, no(1))
    await pick(page, no(4))
    await pick(page, no(5))
    await bar(page).getByRole("button", { name: "Batalkan (2)" }).click()
    const cancelDialog = page.getByRole("dialog", { name: "Batalkan 2 pesanan?" })
    await expect(cancelDialog).toContainText(`${no(1)}, ${no(4)}`)
    await cancelDialog.getByRole("button", { name: "Batalkan 2 pesanan" }).click()
    await expect(page.getByText("2 pesanan dibatalkan.")).toBeVisible()
    expect(await readOrder(no(4))).toMatchObject({ status: "dibatalkan", shipment_status: null })
    expect(await readOrder(no(5))).toMatchObject({ status: "selesai" })

    // Unduh CSV semua pesanan terpilih.
    await page.getByRole("checkbox", { name: "Pilih semua pesanan di halaman ini" }).check()
    const downloadPromise = page.waitForEvent("download")
    await bar(page).getByRole("button", { name: "Unduh CSV" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^pesanan-\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = await readFile((await download.path())!, "utf-8")
    const lines = csv.replace(/^﻿/, "").trimEnd().split("\r\n")
    expect(lines[0]).toMatch(/^No\. Pesanan,Dibuat \(WIB\),Tipe,Nama Customer/)
    expect(lines).toHaveLength(7)
    expect(lines[1]).toContain(`${no(1)},`)
    expect(lines[1]).toContain(",Dibatalkan,Lunas,")
    expect(lines[6]).toContain(",Dibatalkan,Belum bayar,")
    await expect(page.getByText("6 pesanan diunduh sebagai CSV.")).toBeVisible()
    await bar(page).getByRole("button", { name: "Batal pilih" }).click()
    await expect(bar(page)).toBeHidden()

    // Aksi yang tidak berlaku tetap bisa diklik dan menjelaskan alasannya.
    await pick(page, no(6))
    const payButton = bar(page).getByRole("button", { name: "Tandai lunas" })
    await expect(payButton).toHaveAttribute("aria-disabled", "true")
    // Playwright menganggap aria-disabled tidak bisa diklik; pakai keyboard (Tab lalu Enter).
    await payButton.press("Enter")
    await expect(page.getByText("Pesanan terpilih sudah lunas atau dibatalkan.")).toBeVisible()
    await expect(page.getByRole("dialog")).toBeHidden()
    await bar(page).getByRole("button", { name: "Batal pilih" }).click()

    // Menu ⋮ satu baris, tanpa membuka panel detail.
    await page.getByRole("button", { name: `Aksi untuk ${no(2)}` }).click()
    await page.getByRole("menuitem", { name: "Jadikan Siap Packing" }).click()
    await expect(page.getByText(`Status ${no(2)} jadi Siap Packing.`)).toBeVisible()
    await expect(page).not.toHaveURL(/pesanan=/)
    expect(await readOrder(no(2))).toMatchObject({
      status: "siap_packing",
      shipment_status: null,
    })
  })

  test("Pengiriman: atur kurir & jadwal, tandai dikirim, menu ⋮", async ({ page }, info) => {
    code = `${Date.now()}`
    const no = (n: number) => `QA${code}${String(n).padStart(2, "0")}`
    const date = farDate(code)
    await seedQaOrders(code, 5, 0, {
      deliveryDate: date,
      plan: [
        { status: "siap_kirim", method: "kurir_internal" },
        { status: "siap_kirim", method: "kurir_internal" },
        { status: "siap_kirim", method: "instant" },
        { status: "siap_kirim", method: "pick_up" },
        { status: "diproses", method: "kurir_internal" },
      ],
    })
    await login(page, `/pengiriman?tanggal=${date}`)
    await expect(page.getByRole("button", { name: "Semua (5)" })).toBeVisible()

    await page.getByRole("checkbox", { name: "Pilih semua pesanan di halaman ini" }).check()
    await expect(bar(page)).toContainText("5 pesanan dipilih")
    await page.screenshot({
      path: `test-results/aksi-massal-pengiriman-${info.project.name}.png`,
      fullPage: true,
    })
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")

    // Kurir Internal tanpa kurir dan Pick Up belum bisa dikirim.
    await expect(bar(page).getByRole("button", { name: "Tandai dikirim (1)" })).toBeEnabled()
    await bar(page).getByRole("button", { name: "Atur kurir & jadwal (3)" }).click()
    const dialog = page.getByRole("dialog", { name: "Kurir & jadwal 3 pesanan" })
    await dialog.getByRole("radio", { name: "Andi" }).check()
    await dialog.getByRole("radio", { name: "13:00 - 17:00" }).check()
    await dialog.getByRole("button", { name: "Simpan" }).click()
    await expect(page.getByText("3 pesanan diantar Andi, jam 13:00 - 17:00.")).toBeVisible()
    const rows = page.getByRole("table").getByRole("row")
    await expect(rows.filter({ hasText: no(5) }).getByText("Andi")).toBeVisible()

    await page.getByRole("checkbox", { name: "Pilih semua pesanan di halaman ini" }).check()
    await bar(page).getByRole("button", { name: "Tandai dikirim (3)" }).click()
    await expect(page.getByText("3 pesanan ditandai dikirim.")).toBeVisible()
    expect(await readOrder(no(1))).toMatchObject({
      status: "dikirim",
      shipment_status: "dalam_perjalanan",
    })
    expect(await readOrder(no(3))).toMatchObject({ status: "dikirim", shipment_status: "dikirim" })
    expect(await readOrder(no(5))).toMatchObject({ status: "diproses" })
    await expect(page.getByRole("button", { name: "Dalam Perjalanan (3)" })).toBeVisible()

    // Menu ⋮: Pick Up langsung Sudah Diambil.
    await page.getByRole("button", { name: `Aksi untuk ${no(4)}` }).click()
    await page.getByRole("menuitem", { name: "Sudah Diambil" }).click()
    await expect(page.getByText(`Status ${no(4)} jadi Selesai.`)).toBeVisible()
    await expect(page).not.toHaveURL(/pesanan=/)
    expect(await readOrder(no(4))).toMatchObject({ status: "selesai", shipment_status: "selesai" })
  })
})
