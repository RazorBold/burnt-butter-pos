import { expect, test } from "@playwright/test"

import { FO1_TEMPLATE, FO2_TEMPLATE, FO3_TEMPLATE } from "../src/lib/wa-parser/templates"
import { readOrder, removeOrderByNo } from "./helpers/cleanup"
import { loginAs } from "./helpers/login"

const admin = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }

function randomPhone() {
  return `0899${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`
}

/**
 * Isi template FO seperti customer: data penerima di atas, Instant, lalu jumlah menu. `picks`
 * berisi [penanda bagian (berurutan), nama menu, jumlah]; penanda dicari berurutan supaya FO3
 * bisa membedakan "#BOX NORMAL" dan "#BOX CHRISTMAS".
 */
function fill(
  template: string,
  values: { name: string; kind: string; sender?: string },
  picks: [string[], string, number][],
) {
  let text = template
    .replace("Tanggal Pengiriman:", "Tanggal Pengiriman: besok")
    .replace("Jenis: PO/RS/MTO", `Jenis: ${values.kind}`)
    .replace("Nama Penerima:", `Nama Penerima: ${values.name}`)
    .replace(/No\.Telp: ?/, `No.Telp: ${randomPhone()}`)
    .replace("Alamat Lengkap:", "Alamat Lengkap: Jl. QA No. 1, Bandung")
    .replace(/- Pick Up\s*\n/, "")
    .replace(/- Kurir Internal.*\n/, "")
  if (values.sender) text = text.replace(/Nama Pengirim: ?/, `Nama Pengirim: ${values.sender}`)
  for (const [markers, menu, qty] of picks) {
    let at = 0
    for (const marker of markers) at = text.indexOf(marker, at)
    const line = text.indexOf(menu, at)
    const end = text.indexOf("\n", line)
    const lineEnd = end === -1 ? text.length : end
    text = `${text.slice(0, lineEnd).replace(/:\s*$/, `: ${qty}`)}${text.slice(lineEnd)}`
  }
  return text
}

const CASES = [
  {
    title: "FO1 Normal · MTO",
    template: FO1_TEMPLATE,
    kind: "MTO",
    kindLabel: "Made to Order",
    type: "normal",
    typeLabel: "Normal",
    picks: [
      [["Size Large"], "Spaghetti Classico Bologna Brulee", 1],
      [["Size Regular"], "Not Your Mac and Cheese", 2],
    ] as [string[], string, number][],
    total: "Rp 165.000",
    items: 2,
  },
  {
    title: "FO2 Hampers · PO",
    template: FO2_TEMPLATE,
    kind: "PO",
    kindLabel: "PO",
    type: "hampers",
    typeLabel: "Hampers",
    sender: "QA Pengirim",
    picks: [
      [["Size Large"], "Classico Red", 1],
      [["Size Regular"], "Mac & Joy", 1],
    ] as [string[], string, number][],
    total: "Rp 115.000",
    items: 2,
  },
  {
    title: "FO3 Normal & Hampers · RS",
    template: FO3_TEMPLATE,
    kind: "RS",
    kindLabel: "Ready Stock",
    type: "normal_hampers",
    typeLabel: "Normal & Hampers",
    sender: "QA Kantor",
    picks: [
      [["#BOX NORMAL", "Size Regular"], "Spaghetti Classico Bologna Brulee", 1],
      [["#BOX NORMAL", "Dessert"], "Choco Bon Bon", 1],
      [["#BOX CHRISTMAS", "Size Large"], "Holy E Olio", 1],
    ] as [string[], string, number][],
    total: "Rp 150.000",
    items: 3,
  },
]

test.describe("Input Pesanan dari template FO1/FO2/FO3", () => {
  test.skip(!admin.email || !admin.password, "E2E_EMAIL / E2E_PASSWORD belum diisi")

  const saved: string[] = []
  test.afterEach(async () => {
    for (const orderNo of saved.splice(0)) await removeOrderByNo(orderNo)
  })

  for (const c of CASES) {
    test(`${c.title}: Isi Otomatis lengkap, tersimpan dengan tipe & jenis benar`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== "desktop", "alur tulis cukup sekali, di desktop")
      test.setTimeout(60_000)
      const name = `QA Customer ${Date.now()} ${c.title.slice(0, 3)}`
      const text = fill(c.template, { name, kind: c.kind, sender: c.sender }, c.picks)

      await loginAs(page, admin.email!, admin.password!, "/pesanan/baru")
      await page.getByRole("textbox", { name: "Pesan WhatsApp" }).fill(text)
      await page.getByRole("button", { name: "Isi Otomatis" }).click()

      await expect(page.getByRole("radio", { name: c.typeLabel, exact: true })).toHaveAttribute(
        "aria-checked",
        "true",
      )
      await expect(page.getByRole("radio", { name: c.kindLabel, exact: true })).toHaveAttribute(
        "aria-checked",
        "true",
      )
      await expect(page.getByLabel("Nama penerima")).toHaveValue(name)
      if (c.sender) await expect(page.getByLabel("Nama pengirim")).toHaveValue(c.sender)
      await expect(page.getByRole("radio", { name: /^Instant/ })).toBeChecked()
      await expect(page.getByTestId("order-total")).toHaveText(c.total)
      await expect(page.getByText("Data pesanan lengkap.")).toBeVisible()

      await page.getByRole("button", { name: "Simpan pesanan" }).click()
      const dialog = page.getByRole("dialog", { name: "Pesanan sudah terinput" })
      const orderNo = await dialog.getByTestId("saved-order-no").innerText()
      saved.push(orderNo)
      expect(await readOrder(orderNo)).toMatchObject({
        type: c.type,
        kind: c.kind === "MTO" ? "made_to_order" : c.kind === "RS" ? "ready_stock" : "po",
        method: "instant",
        items: c.items,
        total: Number(c.total.replace(/\D/g, "")),
      })
    })
  }
})
