import { cn } from "@/lib/utils"

/** Badge status master data: "● Aktif" (hijau) / "● Nonaktif" (abu), sesuai 06-master-data.png. */
export function ActiveBadge({ active, className }: { active: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap",
        active
          ? "bg-status-selesai text-status-selesai-fg"
          : "bg-status-dikirim text-status-dikirim-fg",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", active ? "bg-[#2e9b3a]" : "bg-[#8a929c]")}
      />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  )
}
