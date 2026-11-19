import { expect, type Page, test } from "@playwright/test"

import { createQaMenu, removeMenuByName, snapshotMessageTemplates } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const ownerEmail = process.env.E2E_OWNER_EMAIL

const editorOf = (page: Page) => page.getByRole("region", { name: "Template Pesan" })

/** Isi template FO1 hasil salin seperti customer: data wajib, satu pengiriman, menu uji 2. */
function fillFo1(text: string, menu: string) {
  return text
    .replace("Tanggal Pengiriman:", "Tanggal Pengiriman: besok")
    .replace("Jenis: PO/RS/MTO", "Jenis: PO")
    .replace("Yes/No", "No")
    .replace("Nama Penerima:", `Nama Penerima: QA Customer ${Date.now()}`)
    .replace("No.Telp:", `No.Telp: 0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`)
    .replace("Alamat Lengkap:", "Alamat Lengkap: Jl. QA No. 1, Bandung")
    .replace(/(Pilih Metode Pengiriman :\n)((?:- [^\n]*\n)+)/, (_, head: string, lines: string) => {
      const instant = lines.split("\n").find((line) => /^- Instant/.test(line))
      return `${head}${instant ?? "- Instant"}\n`
    })
    .replace(`${menu} :`, `${menu} : 2`)
}

// Permintaan pemilik toko (19 Nov 2026): template ikut Master Data, teksnya diedit di Pengaturan.
test.describe("Template pesan dari Master Data", () => {
  test.skip(!admin.email || !admin.password || !ownerEmail, "butuh akun QA Admin & Owner")

  let restore: (() => Promise<void>) | undefined
  let menu: string | undefined
  test.afterEach(async () => {
    await restore?.()
    if (menu) await removeMenuByName(menu)
    restore = undefined
    menu = undefined
  })

  test("Owner melihat pratinjau yang terisi Master Data", async ({ page }, info) => {
    await loginAs(page, ownerEmail!, admin.password!, "/master-data/pengaturan")
    const editor = editorOf(page)
    await expect(editor).toBeVisible()
    const preview = editor.getByTestId("template-preview")
    await expect(preview).toContainText("A. Spaghetti Classico Bologna Brulee :")
    await expect(preview).toContainText(/Additional Birthday Box \(Rp [\d.]+\)/)
    await expect(preview).not.toContainText("{MENU")
    await expect(editor.getByText("Siap dipakai")).toBeVisible()
    await editor.getByRole("radio", { name: "Olshop" }).click()
    await expect(preview).toContainText("Nomor Invoice:")
    await expect(preview).not.toContainText("*")
    await editor.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/template-pesan-${info.project.name}.png`,
      fullPage: true,
    })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
  })

  test("menu baru langsung masuk template; edit Owner dipakai Admin dan terbaca Isi Otomatis", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    test.setTimeout(120_000)
    restore = await snapshotMessageTemplates()
    const stamp = Date.now()
    menu = `QA Menu ${stamp}`
    await createQaMenu(menu, "Dessert", 12_000)

    await loginAs(page, ownerEmail!, admin.password!, "/master-data/pengaturan")
    const editor = editorOf(page)
    const preview = editor.getByTestId("template-preview")
    await expect(preview).toContainText(`${menu} :`)
    const body = editor.getByRole("textbox", { name: "Isi template FO1 (Normal)" })
    const save = editor.getByRole("button", { name: "Simpan template" })
    await expect(save).toBeDisabled()

    // Label wajib terhapus: diperingatkan dan tidak bisa disimpan.
    const original = await body.inputValue()
    await body.fill(original.replace("No.Telp:\n", ""))
    await expect(editor.getByText('Baris "No.Telp:" wajib ada')).toBeVisible()
    await expect(save).toBeDisabled()

    // Ubah teks pembuka lalu simpan.
    await body.fill(original.replace("#DetailFO1\n", `#DetailFO1\nCatatan QA ${stamp}\n`))
    await expect(editor.getByText("Siap dipakai")).toBeVisible()
    await save.click()
    await expect(page.getByText("Template FO1 (Normal) disimpan.")).toBeVisible()
    await expect(editor.getByText(/Terakhir diubah .* oleh QA Owner/)).toBeVisible()

    // Admin menyalin format FO1: berisi teks baru dan menu baru, lalu terbaca Isi Otomatis.
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })
    const adminPage = await context.newPage()
    await loginAs(adminPage, admin.email!, admin.password!, "/pesanan/baru")
    await adminPage.getByRole("button", { name: "FO1 (Normal)" }).click()
    await expect(adminPage.getByText("Format FO1 (Normal) disalin ke clipboard.")).toBeVisible()
    // Clipboard Windows memakai akhir baris CRLF.
    const clipboard = await adminPage.evaluate(() => navigator.clipboard.readText())
    const copied = clipboard.replace(/\r\n/g, "\n")
    expect(copied).toContain(`Catatan QA ${stamp}`)
    expect(copied).toContain(`${menu} :`)
    await adminPage.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(fillFo1(copied, menu))
    await adminPage.getByRole("button", { name: "Isi Otomatis" }).click()
    await expect(adminPage.getByText("Data pesanan lengkap.")).toBeVisible()
    await expect(adminPage.getByText("Menu tidak dikenali")).toHaveCount(0)
    await expect(adminPage.getByRole("textbox", { name: `Jumlah ${menu}` })).toHaveValue("2")
    await context.close()

    // Kembali ke bawaan.
    await editor.getByRole("button", { name: "Pakai template bawaan" }).click()
    await save.click()
    await expect(
      page.getByText("Template FO1 (Normal) disimpan (sama dengan bawaan)."),
    ).toBeVisible()
    await expect(editor.getByText("Template bawaan")).toBeVisible()
  })
})
