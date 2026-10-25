import { Bike, CircleCheck, Store, Truck, UserRound } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { PAGE_CONTAINER } from "@/components/app/page-header"
import { SelectAllHead } from "@/components/app/row-selection"
import { ShipmentStatusBadge, ShippingMethodLabel } from "@/components/app/shipment-badges"
import { TablePagination } from "@/components/app/table-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrderRow } from "@/features/orders/components/order-row"
import {
  ShipmentActionsProvider,
  ShipmentRowMenu,
} from "@/features/shipments/components/shipment-bulk-actions"
import { ShipmentDetailPanel } from "@/features/shipments/components/shipment-detail-panel"
import { ShipmentFilters } from "@/features/shipments/components/shipment-filters"
import {
  parseShipmentFilters,
  SLOT_LABEL,
  stateOf,
  TAB_LABEL,
  type ShipmentFilters as Filters,
} from "@/features/shipments/logic"
import {
  getShipmentSummary,
  listActiveCouriers,
  listShipments,
  SHIPMENT_PAGE_SIZE,
} from "@/features/shipments/queries"
import { requirePageAccess } from "@/lib/auth"
import { formatHariTanggal, toJakartaDateString } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Pengiriman" }

const PATH = "/pengiriman"

type SearchParams = PageProps<"/pengiriman">["searchParams"]

export default function PengirimanPage({ searchParams }: PageProps<"/pengiriman">) {
  return (
    <main className={PAGE_CONTAINER}>
      <header className="relative">
        <h1 className="text-[28px] leading-tight font-bold text-brand-ink sm:text-[32px]">
          Pengiriman
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[15px] text-text-body">
          Kelola pesanan yang akan dikirim, pantau status, dan atur rute kurir.
        </p>
        {/* Hiasan seperti 04-pengiriman.png: box pasta di pojok kanan atas. */}
        <Image
          src="/images/brand/header-pasta.webp"
          alt=""
          width={553}
          height={307}
          priority={false}
          className="pointer-events-none absolute -top-8 right-0 hidden h-[150px] w-auto [mask-image:linear-gradient(to_right,transparent,black_35%),linear-gradient(to_bottom,black_70%,transparent)] [mask-composite:intersect] select-none lg:block"
        />
      </header>
      <Suspense fallback={<SummarySkeleton />}>
        <Summary searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton aria-hidden className="mt-6 h-[560px] rounded-2xl" />}>
        <ShipmentList searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function readFilters(searchParams: SearchParams) {
  const today = toJakartaDateString(new Date())
  const params = await searchParams
  const selected = typeof params.pesanan === "string" ? params.pesanan : undefined
  return { today, filters: parseShipmentFilters(params, today), selected }
}

function pageHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
  const qs = search.toString()
  return qs ? `${PATH}?${qs}` : PATH
}

function listParams(filters: Filters, today: string, page?: number) {
  return {
    tanggal: filters.date === today ? undefined : filters.date,
    tab: filters.tab === "semua" ? undefined : filters.tab,
    metode: filters.method,
    kurir: filters.courierId,
    status: filters.state,
    hal: page && page > 1 ? String(page) : undefined,
  }
}

