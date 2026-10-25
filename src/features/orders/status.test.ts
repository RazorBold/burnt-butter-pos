import { describe, expect, it } from "vitest"

import { isEditable, nextStatuses, shipmentStatusFor } from "./status"

describe("nextStatuses", () => {
  it("maju satu langkah, mundur satu langkah, dan batal", () => {
    expect(nextStatuses("baru", "instant")).toEqual(["diproses", "dibatalkan"])
    expect(nextStatuses("diproses", "instant")).toEqual(["siap_kirim", "baru", "dibatalkan"])
    expect(nextStatuses("siap_kirim", "kurir_internal")).toEqual([
      "dikirim",
      "diproses",
      "dibatalkan",
    ])
    expect(nextStatuses("dikirim", "kurir_internal")).toEqual(["selesai", "siap_kirim"])
  })

  it("Pick Up dari Siap Kirim langsung Selesai", () => {
    expect(nextStatuses("siap_kirim", "pick_up")).toEqual(["selesai", "diproses", "dibatalkan"])
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
