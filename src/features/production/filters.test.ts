import { describe, expect, it } from "vitest"

import { isSelectable, parseProductionKind } from "./filters"

describe("filter Produksi", () => {
  it("jenis dari URL; nilai lain diabaikan", () => {
    expect(parseProductionKind({ jenis: "made_to_order" })).toBe("made_to_order")
    expect(parseProductionKind({ jenis: ["po", "ready_stock"] })).toBe("po")
    expect(parseProductionKind({ jenis: "mto" })).toBeUndefined()
    expect(parseProductionKind({})).toBeUndefined()
  })

  it("yang bisa dipilih massal hanya Baru dan Diproses", () => {
    expect(isSelectable("baru")).toBe(true)
    expect(isSelectable("diproses")).toBe(true)
    expect(isSelectable("siap_packing")).toBe(false)
    expect(isSelectable("siap_kirim")).toBe(false)
  })
})
