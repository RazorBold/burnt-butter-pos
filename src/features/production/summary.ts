// Rekap produksi per tanggal kirim (keputusan pemilik toko, Okt 2026): porsi per menu dan
// ukuran, serta tahap dapur tiap pesanan. Murni supaya bisa diuji.

import type { OrderStatus } from "@/features/orders/filters"

/** Tahap dapur: Baru = belum mulai, Diproses = sedang dimasak, Siap Kirim ke atas = selesai. */
export type ProductionStage = "belum" | "proses" | "selesai"

export const STAGE_LABEL: Record<ProductionStage, string> = {
  belum: "Belum mulai",
  proses: "Sedang dimasak",
  selesai: "Selesai masak",
}

export function stageOf(status: OrderStatus): ProductionStage {
  if (status === "baru") return "belum"
  if (status === "diproses") return "proses"
  return "selesai"
}

export type ProductionItem = {
  menuName: string
  /** Urutan kategori dari Owner (rekap mengikuti urutan template). */
  categorySort: number
  /** Kategori berukuran Large/Regular (satuan "porsi"); selain itu "pcs". */
  sized: boolean
  size: "large" | "regular" | "single"
  qty: number
  photoPath: string | null
  /** Urutan menu di Master Data (urutan dibuat), supaya rekap mengikuti urutan template. */
  menuOrder: number
  /** Catatan khusus menu ini dari admin pesanan. */
  note?: string | null
}

export type ProductionOrderLike = { status: OrderStatus; items: ProductionItem[] }

export type MenuSummary = {
  menuName: string
  categorySort: number
  sized: boolean
  photoPath: string | null
  sizes: { size: ProductionItem["size"]; total: number; done: number }[]
  total: number
  done: number
}

const SIZE_ORDER = { large: 0, regular: 1, single: 2 } as const

/** Porsi per menu (dan per ukuran) dari pesanan yang tidak dibatalkan. */
export function summarizeProduction(orders: ProductionOrderLike[]): MenuSummary[] {
  const byMenu = new Map<string, MenuSummary>()
  const menuOrder = new Map<string, number>()
  for (const order of orders) {
    if (order.status === "dibatalkan") continue
    const done = stageOf(order.status) === "selesai"
    for (const item of order.items) {
      let menu = byMenu.get(item.menuName)
      if (!menu) {
        menu = {
          menuName: item.menuName,
          categorySort: item.categorySort,
          sized: item.sized,
          photoPath: item.photoPath,
          sizes: [],
          total: 0,
          done: 0,
        }
        byMenu.set(item.menuName, menu)
        menuOrder.set(item.menuName, item.menuOrder)
      }
      let size = menu.sizes.find((entry) => entry.size === item.size)
      if (!size) {
        size = { size: item.size, total: 0, done: 0 }
        menu.sizes.push(size)
      }
      size.total += item.qty
      menu.total += item.qty
      if (done) {
        size.done += item.qty
        menu.done += item.qty
      }
    }
  }
  return [...byMenu.values()]
    .sort(
      (a, b) =>
        a.categorySort - b.categorySort ||
        menuOrder.get(a.menuName)! - menuOrder.get(b.menuName)! ||
        a.menuName.localeCompare(b.menuName),
    )
    .map((menu) => ({
      ...menu,
      sizes: menu.sizes.sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size]),
    }))
}

/** Jumlah porsi dan pesanan per tahap, untuk kartu ringkasan. */
export function productionTotals(orders: ProductionOrderLike[]) {
  const active = orders.filter((order) => order.status !== "dibatalkan")
  const portions = (stage?: ProductionStage) =>
    active
      .filter((order) => !stage || stageOf(order.status) === stage)
      .reduce((sum, order) => sum + order.items.reduce((total, item) => total + item.qty, 0), 0)
  const count = (stage: ProductionStage) =>
    active.filter((order) => stageOf(order.status) === stage).length
  return {
    portions: portions(),
    donePortions: portions("selesai"),
    orders: { belum: count("belum"), proses: count("proses"), selesai: count("selesai") },
  }
}
