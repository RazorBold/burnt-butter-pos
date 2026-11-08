import {
  ArrowRight,
  Bike,
  FileText,
  Gift,
  Package,
  PackageCheck,
  Store,
  StickyNote,
  Truck,
  Wallet,
} from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Fragment, type ReactNode, Suspense } from "react"

import { AccessDeniedToast } from "@/components/app/access-denied-toast"
import { KpiCard, KpiCardSkeleton } from "@/components/app/kpi-card"
import { OrderStatusBadge, UrgentBadge, TypeBadge } from "@/components/app/order-badges"
import { PAGE_CONTAINER } from "@/components/app/page-header"
import { STOCK_BAR_COLOR } from "@/components/app/stock-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PaymentLineChart, StatusBarChart } from "@/features/dashboard/components/dashboard-charts"
import { PeriodPicker } from "@/features/dashboard/components/period-picker"
import { parseDashboardPeriod, PERIOD_LABEL } from "@/features/dashboard/period"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { addDays, ORDER_STATUS_LABEL } from "@/features/orders/filters"
import { listLatestOrders } from "@/features/orders/queries"
import { isUrgent } from "@/features/orders/status"
import { listPackagings } from "@/features/packagings/queries"
import { listProductionOrders } from "@/features/production/queries"
import { summarizeProduction } from "@/features/production/summary"
import { REPORT_COLORS } from "@/features/reports/colors"
import { ShareDonut } from "@/features/reports/components/report-charts"
import { getReportOrders, getReportPayments } from "@/features/reports/queries"
import { buildReport } from "@/features/reports/summary"
import { canAccessPath } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatJam, formatRupiah, formatTanggalPendek, toJakartaDateString } from "@/lib/format"
import { photoSrc } from "@/lib/photos"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

const METHOD_ICON = {
  pick_up: Store,
  instant: Bike,
  kurir_internal: Truck,
  ekspedisi: PackageCheck,
} as const

