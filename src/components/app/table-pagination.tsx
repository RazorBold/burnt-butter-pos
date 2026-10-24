import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

/** Nomor halaman yang tampil: maksimal 5, berpusat di halaman aktif. */
export function pageWindow(page: number, pageCount: number, size = 5): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), pageCount - size + 1))
  return Array.from({ length: Math.min(size, pageCount) }, (_, index) => start + index)
}

/**
 * Footer tabel "Menampilkan 1–10 dari 24 pesanan" + nomor halaman (03-pesanan.png).
 * Halaman disimpan di URL (?hal=), parameter lain (mis. ?q=) ikut dibawa.
 */
export function TablePagination({
  pathname,
  params,
  page,
  pageCount,
  pageSize,
  total,
  noun,
}: {
  pathname: string
  params: Record<string, string | undefined>
  page: number
  pageCount: number
  pageSize: number
  total: number
  /** Kata benda jamak untuk teks ringkasan, mis. "pesanan" atau "customer". */
  noun: string
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const href = (target: number) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
    if (target > 1) search.set("hal", String(target))
    else search.delete("hal")
    const qs = search.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const box =
    "flex size-9 items-center justify-center rounded-lg border border-border text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
      <p className="text-sm text-text-body tabular-nums">
        Menampilkan {from}–{to} dari {total} {noun}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Halaman" className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link href={href(page - 1)} className={cn(box, "bg-white text-text-strong")}>
              <ChevronLeft className="size-4" aria-hidden />
              <span className="sr-only">Halaman sebelumnya</span>
            </Link>
          ) : (
            <span aria-hidden className={cn(box, "text-text-body/50")}>
              <ChevronLeft className="size-4" />
            </span>
          )}
          {pageWindow(page, pageCount).map((number) => (
            <Link
              key={number}
              href={href(number)}
              aria-current={number === page ? "page" : undefined}
              aria-label={`Halaman ${number}`}
              className={cn(
                box,
                "tabular-nums",
                number === page
                  ? "border-brand bg-brand text-white"
                  : "bg-white text-text-strong hover:bg-nav-active",
              )}
            >
              {number}
            </Link>
          ))}
          {page < pageCount ? (
            <Link href={href(page + 1)} className={cn(box, "bg-white text-text-strong")}>
              <ChevronRight className="size-4" aria-hidden />
              <span className="sr-only">Halaman berikutnya</span>
            </Link>
          ) : (
            <span aria-hidden className={cn(box, "text-text-body/50")}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </nav>
      )}
    </div>
  )
}
