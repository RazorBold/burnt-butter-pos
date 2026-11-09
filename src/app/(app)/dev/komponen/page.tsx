import {
  CircleCheckBig,
  FileText,
  Gift,
  Package,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { requirePageAccess } from "@/lib/auth"
import { formatRupiah } from "@/lib/format"

export const metadata: Metadata = { title: "Pratinjau komponen" }

// Halaman pratinjau komponen untuk pengembangan (hanya di `pnpm dev`, hanya Admin).
// Angka di sini contoh dari gambar desain, bukan data toko.
export default function ComponentPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense>
        <Preview />
      </Suspense>
    </main>
  )
}

const wave = [3, 4, 3.5, 5, 4.2, 6, 5.5, 7]

async function Preview() {
  await requirePageAccess("/dev/komponen")

  return (
    <>
      <PageHeader
        title="Pratinjau komponen"
        description="Contoh tampilan komponen dengan angka dari gambar desain. Hanya muncul saat development."
      />

      <h2 className="mt-8 text-lg font-semibold text-brand-ink">Kartu KPI: dashboard</h2>
      <div
        className="kpi-grid mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-testid="kpi-dashboard"
      >
        <KpiCard
          icon={FileText}
          label="Total Pesanan Hari Ini"
          value="24"
          trend={{ percent: 12 }}
          series={wave}
        />
        <KpiCard
          icon={Package}
          label="Pesanan Personal"
          value="18"
          trend={{ percent: 20 }}
          series={[2, 3, 2.5, 4, 3, 5, 6, 6.5]}
        />
        <KpiCard
          icon={Gift}
          label="Pesanan Hadiah"
          value="6"
          trend={{ percent: -14 }}
          series={[7, 6, 6.5, 5, 5.5, 4, 4.5, 3.5]}
        />
        <KpiCard
          icon={WalletCards}
          label="Total Pembayaran Hari Ini"
          value={formatRupiah(4780000)}
          trend={{ percent: 28 }}
          series={[2, 2.5, 4, 3.5, 5, 4.5, 6, 7]}
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-brand-ink">Kartu KPI: pengiriman</h2>
      <div
        className="kpi-grid mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-testid="kpi-pengiriman"
      >
        <KpiCard
          icon={Truck}
          label="Perlu Dikirim Hari Ini"
          value="12"
          trend={{ percent: 20, goodWhen: "down" }}
          series={wave}
        />
        <KpiCard
          icon={UserRound}
          label="Kurir Internal"
          value="7"
          series={[1, 2, 1.5, 3, 2.5, 4]}
        />
        <KpiCard
          icon={CircleCheckBig}
          label="Selesai Dikirim Hari Ini"
          value="10"
          trend={{ percent: 0 }}
        />
        <KpiCardSkeleton />
      </div>
    </>
  )
}
