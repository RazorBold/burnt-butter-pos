import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react"
import { useId } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { sparklinePaths } from "@/lib/sparkline"
import { cn } from "@/lib/utils"

export type KpiTrend = {
  /** Perubahan dalam persen dibanding periode sebelumnya, mis. 12 atau -14. */
  percent: number
  /** Arah yang dianggap baik. "Perlu Dikirim" naik itu buruk, jadi pakai "down". */
  goodWhen?: "up" | "down"
}

type Props = {
  icon: LucideIcon
  label: string
  /** Nilai yang sudah diformat, mis. "24" atau formatRupiah(4780000). */
  value: string
  trend?: KpiTrend
  /** Nilai beberapa periode terakhir untuk sparkline (urut lama → baru). */
  series?: number[]
  className?: string
}

const SPARK_W = 200
const SPARK_H = 56

/** Kartu KPI sesuai desain: ikon dalam lingkaran, label, nilai, sparkline area, badge tren. */
export function KpiCard({ icon: Icon, label, value, trend, series, className }: Props) {
  // useId bisa berisi karakter seperti ":" atau "«»" yang merusak url(#…) di SVG.
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const direction = !trend || trend.percent === 0 ? "flat" : trend.percent > 0 ? "up" : "down"
  const good = direction === "flat" || direction === (trend?.goodWhen ?? "up")
  const paths = series ? sparklinePaths(series, { width: SPARK_W, height: SPARK_H }) : null
  const sparkColor = good ? "#f3c9a4" : "#f9b2ad"

  return (
    <div
      className={cn(
        // @container: kartu menyesuaikan lebarnya sendiri (4 kolom di samping sidebar 1280 px).
        "@container relative isolate flex min-h-[108px] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-5 @[16.5rem]:gap-4 @[16.5rem]:px-6",
        className,
      )}
    >
      {paths && (
        <svg
          aria-hidden
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute right-0 bottom-0 -z-10 h-[52%] w-[60%] [mask-image:linear-gradient(to_right,transparent,black_45%)]"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={sparkColor} stopOpacity="0.55" />
              <stop offset="100%" stopColor={sparkColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={paths.area} fill={`url(#${gradientId})`} />
        </svg>
      )}

      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink @[16.5rem]:size-14">
        <Icon className="size-6 @[16.5rem]:size-7" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug font-medium text-text-body">{label}</p>
        {/* Nilai tidak pernah dipotong; bila sempit, badge turun ke baris berikutnya. */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <p className="text-[22px] leading-tight font-bold tracking-[-0.01em] whitespace-nowrap text-text-strong tabular-nums @[16.5rem]:text-[26px]">
            {value}
          </p>
          {trend && <TrendBadge trend={trend} direction={direction} good={good} />}
        </div>
      </div>
    </div>
  )
}

function TrendBadge({
  trend,
  direction,
  good,
}: {
  trend: KpiTrend
  direction: "up" | "down" | "flat"
  good: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold tabular-nums",
        direction === "flat"
          ? "bg-status-dikirim text-status-dikirim-fg"
          : good
            ? "bg-trend-up text-trend-up-fg"
            : "bg-trend-down text-trend-down-fg",
      )}
    >
      {direction === "up" && <ArrowUp className="size-3.5" strokeWidth={2.5} aria-hidden />}
      {direction === "down" && <ArrowDown className="size-3.5" strokeWidth={2.5} aria-hidden />}
      <span aria-hidden>{Math.abs(Math.round(trend.percent))}%</span>
      <span className="sr-only">
        {direction === "flat"
          ? "Sama dengan periode sebelumnya"
          : `${direction === "up" ? "Naik" : "Turun"} ${Math.abs(Math.round(trend.percent))}% dibanding periode sebelumnya`}
      </span>
    </span>
  )
}

export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex min-h-[108px] items-center gap-4 rounded-2xl border border-border bg-card px-5 py-5 sm:px-6",
        className,
      )}
    >
      <Skeleton className="size-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  )
}
