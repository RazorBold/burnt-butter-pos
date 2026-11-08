import { describe, expect, it } from "vitest"

import {
  isCookingStart,
  isEditable,
  isMenuEditable,
  isPackingStep,
  isUrgent,
  manualStatuses,
  nextStatuses,
  sentStatusFor,
  shipmentStatusFor,
  statusSkipReason,
  urgentFirst,
} from "./status"

describe("nextStatuses", () => {
  it("maju satu langkah, mundur satu langkah, dan batal", () => {
    expect(nextStatuses("baru", "instant")).toEqual(["diproses", "dibatalkan"])
    expect(nextStatuses("diproses", "instant")).toEqual(["siap_packing", "baru", "dibatalkan"])
    expect(nextStatuses("siap_packing", "instant")).toEqual([
      "siap_kirim",
      "diproses",
      "dibatalkan",
    ])
    expect(nextStatuses("siap_kirim", "kurir_internal")).toEqual([
      "dikirim",
      "siap_packing",
      "dibatalkan",
    ])
    expect(nextStatuses("dikirim", "kurir_internal")).toEqual(["selesai", "siap_kirim"])
  })

  it("Pick Up dari Siap Kirim langsung Selesai", () => {
    expect(nextStatuses("siap_kirim", "pick_up")).toEqual(["selesai", "siap_packing", "dibatalkan"])
    expect(nextStatuses("selesai", "pick_up")).toEqual([])
  })

  it("Dibatalkan hanya bisa dibuka lagi sebagai Baru; Selesai final", () => {
    expect(nextStatuses("dibatalkan", "instant")).toEqual(["baru"])
    expect(nextStatuses("selesai", "instant")).toEqual([])
  })
})

describe("shipmentStatusFor", () => {
  it("status kirim mulai saat Siap Kirim, sesuai metode (PRD)", () => {
    expect(shipmentStatusFor("baru", "instant")).toBeNull()
    expect(shipmentStatusFor("diproses", "kurir_internal")).toBeNull()
    expect(shipmentStatusFor("siap_kirim", "kurir_internal")).toBe("siap_dikirim")
    expect(shipmentStatusFor("siap_kirim", "instant")).toBe("menunggu_kurir")
    expect(shipmentStatusFor("siap_kirim", "pick_up")).toBe("siap_diambil")
  })

  it("Dikirim: kurir internal dalam perjalanan, instant dikirim; selesai dan batal", () => {
    expect(shipmentStatusFor("dikirim", "kurir_internal")).toBe("dalam_perjalanan")
    expect(shipmentStatusFor("dikirim", "instant")).toBe("dikirim")
    expect(shipmentStatusFor("selesai", "pick_up")).toBe("selesai")
    expect(shipmentStatusFor("dibatalkan", "instant")).toBeNull()
  })
})

describe("isEditable", () => {
  it("data pesanan bisa diubah sampai Siap Kirim", () => {
    expect(isEditable("siap_kirim")).toBe(true)
    expect(isEditable("dikirim")).toBe(false)
    expect(isEditable("dibatalkan")).toBe(false)
  })
})

describe("statusSkipReason", () => {
  const order = (
    status: Parameters<typeof statusSkipReason>[0]["status"],
    method: Parameters<typeof statusSkipReason>[0]["method"] = "instant",
    hasCourier = false,
  ) => ({ status, method, hasCourier })

  it("langkah yang sah tidak dilewati", () => {
    expect(statusSkipReason(order("baru"), "diproses")).toBeNull()
    expect(statusSkipReason(order("siap_kirim"), "dibatalkan")).toBeNull()
  })

  it("langkah yang tidak sah menyebut status sekarang", () => {
    expect(statusSkipReason(order("selesai"), "diproses")).toBe("status Selesai")
    expect(statusSkipReason(order("baru"), "siap_kirim")).toBe("status Baru")
    expect(statusSkipReason(order("dikirim"), "dibatalkan")).toBe("status Dikirim")
  })

  it("Pick Up tidak pernah Dikirim", () => {
    expect(statusSkipReason(order("siap_kirim", "pick_up"), "dikirim")).toBe(
      "Pick Up, tidak dikirim",
    )
  })

  it("requireCourier: Kurir Internal tanpa kurir dilewati, Instant tidak", () => {
    const rules = { requireCourier: true }
    expect(statusSkipReason(order("siap_kirim", "kurir_internal"), "dikirim", rules)).toBe(
      "belum ada kurir",
    )
    expect(
      statusSkipReason(order("siap_kirim", "kurir_internal", true), "dikirim", rules),
    ).toBeNull()
    expect(statusSkipReason(order("siap_kirim", "instant"), "dikirim", rules)).toBeNull()
    expect(statusSkipReason(order("siap_kirim", "kurir_internal"), "dikirim")).toBeNull()
  })

  it("limitTo membatasi status asal dan tujuan", () => {
    const rules = { limitTo: ["baru", "diproses", "siap_packing"] as const }
    expect(statusSkipReason(order("diproses"), "siap_packing", rules)).toBeNull()
    expect(statusSkipReason(order("siap_packing"), "siap_kirim", rules)).toBe("status Siap Packing")
  })
})

