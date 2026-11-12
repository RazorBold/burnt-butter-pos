import { ChefHat, PackageCheck, PackageOpen } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { DeliveryDatePicker } from "@/components/app/delivery-date-picker"
import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { PACKED_STATUSES, urgentFirst } from "@/features/orders/status"
import { PackingFiltersBar } from "@/features/packing/components/packing-filters"
import { PackingOrderCard } from "@/features/packing/components/packing-order-card"
import { filterPackingOrders, parsePackingFilters } from "@/features/packing/filters"
import { listPackingOrders, listPackingPackagings } from "@/features/packing/queries"
import { CAN_PACK } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatHariTanggal, toJakartaDateString } from "@/lib/format"

export const metadata: Metadata = { title: "Packaging" }

const PATH = "/packaging"
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Desain belum ada. Keputusan pemilik toko (Nov 2026): setelah selesai masak, pesanan di-packing
// dulu baru dikirim. Selesai packing cukup satu klik; jenisnya mengikuti tipe pesanan. Stok box hampers
// dan loyang tidak dipotong di sini, karena sudah terpotong otomatis saat pesanan Lunas.
export default function PackagingPage({ searchParams }: PageProps<"/packaging">) {
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense fallback={<PackingSkeleton />}>
        <Packing searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Packing({
  searchParams,
}: {
  searchParams: PageProps<"/packaging">["searchParams"]
}) {
  const user = await requirePageAccess(PATH)
  const canEdit = CAN_PACK.includes(user.role)
  const today = toJakartaDateString(new Date())
  const params = await searchParams
  const date =
    typeof params.tanggal === "string" &&
    ISO_DATE.test(params.tanggal) &&
    !Number.isNaN(Date.parse(params.tanggal))
      ? params.tanggal
      : today

  const filters = parsePackingFilters(params)
  const filtered = Boolean(filters.type || filters.source)
  const packagings = await listPackingPackagings()
  const allOrders = await listPackingOrders(date, packagings)
  const orders = filterPackingOrders(allOrders, filters)
  const waiting = urgentFirst(orders.filter((order) => order.status === "siap_packing"))
  const packed = orders.filter((order) => PACKED_STATUSES.includes(order.status))
  const cooking = orders.filter(
    (order) => order.status === "baru" || order.status === "diproses",
  ).length
  const dateLabel = date === today ? "hari ini" : formatHariTanggal(date)

  return (
    <>
      <PageHeader
        title="Packaging"
        description={`Packing pesanan yang sudah selesai dimasak untuk dikirim ${dateLabel}. Tipe box mengikuti pesanan; tinggal tandai selesai. Stok box dan loyang sudah terpotong saat Lunas.`}
        actions={<DeliveryDatePicker date={date} today={today} />}
      />

      <PackingFiltersBar filters={filters} />

      <div className="kpi-grid mt-4 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={PackageOpen} label="Menunggu Packing" value={`${waiting.length} pesanan`} />
        <KpiCard icon={PackageCheck} label="Selesai Packing" value={`${packed.length} pesanan`} />
        <KpiCard icon={ChefHat} label="Masih Dimasak" value={`${cooking} pesanan`} />
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-12 text-center text-text-body">
          {filtered && allOrders.length > 0
            ? `Tidak ada pesanan yang cocok dengan filter (${allOrders.length} pesanan lain dikirim ${dateLabel}).`
            : `Belum ada pesanan yang dikirim ${dateLabel}.`}
        </p>
      ) : (
        <>
          <section aria-labelledby="board-title" className="mt-8">
            <h2 id="board-title" className="text-lg font-bold text-brand-ink">
              Pesanan
            </h2>
            <div className="mt-3 grid items-start gap-4 lg:grid-cols-2">
              {[
                { key: "menunggu", label: "Menunggu packing", list: waiting },
                { key: "selesai", label: "Selesai packing", list: packed },
              ].map((column) => (
                <section
                  key={column.key}
                  aria-labelledby={`pack-col-${column.key}`}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <h3
                    id={`pack-col-${column.key}`}
                    className="flex items-center justify-between font-semibold text-text-strong"
                  >
                    {column.label}
                    <span className="rounded-md bg-nav-active px-2 py-0.5 text-sm text-brand-ink tabular-nums">
                      {column.list.length}
                    </span>
                  </h3>
                  {column.list.length === 0 ? (
                    <p className="mt-3 text-sm text-text-body">
                      {column.key === "menunggu" && cooking > 0
                        ? `Tidak ada. ${cooking} pesanan masih dimasak (lihat Produksi).`
                        : "Tidak ada pesanan."}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {column.list.map((order) => (
                        <li key={order.id}>
                          <PackingOrderCard
                            order={order}
                            packagings={packagings}
                            canEdit={canEdit}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}

function PackingSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="mt-8 h-[320px] rounded-2xl" />
    </div>
  )
}
