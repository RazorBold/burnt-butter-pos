// Kartu "Evaluasi & Masukan" di Dashboard: pertumbuhan harian / mingguan / bulanan dan masukan
// otomatis dari data pesanan. Murni (tanpa DB) supaya bisa diuji. Pesanan dibatalkan tidak
// dihitung, kecuali untuk rasio pembatalan.

import { addDays } from "@/features/orders/filters"

import type { ReportOrder } from "../reports/summary"

export type EvalOrder = ReportOrder & {
  /** Tanggal pesanan pertama (tidak dibatalkan) customer ini, WIB. */
  firstDay: string | null
}

export type EvalPayment = { day: string; amount: number }

export type MenuQty = { menuName: string; qty: number }

type Range = { from: string; to: string }

export type Metric = { now: number; before: number; percent: number | null }

export type GrowthRow = {
  key: "hari" | "minggu" | "bulan"
  label: string
  /** Mis. "vs kemarin". */
  compare: string
  orders: Metric
  portions: Metric
  revenue: Metric
  /** Rata-rata nilai per pesanan (total pesanan / jumlah pesanan). */
  average: Metric
}

export type InsightTone = "naik" | "turun" | "saran" | "waspada"

export type Insight = { key: string; tone: InsightTone; title: string; text: string }

/** Perubahan di bawah ini dianggap stabil. */
export const STABLE_PERCENT = 10

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

export const percentChange = (now: number, before: number) =>
  before === 0 ? null : ((now - before) / before) * 100

const metric = (now: number, before: number): Metric => ({
  now,
  before,
  percent: percentChange(now, before),
})

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Rentang pembanding: hari ini vs kemarin, 7 hari vs 7 hari sebelumnya, bulan berjalan vs tanggal yang sama bulan lalu. */
export function evaluationRanges(anchor: string) {
  const [year, month, day] = anchor.split("-").map(Number)
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const pad = (value: number) => String(value).padStart(2, "0")
  const prevStart = `${prevYear}-${pad(prevMonth)}-01`
  const prevEnd = `${prevYear}-${pad(prevMonth)}-${pad(Math.min(day, daysInMonth(prevYear, prevMonth)))}`
  return {
    hari: {
      now: { from: anchor, to: anchor },
      before: { from: addDays(anchor, -1), to: addDays(anchor, -1) },
    },
    minggu: {
      now: { from: addDays(anchor, -6), to: anchor },
      before: { from: addDays(anchor, -13), to: addDays(anchor, -7) },
    },
    bulan: {
      now: { from: `${anchor.slice(0, 8)}01`, to: anchor },
      before: { from: prevStart, to: prevEnd },
    },
    /** Jendela pola (hari tersibuk, pelanggan kembali, pembatalan). */
    pola: { from: addDays(anchor, -27), to: anchor },
    monthLabel: {
      now: `1–${day} ${MONTH_SHORT[month - 1]}`,
      before: `1–${Number(prevEnd.slice(8))} ${MONTH_SHORT[prevMonth - 1]}`,
    },
    dayOfMonth: day,
    daysInMonth: daysInMonth(year, month),
  } as const
}

/** Tanggal paling awal yang perlu diambil dari DB untuk semua perhitungan. */
export function evaluationStart(anchor: string) {
  const ranges = evaluationRanges(anchor)
  return [ranges.bulan.before.from, ranges.minggu.before.from, ranges.pola.from].sort()[0]
}

const inRange = (day: string, range: Range) => day >= range.from && day <= range.to

export function buildGrowth(
  orders: EvalOrder[],
  payments: EvalPayment[],
  anchor: string,
): GrowthRow[] {
  const ranges = evaluationRanges(anchor)
  const active = orders.filter((order) => order.status !== "dibatalkan")

  const sumOrders = (range: Range) => {
    const rows = active.filter((order) => inRange(order.day, range))
    const total = rows.reduce((sum, order) => sum + order.total, 0)
    return {
      count: rows.length,
      portions: rows.reduce((sum, order) => sum + order.portions, 0),
      average: rows.length ? Math.round(total / rows.length) : 0,
    }
  }
  const revenue = (range: Range) =>
    payments.filter((payment) => inRange(payment.day, range)).reduce((sum, p) => sum + p.amount, 0)

  const row = (key: GrowthRow["key"], label: string, compare: string): GrowthRow => {
    const { now, before } = ranges[key]
    const a = sumOrders(now)
    const b = sumOrders(before)
    return {
      key,
      label,
      compare,
      orders: metric(a.count, b.count),
      portions: metric(a.portions, b.portions),
      revenue: metric(revenue(now), revenue(before)),
      average: metric(a.average, b.average),
    }
  }

  return [
    row("hari", "Harian", "vs kemarin"),
    row("minggu", "Mingguan", "7 hari vs 7 hari sebelumnya"),
    row("bulan", "Bulanan", `${ranges.monthLabel.now} vs ${ranges.monthLabel.before}`),
  ]
}

