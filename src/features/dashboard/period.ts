// Periode Dashboard (F-10, F-11): tanggal acuan (default hari ini) + Hari Ini / 7 Hari /
// 30 Hari / Bulan Ini, semuanya berakhir di tanggal acuan. Murni supaya bisa diuji.

import { addDays } from "@/features/orders/filters"

export const PERIODS = ["hari", "7", "30", "bulan"] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABEL: Record<Period, string> = {
  hari: "Hari Ini",
  "7": "7 Hari",
  "30": "30 Hari",
  bulan: "Bulan Ini",
}

type Params = Record<string, string | string[] | undefined>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseDashboardPeriod(params: Params, today: string) {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const date = one("tanggal")
  const anchor =
    date && ISO_DATE.test(date) && !Number.isNaN(Date.parse(date)) && date <= today ? date : today
  const period = PERIODS.find((value) => value === one("periode")) ?? "hari"
  const from =
    period === "hari"
      ? anchor
      : period === "bulan"
        ? `${anchor.slice(0, 8)}01`
        : addDays(anchor, -(Number(period) - 1))
  return { anchor, period, from, to: anchor }
}
