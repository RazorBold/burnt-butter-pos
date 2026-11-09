import { describe, expect, it } from "vitest"

import { canAccessPath, safeNextPath } from "./access"

describe("canAccessPath", () => {
  it("Admin: semua menu operasional, tanpa Laporan dan Master Data", () => {
    for (const path of [
      "/pesanan",
      "/pembayaran",
      "/produksi",
      "/packaging",
      "/pengiriman",
      "/stok-packaging",
    ]) {
      expect(canAccessPath("admin", path)).toBe(true)
    }
    expect(canAccessPath("admin", "/laporan")).toBe(false)
    expect(canAccessPath("admin", "/master-data/produk-menu")).toBe(false)
    expect(canAccessPath("admin", "/master-data/user-staff")).toBe(false)
    // Halaman yang tidak terdaftar (mis. /dev/komponen) tetap khusus Admin.
    expect(canAccessPath("admin", "/halaman-baru")).toBe(true)
  })

  it("membatasi halaman per role", () => {
    expect(canAccessPath("kasir", "/pesanan")).toBe(true)
    expect(canAccessPath("kasir", "/laporan")).toBe(false)
    expect(canAccessPath("produksi", "/produksi")).toBe(true)
    expect(canAccessPath("produksi", "/pesanan")).toBe(false)
    expect(canAccessPath("owner", "/laporan/ringkasan")).toBe(true)
  })

  it("Packaging untuk Admin dan Produksi saja", () => {
    expect(canAccessPath("admin", "/packaging")).toBe(true)
    expect(canAccessPath("produksi", "/packaging")).toBe(true)
    expect(canAccessPath("kasir", "/packaging")).toBe(false)
    expect(canAccessPath("owner", "/packaging")).toBe(false)
  })

  it("Laporan dan seluruh Master Data khusus Owner", () => {
    for (const path of [
      "/laporan",
      "/master-data",
      "/master-data/kurir",
      "/master-data/customer",
      "/master-data/user-staff",
      "/master-data/pengaturan",
      "/master-data/bahan-baku",
    ]) {
      expect(canAccessPath("owner", path)).toBe(true)
      for (const role of ["admin", "kasir", "produksi"] as const) {
        expect(canAccessPath(role, path)).toBe(false)
      }
    }
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
