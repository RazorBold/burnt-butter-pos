import { Hammer } from "lucide-react"
import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"

/** Isi halaman memenuhi area di samping sidebar (tanpa batas lebar, permintaan pemilik toko). */
export const PAGE_CONTAINER = "w-full px-4 py-8 sm:px-6 xl:px-8 2xl:px-10"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-brand-ink sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[15px] text-text-body">{description}</p>
      </div>
      {actions}
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-[28rem] max-w-full" />
    </div>
  )
}

/** Isi sementara untuk halaman yang menu-nya sudah ada tapi fiturnya belum dibangun. */
export function UnderConstruction({ plannedContent }: { plannedContent: string }) {
  return (
    <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#dccbbb] bg-card px-6 py-10 sm:px-10">
      <span className="flex size-12 items-center justify-center rounded-full bg-icon-bg text-brand">
        <Hammer className="size-6" aria-hidden />
      </span>
      <p className="text-lg font-semibold text-brand-ink">Halaman ini sedang dibangun.</p>
      <p className="max-w-[60ch] text-[15px] text-text-body">{plannedContent}</p>
    </div>
  )
}
