import { STOCK_STATUS_LABEL, type StockStatus } from "@/features/packagings/stock"
import { cn } from "@/lib/utils"

const STYLE: Record<StockStatus, { badge: string; dot: string }> = {
  cukup: { badge: "bg-status-selesai text-status-selesai-fg", dot: "bg-[#2e9b3a]" },
  menipis: { badge: "bg-status-diproses text-status-diproses-fg", dot: "bg-[#e0a526]" },
  habis: { badge: "bg-trend-down text-trend-down-fg", dot: "bg-[#d93a2b]" },
}

/** Badge status stok "● Cukup / ● Menipis / ● Habis" (06-master-data.png). Warna + teks. */
export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap",
        STYLE[status].badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", STYLE[status].dot)} />
      {STOCK_STATUS_LABEL[status]}
    </span>
  )
}

/** Warna bar stok / kapasitas, sama dengan status. */
export const STOCK_BAR_COLOR: Record<StockStatus, string> = {
  cukup: "bg-[#2e9b3a]",
  menipis: "bg-[#e0a526]",
  habis: "bg-[#d93a2b]",
}
