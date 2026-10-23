import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Produksi" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/produksi"
      title="Produksi"
      description="Lihat porsi yang harus dimasak per menu untuk setiap tanggal kirim."
      plannedContent="Di sini nanti ada rekap porsi per menu per tanggal kirim yang bisa ditandai selesai dimasak."
    />
  )
}
