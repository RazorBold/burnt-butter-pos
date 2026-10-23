import { expect, test } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test("kartu KPI menampilkan nilai, badge tren, dan teks untuk pembaca layar", async ({
  page,
}, info) => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD belum diisi")
  test.skip(Boolean(process.env.E2E_BASE_URL), "halaman pratinjau hanya ada di dev")

  await page.goto("/dev/komponen")
  await page.getByLabel("Email").fill(email!)
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!)
  await page.getByRole("button", { name: "Masuk" }).click()
  await page.waitForURL(/\/dev\/komponen/)

  const dashboard = page.getByTestId("kpi-dashboard")
  await expect(dashboard.getByText("Rp 4.780.000")).toBeVisible()
  await expect(dashboard.getByText("Naik 12% dibanding periode sebelumnya")).toBeAttached()
  await expect(dashboard.getByText("Turun 14% dibanding periode sebelumnya")).toBeAttached()

  // "Perlu Dikirim" naik = buruk → badge merah.
  const perluDikirim = page.getByTestId("kpi-pengiriman").locator("div", {
    hasText: "Perlu Dikirim Hari Ini",
  })
  await expect(perluDikirim.locator("span.bg-trend-down").first()).toBeVisible()

  // Nilai uang tidak boleh terpotong (tanpa elipsis), termasuk di laptop 1280 px.
  for (const width of info.project.name === "desktop" ? [1536, 1280] : [0]) {
    if (width) await page.setViewportSize({ width, height: 900 })
    const rupiah = dashboard.getByText("Rp 4.780.000")
    const clipped = await rupiah.evaluate((el) => el.scrollWidth > el.clientWidth)
    expect(clipped, `nilai terpotong di ${width || info.project.name}`).toBe(false)
    await page.screenshot({
      path: `test-results/kpi-${info.project.name}${width ? `-${width}` : ""}.png`,
      fullPage: true,
    })
  }
})
