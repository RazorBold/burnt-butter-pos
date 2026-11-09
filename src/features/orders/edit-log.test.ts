import { describe, expect, it } from "vitest"

import {
  type DetailSnapshot,
  describeDetailChanges,
  describeItemChanges,
  describeNoteChange,
} from "./edit-log"

const base: DetailSnapshot = {
  name: "Siti",
  phone: "081234567890",
  address: "Jl. Melati 1",
  deliveryDate: "2026-11-10",
  kind: "po",
  type: "personal",
  method: "instant",
  request: null,
  senderName: null,
  cardTo: null,
  cardWishes: null,
  cardFrom: null,
  marketplaceOrderNo: null,
  total: 100_000,
}

describe("describeDetailChanges", () => {
  it("tanpa perubahan: kosong", () => {
    expect(describeDetailChanges(base, { ...base })).toEqual([])
  })

  it("mencatat isian yang berubah", () => {
    expect(
      describeDetailChanges(base, {
        ...base,
        address: "Jl. Mawar 2",
        deliveryDate: "2026-11-12",
        kind: "ready_stock",
        method: "pick_up",
        request: "Saus dipisah",
        cardWishes: "HBD",
      }),
    ).toEqual([
      "Alamat diubah",
      "Tanggal kirim: 10/11/2026 → 12/11/2026",
      "Jenis: PO → Ready Stock",
      "Pengiriman: Instant → Pick Up",
      "Request: kosong → Saus dipisah",
      "Kartu ucapan diubah",
    ])
  })
})

describe("describeItemChanges", () => {
  const bolo = { menuVariantId: "a", label: "Bolo (Large)", qty: 1, note: null }
  const mac = { menuVariantId: "b", label: "Mac (Regular)", qty: 2, note: null }

  it("tambah, ganti jumlah, catatan, hapus", () => {
    expect(
      describeItemChanges(
        [bolo, mac],
        [
          { ...bolo, qty: 3, note: "pedas" },
          { menuVariantId: "c", label: "Choco Bon Bon", qty: 1, note: null },
        ],
      ),
    ).toEqual([
      "Bolo (Large): 1 → 3",
      "Catatan Bolo (Large): pedas",
      "Tambah 1x Choco Bon Bon",
      "Hapus 2x Mac (Regular)",
    ])
  })

  it("tanpa perubahan: kosong", () => {
    expect(describeItemChanges([bolo], [{ ...bolo }])).toEqual([])
  })
})

describe("describeNoteChange", () => {
  it("baru, ubah, hapus, sama", () => {
    expect(describeNoteChange(null, "Add on keju")).toEqual(["Catatan: Add on keju"])
    expect(describeNoteChange("A", "B")).toEqual(["Catatan: A → B"])
    expect(describeNoteChange("A", null)).toEqual(["Catatan dihapus"])
    expect(describeNoteChange(null, "")).toEqual([])
  })
})