describe("Ekspedisi (olshop)", () => {
  it("cukup belum dikirim lalu sudah dikirim: Siap Kirim langsung Selesai, tanpa resi", () => {
    expect(nextStatuses("siap_kirim", "ekspedisi")).toEqual([
      "selesai",
      "siap_packing",
      "dibatalkan",
    ])
    expect(shipmentStatusFor("siap_kirim", "ekspedisi")).toBe("siap_dikirim")
    expect(shipmentStatusFor("selesai", "ekspedisi")).toBe("selesai")
    const order = { status: "siap_kirim", method: "ekspedisi", hasCourier: false } as const
    expect(statusSkipReason(order, "selesai", { requireCourier: true })).toBeNull()
    expect(statusSkipReason(order, "dikirim")).toBe("status Siap Kirim")
  })

  it("Tandai Dikirim: Ekspedisi ke Selesai, metode antar lain ke Dikirim", () => {
    expect(sentStatusFor("ekspedisi")).toBe("selesai")
    expect(sentStatusFor("instant")).toBe("dikirim")
    expect(sentStatusFor("kurir_internal")).toBe("dikirim")
  })

  it("Ekspedisi yang terlanjur Dikirim tetap bisa diselesaikan", () => {
    expect(nextStatuses("dikirim", "ekspedisi")).toEqual(["selesai"])
  })
})

describe("Packing (Siap Packing → Siap Kirim)", () => {
  const order = { status: "siap_packing", method: "instant", hasCourier: false } as const

  it("selesai masak = Siap Packing; langkah packing dikenali", () => {
    expect(nextStatuses("diproses", "pick_up")[0]).toBe("siap_packing")
    expect(isPackingStep("siap_packing", "siap_kirim")).toBe(true)
    expect(isPackingStep("siap_kirim", "siap_packing")).toBe(false)
  })

  it("Siap Kirim hanya lewat menu Packaging (rules.packing)", () => {
    expect(statusSkipReason(order, "siap_kirim")).toBe("belum di-packing")
    expect(statusSkipReason(order, "siap_kirim", { packing: true })).toBeNull()
    expect(statusSkipReason(order, "diproses")).toBeNull()
  })

  it("dropdown Ubah Status tidak menawarkan langkah packing", () => {
    expect(manualStatuses("siap_packing", "instant")).toEqual(["diproses", "dibatalkan"])
    expect(manualStatuses("siap_kirim", "instant")).toEqual([
      "dikirim",
      "siap_packing",
      "dibatalkan",
    ])
  })

  it("data pesanan masih bisa diubah saat Siap Packing", () => {
    expect(isEditable("siap_packing")).toBe(true)
  })
})

describe("Pembayaran sebelum masak dan ubah menu", () => {
  const order = { status: "baru", method: "instant", hasCourier: false } as const

  it("belum lunas belum boleh mulai dimasak; lunas boleh", () => {
    expect(isCookingStart("baru", "diproses")).toBe(true)
    expect(statusSkipReason({ ...order, paid: false }, "diproses")).toBe("belum lunas")
    expect(statusSkipReason({ ...order, paid: true }, "diproses")).toBeNull()
    // Tanpa info bayar (mis. pemeriksaan di klien) aturan ini tidak dipakai.
    expect(statusSkipReason(order, "diproses")).toBeNull()
  })

  it("belum lunas tetap boleh dibatalkan", () => {
    expect(statusSkipReason({ ...order, paid: false }, "dibatalkan")).toBeNull()
  })

  it("menu bisa diubah saat Baru dan Diproses, terkunci setelah selesai masak", () => {
    expect(isMenuEditable("baru")).toBe(true)
    expect(isMenuEditable("diproses")).toBe(true)
    for (const status of [
      "siap_packing",
      "siap_kirim",
      "dikirim",
      "selesai",
      "dibatalkan",
    ] as const) {
      expect(isMenuEditable(status)).toBe(false)
    }
  })
})

describe("Urgent", () => {
  it("label urgent hanya untuk pesanan yang masih berjalan", () => {
    const at = new Date("2026-11-08T03:00:00Z")
    expect(isUrgent({ urgentAt: at, status: "diproses" })).toBe(true)
    expect(isUrgent({ urgentAt: null, status: "diproses" })).toBe(false)
    expect(isUrgent({ urgentAt: at, status: "selesai" })).toBe(false)
    expect(isUrgent({ urgentAt: at, status: "dibatalkan" })).toBe(false)
  })

  it("urgent didahulukan, sisanya tetap urutan semula", () => {
    const at = new Date()
    const list = [
      { id: "a", urgentAt: null, status: "baru" as const },
      { id: "b", urgentAt: at, status: "baru" as const },
      { id: "c", urgentAt: null, status: "baru" as const },
      { id: "d", urgentAt: at, status: "selesai" as const },
    ]
    expect(urgentFirst(list).map((order) => order.id)).toEqual(["b", "a", "c", "d"])
  })
})