type SearchParams = PageProps<"/dashboard">["searchParams"]

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
      <Suspense>
        <AccessDeniedToast />
      </Suspense>
    </main>
  )
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePageAccess("/dashboard")
  const today = toJakartaDateString(new Date())
  const { anchor, period, from, to } = parseDashboardPeriod(await searchParams, today)
  const role = user.role
  // Dashboard dibuka semua role; kartu dan tautan mengikuti hak akses (PRD "Pengguna & peran").
  const showOrders = canAccessPath(role, "/pesanan")
  const showMoney = role !== "produksi"
  const paymentLink = canAccessPath(role, "/laporan")
    ? "/laporan"
    : canAccessPath(role, "/pembayaran")
      ? "/pembayaran"
      : null

  const weekFrom = addDays(anchor, -6)
  const [orders, payments, weekPayments, latest, production, packagings] = await Promise.all([
    getReportOrders(from, to),
    getReportPayments(from, to),
    getReportPayments(weekFrom, anchor),
    showOrders ? listLatestOrders(from, to) : Promise.resolve([]),
    listProductionOrders(anchor),
    listPackagings(),
  ])
  const report = buildReport(orders, payments, from, to)
  const week = buildReport([], weekPayments, weekFrom, anchor).kpis.payments
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekFrom, index))
  const menus = summarizeProduction(production)
  const { kpis } = report
  const periodText = PERIOD_LABEL[period]
  const suffix = period === "hari" ? " Hari Ini" : ""
  const trend = (percent: number | null) => (percent === null ? undefined : { percent })
  const totalOrders = kpis.orders.value
  const pct = (value: number) => (totalOrders ? Math.round((value / totalOrders) * 100) : 0)
  // Packaging yang perlu restock dulu, lalu yang punya kapasitas (bisa digambar bar-nya).
  const stock = [...packagings]
    .sort(
      (a, b) =>
        Number(a.status === "cukup") - Number(b.status === "cukup") ||
        Number(a.capacity === null) - Number(b.capacity === null),
    )
    .slice(0, 4)

  return (
    <>
      <header className="relative">
        <h1 className="text-[28px] leading-tight font-bold text-brand-ink sm:text-[32px]">
          Halo, {user.name}!
        </h1>
        <p className="mt-1.5 text-[15px] text-text-body">
          Selamat datang di Burnt Butter &amp; Segelas Awan.
        </p>
        <div className="relative z-10 mt-5">
          <PeriodPicker anchor={anchor} period={period} today={today} />
        </div>
        <Image
          src="/images/brand/header-pasta.webp"
          alt=""
          width={553}
          height={307}
          priority
          className="pointer-events-none absolute -top-8 right-0 hidden h-[190px] w-auto [mask-image:linear-gradient(to_right,transparent,black_35%),linear-gradient(to_bottom,black_70%,transparent)] [mask-composite:intersect] select-none lg:block"
        />
      </header>

      <div className="relative mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FileText}
          label={`Total Pesanan${suffix}`}
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
        {showMoney ? (
          <KpiCard
            icon={Wallet}
            label={`Total Pembayaran${suffix}`}
            value={formatRupiah(kpis.payments.value)}
            trend={trend(kpis.payments.percent)}
            series={kpis.payments.series}
          />
        ) : (
          <KpiCard
            icon={Package}
            label={`Total Porsi${suffix}`}
            value={`${kpis.portions.value} porsi`}
            trend={trend(kpis.portions.percent)}
            series={kpis.portions.series}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {showOrders && (
          <Card
            title="Daftar Pesanan Terbaru"
            className="xl:row-span-2"
            link={{ href: "/pesanan", label: "Lihat Semua" }}
          >
            {latest.length === 0 ? (
              <Empty>Belum ada pesanan pada periode ini.</Empty>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-strong">
                      {["No. Pesanan", "Waktu", "Nama", "Tipe", "Total", "Status"].map((head) => (
                        <th
                          key={head}
                          scope="col"
                          className={cn(
                            "px-2 py-2.5 font-medium first:pl-5 last:pr-5",
                            head === "Total" && "text-right",
                          )}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((order) => (
                      <Fragment key={order.id}>
                        <tr
                          className={cn(
                            "border-b border-border last:border-0",
                            order.note && "border-b-0",
                          )}
                        >
                          <td className="py-3 pr-2 pl-5 tabular-nums">
                            <Link
                              href={`/pesanan?pesanan=${order.orderNo}`}
                              className="font-medium text-text-strong hover:underline"
                            >
                              {order.orderNo}
                            </Link>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap tabular-nums">
                            {period === "hari"
                              ? formatJam(order.createdAt)
                              : `${formatTanggalPendek(order.createdAt).slice(0, 5)} ${formatJam(order.createdAt)}`}
                          </td>
                          <td className="px-2 py-3 text-text-strong">{order.customerName}</td>
                          <td className="px-2 py-3">
                            <TypeBadge type={order.type} />
                          </td>
                          <td className="px-2 py-3 text-right whitespace-nowrap tabular-nums">
                            {formatRupiah(order.total)}
                          </td>
                          <td className="py-3 pr-5 pl-2">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <OrderStatusBadge status={order.status} />
                              {isUrgent(order) && <UrgentBadge note={order.urgentNote} />}
                            </span>
                          </td>
                        </tr>
                        {/* Baris sendiri supaya catatan terbaca penuh tanpa melebarkan kolom. */}
                        {order.note && (
                          <tr className="border-b border-border last:border-0">
                            <td
                              colSpan={6}
                              className="px-5 pb-3 text-[13px] text-status-diproses-fg"
                            >
                              <span className="flex items-start gap-1.5">
                                <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                                <span className="break-words">
                                  <span className="sr-only">Catatan {order.orderNo}: </span>
                                  {order.note}
                                </span>
                              </span>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        <Card title="Pesanan per Tipe">
          <ShareDonut
            caption="Pesanan per tipe"
            centerLabel="pesanan"
            slices={[
              {
                key: "personal",
                label: "Personal",
                value: kpis.personal.value,
                color: REPORT_COLORS.personal,
              },
              {
                key: "hadiah",
                label: "Hadiah",
                value: kpis.hadiah.value,
                color: REPORT_COLORS.hadiah,
              },
            ]}
          />
        </Card>

        <Card title={`Status Pesanan ${periodText}`}>
          <StatusBarChart
            data={report.status.map(({ key, value }) => ({
              key,
              value,
              label: ORDER_STATUS_LABEL[key],
            }))}
          />
        </Card>

        {showMoney && (
          <Card
            title="Total Pembayaran"
            link={paymentLink ? { href: paymentLink, label: "Lihat Detail" } : undefined}
          >
            <p className="flex flex-wrap items-center gap-2 text-[26px] leading-tight font-bold text-text-strong tabular-nums">
              {formatRupiah(week.value)}
              {week.percent !== null && <Change percent={week.percent} />}
            </p>
            <p className="text-[13px] text-text-body">Lunas 7 hari terakhir</p>
            <div className="mt-2">
              <PaymentLineChart
                data={weekDays.map((day, index) => ({ day, value: week.series[index] ?? 0 }))}
              />
            </div>
          </Card>
        )}

        <Card title="Pesanan per Metode Pengiriman">
          <ul className="space-y-4">
            {(["pick_up", "instant", "kurir_internal", "ekspedisi"] as const).map((method) => {
              const value = report.shipping.find((row) => row.key === method)?.value ?? 0
              const Icon = METHOD_ICON[method]
              return (
                <li
                  key={method}
                  className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-center gap-3 text-sm"
                >
                  <span className="flex items-center gap-2.5 text-text-strong">
                    <Icon className="size-5 shrink-0 text-brand-ink" aria-hidden />
                    {SHIPPING_METHOD_LABEL[method]}
                  </span>
                  <span className="font-semibold text-text-strong tabular-nums">
                    {value} <span className="font-normal text-text-body">({pct(value)}%)</span>
                  </span>
                  <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-nav-active">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pct(value)}%`, background: REPORT_COLORS[method] }}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <Card
          title={
            anchor === today
              ? "Rekap Produksi Hari Ini"
              : `Rekap Produksi ${formatTanggalPendek(anchor)}`
          }
          link={
            canAccessPath(role, "/produksi")
              ? {
                  href: anchor === today ? "/produksi" : `/produksi?tanggal=${anchor}`,
                  label: "Lihat Detail",
                }
              : undefined
          }
        >
          {menus.length === 0 ? (
            <Empty>Belum ada pesanan yang dikirim pada tanggal ini.</Empty>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
              {menus.map((menu) => {
                const src = photoSrc(menu.photoPath)
                const unit = menu.sized ? "porsi" : "pcs"
                return (
                  <li key={menu.menuName} className="flex items-center gap-3">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span aria-hidden className="size-14 shrink-0 rounded-xl bg-nav-active" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-snug text-text-strong">
                        {menu.menuName}
                      </span>
                      <span className="block text-lg font-bold text-brand-ink tabular-nums">
                        {menu.total} <span className="text-sm font-semibold">{unit}</span>
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Stok Packaging (Ringkas)"
          link={
            canAccessPath(role, "/stok-packaging")
              ? { href: "/stok-packaging", label: "Lihat Semua" }
              : undefined
          }
        >
          {stock.length === 0 ? (
            <Empty>Belum ada packaging.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {stock.map((item) => {
                const percent = item.capacity
                  ? Math.min(100, Math.round((item.stock / item.capacity) * 100))
                  : null
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2 text-text-strong">
                      <Package className="size-4 shrink-0 text-brand-ink" aria-hidden />
                      {item.name}
                    </span>
                    {percent !== null ? (
                      <span
                        role="img"
                        aria-label={`${item.stock} dari ${item.capacity} ${item.unit}, ${item.status}`}
                        className="h-2.5 overflow-hidden rounded-full bg-nav-active"
                      >
                        <span
                          className={cn("block h-full rounded-full", STOCK_BAR_COLOR[item.status])}
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                    ) : (
                      <span className="text-[13px] text-text-body">
                        {item.status === "cukup"
                          ? "Cukup"
                          : item.status === "menipis"
                            ? "Menipis"
                            : "Habis"}
                      </span>
                    )}
                    <span className="text-right font-semibold text-text-strong tabular-nums">
                      {item.stock}
                      {item.capacity !== null && (
                        <span className="font-normal text-text-body"> / {item.capacity}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

function Card({
  title,
  link,
  className,
  children,
}: {
  title: string
  link?: { href: string; label: string }
  className?: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn("min-w-0 rounded-2xl border border-border bg-card p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-brand-ink">{title}</h2>
        {link && (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-strong hover:bg-nav-active"
          >
            {link.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
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
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold",
        up ? "bg-trend-up text-trend-up-fg" : "bg-trend-down text-trend-down-fg",
      )}
    >
      <span className="sr-only">{up ? "Naik " : "Turun "}</span>
      {up ? "↑" : "↓"} {Math.abs(Math.round(percent))}%
    </span>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-sm text-text-body">{children}</p>
}

function DashboardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <Skeleton className="mt-5 h-11 w-[560px] max-w-full rounded-xl" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
