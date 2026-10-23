import { cn } from "@/lib/utils"

/**
 * Wordmark teks sementara sampai file logo asli tersedia (lihat DESIGN.md › Aset yang belum ada).
 * Susunannya mengikuti logo di navbar desain: "Burnt Butter" besar, "& Segelas Awan" di bawahnya.
 */
export function Wordmark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <div className={cn("text-brand-ink select-none", className)}>
      <p
        className={cn(
          "leading-none font-extrabold tracking-[-0.02em]",
          size === "lg" ? "text-[36px] lg:text-[44px]" : "text-[22px]",
        )}
      >
        Burnt Butter
      </p>
      <p
        className={cn(
          "font-semibold text-brand",
          size === "lg" ? "mt-1.5 text-base lg:text-lg" : "mt-0.5 text-[13px]",
        )}
      >
        &amp; Segelas Awan
      </p>
    </div>
  )
}
