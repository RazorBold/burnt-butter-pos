import {
  ChartColumnBig,
  ClipboardList,
  CookingPot,
  Database,
  House,
  type LucideIcon,
  Package,
  Truck,
  WalletCards,
} from "lucide-react"

import type { Section } from "@/lib/access"

export type NavItem = { href: Section; label: string; icon: LucideIcon }

/** Urutan dan label mengikuti navbar di docs/design (Pengiriman ikut di semua layar, lihat BELL-37). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/pembayaran", label: "Pembayaran", icon: WalletCards },
  { href: "/stok-packaging", label: "Stok Packaging", icon: Package },
  { href: "/produksi", label: "Produksi", icon: CookingPot },
  { href: "/pengiriman", label: "Pengiriman", icon: Truck },
  { href: "/laporan", label: "Laporan", icon: ChartColumnBig },
  { href: "/master-data", label: "Master Data", icon: Database },
]

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
