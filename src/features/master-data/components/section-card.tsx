import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"

/** Kepala kartu Master Data (ikon, judul, keterangan, aksi) sesuai 06-master-data.png. */
export function SectionCardHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
      <div className="flex items-center gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold text-brand-ink">{title}</h1>
          <p className="text-sm text-text-body">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionCard({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card">{children}</section>
}

/** Keterangan di bawah tabel untuk role yang hanya bisa melihat. */
export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return <p className="border-t border-border px-6 py-3 text-[13px] text-text-body">{children}</p>
}

export function SectionCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="p-6">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  )
}
