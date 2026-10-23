import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Laporan" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/laporan"
      title="Laporan"
      description="Pantau performa bisnis, penjualan, produksi, dan operasional dalam satu tempat."
      plannedContent="Di sini nanti ada ringkasan periode: tren pesanan, produk terlaris, metode pengiriman, dan metode pembayaran."
    />
  )
}