async function Summary({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const { today, filters } = await readFilters(searchParams)
  const summary = await getShipmentSummary(filters.date)
  // Tanggalnya sudah terlihat di pemilih tanggal; label cukup menyebut "Hari Ini" bila hari ini.
  const day = filters.date === today ? " Hari Ini" : ""

  return (
    <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      <KpiCard icon={Truck} label={`Perlu Dikirim${day}`} value={String(summary.perlu)} />
      <KpiCard icon={UserRound} label="Kurir Internal" value={String(summary.kurirInternal)} />
      <KpiCard icon={Bike} label="Instant" value={String(summary.instant)} />
      <KpiCard icon={Store} label="Pick Up" value={String(summary.pickUp)} />
      <KpiCard icon={CircleCheck} label={`Selesai Dikirim${day}`} value={String(summary.selesai)} />
    </div>
  )
}

async function ShipmentList({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const { today, filters, selected } = await readFilters(searchParams)
  const [{ rows, total, page, pageCount, tabCounts }, couriers] = await Promise.all([
    listShipments(filters),
    listActiveCouriers(),
  ])
  const params = listParams(filters, today, page)
  const dayText = filters.date === today ? "hari ini" : formatHariTanggal(filters.date)

  return (
    <>
      <div className="mt-6">
        <ShipmentFilters
          date={filters.date}
          today={today}
          tab={filters.tab}
          tabCounts={tabCounts}
          couriers={couriers}
        />
      </div>

      <div
        className={cn(
          "mt-6 grid items-start gap-6",
          selected && "xl:grid-cols-[minmax(0,1fr)_440px]",
        )}
      >
        <section
          aria-label="Daftar pengiriman"
          className="min-w-0 rounded-2xl border border-border bg-card"
        >
          {rows.length === 0 ? (
            <div className="px-6 py-12">
              <p className="font-semibold text-brand-ink">
                {filters.tab === "semua"
                  ? `Belum ada pesanan yang dikirim ${dayText}.`
                  : `Tidak ada pesanan di ${TAB_LABEL[filters.tab]} untuk ${dayText}.`}
              </p>
              <p className="mt-1 text-sm text-text-body">
                Pesanan muncul di sini sesuai tanggal kirimnya. Pilih tanggal lain atau Reset
                filter.
              </p>
            </div>
          ) : (
            <ShipmentActionsProvider
              // Pilihan checkbox kosong lagi saat isi halaman tabel berganti.
              key={rows.map((row) => row.orderId).join()}
              rows={rows.map((row) => ({
                id: row.orderId,
                orderNo: row.orderNo,
                orderStatus: row.orderStatus,
                method: row.method,
                courierId: row.courierId,
                slot: row.slot,
              }))}
              couriers={couriers}
            >
              <div className="overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <SelectAllHead label="Pilih semua pesanan di halaman ini" />
                      <TableHead className="pl-3">No. Pesanan</TableHead>
                      <TableHead>Nama Customer</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Kurir</TableHead>
                      <TableHead>Estimasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-14 pr-4">
                        <span className="sr-only">Aksi</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <OrderRow
                        key={row.orderId}
                        href={pageHref({ ...params, pesanan: row.orderNo })}
                        orderNo={row.orderNo}
                        selected={row.orderNo === selected}
                        selectId={row.orderId}
                      >
                        <TableCell>
                          <span className="block font-medium text-text-strong">
                            {row.customerName}
                          </span>
                          {row.type === "hadiah" && row.senderName && (
                            <span className="block text-[13px] text-text-body">
                              dari {row.senderName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ShippingMethodLabel method={row.method} />
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="block truncate" title={row.address ?? undefined}>
                            {row.method === "pick_up" ? "-" : (row.address ?? "-")}
                          </span>
                        </TableCell>
                        <TableCell>{row.courierName ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {row.slot ? SLOT_LABEL[row.slot] : "-"}
                        </TableCell>
                        <TableCell>
                          <ShipmentStatusBadge state={stateOf(row.status)} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <ShipmentRowMenu id={row.orderId} />
                        </TableCell>
                      </OrderRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                pathname={PATH}
                params={listParams(filters, today)}
                page={page}
                pageCount={pageCount}
                pageSize={SHIPMENT_PAGE_SIZE}
                total={total}
                noun="pesanan"
              />
            </ShipmentActionsProvider>
          )}
        </section>
        {selected && (
          <Suspense
            key={selected}
            fallback={<Skeleton aria-hidden className="h-[520px] rounded-2xl" />}
          >
            <ShipmentDetailPanel orderNo={selected} closeHref={pageHref(params)} />
          </Suspense>
        )}
      </div>
    </>
  )
}

function SummarySkeleton() {
  return (
    <div aria-hidden className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <KpiCardSkeleton key={index} />
      ))}
    </div>
  )
}
