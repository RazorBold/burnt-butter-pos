import { describe, expect, it } from "vitest"

import {
  formatHariTanggal,
  formatJam,
  formatRupiah,
  formatTanggal,
  formatTanggalPendek,
  formatWaktuDibuat,
  toJakartaDateString,
} from "./format"

describe("formatRupiah", () => {
  it("memakai titik sebagai pemisah ribuan", () => {
    expect(formatRupiah(4780000)).toBe("Rp 4.780.000")
    expect(formatRupiah(250000)).toBe("Rp 250.000")
    expect(formatRupiah(0)).toBe("Rp 0")
  })

  it("menaruh tanda minus di depan", () => {
    expect(formatRupiah(-50000)).toBe("-Rp 50.000")
  })
})

describe("format tanggal WIB", () => {
  // 21 Okt 2026 02:12 UTC = 09:12 WIB
  const pagi = new Date("2026-10-21T02:12:00Z")
  // 20 Okt 2026 18:30 UTC = 21 Okt 01:30 WIB, beda hari dengan UTC
  const diniHari = new Date("2026-10-20T18:30:00Z")

  it("menampilkan tanggal dan jam dalam Bahasa Indonesia", () => {
    expect(formatTanggal(pagi)).toBe("21 Oktober 2026")
    expect(formatTanggalPendek(pagi)).toBe("21/10/2026")
    expect(formatHariTanggal(pagi)).toBe("Rabu, 21 Oktober 2026")
    expect(formatJam(pagi)).toBe("09:12")
    expect(formatWaktuDibuat(pagi)).toBe("21 Okt 2026, 09:12")
  })

  it("menghitung hari menurut WIB, bukan UTC", () => {
    expect(toJakartaDateString(diniHari)).toBe("2026-10-21")
    expect(formatJam(diniHari)).toBe("01:30")
  })
})
