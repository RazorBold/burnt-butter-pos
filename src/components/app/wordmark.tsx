import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * Logo Burnt Butter (wordmark "burntbutter": "burnt" hitam, "butter" cokelat). File PNG transparan
 * di public/images/brand, dipotong rapat dari logo asli pemilik toko (Nov 2026).
 */
export function Wordmark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <Image
      src="/images/brand/logo-burnt-butter.png"
      alt="Burnt Butter"
      width={992}
      height={184}
      priority
      className={cn(
        "w-auto select-none",
        size === "lg" ? "h-11 lg:h-14" : "h-[30px] 2xl:h-[34px]",
        className,
      )}
    />
  )
}
