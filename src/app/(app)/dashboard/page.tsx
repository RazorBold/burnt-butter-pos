import {
  ArrowRight,
  Bike,
  ChartColumn,
  ChartPie,
  ClipboardList,
  Clock,
  CookingPot,
  FileText,
  Gift,
  Package,
  PackageCheck,
  Store,
  StickyNote,
  Truck,
  Wallet,
  type LucideIcon,
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
import { DeliveryCalendarCard } from "@/features/dashboard/components/delivery-calendar-card"
import { EvaluationCard } from "@/features/dashboard/components/evaluation-card"
import { PeriodPicker } from "@/features/dashboard/components/period-picker"
import {
  buildGrowth,
  buildInsights,
  evaluationRanges,
  evaluationStart,
} from "@/features/dashboard/evaluation"
import { parseCalendarMonth } from "@/features/dashboard/delivery-calendar"
import { parseDashboardPeriod, PERIOD_LABEL } from "@/features/dashboard/period"
import {
  getEvaluationOrders,
  getEvaluationPayments,
  getMenuQty,
} from "@/features/dashboard/queries"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { addDays, ORDER_STATUS_LABEL } from "@/features/orders/filters"
import { listLatestOrders } from "@/features/orders/queries"
import { isUrgent } from "@/features/orders/status"
import { summarizeCategories } from "@/features/packagings/categories"
import { getUnpaidStockNeeds, listPackagings } from "@/features/packagings/queries"
import { getLoyangSummary } from "@/features/packagings/loyang"
import { listProductionOrders } from "@/features/production/queries"
import { summarizeProduction } from "@/features/production/summary"
import { REPORT_COLORS } from "@/features/reports/colors"
import { ShareDonut } from "@/features/reports/components/report-charts"
import { getReportOrders, getReportPayments } from "@/features/reports/queries"
import { buildReport } from "@/features/reports/summary"
import { canAccessPath } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import {
  formatHariTanggal,
  formatJam,
  formatRupiah,
  formatTanggalPendek,
  toJakartaDateString,
} from "@/lib/format"
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
  const params = await searchParams
  const { anchor, period, from, to } = parseDashboardPeriod(params, today)
  const calendarMonth = parseCalendarMonth(params.bulan, today)
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
  const [orders, payments, weekPayments, latest, production, packagings, loyang, unpaid] =
    await Promise.all([
      getReportOrders(from, to),
      getReportPayments(from, to),
      getReportPayments(weekFrom, anchor),
      showOrders ? listLatestOrders(from, to) : Promise.resolve([]),
      listProductionOrders(anchor),
      listPackagings(),
      getLoyangSummary(),
      getUnpaidStockNeeds(anchor),
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
  // Kebutuhan box dari pesanan belum bayar, dijumlahkan per kategori stok (Large/Regular).
  const categoryOfBox = new Map(packagings.map((item) => [item.name, item.categoryId ?? "lain"]))
  const unpaidBoxes = (boxes: Record<string, number>) => {
    const byCategory = new Map<string, number>()
    for (const [name, qty] of Object.entries(boxes)) {
      const key = categoryOfBox.get(name)
      if (key) byCategory.set(key, (byCategory.get(key) ?? 0) + qty)
    }
    return byCategory
  }
  const unpaidBoxAll = unpaidBoxes(unpaid.all.boxes)
  const unpaidBoxOnDate = unpaidBoxes(unpaid.onDate.boxes)
  const anchorShort = formatTanggalPendek(anchor).slice(0, 5)
  // Ringkasan stok box hampers per kategori agar ringkas di dashboard.
  const hampersCategories = summarizeCategories(
    packagings.filter((item) => !item.name.toLowerCase().includes("loyang")),
  )

  return (
    <>
      <header className="relative">
        <h1 className="text-[28px] leading-tight font-bold text-brand-ink sm:text-[32px]">
          Halo, {user.name}!
        </h1>
        <p className="mt-1.5 text-[15px] text-text-body">Selamat datang di Burnt Butter.</p>
        <div className="relative z-10 mt-5">
          <PeriodPicker anchor={anchor} period={period} today={today} />
        </div>
      </header>

      <div className="kpi-grid relative mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FileText}
          label={`Total Pesanan${suffix}`}
          value={String(kpis.orders.value)}
          trend={trend(kpis.orders.percent)}
          series={kpis.orders.series}
        />
        <KpiCard
          icon={Package}
          label="Pesanan Normal"
          value={String(kpis.normal.value)}
          trend={trend(kpis.normal.percent)}
          series={kpis.normal.series}
        />
        <KpiCard
          icon={Gift}
          label="Pesanan Hampers"
          value={String(kpis.hampers.value)}
          trend={trend(kpis.hampers.percent)}
          series={kpis.hampers.series}
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

      <Suspense fallback={<Skeleton className="mt-4 h-[520px] rounded-2xl" />}>
        <DeliveryCalendarCard
          month={calendarMonth}
          today={today}
          params={{
            tanggal: typeof params.tanggal === "string" ? params.tanggal : undefined,
            periode: typeof params.periode === "string" ? params.periode : undefined,
          }}
          dayHref={showOrders ? "pesanan" : canAccessPath(role, "/produksi") ? "produksi" : null}
        />
      </Suspense>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {showOrders && (
          <Card
            icon={ClipboardList}
            tone="caramel"
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

        <Card icon={ChartPie} tone="rose" title="Pesanan per Tipe">
          <ShareDonut
            caption="Pesanan per tipe"
            centerLabel="pesanan"
            slices={[
              {
                key: "normal",
                label: "Normal",
                value: kpis.normal.value,
                color: REPORT_COLORS.personal,
              },
              {
                key: "hampers",
                label: "Hampers",
                value: kpis.hampers.value,
                color: REPORT_COLORS.hadiah,
              },
            ]}
          />
        </Card>

        <Card icon={ChartColumn} tone="sky" title={`Status Pesanan ${periodText}`}>
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
            icon={Wallet}
            tone="sage"
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

        <Card icon={Truck} tone="caramel" title="Pesanan per Metode Pengiriman">
          <ul className="space-y-4">
            {(["pick_up", "instant", "kurir_internal", "ekspedisi"] as const).map((method) => {
              const value = report.shipping.find((row) => row.key === method)?.value ?? 0
              const Icon = METHOD_ICON[method]
              return (
                <li
                  key={method}
                  className="grid grid-cols-[minmax(0,1.3fr)_64px_minmax(0,1fr)] items-center gap-3 text-sm"
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap text-text-strong">
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
          icon={CookingPot}
          tone="sage"
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
          icon={Package}
          tone="rose"
          title="Packaging & Loyang"
          link={
            canAccessPath(role, "/stok-packaging")
              ? { href: "/stok-packaging", label: "Lihat Semua" }
              : undefined
          }
        >
          {/* Pesanan belum bayar belum memotong stok: tampilkan sebagai cadangan yang perlu
              diantisipasi (total, dan yang dikirim pada tanggal Dashboard). */}
          <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-status-diproses px-3 py-2 text-[13px] text-status-diproses-fg">
            <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold tabular-nums">{unpaid.all.orders}</strong> pesanan
              belum bayar (
              <strong className="font-semibold tabular-nums">{unpaid.onDate.orders}</strong> kirim{" "}
              {anchorShort}). Stok di bawah sudah dikurangi pesanan lunas.
            </span>
          </p>
          {/* Sorotan Sisa Loyang Hari Ini (Large & Regular) */}
          <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
            {[loyang.large, loyang.regular].map((item) => (
              <div key={item.size} className="rounded-xl border border-border bg-nav-active/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-text-body uppercase">
                    <CookingPot className="size-3.5 text-brand-ink" aria-hidden />
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      item.status === "cukup"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.status === "menipis"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800",
                    )}
                  >
                    {item.status === "cukup"
                      ? "Cukup"
                      : item.status === "menipis"
                        ? "Menipis"
                        : "Habis"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-xl font-bold text-brand-ink tabular-nums">
                    {item.stock}{" "}
                    <span className="text-xs font-medium text-text-body">{item.unit}</span>
                  </span>
                  <span className="text-xs text-text-body">
                    Pakai:{" "}
                    <strong className="font-semibold text-text-strong tabular-nums">
                      {item.outToday}
                    </strong>{" "}
                    · Masuk:{" "}
                    <strong className="font-semibold text-text-strong tabular-nums">
                      {item.inToday}
                    </strong>
                  </span>
                </div>
                <UnpaidLine
                  stock={item.stock}
                  all={item.size === "large" ? unpaid.all.loyangLarge : unpaid.all.loyangRegular}
                  onDate={
                    item.size === "large" ? unpaid.onDate.loyangLarge : unpaid.onDate.loyangRegular
                  }
                  dateLabel={anchorShort}
                  testId={`belum-bayar-${item.name}`}
                />
              </div>
            ))}
          </div>

          {hampersCategories.length === 0 ? (
            <Empty>Belum ada packaging hampers.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {hampersCategories.map((cat) => {
                const percent = cat.capacity
                  ? Math.min(100, Math.round((cat.stock / cat.capacity) * 100))
                  : null
                return (
                  <li
                    key={cat.key}
                    className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-text-strong">
                      <Package className="size-4 shrink-0 text-brand-ink" aria-hidden />
                      {/* Tidak dipotong: "Box Hampers Large" dan "… Regular" harus terbaca. */}
                      <span className="leading-snug">{cat.title}</span>
                      <span className="shrink-0 text-xs font-normal text-text-body">
                        ({cat.itemCount})
                      </span>
                    </span>
                    {percent !== null ? (
                      <span
                        role="img"
                        aria-label={`${cat.stock} dari ${cat.capacity} pcs, ${cat.status}`}
                        className="h-2.5 overflow-hidden rounded-full bg-nav-active"
                      >
                        <span
                          className={cn("block h-full rounded-full", STOCK_BAR_COLOR[cat.status])}
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                    ) : (
                      <span className="text-[13px] text-text-body">
                        {cat.status === "cukup"
                          ? "Cukup"
                          : cat.status === "menipis"
                            ? "Menipis"
                            : "Habis"}
                      </span>
                    )}
                    <span className="text-right font-semibold text-text-strong tabular-nums">
                      {cat.stock}
                      {cat.capacity !== null && (
                        <span className="font-normal text-text-body"> / {cat.capacity}</span>
                      )}
                    </span>
                    <UnpaidLine
                      className="col-span-3 pl-6"
                      stock={cat.stock}
                      all={unpaidBoxAll.get(cat.key) ?? 0}
                      onDate={unpaidBoxOnDate.get(cat.key) ?? 0}
                      dateLabel={anchorShort}
                      testId={`belum-bayar-${cat.title}`}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Suspense fallback={<Skeleton className="mt-4 h-[420px] rounded-2xl" />}>
        <Evaluation anchor={anchor} today={today} showMoney={showMoney} />
      </Suspense>
    </>
  )
}

/** Kartu Evaluasi & Masukan; di-stream terpisah supaya kartu lain tidak menunggu. */
async function Evaluation({
  anchor,
  today,
  showMoney,
}: {
  anchor: string
  today: string
  showMoney: boolean
}) {
  const week = evaluationRanges(anchor).minggu
  const [orders, payments, menusNow, menusBefore] = await Promise.all([
    getEvaluationOrders(evaluationStart(anchor), anchor),
    showMoney ? getEvaluationPayments(evaluationStart(anchor), anchor) : Promise.resolve([]),
    getMenuQty(week.now.from, week.now.to),
    getMenuQty(week.before.from, week.before.to),
  ])
  return (
    <EvaluationCard
      growth={buildGrowth(orders, payments, anchor)}
      insights={buildInsights({
        orders,
        payments,
        anchor,
        menusNow,
        menusBefore,
        showMoney,
        isToday: anchor === today,
        formatMoney: formatRupiah,
      })}
      showMoney={showMoney}
      dateLabel={formatHariTanggal(anchor)}
    />
  )
}

/**
 * Kartu Dashboard: ikon judul berwarna sesuai nada (karamel, sage, rose, sky) supaya kartu-kartu
 * tidak seragam; isi kartu tetap putih bersih.
 */
function Card({
  title,
  icon: Icon,
  tone,
  link,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  tone: "caramel" | "sage" | "rose" | "sky"
  link?: { href: string; label: string }
  className?: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        `tone-${tone} min-w-0 rounded-2xl border border-border bg-card p-5 shadow-card`,
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-lg leading-snug font-bold text-brand-ink">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tone-soft text-tone-ink ring-1 ring-tone-ring">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0">{title}</span>
        </h2>
        {link && (
          <Link
            href={link.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-text-strong hover:bg-nav-active"
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

/** Baris pantauan: kebutuhan dari pesanan belum bayar dan sisa stok bila semuanya jadi lunas. */
function UnpaidLine({
  stock,
  all,
  onDate,
  dateLabel,
  className,
  testId,
}: {
  stock: number
  all: number
  onDate: number
  dateLabel: string
  className?: string
  testId: string
}) {
  const left = stock - all
  return (
    <p data-testid={testId} className={cn("mt-1.5 text-xs text-text-body", className)}>
      Belum bayar: <strong className="font-semibold text-text-strong tabular-nums">{all}</strong>
      {onDate > 0 && (
        <>
          {" "}
          ({onDate} kirim {dateLabel})
        </>
      )}{" "}
      · Sisa bila lunas:{" "}
      <strong
        className={cn(
          "font-semibold tabular-nums",
          left < 0 ? "text-trend-down-fg" : "text-text-strong",
        )}
      >
        {left}
      </strong>
      {left < 0 && <span className="text-trend-down-fg"> (kurang)</span>}
    </p>
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
