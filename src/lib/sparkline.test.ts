import { describe, expect, it } from "vitest"

import { sparklinePaths } from "./sparkline"

const box = { width: 100, height: 40, padTop: 0 }

describe("sparklinePaths", () => {
  it("butuh minimal dua nilai", () => {
    expect(sparklinePaths([], box)).toBeNull()
    expect(sparklinePaths([5], box)).toBeNull()
    expect(sparklinePaths([5, Number.NaN], box)).toBeNull()
  })

  it("nilai terbesar di atas, terkecil di dasar", () => {
    const paths = sparklinePaths([0, 10], box)!
    expect(paths.line.startsWith("M0,40")).toBe(true)
    expect(paths.line.endsWith("100,0")).toBe(true)
  })

  it("seri datar digambar di tengah tinggi", () => {
    const paths = sparklinePaths([3, 3, 3], box)!
    expect(paths.line.startsWith("M0,20")).toBe(true)
  })

  it("area ditutup ke dasar kotak", () => {
    const paths = sparklinePaths([1, 4, 2], box)!
    expect(paths.area.endsWith("L100,40L0,40Z")).toBe(true)
  })

  it("titik kontrol tidak melewati batas atas/bawah (monoton)", () => {
    const paths = sparklinePaths([0, 10, 10, 0, 5], box)!
    const coords = [...paths.line.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]))
    expect(Math.min(...coords)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...coords)).toBeLessThanOrEqual(40)
  })
})
