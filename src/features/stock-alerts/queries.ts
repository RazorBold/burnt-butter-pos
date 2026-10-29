import "server-only"

import { listPackagings } from "@/features/packagings/queries"
import { listRawMaterials } from "@/features/raw-materials/queries"

import { type StockAlert, sortAlerts } from "./alerts"

/**
 * Packaging dan bahan baku yang Menipis atau Habis, untuk lonceng notifikasi (BELL-33).
 * Dihitung dari stok saat ini, jadi peringatan hilang sendiri setelah stok diisi ulang.
 */
export async function listStockAlerts(): Promise<StockAlert[]> {
  const [packagings, materials] = await Promise.all([listPackagings(), listRawMaterials()])
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
    ...materials.flatMap((item): StockAlert[] =>
      item.status === "cukup"
        ? []
        : [
            {
              id: item.id,
              kind: "raw_material",
              name: item.name,
              stock: item.stock,
              minStock: item.minStock,
              unit: item.unit,
              status: item.status,
              href: `/master-data/bahan-baku?item=${item.id}`,
            },
          ],
    ),
  ])
}
