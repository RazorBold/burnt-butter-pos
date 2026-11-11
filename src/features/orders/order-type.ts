// Tipe pesanan dari menu yang dipilih (dipakai untuk pesanan Shopee/Tokopedia: template olshop
// tidak berisi menu, admin memilih menu manual di form). Murni supaya bisa diuji.

import type { OrderType } from "@/lib/wa-parser"

/** Menu hampers = menu di kategori yang namanya memuat "Hampers" (diatur Owner). */
export const isHampersCategory = (categoryName: string | null | undefined) =>
  /hampers/i.test(categoryName ?? "")

/** Semua menu biasa → Normal, semua hampers → Hampers, campuran → Normal & Hampers. */
export function orderTypeFromMenus(categoryNames: (string | null | undefined)[]): OrderType {
  const hampers = categoryNames.filter(isHampersCategory).length
  if (hampers === 0) return "normal"
  if (hampers === categoryNames.length) return "hampers"
  return "normal_hampers"
}
