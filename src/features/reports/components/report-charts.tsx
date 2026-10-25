"use client"

import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { SegmentedControl } from "@/components/app/segmented-control"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { REPORT_COLORS } from "@/features/reports/colors"
import { formatRupiah } from "@/lib/format"

const SURFACE = "#fbf7f3"

const shortDay = (day: string) => format(parseISO(day), "d MMM", { locale: localeId })
const longDay = (day: string) => format(parseISO(day), "EEEE, d MMMM yyyy", { locale: localeId })

type PerDay = {
  day: string
  personal: number
  hadiah: number
  personalRevenue: number
  hadiahRevenue: number
}

/** Legenda kecil di kepala kartu (identitas seri tidak hanya lewat warna). */
export function SeriesLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-strong">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

const trendConfig = {
  personal: { label: "Personal", color: REPORT_COLORS.personal },
  hadiah: { label: "Hadiah", color: REPORT_COLORS.hadiah },
} satisfies ChartConfig

/** Tren Pesanan (F-52): garis harian Personal vs Hadiah. */
export function OrderTrendChart({ perDay }: { perDay: PerDay[] }) {
  return (
    <>
      <ChartContainer config={trendConfig} className="aspect-auto h-[230px] w-full">
        <LineChart data={perDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ece3da" />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => longDay(payload[0]?.payload.day)}
              />
            }
          />
          {(["personal", "hadiah"] as const).map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={REPORT_COLORS[key]}
              strokeWidth={2}
              isAnimationActive={false}
              dot={perDay.length <= 31 ? { r: 3, strokeWidth: 0, fill: REPORT_COLORS[key] } : false}
              activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <DataTable
        caption="Tren pesanan per hari"
        head={["Tanggal", "Personal", "Hadiah"]}
        rows={perDay.map((row) => [longDay(row.day), row.personal, row.hadiah])}
      />
    </>
  )
}

/** Rekap Penjualan per Hari (F-55): bar bertumpuk Personal/Hadiah, toggle Pesanan / Pendapatan. */
export function DailySalesChart({ perDay }: { perDay: PerDay[] }) {
  const [mode, setMode] = useState<"pesanan" | "pendapatan">("pesanan")
  const revenue = mode === "pendapatan"
  const keys = revenue
    ? (["personalRevenue", "hadiahRevenue"] as const)
    : (["personal", "hadiah"] as const)
  const config = {
    [keys[0]]: { label: "Personal", color: REPORT_COLORS.personal },
    [keys[1]]: { label: "Hadiah", color: REPORT_COLORS.hadiah },
  } satisfies ChartConfig
  const compactRupiah = (value: number) =>
    value >= 1_000_000
      ? `${(value / 1_000_000).toLocaleString("id-ID")} jt`
      : value >= 1000
        ? `${value / 1000} rb`
        : String(value)

  return (
    <>
      <div className="flex justify-end">
        <SegmentedControl
          label="Tampilkan"
          options={[
            { value: "pesanan", label: "Pesanan" },
            { value: "pendapatan", label: "Pendapatan" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <ChartContainer config={config} className="mt-3 aspect-auto h-[220px] w-full">
        <BarChart data={perDay} margin={{ top: 8, right: 8, left: revenue ? 0 : -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ece3da" />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={revenue ? 56 : 40}
            tickFormatter={revenue ? compactRupiah : undefined}
          />
          <ChartTooltip
            cursor={{ fill: "#f3e6d8", opacity: 0.6 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => longDay(payload[0]?.payload.day)}
                formatter={
                  revenue
                    ? (value, name) => (
                        <div className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">
                            {config[name as keyof typeof config]?.label}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatRupiah(Number(value))}
                          </span>
                        </div>
                      )
                    : undefined
                }
              />
            }
          />
          {/* Celah 2px warna permukaan di antara segmen (stroke), ujung atas membulat 4px. */}
          <Bar
            dataKey={keys[0]}
            stackId="a"
            isAnimationActive={false}
            fill={REPORT_COLORS.personal}
            stroke={SURFACE}
            strokeWidth={2}
            maxBarSize={22}
          />
          <Bar
            dataKey={keys[1]}
            stackId="a"
            isAnimationActive={false}
            fill={REPORT_COLORS.hadiah}
            stroke={SURFACE}
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-3">
        <SeriesLegend
          items={[
            { label: "Personal", color: REPORT_COLORS.personal },
            { label: "Hadiah", color: REPORT_COLORS.hadiah },
          ]}
        />
      </div>
      <DataTable
        caption={revenue ? "Pendapatan per hari" : "Pesanan per hari"}
        head={["Tanggal", "Personal", "Hadiah"]}
        rows={perDay.map((row) =>
          revenue
            ? [longDay(row.day), formatRupiah(row.personalRevenue), formatRupiah(row.hadiahRevenue)]
            : [longDay(row.day), row.personal, row.hadiah],
        )}
      />
    </>
  )
}

export type DonutSlice = { key: string; label: string; value: number; color: string }

/** Donat bagian-dari-keseluruhan (F-53) dengan total di tengah dan legenda angka + persen. */
export function ShareDonut({
  slices,
  centerLabel,
  caption,
}: {
  slices: DonutSlice[]
  centerLabel: string
  caption: string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const config = Object.fromEntries(
    slices.map((slice) => [slice.key, { label: slice.label, color: slice.color }]),
  ) satisfies ChartConfig
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0)

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-[168px] shrink-0">
        <ChartContainer config={config} className="aspect-square size-[168px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
            <Pie
              data={
                total ? slices.filter((slice) => slice.value > 0) : [{ key: "kosong", value: 1 }]
              }
              dataKey="value"
              nameKey="key"
              innerRadius={54}
              outerRadius={80}
              stroke={SURFACE}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {(total ? slices.filter((slice) => slice.value > 0) : [{ key: "kosong" }]).map(
                (slice) => (
                  <Cell key={slice.key} fill={"color" in slice ? slice.color : "#ece3da"} />
                ),
              )}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-strong tabular-nums">{total}</span>
          <span className="text-[13px] text-text-body">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: slice.color }}
            />
            <span className="min-w-0 flex-1 text-text-strong">{slice.label}</span>
            <span className="font-semibold text-text-strong tabular-nums">{slice.value}</span>
            <span className="w-12 text-right text-text-body tabular-nums">
              ({percent(slice.value)}%)
            </span>
          </li>
        ))}
      </ul>
      <DataTable
        caption={caption}
        head={["Kategori", "Jumlah", "Persen"]}
        rows={slices.map((slice) => [slice.label, slice.value, `${percent(slice.value)}%`])}
      />
    </div>
  )
}

/** Tabel tersembunyi untuk pembaca layar: data grafik tidak hanya tersedia sebagai warna. */
function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: (string | number)[][]
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell} scope="col">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
