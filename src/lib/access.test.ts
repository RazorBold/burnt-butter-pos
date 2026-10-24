import { describe, expect, it } from "vitest"

import { canAccessPath, safeNextPath } from "./access"

describe("canAccessPath", () => {
  it("Admin boleh membuka semua halaman", () => {
    expect(canAccessPath("admin", "/laporan/penjualan")).toBe(true)
    expect(canAccessPath("admin", "/halaman-baru")).toBe(true)
  })

  it("membatasi halaman per role", () => {
    expect(canAccessPath("kasir", "/pesanan")).toBe(true)
    expect(canAccessPath("kasir", "/laporan")).toBe(false)
    expect(canAccessPath("produksi", "/produksi")).toBe(true)
    expect(canAccessPath("produksi", "/pesanan")).toBe(false)
    expect(canAccessPath("owner", "/laporan/ringkasan")).toBe(true)
  })

  it("User / Staff hanya untuk Admin, Master Data lain untuk semua", () => {
    expect(canAccessPath("admin", "/master-data/user-staff")).toBe(true)
    for (const role of ["kasir", "produksi", "owner"] as const) {
      expect(canAccessPath(role, "/master-data/user-staff")).toBe(false)
      expect(canAccessPath(role, "/master-data/kurir")).toBe(true)
    }
  })

  it("Customer untuk Admin, Kasir, Owner; Pengaturan hanya Admin", () => {
    expect(canAccessPath("kasir", "/master-data/customer")).toBe(true)
    expect(canAccessPath("owner", "/master-data/customer")).toBe(true)
    expect(canAccessPath("produksi", "/master-data/customer")).toBe(false)
    expect(canAccessPath("admin", "/master-data/pengaturan")).toBe(true)
    expect(canAccessPath("kasir", "/master-data/pengaturan")).toBe(false)
  })

  it("mencocokkan per segmen, bukan awalan teks", () => {
    expect(canAccessPath("kasir", "/pesanan-lama")).toBe(false)
  })

  it("semua role boleh membuka dashboard", () => {
    for (const role of ["admin", "kasir", "produksi", "owner"] as const) {
      expect(canAccessPath(role, "/dashboard")).toBe(true)
    }
  })
})

describe("safeNextPath", () => {
  it("menerima path internal", () => {
    expect(safeNextPath("/pesanan?status=baru")).toBe("/pesanan?status=baru")
  })

  it("menolak URL luar dan path aneh", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard")
    expect(safeNextPath("//evil.example")).toBe("/dashboard")
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard")
    expect(safeNextPath(null)).toBe("/dashboard")
  })

  it("tidak mengarahkan balik ke login atau root", () => {
    expect(safeNextPath("/login")).toBe("/dashboard")
    expect(safeNextPath("/")).toBe("/dashboard")
  })
})
