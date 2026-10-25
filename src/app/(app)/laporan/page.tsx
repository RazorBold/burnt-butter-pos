import {
  ArrowDown,
  ArrowUp,
  Banknote,
  FileText,
  Landmark,
  Package,
  UsersRound,
  Wallet,
} from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Suspense } from "react"

import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { PAGE_CONTAINER } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { ORDER_STATUS_LABEL, parseOrderFilters } from "@/features/orders/filters"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { PAYMENT_METHOD_TYPE_LABEL } from "@/features/payment-methods/schemas"
import {
  DailySalesChart,
  OrderTrendChart,
  SeriesLegend,
  ShareDonut,
} from "@/features/reports/components/report-charts"
import { REPORT_COLORS } from "@/features/reports/colors"
import { ReportRangeFilter } from "@/features/reports/components/report-range-filter"
import { getReportOrders, getReportPayments, getTopProducts } from "@/features/reports/queries"
import { buildReport } from "@/features/reports/summary"
import { requirePageAccess } from "@/lib/auth"
import { formatRupiah, formatTanggal, toJakartaDateString } from "@/lib/format"
import { photoSrc } from "@/lib/photos"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Laporan" }

const PATH = "/laporan"
const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const
const PAYMENT_ICON = { bank: Landmark, ewallet: Wallet, cash: Banknote } as const

type SearchParams = PageProps<"/laporan">["searchParams"]

