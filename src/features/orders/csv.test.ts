import { describe, expect, it } from "vitest"

import { csvCell, type OrderExportRow, ordersToCsv } from "./csv"

describe("csvCell", () => {
  it("teks biasa dan angka apa adanya", () => {
    expect(csvCell("Siti Nurhaliza")).toBe("Siti Nurhaliza")
    expect(csvCell(250000)).toBe("250000")
  })

  it("koma, kutip, dan baris baru dibungkus kutip ganda", () => {
    expect(csvCell("Jl. Melati No. 10, Cilandak")).toBe('"Jl. Melati No. 10, Cilandak"')
    expect(csvCell('rumah "pagar hijau"')).toBe('"rumah ""pagar hijau"""')
    expect(csvCell("baris 1\nbaris 2")).toBe('"baris 1\nbaris 2"')
  })

  it("teks yang terbaca sebagai rumus diberi tanda kutip satu", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)")
    expect(csvCell("-jangan pedas")).toBe("'-jangan pedas")
    expect(csvCell("@kasir")).toBe("'@kasir")
  })
})

describe("ordersToCsv", () => {
  const row: OrderExportRow = {
    orderNo: "BB261025001",
    // 09:12 WIB
    createdAt: new Date("2026-10-25T02:12:00Z"),
    type: "hadiah",
    customerName: "Nadia Rahma",
    phone: "081234567890",
    address: "Jl. Melati No. 10, Cilandak",
    senderName: "Rizky",
    deliveryDate: "2026-10-26",
    method: "kurir_internal",
    status: "diproses",
    paidWith: "BCA",
    items: [
      { menuName: "Spaghetti Classico Bologna Brulee", size: "large", qty: 2 },
      { menuName: "Choco Bon Bon", size: "single", qty: 1 },
    ],
    request: null,
    total: 250000,
    channel: "whatsapp",
    marketplaceOrderNo: null,
    expedition: null,
    trackingNo: null,
  }

  it("baris judul lalu satu baris per pesanan, dengan CRLF", () => {
    const [header, line, end] = ordersToCsv([row]).split("\r\n")
    expect(header).toBe(
      "No. Pesanan,Dibuat (WIB),Tipe,Nama Customer,No. HP,Alamat,Pengirim Hadiah,Tanggal Kirim,Pengiriman,Status,Pembayaran,Dibayar Lewat,Menu,Request,Total (Rp),Sumber,No. Marketplace,Kurir Ekspedisi,Resi",
    )
    expect(line).toBe(
      'BB261025001,2026-10-25 09:12,Hadiah,Nadia Rahma,0812 3456 7890,"Jl. Melati No. 10, Cilandak",Rizky,2026-10-26,Kurir Internal,Diproses,Lunas,BCA,2x Spaghetti Classico Bologna Brulee (Large); 1x Choco Bon Bon,,250000,WhatsApp,,,',
    )
    expect(end).toBe("")
  })

  it("belum bayar dan tanpa alamat", () => {
    const line = ordersToCsv([{ ...row, paidWith: null, address: null, senderName: null }]).split(
      "\r\n",
    )[1]
    expect(line).toContain(",Nadia Rahma,0812 3456 7890,,,2026-10-26,")
    expect(line).toContain(",Belum bayar,,")
  })
})
