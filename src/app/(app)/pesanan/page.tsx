import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Pesanan" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/pesanan"
      title="Daftar Pesanan"
      description="Kelola semua pesanan yang masuk. Lihat status, pembayaran, dan detail pengiriman."
      plannedContent="Di sini nanti ada tabel pesanan dengan filter tanggal, tipe, status, dan metode kirim, plus panel detail tiap pesanan."
    />
  )
}
