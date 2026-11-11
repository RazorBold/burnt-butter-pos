import {
  ChartColumnBig,
  ClipboardList,
  CookingPot,
  Database,
  House,
  type LucideIcon,
  Package,
  PackageOpen,
  Truck,
  WalletCards,
} from "lucide-react"

import type { Section } from "@/lib/access"

export type NavItem = { href: Section; label: string; icon: LucideIcon }

/**
 * Label mengikuti navbar di docs/design (Pengiriman ikut di semua layar, lihat BELL-37). Urutan
 * mengikuti permintaan pemilik toko: Stok Packaging tepat di kiri Master Data.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/pembayaran", label: "Pembayaran", icon: WalletCards },
  { href: "/produksi", label: "Produksi", icon: CookingPot },
  { href: "/packaging", label: "Packaging", icon: PackageOpen },
  { href: "/pengiriman", label: "Pengiriman", icon: Truck },
  { href: "/laporan", label: "Laporan", icon: ChartColumnBig },
  { href: "/stok-packaging", label: "Packaging & Loyang", icon: Package },
  { href: "/master-data", label: "Master Data", icon: Database },
]

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
