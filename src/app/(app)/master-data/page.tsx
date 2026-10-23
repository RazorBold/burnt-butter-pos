import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Master Data" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/master-data"
      title="Master Data"
      description="Kelola data dasar yang digunakan dalam operasional bisnis."
      plannedContent="Di sini nanti ada menu dan harga, packaging, bahan baku, kurir, metode pembayaran, customer, dan akun staf."
    />
  )
}
