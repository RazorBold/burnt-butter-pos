import { FileText, Gift, Package, Plus, Wallet } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { OrderStatusBadge, TypeBadge } from "@/components/app/order-badges"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { TablePagination } from "@/components/app/table-pagination"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrderFilters } from "@/features/orders/components/order-filters"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { filterParams, parseOrderFilters } from "@/features/orders/filters"
import { computeKpis, kpiWindow } from "@/features/orders/kpis"
import { getDailyOrderStats, listOrders, ORDER_PAGE_SIZE } from "@/features/orders/queries"
import { requirePageAccess } from "@/lib/auth"
import {
  formatJam,
  formatRupiah,
  formatTanggal,
  formatTanggalPendek,
  toJakartaDateString,
} from "@/lib/format"

export const metadata: Metadata = { title: "Daftar Pesanan" }

const PATH = "/pesanan"

type SearchParams = PageProps<"/pesanan">["searchParams"]

export default function PesananPage({ searchParams }: PageProps<"/pesanan">) {
  return (
    <main className={PAGE_CONTAINER}>
      <PageHeader
        title="Daftar Pesanan"
        description="Kelola semua pesanan yang masuk. Lihat status, pembayaran, dan detail pengiriman."
      />
      <Suspense fallback={<KpiSkeleton />}>
        <OrderKpis searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <OrderList searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function readFilters(searchParams: SearchParams) {
  const today = toJakartaDateString(new Date())
  return { today, filters: parseOrderFilters(await searchParams, today) }
}

/** KPI periode (03-pesanan.png). Hanya rentang tanggal yang berpengaruh, bukan filter lain. */
async function OrderKpis({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const { filters } = await readFilters(searchParams)
  const statsRange = kpiWindow(filters.from, filters.to)
  const kpis = computeKpis(
    await getDailyOrderStats(statsRange.from, statsRange.to),
    filters.from,
    filters.to,
  )
  const trend = (percent: number | null) => (percent === null ? undefined : { percent })

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={FileText}
        label="Total Pesanan"
        value={String(kpis.orders.value)}
        trend={trend(kpis.orders.percent)}
        series={kpis.orders.series}
      />
      <KpiCard
        icon={Package}
        label="Pesanan Personal"
        value={String(kpis.personal.value)}
        trend={trend(kpis.personal.percent)}
        series={kpis.personal.series}
      />
      <KpiCard
        icon={Gift}
        label="Pesanan Hadiah"
        value={String(kpis.hadiah.value)}
        trend={trend(kpis.hadiah.percent)}
        series={kpis.hadiah.series}
      />
      {/* Desain: "Total Pembayaran". Modul Pembayaran belum ada, jadi yang dihitung nilai pesanan. */}
      <KpiCard
        icon={Wallet}
        label="Nilai Pesanan"
        value={formatRupiah(kpis.value.value)}
        trend={trend(kpis.value.percent)}
        series={kpis.value.series}
      />
    </div>
  )
}

async function OrderList({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const { today, filters } = await readFilters(searchParams)
  const { rows, total, page, pageCount } = await listOrders(filters)
  const singleDay = filters.from === filters.to
  const filtered = Boolean(filters.q || filters.type || filters.status || filters.method)
  const rangeText = singleDay
    ? filters.from === today
      ? "hari ini"
      : `tanggal ${formatTanggal(filters.from)}`
    : `${formatTanggal(filters.from)} sampai ${formatTanggal(filters.to)}`

  return (
    <>
      <div className="mt-6">
        <OrderFilters from={filters.from} to={filters.to} today={today} />
      </div>

      <section
        aria-label="Daftar pesanan"
        className="mt-6 rounded-2xl border border-border bg-card"
      >
        {rows.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-12">
            <div>
              <p className="font-semibold text-brand-ink">
                {filtered
                  ? "Tidak ada pesanan yang cocok dengan filter."
                  : `Belum ada pesanan ${rangeText}.`}
              </p>
              <p className="mt-1 text-sm text-text-body">
                {filtered
                  ? "Ubah filter atau tekan Reset untuk melihat semua pesanan."
                  : "Pesanan baru muncul di sini setelah disimpan dari Input Pesanan."}
              </p>
            </div>
            {!filtered && (
              <Button asChild className="h-10 rounded-lg px-4 font-semibold">
                <Link href="/pesanan/baru">
                  <Plus className="size-[18px]" aria-hidden />
                  Input Pesanan
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">No. Pesanan</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tgl Kirim</TableHead>
                    <TableHead>Pengiriman</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="pl-6 font-medium text-text-strong tabular-nums">
                        {order.orderNo}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {singleDay
                          ? formatJam(order.createdAt)
                          : `${formatTanggalPendek(order.createdAt).slice(0, 5)} ${formatJam(order.createdAt)}`}
                      </TableCell>
                      <TableCell className="font-medium text-text-strong">
                        {order.customerName}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={order.type} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatTanggalPendek(order.deliveryDate)}
                      </TableCell>
                      <TableCell>{SHIPPING_METHOD_LABEL[order.shippingMethod]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRupiah(order.total)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              pathname={PATH}
              params={filterParams(filters, today)}
              page={page}
              pageCount={pageCount}
              pageSize={ORDER_PAGE_SIZE}
              total={total}
              noun="pesanan"
            />
          </>
        )}
      </section>
    </>
  )
}

function KpiSkeleton() {
  return (
    <div aria-hidden className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <KpiCardSkeleton key={index} />
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div aria-hidden className="mt-6 space-y-6">
      <Skeleton className="h-[72px] rounded-2xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  )
}
