import { describe, expect, it } from "vitest"

import { filterParams, parseOrderFilters, previousRange } from "./filters"

const TODAY = "2026-10-24"

describe("parseOrderFilters", () => {
  it("tanpa parameter: hari ini, halaman 1, tanpa filter", () => {
    expect(parseOrderFilters({}, TODAY)).toEqual({
      q: undefined,
      from: TODAY,
      to: TODAY,
      type: undefined,
      status: undefined,
      method: undefined,
      page: 1,
    })
  })

  it("membaca semua filter yang valid", () => {
    expect(
      parseOrderFilters(
        {
          q: " Siti ",
          dari: "2026-10-01",
          sampai: "2026-10-24",
          tipe: "hadiah",
          status: "siap_kirim",
          kirim: "pick_up",
          hal: "3",
        },
        TODAY,
      ),
    ).toEqual({
      q: "Siti",
      from: "2026-10-01",
      to: "2026-10-24",
      type: "hadiah",
      status: "siap_kirim",
      method: "pick_up",
      page: 3,
    })
  })

  it("nilai asing diabaikan, tanggal terbalik ditukar, satu tanggal = satu hari", () => {
    const parsed = parseOrderFilters(
      { tipe: "grosir", status: "hilang", kirim: "kapal", hal: "-2", dari: "2026-02-30" },
      TODAY,
    )
    expect(parsed).toMatchObject({ type: undefined, status: undefined, method: undefined, page: 1 })
    expect(parsed.from).toBe(TODAY)
    expect(parseOrderFilters({ dari: "2026-10-20", sampai: "2026-10-10" }, TODAY)).toMatchObject({
      from: "2026-10-10",
      to: "2026-10-20",
    })
    expect(parseOrderFilters({ sampai: "2026-10-20" }, TODAY)).toMatchObject({
      from: "2026-10-20",
      to: "2026-10-20",
    })
  })

  it("rentang dibatasi 366 hari", () => {
    expect(parseOrderFilters({ dari: "2020-01-01", sampai: "2026-10-24" }, TODAY).from).toBe(
      "2025-10-24",
    )
  })
})

describe("previousRange dan filterParams", () => {
  it("periode pembanding sepanjang rentang, tepat sebelumnya", () => {
    expect(previousRange("2026-10-24", "2026-10-24")).toEqual({
      from: "2026-10-23",
      to: "2026-10-23",
    })
    expect(previousRange("2026-10-01", "2026-10-31")).toEqual({
      from: "2026-08-31",
      to: "2026-09-30",
    })
  })

  it("rentang hari ini tidak ditulis ke URL", () => {
    const filters = parseOrderFilters({ status: "baru" }, TODAY)
    expect(filterParams(filters, TODAY)).toEqual({
      q: undefined,
      dari: undefined,
      sampai: undefined,
      tipe: undefined,
      status: "baru",
      kirim: undefined,
    })
  })
})
