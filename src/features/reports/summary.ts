// Laporan Ringkasan (PRD F-50..F-56, desain 05-laporan.png). Murni: menerima baris mentah
// pesanan & pembayaran, mengembalikan angka untuk KPI dan grafik. Pesanan dibatalkan tidak
// dihitung, kecuali jumlahnya sendiri.

import { addDays, type OrderStatus, previousRange } from "@/features/orders/filters"
import type { OrderType, ShippingMethod } from "@/lib/wa-parser"

export type ReportOrder = {
  /** Tanggal dibuat (WIB), "YYYY-MM-DD". */
  day: string
  type: OrderType
  status: OrderStatus
  method: ShippingMethod
  total: number
  customerId: string
  portions: number
}

export type ReportPayment = {
  /** Tanggal lunas (WIB). */
  day: string
  amount: number
  methodType: "bank" | "ewallet" | "cash"
}

export type Kpi = { value: number; percent: number | null; series: number[] }

const SPARK_DAYS = 7

function daysBetween(from: string, to: string): string[] {
  const list: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) list.push(day)
  return list
}

const percentChange = (now: number, before: number) =>
  before === 0 ? null : ((now - before) / before) * 100

const sum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + value(row), 0)

const distinctCustomers = (rows: ReportOrder[]) => new Set(rows.map((row) => row.customerId)).size

/** Nilai per hari untuk daftar hari tertentu. */
function perDayValues<T>(
  rows: T[],
  dayOf: (row: T) => string,
  value: (row: T) => number,
  days: string[],
) {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(dayOf(row), (totals.get(dayOf(row)) ?? 0) + value(row))
  return days.map((day) => totals.get(day) ?? 0)
}

export function buildReport(
  orders: ReportOrder[],
  payments: ReportPayment[],
  from: string,
  to: string,
) {
  const previous = previousRange(from, to)
  const inRange = (day: string, start: string, end: string) => day >= start && day <= end
  const active = orders.filter((order) => order.status !== "dibatalkan")
  const current = active.filter((order) => inRange(order.day, from, to))
  const before = active.filter((order) => inRange(order.day, previous.from, previous.to))
  const paidNow = payments.filter((payment) => inRange(payment.day, from, to))
  const paidBefore = payments.filter((payment) => inRange(payment.day, previous.from, previous.to))

  const rangeDays = daysBetween(from, to)
  const sparkDays =
    rangeDays.length >= SPARK_DAYS ? rangeDays : daysBetween(addDays(to, -(SPARK_DAYS - 1)), to)
  const orderDay = (order: ReportOrder) => order.day

  const kpis = {
    orders: {
      value: current.length,
      percent: percentChange(current.length, before.length),
      series: perDayValues(active, orderDay, () => 1, sparkDays),
    },
    portions: {
      value: sum(current, (order) => order.portions),
      percent: percentChange(
        sum(current, (order) => order.portions),
        sum(before, (order) => order.portions),
      ),
      series: perDayValues(active, orderDay, (order) => order.portions, sparkDays),
    },
    payments: {
      value: sum(paidNow, (payment) => payment.amount),
      percent: percentChange(
        sum(paidNow, (payment) => payment.amount),
        sum(paidBefore, (payment) => payment.amount),
      ),
      series: perDayValues(
        payments,
        (payment) => payment.day,
        (payment) => payment.amount,
        sparkDays,
      ),
    },
    customers: {
      value: distinctCustomers(current),
      percent: percentChange(distinctCustomers(current), distinctCustomers(before)),
      series: sparkDays.map((day) =>
        distinctCustomers(active.filter((order) => order.day === day)),
      ),
    },
  } satisfies Record<string, Kpi>

  const byType = (type: OrderType, value: (order: ReportOrder) => number) =>
    perDayValues(
      current.filter((order) => order.type === type),
      orderDay,
      value,
      rangeDays,
    )
  const personalOrders = byType("personal", () => 1)
  const hadiahOrders = byType("hadiah", () => 1)
  const personalRevenue = byType("personal", (order) => order.total)
  const hadiahRevenue = byType("hadiah", (order) => order.total)
  const perDay = rangeDays.map((day, index) => ({
    day,
    personal: personalOrders[index],
    hadiah: hadiahOrders[index],
    personalRevenue: personalRevenue[index],
    hadiahRevenue: hadiahRevenue[index],
  }))

  const count = <K extends string>(keys: readonly K[], keyOf: (order: ReportOrder) => string) =>
    keys.map((key) => ({ key, value: current.filter((order) => keyOf(order) === key).length }))

  const paymentTotal = kpis.payments.value

  return {
    kpis,
    perDay,
    shipping: count(["kurir_internal", "instant", "pick_up"] as const, (order) => order.method),
    status: count(
      ["baru", "diproses", "siap_kirim", "dikirim", "selesai"] as const,
      (order) => order.status,
    ),
    cancelled: orders.filter(
      (order) => order.status === "dibatalkan" && inRange(order.day, from, to),
    ).length,
    paymentMethods: (["bank", "ewallet", "cash"] as const).map((type) => {
      const amount = sum(
        paidNow.filter((payment) => payment.methodType === type),
        (payment) => payment.amount,
      )
      return { type, amount, share: paymentTotal ? amount / paymentTotal : 0 }
    }),
  }
}

export type Report = ReturnType<typeof buildReport>
