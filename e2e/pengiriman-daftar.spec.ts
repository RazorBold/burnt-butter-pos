import { expect, type Page, test } from "@playwright/test"

import { readOrder, removeQaOrders, seedQaOrders } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

const rowOf = (page: Page, orderNo: string) => page.getByRole("row", { name: new RegExp(orderNo) })

test.describe("Pengiriman: selesaikan dari daftar dan link lacak", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  let code: string | undefined
  test.afterEach(async () => {
    if (code) await removeQaOrders(code)
    code = undefined
  })

  test("kirim, tambah link, selesai dari baris; Pick Up dan Kurir Internal", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
    code = `${Date.now()}`
    const no = (n: number) => `QA${code}${String(n).padStart(2, "0")}`
    const date = new Date(Date.now() + (2400 + (Number(code) % 100)) * 86_400_000)
      .toISOString()
      .slice(0, 10)
    await seedQaOrders(code, 4, 0, {
      deliveryDate: date,
      plan: [
        { status: "siap_kirim", method: "instant" },
        { status: "siap_kirim", method: "kurir_internal" },
        { status: "siap_kirim", method: "pick_up" },
        { status: "diproses", method: "instant" },
      ],
    })
    await loginAs(page, admin.email!, admin.password!, `/pengiriman?tanggal=${date}`)

    // Belum dimasak: tidak ada tombol langkah. Kurir Internal tanpa kurir: Atur kurir.
    await expect(rowOf(page, no(4)).getByRole("button", { name: /^Tandai/ })).toHaveCount(0)
    await expect(page.getByRole("button", { name: `Atur kurir ${no(2)}` })).toBeVisible()
    await page.screenshot({ path: "test-results/pengiriman-daftar-desktop.png", fullPage: true })

    // Instant: kirim dari baris, panel detail tidak terbuka.
    await page.getByRole("button", { name: `Tandai Dikirim ${no(1)}` }).click()
    await expect(page.getByText(`${no(1)} ditandai dikirim.`)).toBeVisible()
    await expect(page).not.toHaveURL(/pesanan=/)

    // Link lacak: yang tidak aman ditolak, tanpa skema dilengkapi https.
    await page.getByRole("button", { name: `Tambah link lacak ${no(1)}` }).click()
    const dialog = page.getByRole("dialog", { name: `Link lacak ${no(1)}` })
    await dialog.getByLabel("Link lacak").fill("javascript:alert(1)")
    await dialog.getByRole("button", { name: "Simpan link" }).click()
    await expect(dialog.getByText("Link belum benar.", { exact: false })).toBeVisible()
    await dialog.getByLabel("Link lacak").fill("gojek.com/track/abc")
    await dialog.getByRole("button", { name: "Simpan link" }).click()
    await expect(page.getByText(`Link lacak ${no(1)} disimpan.`)).toBeVisible()
    const link = rowOf(page, no(1)).getByRole("link", { name: `Lacak pengiriman ${no(1)}` })
    await expect(link).toHaveAttribute("href", "https://gojek.com/track/abc")
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(link).toHaveAttribute("rel", "noopener noreferrer")
    expect(await readOrder(no(1))).toMatchObject({
      status: "dikirim",
      tracking_url: "https://gojek.com/track/abc",
    })

    // Pengiriman hanya menampilkan link; salin & tanda terkirim urusan admin di menu Pesanan.
    await expect(rowOf(page, no(1)).getByRole("button", { name: /Salin link lacak/ })).toHaveCount(
      0,
    )
    await page.screenshot({ path: "test-results/pengiriman-lacak-desktop.png", fullPage: true })

    // Menu Pesanan: link terlihat, bisa disalin untuk customer lalu ditandai sudah dikirim.
    await page.goto(`/pesanan?q=${code}`)
    await expect(
      rowOf(page, no(1)).getByRole("link", { name: `Lacak pengiriman ${no(1)}` }),
    ).toHaveAttribute("href", "https://gojek.com/track/abc")
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    await rowOf(page, no(1))
      .getByRole("button", { name: `Salin link lacak ${no(1)}` })
      .click()
    await expect(page.getByText(`Link lacak ${no(1)} disalin.`)).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "https://gojek.com/track/abc",
    )
    const notSent = rowOf(page, no(1)).getByRole("button", {
      name: `Tandai link lacak ${no(1)} sudah dikirim ke customer`,
    })
    await expect(notSent).toHaveAttribute("aria-pressed", "false")
    await notSent.click()
    await expect(
      page.getByText(`Link lacak ${no(1)} ditandai sudah dikirim ke customer.`),
    ).toBeVisible()
    await expect(
      rowOf(page, no(1)).getByRole("button", { name: /sudah dikirim ke customer/ }),
    ).toHaveAttribute("aria-pressed", "true")
    await expect(rowOf(page, no(1)).getByText("Terkirim", { exact: true })).toBeVisible()
    expect((await readOrder(no(1)))?.tracking_link_sent_at).not.toBeNull()
    await page.screenshot({ path: "test-results/pesanan-lacak-desktop.png", fullPage: true })

    // Link diganti di Pengiriman: tanda di Pesanan kembali "belum dikirim".
    await page.goto(`/pengiriman?tanggal=${date}`)
    await page.getByRole("button", { name: `Aksi untuk ${no(1)}` }).click()
    await page.getByRole("menuitem", { name: "Ubah link lacak" }).click()
    const editLink = page.getByRole("dialog", { name: `Link lacak ${no(1)}` })
    await editLink.getByLabel("Link lacak").fill("https://gojek.com/track/xyz")
    await editLink.getByRole("button", { name: "Simpan link" }).click()
    await expect(page.getByText(`Link lacak ${no(1)} disimpan.`)).toBeVisible()
    expect(await readOrder(no(1))).toMatchObject({
      tracking_url: "https://gojek.com/track/xyz",
      tracking_link_sent_at: null,
    })
    await page.goto(`/pesanan?q=${code}`)
    await expect(
      rowOf(page, no(1)).getByRole("button", {
        name: `Tandai link lacak ${no(1)} sudah dikirim ke customer`,
      }),
    ).toHaveAttribute("aria-pressed", "false")

    // Selesaikan dari baris Pengiriman, tanpa kembali ke Pesanan.
    await page.goto(`/pengiriman?tanggal=${date}`)
    await page.getByRole("button", { name: `Tandai Selesai ${no(1)}` }).click()
    await expect(page.getByText(`Status ${no(1)} jadi Selesai.`)).toBeVisible()
    await expect(page).toHaveURL(/\/pengiriman/)
    expect(await readOrder(no(1))).toMatchObject({ status: "selesai", shipment_status: "selesai" })
    await expect(
      rowOf(page, no(1)).getByRole("button", { name: /^Tandai (Dikirim|Selesai)/ }),
    ).toHaveCount(0)

    // Pick Up: Sudah Diambil dari baris, tidak punya link.
    await expect(rowOf(page, no(3)).getByRole("button", { name: /link lacak/ })).toHaveCount(0)
    await page.getByRole("button", { name: `Sudah Diambil ${no(3)}` }).click()
    await expect(page.getByText(`Status ${no(3)} jadi Selesai.`)).toBeVisible()
  })
})
