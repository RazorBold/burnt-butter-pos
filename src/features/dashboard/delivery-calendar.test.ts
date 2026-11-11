import { describe, expect, it } from "vitest"

import {
  busyLevel,
  calendarRange,
  calendarWeeks,
  parseCalendarMonth,
  shiftMonth,
} from "./delivery-calendar"

describe("parseCalendarMonth", () => {
  it("bulan valid dipakai, selain itu bulan hari ini", () => {
    expect(parseCalendarMonth("2026-12", "2026-11-11")).toBe("2026-12")
    expect(parseCalendarMonth("2026-13", "2026-11-11")).toBe("2026-11")
    expect(parseCalendarMonth(undefined, "2026-11-11")).toBe("2026-11")
  })
})

describe("shiftMonth", () => {
  it("melewati batas tahun", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
    expect(shiftMonth("2026-01", -1)).toBe("2025-12")
  })
})

describe("calendarWeeks", () => {
  it("November 2026 mulai Senin 26 Okt dan berakhir Minggu 6 Des", () => {
    const weeks = calendarWeeks("2026-11")
    expect(weeks).toHaveLength(6)
    expect(weeks[0][0]).toEqual({ date: "2026-10-26", inMonth: false })
    expect(weeks[0][6]).toEqual({ date: "2026-11-01", inMonth: true })
    expect(weeks.at(-1)![6].date).toBe("2026-12-06")
    expect(calendarRange("2026-11")).toEqual({ from: "2026-10-26", to: "2026-12-06" })
  })

  it("bulan yang mulai Senin tidak menambah minggu kosong di depan", () => {
    // 1 Juni 2026 = Senin.
    expect(calendarWeeks("2026-06")[0][0].date).toBe("2026-06-01")
  })
})

describe("busyLevel", () => {
  it("relatif terhadap hari tersibuk", () => {
    expect(busyLevel(0, 9)).toBe(0)
    expect(busyLevel(2, 9)).toBe(1)
    expect(busyLevel(5, 9)).toBe(2)
    expect(busyLevel(9, 9)).toBe(3)
  })
})
