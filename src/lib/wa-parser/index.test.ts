import { describe, expect, it } from "vitest"

import { kindFrom, marketplaceFrom, parseDeliveryDate, parseWaOrder } from "./index"
import {
  FO1_TEMPLATE,
  HADIAH_SAMPLE,
  HADIAH_TEMPLATE,
  OLSHOP_SAMPLE,
  OLSHOP_TEMPLATE,
  PERSONAL_SAMPLE,
  PERSONAL_TEMPLATE,
} from "./templates"

const TODAY = "2026-10-24"

describe("parseWaOrder: pesanan Personal", () => {
  const parsed = parseWaOrder(PERSONAL_SAMPLE, TODAY)

  it("membaca data customer, alamat dua baris, dan tanggal kirim", () => {
    expect(parsed.type).toBe("normal")
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
    expect(parsed.type).toBe("hampers")
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
    [PERSONAL_TEMPLATE, "normal"],
    [HADIAH_TEMPLATE, "hampers"],
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
      /Pilih Metode Pengiriman\s*:\s*\n/,
      "Pilih Metode Pengiriman : Pick up\n",
    )
      .replace(/Nama (Lengkap|Penerima):/, "*Nama Penerima:* Budi")
      .replace(/No\.Telp:\s*\n/, "No. HP: 0857 1234 5678\n")
    const parsed = parseWaOrder(text, TODAY)
    expect(parsed.shippingMethod).toBe("pick_up")
    expect(parsed.name).toBe("Budi")
    expect(parsed.phone).toBe("085712345678")
  })

  it("opsi kirim yang ditebalkan dianggap dipilih", () => {
    const parsed = parseWaOrder(PERSONAL_TEMPLATE.replace(/- Instant\s*\n/, "- *Instant*\n"), TODAY)
    expect(parsed.shippingMethod).toBe("instant")
  })

  it("nomor yang bukan nomor HP tetap disimpan mentah untuk dicek", () => {
    const parsed = parseWaOrder(PERSONAL_TEMPLATE.replace(/No\.Telp:\s*\n/, "No.Telp: 12345\n"), TODAY)
    expect(parsed.phone).toBeNull()
    expect(parsed.phoneRaw).toBe("12345")
  })

  it("isian di baris berikutnya setelah label kosong", () => {
    const parsed = parseWaOrder(
      PERSONAL_TEMPLATE.replace(/Nama (Lengkap|Penerima):\s*\n/, "Nama Penerima:\nDewi Lestari\n"),
      TODAY,
    )
    expect(parsed.name).toBe("Dewi Lestari")
    expect(parsed.phone).toBeNull()
  })
})

describe("parseWaOrder: template Olshop", () => {
  const parsed = parseWaOrder(OLSHOP_SAMPLE, TODAY)

  it("membaca marketplace, tanggal, penerima, dan nomor invoice", () => {
    expect(parsed.isMarketplace).toBe(true)
    expect(parsed.marketplace).toBe("shopee")
    expect(parsed.deliveryDate).toBe("2026-10-27")
    expect(parsed.name).toBe("Nadia Rahma")
    expect(parsed.invoiceNo).toBe("2610270ABCDEF")
  })

  it("Nama Penerima di template Olshop bukan pesanan Hadiah", () => {
    expect(parsed.type).toBe("normal")
    expect(parsed.senderName).toBeNull()
  })

  it("menu terbaca dan request di bawah menu tidak dianggap menu", () => {
    expect(parsed.items).toEqual([
      { name: "Spaghetti Classico Bologna Brulee", size: "large", qty: 1 },
      { name: "Not Your Mac and Cheese", size: "regular", qty: 2 },
      { name: "Choco Bon Bon", size: "single", qty: 1 },
    ])
    expect(parsed.request).toBe("Saus dipisah\nTanpa sendok plastik")
  })

  it("template kosong: marketplace belum dipilih, tidak menebak apa pun", () => {
    const empty = parseWaOrder(OLSHOP_TEMPLATE, TODAY)
    expect(empty.isMarketplace).toBe(true)
    expect(empty.marketplace).toBeNull()
    expect(empty.name).toBeNull()
    expect(empty.invoiceNo).toBeNull()
    expect(empty.deliveryDate).toBeNull()
    expect(empty.request).toBeNull()
    expect(empty.items).toEqual([])
  })

  it("template WA biasa bukan Olshop", () => {
    expect(parseWaOrder(PERSONAL_SAMPLE, TODAY).isMarketplace).toBe(false)
    expect(parseWaOrder(HADIAH_SAMPLE, TODAY).isMarketplace).toBe(false)
  })
})

describe("marketplaceFrom", () => {
  it.each([
    ["Shopee", "shopee"],
    ["tokopedia", "tokopedia"],
    ["Tokped", "tokopedia"],
    ["Tokopedia/Shopee", null],
    ["", null],
  ] as const)("%s → %s", (text, expected) => {
    expect(marketplaceFrom(text)).toBe(expected)
  })
})

