import {
  Box,
  Leaf,
  type LucideIcon,
  Settings,
  Truck,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react"

export type MasterDataSection = {
  slug: string
  label: string
  icon: LucideIcon
  /** Keterangan untuk halaman yang belum dibangun. */
  planned: string
  /** Hanya tampil di sidebar untuk Admin (halamannya juga dijaga ADMIN_ONLY_PATHS). */
  adminOnly?: boolean
}

/** Urutan sidebar mengikuti docs/design/06-master-data.png. */
export const MASTER_DATA_SECTIONS: MasterDataSection[] = [
  {
    slug: "produk-menu",
    label: "Produk & Menu",
    icon: UtensilsCrossed,
    planned: "Daftar menu, harga, kategori, dan ketersediaan.",
  },
  {
    slug: "stok-packaging",
    label: "Stok Packaging",
    icon: Box,
    planned: "Jenis packaging, stok saat ini, dan statusnya (Cukup / Menipis).",
  },
  {
    slug: "bahan-baku",
    label: "Bahan Baku",
    icon: Leaf,
    planned: "Bahan baku utama, stok minimum, dan status Cukup / Menipis / Habis.",
  },
  {
    slug: "kurir",
    label: "Kurir & Pengiriman",
    icon: Truck,
    planned: "Kurir internal dan eksternal beserta nomor teleponnya.",
  },
  {
    slug: "metode-pembayaran",
    label: "Metode Pembayaran",
    icon: WalletCards,
    planned: "Metode bayar yang diterima: transfer bank, e-wallet, dan cash.",
  },
  {
    slug: "customer",
    label: "Customer",
    icon: UsersRound,
    planned: "Data customer yang pernah memesan, termasuk riwayat pesanannya.",
  },
  {
    slug: "user-staff",
    label: "User / Staff",
    icon: UserRound,
    adminOnly: true,
    planned:
      "Akun staf, role, dan status aktif. Admin bisa menambah akun dan mengatur ulang kata sandi.",
  },
  {
    slug: "pengaturan",
    label: "Pengaturan",
    icon: Settings,
    planned: "Pengaturan toko seperti slot jam pengiriman dan ambang stok.",
  },
]
