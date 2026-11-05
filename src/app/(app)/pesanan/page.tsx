import { FileText, Gift, Package, Plus, Wallet } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import {
  ChannelBadge,
  OrderNoteLine,
  OrderStatusBadge,
  TypeBadge,
} from "@/components/app/order-badges"
import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { TrackingLink } from "@/components/app/shipment-badges"
import { SelectAllHead } from "@/components/app/row-selection"
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
import { OrderActionsProvider, OrderRowMenu } from "@/features/orders/components/order-bulk-actions"
import { OrderDetailPanel } from "@/features/orders/components/order-detail-panel"
import { OrderFilters } from "@/features/orders/components/order-filters"
import { OrderRow } from "@/features/orders/components/order-row"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { filterParams, parseOrderFilters } from "@/features/orders/filters"
import { computeKpis, kpiWindow } from "@/features/orders/kpis"
import { getDailyOrderStats, listOrders, ORDER_PAGE_SIZE } from "@/features/orders/queries"
import { listActivePaymentMethods } from "@/features/payments/queries"
import { requirePageAccess } from "@/lib/auth"
import {
  formatJam,
  formatRupiah,
  formatTanggal,
  formatTanggalPendek,
  toJakartaDateString,
} from "@/lib/format"
import { cn } from "@/lib/utils"

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
  const params = await searchParams
  const selected = typeof params.pesanan === "string" ? params.pesanan : undefined
  return { today, filters: parseOrderFilters(params, today), selected }
}

/** URL halaman ini dengan filter yang sama, ditambah/dikurangi parameter tertentu. */
function pageHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
  const qs = search.toString()
  return qs ? `${PATH}?${qs}` : PATH
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
  const { today, filters, selected } = await readFilters(searchParams)
  const [{ rows, total, page, pageCount }, paymentMethods] = await Promise.all([
    listOrders(filters),
    listActivePaymentMethods(),
  ])
  const listParams = { ...filterParams(filters, today), hal: page > 1 ? String(page) : undefined }
  const singleDay = filters.from === filters.to
  const filtered = Boolean(
    filters.q || filters.type || filters.status || filters.method || filters.channel,
  )
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

      <div
        className={cn(
          "mt-6 grid items-start gap-6",
          selected && "xl:grid-cols-[minmax(0,1fr)_420px]",
        )}
      >
        <section
          aria-label="Daftar pesanan"
          className="min-w-0 rounded-2xl border border-border bg-card"
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
            <OrderActionsProvider
              // Pilihan checkbox kosong lagi saat isi halaman tabel berganti.
              key={rows.map((order) => order.id).join()}
              rows={rows.map((order) => ({
                id: order.id,
                orderNo: order.orderNo,
                status: order.status,
                method: order.shippingMethod,
                paid: order.paid,
                total: order.total,
                trackingNo: order.trackingNo,
                note: order.note,
              }))}
              methods={paymentMethods}
            >
              <div className="overflow-x-auto">
                <Table className="min-w-[1060px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <SelectAllHead label="Pilih semua pesanan di halaman ini" />
                      <TableHead className="pl-3">No. Pesanan</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Nama Customer</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Tgl Kirim</TableHead>
                      <TableHead>Pengiriman</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-14 pr-4">
                        <span className="sr-only">Aksi</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((order) => (
                      <OrderRow
                        key={order.id}
                        href={pageHref({ ...listParams, pesanan: order.orderNo })}
                        orderNo={order.orderNo}
                        selected={order.orderNo === selected}
                        selectId={order.id}
                      >
                        <TableCell className="tabular-nums">
                          {singleDay
                            ? formatJam(order.createdAt)
                            : `${formatTanggalPendek(order.createdAt).slice(0, 5)} ${formatJam(order.createdAt)}`}
                        </TableCell>
                        <TableCell>
                          <span className="block font-medium text-text-strong">
                            {order.customerName}
                          </span>
                          {order.type === "hadiah" && order.senderName && (
                            <span className="block text-[13px] text-text-body">
                              dari {order.senderName}
                            </span>
                          )}
                          <OrderNoteLine note={order.note} />
                        </TableCell>
                        <TableCell>
                          <ChannelBadge channel={order.channel} />
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={order.type} />
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatTanggalPendek(order.deliveryDate)}
                        </TableCell>
                        <TableCell>
                          {SHIPPING_METHOD_LABEL[order.shippingMethod]}
                          {order.trackingUrl && (
                            <span className="mt-0.5 block text-[13px]">
                              <TrackingLink url={order.trackingUrl} orderNo={order.orderNo} />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRupiah(order.total)}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <OrderRowMenu id={order.id} />
                        </TableCell>
                      </OrderRow>
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
            </OrderActionsProvider>
          )}
        </section>
        {selected && (
          <Suspense key={selected} fallback={<PanelSkeleton />}>
            <OrderDetailPanel orderNo={selected} closeHref={pageHref(listParams)} />
          </Suspense>
        )}
      </div>
    </>
  )
}

function PanelSkeleton() {
  return (
    <div
      aria-hidden
      className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] space-y-4 bg-card p-6 xl:static xl:max-w-none xl:rounded-2xl xl:border xl:border-border"
    >
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
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
