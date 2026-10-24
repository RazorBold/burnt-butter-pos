import { describe, expect, it } from "vitest"

import { pageWindow } from "./table-pagination"

describe("pageWindow", () => {
  it("maksimal 5 nomor, berpusat di halaman aktif", () => {
    expect(pageWindow(1, 2)).toEqual([1, 2])
    expect(pageWindow(1, 9)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(5, 9)).toEqual([3, 4, 5, 6, 7])
    expect(pageWindow(9, 9)).toEqual([5, 6, 7, 8, 9])
  })
})
