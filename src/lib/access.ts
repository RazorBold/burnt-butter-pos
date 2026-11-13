// Aturan akses per role. Murni (tanpa DB/cookie) supaya bisa dipakai navbar, halaman, dan test.
// Matriks mengikuti usulan PRD bagian "Pengguna & peran" (masih perlu dikonfirmasi pemilik toko).

export const ROLES = ["admin", "kasir", "produksi", "owner"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  kasir: "Kasir",
  produksi: "Produksi",
  owner: "Owner",
}

/** Ringkasan hak akses per role, ditampilkan di form User / Staff. Selaras dengan SECTION_ACCESS. */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Dashboard, Pesanan, Pembayaran, Produksi, Packaging, Pengiriman, dan Stok Packaging.",
  kasir: "Dashboard, Pesanan, Pembayaran, dan Pengiriman.",
  produksi: "Dashboard, Produksi, Packaging, dan Stok Packaging.",
  owner: "Semua menu: operasional, Laporan, dan Master Data (termasuk akun staf dan pengaturan).",
}

const ALL: readonly Role[] = ROLES

/** Halaman utama aplikasi dan role yang boleh membukanya. Urutan = urutan navbar. */
export const SECTION_ACCESS = {
  "/dashboard": ALL,
  // Owner melihat dan memakai semua menu; Laporan dan Master Data khusus Owner
  // (keputusan pemilik toko, Nov 2026).
  "/pesanan": ["admin", "kasir", "owner"],
  "/pembayaran": ["admin", "kasir", "owner"],
  "/produksi": ["admin", "produksi", "owner"],
  "/packaging": ["admin", "produksi", "owner"],
  "/pengiriman": ["admin", "kasir", "owner"],
  "/laporan": ["owner"],
  "/stok-packaging": ["admin", "produksi", "owner"],
  "/master-data": ["owner"],
  // Log Chat Tim per hari (tidak tampil di navbar; dibuka dari panel Chat Tim).
  "/riwayat-chat": ALL,
} as const satisfies Record<string, readonly Role[]>

export type Section = keyof typeof SECTION_ACCESS

/**
 * Sub-halaman yang aksesnya berbeda dari halaman induknya. Diperiksa sebelum SECTION_ACCESS.
 * Sejak Nov 2026 seluruh Master Data khusus Owner, jadi daftar ini hanya menegaskan halaman
 * yang paling sensitif (data pribadi customer, akun staf, pengaturan).
 */
export const SUBSECTION_ACCESS = {
  "/master-data/customer": ["owner"],
  "/master-data/user-staff": ["owner"],
  "/master-data/pengaturan": ["owner"],
} as const satisfies Record<string, readonly Role[]>

/** Role yang mengelola Master Data (kurir, metode bayar, staf, pengaturan). */
export const CAN_MANAGE_MASTER: readonly Role[] = ["owner"]

/** Role yang boleh mencatat stok packaging (masuk, hitung ulang) di menu Stok Packaging. */
export const CAN_EDIT_STOCK: readonly Role[] = ["admin", "produksi", "owner"]

/** Role yang boleh mengubah data customer di Master Data. Customer baru tetap dibuat dari pesanan. */
export const CAN_EDIT_CUSTOMER: readonly Role[] = ["owner"]

/** Role yang boleh menandai pesanan selesai packing (memotong stok packaging). */
export const CAN_PACK: readonly Role[] = ["admin", "produksi", "owner"]

/** Role yang boleh mengatur Produk & Menu dan kategorinya (keputusan pemilik toko, Nov 2026). */
export const CAN_MANAGE_MENU: readonly Role[] = ["owner"]

/**
 * Role yang boleh mengatur jenis stok packaging dan kategorinya di Master Data (keputusan pemilik
 * toko, Nov 2026). Pencatatan stok masuk / hitung ulang tetap di menu Stok Packaging (CAN_EDIT_STOCK).
 */
export const CAN_MANAGE_PACKAGING: readonly Role[] = ["owner"]

/** Role yang boleh membuat pesanan lewat tombol "Input Pesanan". */
export const CAN_INPUT_ORDER: readonly Role[] = ["admin", "kasir", "owner"]

function sectionOf(pathname: string): Section | undefined {
  return (Object.keys(SECTION_ACCESS) as Section[]).find(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  )
}

/** Path yang tidak terdaftar di SECTION_ACCESS hanya boleh dibuka Admin. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const subsection = (Object.keys(SUBSECTION_ACCESS) as (keyof typeof SUBSECTION_ACCESS)[]).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
  if (subsection) return (SUBSECTION_ACCESS[subsection] as readonly Role[]).includes(role)
  const section = sectionOf(pathname)
  if (!section) return role === "admin"
  return (SECTION_ACCESS[section] as readonly Role[]).includes(role)
}

/**
 * Tujuan setelah login. Hanya path internal yang diterima, supaya ?next= tidak bisa
 * dipakai untuk mengarahkan orang ke situs lain (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback
  }
  if (next === "/" || next.startsWith("/login")) return fallback
  return next
}

/** Role yang boleh mengubah status produksi (Baru ↔ Diproses ↔ Siap Packing). */
export const CAN_PRODUCE: readonly Role[] = ["admin", "produksi", "owner"]

/** Role yang boleh mengatur pengiriman (kurir, jadwal, link lacak, tandai dikirim/selesai). */
export const CAN_MANAGE_SHIPMENT: readonly Role[] = ["admin", "kasir", "owner"]
