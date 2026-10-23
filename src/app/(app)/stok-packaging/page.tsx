import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Stok Packaging" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/stok-packaging"
      title="Stok Packaging"
      description="Pantau stok box, paper bag, dan cup, serta riwayat keluar-masuknya."
      plannedContent="Di sini nanti ada stok tiap packaging, peringatan stok menipis, dan riwayat stok masuk dan keluar."
    />
  )
}
