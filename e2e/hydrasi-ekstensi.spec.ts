import { expect, type Page, test } from "@playwright/test"

import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

// Meniru ekstensi browser yang menyisipkan atribut ke tombol dan isian sebelum React hydrate.
// Detail mismatch hanya dilaporkan di `next dev`; di build produksi test ini selalu lulus.
function injectLikeExtension(page: Page) {
  return page.addInitScript(() => {
    const mark = (node: Node) => {
      if (!(node instanceof Element)) return
      // <select aria-hidden> (Radix Select) dan <input aria-hidden> (Radix Checkbox) adalah elemen
      // internal yang tidak bisa diberi prop.
      const selector = "button, input:not([aria-hidden]), textarea, select:not([aria-hidden])"
      if (node.matches(selector)) node.setAttribute("fdprocessedid", "qa123")
      node.querySelectorAll(selector).forEach((el) => el.setAttribute("fdprocessedid", "qa123"))
    }
    new MutationObserver((mutations) => {
      for (const mutation of mutations) mutation.addedNodes.forEach(mark)
    }).observe(document, { childList: true, subtree: true })
  })
}

function collectHydrationErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (/hydrat/i.test(message.text())) errors.push(message.text().slice(0, 1500))
  })
  page.on("pageerror", (error) => {
    if (/hydrat/i.test(error.message)) errors.push(error.message.slice(0, 1500))
  })
  return errors
}

test.describe("Atribut dari ekstensi browser tidak memicu error hydration", () => {
  test("halaman login", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "cukup di desktop")
    await injectLikeExtension(page)
    const errors = collectHydrationErrors(page)
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible()
    await page.waitForLoadState("networkidle")
    expect(errors).toEqual([])
  })

  for (const path of [
    "/dashboard",
    "/pesanan",
    "/pesanan/baru",
    "/pembayaran",
    "/stok-packaging",
    "/produksi",
    "/pengiriman",
    "/laporan",
  ]) {
    // Laporan dan Master Data khusus Owner.
    const ownerOnly = path === "/laporan" || path.startsWith("/master-data")
    test(`halaman ${path}`, async ({ page }, info) => {
      test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")
      test.skip(info.project.name !== "desktop", "cukup di desktop")
      await injectLikeExtension(page)
      const errors = collectHydrationErrors(page)
      const email = ownerOnly ? process.env.E2E_OWNER_EMAIL : admin.email
      test.skip(!email, "butuh akun QA untuk halaman ini")
      await loginAs(page, email!, admin.password!, path)
      await page.waitForLoadState("networkidle")
      expect(errors).toEqual([])
    })
  }
})
