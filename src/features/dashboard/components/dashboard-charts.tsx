"use client"

import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { REPORT_COLORS } from "@/features/reports/colors"
import { formatRupiah } from "@/lib/format"

const SURFACE = "#fbf7f3"
const GRID = "#ece3da"

type StatusKey = "baru" | "diproses" | "siap_packing" | "siap_kirim" | "dikirim" | "selesai"

/**
 * Status Pesanan (F-15): bar per status, berurutan Baru → Selesai dengan gradasi ordinal yang
 * sama dengan Laporan. Angka di atas bar karena hanya 5 batang.
 */
export function StatusBarChart({
  data,
}: {
  data: { key: StatusKey; label: string; value: number }[]
}) {
  const config = { value: { label: "Pesanan" } } satisfies ChartConfig
  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-[170px] w-full overflow-hidden">
        <BarChart data={data} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} fontSize={11} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip
            cursor={{ fill: "#f3e6d8", opacity: 0.6 }}
            content={<ChartTooltipContent hideIndicator />}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={REPORT_COLORS[entry.key]} />
            ))}
            <LabelList dataKey="value" position="top" className="fill-text-strong" fontSize={12} />
          </Bar>
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>Pesanan per status</caption>
        <tbody>
          {data.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Total Pembayaran 7 hari terakhir (F-16): satu seri, garis 2px dengan area tipis. */
export function PaymentLineChart({ data }: { data: { day: string; value: number }[] }) {
  const config = {
    value: { label: "Pembayaran", color: REPORT_COLORS.personal },
  } satisfies ChartConfig
  const shortDay = (day: string) => format(parseISO(day), "d MMM", { locale: localeId })
  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-[130px] w-full overflow-hidden">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="payment-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={REPORT_COLORS.personal} stopOpacity={0.18} />
              <stop offset="100%" stopColor={REPORT_COLORS.personal} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval={0}
            padding={{ left: 16, right: 16 }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  format(parseISO(payload[0]?.payload.day), "EEEE, d MMMM", { locale: localeId })
                }
                formatter={(value) => (
                  <span className="font-medium tabular-nums">{formatRupiah(Number(value))}</span>
                )}
              />
            }
          />
          <Area
            dataKey="value"
            type="monotone"
            stroke={REPORT_COLORS.personal}
            strokeWidth={2}
            fill="url(#payment-area)"
            dot={{ r: 3, strokeWidth: 0, fill: REPORT_COLORS.personal }}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>Total pembayaran per hari</caption>
        <tbody>
          {data.map((row) => (
            <tr key={row.day}>
              <th scope="row">{row.day}</th>
              <td>{formatRupiah(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
