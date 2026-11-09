import "server-only"

import { listPackagings } from "@/features/packagings/queries"
import { listRawMaterials } from "@/features/raw-materials/queries"

import { type StockAlert, sortAlerts } from "./alerts"

/**
 * Packaging dan bahan baku yang Menipis atau Habis, untuk lonceng notifikasi (BELL-33).
 * Dihitung dari stok saat ini, jadi peringatan hilang sendiri setelah stok diisi ulang.
 */
/**
 * Peringatan stok menipis/habis. Admin & Produksi mengurus packaging (menu Stok Packaging);
 * Owner mengurus bahan baku (Master Data). Masing-masing hanya melihat yang bisa ia restock.
 */
export async function listStockAlerts({
  packaging,
  rawMaterials,
}: {
  packaging: boolean
  rawMaterials: boolean
}): Promise<StockAlert[]> {
  const [packagings, materials] = await Promise.all([
    packaging ? listPackagings() : Promise.resolve([]),
    rawMaterials ? listRawMaterials() : Promise.resolve([]),
  ])
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
