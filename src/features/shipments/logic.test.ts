import { describe, expect, it } from "vitest"

import { nextShipmentAction, parseShipmentFilters, stateOf, tabOf } from "./logic"

describe("tabOf", () => {
  it("Perlu Dikirim, Dalam Perjalanan, Selesai", () => {
    expect(tabOf(stateOf(null))).toBe("perlu")
    expect(tabOf("menunggu_kurir")).toBe("perlu")
    expect(tabOf("siap_diambil")).toBe("perlu")
    expect(tabOf("dalam_perjalanan")).toBe("jalan")
    expect(tabOf("dikirim")).toBe("jalan")
    expect(tabOf("selesai")).toBe("selesai")
  })
})

describe("nextShipmentAction", () => {
  it("belum selesai dimasak: belum bisa dikirim", () => {
    expect(
      nextShipmentAction({ method: "instant", orderStatus: "diproses", hasCourier: false }),
    ).toMatchObject({ kind: "blocked" })
  })

  it("Kurir Internal butuh kurir sebelum dikirim", () => {
    expect(
      nextShipmentAction({
        method: "kurir_internal",
        orderStatus: "siap_kirim",
        hasCourier: false,
      }),
    ).toMatchObject({ kind: "blocked", reason: "Pilih kurir dulu lewat Ubah Kurir / Jadwal." })
    expect(
      nextShipmentAction({ method: "kurir_internal", orderStatus: "siap_kirim", hasCourier: true }),
    ).toEqual({ kind: "advance", target: "dikirim", label: "Tandai Dikirim" })
  })

  it("Instant langsung dikirim; Pick Up langsung selesai; lalu Tandai Selesai", () => {
    expect(
      nextShipmentAction({ method: "instant", orderStatus: "siap_kirim", hasCourier: false }),
    ).toMatchObject({ target: "dikirim" })
    expect(
      nextShipmentAction({ method: "pick_up", orderStatus: "siap_kirim", hasCourier: false }),
    ).toEqual({ kind: "advance", target: "selesai", label: "Sudah Diambil" })
    expect(
      nextShipmentAction({ method: "instant", orderStatus: "dikirim", hasCourier: false }),
    ).toMatchObject({ target: "selesai", label: "Tandai Selesai" })
    expect(
      nextShipmentAction({ method: "instant", orderStatus: "selesai", hasCourier: false }),
    ).toBeNull()
  })
})

describe("parseShipmentFilters", () => {
  it("default hari ini, tab Semua; nilai asing diabaikan", () => {
    expect(
      parseShipmentFilters({ tab: "x", metode: "kapal", kurir: "andi" }, "2026-10-25"),
    ).toEqual({
      date: "2026-10-25",
      tab: "semua",
      method: undefined,
      courierId: undefined,
      state: undefined,
      page: 1,
    })
  })

  it("membaca semua filter", () => {
    expect(
      parseShipmentFilters(
        { tanggal: "2026-10-26", tab: "jalan", metode: "instant", status: "dikirim", hal: "2" },
        "2026-10-25",
      ),
    ).toMatchObject({
      date: "2026-10-26",
      tab: "jalan",
      method: "instant",
      state: "dikirim",
      page: 2,
    })
  })
})