const pctText = (percent: number) => `${Math.abs(Math.round(percent))}%`

function trendInsight(
  key: string,
  subject: string,
  period: string,
  value: Metric,
  whenDown: string,
): Insight | null {
  if (value.percent === null) return null
  if (value.percent >= STABLE_PERCENT) {
    return {
      key,
      tone: "naik",
      title: `${subject} naik ${pctText(value.percent)}`,
      text: `${period}. Pertahankan: pastikan bahan dan packaging cukup untuk permintaan yang naik.`,
    }
  }
  if (value.percent <= -STABLE_PERCENT) {
    return {
      key,
      tone: "turun",
      title: `${subject} turun ${pctText(value.percent)}`,
      text: `${period}. ${whenDown}`,
    }
  }
  return {
    key,
    tone: "saran",
    title: `${subject} stabil`,
    text: `${period} (berubah ${value.percent >= 0 ? "+" : "−"}${pctText(value.percent)}).`,
  }
}

export function buildInsights({
  orders,
  payments,
  anchor,
  menusNow,
  menusBefore,
  showMoney,
  isToday,
  formatMoney,
}: {
  orders: EvalOrder[]
  payments: EvalPayment[]
  anchor: string
  menusNow: MenuQty[]
  menusBefore: MenuQty[]
  showMoney: boolean
  /** Proyeksi akhir bulan hanya masuk akal bila acuan = hari ini. */
  isToday: boolean
  formatMoney: (value: number) => string
}): Insight[] {
  const ranges = evaluationRanges(anchor)
  const growth = buildGrowth(orders, payments, anchor)
  const week = growth[1]
  const month = growth[2]
  const insights: (Insight | null)[] = []

  // 1. Tren minggu ini.
  insights.push(
    showMoney
      ? trendInsight(
          "omzet-minggu",
          "Omzet 7 hari",
          `${formatMoney(week.revenue.now)} dibanding ${formatMoney(week.revenue.before)} pada 7 hari sebelumnya`,
          week.revenue,
          "Coba broadcast WA ke pelanggan lama atau promo menu terlaris.",
        )
      : null,
  )
  insights.push(
    trendInsight(
      "pesanan-minggu",
      "Pesanan 7 hari",
      `${week.orders.now} pesanan dibanding ${week.orders.before} pada 7 hari sebelumnya`,
      week.orders,
      "Cek apakah ada menu yang kosong atau pesanan WA yang belum dibalas.",
    ),
  )

  // 2. Proyeksi bulan berjalan.
  if (showMoney && isToday && ranges.dayOfMonth >= 3 && month.revenue.now > 0) {
    const projection = Math.round((month.revenue.now / ranges.dayOfMonth) * ranges.daysInMonth)
    const vsLast =
      month.revenue.percent === null
        ? ""
        : ` Bulan berjalan ${month.revenue.percent >= 0 ? "naik" : "turun"} ${pctText(month.revenue.percent)} dibanding tanggal yang sama bulan lalu.`
    insights.push({
      key: "proyeksi",
      tone: "saran",
      title: `Proyeksi omzet bulan ini ± ${formatMoney(projection)}`,
      text: `Dari rata-rata ${formatMoney(Math.round(month.revenue.now / ranges.dayOfMonth))} per hari selama ${ranges.dayOfMonth} hari.${vsLast}`,
    })
  }

  // 3. Hari tersibuk dan tersepi (4 minggu terakhir, rata-rata per hari dalam seminggu).
  const active = orders.filter((order) => order.status !== "dibatalkan")
  const window = active.filter((order) => inRange(order.day, ranges.pola))
  if (window.length >= 7) {
    const perWeekday = Array.from({ length: 7 }, () => 0)
    for (const order of window) perWeekday[new Date(`${order.day}T00:00:00Z`).getUTCDay()] += 1
    const average = perWeekday.map((count) => count / 4)
    const busiest = average.indexOf(Math.max(...average))
    const quietest = average.indexOf(Math.min(...average))
    insights.push({
      key: "hari-ramai",
      tone: "saran",
      title: `${DAY_NAMES[busiest]} paling ramai`,
      text: `Rata-rata ${average[busiest].toLocaleString("id-ID", { maximumFractionDigits: 1 })} pesanan (4 minggu terakhir). Siapkan bahan dan box sehari sebelumnya. ${DAY_NAMES[quietest]} paling sepi: cocok untuk promo atau pre-order.`,
    })
  }

  // 4. Menu terlaris dan yang naik paling tinggi minggu ini.
  const top = [...menusNow].sort((a, b) => b.qty - a.qty || a.menuName.localeCompare(b.menuName))[0]
  if (top) {
    const beforeQty = new Map(menusBefore.map((menu) => [menu.menuName, menu.qty]))
    const risers = menusNow
      .map((menu) => ({
        ...menu,
        percent: percentChange(menu.qty, beforeQty.get(menu.menuName) ?? 0),
      }))
      .filter(
        (menu) => menu.percent !== null && menu.percent >= 20 && menu.menuName !== top.menuName,
      )
      .sort((a, b) => b.percent! - a.percent!)
    const riser = risers[0]
    insights.push({
      key: "menu",
      tone: "naik",
      title: `Terlaris 7 hari: ${top.menuName}`,
      text:
        `${top.qty} porsi terjual.` +
        (riser
          ? ` ${riser.menuName} naik ${pctText(riser.percent!)} dari minggu sebelumnya, layak ditonjolkan di story.`
          : " Jadikan menu andalan di broadcast dan story."),
    })
  }

  // 5. Pelanggan kembali (4 minggu terakhir).
  const customers = new Map<string, boolean>()
  for (const order of window) {
    const returning = order.firstDay !== null && order.firstDay < order.day
    customers.set(order.customerId, (customers.get(order.customerId) ?? false) || returning)
  }
  if (customers.size >= 5) {
    const returning = [...customers.values()].filter(Boolean).length
    const percent = Math.round((returning / customers.size) * 100)
    insights.push({
      key: "pelanggan",
      tone: percent >= 30 ? "naik" : "saran",
      title: `${percent}% pelanggan adalah pelanggan lama`,
      text:
        `${returning} dari ${customers.size} pelanggan 4 minggu terakhir pernah pesan sebelumnya.` +
        (percent >= 30
          ? " Loyalitas bagus; pertimbangkan kartu stempel atau diskon langganan."
          : " Coba follow-up pelanggan baru lewat WA setelah pesanan selesai."),
    })
  }

  // 6. Pembatalan (4 minggu terakhir).
  const all = orders.filter((order) => inRange(order.day, ranges.pola))
  const cancelled = all.filter((order) => order.status === "dibatalkan").length
  if (all.length >= 5 && cancelled / all.length >= 0.05) {
    insights.push({
      key: "batal",
      tone: "waspada",
      title: `${Math.round((cancelled / all.length) * 100)}% pesanan dibatalkan`,
      text: `${cancelled} dari ${all.length} pesanan 4 minggu terakhir. Cek alasannya: stok habis, ongkir, atau pembayaran yang tidak jadi.`,
    })
  }

  // 7. Nilai rata-rata pesanan.
  if (
    showMoney &&
    week.average.percent !== null &&
    Math.abs(week.average.percent) >= STABLE_PERCENT
  ) {
    const up = week.average.percent > 0
    insights.push({
      key: "rata-rata",
      tone: up ? "naik" : "turun",
      title: `Rata-rata per pesanan ${up ? "naik" : "turun"} ${pctText(week.average.percent)}`,
      text: `${formatMoney(week.average.now)} per pesanan (7 hari sebelumnya ${formatMoney(week.average.before)}).${up ? "" : " Tawarkan size Large atau tambahan dessert saat konfirmasi pesanan."}`,
    })
  }

  return insights.filter((insight): insight is Insight => insight !== null)
}