describe("jenis pesanan", () => {
  it.each([
    ["PO", "po"],
    ["Pre Order", "po"],
    ["pre-order tgl 20", "po"],
    ["Ready Stock", "ready_stock"],
    ["ready", "ready_stock"],
    ["Made to Order", "made_to_order"],
    ["may to order", "made_to_order"],
    ["MTO", "made_to_order"],
    ["PO / Ready Stock / Made to Order", null],
    ["", null],
  ] as const)("%s → %s", (text, expected) => {
    expect(kindFrom(text)).toBe(expected)
  })

  it("dibaca dari label Jenis Pesanan; tanpa label = null", () => {
    expect(
      parseWaOrder(
        `Jenis Pesanan : Ready Stock
${PERSONAL_SAMPLE}`,
        TODAY,
      ).kind,
    ).toBe("ready_stock")
    expect(parseWaOrder(PERSONAL_SAMPLE, TODAY).kind).toBeNull()
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

describe("parseWaOrder: kategori menu baru dari Owner", () => {
  it("judul bagian yang tidak dikenal dibaca sebagai kategori satu ukuran", () => {
    const text = PERSONAL_SAMPLE.replace(
      "Special Bundle\nBundle of 3 :",
      "Special Bundle\nBundle of 3 :\n\nEvent Natal\nLasagna Natal : 2\n\nEvent Natal Large\nPasta Natal : 1",
    )
    const parsed = parseWaOrder(text, TODAY)
    expect(parsed.items).toContainEqual({ name: "Lasagna Natal", size: "single", qty: 2 })
    expect(parsed.items).toContainEqual({ name: "Pasta Natal", size: "large", qty: 1 })
    // Menu lama tetap terbaca seperti biasa.
    expect(parsed.items).toContainEqual({ name: "Choco Bon Bon", size: "single", qty: 2 })
  })
})

describe("parseWaOrder: Template Baru FO1, FO2, FO3", () => {
  const FO1_TEXT = `#DetailFO1
Tanggal Pengiriman: 15/12/2026
Jenis: PO
Tipe Box: NORMAL

Untuk pemesanan boleh dilengkapi ya kak 🤗

Nama Penerima: Bima Santoso
Nama Pengirim (Jika ada): Anita
No.Telp: 081234567890
Alamat Lengkap: Jl Riau No 45 Bandung
Tanggal kirim: 15/12/2026

Kartu Ucapan (Jika ada)
To: Bima
Wishes: Selamat ulang tahun!
From: Anita

Pilih Metode Pengiriman : 
- Instant ✅

Request (Jika ada): Jangan terlalu pedas

——

Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Spaghetti Classico Bologna Brulee : 2
B. Not Your Mac and Cheese  : 

Size Regular
A. Spaghetti Classico Bologna Brulee : 1
B. Not Your Mac and Cheese  : 

Dessert
Choco Bon Bon : 1

Special Bundle
Bundle of 3 : `

  it("FO1 (NORMAL): membaca tipe normal, jenis PO, customer, ucapan, dan menu", () => {
    const parsed = parseWaOrder(FO1_TEXT, TODAY)
    expect(parsed.type).toBe("normal")
    expect(parsed.kind).toBe("po")
    expect(parsed.name).toBe("Bima Santoso")
    expect(parsed.senderName).toBe("Anita")
    expect(parsed.phone).toBe("081234567890")
    expect(parsed.address).toBe("Jl Riau No 45 Bandung")
    expect(parsed.deliveryDate).toBe("2026-12-15")
    expect(parsed.cardTo).toBe("Bima")
    expect(parsed.cardWishes).toBe("Selamat ulang tahun!")
    expect(parsed.cardFrom).toBe("Anita")
    expect(parsed.shippingMethod).toBe("instant")
    expect(parsed.request).toBe("Jangan terlalu pedas")
    expect(parsed.items).toEqual([
      { name: "Spaghetti Classico Bologna Brulee", size: "large", qty: 2 },
      { name: "Spaghetti Classico Bologna Brulee", size: "regular", qty: 1 },
      { name: "Choco Bon Bon", size: "single", qty: 1 },
    ])
  })

  const FO2_TEXT = `#DetailFO2
Tanggal Pengiriman: 24/12/2026
Jenis: RS
Tipe Box: HAMPERS

Untuk pemesanan boleh dilengkapi ya kak 🤗

Nama Penerima: Sarah Jessica
Nama Pengirim: Dimas
No.Telp: 081987654321
Alamat Lengkap: Jl Juanda No 10 Bandung
Tanggal kirim: 24/12/2026

Kartu Ucapan (Template Christmas)
To: Sarah
From: Dimas

Pilih Metode Pengiriman : 
- Kurir Internal Burnt Butter (Pengiriman jam 09.00-17.00, tidak dapat request jam, mengikuti rute kurir) ✅

Request (Jika ada): Pita warna merah

——

Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Classico Red : 2
B. Mac & Joy  :  1
C. Melted Cheese  : 
E. Holy E Olio  : 1

Size Regular
A. Classico Red : 
B. Mac & Joy  :  
C. Melted Cheese  : 
E. Holy E Olio  : `

  it("FO2 (HAMPERS): membaca tipe hampers, jenis ready_stock dari RS, menu hampers", () => {
    const parsed = parseWaOrder(FO2_TEXT, TODAY)
    expect(parsed.type).toBe("hampers")
    expect(parsed.kind).toBe("ready_stock")
    expect(parsed.name).toBe("Sarah Jessica")
    expect(parsed.senderName).toBe("Dimas")
    expect(parsed.phone).toBe("081987654321")
    expect(parsed.deliveryDate).toBe("2026-12-24")
    expect(parsed.cardTo).toBe("Sarah")
    expect(parsed.cardFrom).toBe("Dimas")
    expect(parsed.shippingMethod).toBe("kurir_internal")
    expect(parsed.request).toBe("Pita warna merah")
    expect(parsed.items).toEqual([
      { name: "Classico Red", size: "large", qty: 2 },
      { name: "Mac & Joy", size: "large", qty: 1 },
      { name: "Holy E Olio", size: "large", qty: 1 },
    ])
  })

  const FO3_TEXT = `#DetailFO3
Tanggal Pengiriman: 25/12/2026
Jenis: MTO
Tipe Box: NORMAL & HAMPERS

Untuk pemesanan boleh dilengkapi ya kak 🤗

Nama Penerima: Keluarga Hartono
Nama Pengirim: Hendra
No.Telp: 081333444555
Alamat Lengkap: Komplek Dago Asri No 8
Tanggal kirim: 25/12/2026

Kartu Ucapan (Template Christmas)
To: Hartono Family
From: Hendra

Pilih Metode Pengiriman : 
- Pick Up ✅

Request (Jika ada): Ambil jam 11 siang

——

Pilihan Menu (mohon meng-isi jumlah):

#BOX NORMAL

Size Large
A. Spaghetti Classico Bologna Brulee: 1
B. Not Your Mac and Cheese: 
C. Potato Gratin Lasagna: 
D. Melt My Mac and Cheese: 
E. Spaghetti Aglio E Olio: 

Size Regular
A. Spaghetti Classico Bologna Brulee: 
B. Not Your Mac and Cheese: 
C. Potato Gratin Lasagna: 
D. Melt My Mac and Cheese: 
E. Spaghetti Aglio E Olio: 

Dessert
Choco Bon Bon: 2

Special Bundle
Bundle of 3: 

#BOX CHRISTMAS

Size Large
A. Classico Red : 1
B. Mac & Joy  :  
C. Melted Cheese  : 1
E. Holy E Olio  : 

Size Regular
A. Classico Red : 
B. Mac & Joy  :  1
C. Melted Cheese  : 
E. Holy E Olio  : `

  it("FO3 (NORMAL & HAMPERS): membaca tipe normal_hampers, jenis MTO, menu gabungan", () => {
    const parsed = parseWaOrder(FO3_TEXT, TODAY)
    expect(parsed.type).toBe("normal_hampers")
    expect(parsed.kind).toBe("made_to_order")
    expect(parsed.name).toBe("Keluarga Hartono")
    expect(parsed.senderName).toBe("Hendra")
    expect(parsed.phone).toBe("081333444555")
    expect(parsed.deliveryDate).toBe("2026-12-25")
    expect(parsed.cardTo).toBe("Hartono Family")
    expect(parsed.cardFrom).toBe("Hendra")
    expect(parsed.shippingMethod).toBe("pick_up")
    expect(parsed.request).toBe("Ambil jam 11 siang")
    expect(parsed.items).toEqual([
      { name: "Spaghetti Classico Bologna Brulee", size: "large", qty: 1 },
      { name: "Choco Bon Bon", size: "single", qty: 2 },
      { name: "Classico Red", size: "large", qty: 1 },
      { name: "Melted Cheese", size: "large", qty: 1 },
      { name: "Mac & Joy", size: "regular", qty: 1 },
    ])
  })
})

describe("parseWaOrder: template FO dengan dua label tanggal", () => {
  const fill = (top: string, bottom: string) =>
    FO1_TEMPLATE.replace("Tanggal Pengiriman:", `Tanggal Pengiriman: ${top}`).replace(
      "Tanggal kirim:",
      `Tanggal kirim: ${bottom}`,
    )

  it("hanya baris atas diisi: tanggal tidak tertimpa label kosong di bawah", () => {
    expect(parseWaOrder(fill("12/11/2026", ""), TODAY).deliveryDate).toBe("2026-11-12")
  })

  it("hanya baris bawah diisi", () => {
    expect(parseWaOrder(fill("", "13/11/2026"), TODAY).deliveryDate).toBe("2026-11-13")
  })

  it("keduanya diisi: baris terakhir yang dipakai", () => {
    expect(parseWaOrder(fill("12/11/2026", "14/11/2026"), TODAY).deliveryDate).toBe("2026-11-14")
  })
})
