import { describe, expect, it } from "vitest"

import { parseDeliveryDate, parseWaOrder } from "./index"
import { HADIAH_SAMPLE, HADIAH_TEMPLATE, PERSONAL_SAMPLE, PERSONAL_TEMPLATE } from "./templates"

const TODAY = "2026-10-24"

describe("parseWaOrder: pesanan Personal", () => {
  const parsed = parseWaOrder(PERSONAL_SAMPLE, TODAY)

  it("membaca data customer, alamat dua baris, dan tanggal kirim", () => {
    expect(parsed.type).toBe("personal")
    expect(parsed.name).toBe("Siti Nurhaliza")
    expect(parsed.phone).toBe("081234567890")
    expect(parsed.address).toBe("Jl. Melati No. 12, RT 03/RW 05\nKel. Sukajadi, Bandung")
    expect(parsed.deliveryDate).toBe("2026-10-25")
    expect(parsed.senderName).toBeNull()
  })

  it("metode kirim dari satu-satunya opsi yang tersisa, request ikut terbaca", () => {
    expect(parsed.shippingMethod).toBe("instant")
    expect(parsed.request).toBe("Sausnya dipisah ya kak")
  })

  it("hanya menu berjumlah > 0, lengkap dengan ukurannya", () => {
    expect(parsed.items).toEqual([
      { name: "Spaghetti Classico Bologna Brulee", size: "large", qty: 2 },
      { name: "Potato Gratin Lasagna", size: "large", qty: 1 },
      { name: "Not Your Mac and Cheese", size: "regular", qty: 1 },
      { name: "Choco Bon Bon", size: "single", qty: 2 },
    ])
  })
})

describe("parseWaOrder: pesanan Hadiah", () => {
  const parsed = parseWaOrder(HADIAH_SAMPLE, TODAY)

  it("membaca penerima, pengirim, dan kartu ucapan", () => {
    expect(parsed.type).toBe("hadiah")
    expect(parsed.name).toBe("Alya Putri")
    expect(parsed.phone).toBe("081323456789")
    expect(parsed.senderName).toBe("Rizky")
    expect(parsed.cardTo).toBe("Alya")
    expect(parsed.cardWishes).toBe("Happy birthday sayang!\nSemoga suka pastanya")
    expect(parsed.cardFrom).toBe("Rizky")
  })

  it("tanggal tanpa tahun dan opsi kirim bertanda ✅", () => {
    expect(parsed.deliveryDate).toBe("2026-10-28")
    expect(parsed.shippingMethod).toBe("kurir_internal")
    expect(parsed.request).toBeNull()
  })

  it("Bundle of 3 terbaca sebagai item tanpa ukuran", () => {
    expect(parsed.items).toEqual([
      { name: "Melt My Mac and Cheese", size: "large", qty: 1 },
      { name: "Bundle of 3", size: "single", qty: 1 },
    ])
  })
})

describe("parseWaOrder: template kosong dan variasi", () => {
  it.each([
    [PERSONAL_TEMPLATE, "personal"],
    [HADIAH_TEMPLATE, "hadiah"],
  ] as const)("template kosong tidak menebak apa pun (%#)", (template, type) => {
    const parsed = parseWaOrder(template, TODAY)
    expect(parsed.type).toBe(type)
    expect(parsed.name).toBeNull()
    expect(parsed.phone).toBeNull()
    expect(parsed.address).toBeNull()
    expect(parsed.deliveryDate).toBeNull()
    expect(parsed.senderName).toBeNull()
    expect(parsed.shippingMethod).toBeNull()
    expect(parsed.request).toBeNull()
    expect(parsed.cardTo).toBeNull()
    expect(parsed.cardWishes).toBeNull()
    expect(parsed.items).toEqual([])
  })

  it("metode kirim ditulis setelah label, format tebal WA dibuang", () => {
    const text = PERSONAL_TEMPLATE.replace(
      "Pilih Metode Pengiriman :\n",
      "Pilih Metode Pengiriman : Pick up\n",
    )
      .replace("Nama Lengkap:", "*Nama Lengkap:* Budi")
      .replace("No.Telp:\n", "No. HP: 0857 1234 5678\n")
    const parsed = parseWaOrder(text, TODAY)
    expect(parsed.shippingMethod).toBe("pick_up")
    expect(parsed.name).toBe("Budi")
    expect(parsed.phone).toBe("085712345678")
  })

  it("opsi kirim yang ditebalkan dianggap dipilih", () => {
    const parsed = parseWaOrder(PERSONAL_TEMPLATE.replace("- Instant\n", "- *Instant*\n"), TODAY)
    expect(parsed.shippingMethod).toBe("instant")
  })

  it("nomor yang bukan nomor HP tetap disimpan mentah untuk dicek", () => {
    const parsed = parseWaOrder(PERSONAL_TEMPLATE.replace("No.Telp:\n", "No.Telp: 12345\n"), TODAY)
    expect(parsed.phone).toBeNull()
    expect(parsed.phoneRaw).toBe("12345")
  })

  it("isian di baris berikutnya setelah label kosong", () => {
    const parsed = parseWaOrder(
      PERSONAL_TEMPLATE.replace("Nama Lengkap:\n", "Nama Lengkap:\nDewi Lestari\n"),
      TODAY,
    )
    expect(parsed.name).toBe("Dewi Lestari")
    expect(parsed.phone).toBeNull()
  })
})

describe("parseDeliveryDate", () => {
  it.each([
    ["25/10/2026", "2026-10-25"],
    ["25-10-26", "2026-10-25"],
    ["25.10", "2026-10-25"],
    ["Sabtu, 25 Oktober 2026", "2026-10-25"],
    ["25 okt", "2026-10-25"],
    ["2 Januari", "2027-01-02"],
    ["besok", "2026-10-25"],
    ["hari ini", "2026-10-24"],
  ])("%s → %s", (raw, expected) => {
    expect(parseDeliveryDate(raw, TODAY)).toBe(expected)
  })

  it("tanggal yang tidak ada atau tidak terbaca → null", () => {
    expect(parseDeliveryDate("31/02/2026", TODAY)).toBeNull()
    expect(parseDeliveryDate("secepatnya", TODAY)).toBeNull()
  })
})
