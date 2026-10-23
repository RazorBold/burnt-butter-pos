import { expect, test } from "@playwright/test"

// Halaman tidak boleh memunculkan error/warning di console browser (hydration, key, dll.).
test("halaman login bersih dari error console", async ({ page }) => {
  const problems: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(message.text())
  })
  page.on("pageerror", (error) => problems.push(error.message))

  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible()
  await page.waitForLoadState("networkidle")

  expect(problems).toEqual([])
})
