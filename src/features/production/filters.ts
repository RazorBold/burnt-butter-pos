// Filter papan Produksi dari URL (?jenis=po|ready_stock|made_to_order). Permintaan pemilik toko
// (14 Nov 2026). Murni supaya bisa diuji.

import { ORDER_KINDS } from "@/features/orders/constants"
import type { OrderKind } from "@/lib/wa-parser"

type Params = Record<string, string | string[] | undefined>

export function parseProductionKind(params: Params): OrderKind | undefined {
  const value = Array.isArray(params.jenis) ? params.jenis[0] : params.jenis
  return ORDER_KINDS.find((kind) => kind === value)
}

/** Pesanan yang bisa dipilih untuk aksi massal: Baru (Mulai masak) dan Diproses (Selesai masak). */
export function isSelectable(status: string): boolean {
  return status === "baru" || status === "diproses"
}
