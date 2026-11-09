import { Lightbulb, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react"

import type { GrowthRow, Insight, InsightTone, Metric } from "@/features/dashboard/evaluation"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

const TONE = {
  naik: { icon: TrendingUp, label: "Naik", className: "bg-trend-up text-trend-up-fg" },
  turun: { icon: TrendingDown, label: "Turun", className: "bg-trend-down text-trend-down-fg" },
  saran: {
    icon: Lightbulb,
    label: "Saran",
    className: "bg-status-diproses text-status-diproses-fg",
  },
  waspada: {
    icon: TriangleAlert,
    label: "Perlu dicek",
    className: "bg-trend-down text-trend-down-fg",
  },
} satisfies Record<InsightTone, { icon: typeof Lightbulb; label: string; className: string }>

/**
 * Evaluasi & Masukan (paling bawah Dashboard): pertumbuhan harian / mingguan / bulanan terhadap
 * periode sebelumnya, lalu masukan otomatis dari pola pesanan. Mengikuti tanggal acuan Dashboard.
 */
export function EvaluationCard({
  growth,
  insights,
  showMoney,
  dateLabel,
}: {
  growth: GrowthRow[]
  insights: Insight[]
  showMoney: boolean
  dateLabel: string
}) {
  return (
    <section
      aria-label="Evaluasi & Masukan"
      className="mt-4 min-w-0 rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-brand-ink">Evaluasi &amp; Masukan</h2>
        <p className="mt-0.5 text-[13px] text-text-body">
          Per {dateLabel}, dibanding periode sebelumnya. Pesanan dibatalkan tidak dihitung.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-sm font-semibold text-text-strong">Pertumbuhan</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {growth.map((row) => (
              <li
                key={row.key}
                aria-label={`Pertumbuhan ${row.label}`}
                className="rounded-xl border border-border bg-white p-4"
              >
                <p className="font-semibold text-brand-ink">{row.label}</p>
                <p className="text-[12px] leading-snug text-text-body">{row.compare}</p>
                <dl className="mt-3 space-y-3">
                  <MetricRow label="Pesanan" metric={row.orders} format={String} />
                  {showMoney ? (
                    <>
                      <MetricRow label="Omzet (lunas)" metric={row.revenue} format={formatRupiah} />
                      <MetricRow
                        label="Rata-rata / pesanan"
                        metric={row.average}
                        format={formatRupiah}
                      />
                    </>
                  ) : (
                    <MetricRow
                      label="Porsi"
                      metric={row.portions}
                      format={(value) => `${value} porsi`}
                    />
                  )}
                </dl>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-strong">Masukan</h3>
          {insights.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-text-body">
              Belum cukup data untuk memberi masukan. Masukan muncul setelah ada pesanan beberapa
              hari berturut-turut.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {insights.map((insight) => {
                const tone = TONE[insight.tone]
                const Icon = tone.icon
                return (
                  <li
                    key={insight.key}
                    className="flex gap-3 rounded-xl border border-border bg-white p-3.5"
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        tone.className,
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-text-strong">
                        <span className="sr-only">{tone.label}: </span>
                        {insight.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-text-body">
                        {insight.text}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function MetricRow({
  label,
  metric,
  format,
}: {
  label: string
  metric: Metric
  format: (value: number) => string
}) {
  return (
    <div>
      <dt className="text-[12px] text-text-body">{label}</dt>
      <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-bold text-text-strong tabular-nums">{format(metric.now)}</span>
        {metric.percent !== null && <Delta percent={metric.percent} />}
        <span className="w-full text-[12px] text-text-body tabular-nums">
          {metric.percent === null ? "belum ada pembanding" : `sebelumnya ${format(metric.before)}`}
        </span>
      </dd>
    </div>
  )
}

function Delta({ percent }: { percent: number }) {
  const rounded = Math.round(percent)
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center rounded-md bg-nav-active px-1.5 py-0.5 text-xs font-semibold text-text-strong">
        = 0%
      </span>
    )
  }
  const up = rounded > 0
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        up ? "bg-trend-up text-trend-up-fg" : "bg-trend-down text-trend-down-fg",
      )}
    >
      <span className="sr-only">{up ? "Naik " : "Turun "}</span>
      <span aria-hidden>{up ? "↑" : "↓"}</span> {Math.abs(rounded)}%
    </span>
  )
}
