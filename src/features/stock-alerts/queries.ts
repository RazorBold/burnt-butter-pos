import "server-only"

import { listPackagings } from "@/features/packagings/queries"

import { type StockAlert, sortAlerts } from "./alerts"

/**
 * Packaging dan bahan baku yang Menipis atau Habis, untuk lonceng notifikasi (BELL-33).
 * Dihitung dari stok saat ini, jadi peringatan hilang sendiri setelah stok diisi ulang.
 */
/** Packaging dan loyang yang Menipis atau Habis, untuk lonceng notifikasi (BELL-33). */
export async function listStockAlerts(): Promise<StockAlert[]> {
  const packagings = await listPackagings()
  return sortAlerts([
    ...packagings.flatMap((item): StockAlert[] =>
      item.status === "cukup"
        ? []
        : [
            {
              id: item.id,
              kind: "packaging",
              name: item.name,
              stock: item.stock,
              minStock: item.minStock,
              unit: item.unit,
              status: item.status,
              href: `/stok-packaging?item=${item.id}`,
            },
          ],
    ),
  ])
}