// Tab Ringkasan (05-laporan.png). Tab lain (Penjualan, Produk, ...) belum didesain (BELL-36),
// jadi belum ditampilkan supaya tidak ada tab yang kosong.
export default function LaporanPage({ searchParams }: PageProps<"/laporan">) {
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense fallback={<ReportSkeleton />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Report({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess(PATH)
  const today = toJakartaDateString(new Date())
  const monthStart = `${today.slice(0, 8)}01`
  const params = await searchParams
  const custom = typeof params.dari === "string" || typeof params.sampai === "string"
  const { from, to } = custom ? parseOrderFilters(params, today) : { from: monthStart, to: today }

  const [orders, payments, topProducts] = await Promise.all([
    getReportOrders(from, to),
    getReportPayments(from, to),
    getTopProducts(from, to),
  ])
  const report = buildReport(orders, payments, from, to)
  const { kpis } = report
  const trend = (percent: number | null) => (percent === null ? undefined : { percent })

  return (
    <>
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold text-brand-ink sm:text-[32px]">
            Laporan
          </h1>
          <p className="mt-1.5 max-w-[70ch] text-[15px] text-text-body">
            Pantau performa bisnis, penjualan, produksi, dan operasional dalam satu tempat.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3 xl:mr-[300px]">
          <ReportRangeFilter from={from} to={to} defaultFrom={monthStart} defaultTo={today} />
        </div>
        <Image
          src="/images/brand/header-pasta.webp"
          alt=""
          width={553}
          height={307}
          className="pointer-events-none absolute -top-8 right-0 hidden h-[150px] w-auto [mask-image:linear-gradient(to_right,transparent,black_35%),linear-gradient(to_bottom,black_70%,transparent)] [mask-composite:intersect] select-none xl:block"
        />
      </header>
      <p className="mt-3 text-sm text-text-body">
        Ringkasan {formatTanggal(from)} sampai {formatTanggal(to)}, dibanding periode sebelumnya
        dengan panjang yang sama.
      </p>

      <div className="relative mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FileText}
          label="Total Pesanan"
          value={String(kpis.orders.value)}
          trend={trend(kpis.orders.percent)}
          series={kpis.orders.series}
        />
        <KpiCard
          icon={Package}
          label="Total Produk Terjual"
          value={`${kpis.portions.value} porsi`}
          trend={trend(kpis.portions.percent)}
          series={kpis.portions.series}
        />
        <KpiCard
          icon={Wallet}
          label="Total Pembayaran"
          value={formatRupiah(kpis.payments.value)}
          trend={trend(kpis.payments.percent)}
          series={kpis.payments.series}
        />
        <KpiCard
          icon={UsersRound}
          label="Total Customer"
          value={String(kpis.customers.value)}
          trend={trend(kpis.customers.percent)}
          series={kpis.customers.series}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <ReportCard
          title="Tren Pesanan"
          actions={
            <SeriesLegend
              items={[
                { label: "Personal", color: REPORT_COLORS.personal },
                { label: "Hadiah", color: REPORT_COLORS.hadiah },
              ]}
            />
          }
        >
          <OrderTrendChart perDay={report.perDay} />
        </ReportCard>
        <ReportCard title="Distribusi Pesanan per Metode Pengiriman">
          <ShareDonut
            caption="Pesanan per metode pengiriman"
            centerLabel="pesanan"
            slices={report.shipping.map(({ key, value }) => ({
              key,
              value,
              label: SHIPPING_METHOD_LABEL[key],
              color: REPORT_COLORS[key],
            }))}
          />
        </ReportCard>
        <ReportCard title="Status Pesanan">
          <ShareDonut
            caption="Pesanan per status"
            centerLabel="pesanan"
            slices={[...report.status].reverse().map(({ key, value }) => ({
              key,
              value,
              label: ORDER_STATUS_LABEL[key],
              color: REPORT_COLORS[key],
            }))}
          />
          {report.cancelled > 0 && (
            <p className="mt-3 text-[13px] text-text-body">
              {report.cancelled} pesanan dibatalkan tidak dihitung.
            </p>
          )}
        </ReportCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <ReportCard title="Produk Terlaris">
          {topProducts.length === 0 ? (
            <EmptyNote />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-strong">
                  <th scope="col" className="py-2 pr-2 font-medium">
                    No.
                  </th>
                  <th scope="col" className="py-2 pr-2 font-medium">
                    Menu
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">
                    Total Terjual
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => {
                  const src = photoSrc(product.photoPath)
                  const size = SIZE_LABEL[product.size]
                  return (
                    <tr
                      key={`${product.menuName}-${product.size}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2.5 pr-2 tabular-nums">{index + 1}</td>
                      <td className="py-2.5 pr-2">
                        <span className="flex items-center gap-2.5">
                          {src ? (
                            <Image
                              src={src}
                              alt=""
                              width={36}
                              height={36}
                              className="size-9 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="size-9 shrink-0 rounded-md bg-nav-active"
                            />
                          )}
                          <span className="text-text-strong">
                            {product.menuName}
                            {size && (
                              <span className="block text-[13px] text-text-body">({size})</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular-nums">{product.qty}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {kpis.portions.value
                          ? Math.round((product.qty / kpis.portions.value) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </ReportCard>
        <ReportCard title="Rekap Penjualan per Hari">
          <DailySalesChart perDay={report.perDay} />
        </ReportCard>
        <ReportCard
          title="Metode Pembayaran"
          actions={
            <Link
              href="/pembayaran"
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-strong hover:bg-nav-active"
            >
              Lihat Detail
            </Link>
          }
        >
          <ul className="space-y-3.5">
            {report.paymentMethods.map((method) => {
              const Icon = PAYMENT_ICON[method.type]
              const percent = Math.round(method.share * 100)
              return (
                <li
                  key={method.type}
                  className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-text-strong">
                    <Icon className="size-4 shrink-0 text-brand-ink" aria-hidden />
                    {PAYMENT_METHOD_TYPE_LABEL[method.type]}
                  </span>
                  <span className="text-right font-semibold text-text-strong tabular-nums">
                    {percent}%
                  </span>
                  <span
                    role="img"
                    aria-label={`${PAYMENT_METHOD_TYPE_LABEL[method.type]} ${percent}%, ${formatRupiah(method.amount)}`}
                    className="h-2.5 overflow-hidden rounded-full bg-nav-active"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${percent}%`, background: REPORT_COLORS.personal }}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-nav-active/70 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm text-text-body">Total Pembayaran</p>
              <p className="flex flex-wrap items-center gap-2 text-xl font-bold text-brand-ink tabular-nums">
                {formatRupiah(kpis.payments.value)}
                {kpis.payments.percent !== null && <Change percent={kpis.payments.percent} />}
              </p>
              <p className="text-[13px] text-text-body">
                Lunas pada periode ini, dibanding periode sebelumnya.
              </p>
            </div>
          </div>
        </ReportCard>
      </div>
    </>
  )
}

function ReportCard({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="min-w-0 rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-brand-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

function Change({ percent }: { percent: number }) {
  const up = percent >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        up ? "bg-trend-up text-trend-up-fg" : "bg-trend-down text-trend-down-fg",
      )}
    >
      {up ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : (
        <ArrowDown className="size-3" aria-hidden />
      )}
      <span className="sr-only">{up ? "Naik" : "Turun"}</span>
      {Math.abs(Math.round(percent))}%
    </span>
  )
}

function EmptyNote() {
  return <p className="py-6 text-sm text-text-body">Belum ada pesanan pada periode ini.</p>
}

function ReportSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[300px] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
