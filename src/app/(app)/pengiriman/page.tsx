import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Pengiriman" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/pengiriman"
      title="Pengiriman"
      description="Kelola pesanan yang akan dikirim, pantau status, dan atur rute kurir."
      plannedContent="Di sini nanti ada daftar pengiriman per metode, kurir dan slot jam, serta peta rute tiap pesanan."
    />
  )
}
