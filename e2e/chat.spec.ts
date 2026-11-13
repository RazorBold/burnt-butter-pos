import { expect, type Page, test } from "@playwright/test"

import { removeChatMessages } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
const kasirEmail = process.env.E2E_KASIR_EMAIL

const panelOf = (page: Page) => page.getByRole("complementary", { name: "Chat Tim" })

async function openChat(page: Page) {
  await page.getByRole("button", { name: /^Buka Chat Tim/ }).click()
  await expect(panelOf(page)).toBeVisible()
}

// Database uji = database produksi: pesan uji sempat terlihat staf asli, jadi tidak memakai
// @semua (yang memberi notifikasi ke semua orang) dan langsung dihapus setelah test.
test.describe("Chat Tim", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let marker: string | undefined
  test.afterEach(async () => {
    if (marker) await removeChatMessages(marker)
    marker = undefined
  })

  test("panel di kanan bisa dibuka dan disembunyikan, dan diingat setelah muat ulang", async ({
    page,
  }, info) => {
    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    await openChat(page)
    await expect(panelOf(page).getByRole("textbox", { name: "Tulis pesan" })).toBeVisible()
    await page.screenshot({ path: `test-results/chat-${info.project.name}.png`, fullPage: false })
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)

    await page.reload()
    await expect(panelOf(page)).toBeVisible()
    await panelOf(page).getByRole("button", { name: "Sembunyikan Chat Tim" }).click()
    await expect(panelOf(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole("button", { name: /^Buka Chat Tim/ })).toBeVisible()
    await expect(panelOf(page)).toHaveCount(0)
  })

  test("admin dan kasir saling kirim pesan, @nama menandai, @semua khusus Owner/Admin", async ({
    page,
    browser,
  }, info) => {
    test.skip(!kasirEmail || info.project.name !== "desktop", "butuh E2E_KASIR_EMAIL, desktop saja")
    test.setTimeout(90_000)
    marker = `QA-chat-${Date.now()}`

    // Admin menandai QA Kasir lewat saran nama.
    await loginAs(page, admin.email!, admin.password!, "/dashboard")
    await openChat(page)
    const adminInput = panelOf(page).getByRole("textbox", { name: "Tulis pesan" })
    await adminInput.fill(`${marker} tolong cek pesanan besok `)
    await adminInput.pressSequentially("@QA K")
    await expect(page.getByRole("option", { name: /@QA Kasir/ })).toBeVisible()
    await adminInput.press("Enter") // pilih saran
    await expect(adminInput).toHaveValue(`${marker} tolong cek pesanan besok @QA Kasir `)
    await adminInput.press("Enter") // kirim
    const sent = panelOf(page).getByRole("article", { name: "Pesan dari QA Admin" }).filter({
      hasText: marker,
    })
    await expect(sent).toBeVisible()
    await expect(adminInput).toHaveValue("")

    // Kasir: badge menandai, pesan disorot.
    const kasir = await browser.newPage()
    await loginAs(kasir, kasirEmail!, admin.password!, "/pesanan")
    await expect(kasir.getByRole("button", { name: /^Buka Chat Tim.*menandai kamu/ })).toBeVisible({
      timeout: 20_000,
    })
    await openChat(kasir)
    const received = panelOf(kasir)
      .getByRole("article", { name: "Pesan dari QA Admin" })
      .filter({ hasText: marker })
    await expect(received).toContainText("menandai kamu")
    await kasir.screenshot({ path: "test-results/chat-kasir-desktop.png" })

    // Kasir tidak boleh @semua: ditolak, tidak tersimpan.
    const kasirInput = panelOf(kasir).getByRole("textbox", { name: "Tulis pesan" })
    await kasirInput.fill(`${marker} @semua tes`)
    await kasirInput.press("Escape")
    await kasirInput.press("Enter")
    await expect(panelOf(kasir).getByRole("alert")).toContainText(
      "@semua hanya untuk Owner dan Admin",
    )

    // Kasir membalas dengan @QA Admin; admin (panel terbuka) melihatnya tersorot.
    await kasirInput.fill(`${marker} siap @QA Admin`)
    await kasirInput.press("Escape")
    await kasirInput.press("Enter")
    await expect(
      panelOf(kasir)
        .getByRole("article", { name: "Pesan dari QA Kasir" })
        .filter({ hasText: `${marker} siap` }),
    ).toBeVisible()
    const reply = panelOf(page)
      .getByRole("article", { name: "Pesan dari QA Kasir" })
      .filter({ hasText: marker })
    await expect(reply).toContainText("menandai kamu", { timeout: 15_000 })
    await kasir.close()

    // Riwayat Chat: log per hari, hari ini berisi pesan yang baru dikirim (hanya baca).
    await panelOf(page).getByRole("link", { name: "Riwayat chat" }).click()
    await expect(page.getByRole("heading", { name: "Riwayat Chat", level: 1 })).toBeVisible()
    const log = page.getByRole("log", { name: "Pesan Hari ini" })
    await expect(log).toContainText(`${marker} tolong cek pesanan besok`)
    await expect(log).toContainText(`${marker} siap`)
    await expect(
      page
        .getByRole("navigation", { name: "Tanggal chat" })
        .getByRole("link", { name: /Hari ini/ }),
    ).toHaveAttribute("aria-current", "page")
    await page.screenshot({ path: "test-results/riwayat-chat-desktop.png", fullPage: true })
  })
})
