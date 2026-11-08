import { expect, type Page, test } from "@playwright/test"

import { PERSONAL_SAMPLE } from "../src/lib/wa-parser/templates"
import { markQaOrderPaid, readOrder, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

async function login(page: Page, target: string) {
  await loginAs(page, admin.email!, admin.password!, target)
}

/** Simpan satu pesanan Personal lewat Input Pesanan; kembalikan nomornya. */
async function createOrder(page: Page, name: string) {
  const phone = `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`
  await page.goto("/pesanan/baru")
  await page
    .getByRole("textbox", { name: "Pesan WhatsApp" })
    .fill(
      PERSONAL_SAMPLE.replace("Siti Nurhaliza", name)
        .replace("0812-3456-7890", phone)
        .replace("Sabtu, 25 Oktober 2026", "besok"),
    )
  await page.getByRole("button", { name: "Isi Otomatis" }).click()
  await page.getByRole("button", { name: "Simpan pesanan" }).click()
  const dialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
  const orderNo = await dialog.getByTestId("saved-order-no").innerText()
  await dialog.getByRole("button", { name: "Input pesanan baru" }).click()
  return orderNo
}

test.describe("Detail Pesanan", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let orderNo: string | undefined
  test.afterEach(async () => {
    if (orderNo) await removeOrderByNo(orderNo)
    orderNo = undefined
  })

  test("panel detail, ubah status, edit data, detail lengkap, batal", async ({ page }, info) => {
    const name = `QA Customer ${Date.now()} ${info.project.name}`
    await login(page, "/pesanan")
    // Tunggu login selesai sebelum pindah halaman, supaya sesi sudah tersimpan.
    await expect(page.getByRole("heading", { name: "Daftar Pesanan" })).toBeVisible()
    orderNo = await createOrder(page, name)

    await page.goto(`/pesanan?q=${encodeURIComponent(name)}`)
    await page
      .getByRole("row", { name: new RegExp(orderNo) })
      .getByText(name)
      .click()
    await expect(page).toHaveURL(new RegExp(`pesanan=${orderNo}`))
    const panel = page.getByRole("complementary", { name: "Detail Pesanan" })
    await expect(panel.getByText(orderNo, { exact: true })).toBeVisible()
    await expect(panel.getByText(name)).toBeVisible()
    await expect(panel.getByText("Spaghetti Classico Bologna Brulee (Large)")).toBeVisible()
    await expect(panel.getByText("Rp 325.000")).toBeVisible()
    await page.screenshot({ path: `test-results/detail-pesanan-${info.project.name}.png` })
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    // Alur panjang: status, bayar, ubah menu, edit data, detail lengkap, batal.
    test.setTimeout(90_000)

    // Baru → Diproses → Siap Packing. Siap Kirim hanya lewat menu Packaging (stok terpotong).
    await panel.getByRole("button", { name: "Ubah Status" }).click()
    await page.getByRole("menuitem", { name: "Diproses" }).click()
    // Belum lunas belum boleh mulai dimasak.
    await expect(
      page.getByText(`${orderNo} belum lunas. Catat pembayarannya dulu, baru bisa mulai dimasak.`),
    ).toBeVisible()
    expect((await readOrder(orderNo))?.status).toBe("baru")
    await markQaOrderPaid(orderNo)
    await page.reload()
    await panel.getByRole("button", { name: "Ubah Status" }).click()
    await page.getByRole("menuitem", { name: "Diproses" }).click()
    await expect(page.getByText(`Status ${orderNo} jadi Diproses.`)).toBeVisible()
    await expect(panel.getByText("Diproses", { exact: true })).toBeVisible()
    expect((await readOrder(orderNo))?.shipment_status).toBeNull()

    // Ubah menu saat masih Diproses: ganti jumlah, hapus, tambah menu + catatan per menu.
    await panel.getByRole("button", { name: "Ubah menu" }).click()
    const menuDialog = page.getByRole("dialog", { name: `Ubah menu ${orderNo}` })
    await menuDialog.getByRole("button", { name: "Kurangi Choco Bon Bon" }).click()
    await menuDialog
      .getByRole("textbox", { name: "Jumlah Not Your Mac and Cheese Regular" })
      .fill("0")
    await menuDialog.getByRole("button", { name: "Tambah Spaghetti Aglio E Olio Regular" }).click()
    await menuDialog
      .getByRole("textbox", { name: "Catatan Spaghetti Aglio E Olio Regular" })
      .fill("QA pedas")
    await menuDialog
      .getByRole("textbox", { name: "Catatan Spaghetti Classico Bologna Brulee Large" })
      .fill("QA extra keju")
    // 325.000 − 40.000 (Choco) − 50.000 (Mac R) + 45.000 (Aglio R) = 280.000; sudah dibayar 325.000.
    await expect(menuDialog.getByTestId("edit-total")).toHaveText("Rp 280.000")
    await expect(menuDialog.getByText(/lebih bayar Rp 45\.000/)).toBeVisible()
    await page.screenshot({ path: "test-results/ubah-menu-desktop.png" })
    await menuDialog.getByRole("button", { name: "Simpan menu" }).click()
    await expect(page.getByText(`Menu ${orderNo} disimpan. Total Rp 280.000.`)).toBeVisible()
    await expect(panel.getByText("Catatan: QA pedas")).toBeVisible()
    await expect(panel.getByText("Catatan: QA extra keju")).toBeVisible()
    await expect(panel.getByText(/Customer lebih bayar Rp 45\.000/)).toBeVisible()
    expect(await readOrder(orderNo)).toMatchObject({ total: 280000, items: 4 })

    await panel.getByRole("button", { name: "Ubah Status" }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Siap Packing", "Baru", "Dibatalkan"])
    await page.getByRole("menuitem", { name: "Siap Packing" }).click()
    await expect(page.getByText(`Status ${orderNo} jadi Siap Packing.`)).toBeVisible()
    await panel.getByRole("button", { name: "Ubah Status" }).click()
    await expect(page.getByRole("menuitem")).toHaveText(["Diproses", "Dibatalkan"])
    await page.keyboard.press("Escape")
    // Setelah selesai masak, menu terkunci.
    await expect(panel.getByRole("button", { name: "Ubah menu" })).toHaveCount(0)
    expect(await readOrder(orderNo)).toMatchObject({
      status: "siap_packing",
      shipment_status: null,
      logs: 3,
    })

    await panel.getByRole("button", { name: "Edit" }).click()
    const edit = page.getByRole("dialog", { name: `Ubah data ${orderNo}` })
    await edit.getByLabel(/^Alamat lengkap/).fill("Jl. QA Baru No. 7, Bandung")
    await edit.getByLabel(/^Request/).fill("Titip di satpam")
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText(`Data ${orderNo} disimpan.`)).toBeVisible()
    await expect(panel.getByText("Jl. QA Baru No. 7, Bandung")).toBeVisible()
    await expect(panel.getByText("Titip di satpam")).toBeVisible()

    await panel.getByRole("link", { name: "Lihat Detail Lengkap" }).click()
    await expect(page).toHaveURL(new RegExp(`/pesanan/${orderNo}$`))
    await expect(page.getByRole("heading", { name: orderNo })).toBeVisible()
    await expect(page.getByText("Diproses → Siap Packing")).toBeVisible()
    await expect(page.getByText("Dibuat sebagai Baru")).toBeVisible()
    await expect(page.getByText(`Nama Lengkap: ${name}`)).toBeVisible()
    await page.screenshot({ path: "test-results/detail-lengkap.png", fullPage: true })

    // Batal lewat konfirmasi; setelah dibatalkan data tidak bisa diedit.
    await page.getByRole("button", { name: "Ubah Status" }).click()
    await page.getByRole("menuitem", { name: "Dibatalkan" }).click()
    await page
      .getByRole("dialog", { name: `Batalkan ${orderNo}?` })
      .getByRole("button", { name: "Batalkan pesanan" })
      .click()
    await expect(page.getByText(`Status ${orderNo} jadi Dibatalkan.`)).toBeVisible()
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0)
    expect((await readOrder(orderNo))?.shipment_status).toBeNull()

    // Esc menutup panel di Daftar Pesanan.
    await page.goto(`/pesanan?q=${encodeURIComponent(name)}&pesanan=${orderNo}`)
    // Fokus pindah ke judul panel setelah halaman siap (juga untuk pembaca layar).
    await expect(panel.getByRole("heading", { name: "Detail Pesanan" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(page).not.toHaveURL(/pesanan=/)
    await expect(panel).toHaveCount(0)
  })
})
