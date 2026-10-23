import type { Metadata } from "next"
import { Suspense } from "react"

import { AccessDeniedToast } from "@/components/app/access-denied-toast"
import { PAGE_CONTAINER, PageHeaderSkeleton, UnderConstruction } from "@/components/app/page-header"
import { requirePageAccess } from "@/lib/auth"

export const metadata: Metadata = { title: "Dashboard" }

// Isi dashboard (KPI, grafik, rekap produksi) menyusul di BELL-21..24.
export default function DashboardPage() {
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense fallback={<PageHeaderSkeleton />}>
        <Greeting />
      </Suspense>
      <Suspense>
        <AccessDeniedToast />
      </Suspense>
    </main>
  )
}

async function Greeting() {
  const user = await requirePageAccess("/dashboard")

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold text-brand-ink sm:text-[32px]">
        Halo, {user.name}!
      </h1>
      <p className="mt-1.5 text-[15px] text-text-body">
        Selamat datang di Burnt Butter &amp; Segelas Awan.
      </p>
      <UnderConstruction plannedContent="Di sini nanti ada ringkasan hari ini: jumlah pesanan, status, pembayaran, metode kirim, rekap produksi per menu, dan stok packaging." />
    </>
  )
}
