import type { Metadata } from "next"

import { SectionPlaceholder } from "@/components/app/section-placeholder"

export const metadata: Metadata = { title: "Pembayaran" }

export default function Page() {
  return (
    <SectionPlaceholder
      section="/pembayaran"
      title="Pembayaran"
      description="Catat dan verifikasi pembayaran setiap pesanan."
      plannedContent="Di sini nanti ada daftar pembayaran per pesanan, metode bayar, dan bukti transfer yang perlu dicek."
    />
  )
}
