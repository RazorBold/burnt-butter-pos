"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

/**
 * Filter yang disimpan di URL search params.
 *
 * router.replace baru mengubah URL setelah navigasi selesai. Selama itu filter yang diminta
 * disimpan di `requested`, supaya perubahan berikutnya (mis. pencarian yang tertunda) dibangun
 * dari sini dan tidak menimpa filter yang baru dipilih. Direset begitu URL berubah.
 * Setiap perubahan filter kembali ke halaman 1 (?hal= dihapus).
 */
export function useUrlFilters() {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const urlKey = params.toString()
  const [requested, setRequested] = useState<{ base: string; qs: string } | null>(null)
  const current = new URLSearchParams(requested?.base === urlKey ? requested.qs : urlKey)

  function update(next: Record<string, string | null | undefined>) {
    const search = new URLSearchParams(current)
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value)
      else search.delete(key)
    }
    search.delete("hal")
    const qs = search.toString()
    setRequested({ base: urlKey, qs })
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  return { current, update, pending }
}

/**
 * Kotak cari yang ditulis ke URL (?q=) setelah jeda 300 ms. `current`/`update` dari useUrlFilters.
 * currentKey ikut jadi dependensi: bila filter lain berubah selama jeda, timer lama (yang memegang
 * filter lama) dibatalkan dan dijadwalkan ulang dengan filter terbaru.
 */
export function useDebouncedQuery(
  current: URLSearchParams,
  update: (next: Record<string, string | null>) => void,
) {
  const [query, setQuery] = useState(current.get("q") ?? "")
  const currentKey = current.toString()
  const requestedQuery = current.get("q") ?? ""

  useEffect(() => {
    if (query.trim() === requestedQuery) return
    const timer = setTimeout(() => update({ q: query.trim() || null }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentKey])

  return [query, setQuery] as const
}
