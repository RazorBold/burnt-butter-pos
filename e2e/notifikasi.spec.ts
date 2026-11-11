import { expect, test } from "@playwright/test"

import { FO1_TEMPLATE } from "../src/lib/wa-parser/templates"
import { markQaOrderPaid, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const ownerEmail = process.env.E2E_OWNER_EMAIL

function orderText(name: string) {
  return FO1_TEMPLATE.replace("Tanggal Pengiriman:", "Tanggal Pengiriman: besok")
    .replace("Jenis: PO/RS/MTO", "Jenis: PO")
    .replace("Nama Penerima:", `Nama Penerima: ${name}`)
    .replace(
      /No\.Telp: ?/,
      `No.Telp: 0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
    )
    .replace("Alamat Lengkap:", "Alamat Lengkap: Jl. QA No. 1, Bandung")
    .replace(/- Pick Up\s*\n/, "")
    .replace(/- Kurir Internal.*\n/, "")
    .replace("Choco Bon Bon :", "Choco Bon Bon : 1")
}

test.describe("Lonceng notifikasi: aktivitas terbaru", () => {
  test.skip(!admin.email || !admin.password || !ownerEmail, "butuh akun QA Admin dan Owner")

  let orderNo: string | undefined
  test.afterEach(async () => {
    if (orderNo) await removeOrderByNo(orderNo)
    orderNo = undefined
  })

  test("pesanan baru dari Admin muncul sebagai alert dan di lonceng Owner, lalu lunas", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(120_000)
    // Owner membuka aplikasi lebih dulu (lonceng mencatat titik "terakhir dilihat").
    await loginAs(page, ownerEmail!, admin.password!, "/dashboard")
    await expect(page.getByRole("button", { name: /^Notifikasi/ })).toBeVisible()

    // Admin memasukkan pesanan di tab lain.
    const adminPage = await browser.newPage()
    await loginAs(adminPage, admin.email!, admin.password!, "/pesanan/baru")
    await adminPage
      .getByRole("textbox", { name: "Pesan WhatsApp" })
      .fill(orderText(`QA Customer ${Date.now()}`))
    await adminPage.getByRole("button", { name: "Isi Otomatis" }).click()
    await adminPage.getByRole("button", { name: "Simpan pesanan" }).click()
    orderNo = await adminPage
      .getByRole("dialog", { name: "Pesanan sudah terinput" })
      .getByTestId("saved-order-no")
      .innerText()
    await adminPage.close()

    // Polling 20 detik: alert muncul tanpa reload, dan lonceng menghitung update baru.
    await expect(page.getByText(`Pesanan baru ${orderNo}`).first()).toBeVisible({
      timeout: 35_000,
    })
    await expect(page.getByRole("button", { name: /^Notifikasi: \d+ update baru$/ })).toBeVisible()

    await page.getByRole("button", { name: /^Notifikasi/ }).click()
    const feed = page.getByRole("group", { name: "Aktivitas terbaru" })
    await expect(
      feed.getByRole("menuitem", { name: new RegExp(`Pesanan baru ${orderNo}`) }),
    ).toContainText("QA Admin")
    await page.waitForTimeout(400) // animasi muncul selesai
    await page.screenshot({ path: "test-results/notifikasi-desktop.png" })
    await page.keyboard.press("Escape")
    // Setelah dibuka, tanda belum dibaca hilang.
    await expect(page.getByRole("button", { name: /^Notifikasi: \d+ update baru$/ })).toHaveCount(0)

    // Lunas juga muncul.
    await markQaOrderPaid(orderNo)
    await page.reload()
    await page.getByRole("button", { name: /^Notifikasi/ }).click()
    await expect(
      page.getByRole("group", { name: "Aktivitas terbaru" }).getByText(`${orderNo} lunas`),
    ).toBeVisible()
  })
})
