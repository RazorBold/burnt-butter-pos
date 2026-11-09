import { expect, type Page, test } from "@playwright/test"

import { removeStaffByEmail } from "./helpers/cleanup"
import { expectAccessDenied } from "./helpers/access"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL
const ownerEmail = process.env.E2E_OWNER_EMAIL

async function login(page: Page, email: string, password: string, target: string) {
  await loginAs(page, email, password, target)
}

test.describe("Master Data › User / Staff", () => {
  test.skip(!ownerEmail || !admin.password, "E2E_OWNER_EMAIL / E2E_PASSWORD belum diisi")

  let createdEmail: string | undefined
  test.afterEach(async () => {
    if (createdEmail) await removeStaffByEmail(createdEmail)
    createdEmail = undefined
  })

  test("daftar akun, akun sendiri ditandai dan tidak bisa dinonaktifkan", async ({
    page,
  }, info) => {
    await login(page, ownerEmail!, admin.password!, "/master-data/user-staff")
    const self = page.getByRole("row", { name: new RegExp(ownerEmail!) })
    await expect(self.getByText("Kamu", { exact: true })).toBeVisible()
    await expect(self.getByRole("cell", { name: "Owner", exact: true })).toBeVisible()
    await page.screenshot({ path: `test-results/staff-${info.project.name}.png`, fullPage: true })

    await page.getByRole("button", { name: "Tambah User" }).click()
    const add = page.getByRole("dialog", { name: "Tambah akun staf" })
    await expect(add.getByRole("radio", { name: /^Kasir/ })).toBeChecked()
    await page.screenshot({ path: `test-results/staff-dialog-${info.project.name}.png` })
    await page.keyboard.press("Escape")

    await self.getByRole("button", { name: /^Aksi lain untuk/ }).click()
    await expect(page.getByRole("menuitem", { name: "Atur ulang kata sandi" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Nonaktifkan" })).toHaveCount(0)
    await page.keyboard.press("Escape")

    await self.getByRole("button", { name: /^Ubah / }).click()
    const edit = page.getByRole("dialog", { name: "Ubah akun staf" })
    await expect(edit.getByRole("radio", { name: /^Owner/ })).toBeDisabled()
    await expect(edit.getByText("Role akunmu sendiri hanya bisa diubah Owner lain.")).toBeVisible()
  })

  test("buat akun, ubah role, reset sandi, nonaktifkan lalu aktifkan lagi", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    const stamp = Date.now()
    const name = `QA Staff ${stamp}`
    const email = `qa-staff-${stamp}@example.com`
    createdEmail = email
    await login(page, ownerEmail!, admin.password!, "/master-data/user-staff")

    // Email yang sudah dipakai ditolak, isian tetap ada.
    await page.getByRole("button", { name: "Tambah User" }).click()
    const dialog = page.getByRole("dialog", { name: "Tambah akun staf" })
    await dialog.getByLabel("Nama").fill(name)
    await dialog.getByLabel("Email").fill(admin.email!)
    await dialog.getByRole("radio", { name: /^Produksi/ }).check()
    await dialog.getByRole("button", { name: "Buat akun" }).click()
    await expect(dialog.getByText("Email ini sudah dipakai akun lain.")).toBeVisible()
    await expect(dialog.getByLabel("Nama")).toHaveValue(name)

    await dialog.getByLabel("Email").fill(`  ${email.toUpperCase()} `)
    await dialog.getByRole("button", { name: "Buat akun" }).click()
    const created = page.getByRole("dialog", { name: "Akun dibuat" })
    await expect(created.getByText(email)).toBeVisible()
    const firstPassword = await created.getByTestId("new-password").innerText()
    expect(firstPassword).toHaveLength(16)
    await created.getByRole("button", { name: "Selesai" }).click()

    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row.getByRole("cell", { name: "Produksi", exact: true })).toBeVisible()
    await expect(row.getByText("Belum pernah")).toBeVisible()

    await row.getByRole("button", { name: `Ubah ${name}` }).click()
    const edit = page.getByRole("dialog", { name: "Ubah akun staf" })
    await edit.getByRole("radio", { name: /^Kasir/ }).check()
    await edit.getByRole("button", { name: "Simpan perubahan" }).click()
    await expect(page.getByText("Data staf disimpan.")).toBeVisible()
    await expect(row.getByRole("cell", { name: "Kasir", exact: true })).toBeVisible()

    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Atur ulang kata sandi" }).click()
    const reset = page.getByRole("dialog", { name: "Atur ulang kata sandi?" })
    await reset.getByRole("button", { name: "Buat kata sandi baru" }).click()
    const revealed = page.getByRole("dialog", { name: "Kata sandi baru" })
    const password = await revealed.getByTestId("new-password").innerText()
    expect(password).not.toBe(firstPassword)
    await revealed.getByRole("button", { name: "Selesai" }).click()

    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Nonaktifkan" }).click()
    await expect(row.getByText("Nonaktif", { exact: true })).toBeVisible()

    // Staf mencoba masuk di browser lain: ditolak selama nonaktif, bisa lagi setelah diaktifkan.
    const staffContext = await browser.newContext()
    const staffPage = await staffContext.newPage()
    await login(staffPage, email, password, "/login")
    await expect(staffPage.locator("#login-error")).toHaveText(
      "Akun ini sedang dinonaktifkan. Hubungi Owner.",
    )

    await row.getByRole("button", { name: `Aksi lain untuk ${name}` }).click()
    await page.getByRole("menuitem", { name: "Aktifkan" }).click()
    await expect(row.getByText("Aktif", { exact: true })).toBeVisible()

    await staffPage.getByLabel("Kata sandi", { exact: true }).fill(password)
    await staffPage.getByRole("button", { name: "Masuk" }).click()
    await expect(staffPage).toHaveURL(/\/dashboard/)
    await staffContext.close()
  })

  test("Admin dan Kasir tidak bisa membuka User / Staff (khusus Owner)", async ({ page }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    for (const email of [admin.email!, kasirEmail!]) {
      await login(page, email, admin.password!, "/master-data/user-staff")
      await expectAccessDenied(page)
    }
  })
})
